# Implementation Plan: EmailOps

> Version 3.1 — Updated January 2026
> See also: [ARCHITECTURE.md](./ARCHITECTURE.md) | [SPEC.md](./SPEC.md)

---

## Overview

EmailOps is a **SQL-first email orchestration platform** with these key differentiators:

1. **Zero-ETL**: Direct database queries, no sync required
2. **Collision Engine**: Priority-based deduplication across campaign groups
3. **Component Library**: Reusable email building blocks
4. **Modern UI**: Dark theme with Tailwind CSS

---

## Current Status Summary

| Phase                        | Status         | Completion |
| ---------------------------- | -------------- | ---------- |
| Phase 1: Database Schema     | ✅ Complete    | 100%       |
| Phase 2: API Layer           | ✅ Complete    | 100%       |
| Phase 3: Web UI              | ✅ Complete    | 100%       |
| Phase 4: Job Processors      | ✅ Complete    | 100%       |
| Phase 5: End-to-End Flow     | ✅ Complete    | 100%       |
| Phase 6: Testing & Polish    | 🟡 In Progress | 60%        |
| Phase 7: Polish & Enhance    | 🔴 Planned     | 0%         |

---

## Phase 1: Database Schema ✅ COMPLETE

### 1.1 Core Models

**File**: `apps/api/prisma/schema.prisma`

- [x] `Workspace` — Tenant container
- [x] `DataConnector` — Postgres/BigQuery connections
- [x] `EmailProviderConnector` — SES/Resend/SMTP providers
- [x] `SenderProfile` — From addresses
- [x] `Template` — Email template master
- [x] `TemplateVersion` — Immutable versions (HTML, MJML, UI Builder)
- [x] `Component` — Reusable email blocks (HEADER, FOOTER, BUTTON, etc.)
- [x] `Segment` — SQL-based audience definitions
- [x] `CampaignGroup` — Collision management groups
- [x] `SingleSend` — Campaign/broadcast entity
- [x] `SingleSendRun` — Campaign execution instance
- [x] `SingleSendRecipient` — Recipients per run
- [x] `Send` — Individual email delivery record
- [x] `SendLog` — Collision detection log
- [x] `Suppression` — Bounces/complaints/unsubscribes
- [x] `Preference` — Category-level opt-in
- [x] `DailyStats` — Analytics aggregates
- [x] `DeadLetter` — Failed job records

### 1.2 Enums

- [x] `SingleSendStatus` — DRAFT, ACTIVE, PAUSED, ARCHIVED, COMPLETED
- [x] `ScheduleType` — MANUAL, CRON
- [x] `SingleSendRunStatus` — CREATED, AUDIENCE_BUILDING, AUDIENCE_READY, SENDING, COMPLETED, FAILED
- [x] `CollisionPolicy` — HIGHEST_PRIORITY_WINS, FIRST_QUEUED_WINS, SEND_ALL
- [x] `AuthoringMode` — RAW_HTML, RAW_MJML, UI_BUILDER
- [x] `ComponentType` — HEADER, FOOTER, BUTTON, CARD, DIVIDER, SNIPPET
- [x] `SuppressionReason` — BOUNCE, COMPLAINT, UNSUBSCRIBE, MANUAL

---

## Phase 2: API Layer ✅ COMPLETE

### 2.1 Health & Infrastructure

**File**: `apps/api/src/health/`

- [x] `GET /health` — Health check endpoint

**File**: `apps/api/src/prisma/`

- [x] `PrismaService` — Database client with Prisma adapter

### 2.2 Data Connectors

**File**: `apps/api/src/data-connectors/`

- [x] `POST /data-connectors` — Create connector
- [x] `GET /data-connectors` — List connectors
- [x] `GET /data-connectors/:id` — Get connector
- [x] `PATCH /data-connectors/:id` — Update connector
- [x] `DELETE /data-connectors/:id` — Delete connector
- [x] `POST /data-connectors/test-connection` — Test connection

