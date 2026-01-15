# EmailOps Architecture

> Version: 1.0
> Last Updated: January 2025

## System Overview

EmailOps is a **SQL-first email orchestration platform** designed for data-mature companies. It sits between your existing data infrastructure and email delivery providers, enabling marketing and product teams to run sophisticated campaigns without complex CDP integrations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EmailOps Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐         ┌──────────────────────────────────────────┐    │
│    │   Next.js    │         │              NestJS API                  │    │
│    │   Frontend   │◄───────►│  ┌─────────┐ ┌─────────┐ ┌───────────┐  │    │
│    │   (Port 3030)│   REST  │  │Campaign │ │Template │ │  Segment  │  │    │
│    └──────────────┘         │  │ Groups  │ │   API   │ │    API    │  │    │
│                             │  └─────────┘ └─────────┘ └───────────┘  │    │
│                             │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │    │
│                             │  │Collision│ │Component│ │  Single   │  │    │
│                             │  │ Engine  │ │ Library │ │   Sends   │  │    │
│                             │  └─────────┘ └─────────┘ └───────────┘  │    │
│                             └──────────────────────────────────────────┘    │
│                                              │                               │
│                                              │ BullMQ                        │
│                                              ▼                               │
│    ┌──────────────┐         ┌──────────────────────────────────────────┐    │
│    │    Redis     │◄───────►│            NestJS Worker                 │    │
│    │  (Job Queue) │         │  ┌─────────────┐  ┌───────────────────┐  │    │
│    └──────────────┘         │  │   Segment   │  │   Send Processor  │  │    │
│                             │  │  Processor  │  │  + Collision Check│  │    │
│                             │  └─────────────┘  └───────────────────┘  │    │
│                             └──────────────────────────────────────────┘    │
│                                              │                               │
│              ┌───────────────────────────────┼───────────────────────────┐   │
│              │                               │                           │   │
│              ▼                               ▼                           ▼   │
│    ┌──────────────┐              ┌──────────────┐              ┌────────────┐│
│    │  PostgreSQL  │              │ Customer DB  │              │  AWS SES   ││
│    │ (System DB)  │              │ (via Query   │              │  Resend    ││
│    │              │              │  Governor)   │              │  SMTP      ││
│    └──────────────┘              └──────────────┘              └────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Design Principles

### 1. Zero-ETL Architecture
- Query existing tables directly via SQL
- No data duplication or sync pipelines required
- Real-time audience selection from source of truth

### 2. SQL-First Design
- Segments defined as SQL queries
- Full power of SQL for complex audience logic
- Parameters for dynamic filtering (dates, thresholds)

### 3. Snapshot-Based Execution
- Each campaign run creates an immutable recipient snapshot
- Deterministic, reproducible, auditable
- Clear audit trail for compliance

### 4. Collision-Aware Orchestration
- Campaign Groups prevent email fatigue
- Priority-based deduplication
- Configurable collision windows

### 5. Single-Tenant by Design
- One deployment = one organization
- Simplified security model
- Full data isolation

---

## Component Architecture

### Frontend (Next.js 16)

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Dashboard
│   ├── (auth)/                 # Authentication pages
│   ├── campaigns/              # Campaign management
│   │   ├── page.tsx            # List view
│   │   ├── [id]/               # Detail/edit view
│   │   └── new/                # Create flow
│   ├── campaign-groups/        # Campaign group management
│   ├── segments/               # SQL segment editor
│   ├── templates/              # Template authoring
│   ├── components/             # Component library management
│   ├── connectors/             # Data & email connector setup
│   └── settings/               # System settings
├── components/
│   ├── ui/                     # Design system components
│   ├── charts/                 # Analytics visualizations
│   ├── editors/                # Code editors (SQL, MJML)
│   └── forms/                  # Form components
└── lib/
    ├── api.ts                  # API client
    ├── hooks/                  # React hooks
    └── utils/                  # Utilities
