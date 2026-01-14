# Implementation Plan: EmailOps Starter Kit

Based on `SPEC.md` and current project state (scaffolded modules, defined schema, empty logic).

## Phase 1: Foundation & Infrastructure (Backend)
- [ ] **Database & Prisma**: 
    - Verify `schema.prisma` covers all requirements (appears complete).
    - Ensure `packages/core` builds and exports `PrismaClient` correctly.
    - Run migrations to initialize the DB.
- [ ] **Shared Modules**:
    - Implement a `EncryptionService` in `packages/core` or `apps/api` for securely storing Connector config (credentials).
    - Set up a shared `Logger` configuration.

## Phase 2: Connectors (API + Data Access)
- [ ] **Connectors API (`apps/api/src/connectors`)**:
    - Implement `ConnectorsController`: CRUD for Connectors.
    - Implement `ConnectorsService`:
        - `testConnection(config)`: Verify credentials for Postgres/SES.
    - Implement `SenderProfilesController`: CRUD for sender identities (From Email).
- [ ] **Data Connector Logic**:
    - Implement a factory/adapter pattern for Data Connectors (`PostgresAdapter`, `BigQueryAdapter`).
    - **Security**: Ensure adapters allow *read-only* access (e.g. wrap transactions with `READ ONLY` or strictly parse SQL to forbid DML).

## Phase 3: Templates & Authoring (API + Frontend)
- [ ] **Templates API (`apps/api/src/templates`)**:
    - Implement `TemplatesController`: CRUD.
    - Implement `TemplateVersionsController`: Manage versions, publish.
    - **Rendering Service**:
        - `renderHtml(html, variables)`: Using Handlebars/Liquid.
        - `compileMjml(mjml)`: Compile MJML to HTML.
- [ ] **Templates Frontend (`apps/web/app/templates`)**:
    - List view.
    - **Editor**: Implement the 3 modes.
        - `Raw HTML`: CodeMirror/Monaco editor.
        - `Raw MJML`: Split view (Code + Live Preview).
        - **UI Builder**:
            - Integrate a drag-and-drop library (e.g., `dnd-kit` or a simplified block builder).
            - Implement serialization of blocks to JSON.
            - Client-side compilation of Blocks -> HTML/MJML for preview.

## Phase 4: Segments (Audience Definition)
- [ ] **Segments API (`apps/api/src/segments`)**:
    - CRUD for Segments.
    - `dryRun(segmentId)` endpoint: Triggers a limited query to preview data.
- [ ] **Segments Frontend**:
    - SQL Editor with schema browser (optional MVP).
    - "Run Preview" button displaying sample rows and count.

## Phase 5: Campaigns & Orchestration (The "Engine")
- [ ] **Campaigns API (`apps/api/src/campaigns`)**:
    - CRUD for Campaigns.
    - `trigger(campaignId)`: Manually start a campaign.
    - Scheduling logic (Cron integration using `BullMQ` repeatables or `@nestjs/schedule`).
- [ ] **Worker - Segment Processor (`apps/worker/.../segment.processor.ts`)**:
    - Implement `buildAudienceSnapshot`:
        - Fetch Segment SQL.
        - Execute against Data Connector.
        - Stream results into `RunRecipient` table (bulk inserts).
        - Handle duplicate filtering (idempotency).
- [ ] **Worker - Send Processor (`apps/worker/.../send.processor.ts`)**:
    - Listen for `sendEmail` jobs.
    - Fetch `SenderProfile` credentials.
    - Use `nodemailer` or AWS SDK to send.
    - **Rate Limiting**: Implement per-sender-profile rate limits (Redis-backed leaky bucket).
    - **Reliability**: Handle retries and backoff. Update `Send` and `RunRecipient` status.

## Phase 6: Transactional API & Webhooks
- [ ] **Transactional API (`apps/api/src/transactional`)**:
    - `POST /send`: Endpoint for engineering use.
    - Validate payload, render template, enqueue job directly to `SendProcessor`.
- [ ] **Webhooks (`apps/api/src/webhooks`)**:
    - Receivers for SES/Resend events (Delivery, Bounce, Complaint).
    - Update `Send` status.
    - **Suppression Logic**: On Hard Bounce/Complaint, add to `Suppression` table.

## Phase 7: UI Polish & Dashboard
- [ ] **Dashboard**: Show recent runs, failure rates, quick stats.
- [ ] **Campaign Monitor**: Live view of a running campaign (progress bar, real-time stats).
