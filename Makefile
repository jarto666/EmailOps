.PHONY: install dev build lint format test test-unit test-integration db-generate db-push up down logs clean help demo-up demo-down demo-logs demo-dev demo-open demo-seed demo-reset load-up load-down load-seed load-api load-smoke load-concurrent load-throughput load-collision load-batch load-all

# -- Dependency Management --
install:
	pnpm install

# -- Development --
dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

format:
	pnpm format

# -- Testing --
test:
	pnpm test

test-unit:
	pnpm test:unit

test-integration:
	pnpm test:integration

# -- Database --
db-generate:
	pnpm --filter=api run db:generate

db-push:
	pnpm --filter=api run db:push

# -- Infrastructure (Docker) --
up:
	docker-compose -f infra/docker/docker-compose.yml up -d postgres redis

down:
	docker-compose -f infra/docker/docker-compose.yml down

logs:
	docker-compose -f infra/docker/docker-compose.yml logs -f

# -- Demo Environment --
# Uses different ports (3310-3314) to avoid conflicts with dev environment
demo-up:
	docker-compose -f infra/docker/docker-compose.demo.yml up -d
	@echo ""
	@echo "Demo environment started!"
	@echo "  - EmailOps DB:    localhost:3310"
	@echo "  - Demo DB:        localhost:3311"
	@echo "  - Redis:          localhost:3312"
	@echo "  - Mailpit UI:     http://localhost:3313"
	@echo "  - Mailpit SMTP:   localhost:3314"
	@echo ""
	@echo "Next steps:"
	@echo "  1. make demo-seed   # Push schema and seed demo data"
	@echo "  2. make demo-dev    # Start the app"
	@echo ""
	@echo "Or run 'make demo-reset' to do everything at once"

demo-down:
	docker-compose -f infra/docker/docker-compose.demo.yml down

demo-logs:
	docker-compose -f infra/docker/docker-compose.demo.yml logs -f

demo-dev:
	@echo "Starting in demo mode..."
	@echo "  API: http://localhost:3300"
	@echo "  Web: http://localhost:3030"
	@echo "  Mailpit: http://localhost:3313"
	@echo ""
	npx dotenv-cli -e .env.demo -- pnpm dev

demo-open:
	@echo "Opening Mailpit..."
	open http://localhost:3313 || xdg-open http://localhost:3313 || echo "Open http://localhost:3313 in your browser"

demo-seed:
	@echo "Seeding demo database..."
	npx dotenv-cli -e .env.demo -- pnpm --filter api db:push
	npx dotenv-cli -e .env.demo -- pnpm --filter api db:seed

demo-reset:
	@echo "Resetting demo environment..."
	docker-compose -f infra/docker/docker-compose.demo.yml down -v
	docker-compose -f infra/docker/docker-compose.demo.yml up -d
	@echo "Waiting for databases to be ready..."
	sleep 3
	$(MAKE) demo-seed

# -- Load Testing --
# Uses separate infrastructure (ports 5477, 6380, 8026)
# Requires k6: https://k6.io/docs/get-started/installation/
#
# Quick start:
#   Terminal 1: make load-up && make load-seed
#   Terminal 2: make load-api
#   Terminal 1: make load-smoke && make load-all
#
# Custom seed example:
#   cd apps/api && npx ts-node test/load/scripts/seed-data.ts \
#     --recipients=50000 --campaigns=20 --batchSize=200 --rateLimit=100

load-up:
	cd apps/api && pnpm test:load:infra
	@echo ""
	@echo "Load test infrastructure started!"
	@echo "  - PostgreSQL:  localhost:5477"
	@echo "  - Redis:       localhost:6380"
	@echo "  - Mailpit UI:  http://localhost:8026"
	@echo ""
	@echo "Next steps:"
	@echo "  1. make load-seed       # Push schema and seed test data"
	@echo "  2. make load-api        # Start API server (in another terminal)"
	@echo "  3. make load-smoke      # Run smoke test"

load-down:
	cd apps/api && pnpm test:load:infra:down

# Seed with default settings (1000 recipients, batchSize=100, rateLimit=50)
# Custom: cd apps/api && npx ts-node test/load/scripts/seed-data.ts \
#           --recipients=10000 --campaigns=20 --groups=5 --batchSize=200 --rateLimit=100
load-seed:
	@echo "Pushing schema and seeding load test data..."
	cd apps/api && pnpm test:load:db:push
	cd apps/api && pnpm test:load:seed

