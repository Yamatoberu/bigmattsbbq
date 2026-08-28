# Roadmap: Big Matt's BBQ

## Milestones

- ✅ **v1.0 — Website Refresh & Frozen Drops** — Phases 1–5 (shipped 2026-04-22)
- ✅ **v1.1** — Phases 6–8 (complete)
- ✅ **v2.0 — SCA Tracker** — Phases 9–11 (shipped 2026-08-28)

---

## Phases

<details>
<summary>✅ v1.0 — Website Refresh & Frozen Drops (Phases 1–5) — SHIPPED 2026-04-22</summary>

- [x] Phase 1: Foundation (2/2 plans) — Supabase schema, RLS, atomic reservation RPCs
- [x] Phase 2: Drop Config & Storefront (5/5 plans) — database-driven drops, live pickup options, sold-out indicators
- [x] Phase 3: Capacity Enforcement (2/2 plans) — reserve_pickup_slot wired into checkout
- [x] Phase 4: Checkout & Email (2/2 plans) — deterministic idempotency, order persistence, mailing list opt-in
- [x] Phase 5: Content & Mailing List (8/8 plans) — NavBar, static pages, mailing list signup/unsubscribe/broadcast

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 (Phases 6–8) — COMPLETE</summary>

- [x] Phase 6: Code Review Wave 1 (3/3 plans) — sandbox guard on /api/test-seed, releaseReserved helper, checkout dead-branch/searchParams fixes
- [x] Phase 7: Code Review Wave 2 (4/4 plans) — nested `<main>` fix, CartContext dependency array, UNSUBSCRIBE_SECRET decoupling, useActiveDrop polling fix
- [x] Phase 8: Mailing List & Email Platform (3/3 plans) — Resend Contacts migration, native Broadcasts API, React Email templates, native List-Unsubscribe

</details>

<details>
<summary>✅ v2.0 — SCA Tracker (Phases 9–11) — SHIPPED 2026-08-28</summary>

- [x] Phase 9: Foundation & Subdomain Routing (7/7 plans) — service-role Supabase access to `sca` schema, generated types, host-based subdomain routing, shared derived-score utility, on-brand SCA shell (completed 2026-08-23)
- [x] Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail (12/12 plans) — dashboard summary/comparison/insights, competition list/detail, cook detail sharing one comparison table module; 2 human-UAT gaps (cook discoverability, competition aggregate scope) closed and re-verified (completed 2026-08-24)
- [x] Phase 11: Analytics & AI Reviews (5/5 plans) — score/gap/category trend views plus AI appearance review list and detail pages; mobile nav-overflow gap found and fixed during human verification (completed 2026-08-28)

Full archive: `.planning/milestones/v2.0-ROADMAP.md`
Requirements archive: `.planning/milestones/v2.0-REQUIREMENTS.md`
Milestone audit: `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

</details>

---

### 🗂️ Backlog (Future Milestones)

#### Catering Quote Form (v1.x candidate)

**Goal:** Add a contact form on the catering page so potential clients can submit inquiry details directly, triggering an email notification to the catering inbox.

**Feature areas:**

- Form fields: Name, Email, Date of Event, Time of Event, Event Location, Estimated Headcount, Potential Menu (text area)
- On submit: send email to catering@bigmattsbbq.com with all provided details
- Validation: required fields, proper email/date/time formats

---

---

#### Admin Dashboard (future candidate)

**Goal:** Replace the Google Sheet with an in-app admin screen for drop management, order management, and business KPIs.

**Feature areas:**

- Drop management — create/edit/close drops without touching the database directly
- Order management — view orders per drop, track fulfillment
- KPI report — number of orders, revenue, amount collected, AOV, return customer rate
- CRM lite — customer history across drops

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-04-04 |
| 2. Drop Config & Storefront | v1.0 | 5/5 | Complete | 2026-04-12 |
| 3. Capacity Enforcement | v1.0 | 2/2 | Complete | 2026-04-12 |
| 4. Checkout & Email | v1.0 | 2/2 | Complete | 2026-04-17 |
| 5. Content & Mailing List | v1.0 | 8/8 | Complete | 2026-04-22 |
| 6. Code Review Wave 1 | v1.1 | 3/3 | Complete | 2026-05-06 |
| 7. Code Review Wave 2 | v1.1 | 4/4 | Complete   | 2026-05-07 |
| 8. Mailing List & Email Platform | v1.1 | 3/3 | Complete | 2026-05-19 |
| 9. Foundation & Subdomain Routing | v2.0 | 7/7 | Complete   | 2026-08-23 |
| 10. Core Browsing — Dashboard, Competitions & Cook Detail | v2.0 | 12/12 | Complete    | 2026-08-24 |
| 11. Analytics & AI Reviews | v2.0 | 5/5 | Complete    | 2026-08-28 |

### Phase 12: Checkout Attribution Tracking

**Goal:** Add a customer-facing "How did you hear about us?" question to checkout, sourced from Supabase `public.attribution_sources`, persisted against the Square order via the most appropriate current Square API (researched first), never blocking a valid checkout
**Requirements**: TBD
**Depends on:** Phase 11
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 12 to break down)

---
*Last updated: 2026-08-28 — v2.0 SCA Tracker milestone shipped and archived*
