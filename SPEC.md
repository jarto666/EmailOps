# EmailOps Product Specification

> Version: 1.1 — Updated January 2026
> See also: [ARCHITECTURE.md](./ARCHITECTURE.md) | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

## Executive Summary

EmailOps is a self-hosted application that sits between:

- **Data sources** (Postgres, BigQuery) for audience selection and personalization
- **Email providers** (AWS SES, Resend, SMTP) for message delivery
- **Product/Marketing teams** for managing templates and campaigns via UI

It provides:

- SQL-driven segmentation with dry-run and sampling
- Snapshot-based campaign runs for deterministic audience and auditability
- Reliable send engine with queueing, rate limiting, retries, and dead-letter queue
- Collision engine to prevent email fatigue across campaign groups
- Suppression management for bounces, complaints, and unsubscribes
- Template authoring in 3 modes: Raw HTML, Raw MJML, and UI Builder
- Transactional sending API for engineers (planned)

---

## Core Concepts

### Workspace

A logical tenant boundary. Currently single-tenant only (one workspace per deployment).

### Workspace Settings

Per-workspace configuration controlling batch processing and system behavior:

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| `batchSize` | 10-1000 | 100 | Recipients per batch job |
| `rateLimitPerSecond` | 1-500 | 50 | Max emails sent per second |
| `collisionWindow` | 1hr-7days | 24hr | Default collision detection window |
| `queryTimeout` | 5-300s | 30s | SQL query timeout |

### Connectors

Runtime integrations for external systems:

- **Data Connector**: Executes SQL against a configured source (Postgres, BigQuery)
- **Email Connector**: Delivers emails via provider (SES, Resend, SMTP)
- **Webhook Handler**: Ingests delivery events from email providers

### Templates

A versioned email asset that includes:

- Subject line, from address, reply-to settings
- Body content in one of three authoring modes
- Variable placeholders for personalization

**Authoring Modes:**

| Mode | Description |
|------|-------------|
| `RAW_HTML` | User provides HTML directly |
| `RAW_MJML` | User provides MJML, compiled to HTML at publish time |
| `UI_BUILDER` | User builds email using blocks, stored as builder schema |

### Segments

A SQL definition that returns the audience and personalization variables for a campaign.

### Campaigns (Single Sends)

A campaign ties together:
- A segment (audience definition)
- A template (email content)
- A sender profile (from address)
- A campaign group (collision management)
- Priority and schedule settings

### Runs (Snapshot Runs)

Each campaign run creates an immutable snapshot of recipients and sends based on that snapshot. This ensures:
- Deterministic execution
- Full audit trail
- Reproducible results

### Campaign Groups

Groups of related campaigns that share collision detection. Prevents email fatigue by ensuring users don't receive too many emails from the same group within a time window.

### Suppressions

Records that prevent sending due to:
- Hard bounces (permanent delivery failures)
- Complaints (spam reports)
- Unsubscribes (user opt-out)

---

## User Personas

### Developer (Integrations Owner)

- Installs and configures the self-hosted application
- Sets up data connectors with database credentials
- Configures email connectors with provider credentials
- Integrates transactional API into product code

### PM / Marketer (Campaign Operator)

- Creates and edits email templates
- Writes or edits SQL segments
- Runs dry-runs to preview audience
- Schedules and executes campaigns
- Monitors delivery outcomes

---

## Primary Use Cases

1. **Create Lifecycle Campaign**: PM creates a campaign targeting users with specific criteria (e.g., "Low credits + refresh in 7 days") and runs it on a schedule.

2. **Preview and Validate Segment**: PM runs dry-run to see count, sample rows, and email preview before sending.

3. **Build Email Templates**: PM creates templates using raw HTML, MJML, or the visual builder with reusable components.

4. **Reliable Email Delivery**: System sends emails through configured provider with rate limiting, retries, and failure handling.

5. **Handle Suppressions**: Unsubscribe requests are honored; hard bounces and complaints automatically suppress future sends.

6. **Prevent Email Fatigue**: Campaign groups with collision detection ensure users don't receive too many emails.

---

## Segment Query Contract

### Required Output Columns

A segment query MUST return:

| Column | Type | Description |
|--------|------|-------------|
| `subject_id` | STRING | Stable user identifier for idempotency and audit |
| `email` | STRING | Recipient email address |
| `vars_json` | JSON/STRING | JSON object with template variables |

### Optional Output Columns

| Column | Type | Description |
|--------|------|-------------|
| `locale` | STRING | Recipient locale for localization |
| `timezone` | STRING | Recipient timezone for send-time optimization |

