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
export declare class PostgresAdapter implements DataConnectorAdapter {
    private config;
    private pool;
    private statementTimeoutMs;
    constructor(config: PostgresConfig);
    testConnection(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    close(): Promise<void>;
}
export declare class BigQueryAdapter implements DataConnectorAdapter {
    private config;
    private client;
    constructor(config: BigQueryConfig);
    testConnection(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    close(): Promise<void>;
}
export declare class ConnectorFactory {
    static getConnector(type: 'POSTGRES' | 'BIGQUERY', config: any): DataConnectorAdapter;
}
