import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConnectorType } from "@email-ops/core";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/encryption.service";

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
    type: ConnectorType;
    name: string;
    config: Record<string, any>;
  }) {
    const created = await this.prisma.connector.create({
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
    const connectors = await this.prisma.connector.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return connectors.map((c) => this.sanitizeConnector(c));
  }

  async get(workspaceId: string, id: string) {
    const connector = await this.prisma.connector.findFirst({
      where: { id, workspaceId },
    });
    if (!connector) throw new NotFoundException("Connector not found");
    return this.sanitizeConnector(connector);
  }

  async update(workspaceId: string, id: string, input: any) {
    const existing = await this.prisma.connector.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException("Connector not found");

    const updated = await this.prisma.connector.update({
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
    const existing = await this.prisma.connector.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Connector not found");
    await this.prisma.connector.delete({ where: { id } });
    return { ok: true };
  }

  async testConnection(type: ConnectorType, config: Record<string, any>) {
    switch (type) {
      case ConnectorType.POSTGRES: {
        const connectionString = this.normalizePostgresConnectionString(config);
        // Use dynamic require so TS compilation doesn't depend on `pg` types being installed in this package.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Pool } = require("pg") as any;
        const pool = new Pool({ connectionString });
        const client = await pool.connect();
        try {
          await client.query("BEGIN READ ONLY");
          await client.query("SELECT 1 as ok");
          await client.query("COMMIT");
        } catch (e) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // ignore
          }
          throw e;
        } finally {
          client.release();
          await pool.end();
        }
        return { ok: true };
      }
      case ConnectorType.SES: {
        const ses = this.normalizeSesConfig(config);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SESv2Client, GetAccountCommand } =
          require("@aws-sdk/client-sesv2") as any;
        const client = new SESv2Client({
          region: ses.region,
          credentials: {
            accessKeyId: ses.accessKeyId,
            secretAccessKey: ses.secretAccessKey,
          },
        });
        await client.send(new GetAccountCommand({}));
        return { ok: true };
      }
      default:
        throw new BadRequestException(
          `testConnection not implemented for connector type: ${type}`
        );
    }
  }

  private normalizePostgresConnectionString(raw: Record<string, any>): string {
    const connectionString = raw?.connectionString;
    if (typeof connectionString === "string" && connectionString.length > 0) {
      return connectionString;
    }
    throw new BadRequestException(
      "POSTGRES config must include a non-empty `connectionString`."
    );
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
      throw new BadRequestException(
        "SES config must include `secretAccessKey`."
      );
    }
    return { region, accessKeyId, secretAccessKey };
  }
}
