# EmailOps Architecture

> Version: 2.1
> Last Updated: January 2026

## System Overview

EmailOps is a **SQL-first email orchestration platform** designed for data-mature companies. It sits between your existing data infrastructure and email delivery providers, enabling marketing and product teams to run sophisticated campaigns without complex CDP integrations.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           EmailOps Architecture                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│    ┌──────────────┐         ┌─────────────────────────────────────────┐        │
│    │   Next.js    │         │              NestJS API                 │        │
│    │   Frontend   │◄───────►│  ┌─────────┐ ┌─────────┐ ┌───────────┐  │        │
│    │  (Port 3030) │   REST  │  │Campaign │ │Template │ │  Segment  │  │        │
│    └──────────────┘         │  │ Groups  │ │   API   │ │    API    │  │        │
│                             │  └─────────┘ └─────────┘ └───────────┘  │        │
│                             │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │        │
│                             │  │Collision│ │Component│ │  Single   │  │        │
│                             │  │ Engine  │ │ Library │ │   Sends   │  │        │
│                             │  └─────────┘ └─────────┘ └───────────┘  │        │
│                             │                                         │        │
│                             │  ┌──────────────────────────────────┐   │        │
│                             │  │         Job Processors           │   │        │
│                             │  │  (BullMQ - runs in same process) │   │        │
│                             │  └──────────────────────────────────┘   │        │
│                             └─────────────────────────────────────────┘        │
│                                              │                                 │
│                                              │ BullMQ                          │
│                                              ▼                                 │
│    ┌──────────────┐              ┌──────────────┐              ┌────────────┐  │
│    │    Redis     │◄────────────►│ Customer DB  │              │  AWS SES   │  │
│    │  (Job Queue) │              │ (via Query   │              │  Resend    │  │
│    └──────────────┘              │  Governor)   │              │  SMTP      │  │
│                                  └──────────────┘              └────────────┘  │
│           │                                                                    │
│           ▼                                                                    │
│    ┌──────────────┐                                                            │
│    │  PostgreSQL  │                                                            │
│    │ (System DB)  │                                                            │
│    └──────────────┘                                                            │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
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

### Frontend (Next.js 15)

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with sidebar navigation
│   ├── page.tsx                # Dashboard (analytics overview)
│   ├── analytics/              # Analytics page
│   ├── campaign-groups/        # Collision group management
│   │   └── [id]/               # Group detail
│   ├── campaigns/              # Campaign list (alias)
│   │   └── [id]/               # Campaign detail view
│   ├── single-sends/           # Single send management
│   │   └── [id]/               # Single send detail
│   ├── segments/               # Segment management
│   │   └── [id]/               # Segment detail with SQL editor
│   ├── templates/              # Template management
│   │   └── [id]/               # Template detail with versioning
│   ├── email-components/       # Component library gallery
│   ├── data-connectors/        # Data source management
│   │   └── [id]/               # Connector detail
│   ├── email-connectors/       # Email provider management
│   │   └── [id]/               # Provider detail
│   ├── sender-profiles/        # Sender profile management
│   │   └── [id]/               # Profile detail
│   ├── suppressions/           # Suppression/unsubscribe viewer
│   ├── journeys/               # Journey automation (stub)
│   ├── settings/               # Workspace settings
│   └── guide/                  # User guide/onboarding
├── components/
│   └── ui/                     # Shared UI components
└── lib/
    └── api.ts                  # API client utilities
