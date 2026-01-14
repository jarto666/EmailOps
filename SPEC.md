# EmailOps Starter Kit (Self-Hosted) — Detailed MVP Specification

Version: 0.2 (updated: Templates = Raw + Builder)  
Author: (you)  
Target: Engineering + Product + Marketing stakeholders  
Primary Goal: Provide a self-hosted “Email Operations” platform that enables non-engineers (PMs/Marketers) to create, preview, and run lifecycle/marketing email campaigns driven by SQL segments, while engineers configure connectors and integrate transactional emails from code.  
Non-Goal: Replace an ESP end-to-end (no contact CRM, no omnichannel, no full marketing automation suite).

---

## 0) Executive Summary

EmailOps Starter Kit is a self-hosted application that sits between:

- **Data sources** (Postgres, BigQuery, etc.) for audience selection and personalization variables
- **Senders** (AWS SES, Resend, SMTP, etc.) for message delivery
- **Product/Marketing teams** for managing templates and campaigns via UI

It provides:

- SQL-driven segmentation (with dry-run and sampling)
- Snapshot-based campaign runs (deterministic audience and auditability)
- Reliable send engine (queueing, rate limiting, retries, idempotency, DLQ)
- Unsubscribe / suppression management
- Transactional sending API for engineers (template store + consistent policies)
- Basic analytics (delivery status, failures, skip reasons)
- **Email Template Authoring in 3 modes: Raw HTML, Raw MJML, and a UI Builder**

---

## 1) Core Concepts (Definitions)

### 1.1 Workspace

A logical tenant boundary. In MVP v1, you MAY support single-tenant only (one workspace). Multi-tenant is optional but recommended in schema design.

### 1.2 Connectors

Connectors are runtime integrations:

- **Data Connector**: executes SQL against a configured source (Postgres, BigQuery)
- **Sender Connector**: delivers emails (SES, Resend)
- **Event Connector**: ingests delivery events (SNS webhooks for SES, Resend webhooks)

### 1.3 Templates (IMPORTANT: Multiple Authoring Modes)

A template is a versioned asset that includes:

- subject/from/reply-to settings
- one or more localized variants
- variable placeholders
- an authoring mode (see §8)

Supported authoring modes:

- **RAW_HTML**: user provides HTML
- **RAW_MJML**: user provides MJML
- **UI_BUILDER**: user builds email using blocks/components in the UI, stored as a builder schema, compiled to HTML (and optionally MJML)

### 1.4 Segments

A segment is a SQL definition that returns the audience and personalization variables.

### 1.5 Campaigns

A campaign ties a segment + template + schedule + policies into a runnable unit.

### 1.6 Runs (Snapshot Runs)

Each campaign run creates an immutable snapshot of recipients (“Run Recipients”) and then sends based on that snapshot.

### 1.7 Policies

Rules that determine whether a recipient is eligible to receive:

- global frequency caps
- campaign-level frequency caps
- precedence rules (optional in MVP)
- suppression / unsubscribe rules

### 1.8 Suppression / Preferences

Suppressions prevent sending due to:

- hard bounces / complaints (global)
- unsubscribes (marketing scope)
  Preferences represent user opt-outs by category.

### 1.9 Transactional Sends

Engineers send email from code via API/SDK, using stored templates and the same event/suppression infrastructure.

---

## 2) Product Requirements

### 2.1 Personas

- **Developer (Integrations Owner)**: installs self-hosted app, configures connectors, provides access to DB and sender credentials, integrates transactional API.
- **PM / Marketer (Campaign Operator)**: creates templates (raw or builder), writes or edits SQL segments, runs dry runs, schedules/executes campaigns, monitors outcomes.

### 2.2 Primary Use Cases

1. PM creates a lifecycle campaign (e.g., “Low credits + refresh in 7 days”) and runs it daily.
2. PM previews and validates a segment via dry-run (count + sample rows + email preview).
3. PM builds or edits templates using either raw code or builder blocks, then publishes a version.
4. System sends emails reliably through SES with rate limiting and retries.
5. Unsubscribe requests are honored; hard bounce/complaint prevents future sends.
6. Engineers trigger transactional templates from product code (password reset, invoice, etc.).

---

## 3) MVP v1 Scope (Must-Haves)

### 3.1 Deployment

- Self-hosted Docker image
- Optional Helm chart
- Requires:
  - “System DB” (Postgres) for internal state
  - Outbound network access to data sources and sender APIs
  - HTTP ingress for UI and webhooks (SES SNS -> webhook)

### 3.2 Data Connectors (MVP)

