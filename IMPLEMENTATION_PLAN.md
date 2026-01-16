# Implementation Plan: EmailOps

> Version 3.0 — Updated January 2026
> See also: [ARCHITECTURE.md](./ARCHITECTURE.md) | [BUSINESS.md](./BUSINESS.md) | [SPEC.md](./SPEC.md)

---

## Overview

EmailOps is a **SQL-first email orchestration platform** with these key differentiators:

1. **Zero-ETL**: Direct database queries, no sync required
2. **Collision Engine**: Priority-based deduplication across campaign groups
3. **Component Library**: Reusable email building blocks
4. **Modern UI**: Dark theme with Tailwind CSS

---

## Current Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Database Schema | ✅ Complete | 100% |
| Phase 2: API Layer | ✅ Complete | 100% |
| Phase 3: Web UI | ✅ Complete | 100% |
| Phase 4: Worker Processors | 🟡 In Progress | 60% |
| Phase 5: End-to-End Flow | 🔴 Pending | 20% |
| Phase 6: Testing & Polish | 🟡 In Progress | 40% |

---

## Phase 1: Database Schema ✅ COMPLETE

### 1.1 Core Models

**File**: `packages/core/prisma/schema.prisma`

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

### 2.10 Analytics

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

### 3.10 Settings

**Files**: `apps/web/app/settings/`
- [x] Settings page structure

---

## Phase 4: Worker Processors 🟡 IN PROGRESS

### 4.1 Single Send Processor

**File**: `apps/worker/src/processors/single-send.processor.ts`
- [x] Queue setup with BullMQ
- [x] Basic job handler structure
- [ ] Create SingleSendRun record
- [ ] Enqueue segment job
- [ ] Handle run status transitions

### 4.2 Segment Processor

**File**: `apps/worker/src/processors/segment.processor.ts`
- [x] Basic processor structure
- [ ] Execute SQL query via data connector
- [ ] Apply collision filters
- [ ] Create SingleSendRecipient records
- [ ] Enqueue send jobs

### 4.3 Send Processor

**File**: `apps/worker/src/processors/send.processor.ts`
- [x] Basic processor structure
- [ ] Render template with variables
- [ ] Send via email connector (SES)
- [ ] Update Send record status
- [ ] Record in SendLog for collision tracking
- [ ] Handle retries and dead letter

### 4.4 Events Processor

**File**: `apps/worker/src/processors/events.processor.ts`
- [x] Basic processor structure
- [ ] Handle delivery events
- [ ] Handle bounce events
- [ ] Handle complaint events
- [ ] Update suppression list

---

## Phase 5: End-to-End Flow 🔴 PENDING

### 5.1 Campaign Execution Flow

- [ ] Trigger campaign → create run → build audience → send emails
- [ ] Collision detection at audience build time
- [ ] Collision detection at send time (belt-and-suspenders)
- [ ] Rate limiting per sender profile
- [ ] Retry logic with exponential backoff

### 5.2 Template Rendering

- [x] MJML → HTML compilation
- [x] Handlebars variable substitution
- [ ] Component resolution from library
- [ ] UI Builder schema compilation

### 5.3 Email Delivery

- [ ] SES integration end-to-end
- [ ] Resend integration
- [ ] SMTP integration

### 5.4 Webhook Handling

- [ ] SES SNS webhook endpoint
- [ ] Resend webhook endpoint
- [ ] Event processing and storage

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
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide

---

## File Structure

```
email-ops/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── analytics/            ✅
│   │       ├── campaign-groups/      ✅
│   │       ├── common/               ✅
│   │       ├── components/           ✅
│   │       ├── data-connectors/      ✅
│   │       ├── email-connectors/     ✅
│   │       ├── health/               ✅
│   │       ├── prisma/               ✅
│   │       ├── segments/             ✅
│   │       ├── sender-profiles/      ✅
│   │       ├── single-sends/         ✅
│   │       ├── templates/            ✅
│   │       ├── transactional/        🔴 Scaffolded
│   │       └── webhooks/             🔴 Scaffolded
│   ├── worker/
│   │   └── src/
│   │       └── processors/
│   │           ├── single-send.processor.ts  🟡
│   │           ├── segment.processor.ts      🟡
│   │           ├── send.processor.ts         🟡
│   │           └── events.processor.ts       🟡
│   └── web/
│       └── app/
│           ├── campaign-groups/      ✅
│           ├── campaigns/            ✅
│           ├── data-connectors/      ✅
│           ├── email-components/     ✅
│           ├── email-connectors/     ✅
│           ├── journeys/             🔴 Stub
│           ├── segments/             ✅
│           ├── sender-profiles/      ✅
│           ├── settings/             ✅
│           ├── single-sends/         ✅
│           ├── templates/            ✅
│           └── page.tsx              ✅ Dashboard
├── packages/
│   ├── core/                         ✅
│   ├── connectors/                   ✅
│   ├── email/                        ✅
│   ├── ses/                          ✅
│   └── ui-kit/                       ✅
└── test/
    └── integration/                  ✅
```

---

## Next Steps (Priority Order)

1. **Complete Worker Processors** — Implement the actual job processing logic
2. **End-to-End Campaign Flow** — Connect all pieces for a working send
3. **Add Unit Tests** — Cover collision service and rendering logic
4. **Webhook Integration** — Handle delivery/bounce/complaint events
5. **Transactional API** — Enable programmatic email sending

---

## Success Criteria

- [x] All API endpoints functional
- [x] Web UI for all features
- [x] Campaign groups with collision policies
- [x] Component library CRUD
- [x] Integration test infrastructure
- [ ] Complete campaign execution flow
- [ ] Email delivery working end-to-end
- [ ] Webhook event processing
- [ ] 80%+ test coverage
