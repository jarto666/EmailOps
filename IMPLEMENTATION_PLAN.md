# Implementation Plan: EmailOps

> Version 2.0 — Refactored with Collision Engine, Component Library, and Modern UI
> See also: [ARCHITECTURE.md](./ARCHITECTURE.md) | [BUSINESS.md](./BUSINESS.md) | [SPEC.md](./SPEC.md)

---

## Overview

This plan implements a **SQL-first email orchestration platform** with these key differentiators:

1. **Zero-ETL**: Direct database queries, no sync required
2. **Collision Engine**: Priority-based deduplication across campaign groups
3. **Component Library**: Reusable email building blocks
4. **Modern UI**: Dark theme, beautiful design, "wow effect"

---

## Phase 1: Foundation & Schema (Backend)

### 1.1 Database Schema Updates

**File**: `packages/core/prisma/schema.prisma`

- [x] Core entities (Workspace, Template, Segment, SingleSend, etc.)
- [ ] **NEW**: Add `CampaignGroup` model
  ```prisma
  model CampaignGroup {
    id               String          @id @default(cuid())
    name             String
    description      String?
    collisionWindow  Int             @default(86400)  // seconds
    collisionPolicy  CollisionPolicy @default(HIGHEST_PRIORITY_WINS)
    createdAt        DateTime        @default(now())
    updatedAt        DateTime        @updatedAt
    singleSends      SingleSend[]
    sendLogs         SendLog[]
  }

  enum CollisionPolicy {
    HIGHEST_PRIORITY_WINS
    FIRST_QUEUED_WINS
    SEND_ALL
  }
  ```

- [ ] **NEW**: Add `SendLog` model for collision tracking
  ```prisma
  model SendLog {
    id              String        @id @default(cuid())
    subjectId       String
    campaignGroupId String
    campaignGroup   CampaignGroup @relation(...)
    singleSendId    String
    singleSend      SingleSend    @relation(...)
    sentAt          DateTime      @default(now())

    @@index([subjectId, campaignGroupId, sentAt])
  }
  ```

- [ ] **NEW**: Add `Component` model for component library
  ```prisma
  model Component {
    id          String        @id @default(cuid())
    name        String        @unique
    description String?
    type        ComponentType
    contentType ContentType   @default(MJML)
    content     String
    variables   Json          @default("[]")
    previewHtml String?
    createdAt   DateTime      @default(now())
    updatedAt   DateTime      @updatedAt
  }

  enum ComponentType {
    HEADER
    FOOTER
    BUTTON
    CARD
    DIVIDER
    SNIPPET
  }

  enum ContentType {
    MJML
    HTML
  }
  ```

- [ ] **MODIFY**: Update `SingleSend` with campaign group and priority
  ```prisma
  model SingleSend {
    // ... existing fields
    campaignGroupId  String?
    campaignGroup    CampaignGroup? @relation(...)
    priority         Int            @default(100)
    sendLogs         SendLog[]
  }
  ```

- [ ] **REMOVE**: Multi-workspace complexity (commit to single-tenant)

### 1.2 Shared Services

**File**: `packages/core/src/`

- [x] `EncryptionService` — AES-256-CBC for credentials
- [x] `Logger` — Structured logging
- [ ] **NEW**: `CollisionService` — Collision detection logic

---

## Phase 2: Campaign Groups & Collision Engine

### 2.1 Campaign Groups API

**Files**: `apps/api/src/campaign-groups/`

- [ ] `campaign-groups.controller.ts`
  - `POST /api/campaign-groups` — Create group
  - `GET /api/campaign-groups` — List groups
  - `GET /api/campaign-groups/:id` — Get group with stats
  - `PATCH /api/campaign-groups/:id` — Update group
  - `DELETE /api/campaign-groups/:id` — Delete group

- [ ] `campaign-groups.service.ts`
  - CRUD operations
  - Validation (unique name)
  - Stats aggregation (campaigns count, total sends)

- [ ] DTOs
  - `create-campaign-group.dto.ts`
  - `update-campaign-group.dto.ts`

### 2.2 Collision Engine Implementation

**File**: `apps/api/src/single-sends/collision.service.ts`

- [ ] `checkCollision(subjectId, campaignGroupId, windowSeconds)`
  - Query SendLog for recent sends
  - Return collision status and reason

- [ ] `checkPriorityCollision(subjectId, campaignGroupId, priority)`
  - Check if user is queued for higher-priority campaign
  - Return collision status

**File**: `apps/worker/src/processors/segment.processor.ts`

- [ ] **MODIFY**: `buildAudienceSnapshot()`
  - After fetching recipients, apply collision filters
  - Track skip reasons: `collision:already_sent`, `collision:lower_priority`
  - Batch collision checks for performance

