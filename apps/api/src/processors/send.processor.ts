import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { EncryptionService } from "../lib/encryption";
import { AuthoringMode, EmailProviderType, SingleSendRunStatus } from "@prisma/client";
import { RecipientStatus, SendStatus } from "@prisma/client";
import { EmailCompiler } from "../lib/email";
import { SesService } from "../lib/ses";
import { SmtpService, SmtpConfig } from "../lib/smtp";
import { PrismaService } from "../prisma/prisma.service";
import { CollisionService } from "./services/collision.service";

@Processor("send")
export class SendProcessor extends WorkerHost {
  private encryption: EncryptionService;
  private redis: any | null = null;

  constructor(
    private prisma: PrismaService,
    private collisionService: CollisionService
  ) {
    super();
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to decrypt connector credentials."
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  private getRedisClient() {
    if (this.redis) return this.redis;
    // BullMQ already depends on ioredis; use dynamic require to avoid hard dependency in TS types.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis") as any;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
    });
    return this.redis;
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing send job ${job.name}`);
    switch (job.name) {
      case "sendEmail":
        return this.sendEmail(job);
      case "sendEmailBatch":
        return this.sendEmailBatch(job);
      case "sendJourneyEmail":
        return this.sendJourneyEmail(job);
      default:
        throw new Error(`Unknown job ${job.name}`);
    }
  }

  private decryptConnectorConfig(configJson: any): Record<string, any> {
    const encrypted = configJson?.encrypted;
    if (typeof encrypted !== "string" || encrypted.length === 0) {
      throw new BadRequestException(
        "Connector config is missing/invalid. Re-create the connector."
      );
    }
    const plaintext = this.encryption.decrypt(encrypted);
    try {
      return JSON.parse(plaintext);
    } catch {
      throw new BadRequestException(
        "Connector config could not be parsed. Re-create the connector."
      );
    }
  }

  private normalizeSesConfig(raw: Record<string, any>): {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  } {
    const region = raw?.region;
    const accessKeyId = raw?.accessKeyId;
    const secretAccessKey = raw?.secretAccessKey;
    if (typeof region !== "string" || region.length === 0) {
      throw new BadRequestException("SES config must include `region`.");
    }
    if (typeof accessKeyId !== "string" || accessKeyId.length === 0) {
      throw new BadRequestException("SES config must include `accessKeyId`.");
    }
    if (typeof secretAccessKey !== "string" || secretAccessKey.length === 0) {
      throw new BadRequestException("SES config must include `secretAccessKey`.");
    }
    return { region, accessKeyId, secretAccessKey };
  }

  private normalizeSmtpConfig(raw: Record<string, any>): SmtpConfig {
    const host = raw?.host;
    const port = raw?.port;
    if (typeof host !== "string" || host.length === 0) {
      throw new BadRequestException("SMTP config must include `host`.");
    }
    if (typeof port !== "number" && typeof port !== "string") {
      throw new BadRequestException("SMTP config must include `port`.");
    }
    return {
      host,
      port: typeof port === "number" ? port : parseInt(port, 10),
      secure: raw?.secure ?? false,
      auth: raw?.user && raw?.pass ? { user: raw.user, pass: raw.pass } : undefined,
    };
  }

  private async applyRateLimit(senderProfileId: string, ratePerSecond: number) {
    if (!senderProfileId || !Number.isFinite(ratePerSecond) || ratePerSecond <= 0)
      return;

    const spacingMs = Math.ceil(1000 / ratePerSecond);
    const now = Date.now();

    // Redis-backed leaky bucket / pacing to be safe across multiple workers.
    const redis = this.getRedisClient();
    const key = `rate:senderProfile:${senderProfileId}`;
    const ttlMs = 60_000;

    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local spacing = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      local next = tonumber(redis.call('GET', key) or '0')
      local startAt = now
      if next > now then startAt = next end
      local newNext = startAt + spacing
      redis.call('SET', key, newNext, 'PX', ttl)
      return startAt - now
    `;

