# Roadmap: Big Matt's BBQ

## Milestones

- ✅ **v1.0 — Website Refresh & Frozen Drops** — Phases 1–5 (shipped 2026-04-22)
- ✅ **v1.1** — Phases 6–8 (complete)
- 📋 **v2.0 — SCA Tracker** — Phases 9–11 (planned)

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

---

### ✅ v1.1 (Complete)

#### Phase 6: Code Review Wave 1

**Goal:** Fix the four pre-drop issues from the code review before the next active drop opens.

**Issues addressed:**

- Issue 1 — `/api/test-seed` has no access control (🔴 Critical)
- Issue 2 — Capacity release logic duplicated 4× in checkout route (🔴 Critical)
- Issue 5 — `CheckoutClient` compares item ID to variation ID (🟠 High)
- Issue 8 — `confirmation/page.tsx` uses synchronous `searchParams` (🟡 Medium)

**Files in scope:** `app/api/test-seed/route.ts`, `app/api/checkout/route.ts`, `components/CheckoutClient.tsx`, `app/confirmation/page.tsx`

**Plans:** 3 plans

Plans:

- [x] 06-01-PLAN.md — Add sandbox guard to /api/test-seed (Issue 1)
- [x] 06-02-PLAN.md — Extract releaseReserved helper in checkout route, parallelize via allSettled (Issue 2)
- [x] 06-03-PLAN.md — Remove dead branch in CheckoutClient sauceVariationIds + async searchParams in confirmation page (Issues 5 & 8)

---

#### Phase 7: Code Review Wave 2

**Goal:** Fix the four correctness and safety issues from Wave 2 of the code review — nested `<main>` regression, stale-closure risk in CartContext, UNSUBSCRIBE_SECRET coupling, and runaway polling in useActiveDrop.

**Issues addressed:**

- Issue 3 — Nested `<main>` elements on checkout/confirmation/orders pages (🟠 High)
- Issue 4 — `CartContext` `useMemo` has incomplete dependency array (🟠 High)
- Issue 7 — `UNSUBSCRIBE_SECRET` falls back to `BROADCAST_SECRET` (🟡 Medium)
- Issue 12 — `useActiveDrop` polls indefinitely even when drop is inactive (🟡 Medium)

**Files in scope:** `app/layout.tsx`, `app/checkout/page.tsx`, `app/confirmation/page.tsx`, `app/orders/page.tsx`, `components/cart/CartContext.tsx`, `lib/unsubscribeToken.ts`, `.env.example`, `components/hooks/useActiveDrop.ts`

**Plans:** 4/4 plans complete

Plans:

- [x] 07-01-PLAN.md — Replace `<main>` wrapper in app/layout.tsx with `<div id="page-content">` (Issue 3)
- [x] 07-02-PLAN.md — Wrap CartContext callbacks in useCallback and complete useMemo dep array (Issue 4)
- [x] 07-03-PLAN.md — Decouple UNSUBSCRIBE_SECRET from BROADCAST_SECRET fallback + .env.example docs (Issue 7)
- [x] 07-04-PLAN.md — Stop useActiveDrop polling when drop is null/closed/inactive (Issue 12)

---

#### Phase 8: Mailing List & Email Platform

**Goal:** Migrate the mailing list from Supabase to Resend Contacts as the source of truth, upgrade the broadcast from a sequential per-subscriber loop to Resend's native single-call Broadcasts API, convert the drop-notification email to a React Email component, and remove the custom JWT unsubscribe flow in favor of Resend's native List-Unsubscribe handling. (MAIL-01 remains deferred — explicitly out of scope for this phase per CONTEXT.md.)

**Issues addressed:**

- Broadcast scalability — sequential `for` loop in `/api/admin/broadcast` doesn't scale beyond a handful of subscribers (D-05)
- Subscriber management — Supabase-only list with no platform-level bounce/unsubscribe handling (D-01, D-03)
- Custom JWT unsubscribe surface — replaced by Resend native List-Unsubscribe (D-09, D-10, D-11)
- Email template fragility — raw HTML + sanitize-html replaced by structured React Email components (D-07, D-08, D-13)

