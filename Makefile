.PHONY: install dev build lint format test test-unit test-integration db-generate db-push up down logs clean help

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
	@echo "  Maintenance:"
	@echo "    make clean            - Deep clean (remove node_modules, dist, .next)"
