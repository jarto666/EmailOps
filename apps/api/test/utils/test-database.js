"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDatabase = void 0;
exports.getTestDatabase = getTestDatabase;
exports.closeTestDatabase = closeTestDatabase;
const postgresql_1 = require("@testcontainers/postgresql");
const core_1 = require("@email-ops/core");
const adapter_pg_1 = require("@prisma/adapter-pg");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
/**
 * Test database manager using testcontainers
 * Spins up a real PostgreSQL instance for integration tests
 */
class TestDatabase {
    constructor() {
        this.container = null;
        this.prisma = null;
    }
    /**
     * Start the PostgreSQL container and run migrations
     */
    async start() {
        // Start PostgreSQL container
        this.container = await new postgresql_1.PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('email_ops_test')
            .withUsername('test')
            .withPassword('test')
            .start();
        const connectionString = this.container.getConnectionUri();
        // Run Prisma migrations
        const schemaPath = path.resolve(__dirname, '../../../../packages/core/prisma/schema.prisma');
        (0, child_process_1.execSync)(`npx prisma db push --schema=${schemaPath} --url="${connectionString}"`, {
            env: {
                ...process.env,
                DATABASE_URL: connectionString,
            },
            stdio: 'pipe',
        });
        // Create Prisma client with adapter
        process.env.DATABASE_URL = connectionString;
        const adapter = new adapter_pg_1.PrismaPg({ connectionString });
        this.prisma = new core_1.PrismaClient({ adapter });
        await this.prisma.$connect();
    }
    /**
     * Get the Prisma client instance
     */
    getClient() {
        if (!this.prisma) {
            throw new Error('Database not started. Call start() first.');
        }
        return this.prisma;
    }
    /**
     * Get the database connection URL
     */
    getConnectionUrl() {
        if (!this.container) {
            throw new Error('Database not started. Call start() first.');
        }
        return this.container.getConnectionUri();
    }
    /**
     * Clean all tables (useful between tests)
     */
    async clean() {
        if (!this.prisma)
            return;
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
            }
            catch {
                // Table might not exist, ignore
            }
        }
    }
    /**
     * Stop the container and disconnect
     */
    async stop() {
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
exports.TestDatabase = TestDatabase;
// Singleton instance for sharing across tests
let testDb = null;
async function getTestDatabase() {
    if (!testDb) {
        testDb = new TestDatabase();
        await testDb.start();
    }
    return testDb;
}
async function closeTestDatabase() {
    if (testDb) {
        await testDb.stop();
        testDb = null;
    }
}
