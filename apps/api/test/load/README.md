# Load Testing

Load tests for EmailOps API using k6.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed
- Docker and Docker Compose
- Node.js and pnpm

## Quick Start

```bash
# 1. Start load test infrastructure
docker-compose -f test/load/docker-compose.yml up -d

# 2. Wait for services to be healthy
docker-compose -f test/load/docker-compose.yml ps

# 3. Run database migrations
DATABASE_URL="postgresql://emailops:emailops@localhost:5477/emailops_load" pnpm db:push

# 4. Seed test data
DATABASE_URL="postgresql://emailops:emailops@localhost:5477/emailops_load" \
  npx ts-node test/load/scripts/seed-data.ts --recipients=10000 --campaigns=10

# 5. Start the API (in another terminal)
DATABASE_URL="postgresql://emailops:emailops@localhost:5477/emailops_load" \
  REDIS_HOST=localhost REDIS_PORT=6380 \
  pnpm start

# 6. Run smoke test
k6 run test/load/scenarios/smoke.js

# 7. Run load tests
k6 run test/load/scenarios/concurrent-triggers.js
```

## Test Scenarios

### Smoke Test (`smoke.js`)

Quick sanity check that the API is responding correctly.

```bash
k6 run test/load/scenarios/smoke.js
```

### Concurrent Triggers (`concurrent-triggers.js`)

Tests system stability when multiple campaigns are triggered simultaneously.

```bash
# Default: 10 concurrent triggers
k6 run test/load/scenarios/concurrent-triggers.js

# Custom concurrency
k6 run test/load/scenarios/concurrent-triggers.js --env CONCURRENT=50
```

**Metrics:**
- `trigger_success` - Successful campaign triggers
- `trigger_failed` - Failed triggers
- `trigger_duration` - Time to trigger a campaign
- `duplicate_sends` - Should always be 0

### Queue Throughput (`queue-throughput.js`)

Tests sustained API throughput and measures latency percentiles.

```bash
# Default: 100 requests/second
k6 run test/load/scenarios/queue-throughput.js

# Custom throughput
k6 run test/load/scenarios/queue-throughput.js --env TARGET_RPS=500
```

**Metrics:**
- `send_latency` - Request latency (p95 < 100ms, p99 < 200ms)
- `send_success` / `send_failed` - Success/failure counts

### Collision Accuracy (`collision-accuracy.js`)

Verifies collision detection works correctly under concurrent load.

```bash
k6 run test/load/scenarios/collision-accuracy.js

# With more campaigns per group
k6 run test/load/scenarios/collision-accuracy.js --env CAMPAIGNS_PER_GROUP=10
```

**Metrics:**
- `duplicates_found` - Must be 0 (zero tolerance)
- `collision_blocked` - Number of sends blocked by collision detection

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3300` | API base URL |
| `WORKSPACE_ID` | `load-test-workspace` | Workspace for tests |
| `CONCURRENT` | `10` | Concurrent VUs for trigger tests |
| `TARGET_RPS` | `100` | Target requests per second |
| `CAMPAIGNS_PER_GROUP` | `5` | Campaigns to test per group |

## Infrastructure

The `docker-compose.yml` provides:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5477 | Test database |
| Redis | 6380 | Queue backend |
| Mailpit | 8026 (UI), 1026 (SMTP) | Mock email server |

### Mailpit UI

View captured emails at http://localhost:8026

### Optional Monitoring

Enable Grafana and InfluxDB for metrics visualization:

```bash
docker-compose -f test/load/docker-compose.yml --profile monitoring up -d

# Run k6 with InfluxDB output
k6 run --out influxdb=http://localhost:8087/k6 test/load/scenarios/queue-throughput.js
```

Access Grafana at http://localhost:3001

## Seeding Test Data

```bash
# Default: 1000 recipients, 10 campaigns, 3 groups
npx ts-node test/load/scripts/seed-data.ts

# Custom amounts
npx ts-node test/load/scripts/seed-data.ts \
  --recipients=100000 \
  --campaigns=50 \
  --groups=5
```

## Success Criteria

| Test | Pass | Fail |
|------|------|------|
| Concurrent 10 | 100% success | < 95% success |
| Concurrent 50 | 100% success | < 90% success |
| Throughput 100/s | p95 < 100ms | p95 > 200ms |
| Throughput 500/s | p95 < 100ms | p95 > 500ms |
| Collision accuracy | 0 duplicates | Any duplicates |

## Cleanup

```bash
# Stop infrastructure
docker-compose -f test/load/docker-compose.yml down

# Remove volumes (deletes all data)
docker-compose -f test/load/docker-compose.yml down -v
```