load-api:
	@echo "Starting API for load testing..."
	@echo "  API: http://localhost:3301"
	@echo ""
	cd apps/api && pnpm test:load:api

# Quick health check - verifies API is responding
# No parameters
load-smoke:
	cd apps/api && pnpm test:load:smoke

# Test concurrent campaign triggers (deadlock detection)
# Params: CONCURRENT (default: 10) - number of simultaneous triggers
# Example: k6 run test/load/scenarios/concurrent-triggers.js --env CONCURRENT=50
load-concurrent:
	cd apps/api && pnpm test:load:concurrent

# Test sustained API throughput with latency percentiles
# Params: TARGET_RPS (default: 100) - target requests per second
# Example: k6 run test/load/scenarios/queue-throughput.js --env TARGET_RPS=500
load-throughput:
	cd apps/api && pnpm test:load:throughput

# Verify collision detection accuracy under load (zero duplicates allowed)
# Params: CAMPAIGNS_PER_GROUP (default: 5) - campaigns to test per group
# Example: k6 run test/load/scenarios/collision-accuracy.js --env CAMPAIGNS_PER_GROUP=10
load-collision:
	cd apps/api && pnpm test:load:collision

# Test batch processing with workspace settings
# Params: MAX_WAIT (default: 300) - max seconds to wait for completion
# Example: k6 run test/load/scenarios/batch-processing.js --env MAX_WAIT=600
load-batch:
	cd apps/api && pnpm test:load:batch

load-all:
	@echo "Running all load tests..."
	cd apps/api && pnpm test:load:smoke
	cd apps/api && pnpm test:load:concurrent
	cd apps/api && pnpm test:load:throughput
	cd apps/api && pnpm test:load:collision
	cd apps/api && pnpm test:load:batch
	@echo ""
	@echo "All load tests completed!"

# -- Maintenance --
clean:
	rm -rf dist
	rm -rf .turbo
	rm -rf node_modules
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find . -name ".next" -type d -prune -exec rm -rf '{}' +
	find . -name "dist" -type d -prune -exec rm -rf '{}' +

help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make install          - Install dependencies"
	@echo "    make dev              - Start development servers (API + Web)"
	@echo "    make build            - Build the project"
	@echo "    make lint             - Lint the code"
	@echo "    make format           - Format the code"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             - Run all tests"
	@echo "    make test-unit        - Run unit tests"
	@echo "    make test-integration - Run integration tests"
	@echo ""
	@echo "  Database:"
	@echo "    make db-generate      - Generate Prisma client"
	@echo "    make db-push          - Push Prisma schema to DB"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    make up               - Start backing services (Postgres + Redis)"
	@echo "    make down             - Stop all Docker services"
	@echo "    make logs             - View Docker logs"
	@echo ""
	@echo "  Demo Environment (ports 3310-3314):"
	@echo "    make demo-up          - Start demo services (DB, Redis, Mailpit)"
	@echo "    make demo-down        - Stop demo services"
	@echo "    make demo-logs        - View demo Docker logs"
	@echo "    make demo-seed        - Push schema and seed demo data"
	@echo "    make demo-dev         - Start app in demo mode"
	@echo "    make demo-open        - Open Mailpit UI in browser"
	@echo "    make demo-reset       - Reset demo (destroy + recreate + seed)"
	@echo ""
	@echo "  Load Testing (requires k6):"
	@echo "    make load-up          - Start load test infra (Postgres, Redis, Mailpit)"
	@echo "    make load-down        - Stop load test infrastructure"
	@echo "    make load-seed        - Push schema and seed test data"
	@echo "    make load-api         - Start API server for load tests (port 3301)"
	@echo "    make load-smoke       - Quick API health check"
	@echo "    make load-concurrent  - Concurrent triggers (--env CONCURRENT=50)"
	@echo "    make load-throughput  - Throughput test (--env TARGET_RPS=500)"
	@echo "    make load-collision   - Collision accuracy (--env CAMPAIGNS_PER_GROUP=10)"
	@echo "    make load-batch       - Batch processing (--env MAX_WAIT=600)"
	@echo "    make load-all         - Run all load tests sequentially"
	@echo ""
	@echo "    Custom seed: cd apps/api && npx ts-node test/load/scripts/seed-data.ts \\"
	@echo "                   --recipients=50000 --batchSize=200 --rateLimit=100"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make clean            - Deep clean (remove node_modules, dist, .next)"
