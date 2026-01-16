import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EmailProviderType } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/encryption.service";

type EncryptedConnectorConfig = { encrypted: string };

@Injectable()
export class EmailConnectorsService {
  private encryption: EncryptionService;

  constructor(private prisma: PrismaService) {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to store connector credentials securely."
      );
    }
    this.encryption = new EncryptionService(secret);
  }

  private encryptConfig(config: Record<string, any>): EncryptedConnectorConfig {
    const plaintext = JSON.stringify(config ?? {});
    return { encrypted: this.encryption.encrypt(plaintext) };
  }

  private sanitize(connector: any) {
    return { ...connector, config: { redacted: true } };
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
    const created = await this.prisma.emailProviderConnector.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type,
        name: input.name,
        config: this.encryptConfig(input.config),
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
      return {
        ...connector,
        config: this.decryptConfig(connector.config),
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
            "SES config must include region/accessKeyId/secretAccessKey"
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
          `testConnection not implemented for email provider: ${type}`
        );
    }
  }
}