```

**Technology Choices**:
- React 19 with Server Components
- Tailwind CSS 4 for styling
- Radix UI primitives for accessibility
- Recharts for analytics visualization
- Monaco Editor for code editing

### Backend API (NestJS 11)

```
apps/api/
├── src/
│   ├── main.ts                 # Application entry
│   ├── app.module.ts           # Root module
│   │
│   ├── campaign-groups/        # Campaign group management
│   │   ├── campaign-groups.controller.ts
│   │   ├── campaign-groups.service.ts
│   │   └── dto/
│   │
│   ├── single-sends/           # Campaign orchestration
│   │   ├── single-sends.controller.ts
│   │   ├── single-sends.service.ts
│   │   ├── collision.service.ts    # Collision detection
│   │   └── dto/
│   │
│   ├── segments/               # Audience definition
│   │   ├── segments.controller.ts
│   │   ├── segments.service.ts
│   │   └── query-governor.ts   # SQL safety layer
│   │
│   ├── templates/              # Template management
│   │   ├── templates.controller.ts
│   │   ├── templates.service.ts
│   │   └── rendering.service.ts
│   │
│   ├── component-library/      # Reusable components
│   │   ├── components.controller.ts
│   │   └── components.service.ts
│   │
│   ├── connectors/             # Data connectors
│   │   ├── data-connectors/
│   │   └── email-connectors/
│   │
│   ├── analytics/              # Delivery analytics
│   │   └── analytics.service.ts
│   │
│   └── common/                 # Shared utilities
│       ├── prisma/
│       ├── encryption/
│       └── guards/
```

### Background Worker (NestJS + BullMQ)

```
apps/worker/
├── src/
│   ├── main.ts
│   ├── worker.module.ts
│   │
│   └── processors/
│       ├── segment.processor.ts      # Audience building
│       │   ├── buildAudienceSnapshot()
│       │   ├── applyCollisionFilters()
│       │   └── enqueueSendJobs()
│       │
│       ├── send.processor.ts         # Email delivery
│       │   ├── sendEmail()
│       │   ├── checkCollisionAtSendTime()
│       │   ├── applyRateLimiting()
│       │   └── handleRetries()
│       │
│       └── analytics.processor.ts    # Stats aggregation
```

### Shared Packages

```
packages/
├── core/                       # Database & types
│   ├── prisma/
│   │   └── schema.prisma       # Data model
│   └── src/
│       ├── index.ts            # Prisma client export
│       └── encryption.service.ts
│
├── connectors/                 # Data source adapters
│   └── src/
│       ├── postgres.adapter.ts
│       ├── bigquery.adapter.ts
│       ├── query-governor.ts   # SQL safety layer
│       └── factory.ts
│
├── email/                      # Email compilation
│   └── src/
│       ├── compiler.ts         # MJML → HTML
│       ├── renderer.ts         # Handlebars templating
│       └── components.ts       # Component resolution
│
└── ui/                         # Shared UI components
    └── src/
        ├── button.tsx
        ├── input.tsx
        └── ...
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  CampaignGroup  │       │   SingleSend    │       │    Segment      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │◄──┐   │ id              │       │ id              │
│ name            │   │   │ name            │   ┌──►│ name            │
│ collisionWindow │   │   │ status          │   │   │ sqlQuery        │
│ collisionPolicy │   └───│ campaignGroupId │   │   │ dataConnectorId │
└─────────────────┘       │ segmentId       │───┘   └─────────────────┘
                          │ templateId      │───┐
                          │ senderProfileId │   │   ┌─────────────────┐
                          │ priority        │   │   │    Template     │
                          └─────────────────┘   │   ├─────────────────┤
                                  │             └──►│ id              │
                                  │                 │ key             │
                                  ▼                 │ name            │
                          ┌─────────────────┐       │ category        │
                          │  SingleSendRun  │       └─────────────────┘
                          ├─────────────────┤               │
                          │ id              │               ▼
                          │ status          │       ┌─────────────────┐
                          │ stats           │       │ TemplateVersion │
                          │ startedAt       │       ├─────────────────┤
                          └─────────────────┘       │ id              │
                                  │                 │ version         │
                                  ▼                 │ subject         │
                          ┌─────────────────┐       │ bodyHtml        │
                          │SingleSendRecip. │       │ bodyMjml        │
                          ├─────────────────┤       │ authoringMode   │
                          │ id              │       │ active          │
                          │ subjectId       │       └─────────────────┘
                          │ email           │
                          │ status          │       ┌─────────────────┐
                          │ skipReason      │       │   Component     │
                          └─────────────────┘       ├─────────────────┤
                                  │                 │ id              │
                                  ▼                 │ name            │
                          ┌─────────────────┐       │ type (MJML/HTML)│
                          │      Send       │       │ content         │
                          ├─────────────────┤       │ variables       │
                          │ id              │       └─────────────────┘
                          │ status          │
                          │ providerMsgId   │       ┌─────────────────┐
                          │ attempts        │       │    SendLog      │
                          └─────────────────┘       ├─────────────────┤
                                                    │ id              │
                          ┌─────────────────┐       │ subjectId       │
                          │  DataConnector  │       │ campaignGroupId │
                          ├─────────────────┤       │ singleSendId    │
                          │ id              │       │ sentAt          │
                          │ type            │       └─────────────────┘
                          │ name            │
                          │ config (enc)    │
                          └─────────────────┘

                          ┌─────────────────┐
                          │ EmailConnector  │
                          ├─────────────────┤
                          │ id              │
                          │ type            │
                          │ name            │
                          │ config (enc)    │
                          └─────────────────┘