### 2.3 Email Connectors

**File**: `apps/api/src/email-connectors/`

- [x] `POST /email-connectors` — Create connector
- [x] `GET /email-connectors` — List connectors
- [x] `GET /email-connectors/:id` — Get connector
- [x] `PATCH /email-connectors/:id` — Update connector
- [x] `DELETE /email-connectors/:id` — Delete connector
- [x] `POST /email-connectors/test-connection` — Test connection

### 2.4 Sender Profiles

**File**: `apps/api/src/sender-profiles/`

- [x] `POST /sender-profiles` — Create profile
- [x] `GET /sender-profiles` — List profiles
- [x] `GET /sender-profiles/:id` — Get profile
- [x] `PATCH /sender-profiles/:id` — Update profile
- [x] `DELETE /sender-profiles/:id` — Delete profile

### 2.5 Templates

**File**: `apps/api/src/templates/`

- [x] `POST /templates` — Create template
- [x] `GET /templates` — List templates
- [x] `GET /templates/:id` — Get template with versions
- [x] `PATCH /templates/:id` — Update template
- [x] `DELETE /templates/:id` — Delete template

**File**: `apps/api/src/templates/template-versions.service.ts`

- [x] `POST /templates/:id/versions` — Create version
- [x] `GET /templates/:id/versions` — List versions
- [x] `GET /templates/:id/versions/:versionId` — Get version
- [x] `PATCH /templates/:id/versions/:versionId` — Update version
- [x] `POST /templates/:id/versions/:versionId/publish` — Publish version
- [x] `POST /templates/:id/versions/:versionId/render` — Render with variables

### 2.6 Components

**File**: `apps/api/src/components/`

- [x] `POST /components` — Create component
- [x] `GET /components` — List components (with type filter)
- [x] `GET /components/:id` — Get component
- [x] `PATCH /components/:id` — Update component
- [x] `DELETE /components/:id` — Delete component
- [x] `POST /components/:id/preview` — Preview with variables

### 2.7 Segments

**File**: `apps/api/src/segments/`

- [x] `POST /segments` — Create segment
- [x] `GET /segments` — List segments
- [x] `GET /segments/:id` — Get segment
- [x] `PATCH /segments/:id` — Update segment
- [x] `DELETE /segments/:id` — Delete segment
- [x] `POST /segments/:id/dry-run` — Test query with sample

### 2.8 Campaign Groups

**File**: `apps/api/src/campaign-groups/`

- [x] `POST /campaign-groups` — Create group
- [x] `GET /campaign-groups` — List groups
- [x] `GET /campaign-groups/:id` — Get group
- [x] `PATCH /campaign-groups/:id` — Update group
- [x] `DELETE /campaign-groups/:id` — Delete group
- [x] `GET /campaign-groups/:id/stats` — Get collision stats

### 2.9 Single Sends (Campaigns)

**File**: `apps/api/src/single-sends/`

- [x] `POST /single-sends` — Create campaign
- [x] `GET /single-sends` — List campaigns
- [x] `GET /single-sends/:id` — Get campaign with runs
- [x] `PATCH /single-sends/:id` — Update campaign
- [x] `DELETE /single-sends/:id` — Delete campaign
- [x] `POST /single-sends/:id/trigger` — Trigger campaign

**File**: `apps/api/src/single-sends/collision.service.ts`

- [x] `checkCollision()` — Check if user was recently sent
- [x] `checkPriorityCollision()` — Check for higher priority campaigns
- [x] `batchCheckCollisions()` — Batch collision detection
- [x] `recordSend()` — Log successful send for collision tracking

### 2.10 Suppressions

**File**: `apps/api/src/suppression/`

- [x] `GET /suppressions` — List suppressions
- [x] `POST /suppressions` — Add suppression
- [x] `DELETE /suppressions/:id` — Remove suppression

