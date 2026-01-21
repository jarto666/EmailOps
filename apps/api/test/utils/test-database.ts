import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Test database manager using testcontainers
 * Spins up a real PostgreSQL instance for integration tests
 */
export class TestDatabase {
  private container: StartedPostgreSqlContainer | null = null;
  private prisma: PrismaClient | null = null;

  /**
   * Start the PostgreSQL container and run migrations
   */
  async start(): Promise<void> {
    // Start PostgreSQL container
    this.container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('email_ops_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const connectionString = this.container.getConnectionUri();

    // Run Prisma migrations
    const schemaPath = path.resolve(__dirname, '../../../../packages/core/prisma/schema.prisma');
    execSync(`npx prisma db push --schema=${schemaPath} --url="${connectionString}"`, {
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      stdio: 'pipe',
    });

    // Create Prisma client with adapter
    process.env.DATABASE_URL = connectionString;
    const adapter = new PrismaPg({ connectionString });
    this.prisma = new PrismaClient({ adapter });

    await this.prisma.$connect();
  }

  /**
   * Get the Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not started. Call start() first.');
    }
    return this.prisma;
  }

  /**
   * Get the database connection URL
   */
  getConnectionUrl(): string {
    if (!this.container) {
      throw new Error('Database not started. Call start() first.');
    }
    return this.container.getConnectionUri();
  }

  /**
   * Clean all tables (useful between tests)
   */
  async clean(): Promise<void> {
    if (!this.prisma) return;

    // Delete in order respecting foreign keys
    const tablesToClean = [
      'Send',
      'SingleSendRecipient',
      'SingleSendRun',
      'SendLog',
      'SingleSend',
      'TemplateVersion',
      'Template',
      'Segment',
      'Component',
      'SenderProfile',
      'EmailProviderConnector',
      'DataConnector',
      'CampaignGroup',
      'Suppression',
      'Preference',
      'DailyStats',
      'DeadLetter',
      'Workspace',
    ];

    for (const table of tablesToClean) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch {
        // Table might not exist, ignore
      }
    }
  }

  /**
   * Stop the container and disconnect
   */
  async stop(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    if (this.container) {
      await this.container.stop();
      this.container = null;
    }
  }
}

// Singleton instance for sharing across tests
let testDb: TestDatabase | null = null;

export async function getTestDatabase(): Promise<TestDatabase> {
  if (!testDb) {
    testDb = new TestDatabase();
    await testDb.start();
  }
  return testDb;
}

export async function closeTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.stop();
    testDb = null;
  }
}