```

---

## Collision Engine

The collision engine prevents email fatigue by coordinating sends across related campaigns.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COLLISION DETECTION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUDIENCE BUILDING PHASE                                                     │
│  ═══════════════════════                                                     │
│                                                                              │
│  1. Execute Segment SQL                                                      │
│     └─► Returns: [{ subjectId, email, vars }, ...]                          │
│                                                                              │
│  2. For each recipient:                                                      │
│     │                                                                        │
│     ├─► Check SendLog: "Was this user sent email from this                  │
│     │   campaign group within collision window?"                             │
│     │   └─► If YES: Skip (reason: collision:already_sent)                   │
│     │                                                                        │
│     ├─► Check Priority: "Is this user queued for higher-priority            │
│     │   campaign in same group?"                                             │
│     │   └─► If YES: Skip (reason: collision:lower_priority)                 │
│     │                                                                        │
│     └─► If all checks pass: Add to SingleSendRecipient                      │
│                                                                              │
│  SEND-TIME PHASE                                                             │
│  ═══════════════                                                             │
│                                                                              │
│  3. Before each send (belt-and-suspenders):                                  │
│     └─► Re-check collision (handles race conditions)                        │
│                                                                              │
│  4. After successful send:                                                   │
│     └─► Insert into SendLog for future collision detection                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Collision Policies

| Policy | Behavior |
|--------|----------|
| `HIGHEST_PRIORITY_WINS` | Only send highest priority campaign per user per window |
| `FIRST_QUEUED_WINS` | First campaign to queue the user wins |
| `SEND_ALL` | No collision handling (opt-out) |

### Example Scenario

```
Campaign Group: "Activation Emails"
├── Priority 1: "Critical: Account Suspended" (balance < 0)
├── Priority 2: "Urgent: Low Credits" (credits < 5)
├── Priority 3: "Reminder: Credits Running Low" (credits < 20)
└── Priority 4: "Engagement: Weekly Summary"

Collision Window: 24 hours
Policy: HIGHEST_PRIORITY_WINS

┌─────────┬─────────┬─────────────────┬──────────────────────────┐
│ User    │ Credits │ Qualifies For   │ Receives                 │
├─────────┼─────────┼─────────────────┼──────────────────────────┤
│ Alice   │ -5      │ P1, P2, P3, P4  │ "Account Suspended" only │
│ Bob     │ 3       │ P2, P3, P4      │ "Low Credits" only       │
│ Charlie │ 15      │ P3, P4          │ "Credits Running Low"    │
│ Diana   │ 50      │ P4              │ "Weekly Summary"         │
└─────────┴─────────┴─────────────────┴──────────────────────────┘
```

---

## Query Governor

The Query Governor ensures safe execution of user-provided SQL against customer databases.

### Safety Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUERY GOVERNOR                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: STATIC ANALYSIS                                                    │
│  ├── Only SELECT/WITH statements allowed                                    │
│  ├── Forbidden: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE       │
│  ├── Forbidden: GRANT, REVOKE, COMMENT, VACUUM, ANALYZE                     │
│  └── Single statement only (no semicolon-separated batches)                 │
│                                                                              │
│  Layer 2: QUERY WRAPPING                                                     │
│  ├── Dry-run: Automatic LIMIT injection                                     │
│  ├── Full-run: Configurable row limit (default: 1M)                         │
│  └── Count query: SELECT COUNT(*) FROM (user_query) AS subq                 │
│                                                                              │
│  Layer 3: EXECUTION CONTROLS                                                 │
│  ├── Statement timeout: 5s (dry-run), 300s (full-run)                       │
│  ├── Read-only transaction mode                                              │
│  ├── Connection pool isolation                                               │
│  └── Query cancellation on timeout                                           │
│                                                                              │
│  Layer 4: RESULT HANDLING                                                    │
│  ├── Streaming for large result sets                                         │
│  ├── Memory limits per query                                                 │
│  └── PII masking (configurable)                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Library System

Reusable email components for consistent branding across templates.

### Component Types

```typescript
type ComponentType =
  | 'HEADER'      // Logo, navigation
  | 'FOOTER'      // Unsubscribe, social links
  | 'BUTTON'      // CTA buttons with brand styling
  | 'CARD'        // Content cards
  | 'DIVIDER'     // Visual separators
  | 'SNIPPET';    // Custom HTML/MJML blocks