### 2.11 Analytics

**File**: `apps/api/src/analytics/`

- [x] `GET /analytics/overview` — Dashboard stats
- [x] `GET /analytics/daily` — Daily metrics over time
- [x] `GET /analytics/recent-campaigns` — Recent campaign list
- [x] `GET /analytics/campaigns/:id` — Campaign-specific stats
- [x] `GET /analytics/skip-reasons` — Skip reason breakdown

---

## Phase 3: Web UI ✅ COMPLETE

### 3.1 Layout & Navigation

**File**: `apps/web/app/layout.tsx`

- [x] Sidebar navigation with icons
- [x] Dark theme styling
- [x] Responsive layout

### 3.2 Dashboard

**File**: `apps/web/app/page.tsx`

- [x] Stats cards (total sends, delivery rate, bounces, active campaigns)
- [x] Send volume chart (30 days)
- [x] Recent campaigns table
- [x] Quick action buttons

### 3.3 Campaign Groups

**Files**: `apps/web/app/campaign-groups/`

- [x] List view with collision policies
- [x] Create/edit forms
- [x] Collision stats display

### 3.4 Campaigns (Single Sends)

**Files**: `apps/web/app/campaigns/` and `apps/web/app/single-sends/`

- [x] List view with status badges
- [x] Create/edit forms
- [x] Campaign detail with run history
- [x] Trigger action

### 3.5 Segments

**Files**: `apps/web/app/segments/`

- [x] List view
- [x] SQL editor
- [x] Dry-run with sample results

### 3.6 Templates

**Files**: `apps/web/app/templates/`

- [x] List view
- [x] Create/edit with mode selection
- [x] Version history
- [x] Preview rendering

### 3.7 Components

**Files**: `apps/web/app/email-components/`

- [x] Component gallery
- [x] Create/edit component
- [x] Variable configuration
- [x] Preview rendering

### 3.8 Connectors

**Files**: `apps/web/app/data-connectors/` and `apps/web/app/email-connectors/`

- [x] Data connector list and detail
- [x] Email connector list and detail
- [x] Test connection UI

### 3.9 Sender Profiles

**Files**: `apps/web/app/sender-profiles/`

- [x] List view
- [x] Create/edit forms

### 3.10 Suppressions

**Files**: `apps/web/app/suppressions/`

- [x] Suppression list view
- [x] Add/remove suppressions

### 3.11 Settings & Guide

**Files**: `apps/web/app/settings/` and `apps/web/app/guide/`

- [x] Settings page structure
- [x] User guide/onboarding

---

## Phase 4: Job Processors ✅ COMPLETE

### 4.1 Single Send Processor

**File**: `apps/api/src/processors/single-send.processor.ts`

- [x] Queue setup with BullMQ
- [x] Job handler for triggerSingleSend
- [x] Create SingleSendRun record
- [x] Check for overlapping runs
- [x] Enqueue segment job
- [x] Handle run status transitions

### 4.2 Segment Processor

**File**: `apps/api/src/processors/segment.processor.ts`

- [x] Execute SQL query via data connector
- [x] Apply collision filters (batch check)
- [x] Check suppressions
- [x] Create SingleSendRecipient records
- [x] Enqueue send jobs (paged)
- [x] Handle deduplication against previous runs

### 4.3 Send Processor

**File**: `apps/api/src/processors/send.processor.ts`

- [x] Render template with variables (HTML, MJML, UI Builder)
- [x] Send via email connector (SES)
- [x] Send-time collision check (belt-and-suspenders)
- [x] Update Send record status
- [x] Record in SendLog for collision tracking
- [x] Rate limiting (Redis-backed leaky bucket)
- [x] Handle retries with exponential backoff
- [x] Idempotency via Send record
- [x] Auto-complete run when all recipients processed

### 4.4 Events Processor

**File**: `apps/api/src/processors/events.processor.ts`

