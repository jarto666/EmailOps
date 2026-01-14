import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { BadRequestException } from "@nestjs/common";
import { AuthoringMode, ConnectorType, EncryptionService } from "@email-ops/core";
import { EmailCompiler } from "@email-ops/email";
import { SesService } from "@email-ops/ses";
import { PrismaService } from "../prisma/prisma.service";

@Processor("send")
export class SendProcessor extends WorkerHost {
  private encryption: EncryptionService;
  private static nextAllowedBySenderProfile = new Map<string, number>();

  constructor(private prisma: PrismaService) {
    super();
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to decrypt connector credentials."
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing send job ${job.name}`);
    switch (job.name) {
      case "sendEmail":
        return this.sendEmail(job);
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

    // MVP: in-memory pacing per worker instance (good enough for single worker).
    const spacingMs = Math.ceil(1000 / ratePerSecond);
    const now = Date.now();
    const nextAllowed =
      SendProcessor.nextAllowedBySenderProfile.get(senderProfileId) ?? now;
    const startAt = Math.max(now, nextAllowed);
    SendProcessor.nextAllowedBySenderProfile.set(senderProfileId, startAt + spacingMs);

    const delay = startAt - now;
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
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
    const runRecipientId = job.data?.runRecipientId;
    if (!runRecipientId) throw new BadRequestException("runRecipientId is required");

    const rr = await this.prisma.runRecipient.findFirst({
      where: { id: runRecipientId },
      include: {
        run: {
          include: {
            campaign: {
              include: {
                template: true,
                senderProfile: { include: { connector: true } },
              },
            },
          },
        },
      },
    });
    if (!rr) throw new BadRequestException("RunRecipient not found");

    const campaign = rr.run?.campaign;
    if (!campaign) throw new BadRequestException("Campaign not found for run");

    // Idempotency / Send record
    const idempotencyKey = `runRecipient:${runRecipientId}`;
    const send = await this.prisma.send.upsert({
      where: { idempotencyKey },
      create: {
        workspaceId: campaign.workspaceId,
        runRecipientId,
        idempotencyKey,
        status: "QUEUED",
        attempts: 1,
      },
      update: {
        attempts: { increment: 1 },
      },
    });

    // If already sent, short-circuit.
    if (send.status === "SENT" || rr.status === "SENT") {
      return { ok: true, skipped: true };
    }

    const senderProfile = campaign.senderProfile;
    if (!senderProfile) throw new BadRequestException("SenderProfile missing");
    const connector = senderProfile.connector;
    if (!connector) throw new BadRequestException("SenderProfile connector missing");

    // Rate limit: campaign policy overrides env default
    const ratePerSecond =
      Number((campaign.policies as any)?.rateLimitPerSecond) ||
      Number(process.env.DEFAULT_RATE_LIMIT_PER_SECOND) ||
      10;
    await this.applyRateLimit(senderProfile.id, ratePerSecond);

    // Load active template version
    const version = await this.prisma.templateVersion.findFirst({
      where: { templateId: campaign.templateId, active: true },
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
      if (connector.type !== ConnectorType.SES) {
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
        to: [rr.email],
        subject: compiled.subject,
        html: compiled.html,
      });

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: {
            status: "SENT",
            providerMessageId: resp?.MessageId ?? resp?.messageId ?? undefined,
          },
        }),
        this.prisma.runRecipient.update({
          where: { id: rr.id },
          data: { status: "SENT", skipReason: null },
        }),
      ]);

      return { ok: true, status: "sent", messageId: resp?.MessageId ?? null };
    } catch (e: any) {
      // If this is the last attempt, mark as failed; otherwise allow retry.
      const isFinalAttempt =
        (job.opts.attempts ?? 1) <= (job.attemptsMade ?? 0) + 1;

      await this.prisma.$transaction([
        this.prisma.send.update({
          where: { id: send.id },
          data: { status: isFinalAttempt ? "FAILED" : "QUEUED" },
        }),
        this.prisma.runRecipient.update({
          where: { id: rr.id },
          data: {
            status: isFinalAttempt ? "FAILED" : "PENDING",
            skipReason: String(e?.message ?? e),
          },
        }),
      ]);

      throw e;
    }
  }
}