interface Component {
  id: string;
  name: string;           // "Primary Button", "Email Footer"
  type: ComponentType;
  contentType: 'MJML' | 'HTML';
  content: string;        // The actual MJML/HTML
  variables: Variable[];  // Configurable params
  previewHtml: string;    // Rendered preview
}

interface Variable {
  name: string;
  type: 'string' | 'color' | 'url' | 'image';
  defaultValue: string;
  description: string;
}
```

### Usage in Templates

```handlebars
<!-- In template MJML -->
<mj-body>
  {{> header }}

  <mj-section>
    <mj-column>
      <mj-text>Hello {{firstName}},</mj-text>
      <mj-text>Your credits are running low.</mj-text>

      {{> button text="Add Credits" url="{{{ctaUrl}}}" }}
    </mj-column>
  </mj-section>

  {{> footer }}
</mj-body>
```

---

## Job Queue Architecture

### Queue Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REDIS QUEUES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  queue:singleSend                                                            │
│  └── Jobs: triggerSingleSend                                                │
│      └── Creates run, enqueues segment job                                  │
│                                                                              │
│  queue:segment                                                               │
│  ├── Jobs: buildAudienceSnapshot                                            │
│  │   └── Execute SQL, apply collision filters, enqueue sends               │
│  └── Jobs: dryRunSegment                                                    │
│      └── Preview query with LIMIT                                           │
│                                                                              │
│  queue:send                                                                  │
│  └── Jobs: sendEmail                                                        │
│      └── Rate limit, send via provider, track status                        │
│                                                                              │
│  queue:analytics                                                             │
│  └── Jobs: aggregateStats                                                   │
│      └── Roll up delivery stats for dashboard                               │
│                                                                              │
│  queue:dead-letter                                                           │
│  └── Failed jobs after max retries                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting

```
Algorithm: Token Bucket (Redis-backed)

Per sender profile:
├── bucket_size: 100 (max burst)
├── refill_rate: 10/second (sustained rate)
└── key: rate_limit:{senderProfileId}

Implementation: Lua script for atomic check-and-decrement
```

---

## Deployment Architecture

### Docker Compose (Development/Small Scale)

```yaml
services:
  postgres:      # System database
  redis:         # Job queue + rate limiting
  api:           # REST API
  worker:        # Background processor
  web:           # Frontend