- [x] Handle delivery events → mark Send as DELIVERED
- [x] Handle bounce events → mark Send as BOUNCED
- [x] Handle complaint events → mark Send as COMPLAINT
- [x] Add hard bounces to suppression list
- [x] Add complaints to suppression list

---

## Phase 5: End-to-End Flow ✅ COMPLETE

### 5.1 Campaign Execution Flow

- [x] Trigger campaign → create run → build audience → send emails
- [x] Collision detection at audience build time
- [x] Collision detection at send time (belt-and-suspenders)
- [x] Rate limiting per sender profile (Redis-backed)
- [x] Retry logic with exponential backoff
- [x] Idempotency guarantees
- [x] Auto-complete runs when all recipients processed

### 5.2 Template Rendering

- [x] MJML → HTML compilation
- [x] Handlebars variable substitution
- [x] UI Builder schema → MJML → HTML compilation
- [ ] Component resolution from library (partial)

### 5.3 Email Delivery

- [x] SES integration end-to-end
- [ ] Resend integration (planned)
- [ ] SMTP integration (planned)

### 5.4 Webhook Handling

- [x] SES SNS webhook endpoint
- [x] Auto-confirm SNS subscriptions
- [x] Event processing via queue
- [x] Delivery/Bounce/Complaint handling
- [ ] Resend webhook endpoint (planned)

---

## Phase 6: Testing & Polish 🟡 IN PROGRESS

### 6.1 Testing Infrastructure

- [x] Jest configuration with projects (unit/integration)
- [x] Testcontainers for PostgreSQL
- [x] Test fixtures factory
- [x] Integration tests for templates API
- [x] Integration tests for single-sends API
- [ ] Unit tests for collision service
- [ ] Unit tests for rendering service
- [ ] E2E tests with Playwright

### 6.2 Error Handling

- [ ] Global exception filters
- [ ] Validation error formatting
- [ ] API error responses

### 6.3 Documentation

- [x] README.md
- [x] ARCHITECTURE.md
- [x] IMPLEMENTATION_PLAN.md
- [x] SPEC.md
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide

---

## Project Structure

```
email-ops/
├── apps/
│   ├── api/                          # NestJS REST API + Job Processors
│   │   ├── src/
│   │   │   ├── analytics/            ✅ Dashboard metrics
│   │   │   ├── campaign-groups/      ✅ Collision group management
│   │   │   ├── components/           ✅ Reusable email blocks
│   │   │   ├── connectors/           ✅ Postgres & BigQuery adapters
│   │   │   ├── data-connectors/      ✅ Data source management
│   │   │   ├── email-connectors/     ✅ Email provider management
│   │   │   ├── health/               ✅ Health check
│   │   │   ├── lib/                  ✅ Shared utilities
│   │   │   ├── prisma/               ✅ Database service
│   │   │   ├── processors/           ✅ BullMQ job processors
│   │   │   ├── segments/             ✅ SQL-based audiences
│   │   │   ├── sender-profiles/      ✅ From addresses
│   │   │   ├── single-sends/         ✅ Campaign orchestration
│   │   │   ├── suppression/          ✅ Bounce/complaint handling
│   │   │   ├── templates/            ✅ Template management
│   │   │   ├── transactional/        🔴 Scaffolded
│   │   │   └── webhooks/             ✅ SES webhooks
│   │   ├── prisma/
│   │   │   └── schema.prisma         ✅ Database schema
│   │   └── test/
│   │       ├── integration/          ✅ Integration tests
│   │       └── utils/                ✅ Test utilities
│   │
│   └── web/                          # Next.js 15 Frontend
│       └── app/
│           ├── analytics/            ✅ Analytics page
│           ├── campaign-groups/      ✅ Collision groups
│           ├── campaigns/            ✅ Campaign list & detail
│           ├── data-connectors/      ✅ Data source management
│           ├── email-components/     ✅ Component library
│           ├── email-connectors/     ✅ Email provider management
│           ├── guide/                ✅ User guide
│           ├── journeys/             🔴 Stub
│           ├── segments/             ✅ Segment management
│           ├── sender-profiles/      ✅ Sender profiles
│           ├── settings/             ✅ Settings
│           ├── single-sends/         ✅ Single send management
│           ├── suppressions/         ✅ Suppression viewer
│           ├── templates/            ✅ Template management
│           └── page.tsx              ✅ Dashboard
│
├── infra/
│   ├── docker/                       Docker Compose for local dev
│   └── helm/                         Kubernetes Helm chart
│
├── ARCHITECTURE.md                   System design documentation
├── IMPLEMENTATION_PLAN.md            This file
├── README.md                         Project overview & setup
├── SPEC.md                           Product specification
├── Makefile                          Development commands
├── package.json                      Root workspace config
├── pnpm-workspace.yaml               pnpm monorepo definition
└── turbo.json                        Turborepo configuration
```