```

**Technology Choices**:

- React 19 with Server Components
- Tailwind CSS 4 for styling
- Radix UI primitives for accessibility
- Recharts for analytics visualization

### Backend API (NestJS 11)

The API combines REST endpoints and background job processing in a single application.

```
apps/api/
├── src/
│   ├── main.ts                 # Application entry (Port 3300)
│   ├── app.module.ts           # Root module
│   │
│   ├── analytics/              # Dashboard & reporting
│   │   ├── analytics.controller.ts
│   │   └── analytics.service.ts
│   │
│   ├── campaign-groups/        # Collision group management
│   │   ├── campaign-groups.controller.ts
│   │   ├── campaign-groups.service.ts
│   │   └── dto/
│   │
│   ├── components/             # Reusable email blocks
│   │   ├── components.controller.ts
│   │   ├── components.service.ts
│   │   └── dto/
│   │
│   ├── connectors/             # Data source adapters
│   │   ├── postgres.adapter.ts
│   │   ├── bigquery.adapter.ts
│   │   ├── connector.factory.ts
│   │   └── connector.interface.ts
│   │
│   ├── data-connectors/        # Data connector management
│   │   ├── data-connectors.controller.ts
│   │   ├── data-connectors.service.ts
│   │   └── dto/
│   │
│   ├── email-connectors/       # Email provider management
│   │   ├── email-connectors.controller.ts
│   │   ├── email-connectors.service.ts
│   │   └── dto/
│   │
│   ├── health/                 # Health check endpoint
│   │   └── health.controller.ts
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── encryption.ts       # AES-256-CBC encryption
│   │   ├── query-governor.ts   # SQL safety layer
│   │   └── email-compiler.ts   # MJML compilation
│   │
│   ├── prisma/                 # Database service
│   │   └── prisma.service.ts
│   │
│   ├── processors/             # BullMQ job processors
│   │   ├── segment.processor.ts      # Audience building
│   │   ├── send.processor.ts         # Email delivery
│   │   ├── events.processor.ts       # ESP event handling
│   │   └── single-send.processor.ts  # Campaign orchestration
│   │
│   ├── segments/               # SQL-based audiences
│   │   ├── segments.controller.ts
│   │   ├── segments.service.ts
│   │   └── dto/
│   │
│   ├── sender-profiles/        # From addresses
│   │   ├── sender-profiles.controller.ts
│   │   ├── sender-profiles.service.ts
│   │   └── dto/
│   │
│   ├── single-sends/           # Campaign orchestration
│   │   ├── single-sends.controller.ts
│   │   ├── single-sends.service.ts
│   │   ├── collision.service.ts      # Collision detection
│   │   └── dto/
│   │
│   ├── suppression/            # Bounce/complaint/unsubscribe
│   │   ├── suppression.controller.ts
│   │   └── suppression.service.ts
│   │
│   ├── templates/              # Template management
│   │   ├── templates.controller.ts
│   │   ├── templates.service.ts
│   │   ├── template-versions.controller.ts
│   │   ├── template-versions.service.ts
│   │   ├── rendering.service.ts      # MJML/HTML compilation
│   │   └── dto/
│   │
│   ├── transactional/          # Transactional API (scaffolded)
│   └── webhooks/               # ESP webhooks
│       └── webhooks.controller.ts
│
├── prisma/
│   └── schema.prisma           # Database schema
│
└── test/
    ├── integration/            # Integration tests
    └── utils/                  # Test utilities
        ├── test-database.ts    # Testcontainers
        └── test-fixtures.ts    # Data factory
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
│                         COLLISION DETECTION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AUDIENCE BUILDING PHASE                                                    │
│  ═══════════════════════                                                    │
│                                                                             │
│  1. Execute Segment SQL                                                     │
│     └─► Returns: [{ subjectId, email, vars }, ...]                          │
│                                                                             │
│  2. For each recipient:                                                     │
│     │                                                                       │
│     ├─► Check SendLog: "Was this user sent email from this                  │
│     │   campaign group within collision window?"                            │
│     │   └─► If YES: Skip (reason: collision:already_sent)                   │
│     │                                                                       │
│     ├─► Check Priority: "Is this user queued for higher-priority            │
│     │   campaign in same group?"                                            │
│     │   └─► If YES: Skip (reason: collision:lower_priority)                 │
│     │                                                                       │
│     ├─► Check Suppression: "Is this email suppressed?"                      │
│     │   └─► If YES: Skip (reason: suppression:bounce/complaint)             │
│     │                                                                       │
│     └─► If all checks pass: Add to SingleSendRecipient                      │
│                                                                             │
│  SEND-TIME PHASE                                                            │
│  ═══════════════                                                            │
│                                                                             │
│  3. Before each send (belt-and-suspenders):                                 │
│     └─► Re-check collision (handles race conditions)                        │
│                                                                             │
│  4. After successful send:                                                  │
│     └─► Insert into SendLog for future collision detection                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Collision Policies

