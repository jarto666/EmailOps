.PHONY: install dev build lint format test test-unit test-integration db-generate db-push up down logs clean help demo-up demo-down demo-logs demo-dev demo-open demo-seed demo-reset

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
	@echo "  Maintenance:"
	@echo "    make clean            - Deep clean (remove node_modules, dist, .next)"