**File**: `apps/worker/src/processors/send.processor.ts`

- [ ] **MODIFY**: `sendEmail()`
  - Add send-time collision check (belt-and-suspenders)
  - Insert into SendLog after successful send
  - Update skip reason if collision detected

### 2.3 Update Single Sends

**File**: `apps/api/src/single-sends/`

- [ ] **MODIFY**: DTOs to include `campaignGroupId` and `priority`
- [ ] **MODIFY**: Service to validate campaign group relationship
- [ ] **MODIFY**: Controller to support filtering by campaign group

---

## Phase 3: Component Library

### 3.1 Components API

**Files**: `apps/api/src/components/`

- [ ] `components.controller.ts`
  - `POST /api/components` — Create component
  - `GET /api/components` — List components
  - `GET /api/components/:id` — Get component
  - `PATCH /api/components/:id` — Update component
  - `DELETE /api/components/:id` — Delete component
  - `POST /api/components/:id/preview` — Render preview

- [ ] `components.service.ts`
  - CRUD operations
  - Variable validation
  - Preview rendering (compile MJML → HTML)

### 3.2 Component Resolution in Templates

**File**: `packages/email/src/`

- [ ] **MODIFY**: `compiler.ts`
  - Register Handlebars partials from Component library
  - Support `{{> componentName }}` syntax
  - Pass variables to partials

- [ ] `components.ts`
  - Load all components from database
  - Register as Handlebars partials
  - Cache for performance

---

## Phase 4: Modern UI Design System

### 4.1 Design System Foundation

**Files**: `apps/web/components/ui/`

Create a comprehensive design system with dark theme:

- [ ] **Colors & Theme** (`theme.ts`)
  ```typescript
  const colors = {
    background: {
      primary: '#0a0a0f',    // Near black
      secondary: '#12121a',  // Card backgrounds
      tertiary: '#1a1a24',   // Elevated surfaces
    },
    accent: {
      primary: '#6366f1',    // Indigo
      secondary: '#8b5cf6',  // Purple
      success: '#10b981',    // Emerald
      warning: '#f59e0b',    // Amber
      danger: '#ef4444',     // Red
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
    },
    border: {
      default: '#1e293b',
      hover: '#334155',
    }
  }
  ```

- [ ] **Typography** — Inter font, size scale
- [ ] **Spacing** — 4px base unit
- [ ] **Shadows** — Subtle glow effects
- [ ] **Animations** — Smooth transitions

### 4.2 Core UI Components

- [ ] `button.tsx` — Primary, secondary, ghost, danger variants
- [ ] `input.tsx` — Text input with label, error states
- [ ] `select.tsx` — Dropdown with search
- [ ] `textarea.tsx` — Multi-line input
- [ ] `card.tsx` — Container with hover effects
- [ ] `badge.tsx` — Status indicators
- [ ] `table.tsx` — Data tables with sorting
- [ ] `modal.tsx` — Dialog overlays
- [ ] `tabs.tsx` — Tab navigation
- [ ] `toast.tsx` — Notifications
- [ ] `dropdown-menu.tsx` — Context menus
- [ ] `command.tsx` — Command palette (Cmd+K)
- [ ] `tooltip.tsx` — Hover tooltips
- [ ] `skeleton.tsx` — Loading states
- [ ] `empty-state.tsx` — No data placeholders

### 4.3 Chart Components

**Files**: `apps/web/components/charts/`

- [ ] `area-chart.tsx` — Send volume over time
- [ ] `bar-chart.tsx` — Campaign comparisons
- [ ] `donut-chart.tsx` — Delivery status breakdown
- [ ] `stat-card.tsx` — Metric display with trend

---

## Phase 5: Frontend Pages

### 5.1 Layout & Navigation

**File**: `apps/web/app/layout.tsx`

- [ ] Dark sidebar navigation with icons
- [ ] Command palette (Cmd+K) for quick navigation
- [ ] Breadcrumb navigation
- [ ] User menu

### 5.2 Dashboard

**File**: `apps/web/app/page.tsx`

- [ ] Hero stats cards (total sends, delivery rate, active campaigns)
- [ ] Send volume chart (last 30 days)
- [ ] Recent campaigns table
- [ ] Quick actions (new campaign, new segment, new template)
- [ ] System health indicator

### 5.3 Campaign Groups Page

**Files**: `apps/web/app/campaign-groups/`

- [ ] List view with collision policy badges
- [ ] Create/edit modal
- [ ] Group detail with associated campaigns
- [ ] Collision stats visualization

### 5.4 Campaigns (Single Sends) Page

