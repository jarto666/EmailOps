# EmailOps

> SQL-first email orchestration platform for data-driven companies

Self-hosted email operations platform that connects directly to your existing database and email providers.

## Overview

EmailOps enables marketing and product teams to run sophisticated email campaigns using SQL-based segmentation directly against your data warehouse. No data sync required.

**Key Features:**
- **Zero-ETL**: Query Postgres/BigQuery directly for audience selection
- **SQL-First Segments**: Full SQL power for complex audience logic
- **Collision Engine**: Prevent email fatigue with campaign groups and priority-based deduplication
- **Template Versioning**: Immutable versions with HTML, MJML, and UI Builder support
- **Component Library**: Reusable email blocks (headers, footers, buttons)
- **Self-Hosted**: Your infrastructure, your data

## Project Structure

```
email-ops/
├── apps/
│   ├── api/          # NestJS REST API (Port 3300)
│   ├── worker/       # BullMQ job processors
│   └── web/          # Next.js frontend (Port 3030)
├── packages/
│   ├── core/         # Prisma schema, types, encryption
│   ├── connectors/   # Postgres & BigQuery adapters
│   ├── email/        # MJML compiler, Handlebars renderer
│   ├── ses/          # AWS SES v2 client
│   └── ui-kit/       # Shared React components
└── infra/
    └── docker/       # Docker Compose for local dev
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for local Postgres & Redis)

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure
docker-compose -f infra/docker/docker-compose.yml up -d postgres redis

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Run all apps (api, worker, web)
pnpm dev
```

### Access Points
- **Web UI**: http://localhost:3030
- **API**: http://localhost:3300
- **API Health**: http://localhost:3300/health

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript 5 |
| Database | PostgreSQL 15+, Prisma 7 |
| Queue | Redis, BullMQ 5 |
| Email | AWS SES v2, MJML 4, Handlebars |
| Monorepo | pnpm workspaces, Turborepo |

## API Endpoints

### Core Resources
- `GET /health` - Health check
- `/data-connectors` - Postgres/BigQuery connections
- `/email-connectors` - SES/Resend/SMTP providers
- `/sender-profiles` - From addresses
- `/templates` - Email templates with versions
- `/components` - Reusable email blocks
- `/segments` - SQL-based audiences
- `/campaign-groups` - Collision management
- `/single-sends` - Campaigns
- `/analytics` - Dashboard metrics

## Testing

```bash
# Run all tests
pnpm test

# Unit tests only (in apps/api)
pnpm test:unit

# Integration tests only (with testcontainers)
pnpm test:integration
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and component details
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Development roadmap and status
- [SPEC.md](./SPEC.md) - Product specification
- [BUSINESS.md](./BUSINESS.md) - Business overview and positioning

## Development Status

### Completed
- [x] Database schema (Prisma)
- [x] API endpoints (all CRUD operations)
- [x] Web UI (all pages)
- [x] Data connectors (Postgres, BigQuery)
- [x] Email connectors (SES)
- [x] Template system (HTML, MJML, versions)
- [x] Segment editor with SQL validation
- [x] Campaign groups with collision policies
- [x] Component library
- [x] Analytics dashboard
- [x] Integration test infrastructure

### In Progress
- [ ] Worker processors (single-send, segment, send)
- [ ] Email sending end-to-end flow
- [ ] Webhook event handling

### Planned
- [ ] Transactional email API
- [ ] Journey automation
- [ ] A/B testing