---

## Phase 7: Polish & Enhancements 🔴 PLANNED

### 7.1 Template Editor UI

**Problem**: Current template editing is just raw JSON/code input. No visual feedback.

**Planned Features:**
- [ ] Visual MJML editor with live preview pane
- [ ] Drag-and-drop UI Builder for non-technical users
- [ ] Component palette (drag components into template)
- [ ] Variable insertion helper (autocomplete for `{{varName}}`)
- [ ] Mobile/desktop preview toggle
- [ ] Syntax highlighting for MJML/HTML modes
- [ ] Template testing with sample data

### 7.2 Analytics Overhaul

**Problem**: Current analytics is basic stats only. No insights or visualization.

**Planned Features:**
- [ ] Time-series charts for sends/deliveries/bounces/complaints
- [ ] Campaign comparison view (A vs B performance)
- [ ] Funnel visualization (sent → delivered → opened → clicked)
- [ ] Click tracking with heatmaps
- [ ] Open tracking with pixel
- [ ] Engagement metrics per segment
- [ ] Export to CSV/PDF
- [ ] Real-time dashboard updates

### 7.3 Unsubscribe Handling

**Problem**: No way for recipients to unsubscribe directly from emails.

**Planned Features:**
- [ ] One-click unsubscribe link generation (`{{unsubscribeUrl}}`)
- [ ] List-Unsubscribe header (RFC 8058) for email clients
- [ ] Hosted unsubscribe landing page
- [ ] Preference center (manage subscription categories)
- [ ] Re-subscribe flow with confirmation
- [ ] Unsubscribe webhook notifications
- [ ] Automatic footer injection with unsubscribe link

### 7.4 Additional Improvements

- [ ] Email preview send (send test to specific address)
- [ ] Template duplication
- [ ] Segment preview with real data sample
- [ ] Campaign scheduling calendar view
- [ ] Batch operations (pause/archive multiple campaigns)
- [ ] Activity log / audit trail UI

---

## Next Steps (Priority Order)

1. **Template Editor UI** — Visual editor with live preview for better UX
2. **Unsubscribe Handling** — List-Unsubscribe header + hosted landing page
3. **Analytics Overhaul** — Time-series charts, open/click tracking
4. **Add Unit Tests** — Cover collision service and rendering logic
5. **Transactional API** — Enable programmatic email sending

---

## Success Criteria

- [x] All API endpoints functional
- [x] Web UI for all features
- [x] Campaign groups with collision policies
- [x] Component library CRUD
- [x] Integration test infrastructure
- [x] Complete campaign execution flow
- [x] Email delivery working end-to-end (SES)
- [x] Webhook event processing (SES)
- [ ] Visual template editor with preview
- [ ] One-click unsubscribe in emails
- [ ] Analytics with time-series charts
- [ ] Open and click tracking
- [ ] 80%+ test coverage
- [ ] Transactional email API
- [ ] Additional email providers (Resend, SMTP)
