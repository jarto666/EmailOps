# EmailOps Starter Kit

Self-hosted email operations platform.

## Structure

- `apps/api`: NestJS Backend
- `apps/worker`: BullMQ Worker
- `apps/web`: Next.js UI
- `packages/core`: Prisma schema, types

## Quick Start

1. `pnpm install`
2. `docker-compose -f infra/docker/docker-compose.yml up -d postgres redis`
3. `pnpm db:generate`
4. `pnpm db:push`
5. `pnpm dev` (Runs api, worker, and web concurrently via turbo)

## First Milestones

- [ ] Connect Postgres System DB & Run Migrations
- [ ] API Health Check `GET /health`
- [ ] Create Workspace & Connector via API/UI
- [ ] Create Template (Raw HTML)
- [ ] Create Segment (SQL) & Run Dry Run
- [ ] Run Campaign (Snapshot -> Send)
