import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { EncryptionService } from "../lib/encryption";
import { AuthoringMode, EmailProviderType, SingleSendRunStatus } from "@prisma/client";
import { RecipientStatus, SendStatus } from "@prisma/client";
import { EmailCompiler } from "../lib/email";
import { SesService } from "../lib/ses";
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
      if (connector.type !== EmailProviderType.SES) {
        throw new BadRequestException(
          `Sending not implemented for connector type: ${connector.type}`
        );
      }
      const sesCfg = this.normalizeSesConfig(
        this.decryptConnectorConfig(connector.config)
      );
      const ses = new SesService(sesCfg.region, {
        accessKeyId: sesCfg.accessKeyId,
        secretAccessKey: sesCfg.secretAccessKey,
      });

      console.log(`Sending email to ${rr.email} from ${from}`);
      const resp: any = await ses.sendEmail({
        from,
        to: [rr.email],
        subject: compiled.subject,
        html: compiled.html,
      });
      console.log(`Email sent successfully to ${rr.email}, messageId=${resp?.MessageId}`);

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: {
            status: SendStatus.SENT,
            providerMessageId: resp?.MessageId ?? resp?.messageId ?? undefined,
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

      return { ok: true, status: "sent", messageId: resp?.MessageId ?? null };
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
      if (connector.type !== EmailProviderType.SES) {
        throw new BadRequestException(
          `Sending not implemented for connector type: ${connector.type}`
        );
      }
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

      await this.prisma.send.update({
        where: { id: send.id },
        data: {
          status: SendStatus.SENT,
          providerMessageId: resp?.MessageId ?? resp?.messageId ?? undefined,
        },
      });

      return { ok: true, status: "sent", messageId: resp?.MessageId ?? null };
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
        },
      },
    });

    console.log(`Run ${runId} marked as COMPLETED: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`);
  }
}
