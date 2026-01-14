"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorFactory = exports.BigQueryAdapter = exports.PostgresAdapter = void 0;
const pg_1 = require("pg");
const bigquery_1 = require("@google-cloud/bigquery");
function assertReadOnlySql(sql) {
    const normalized = sql.trim().toLowerCase();
    const startsOk = normalized.startsWith('select') || normalized.startsWith('with');
    if (!startsOk) {
        throw new Error('Only SELECT/CTE queries are allowed for data connectors.');
    }
    // Very simple DML/DDL guardrail (best-effort). Read-only transactions are the real enforcement for Postgres.
    const forbidden = /\b(insert|update|delete|upsert|merge|drop|alter|create|truncate|grant|revoke|comment|vacuum|analyze)\b/i;
    if (forbidden.test(sql)) {
        throw new Error('Query contains forbidden DML/DDL keywords.');
    }
}
class PostgresAdapter {
    constructor(config) {
        this.config = config;
        this.pool = new pg_1.Pool({ connectionString: config.connectionString });
        this.statementTimeoutMs = config.statementTimeoutMs ?? 15000;
    }
    async testConnection() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN READ ONLY');
            await client.query('SET LOCAL statement_timeout = $1', [
                this.statementTimeoutMs,
            ]);
            await client.query('SELECT 1 as ok');
            await client.query('COMMIT');
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch {
                // ignore
            }
            throw e;
        }
        finally {
            client.release();
        }
    }
    async query(sql, params = []) {
        assertReadOnlySql(sql);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN READ ONLY');
            await client.query('SET LOCAL statement_timeout = $1', [
                this.statementTimeoutMs,
            ]);
            const res = await client.query(sql, params);
            await client.query('COMMIT');
            return (res.rows ?? []);
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch {
                // ignore
            }
            throw e;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresAdapter = PostgresAdapter;
class BigQueryAdapter {
    constructor(config) {
        this.config = config;
        this.client = new bigquery_1.BigQuery({
            projectId: config.projectId,
            credentials: config.credentials,
        });
    }
    async testConnection() {
        // Cheap “can we auth + reach API” check.
        await this.client.getDatasets({ maxResults: 1 });
    }
    async query(sql, params) {
        assertReadOnlySql(sql);
        const [job] = await this.client.createQueryJob({
            query: sql,
            params,
            useLegacySql: false,
        });
        const [rows] = await job.getQueryResults();
        return rows;
    }
    async close() {
        // BigQuery client has no explicit close (HTTP keep-alive); keep for interface symmetry.
        return;
    }
}
exports.BigQueryAdapter = BigQueryAdapter;
class ConnectorFactory {
    static getConnector(type, config) {
        if (type === 'POSTGRES')
            return new PostgresAdapter(config);
        if (type === 'BIGQUERY')
            return new BigQueryAdapter(config);
        // Exhaustive guard
        throw new Error(`Unknown connector type: ${type}`);
    }
}
exports.ConnectorFactory = ConnectorFactory;