**Files**: `apps/web/app/campaigns/`

- [ ] List view with status, last run, delivery stats
- [ ] Create wizard (template → segment → sender → schedule → review)
- [ ] Detail view with run history
- [ ] Run detail with recipient breakdown
- [ ] Trigger confirmation modal

### 5.5 Segments Page

**Files**: `apps/web/app/segments/`

- [ ] List view with query preview
- [ ] SQL editor with syntax highlighting (Monaco)
- [ ] Dry-run panel with count and sample data
- [ ] Query validation feedback

### 5.6 Templates Page

**Files**: `apps/web/app/templates/`

- [ ] List view with preview thumbnails
- [ ] Create/edit with mode selection (HTML, MJML, Builder)
- [ ] MJML editor with live preview
- [ ] Version history timeline
- [ ] Component insertion from library

### 5.7 Components Page

**Files**: `apps/web/app/components/`

- [ ] Gallery view with visual previews
- [ ] Create/edit component
- [ ] Variable configuration
- [ ] Usage tracking (which templates use this)

### 5.8 Connectors Page

**Files**: `apps/web/app/connectors/`

- [ ] Data connectors list with connection status
- [ ] Email connectors list
- [ ] Sender profiles management
- [ ] Test connection flow

### 5.9 Settings Page

**Files**: `apps/web/app/settings/`

- [ ] General settings
- [ ] Default rate limits
- [ ] Suppression list viewer
- [ ] System diagnostics

---

## Phase 6: Polish & Production Readiness

### 6.1 Error Handling & Validation

- [ ] Global error boundary
- [ ] Form validation with Zod
- [ ] API error responses
- [ ] Toast notifications for actions

### 6.2 Loading States

- [ ] Skeleton loaders for all pages
- [ ] Optimistic updates where appropriate
- [ ] Progress indicators for long operations

### 6.3 Testing

- [ ] API endpoint tests
- [ ] Collision engine unit tests
- [ ] Component rendering tests
- [ ] E2E flow tests (Playwright)

### 6.4 Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] SQL query examples
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

## File Structure Summary

```
email-ops/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── campaign-groups/     # NEW
│   │       ├── components/          # NEW
│   │       ├── single-sends/
│   │       │   └── collision.service.ts  # NEW
│   │       ├── segments/
│   │       ├── templates/
│   │       ├── connectors/
│   │       └── analytics/           # NEW
│   ├── worker/
│   │   └── src/processors/
│   │       ├── segment.processor.ts  # MODIFIED
│   │       └── send.processor.ts     # MODIFIED
│   └── web/
│       ├── app/
│       │   ├── layout.tsx           # REDESIGNED
│       │   ├── page.tsx             # REDESIGNED (Dashboard)
│       │   ├── campaign-groups/     # NEW
│       │   ├── campaigns/           # REDESIGNED
│       │   ├── segments/            # REDESIGNED
│       │   ├── templates/           # REDESIGNED
│       │   ├── components/          # NEW
│       │   ├── connectors/          # REDESIGNED
│       │   └── settings/            # NEW
│       └── components/
│           ├── ui/                  # NEW (Design System)
│           └── charts/              # NEW
├── packages/
│   ├── core/
│   │   └── prisma/
│   │       └── schema.prisma        # MODIFIED
│   └── email/
│       └── src/
│           └── components.ts        # NEW
├── ARCHITECTURE.md                  # NEW
├── BUSINESS.md                      # NEW
├── IMPLEMENTATION_PLAN.md           # THIS FILE
├── SPEC.md
└── README.md
```

---

## Implementation Order

### Week 1: Schema & Foundation
1. Update Prisma schema
2. Run migrations
3. Implement CampaignGroup API

### Week 2: Collision Engine
4. Implement collision service
5. Update segment processor
6. Update send processor
7. Add collision metrics

### Week 3: Component Library
8. Implement Component API
9. Update email compiler
10. Build component management UI

### Week 4: UI Design System
11. Create design tokens
12. Build core UI components
13. Implement dark theme

### Week 5-6: Frontend Pages
14. Dashboard
15. Campaign Groups
16. Campaigns (Single Sends)
17. Segments
18. Templates
19. Components
20. Connectors
21. Settings

### Week 7: Polish
22. Error handling
23. Loading states
24. Testing
25. Documentation

---

## Success Criteria

- [ ] All campaigns can be assigned to a campaign group
- [ ] Collision engine prevents duplicate sends within window
- [ ] Components can be reused across templates
- [ ] UI is visually impressive with dark theme
- [ ] Dashboard shows real-time analytics
- [ ] All CRUD operations work end-to-end
- [ ] No critical errors in production deployment
