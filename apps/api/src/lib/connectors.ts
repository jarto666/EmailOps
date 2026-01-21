import { Pool } from "pg";
import { BigQuery } from "@google-cloud/bigquery";

export interface DataConnectorAdapter {
  /**
   * Executes a read-only query. Implementations must prevent DML/DDL and enforce
   * read-only behavior at the database layer where possible.
   */
  query<T = any>(query: string, params?: any[]): Promise<T[]>;
  testConnection(): Promise<void>;
  close(): Promise<void>;
}

export type PostgresConfig = {
  connectionString: string;
  statementTimeoutMs?: number;
};

export type BigQueryConfig = {
  projectId: string;
  credentials: Record<string, any>;
};

function assertReadOnlySql(sql: string) {
  const normalized = sql.trim().toLowerCase();
  const startsOk =
    normalized.startsWith("select") || normalized.startsWith("with");
  if (!startsOk) {
    throw new Error("Only SELECT/CTE queries are allowed for data connectors.");
  }
  // Very simple DML/DDL guardrail (best-effort). Read-only transactions are the real enforcement for Postgres.
  const forbidden =
    /\b(insert|update|delete|upsert|merge|drop|alter|create|truncate|grant|revoke|comment|vacuum|analyze)\b/i;
  if (forbidden.test(sql)) {
    throw new Error("Query contains forbidden DML/DDL keywords.");
  }
}

export class PostgresAdapter implements DataConnectorAdapter {
  private pool: Pool;
  private statementTimeoutMs: number;

  constructor(private config: PostgresConfig) {
    this.pool = new Pool({ connectionString: config.connectionString });
    const raw = (config as any)?.statementTimeoutMs;
    const n = Number(raw);
    // Clamp to a sane range and avoid SQL injection by ensuring this is a finite integer.
    const safeMs = Number.isFinite(n) ? Math.floor(n) : 15_000;
    this.statementTimeoutMs = Math.min(Math.max(safeMs, 0), 10 * 60_000);
  }

  private async applySessionGuards(client: {
    query: (sql: string) => Promise<any>;
  }) {
    // NOTE: Postgres does NOT allow bind params in SET statements (e.g. "SET ... = $1").
    // We ensure the timeout is a finite integer in the constructor, so interpolation is safe here.
    await client.query(
      `SET LOCAL statement_timeout = ${this.statementTimeoutMs}`
    );
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await this.applySessionGuards(client);
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
    }
  }

  async query<T = any>(sql: string, params: any[] = []) {
    assertReadOnlySql(sql);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await this.applySessionGuards(client);
      const res = await client.query(sql, params);
      await client.query("COMMIT");
      return (res.rows ?? []) as T[];
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore
      }
      throw e;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export class BigQueryAdapter implements DataConnectorAdapter {
  private client: BigQuery;
  constructor(private config: BigQueryConfig) {
    this.client = new BigQuery({
      projectId: config.projectId,
      credentials: config.credentials,
    });
  }

  async testConnection() {
    // Cheap "can we auth + reach API" check.
    await this.client.getDatasets({ maxResults: 1 });
  }

  async query<T = any>(sql: string, params?: any[]) {
    assertReadOnlySql(sql);
    const [job] = await this.client.createQueryJob({
      query: sql,
      params,
      useLegacySql: false,
    });
    const [rows] = await job.getQueryResults();
    return rows as unknown as T[];
  }

  async close() {
    // BigQuery client has no explicit close (HTTP keep-alive); keep for interface symmetry.
    return;
  }
}

export class ConnectorFactory {
  static getConnector(
    type: "POSTGRES" | "BIGQUERY",
    config: any
  ): DataConnectorAdapter {
    if (type === "POSTGRES") return new PostgresAdapter(config);
    if (type === "BIGQUERY") return new BigQueryAdapter(config);
    // Exhaustive guard
    throw new Error(`Unknown connector type: ${type}`);
  }
}
