# EmailOps Business Overview

> A SQL-first email orchestration platform for data-mature companies

---

## Executive Summary

EmailOps addresses a significant gap in the email infrastructure market: **companies with 500K-20M users in their database** who need sophisticated email orchestration but don't want to:
- Pay $200K+/year for enterprise CDPs (Braze, Iterable)
- Sync their entire user base to external platforms
- Build and maintain custom internal tooling

### The Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE EMAIL INFRASTRUCTURE DILEMMA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Growing companies face a terrible choice:                                   │
│                                                                              │
│  ┌───────────────────┐                                                       │
│  │ Enterprise CDP    │ → $200K-$1M+/year                                    │
│  │ (Braze, Iterable) │ → Complex integration                                │
│  │                   │ → Data sync requirements                             │
│  └───────────────────┘                                                       │
│                                                                              │
│  ┌───────────────────┐                                                       │
│  │ Email Service     │ → Not designed for direct DB queries                 │
│  │ (Sendgrid, etc.)  │ → Requires contact list sync                         │
│  │                   │ → Limited segmentation                               │
│  └───────────────────┘                                                       │
│                                                                              │
│  ┌───────────────────┐                                                       │
│  │ Build Custom      │ → 6-12 month project                                 │
│  │                   │ → Ongoing maintenance                                │
│  │                   │ → Engineering opportunity cost                       │
│  └───────────────────┘                                                       │
│                                                                              │
│  ┌───────────────────┐                                                       │
│  │ Open Source       │ → Legacy tech (PHP, Ruby)                            │
│  │ (Mautic, Postal)  │ → No direct DB connectors                            │
│  │                   │ → Poor UX                                            │
│  └───────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Solution

EmailOps is **the SQL-first email orchestration layer** that connects directly to your existing data infrastructure:

- **Zero ETL**: Query your Postgres/BigQuery directly
- **SQL-powered**: Full SQL for audience segmentation
- **Self-hosted**: Your infrastructure, your data
- **Collision-aware**: Built-in email fatigue prevention

---

## Market Analysis

### Target Market

| Segment | Company Size | Annual Revenue | Pain Point |
|---------|--------------|----------------|------------|
| **Primary** | 100-500 employees | $10M-$100M ARR | Outgrowing Mailchimp, can't afford Braze |
| **Secondary** | 500-2000 employees | $100M-$500M ARR | Building internal tools, need faster solution |
| **Tertiary** | 50-100 employees | $5M-$20M ARR | Technical teams who want SQL control |

### Ideal Customer Profile

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IDEAL CUSTOMER PROFILE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COMPANY CHARACTERISTICS                                                     │
│  ├── 500K - 20M users in database                                           │
│  ├── Engineering team uses modern data stack (dbt, Airflow, etc.)           │
│  ├── Product/Growth team needs campaign autonomy                            │
│  └── Values data ownership and control                                      │
│                                                                              │
│  TECHNICAL ENVIRONMENT                                                       │
│  ├── PostgreSQL or BigQuery as primary data warehouse                       │
│  ├── Kubernetes or Docker-based infrastructure                              │
│  ├── AWS or GCP cloud environment                                           │
│  └── Existing SES or Resend account                                         │
│                                                                              │
│  BUYING TRIGGERS                                                             │
│  ├── "We pay $X0K/year to Braze but only use 10% of features"              │
│  ├── "Our marketing team is blocked waiting for engineering"                │
│  ├── "We need to segment based on product data, not just email behavior"    │
│  └── "Syncing contacts to our ESP is always out of date"                   │
│                                                                              │
│  DECISION MAKERS                                                             │
│  ├── Growth Engineering Lead                                                │
│  ├── Marketing Operations Manager                                           │
│  ├── Head of Data Engineering                                               │
│  └── VP Engineering (final approval)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| **Braze** | Full CDP, sophisticated journeys | $200K+ minimum, complex integration | 10x cheaper, faster setup |
| **Iterable** | Strong automation | Expensive, requires data sync | Direct DB access |
| **Customer.io** | Developer-friendly | Still requires contact sync | SQL-native |
| **Sendgrid** | High deliverability | No real segmentation | Full SQL queries |
| **Mautic** | Open source, free | Legacy PHP, poor UX | Modern stack, great UX |
| **Internal tools** | Fully customized | 6-12 months to build | Ready in days |