**Files in scope:** `package.json`, `package-lock.json`, `.env.example`, `lib/env.ts`, `app/api/mailing-list/route.ts`, `app/api/admin/broadcast/route.ts` (renamed to `route.tsx`), `emails/DropNotificationEmail.tsx` (NEW), `tests/mailingList.test.ts`, `tests/broadcast.test.ts`. **Deletions:** `lib/unsubscribeToken.ts`, `tests/unsubscribeToken.test.ts`, `app/api/unsubscribe/route.ts`, `app/unsubscribe/page.tsx`.

**Plans:** 3 plans

Plans:

- [x] 08-01-PLAN.md — Wave 1: install React Email, uninstall jose/sanitize-html, delete unsubscribe surface, add `getResendEnv()` helper, update `.env.example` (D-04, D-09, D-10, D-11, D-12, D-13)
- [x] 08-02-PLAN.md — Wave 1: create `emails/DropNotificationEmail.tsx` React Email component (D-07, D-08)
- [x] 08-03-PLAN.md — Wave 2: rewrite `app/api/mailing-list/route.ts` for Resend Contacts, rename + rewrite broadcast route as `route.tsx` calling `resend.broadcasts.create`, rewrite both test files (D-03, D-05, D-06)

---

---

### 📋 v2.0 — SCA Tracker (Planned)

**Milestone Goal:** Ship a read-only, production-quality SCA (Steak Cookoff Association) competition tracker at `sca.bigmattsbbq.com`, sharing this repo, Vercel project, and Big Matt's BBQ visual design system with the storefront, reading live data from the existing Supabase `sca` schema via server-side service-role access. No new auth, no write/create/edit/delete flows this milestone.

- [x] **Phase 9: Foundation & Subdomain Routing** - Service-role Supabase access to the `sca` schema, generated types, host-based subdomain routing, shared derived-score utility, and on-brand shell for `app/sca` (completed 2026-08-23)
- [ ] **Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail** - Dashboard summary/comparison/insights, competition list/detail, and cook detail pages sharing one comparison table module
- [ ] **Phase 11: Analytics & AI Reviews** - Score/gap/category trend views plus AI appearance review list and detail pages

#### Phase 9: Foundation & Subdomain Routing