### Example Segment Query

```sql
SELECT
  u.id AS subject_id,
  u.email,
  JSON_BUILD_OBJECT(
    'firstName', u.first_name,
    'credits', u.credits,
    'lastLogin', u.last_login_at
  ) AS vars_json
FROM users u
WHERE u.credits < 20
  AND u.last_login_at > NOW() - INTERVAL '30 days'
  AND u.email_verified = true
```

---

## Campaign Run Lifecycle

### Run States

| State | Description |
|-------|-------------|
| `CREATED` | Run record created |
| `AUDIENCE_BUILDING` | Executing segment SQL and applying filters |
| `AUDIENCE_READY` | Recipients determined, ready to send |
| `SENDING` | Emails being delivered |
| `COMPLETED` | All sends finished |
| `FAILED` | Run failed with error |

### Execution Flow

1. **Trigger**: Campaign triggered manually or by schedule
2. **Build Audience**: Execute segment SQL, store recipients
3. **Apply Filters**: Check suppressions and collision rules
4. **Create Batches**: Group recipients into batches (size from settings)
5. **Queue Batch Jobs**: Enqueue batch jobs for parallel processing
6. **Process Batches**: Each batch delivers emails with rate limiting
7. **Finalize**: Auto-complete run when all batches finish

### Batch Processing

Recipients are grouped into batches based on `WorkspaceSettings.batchSize`:
- Default batch size: 100 recipients
- Example: 1,000 recipients → 10 batch jobs
- Each batch job processes sequentially with rate limiting
- Multiple batches can process in parallel (configurable concurrency)
- Run auto-completes when all batches report completion

---

## Template System

### Authoring Modes

#### RAW_HTML

- User provides HTML directly
- System injects standard elements (unsubscribe link, tracking pixels)
- Best for developers or imported templates

#### RAW_MJML

- User provides MJML (responsive email markup language)
- System compiles MJML to HTML at publish time
- Compilation errors shown in UI before publish

#### UI_BUILDER

- User builds email using drag-and-drop blocks
- Stored as builder schema (JSON)
- Compiled to HTML at publish time

### Builder Block Types

**Layout Blocks:**
- Section/Container
- Columns (1-column, 2-column)
- Spacer
- Divider

**Content Blocks:**
- Text (supports variables like `{{firstName}}`)
- Button (supports URL variables)
- Image (URL, alt text)
- HTML snippet (for advanced users)

### Component Library

Reusable email components for consistent branding:

| Type | Purpose |
|------|---------|
| `HEADER` | Logo, navigation |
| `FOOTER` | Unsubscribe link, social links, legal text |
| `BUTTON` | CTA buttons with brand styling |
| `CARD` | Content cards |
| `DIVIDER` | Visual separators |
| `SNIPPET` | Custom HTML/MJML blocks |

---

## Collision Policies

### HIGHEST_PRIORITY_WINS

Only the highest-priority campaign sends to each user within the collision window. Lower-priority campaigns are skipped.

### FIRST_QUEUED_WINS

The first campaign to queue a user wins. Subsequent campaigns in the same group are skipped.

### SEND_ALL

No collision handling. All campaigns send independently (opt-out of collision detection).

---

## Safety Guardrails

### SQL Validation

- Only SELECT/WITH statements allowed
- DDL (CREATE, ALTER, DROP) forbidden
- DML (INSERT, UPDATE, DELETE) forbidden
- Single statement only (no batches)

### Query Limits

- Dry-run: Automatic LIMIT injection
- Full-run: Configurable row limit (default: 1M)
- Statement timeout: Configurable via settings (5-300s, default: 30s)
- Read-only transaction mode

### Credential Security

- All credentials encrypted at rest (AES-256-CBC)
- Credentials decrypted only when needed
- Never logged or displayed in UI

---

## Deployment Requirements

### Self-Hosted

- Docker image for easy deployment
- Helm chart for Kubernetes (optional)

### Infrastructure Dependencies

- **PostgreSQL 15+**: System database for internal state
- **Redis 7+**: Job queue and rate limiting
- **Network access**: Outbound to data sources and email providers
- **HTTP ingress**: For UI and webhooks

---

## Future Roadmap

### Planned Features

- **Transactional Email API**: Send templated emails from code
- **Journey Automation**: Multi-step email sequences
- **A/B Testing**: Test subject lines and content variations
- **Advanced Analytics**: Click tracking, engagement metrics
- **Multi-workspace**: Support for multiple organizations