---

## Value Proposition

### For Growth/Marketing Teams

> "Launch campaigns in minutes, not sprints"

- Write SQL once, run campaigns forever
- Preview audiences before sending
- No engineering tickets for new segments
- Built-in collision prevention

### For Engineering Teams

> "Stop building email infrastructure"

- Self-hosted: runs in your k8s cluster
- Direct DB access: no sync pipelines to maintain
- Secure: read-only queries, encrypted credentials
- Extensible: add custom connectors as needed

### For Finance/Leadership

> "Enterprise capability at 10% the cost"

- No per-contact pricing
- No data sync costs
- Leverage existing SES/Resend pricing
- Full data ownership

---

## Positioning Statement

### Short Version
> EmailOps is the SQL-first email orchestration layer for data-driven companies.

### Full Version
> For growth and marketing teams at data-mature companies who need to run sophisticated email campaigns, EmailOps is a self-hosted orchestration platform that enables SQL-powered segmentation directly against your existing database. Unlike enterprise CDPs that require expensive contracts and complex data syncs, EmailOps connects to your Postgres or BigQuery in minutes and lets your team launch campaigns the same day.

### Taglines

| Context | Tagline |
|---------|---------|
| Homepage | "Query. Send. Done." |
| Technical | "SQL-first email orchestration" |
| Business | "Enterprise email ops without the enterprise price" |
| Comparison | "The Braze alternative for data-native teams" |

---

## Business Model

### Revenue Streams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REVENUE MODEL                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIER 1: COMMUNITY (Free)                                                    │
│  ├── Full self-hosted deployment                                            │
│  ├── Community support (GitHub, Discord)                                    │
│  ├── Core features: segments, templates, single sends                       │
│  └── Goal: Adoption, feedback, community building                           │
│                                                                              │
│  TIER 2: PRO ($500-2,000/month)                                             │
│  ├── Managed cloud hosting                                                  │
│  ├── Email support (48h SLA)                                                │
│  ├── Up to 500K sends/month                                                 │
│  ├── Automatic updates                                                      │
│  └── Goal: SMB revenue, low-touch sales                                     │
│                                                                              │
│  TIER 3: ENTERPRISE ($2,500-10,000/month)                                   │
│  ├── Self-hosted or managed                                                 │
│  ├── Priority support (4h SLA)                                              │
│  ├── Unlimited sends                                                        │
│  ├── SSO/SAML integration                                                   │
│  ├── Custom connectors                                                      │
│  ├── Dedicated success manager                                              │
│  └── Goal: High ACV, expansion revenue                                      │
│                                                                              │
│  TIER 4: ENTERPRISE+ (Custom pricing)                                       │
│  ├── On-premise deployment support                                          │
│  ├── Custom SLAs                                                            │
│  ├── Professional services                                                  │
│  └── Goal: Large enterprise, compliance-heavy industries                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Unit Economics

| Metric | Target |
|--------|--------|
| CAC (Community → Pro) | $500 |
| CAC (Direct → Enterprise) | $5,000 |
| Average Contract Value (Pro) | $12,000/year |
| Average Contract Value (Enterprise) | $60,000/year |
| Gross Margin | 80%+ |
| Payback Period | < 6 months |

---

## Go-to-Market Strategy

### Phase 1: Foundation (Months 1-3)

**Goal**: Validate product-market fit with design partners

- Deploy internally (your company as first customer)
- Recruit 3-5 design partners (free access for feedback)
- Iterate rapidly on core features
- Build case studies and testimonials

### Phase 2: Community Launch (Months 4-6)

**Goal**: Build awareness and adoption in developer community

- Open source release (Apache 2.0 or similar)
- Launch on Hacker News, Product Hunt, Reddit
- Developer content marketing (blog posts, tutorials)
- Discord community for support

