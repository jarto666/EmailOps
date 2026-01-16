import { PrismaClient } from '@email-ops/core';
/**
 * Test database manager using testcontainers
 * Spins up a real PostgreSQL instance for integration tests
 */
export declare class TestDatabase {
    private container;
    private prisma;
    /**
     * Start the PostgreSQL container and run migrations
     */
    start(): Promise<void>;
    /**
     * Get the Prisma client instance
     */
    getClient(): PrismaClient;
    /**
     * Get the database connection URL
     */
    getConnectionUrl(): string;
    /**
     * Clean all tables (useful between tests)
     */
    clean(): Promise<void>;
    /**
     * Stop the container and disconnect
     */
    stop(): Promise<void>;
}
export declare function getTestDatabase(): Promise<TestDatabase>;
export declare function closeTestDatabase(): Promise<void>;
