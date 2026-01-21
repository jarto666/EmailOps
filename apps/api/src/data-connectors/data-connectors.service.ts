import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConnectorFactory } from "../lib/connectors";
import { DataConnectorType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../lib/encryption";

type EncryptedConnectorConfig = { encrypted: string };

// Secrets to redact from config when returning to client
const SECRET_FIELDS: Record<DataConnectorType, string[]> = {
  [DataConnectorType.POSTGRES]: ["connectionString"],
  [DataConnectorType.BIGQUERY]: ["credentials.private_key"],
};

@Injectable()
export class DataConnectorsService {
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
    type: DataConnectorType;
    name: string;
    config: Record<string, any>;
  }) {
    const created = await this.prisma.dataConnector.create({
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
    const connectors = await this.prisma.dataConnector.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return connectors.map((c) => this.sanitize(c));
  }

  async get(workspaceId: string, id: string, includeConfig = false) {
    const connector = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Data connector not found");

    if (includeConfig) {
      const config = this.decryptConfig(connector.config);

      // Redact secrets
      const secrets = SECRET_FIELDS[connector.type] || [];
      for (const field of secrets) {
        if (field.includes(".")) {
          // Handle nested keys like "credentials.private_key"
          const parts = field.split(".");
          let current = config;
          let found = true;
          for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] && typeof current[parts[i]] === "object") {
              current = current[parts[i]];
            } else {
              found = false;
              break;
            }
          }
          if (found) {
            delete current[parts[parts.length - 1]];
          }
        } else {
          delete config[field];
        }
      }

      return {
        ...connector,
        config,
      };
    }
    return this.sanitize(connector);
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Data connector not found");

    const updated = await this.prisma.dataConnector.update({
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
    const existing = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Data connector not found");
    await this.prisma.dataConnector.delete({ where: { id } });
    return { ok: true };
  }

  async testConnection(type: DataConnectorType, config: Record<string, any>) {
    switch (type) {
      case DataConnectorType.POSTGRES:
      case DataConnectorType.BIGQUERY: {
        const adapter = ConnectorFactory.getConnector(type as any, config);
        try {
          await adapter.testConnection();
          return { ok: true };
        } catch (e: any) {
          // Surface a helpful 4xx to the UI instead of a generic 500.
          const msg = String(e?.message ?? e);
          throw new BadRequestException(`Connection test failed: ${msg}`);
        } finally {
          await adapter.close().catch(() => undefined);
        }
      }
      default:
        throw new BadRequestException(
          `testConnection not implemented for data connector type: ${type}`,
        );
    }
  }

  async getConfigField(workspaceId: string, id: string, fieldKey: string) {
    const connector = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Data connector not found");

    const config = this.decryptConfig(connector.config);

    // Support nested keys like "credentials.client_email"
    const keys = fieldKey.split(".");
    let value: any = config;
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    return { value: value !== undefined ? String(value) : null };
  }
}