| Policy                  | Behavior                                                |
| ----------------------- | ------------------------------------------------------- |
| `HIGHEST_PRIORITY_WINS` | Only send highest priority campaign per user per window |
| `FIRST_QUEUED_WINS`     | First campaign to queue the user wins                   |
| `SEND_ALL`              | No collision handling (opt-out)                         |

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
│                              QUERY GOVERNOR                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: STATIC ANALYSIS                                                   │
│  ├── Only SELECT/WITH statements allowed                                    │
│  ├── Forbidden: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE       │
│  ├── Forbidden: GRANT, REVOKE, COMMENT, VACUUM, ANALYZE                     │
│  └── Single statement only (no semicolon-separated batches)                 │
│                                                                             │
│  Layer 2: QUERY WRAPPING                                                    │
│  ├── Dry-run: Automatic LIMIT injection                                     │
│  ├── Full-run: Configurable row limit (default: 1M)                         │
│  └── Count query: SELECT COUNT(*) FROM (user_query) AS subq                 │
│                                                                             │
│  Layer 3: EXECUTION CONTROLS                                                │
│  ├── Statement timeout: 5s (dry-run), 300s (full-run)                       │
│  ├── Read-only transaction mode                                             │
│  ├── Connection pool isolation                                              │
│  └── Query cancellation on timeout                                          │
│                                                                             │
│  Layer 4: RESULT HANDLING                                                   │
│  ├── Streaming for large result sets                                        │
│  ├── Memory limits per query                                                │
│  └── PII masking (configurable)                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Library System

Reusable email components for consistent branding across templates.

### Component Types

```typescript
type ComponentType =
  | "HEADER" // Logo, navigation
  | "FOOTER" // Unsubscribe, social links
  | "BUTTON" // CTA buttons with brand styling
  | "CARD" // Content cards
  | "DIVIDER" // Visual separators
  | "SNIPPET"; // Custom HTML/MJML blocks

interface Component {
  id: string;
  name: string; // "Primary Button", "Email Footer"
  type: ComponentType;
  contentType: "MJML" | "HTML";
  content: string; // The actual MJML/HTML
  variables: Variable[]; // Configurable params
  previewHtml: string; // Rendered preview
}

interface Variable {
  name: string;
  type: "string" | "color" | "url" | "image";
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
│                              REDIS QUEUES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  queue:singleSend                                                           │
│  └── Jobs: triggerSingleSend                                                │
│      └── Creates run, enqueues segment job                                  │
│                                                                             │
│  queue:segment                                                              │
│  ├── Jobs: buildAudienceSnapshot                                            │
│  │   └── Execute SQL, apply collision filters, enqueue sends                │
│  └── Jobs: dryRunSegment                                                    │
│      └── Preview query with LIMIT                                           │
│                                                                             │
│  queue:send                                                                 │
│  └── Jobs: sendEmail                                                        │
│      └── Rate limit, send via provider, track status                        │
│                                                                             │
│  queue:events                                                               │
│  └── Jobs: delivery, bounce, complaint                                      │
│      └── Process ESP webhooks, update suppression list                      │
│                                                                             │
│  queue:dead-letter                                                          │
│  └── Failed jobs after max retries                                          │
│                                                                             │
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
  postgres: # System database (port 3303)
  redis: # Job queue + rate limiting (port 3302)
  api: # REST API + processors (port 3300)
  web: # Frontend (port 3030)
```

### Kubernetes (Production)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KUBERNETES CLUSTER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Namespace: emailops                                                        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Deployment  │  │ Deployment  │  │ StatefulSet │                          │
│  │ api         │  │ web         │  │ redis       │                          │
│  │ replicas: 3 │  │ replicas: 2 │  │ replicas: 1 │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│         │                │                │                                 │
│         └────────────────┼────────────────┘                                 │
│                          │                                                  │
│                          ▼                                                  │
│                   ┌─────────────┐  ┌─────────────┐                          │
│                   │ Service     │  │ Ingress     │                          │
│                   │ ClusterIP   │  │ nginx       │                          │
│                   └─────────────┘  └─────────────┘                          │
│                                                                             │
│  External:                                                                  │
│  ├── PostgreSQL (managed: RDS, Cloud SQL, etc.)                             │
│  └── Redis (managed: ElastiCache, Memorystore, etc.)                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Considerations

| Component  | Scaling Strategy                                     |
| ---------- | ---------------------------------------------------- |
| API        | Horizontal (stateless, competing consumers for jobs) |
| Web        | Horizontal (stateless)                               |
| Redis      | Vertical (single instance sufficient for most)       |
| PostgreSQL | Vertical + read replicas                             |

---

## Security Model