### Phase 3: Commercialization (Months 7-12)

**Goal**: Generate revenue from managed hosting and enterprise

- Launch managed cloud offering
- Implement billing and self-serve signup
- Sales outreach to high-value prospects
- Partner with consultancies and agencies

---

## Key Metrics

### Product Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Time to First Campaign | Minutes from signup to first send | < 30 minutes |
| Campaigns per Week | Active usage indicator | 5+ per active org |
| Segment Query Time | Performance indicator | < 5 seconds |
| Delivery Rate | Email deliverability | > 98% |

### Business Metrics

| Metric | Definition | Target (Year 1) |
|--------|------------|-----------------|
| GitHub Stars | Community interest | 2,000+ |
| Active Deployments | Usage tracking | 500+ |
| MRR | Monthly recurring revenue | $50K |
| NPS | Customer satisfaction | 50+ |

---

## Risk Analysis

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Query performance on large datasets | Query governor with timeouts, EXPLAIN analysis |
| Email deliverability issues | User brings own SES/Resend reputation |
| Security vulnerabilities | Read-only connections, credential encryption, audit logging |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Low adoption | Strong open source community, developer marketing |
| Enterprise sales cycle too long | Focus on SMB first, build case studies |
| Competition from CDPs | Differentiate on simplicity and cost |

### Operational Risks

| Risk | Mitigation |
|------|------------|
| Support burden for self-hosted | Comprehensive documentation, community support |
| Infrastructure costs for managed | Efficient multi-tenant architecture |

---

## Roadmap

### MVP (Current)
- [x] Core infrastructure (Prisma, Redis, BullMQ)
- [x] Data connectors (Postgres, BigQuery)
- [x] Email connectors (SES)
- [x] Template system (HTML, MJML)
- [x] Segment editor with SQL validation
- [x] Single sends with scheduling
- [ ] Campaign groups with collision engine
- [ ] Component library
- [ ] Modern UI redesign

### V1.1 (Post-MVP)
- [ ] Webhook analytics (bounces, complaints, deliveries)
- [ ] Advanced rate limiting policies
- [ ] Template preview with sample data
- [ ] Segment audience export (CSV)

### V1.2
- [ ] Journey automation (multi-step sequences)
- [ ] Event ingestion API
- [ ] Transactional email API
- [ ] A/B testing

### V2.0
- [ ] UI Builder (drag-and-drop)
- [ ] Audience sync to ad platforms
- [ ] Multi-language templates
- [ ] Advanced analytics dashboard

---

## Team Requirements

### Initial Team (MVP → V1.0)

| Role | Responsibility |
|------|----------------|
| **Full-Stack Engineer** | Core platform development |
| **Product Designer** | UI/UX design, design system |

### Growth Team (V1.0 → Scale)

| Role | Responsibility |
|------|----------------|
| **DevRel / Developer Advocate** | Community, documentation, tutorials |
| **Solutions Engineer** | Enterprise sales support |
| **Customer Success** | Onboarding, retention |

---

## Success Criteria

### 6-Month Goals
- [ ] Internal deployment running in production
- [ ] 3+ external design partners using the platform
- [ ] 500+ GitHub stars
- [ ] First paying customer

### 12-Month Goals
- [ ] $50K MRR
- [ ] 100+ active deployments
- [ ] SOC 2 Type I (if pursuing enterprise)
- [ ] 2,000+ GitHub stars

---

## Appendix: Competitor Pricing Reference

| Vendor | Pricing Model | Entry Point | 1M Contacts |
|--------|---------------|-------------|-------------|
| Braze | Per MAU | $50K/year | $200K+/year |
| Iterable | Per profile | $30K/year | $150K+/year |
| Customer.io | Per profile | $150/month | $1,000+/month |
| Sendgrid | Per email | $20/month | $400+/month |
| **EmailOps** | Self-hosted free, managed flat | $0 | $500-2,000/month |

---

## Contact

For partnership inquiries, enterprise sales, or investment discussions, please contact the project maintainers.