**Goal**: The app is technically ready to serve a live, secure, on-brand SCA subdomain reading real data from Supabase.
**Depends on**: Nothing (first phase of v2.0)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):

  1. Requests to `sca.bigmattsbbq.com` are routed via host-based routing (`proxy.ts` — Next.js 16 renamed `middleware.ts`) into the `app/sca` path segment, without changing any existing bigmattsbbq.com route or behavior
  2. Server-side code can query the `sca` schema using generated TypeScript types (`lib/database-sca.types.ts`, kept separate from the storefront's `public` types per D-06) and a service-role Supabase client that is never bundled into browser JS
  3. A single shared lib function computes `distance_from_winning` and `distance_from_perfect` for reuse by every SCA page, with no duplicated derivation logic
  4. Any page rendered under `app/sca` visually matches the site's existing ember/smoke theme, fonts, and card/shadow conventions rather than introducing a new visual system
  5. Project documentation lists the exact remaining manual DNS steps at Hostinger needed to complete the subdomain cutover

**Plans**: 7 plans in 4 waves

Plans:

- [x] 09-01-PLAN.md — Expose the `sca` schema to PostgREST (confirmed PGRST106 blocker) and add a `npm run check:sca` preflight
- [x] 09-02-PLAN.md — Host-based routing: `proxy.ts` rewrite, pure routing resolver, root-layout chrome suppression, `SCA_HOSTNAME`
- [x] 09-03-PLAN.md — Generate `lib/database-sca.types.ts` and build the server-only sca-scoped service-role client
- [x] 09-04-PLAN.md — Vercel + Hostinger subdomain activation checklist (documentation only, cutover NOT performed)
- [x] 09-05-PLAN.md — `deriveScoreMetrics()` shared derived-score utility with real-row type compatibility
- [x] 09-06-PLAN.md — SCA shell (`ScaNavBar`, `ScaFooter`, `app/sca/layout.tsx`) plus `/sca` index page with a live sca-schema read
- [x] 09-07-PLAN.md — Human verification of the SCA shell and storefront non-regression

**UI hint**: yes

#### Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail

**Goal**: A chef/spectator can browse Big Matt's full SCA competition history — dashboard overview, competition list/detail, and individual cook detail — with side-by-side comparisons throughout.
**Depends on**: Phase 9
**Requirements**: DASH-01, DASH-02, DASH-03, COMP-01, COMP-02, COMP-03, COOK-01, COOK-02
**Success Criteria** (what must be TRUE):

  1. User can view Dashboard summary cards for latest cooks, best cook, worst cook, average total score, and average gap to first
  2. User can view a Dashboard comparison table with named-cook columns plus Worst Cook, Best Cook, and Cook Averages aggregate columns, with rows for Competition, Cook, Cook Placement, each judging category, Total Score, Distance From Winning, and Distance From Perfect Score
  3. User can view a data-driven "what stands out" summary on the Dashboard reflecting real score data (e.g. biggest score swing, closest gap to first, most recent placement change), not static copy
  4. User can view a list of competitions ordered by event date with city/state/organizer, open a competition detail page showing event metadata and every cook entered, and compare all cooks in that competition side-by-side using the same comparison table module as the Dashboard
  5. User can open a single cook's detail page showing its competition, steak label, process variables, full score breakdown, and any AI review history for that cook

**Plans**: 9 plans in 5 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Shared SCA view-model contracts (`lib/sca/types.ts`) and display formatters (em-dash rule, cook column label, date formatting)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — Aggregates (best/worst/average, empty-set safe) and the three DASH-03 insights
- [x] 10-03-PLAN.md — Shared comparison-table model builder (D-01) and Cook Detail process-field selection
- [x] 10-04-PLAN.md — Server-only query layer (`lib/sca/queries.ts`) plus `parseScaId` route-id validation

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 10-05-PLAN.md — `ComparisonTable`, `SummaryCards`, and `WhatStandsOut` Server Components

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 10-06-PLAN.md — Dashboard rewrite of `/sca` (DASH-01/02/03) and the Competitions nav entry (D-11)
- [ ] 10-07-PLAN.md — Competitions list and competition detail pages (COMP-01/02/03)
- [ ] 10-08-PLAN.md — Cook detail page (COOK-01/02) and the on-brand SCA 404

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 10-09-PLAN.md — Phase gate plus human verification against live data

#### Phase 11: Analytics & AI Reviews

**Goal**: A chef/spectator can see how Big Matt's scores trend over time and browse the AI-generated appearance reviews tied to each cook.
**Depends on**: Phase 9, Phase 10
**Requirements**: ANLY-01, ANLY-02, ANLY-03, AIRV-01, AIRV-02
**Success Criteria** (what must be TRUE):

  1. User can view a trend of total score over time across cooks
  2. User can view a trend of gap-to-first (`distance_from_winning`) over time
  3. User can view trends for key judging categories (appearance, doneness, texture, taste, overall impression) over time
  4. User can view a list of all stored AI appearance reviews across cooks
  5. User can open a single AI review's detail (model, review type, prompt if present, full comments) linked back to its cook and competition

**Plans**: TBD
**UI hint**: yes

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
| 10. Core Browsing — Dashboard, Competitions & Cook Detail | v2.0 | 4/9 | In Progress|  |
| 11. Analytics & AI Reviews | v2.0 | 0/TBD | Not started | - |

---
*Last updated: 2026-08-24 — Phase 10 planned (9 plans across 5 waves)*
