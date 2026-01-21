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

@Injectable()
export class ConnectorsService {
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

  private sanitizeConnector(connector: any) {
    // Never return encrypted payloads to callers.
    return { ...connector, config: { redacted: true } };
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
    return this.sanitizeConnector(created);
  }

  async list(workspaceId: string) {
    const connectors = await this.prisma.dataConnector.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return connectors.map((c) => this.sanitizeConnector(c));
  }

  async get(workspaceId: string, id: string) {
    const connector = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Connector not found");
    return this.sanitizeConnector(connector);
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Connector not found");

    const updated = await this.prisma.dataConnector.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        type: input.type ?? undefined,
        config: input.config ? this.encryptConfig(input.config) : undefined,
      },
    });
    return this.sanitizeConnector(updated);
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.dataConnector.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Connector not found");
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
        } finally {
          await adapter.close().catch(() => undefined);
        }
      }
      default:
        throw new BadRequestException(
          `testConnection not implemented for connector type: ${type}`
        );
    }
  }
}
