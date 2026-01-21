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
│   ├── api/              # NestJS REST API (Port 3300)
│   │   ├── src/
│   │   │   ├── analytics/        # Dashboard metrics
│   │   │   ├── campaign-groups/  # Collision group management
│   │   │   ├── components/       # Reusable email blocks
│   │   │   ├── connectors/       # Postgres & BigQuery adapters
│   │   │   ├── data-connectors/  # Data source management
│   │   │   ├── email-connectors/ # Email provider management
│   │   │   ├── lib/              # Shared utilities (encryption, query governor)
│   │   │   ├── processors/       # BullMQ job processors
│   │   │   ├── segments/         # SQL-based audiences
│   │   │   ├── sender-profiles/  # From addresses
│   │   │   ├── single-sends/     # Campaign orchestration
│   │   │   ├── suppression/      # Bounce/complaint handling
│   │   │   ├── templates/        # Template management & rendering
│   │   │   └── webhooks/         # ESP webhook handlers
│   │   ├── prisma/               # Database schema
│   │   └── test/                 # Integration tests
│   │
│   └── web/              # Next.js 15 Frontend (Port 3030)
│       ├── app/          # App Router pages
│       ├── components/   # React components
│       └── lib/          # Utilities
│
└── infra/
    ├── docker/           # Docker Compose for local dev
    └── helm/             # Kubernetes Helm chart
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (for local Postgres & Redis)

### Setup

```bash
# Clone and install dependencies
pnpm install

# Copy environment file
cp env.example .env

# Start backing services (Postgres & Redis)
make up

# Generate Prisma client
make db-generate

# Push schema to database
make db-push

# Run development servers
make dev
```

### Access Points

- **Web UI**: http://localhost:3030
- **API**: http://localhost:3300
- **API Health**: http://localhost:3300/health

## Configuration

### Environment Variables

Create a `.env` file in the project root (see `env.example`):

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:3303/emailops"

# Redis (Job Queue)
REDIS_HOST="localhost"
REDIS_PORT=3302

# API Server
PORT=3300

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3300"

# Security - IMPORTANT: Change in production!
ENCRYPTION_SECRET="your-secure-secret-here"
```

### Docker Services

The `docker-compose.yml` in `infra/docker/` provides:
- **PostgreSQL 15** on port 3303 (system database)
- **Redis 7** on port 3302 (job queue)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript 5 |
| Database | PostgreSQL 15+, Prisma 7 |
| Queue | Redis 7, BullMQ 5 |
| Email | AWS SES v2, MJML 4, Handlebars |
| Monorepo | pnpm workspaces, Turborepo |

## Make Commands

```bash
# Development
make install          # Install dependencies
make dev              # Start development servers
make build            # Build the project

# Testing
make test             # Run all tests
make test-unit        # Unit tests only
make test-integration # Integration tests (with Testcontainers)

# Database
make db-generate      # Generate Prisma client
make db-push          # Push schema to database

# Infrastructure
make up               # Start Postgres & Redis
make down             # Stop all Docker services
make logs             # View Docker logs

# Maintenance
make clean            # Deep clean (node_modules, dist, .next)
make help             # Show all available commands
```

## Demo Mode

Demo mode provides a self-contained environment for testing and presentations. It includes:
- **Mailpit** - SMTP catcher with web UI to view sent emails
- **Demo Postgres** - Pre-seeded database with 500 test users
- **Event Simulation** - UI to trigger delivery/bounce/complaint events

### Demo Ports (separate from dev)

| Service | Port |
|---------|------|
| EmailOps Postgres | 3310 |
| Demo Postgres | 3311 |
| Redis | 3312 |
| Mailpit UI | 3313 |
| Mailpit SMTP | 3314 |

### Quick Start Demo

```bash
# Option 1: Full reset (recommended for first time)
make demo-up      # Start Docker services
make demo-seed    # Push schema + seed demo data
make demo-dev     # Start app in demo mode

# Option 2: One command to rule them all
make demo-reset   # Does everything: down -v, up, seed
make demo-dev     # Start app
```

### What Gets Seeded

The demo seed creates everything you need:
- **Email Connector**: SMTP to Mailpit (localhost:3314)
- **Data Connector**: Postgres to demo DB (localhost:3311)
- **Sender Profile**: hello@demo.emailops.com
- **Template**: Welcome email with MJML
- **Segment**: "Active Marketing Users" (10 users)
- **Campaign Group**: With collision detection
- **Campaign**: "Demo Welcome Campaign" (ready to trigger)

### Try It Out

1. Open http://localhost:3030/campaigns
2. Click "Demo Welcome Campaign"
3. Click **Trigger** to send emails
4. View emails at http://localhost:3313 (Mailpit)
5. Use **Demo Tools** (`/demo-tools`) to simulate bounces/complaints

### Demo Make Commands

```bash
make demo-up          # Start demo Docker services
make demo-seed        # Push schema + seed demo data
make demo-dev         # Start app with DEMO_MODE=true
make demo-reset       # Full reset (down -v, up, seed)
make demo-down        # Stop demo services
make demo-logs        # View Docker logs
make demo-open        # Open Mailpit in browser
```

## API Endpoints

### Core Resources

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /health` |
| Data Connectors | `/data-connectors` - Postgres/BigQuery connections |
| Email Connectors | `/email-connectors` - SES/Resend/SMTP providers |
| Sender Profiles | `/sender-profiles` - From addresses |
| Templates | `/templates` - Email templates with versions |
| Components | `/components` - Reusable email blocks |
| Segments | `/segments` - SQL-based audiences |
| Campaign Groups | `/campaign-groups` - Collision management |
| Single Sends | `/single-sends` - Campaigns |
| Analytics | `/analytics` - Dashboard metrics |
| Suppressions | `/suppressions` - Bounce/unsubscribe management |

## Testing

```bash
# Run all tests
pnpm test

# Unit tests only (in apps/api)
pnpm test:unit

# Integration tests (uses Testcontainers for real PostgreSQL)
pnpm test:integration
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and component details
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Development roadmap and status
- [SPEC.md](./SPEC.md) - Product specification

## Development Status

### Completed

- [x] Database schema (Prisma)
- [x] API endpoints (all CRUD operations)
- [x] Web UI (all pages)
- [x] Data connectors (Postgres, BigQuery)
- [x] Email connectors (SES, SMTP)
- [x] Template system (HTML, MJML, UI Builder)
- [x] Segment editor with SQL validation
- [x] Campaign groups with collision policies
- [x] Component library
- [x] Analytics dashboard
- [x] Integration test infrastructure
- [x] Job processors (single-send, segment, send, events)
- [x] Email sending end-to-end flow
- [x] Webhook event handling (SES)
- [x] Collision detection (audience build + send time)
- [x] Rate limiting (Redis-backed)
- [x] Suppression management
- [x] Demo mode with Mailpit & event simulation

### Planned

- [ ] Transactional email API
- [ ] Journey automation
- [ ] A/B testing
- [ ] Resend provider support

## License

Private - All rights reserved
