import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EmailProviderType } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../lib/encryption";

type EncryptedConnectorConfig = { encrypted: string };

// Providers that support webhooks
const WEBHOOK_PROVIDERS: EmailProviderType[] = [
  EmailProviderType.SES,
  EmailProviderType.RESEND,
];

// Secrets to redact from config when returning to client
const SECRET_FIELDS: Record<EmailProviderType, string[]> = {
  [EmailProviderType.SES]: ["secretAccessKey"],
  [EmailProviderType.RESEND]: ["apiKey"],
  [EmailProviderType.SMTP]: ["pass"],
};

@Injectable()
export class EmailConnectorsService {
  private encryption: EncryptionService;

  constructor(private prisma: PrismaService) {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to store connector credentials securely.",
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  private encryptConfig(config: Record<string, any>): EncryptedConnectorConfig {
    const plaintext = JSON.stringify(config ?? {});
    return { encrypted: this.encryption.encrypt(plaintext) };
  }

  private generateWebhookToken(): string {
    return randomBytes(16).toString("hex");
  }

  private getWebhookUrl(
    type: EmailProviderType,
    token: string | null,
  ): string | null {
    if (!token || !WEBHOOK_PROVIDERS.includes(type)) {
      return null;
    }
    const baseUrl = process.env.API_BASE_URL || process.env.BASE_URL || "";
    const providerPath = type.toLowerCase(); // 'ses', 'resend'
    return `${baseUrl}/webhooks/${providerPath}/${token}`;
  }

  private sanitize(connector: any) {
    const webhookToken = connector.webhookToken ?? null;
    return {
      ...connector,
      config: { redacted: true },
      webhookToken,
      webhookUrl: this.getWebhookUrl(connector.type, webhookToken),
    };
  }

  private decryptConfig(configJson: any): Record<string, any> {
    const encrypted = configJson?.encrypted;
    if (typeof encrypted !== "string" || encrypted.length === 0) {
      return {};
    }
    const plaintext = this.encryption.decrypt(encrypted);
    try {
      return JSON.parse(plaintext);
    } catch {
      return {};
    }
  }

  async create(input: {
    workspaceId: string;
    type: EmailProviderType;
    name: string;
    config: Record<string, any>;
  }) {
    // Generate webhook token for providers that support webhooks
    const webhookToken = WEBHOOK_PROVIDERS.includes(input.type)
      ? this.generateWebhookToken()
      : null;

    const created = await this.prisma.emailProviderConnector.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type,
        name: input.name,
        config: this.encryptConfig(input.config),
        webhookToken,
      },
    });
    return this.sanitize(created);
  }

  async list(workspaceId: string) {
    const connectors = await this.prisma.emailProviderConnector.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return connectors.map((c) => this.sanitize(c));
  }

  async get(workspaceId: string, id: string, includeConfig = false) {
    const connector = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Email connector not found");

    if (includeConfig) {
      const config = this.decryptConfig(connector.config);

      // Redact secrets
      const secrets = SECRET_FIELDS[connector.type] || [];
      for (const field of secrets) {
        delete config[field];
      }

      return {
        ...connector,
        config,
      };
    }
    return this.sanitize(connector);
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Email connector not found");

    const updated = await this.prisma.emailProviderConnector.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        type: input.type ?? undefined,
        config: input.config ? this.encryptConfig(input.config) : undefined,
      },
    });
    return this.sanitize(updated);
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Email connector not found");
    await this.prisma.emailProviderConnector.delete({ where: { id } });
    return { ok: true };
  }

  async testById(workspaceId: string, id: string) {
    const connector = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Email connector not found");

    const config = this.decryptConfig(connector.config);
    return this.testConnection(connector.type as EmailProviderType, config);
  }

  async testConnection(type: EmailProviderType, config: Record<string, any>) {
    switch (type) {
      case EmailProviderType.SES: {
        const region = config?.region;
        const accessKeyId = config?.accessKeyId;
        const secretAccessKey = config?.secretAccessKey;
        if (!region || !accessKeyId || !secretAccessKey) {
          throw new BadRequestException(
            "SES config must include region/accessKeyId/secretAccessKey",
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SESv2Client, GetAccountCommand } =
          require("@aws-sdk/client-sesv2") as any;
        const client = new SESv2Client({
          region,
          credentials: { accessKeyId, secretAccessKey },
        });
        await client.send(new GetAccountCommand({}));
        return { ok: true };
      }
      default:
        throw new BadRequestException(
          `testConnection not implemented for email provider: ${type}`,
        );
    }
  }

  async regenerateWebhookToken(workspaceId: string, id: string) {
    const existing = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Email connector not found");

    if (!WEBHOOK_PROVIDERS.includes(existing.type)) {
      throw new BadRequestException(
        `Webhook tokens are not supported for provider type: ${existing.type}`,
      );
    }

    const newToken = this.generateWebhookToken();
    const updated = await this.prisma.emailProviderConnector.update({
      where: { id },
      data: { webhookToken: newToken },
    });

    return this.sanitize(updated);
  }

  async setWebhookToken(workspaceId: string, id: string, token: string | null) {
    const existing = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Email connector not found");

    if (!WEBHOOK_PROVIDERS.includes(existing.type)) {
      throw new BadRequestException(
        `Webhook tokens are not supported for provider type: ${existing.type}`,
      );
    }

    // Validate token format if provided (alphanumeric, reasonable length)
    if (token !== null) {
      if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
        throw new BadRequestException(
          "Webhook token must be 8-64 characters and contain only letters, numbers, underscores, and hyphens",
        );
      }
    }

    const updated = await this.prisma.emailProviderConnector.update({
      where: { id },
      data: { webhookToken: token },
    });

    return this.sanitize(updated);
  }

  async getConfigField(workspaceId: string, id: string, fieldKey: string) {
    const connector = await this.prisma.emailProviderConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Email connector not found");

    const config = this.decryptConfig(connector.config);
    const value = config[fieldKey];
    return { value: value !== undefined ? String(value) : null };
  }
}
