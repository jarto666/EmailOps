import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataConnectorType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../lib/encryption";

function clampInt(v: any, min: number, max: number) {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function validateSegmentSql(sql: string) {
  const s = (sql ?? "").trim();
  if (s.length === 0) throw new BadRequestException("sqlQuery is required.");
  // Basic safety for MVP: only allow a single SELECT/WITH statement.
  if (!/^(select|with)\b/i.test(s)) {
    throw new BadRequestException("Only SELECT/WITH queries are allowed.");
  }
  if (s.includes(";")) {
    throw new BadRequestException("Semicolons are not allowed (single statement only).");
  }
  const forbidden = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "truncate",
    "grant",
    "revoke",
    "call",
    "do",
  ];
  const lowered = s.toLowerCase();
  for (const kw of forbidden) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lowered)) {
      throw new BadRequestException(`Forbidden keyword in sqlQuery: ${kw}`);
    }
  }
  return s;
}

@Injectable()
export class SegmentsService {
  private encryption: EncryptionService;

  constructor(private prisma: PrismaService) {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_SECRET is required to decrypt connector credentials."
      );
    }
    this.encryption = new EncryptionService(secret);
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

  private normalizePostgresConnectionString(raw: Record<string, any>): string {
    const connectionString = raw?.connectionString;
    if (typeof connectionString === "string" && connectionString.length > 0) {
      return connectionString;
    }
    throw new BadRequestException(
      "POSTGRES connector config must include a non-empty `connectionString`."
    );
  }

  async create(input: {
    workspaceId: string;
    name: string;
    dataConnectorId: string;
    sqlQuery: string;
  }) {
    if (!input.workspaceId || input.workspaceId.trim().length === 0) {
      throw new BadRequestException("workspaceId is required.");
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException("name is required.");
    }
    if (!input.dataConnectorId || input.dataConnectorId.trim().length === 0) {
      throw new BadRequestException("dataConnectorId is required.");
    }
    const sqlQuery = validateSegmentSql(input.sqlQuery);

    // Ensure workspace exists so Segment.workspaceId FK doesn't fail.
    await this.prisma.workspace.upsert({
      where: { id: input.workspaceId },
      update: {},
      create: { id: input.workspaceId, name: "Default Workspace" },
    });

    const connector = await this.prisma.dataConnector.findFirst({
      where: { id: input.dataConnectorId, workspaceId: input.workspaceId },
      select: { id: true },
    });
    if (!connector) {
      throw new BadRequestException(
        "Invalid dataConnectorId (must exist and belong to workspace)."
      );
    }

    return this.prisma.segment.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        dataConnectorId: input.dataConnectorId,
        sqlQuery,
      },
      include: {
        dataConnector: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.segment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        dataConnector: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async get(workspaceId: string, id: string) {
    const segment = await this.prisma.segment.findFirst({
      where: { id, workspaceId },
      include: {
        dataConnector: { select: { id: true, name: true, type: true } },
      },
    });
    if (!segment) throw new NotFoundException("Segment not found");
    return segment;
  }

  async update(
    workspaceId: string,
    id: string,
    input: { name?: string; dataConnectorId?: string; sqlQuery?: string }
  ) {
    const existing = await this.prisma.segment.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Segment not found");

    let dataConnectorId: string | undefined = undefined;
    if (input.dataConnectorId != null) {
      if (
        typeof input.dataConnectorId !== "string" ||
        input.dataConnectorId.trim() === ""
      ) {
        throw new BadRequestException(
          "dataConnectorId must be a non-empty string."
        );
      }
      const connector = await this.prisma.dataConnector.findFirst({
        where: { id: input.dataConnectorId, workspaceId },
        select: { id: true },
      });
      if (!connector) {
        throw new BadRequestException(
          "Invalid dataConnectorId (must exist and belong to workspace)."
        );
      }
      dataConnectorId = input.dataConnectorId;
    }

    const sqlQuery =
      input.sqlQuery != null ? validateSegmentSql(input.sqlQuery) : undefined;

    return this.prisma.segment.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        dataConnectorId,
        sqlQuery,
      },
      include: {
        dataConnector: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.segment.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Segment not found");

    try {
      await this.prisma.segment.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(
        e?.message ?? "Failed to delete segment (is it referenced by a campaign?)"
      );
    }
  }

  // Column name variants accepted by the segment processor
  private static readonly ID_COLUMNS = ['subject_id', 'subjectid', 'recipient_id', 'recipientid', 'id'];
  private static readonly EMAIL_COLUMNS = ['email', 'email_address'];
  private static readonly VARS_COLUMNS = ['vars', 'variables', 'vars_json'];

  private validateResultColumns(rows: any[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    foundColumns: { id?: string; email?: string; vars?: string };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const foundColumns: { id?: string; email?: string; vars?: string } = {};

    if (rows.length === 0) {
      return { valid: true, errors, warnings, foundColumns };
    }

    const sampleRow = rows[0];
    const columnNames = Object.keys(sampleRow).map(c => c.toLowerCase());

    // Check for ID column
    const idColumn = SegmentsService.ID_COLUMNS.find(c => columnNames.includes(c));
    if (idColumn) {
      foundColumns.id = idColumn;
    } else {
      errors.push(`Missing ID column. Must include one of: ${SegmentsService.ID_COLUMNS.join(', ')}`);
    }

    // Check for email column
    const emailColumn = SegmentsService.EMAIL_COLUMNS.find(c => columnNames.includes(c));
    if (emailColumn) {
      foundColumns.email = emailColumn;
    } else {
      errors.push(`Missing email column. Must include one of: ${SegmentsService.EMAIL_COLUMNS.join(', ')}`);
    }

    // Check for vars column (optional but recommended)
    const varsColumn = SegmentsService.VARS_COLUMNS.find(c => columnNames.includes(c));
    if (varsColumn) {
      foundColumns.vars = varsColumn;
    } else {
      // Check if there are extra columns that could be template variables
      const knownColumns = [...SegmentsService.ID_COLUMNS, ...SegmentsService.EMAIL_COLUMNS, ...SegmentsService.VARS_COLUMNS];
      const extraColumns = columnNames.filter(c => !knownColumns.includes(c));
      if (extraColumns.length > 0) {
        warnings.push(
          `Extra columns found (${extraColumns.join(', ')}) but no vars/variables column. ` +
          `These won't be available as template variables. Use: SELECT ..., json_build_object('key', value) as vars`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      foundColumns,
    };
  }

  async dryRun(
    workspaceId: string,
    id: string,
    input: { limit?: number } = {}
  ): Promise<{
    count: number;
    rows: any[];
    validation: {
      valid: boolean;
      errors: string[];
      warnings: string[];
      foundColumns: { id?: string; email?: string; vars?: string };
    };
  }> {
    const segment = await this.prisma.segment.findFirst({
      where: { id, workspaceId },
      include: { dataConnector: true },
    });
    if (!segment) throw new NotFoundException("Segment not found");

    const sql = validateSegmentSql(segment.sqlQuery);
    const limit = clampInt(input?.limit ?? 25, 1, 100);

    const connector = segment.dataConnector;
    if (!connector) throw new BadRequestException("Segment has no data connector.");

    if (connector.type !== DataConnectorType.POSTGRES) {
      throw new BadRequestException(
        `dryRun currently supports POSTGRES data connectors only (got ${connector.type}).`
      );
    }

    const decrypted = this.decryptConnectorConfig(connector.config);
    const connectionString = this.normalizePostgresConnectionString(decrypted);

    // Dynamic require so TS compilation doesn't depend on `pg` types.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require("pg") as any;
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout TO 5000");

      const countSql = `SELECT COUNT(*)::int as count FROM (${sql}) as segment_count`;
      const previewSql = `SELECT * FROM (${sql}) as segment_preview LIMIT $1`;

      const [countRes, previewRes] = await Promise.all([
        client.query(countSql),
        client.query(previewSql, [limit]),
      ]);

      const count = countRes?.rows?.[0]?.count ?? 0;
      const rows = Array.isArray(previewRes?.rows) ? previewRes.rows : [];

      await client.query("COMMIT");

      // Validate the result columns
      const validation = this.validateResultColumns(rows);

      return { count, rows, validation };
    } catch (e: any) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore
      }
      throw new BadRequestException(e?.message ?? "dryRun failed");
    } finally {
      client.release();
      await pool.end();
    }
  }
}