    const delayMs = await redis.eval(script, 1, key, String(now), String(spacingMs), String(ttlMs));
    const delay = typeof delayMs === "number" ? delayMs : parseInt(String(delayMs || "0"), 10);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  }

  private compileAndRender(version: any, variables: Record<string, any>) {
    const subjectTemplate = String(version.subject ?? "");

    if (version.mode === AuthoringMode.RAW_HTML) {
      if (!version.bodyHtml) throw new BadRequestException("Template bodyHtml missing.");
      return {
        subject: EmailCompiler.render(subjectTemplate, variables),
        html: EmailCompiler.render(String(version.bodyHtml), variables),
      };
    }

    if (version.mode === AuthoringMode.RAW_MJML) {
      if (!version.bodyMjml) throw new BadRequestException("Template bodyMjml missing.");
      const compiled = EmailCompiler.compileMjml(String(version.bodyMjml));
      return {
        subject: EmailCompiler.render(subjectTemplate, variables),
        html: EmailCompiler.render(String(compiled.html), variables),
        errors: compiled.errors,
      };
    }

    if (version.mode === AuthoringMode.UI_BUILDER) {
      const mjml = EmailCompiler.compileBuilderJson(version.builderSchema ?? {});
      const compiled = EmailCompiler.compileMjml(mjml);
      return {
        subject: EmailCompiler.render(subjectTemplate, variables),
        html: EmailCompiler.render(String(compiled.html), variables),
        errors: compiled.errors,
      };
    }

    throw new BadRequestException(`Unsupported template mode: ${version.mode as any}`);
  }

  private async sendEmail(job: Job<any, any, string>) {
    const singleSendRecipientId = job.data?.singleSendRecipientId;
    console.log(`sendEmail job started: recipientId=${singleSendRecipientId}, attempt=${(job.attemptsMade ?? 0) + 1}/${job.opts.attempts ?? 1}`);

    if (!singleSendRecipientId)
      throw new BadRequestException("singleSendRecipientId is required");

    const rr = await this.prisma.singleSendRecipient.findFirst({
      where: { id: singleSendRecipientId },
      include: {
        run: {
          include: {
            singleSend: {
              include: {
                template: true,
                senderProfile: { include: { emailProviderConnector: true } },
                campaignGroup: true,
              },
            },
          },
        },
      },
    });
    if (!rr) throw new BadRequestException("SingleSendRecipient not found");

    const singleSend = rr.run?.singleSend;
    if (!singleSend) throw new BadRequestException("SingleSend not found for run");

    // Send-time collision check (belt-and-suspenders)
    const campaignGroup = singleSend.campaignGroup;
    if (singleSend.campaignGroupId && campaignGroup) {
      const collisionResult = await this.collisionService.checkCollisionAtSendTime(
        singleSend.workspaceId,
        rr.subjectId,
        singleSend.campaignGroupId,
        campaignGroup.collisionWindow
      );

      if (collisionResult.blocked) {
        console.log(
          `Send-time collision detected for ${rr.email}: ${collisionResult.reason}`
        );
        // Mark as skipped and return
        await this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: {
            status: RecipientStatus.SKIPPED,
            skipReason: collisionResult.reason,
          },
        });
        await this.checkAndCompleteRun(rr.runId);
        return { ok: true, skipped: true, reason: collisionResult.reason };
      }
    }

    // Idempotency / Send record
    const idempotencyKey = `singleSendRecipient:${singleSendRecipientId}`;
    const send = await this.prisma.send.upsert({
      where: { idempotencyKey },
      create: {
        singleSendRecipientId,
        idempotencyKey,
        status: SendStatus.QUEUED,
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    // If already sent, short-circuit.
    if (send.status === SendStatus.SENT || rr.status === RecipientStatus.SENT) {
      return { ok: true, skipped: true };
    }

    const senderProfile = singleSend.senderProfile;
    if (!senderProfile) throw new BadRequestException("SenderProfile missing");
    const connector = senderProfile.emailProviderConnector;
    if (!connector) throw new BadRequestException("SenderProfile connector missing");

    // Rate limit: campaign policy overrides env default
    const ratePerSecond =
      Number((singleSend.policies as any)?.rateLimitPerSecond) ||
      Number(process.env.DEFAULT_RATE_LIMIT_PER_SECOND) ||
      10;
    await this.applyRateLimit(senderProfile.id, ratePerSecond);

    // Load active template version
    const version = await this.prisma.templateVersion.findFirst({
      where: { templateId: singleSend.templateId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!version) {
      throw new BadRequestException(
        "No active template version. Publish a template version first."
      );
    }

    const variables =
      (rr.vars && typeof rr.vars === "object" ? (rr.vars as any) : {}) ?? {};
    const compiled = this.compileAndRender(version, variables);

    const from = senderProfile.fromName
      ? `${senderProfile.fromName} <${senderProfile.fromEmail}>`
      : senderProfile.fromEmail;

    try {
      let messageId: string | undefined;

      if (connector.type === EmailProviderType.SES) {
        const sesCfg = this.normalizeSesConfig(
          this.decryptConnectorConfig(connector.config)
        );
        const ses = new SesService(sesCfg.region, {
          accessKeyId: sesCfg.accessKeyId,
          secretAccessKey: sesCfg.secretAccessKey,
        });

        console.log(`Sending email via SES to ${rr.email} from ${from}`);
        const resp: any = await ses.sendEmail({
          from,
          to: [rr.email],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp?.MessageId ?? resp?.messageId;
      } else if (connector.type === EmailProviderType.SMTP) {
        const smtpCfg = this.normalizeSmtpConfig(
          this.decryptConnectorConfig(connector.config)
        );
        const smtp = new SmtpService(smtpCfg);

        console.log(`Sending email via SMTP to ${rr.email} from ${from}`);
        const resp = await smtp.sendEmail({
          from,
          to: [rr.email],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp.messageId;
      } else {
        throw new BadRequestException(
          `Sending not implemented for connector type: ${connector.type}`
        );
      }

      console.log(`Email sent successfully to ${rr.email}, messageId=${messageId}`);

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: {
            status: SendStatus.SENT,
            providerMessageId: messageId,
          },
        }),
        this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: { status: RecipientStatus.SENT, skipReason: null },
        }),
      ]);

      // Record send in SendLog for collision detection (only if in a campaign group)
      if (singleSend.campaignGroupId) {
        await this.collisionService.recordSend(
          singleSend.workspaceId,
          rr.subjectId,
          singleSend.campaignGroupId,
          singleSend.id
        );
      }

      // Check if all recipients are done and update run status
      await this.checkAndCompleteRun(rr.runId);

      return { ok: true, status: "sent", messageId: messageId ?? null };
    } catch (e: any) {
      console.error(`Error sending email to ${rr.email}: ${e?.message ?? e}`);
      // If this is the last attempt, mark as failed; otherwise allow retry.
      const isFinalAttempt =
        (job.opts.attempts ?? 1) <= (job.attemptsMade ?? 0) + 1;

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: { status: isFinalAttempt ? SendStatus.FAILED : SendStatus.QUEUED },
        }),
        this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: {
            status: isFinalAttempt ? RecipientStatus.FAILED : RecipientStatus.PENDING,
            skipReason: String(e?.message ?? e),
          },
        }),
      ]);

      // If final attempt failed, check if run should be completed
      if (isFinalAttempt) {
        await this.checkAndCompleteRun(rr.runId);
      }

      throw e;
    }
  }

  /**
   * Process a batch of emails with rate limiting.
   * This is more efficient than individual jobs as it:
   * - Reduces job queue overhead
   * - Can reuse connections within a batch
   * - Applies rate limiting consistently across the batch
   */
  private async sendEmailBatch(job: Job<any, any, string>) {
    const { runId, recipientIds, rateLimitPerSecond } = job.data as {
      runId: string;
      recipientIds: string[];
      rateLimitPerSecond: number;
    };

    console.log(`sendEmailBatch started: runId=${runId}, recipients=${recipientIds.length}, rateLimit=${rateLimitPerSecond}/s`);

    if (!runId || !recipientIds || recipientIds.length === 0) {
      throw new BadRequestException("runId and recipientIds are required");
    }

    // Get run info once for the entire batch
    const run = await this.prisma.singleSendRun.findFirst({
      where: { id: runId },
      include: {
        singleSend: {
          include: {
            template: true,
            senderProfile: { include: { emailProviderConnector: true } },
            campaignGroup: true,
          },
        },
      },
    });

    if (!run) throw new BadRequestException("SingleSendRun not found");
    const singleSend = run.singleSend;
    if (!singleSend) throw new BadRequestException("SingleSend not found");

    const senderProfile = singleSend.senderProfile;
    if (!senderProfile) throw new BadRequestException("SenderProfile missing");
    const connector = senderProfile.emailProviderConnector;
    if (!connector) throw new BadRequestException("SenderProfile connector missing");

    // Load template version once
    const version = await this.prisma.templateVersion.findFirst({
      where: { templateId: singleSend.templateId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!version) {
      throw new BadRequestException(
        "No active template version. Publish a template version first."
      );
    }

    const from = senderProfile.fromName
      ? `${senderProfile.fromName} <${senderProfile.fromEmail}>`
      : senderProfile.fromEmail;

    // Decrypt connector config once
    const decryptedConfig = this.decryptConnectorConfig(connector.config);

    // Process results tracking
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Process each recipient in the batch with rate limiting
    for (const recipientId of recipientIds) {
      try {
        const result = await this.processSingleRecipientInBatch(
          recipientId,
          singleSend,
          version,
          from,
          connector,
          decryptedConfig,
          rateLimitPerSecond
        );

        if (result.sent) sent++;
        else if (result.skipped) skipped++;
        else if (result.failed) failed++;
      } catch (e: any) {
        console.error(`Error processing recipient ${recipientId}: ${e?.message}`);
        failed++;
      }
    }

    console.log(`sendEmailBatch completed: sent=${sent}, failed=${failed}, skipped=${skipped}`);

    // Check if run should be completed after processing this batch
    await this.checkAndCompleteRun(runId);

    return { ok: true, sent, failed, skipped };
  }

  /**
   * Process a single recipient within a batch context.
   * Reuses the pre-loaded template, connector config, etc.
   */
  private async processSingleRecipientInBatch(
    recipientId: string,
    singleSend: any,
    version: any,
    from: string,
    connector: any,
    decryptedConfig: Record<string, any>,
    rateLimitPerSecond: number
  ): Promise<{ sent?: boolean; skipped?: boolean; failed?: boolean }> {
    const rr = await this.prisma.singleSendRecipient.findFirst({
      where: { id: recipientId },
      select: {
        id: true,
        runId: true,
        subjectId: true,
        email: true,
        vars: true,
        status: true,
      },
    });

    if (!rr) {
      console.log(`Recipient ${recipientId} not found, skipping`);
      return { skipped: true };
    }

    // Skip if already processed
    if (rr.status !== RecipientStatus.PENDING) {
      return { skipped: true };
    }

    // Send-time collision check
    const campaignGroup = singleSend.campaignGroup;
    if (singleSend.campaignGroupId && campaignGroup) {
      const collisionResult = await this.collisionService.checkCollisionAtSendTime(
        singleSend.workspaceId,
        rr.subjectId,
        singleSend.campaignGroupId,
        campaignGroup.collisionWindow
      );

      if (collisionResult.blocked) {
        await this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: {
            status: RecipientStatus.SKIPPED,
            skipReason: collisionResult.reason,
          },
        });
        return { skipped: true };
      }
    }

    // Idempotency / Send record
    const idempotencyKey = `singleSendRecipient:${recipientId}`;
    const send = await this.prisma.send.upsert({
      where: { idempotencyKey },
      create: {
        singleSendRecipientId: recipientId,
        idempotencyKey,
        status: SendStatus.QUEUED,
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    // If already sent, short-circuit
    if (send.status === SendStatus.SENT) {
      return { skipped: true };
    }

    // Apply rate limiting
    await this.applyRateLimit(singleSend.senderProfileId, rateLimitPerSecond);

    // Compile template with recipient variables
    const variables = (rr.vars && typeof rr.vars === "object" ? rr.vars : {}) as Record<string, any>;
    const compiled = this.compileAndRender(version, variables);

    try {
      let messageId: string | undefined;

      if (connector.type === EmailProviderType.SES) {
        const sesCfg = this.normalizeSesConfig(decryptedConfig);
        const ses = new SesService(sesCfg.region, {
          accessKeyId: sesCfg.accessKeyId,
          secretAccessKey: sesCfg.secretAccessKey,
        });

        const resp: any = await ses.sendEmail({
          from,
          to: [rr.email],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp?.MessageId ?? resp?.messageId;
      } else if (connector.type === EmailProviderType.SMTP) {
        const smtpCfg = this.normalizeSmtpConfig(decryptedConfig);
        const smtp = new SmtpService(smtpCfg);

        const resp = await smtp.sendEmail({
          from,
          to: [rr.email],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp.messageId;
      } else {
        throw new BadRequestException(
          `Sending not implemented for connector type: ${connector.type}`
        );
      }

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: {
            status: SendStatus.SENT,
            providerMessageId: messageId,
          },
        }),
        this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: { status: RecipientStatus.SENT, skipReason: null },
        }),
      ]);

      // Record send for collision detection
      if (singleSend.campaignGroupId) {
        await this.collisionService.recordSend(
          singleSend.workspaceId,
          rr.subjectId,
          singleSend.campaignGroupId,
          singleSend.id
        );
      }

      return { sent: true };
    } catch (e: any) {
      console.error(`Error sending to ${rr.email}: ${e?.message ?? e}`);

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: { status: SendStatus.FAILED, lastError: String(e?.message ?? e) },
        }),
        this.prisma.singleSendRecipient.update({
          where: { id: rr.id },
          data: {
            status: RecipientStatus.FAILED,
            skipReason: String(e?.message ?? e),
          },
        }),
      ]);

      return { failed: true };
    }
  }

  private async sendJourneyEmail(job: Job<any, any, string>) {
    const workspaceId = job.data?.workspaceId;
    const to = job.data?.to;
    const templateId = job.data?.templateId;
    const senderProfileId = job.data?.senderProfileId;
    const variables = (job.data?.variables && typeof job.data.variables === "object")
      ? (job.data.variables as any)
      : {};
    const idempotencyKey = job.data?.idempotencyKey;

    if (!workspaceId) throw new BadRequestException("workspaceId is required");
    if (!to) throw new BadRequestException("to is required");
    if (!templateId) throw new BadRequestException("templateId is required");
    if (!senderProfileId) throw new BadRequestException("senderProfileId is required");
    if (!idempotencyKey) throw new BadRequestException("idempotencyKey is required");

    const send = await this.prisma.send.upsert({
      where: { idempotencyKey },
      create: {
        idempotencyKey,
        status: SendStatus.QUEUED,
        attempts: 1,
      },
      update: { attempts: { increment: 1 } },
    });

    if (send.status === SendStatus.SENT) return { ok: true, skipped: true };

    const senderProfile = await this.prisma.senderProfile.findFirst({
      where: { id: senderProfileId, workspaceId },
      include: { emailProviderConnector: true },
    });
    if (!senderProfile) throw new BadRequestException("SenderProfile not found");
    const connector = senderProfile.emailProviderConnector;
    if (!connector) throw new BadRequestException("SenderProfile connector missing");

    const ratePerSecond =
      Number(process.env.DEFAULT_RATE_LIMIT_PER_SECOND) || 10;
    await this.applyRateLimit(senderProfile.id, ratePerSecond);

    const version = await this.prisma.templateVersion.findFirst({
      where: { templateId, active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!version) {
      throw new BadRequestException(
        "No active template version. Publish a template version first."
      );
    }

    const compiled = this.compileAndRender(version, variables);
    const from = senderProfile.fromName
      ? `${senderProfile.fromName} <${senderProfile.fromEmail}>`
      : senderProfile.fromEmail;

    try {
      let messageId: string | undefined;

      if (connector.type === EmailProviderType.SES) {
        const sesCfg = this.normalizeSesConfig(
          this.decryptConnectorConfig(connector.config)
        );
        const ses = new SesService(sesCfg.region, {
          accessKeyId: sesCfg.accessKeyId,
          secretAccessKey: sesCfg.secretAccessKey,
        });

        const resp: any = await ses.sendEmail({
          from,
          to: [String(to)],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp?.MessageId ?? resp?.messageId;
      } else if (connector.type === EmailProviderType.SMTP) {
        const smtpCfg = this.normalizeSmtpConfig(
          this.decryptConnectorConfig(connector.config)
        );
        const smtp = new SmtpService(smtpCfg);

        const resp = await smtp.sendEmail({
          from,
          to: [String(to)],
          subject: compiled.subject,
          html: compiled.html,
        });
        messageId = resp.messageId;
      } else {
        throw new BadRequestException(
          `Sending not implemented for connector type: ${connector.type}`
        );
      }

      await this.prisma.send.update({
        where: { id: send.id },
        data: {
          status: SendStatus.SENT,
          providerMessageId: messageId,
        },
      });

      return { ok: true, status: "sent", messageId: messageId ?? null };
    } catch (e: any) {
      const isFinalAttempt =
        (job.opts.attempts ?? 1) <= (job.attemptsMade ?? 0) + 1;
      await this.prisma.send.update({
        where: { id: send.id },
        data: { status: isFinalAttempt ? SendStatus.FAILED : SendStatus.QUEUED },
      });
      throw e;
    }
  }

  /**
   * Check if all recipients for a run have been processed.
   * If so, mark the run as COMPLETED.
   */
  private async checkAndCompleteRun(runId: string) {
    if (!runId) {
      console.log("checkAndCompleteRun called with no runId");
      return;
    }

    // Get all counts in one go to avoid race conditions
    const [pendingCount, sentCount, failedCount, skippedCount, totalCount] = await Promise.all([
      this.prisma.singleSendRecipient.count({ where: { runId, status: RecipientStatus.PENDING } }),
      this.prisma.singleSendRecipient.count({ where: { runId, status: RecipientStatus.SENT } }),
      this.prisma.singleSendRecipient.count({ where: { runId, status: RecipientStatus.FAILED } }),
      this.prisma.singleSendRecipient.count({ where: { runId, status: RecipientStatus.SKIPPED } }),
      this.prisma.singleSendRecipient.count({ where: { runId } }),
    ]);

    console.log(`checkAndCompleteRun(${runId}): total=${totalCount}, pending=${pendingCount}, sent=${sentCount}, failed=${failedCount}, skipped=${skippedCount}`);

    // If there are still pending recipients, don't complete yet
    if (pendingCount > 0) {
      console.log(`Run ${runId} still has ${pendingCount} pending recipients, not completing`);
      return;
    }

    // Safety check: don't mark as complete if no recipients were actually processed
    const processedCount = sentCount + failedCount + skippedCount;
    if (processedCount === 0) {
      console.log(`Run ${runId} has no processed recipients (total=${totalCount}), not completing`);
      return;
    }

    // Get the run to check its current status
    const run = await this.prisma.singleSendRun.findFirst({
      where: { id: runId },
      select: { id: true, status: true },
    });

    // Only complete if currently in SENDING status
    if (!run) {
      console.log(`Run ${runId} not found`);
      return;
    }
    if (run.status !== SingleSendRunStatus.SENDING) {
      console.log(`Run ${runId} is in ${run.status} status, not SENDING, skipping completion`);
      return;
    }

    // Count skip reasons for detailed stats
    const skippedRecipients = await this.prisma.singleSendRecipient.findMany({
      where: { runId, status: RecipientStatus.SKIPPED },
      select: { skipReason: true },
    });

    const skippedReasons = {
      collision: 0,
      suppression: 0,
      other: 0,
    };

    for (const r of skippedRecipients) {
      const reason = r.skipReason ?? "";
      if (reason.startsWith("collision:")) {
        skippedReasons.collision++;
      } else if (reason.startsWith("suppression:")) {
        skippedReasons.suppression++;
      } else {
        skippedReasons.other++;
      }
    }

    await this.prisma.singleSendRun.update({
      where: { id: runId },
      data: {
        status: SingleSendRunStatus.COMPLETED,
        completedAt: new Date(),
        stats: {
          total: totalCount,
          sent: sentCount,
          failed: failedCount,
          skipped: skippedCount,
          skippedReasons,
        },
      },
    });

    console.log(`Run ${runId} marked as COMPLETED: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`);
  }
}
