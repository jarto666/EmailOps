.PHONY: install dev build lint format db-generate db-push up down logs clean help

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

# -- Database --
db-generate:
	pnpm db:generate

db-push:
	pnpm db:push

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
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Start development server (API + Web + Worker)"
	@echo "  make build         - Build the project"
	@echo "  make lint          - Lint the code"
	@echo "  make format        - Format the code"
	@echo "  make db-generate   - Generate Prisma client"
	@echo "  make db-push       - Push Prisma schema to DB"
	@echo "  make up            - Start backing services (Postgres + Redis)"
	@echo "  make down          - Stop all Docker services"
	@echo "  make logs          - View Docker logs"
	@echo "  make clean         - Deep clean (remove node_modules, dist, .next)"
