/**
 * Test setup using testcontainers
 * Spins up Postgres, Redis, and the API for integration tests
 *
 * Uses a singleton pattern - containers are started once and reused across all test files.
 */
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { EmailOps } from '../src';

let postgresContainer: StartedPostgreSqlContainer | null = null;
let redisContainer: StartedTestContainer | null = null;
let apiProcess: ChildProcess | null = null;
let client: EmailOps | null = null;
let setupPromise: Promise<EmailOps> | null = null;
let setupCount = 0;

const API_PORT = 3350;
const ROOT_DIR = join(__dirname, '..', '..', '..');
const API_DIR = join(ROOT_DIR, 'apps', 'api');

/**
 * Initialize test environment (idempotent - only runs once)
 */
export async function initTestEnvironment(): Promise<EmailOps> {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    console.log('Starting test containers...');

    // Start Postgres
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('emailops_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    console.log(`Postgres started on port ${postgresContainer.getPort()}`);

    // Start Redis
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    console.log(`Redis started on port ${redisContainer.getMappedPort(6379)}`);

    const databaseUrl = postgresContainer.getConnectionUri();
    const redisHost = redisContainer.getHost();
    const redisPort = redisContainer.getMappedPort(6379);

    // Run Prisma migrations
    console.log('Running Prisma migrations...');
    await runCommand('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
      cwd: API_DIR,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    // Start the API
    console.log('Starting API server...');
    const apiUrl = `http://localhost:${API_PORT}`;

    apiProcess = spawn('pnpm', ['run', 'start'], {
      cwd: API_DIR,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        REDIS_HOST: redisHost,
        REDIS_PORT: String(redisPort),
        PORT: String(API_PORT),
        ENCRYPTION_SECRET: 'test-secret-for-testing-only',
        NODE_ENV: 'test',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    // Log API output for debugging
    apiProcess.stdout?.on('data', (data) => {
      console.log(`[API] ${data.toString().trim()}`);
    });
    apiProcess.stderr?.on('data', (data) => {
      console.error(`[API ERROR] ${data.toString().trim()}`);
    });
    apiProcess.on('error', (err) => {
      console.error(`[API SPAWN ERROR] ${err.message}`);
    });

    // Wait for API to be ready
    await waitForApi(apiUrl, 60000);
    console.log(`API started at ${apiUrl}`);

    // Create the SDK client
    client = new EmailOps({
      baseUrl: apiUrl,
      workspaceId: 'ws_test',
    });

    // Bootstrap workspace by creating a template (triggers workspace upsert)
    // This is needed because some API endpoints require the workspace to exist
    try {
      await client.templates.create({
        key: '_bootstrap_',
        name: 'Bootstrap Template',
      });
    } catch {
      // Ignore errors - workspace creation is the goal
    }

    return client;
  })();

  return setupPromise;
}

/**
 * Clean up test environment
 */
export async function cleanupTestEnvironment(): Promise<void> {
  setupCount--;

  // Only cleanup when no more test files need the environment
  if (setupCount > 0) {
    return;
  }

  console.log('Tearing down test environment...');

  // Stop API
  if (apiProcess) {
    apiProcess.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      apiProcess!.on('exit', () => resolve());
      setTimeout(resolve, 5000);
    });
    apiProcess = null;
  }

  // Stop containers
  if (redisContainer) {
    await redisContainer.stop();
    redisContainer = null;
  }
  if (postgresContainer) {
    await postgresContainer.stop();
    postgresContainer = null;
  }

  client = null;
  setupPromise = null;

  console.log('Test environment torn down');
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      ...options,
      stdio: 'inherit',
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function waitForApi(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  const healthUrl = `${url}/health`;

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // API not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`API failed to start within ${timeout}ms`);
}

/**
 * Get the test client (must call initTestEnvironment first)
 */
export function getClient(): EmailOps {
  if (!client) {
    throw new Error('Test client not initialized. Call initTestEnvironment() first.');
  }
  return client;
}

/**
 * Setup hook for test files
 * Call this with vitest hooks in each test file's describe block
 */
export function useTestClient(
  beforeAllFn: (fn: () => Promise<void>, timeout?: number) => void,
  afterAllFn: (fn: () => Promise<void>, timeout?: number) => void
) {
  setupCount++;

  beforeAllFn(async () => {
    await initTestEnvironment();
  }, 120000);

  afterAllFn(async () => {
    await cleanupTestEnvironment();
  }, 30000);
}