- Postgres connector
- BigQuery connector

### 3.3 Sender Connectors (MVP)

- AWS SES (prefer API v2; SMTP acceptable)
  (Optional later: Resend)

### 3.4 UI Modules (MVP)

- Connector setup pages (data + sender)
- Template authoring:
  - Raw HTML editor
  - Raw MJML editor
  - **UI Builder (block-based)**
- Segment editor (SQL mode) + dry-run
- Campaign editor (segment + template + schedule + policies)
- Run history + run details (counts, send statuses)
- Suppression/Unsubscribe viewer

### 3.5 Reliability Features (MVP)

- Snapshot runs storing run recipients
- Send queue with backpressure
- Rate limiting per sender profile
- Retries with exponential backoff
- Dead-letter queue (DLQ)
- Idempotency guarantees (campaign sends and transactional sends)

### 3.6 Safety/Guardrails (MVP)

- SQL validation: allow SELECT only (no DDL/DML)
- Dry-run requires LIMIT; server-enforced
- Query timeout and max rows safeguards
- Masking of PII in UI samples (configurable)

---

## 4) “No Data Reorg Prereq” Principles

- The product MUST NOT require customers to restructure their DWH/ETL as a prerequisite.
- Segments operate on existing tables/views.
- The only requirement is that segment queries return a standardized output schema (§5).

---

## 5) Segment Query Contract

### 5.1 Required Output Columns

A segment query MUST output:

- `recipient_id` (STRING) — stable user identifier used for idempotency and audit
- `email` (STRING) — recipient email address
- `vars_json` (STRING or JSON) — JSON object with template variables

### 5.2 Optional Output Columns

- `locale` (STRING)
- `timezone` (STRING)
- `dedupe_key` (STRING) — overrides default dedupe on recipient_id

### 5.3 Parameterization

Segments MAY declare parameters:

- `now` (timestamp)
- `window_days` (int)
- `campaign_id` (string)
- `run_id` (string)

The system must bind parameters safely (no concatenated SQL).

---

## 6) Campaign Model

### 6.1 Campaign Fields

- id
- name
- description
- status: DRAFT | ACTIVE | PAUSED | ARCHIVED
- template_id (points to a published template version)
- segment_id
- schedule:
  - type: MANUAL | CRON
  - cron expression (if CRON)
- policies:
  - global_frequency_cap (e.g., N emails / 7 days)
  - campaign_frequency_cap (e.g., 1 / 14 days)
- sender_profile_id
- tags

---

## 7) Run Model (Snapshot Runs)

### 7.1 Run States

- CREATED
- AUDIENCE_BUILDING
- AUDIENCE_READY
- SENDING
- COMPLETED
- FAILED

### 7.2 Run Lifecycle

1. Create run
2. Execute segment SQL -> store recipients in `run_recipients`
3. Apply eligibility policies and suppressions (inline or at send time)
4. Enqueue send tasks
5. Send worker processes queue
6. Finalize run stats

---

## 8) Template System (Raw + Builder)

### 8.1 Template Authoring Modes

Each template version MUST have exactly one authoring mode:

1. **RAW_HTML**

   - `body_html` is provided directly by user
   - system can inject standardized elements (unsubscribe footer, tracking pixels optional)

2. **RAW_MJML**

   - `body_mjml` is provided directly by user
   - system compiles MJML -> HTML at publish time (preferred) or send time (fallback)
   - compilation errors must be surfaced in UI before publish

3. **UI_BUILDER (Block-based)**
   - user composes a layout using predefined blocks
   - system stores a **builder schema** (JSON)
   - system compiles builder schema -> HTML (and optionally MJML) at publish time

### 8.2 Builder Requirements (MVP)

The builder MUST support:

- **Layout blocks**:
  - Section/Container
  - Columns (2-column and 1-column)
  - Spacer
  - Divider
- **Content blocks**:
  - Text (supports variables)
  - Button (supports URL variables)
  - Image (URL, alt text)
  - HTML snippet (optional, gated)
- **Global styling**:
  - base font family, font sizes, colors
  - background color
  - content width
- **Per-block styling (basic)**:
  - padding/margins
  - alignment
  - button styles

The builder MUST produce responsive HTML that renders correctly in major clients (Gmail, Outlook, Apple Mail).
MVP can use a simplified compatibility target:

- produce table-based HTML or compile to MJML then to HTML.

### 8.3 Template Data Model

A template has:

- `template_key` (stable identifier, e.g., `low_credits_warning`)
- `category` (MARKETING | TRANSACTIONAL | BOTH)
- `default_locale` (optional)\_
