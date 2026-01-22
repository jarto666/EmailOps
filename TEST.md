# Testing

This document describes the testing strategy and how to run tests.

## Test Categories

### API Unit Tests

Location: `apps/api/src/**/*.spec.ts`

Fast, isolated tests for individual services and utilities. No database or external services required.

**What's covered:**
- Template rendering (MJML compilation, Handlebars processing)
- Input validation
- Business logic helpers

### API Integration Tests

Location: `apps/api/test/integration/*.spec.ts`

Tests API endpoints with a real PostgreSQL database using testcontainers. Each test suite spins up an isolated database instance.

**What's covered:**
- **Collision handling** - Campaign groups, collision policies (HIGHEST_PRIORITY_WINS, FIRST_QUEUED_WINS, SEND_ALL), send log tracking
- **Deduplication** - Suppression lists, recipient uniqueness constraints, cross-campaign collision detection
- **Campaign operations** - Single send CRUD, triggering, scheduling
- **Template operations** - CRUD, versioning

### SDK Tests

Location: `packages/sdk/tests/*.test.ts`

End-to-end tests that exercise the SDK client against a real API instance. Uses testcontainers to spin up PostgreSQL + the API server.

**What's covered:**
- All SDK resource operations (campaigns, templates, segments, connectors, etc.)
- Analytics sync
- Error handling

### Load Tests

Location: `apps/api/test/load/`

Performance and stress tests using k6. Requires separate infrastructure (Docker Compose).

**Scenarios:**
- **Smoke test** - Quick API health check before load testing
- **Concurrent triggers** - Multiple campaigns triggered simultaneously (deadlock detection)
- **Queue throughput** - Sustained request rate with latency percentiles
- **Collision accuracy** - Verify zero duplicate sends under concurrent load

See `apps/api/test/load/README.md` for detailed setup and usage.

## Running Tests

### All Tests

```bash
# Run all tests across the monorepo
pnpm test
```

### API Tests

```bash
cd apps/api

# All API tests (unit + integration)
pnpm test

# Unit tests only (fast, no containers)
pnpm test:unit

# Integration tests only (requires Docker)
pnpm test:integration

# Watch mode
pnpm test:watch

# With coverage
pnpm test:cov
```

### SDK Tests

```bash
cd packages/sdk

# Run SDK tests (requires Docker for testcontainers)
pnpm test

# Watch mode
pnpm test:watch
```

### Running Specific Tests

```bash
# API: Run tests matching a pattern
cd apps/api
pnpm test -- --testPathPatterns="collision"

# SDK: Run specific test file
cd packages/sdk
pnpm test analytics
```

### Load Tests

```bash
cd apps/api

# 1. Start infrastructure (Postgres, Redis, Mailpit)
pnpm test:load:infra

# 2. Seed test data
DATABASE_URL="postgresql://emailops:emailops@localhost:5433/emailops_load" \
  pnpm test:load:seed --recipients=10000

# 3. Start API server (separate terminal)
DATABASE_URL="postgresql://emailops:emailops@localhost:5433/emailops_load" \
  REDIS_HOST=localhost REDIS_PORT=6380 pnpm start

# 4. Run tests
pnpm test:load:smoke              # Quick health check
pnpm test:load:concurrent         # Concurrent triggers
pnpm test:load:throughput         # Throughput test
pnpm test:load:collision          # Collision accuracy

# 5. Cleanup
pnpm test:load:infra:down
```

## Prerequisites

- **Docker** - Required for integration tests (testcontainers spins up PostgreSQL)
- **Node.js 20+**
- **pnpm**

## Writing Tests

### API Unit Tests

Place in `apps/api/src/<module>/<name>.spec.ts` alongside the source file.

```typescript
describe('MyService', () => {
  it('should do something', () => {
    // ...
  });
});
```

### API Integration Tests

Place in `apps/api/test/integration/<name>.spec.ts`.

```typescript
import { getTestDatabase, closeTestDatabase } from '../utils/test-database';
import { TestFixtures } from '../utils/test-fixtures';

describe('Feature (Integration)', () => {
  let testDb, prisma, fixtures;

  beforeAll(async () => {
    testDb = await getTestDatabase();
    prisma = testDb.getClient();
    fixtures = new TestFixtures(prisma);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it('should work', async () => {
    const setup = await fixtures.createCompleteSetup();
    // ...
  });
});
```

### SDK Tests

Place in `packages/sdk/tests/<resource>.test.ts`.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { useTestClient, getClient } from './setup';

describe('Resource', () => {
  useTestClient(beforeAll, afterAll);

  it('should work', async () => {
    const client = getClient();
    // ...
  });
});
```