```

### Kubernetes (Production)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES CLUSTER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Namespace: emailops                                                         │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Deployment  │  │ Deployment  │  │ Deployment  │  │ StatefulSet │         │
│  │ api         │  │ worker      │  │ web         │  │ redis       │         │
│  │ replicas: 2 │  │ replicas: 3 │  │ replicas: 2 │  │ replicas: 1 │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                │                 │
│         └────────────────┼────────────────┼────────────────┘                 │
│                          │                │                                  │
│                          ▼                ▼                                  │
│                   ┌─────────────┐  ┌─────────────┐                           │
│                   │ Service     │  │ Ingress     │                           │
│                   │ ClusterIP   │  │ nginx       │                           │
│                   └─────────────┘  └─────────────┘                           │
│                                                                              │
│  External:                                                                   │
│  ├── PostgreSQL (managed: RDS, Cloud SQL, etc.)                             │
│  └── Redis (managed: ElastiCache, Memorystore, etc.)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| API | Horizontal (stateless) |
| Worker | Horizontal (competing consumers) |
| Web | Horizontal (stateless) |
| Redis | Vertical (single instance sufficient for most) |
| PostgreSQL | Vertical + read replicas |

---

## Security Model

### Credential Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CREDENTIAL FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User enters credentials (AWS keys, DB password)                         │
│                           │                                                  │
│                           ▼                                                  │
│  2. API encrypts with AES-256-CBC                                           │
│     └── Key derived from ENCRYPTION_SECRET env var                          │
│     └── Unique IV per encryption                                            │
│                           │                                                  │
│                           ▼                                                  │
│  3. Stored in database as: { encrypted: "iv:ciphertext" }                   │
│                           │                                                  │
│                           ▼                                                  │
│  4. Worker decrypts on-demand for each job                                  │
│     └── Credentials never cached in memory                                  │
│     └── Credentials never logged                                            │
│                           │                                                  │
│                           ▼                                                  │
│  5. API responses sanitize credentials                                       │
│     └── Returns: { type: "POSTGRES", name: "...", config: "[REDACTED]" }   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Access Control

| Resource | Access Pattern |
|----------|---------------|
| Customer Database | Read-only via Query Governor |
| Email Provider | Send-only via configured connector |
| System Database | Full access (internal only) |
| API | Authenticated via session/token |

---

## Monitoring & Observability

### Key Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           METRICS DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DELIVERY METRICS                                                            │
│  ├── emails_sent_total (counter)                                            │
│  ├── emails_delivered_total (counter)                                       │
│  ├── emails_bounced_total (counter, by type: hard/soft)                     │
│  ├── emails_complained_total (counter)                                      │
│  └── delivery_latency_seconds (histogram)                                   │
│                                                                              │
│  QUEUE METRICS                                                               │
│  ├── queue_depth (gauge, by queue)                                          │
│  ├── job_processing_time_seconds (histogram)                                │
│  └── job_failures_total (counter, by queue)                                 │
│                                                                              │
│  COLLISION METRICS                                                           │
│  ├── recipients_skipped_total (counter, by reason)                          │
│  │   └── reasons: collision:already_sent, collision:lower_priority          │
│  └── collision_checks_total (counter)                                       │
│                                                                              │
│  QUERY METRICS                                                               │
│  ├── segment_query_duration_seconds (histogram)                             │
│  ├── segment_query_rows_total (counter)                                     │
│  └── segment_query_errors_total (counter)                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### RESTful Endpoints

```
Campaign Groups
POST   /api/campaign-groups
GET    /api/campaign-groups
GET    /api/campaign-groups/:id
PATCH  /api/campaign-groups/:id
DELETE /api/campaign-groups/:id

Single Sends (Campaigns)
POST   /api/single-sends
GET    /api/single-sends
GET    /api/single-sends/:id
PATCH  /api/single-sends/:id
DELETE /api/single-sends/:id
POST   /api/single-sends/:id/trigger
GET    /api/single-sends/:id/runs
GET    /api/single-sends/:id/runs/:runId

Segments
POST   /api/segments
GET    /api/segments
GET    /api/segments/:id
PATCH  /api/segments/:id
DELETE /api/segments/:id
POST   /api/segments/:id/dry-run

Templates
POST   /api/templates
GET    /api/templates
GET    /api/templates/:id
PATCH  /api/templates/:id
DELETE /api/templates/:id
POST   /api/templates/:id/versions
PATCH  /api/templates/:id/versions/:versionId/publish

Components
POST   /api/components
GET    /api/components
GET    /api/components/:id
PATCH  /api/components/:id
DELETE /api/components/:id
POST   /api/components/:id/preview

Connectors
POST   /api/data-connectors
GET    /api/data-connectors
POST   /api/data-connectors/test
POST   /api/email-connectors
GET    /api/email-connectors
POST   /api/email-connectors/test

Analytics
GET    /api/analytics/overview
GET    /api/analytics/campaigns/:id
GET    /api/analytics/delivery-timeline
```

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 16.x |
| Frontend | React | 19.x |
| Frontend | Tailwind CSS | 4.x |
| Backend | NestJS | 11.x |
| Backend | TypeScript | 5.x |
| Database | PostgreSQL | 15+ |
| Queue | Redis + BullMQ | 7.x / 5.x |
| ORM | Prisma | 7.x |
| Email | AWS SES v2 | - |
| Email | MJML | 4.x |
| Templating | Handlebars | 4.x |
| Package Manager | pnpm | 9.x |
| Build | Turbo | 2.x |