### Credential Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CREDENTIAL FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User enters credentials (AWS keys, DB password)                         │
│                           │                                                 │
│                           ▼                                                 │
│  2. API encrypts with AES-256-CBC                                           │
│     ├── Key derived from ENCRYPTION_SECRET env var                          │
│     └── Unique IV per encryption                                            │
│                           │                                                 │
│                           ▼                                                 │
│  3. Stored in database as: { encrypted: "iv:ciphertext" }                   │
│                           │                                                 │
│                           ▼                                                 │
│  4. Decrypted on-demand for each job                                        │
│     ├── Credentials never cached in memory                                  │
│     └── Credentials never logged                                            │
│                           │                                                 │
│                           ▼                                                 │
│  5. API responses sanitize credentials                                      │
│     └── Returns: { type: "POSTGRES", name: "...", config: "[REDACTED]" }    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Access Control

| Resource          | Access Pattern                     |
| ----------------- | ---------------------------------- |
| Customer Database | Read-only via Query Governor       |
| Email Provider    | Send-only via configured connector |
| System Database   | Full access (internal only)        |
| API               | Authenticated via session/token    |

---

## Monitoring & Observability

### Key Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            METRICS DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DELIVERY METRICS                                                           │
│  ├── emails_sent_total (counter)                                            │
│  ├── emails_delivered_total (counter)                                       │
│  ├── emails_bounced_total (counter, by type: hard/soft)                     │
│  ├── emails_complained_total (counter)                                      │
│  └── delivery_latency_seconds (histogram)                                   │
│                                                                             │
│  QUEUE METRICS                                                              │
│  ├── queue_depth (gauge, by queue)                                          │
│  ├── job_processing_time_seconds (histogram)                                │
│  └── job_failures_total (counter, by queue)                                 │
│                                                                             │
│  COLLISION METRICS                                                          │
│  ├── recipients_skipped_total (counter, by reason)                          │
│  │   └── reasons: collision:already_sent, collision:lower_priority          │
│  └── collision_checks_total (counter)                                       │
│                                                                             │
│  QUERY METRICS                                                              │
│  ├── segment_query_duration_seconds (histogram)                             │
│  ├── segment_query_rows_total (counter)                                     │
│  └── segment_query_errors_total (counter)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### RESTful Endpoints

```
Campaign Groups
POST   /campaign-groups
GET    /campaign-groups
GET    /campaign-groups/:id
PATCH  /campaign-groups/:id
DELETE /campaign-groups/:id

Single Sends (Campaigns)
POST   /single-sends
GET    /single-sends
GET    /single-sends/:id
PATCH  /single-sends/:id
DELETE /single-sends/:id
POST   /single-sends/:id/trigger
GET    /single-sends/:id/runs
GET    /single-sends/:id/runs/:runId

Segments
POST   /segments
GET    /segments
GET    /segments/:id
PATCH  /segments/:id
DELETE /segments/:id
POST   /segments/:id/dry-run

Templates
POST   /templates
GET    /templates
GET    /templates/:id
PATCH  /templates/:id
DELETE /templates/:id
POST   /templates/:id/versions
PATCH  /templates/:id/versions/:versionId/publish

Components
POST   /components
GET    /components
GET    /components/:id
PATCH  /components/:id
DELETE /components/:id
POST   /components/:id/preview

Connectors
POST   /data-connectors
GET    /data-connectors
POST   /data-connectors/test-connection
POST   /email-connectors
GET    /email-connectors
POST   /email-connectors/test-connection

Suppressions
GET    /suppressions
POST   /suppressions
DELETE /suppressions/:id

Analytics
GET    /analytics/overview
GET    /analytics/campaigns/:id
GET    /analytics/daily
```

---

## Technology Stack Summary

| Layer           | Technology            | Version   |
| --------------- | --------------------- | --------- |
| Frontend        | Next.js               | 15.x      |
| Frontend        | React                 | 19.x      |
| Frontend        | Tailwind CSS          | 4.x       |
| Backend         | NestJS                | 11.x      |
| Backend         | TypeScript            | 5.x       |
| Database        | PostgreSQL            | 15+       |
| Queue           | Redis + BullMQ        | 7.x / 5.x |
| ORM             | Prisma                | 7.x       |
| Email           | AWS SES v2            | -         |
| Email           | MJML                  | 4.x       |
| Templating      | Handlebars            | 4.x       |
| Testing         | Jest + Testcontainers | 30.x      |
| Package Manager | pnpm                  | 9.x       |
| Monorepo        | Turborepo             | 2.x       |
