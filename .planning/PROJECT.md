# Big Matt's BBQ — Website Refresh & Frozen Drops

## Current State

**v1.0, v1.1, and v2.0 are all shipped.** No milestone is currently in progress — next milestone TBD via `/gsd:new-milestone`.

- **v1.0 (2026-04-22):** Database-driven storefront — Supabase-backed drops, atomic capacity enforcement, mailing list with broadcast.
- **v1.1 (2026-05-19):** Code review hardening + Resend Contacts/Broadcasts migration.
- **v2.0 SCA Tracker (2026-08-28):** Read-only SCA (Steak Cookoff Association) competition tracker at `/sca`, sharing this repo/Vercel project/design system with the storefront — Dashboard, Competitions, Cook Detail, Analytics trend charts, and AI Reviews, all reading live Supabase `sca` schema data via server-side service-role access. See `.planning/milestones/v2.0-ROADMAP.md` for full phase detail.

### Next Milestone Goals (candidates, not yet committed)

- Tech-debt cleanup pass: 10 Warning + 10 Info code-review findings across Phases 9–11 (0 Critical) — see `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
- Catering Quote Form and Admin Dashboard — both already scoped in ROADMAP.md's Backlog section
- Branded Resend confirmation email (MAIL-01, deferred since v1.0) and Square API version bump (approaching EOL)

<details>
<summary>Archived: v2.0 SCA Tracker scope (as planned, for historical reference)</summary>

**Goal:** Ship a read-only, production-quality SCA (Steak Cookoff Association) competition tracker at `sca.bigmattsbbq.com`, sharing this repo, Vercel project, and Big Matt's BBQ visual design system with the storefront, reading live data from the existing Supabase `sca` schema via server-side service-role access.

**Target features:**
- Dashboard: summary cards (latest/best/worst cook, average total score, average gap to first), a side-by-side comparison table, data-driven "what stands out" summaries
- Competitions: list by date, detail view with event metadata + all cooks, side-by-side comparison within an event
- Cook detail: competition, steak label, process variables, score breakdown, AI review history
- Analytics: read-only trend views (score over time, gap to first over time, key judging categories)
- AI Reviews: list + detail views for stored AI appearance reviews tied to cooks
- Host-based subdomain routing (`sca.bigmattsbbq.com`) within this same Next.js app/Vercel project
- Server-side-only Supabase reads against the `sca` schema (service-role client, never exposed to the browser) — no new auth system, no write/create/edit/delete flows this milestone

**Shipped as scoped** — all 18 requirements satisfied, see `.planning/milestones/v2.0-REQUIREMENTS.md`.

</details>

## What This Is

A mobile-first website for Big Matt's BBQ that serves as a sales funnel for limited-run frozen BBQ drops and a catering presence, plus a companion read-only SCA steak cookoff competition tracker at `/sca` sharing the same repo, Vercel project, and design system. Customers preorder frozen BBQ products (sold in 0.5 lb bags), select a pickup location, and receive a Square invoice via email. The site captures mailing list subscribers for drop notifications and provides static catering/about/contact pages. The SCA Tracker lets a chef/spectator browse, compare, and understand Big Matt's competition history — cooks, scores, process detail, trend analytics, and AI appearance reviews.

v1.0 shipped: storefront is now database-driven (Supabase), capacity is enforced atomically, orders are persisted, mailing list is fully operational with unsubscribe and broadcast capability.
v2.0 shipped: SCA Tracker is live at `/sca`, fully database-driven from the existing Supabase `sca` schema, with zero impact on the storefront.

## Core Value

**Storefront:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

**SCA Tracker (v2.0):** A chef/spectator can browse, compare, and understand Big Matt's SCA steak cookoff history — cooks, scores, process detail, and AI appearance reviews — in one place that looks and feels like it belongs on bigmattsbbq.com.

## Requirements

### Validated

- ✓ Frozen product catalog pulled from Square API — existing (pre-v1.0)
- ✓ Live inventory counts from Square Inventory API — existing (pre-v1.0)
- ✓ Cart with localStorage persistence — existing (pre-v1.0)
- ✓ Pre-configured package bundles (Family, Backyard Host, Freezer Stock-Up) — existing (pre-v1.0)
- ✓ Checkout with customer info, pickup selection, and Square invoice creation — existing (pre-v1.0)
- ✓ Confirmation page after order placement — existing (pre-v1.0)
- ✓ Sauce bump logic (auto-add sauce when meat ordered without it) — existing (pre-v1.0)
- ✓ Dark, smoky visual theme with ember/smoke color palette — existing (pre-v1.0)
- ✓ Mobile-first responsive design — existing (pre-v1.0)
- ✓ Supabase integration for drops, orders, mailing list, and email logs — v1.0 Phase 1
- ✓ Database-driven drops model (configurable products, capacity, pickup options per drop) — v1.0 Phase 2+3
- ✓ Atomic capacity enforcement via `reserve_pickup_slot` before Square API calls — v1.0 Phase 3+4
- ✓ Deterministic SHA-256 idempotency keys prevent duplicate Square orders — v1.0 Phase 4
- ✓ Order record saved to Supabase with JSONB cart snapshot — v1.0 Phase 4
- ✓ Mailing list signup on home page (active and no-active-drop branches) — v1.0 Phase 5
- ✓ Mailing list signup in site-wide footer — v1.0 Phase 5
- ✓ Mailing list opt-in during checkout — v1.0 Phase 4
- ✓ Unsubscribe via Jose HS256 JWT link in emails — v1.0 Phase 5
- ✓ Drop notification broadcast via Resend with email audit trail — v1.0 Phase 5
- ✓ Site-wide navigation (Home, Frozen Drops, Catering, About, Contact) — v1.0 Phase 5
- ✓ Catering page with static tiers, booking details, and mailto CTA — v1.0 Phase 5
- ✓ About page with static content — v1.0 Phase 5
- ✓ Contact page with contact information — v1.0 Phase 5
- ✓ Service-role Supabase client reads the `sca` schema, key never exposed to the browser (INFRA-01) — v2.0 Phase 9
- ✓ Generated TypeScript types for the `sca` schema, kept separate from storefront's `public` types (INFRA-02) — v2.0 Phase 9
- ✓ Host-based subdomain routing (`sca.bigmattsbbq.com` → `app/sca`) via Next.js 16 `proxy.ts`, zero impact on storefront routes (INFRA-03) — v2.0 Phase 9
- ✓ SCA Tracker pages reuse the existing ember/smoke Tailwind theme and typography — no new visual system (INFRA-04) — v2.0 Phase 9
- ✓ Single shared `deriveScoreMetrics()` function for `distance_from_winning`/`distance_from_perfect` — v2.0 Phase 9
- ✓ Dashboard summary cards, comparison table, and data-driven "what stands out" insights (DASH-01/02/03) — v2.0 Phase 10
- ✓ Competitions list + detail with side-by-side cook comparison (COMP-01/02/03) — v2.0 Phase 10
- ✓ Cook detail page with process variables, score breakdown, and AI review history (COOK-01/02) — v2.0 Phase 10
- ✓ Analytics trend views — total score, gap-to-first, and 5 judging categories over time (ANLY-01/02/03) — v2.0 Phase 11
- ✓ AI Reviews list + detail views linked back to cook and competition (AIRV-01/02) — v2.0 Phase 11

### Active

- [ ] Branded Resend confirmation email with order summary, pickup details, pay-at-pickup reminder (MAIL-01 — deferred from v1.0 via D-10)
- [ ] Square API version bump from `2024-12-18` (reaches EOL ~June 2026)
- [ ] Admin dashboard to manage drops, view orders, and manage mailing list
- [ ] Admin can create/edit/close drops without editing Supabase directly
- [ ] Catering Quote Form (see ROADMAP.md Backlog)
- [ ] No requirements currently active for a next milestone — see "Next Milestone Goals" above; run `/gsd:new-milestone` to scope one

### Out of Scope

- Online payment processing — payment collected at pickup (Square invoices for tracking only)
- Shipping frozen products — pickup-only model
- Subscriptions or recurring billing — not part of the drop model
- Complex catering scheduling — static page with email CTA instead
- SMS notifications or waitlists — future consideration
- Accounting system integrations — not needed for MVP
- SCA Tracker write/create/edit/delete flows — read-only tracker by design; Supabase `sca` schema is populated externally
- SCA Tracker new auth system — public read-only data, no login surface introduced

## Context

- **Shipped version**: v1.0 + v1.1 + v2.0 SCA Tracker (Phases 1-11) all complete — no milestone currently in progress
- **Tech stack**: Next.js 16 App Router, TypeScript, Tailwind CSS, React 18, Supabase (Postgres — `public` and `sca` schemas), Resend, Square API
- **Architecture**: Square for catalog/inventory/payments; Supabase `public` schema for drops/orders/mailing list/email logs; Supabase `sca` schema (read-only, service-role) for the competition tracker; Resend for email
- **Pickup locations**: Cache Valley and Utah County, configurable per drop via `drop_pickup_options` table
- **Design system**: Custom Tailwind theme with `ember` (warm orange-red) and `smoke` (dark browns) palettes, Playfair Display + Source Sans 3 fonts — shared by both the storefront and the SCA Tracker (INFRA-04)
- **SCA Tracker routing**: `/sca` is the canonical SCA Tracker URL. Host-based routing via `proxy.ts` (Next.js 16's renamed `middleware.ts`) ships and would support an `sca.*` subdomain, but the subdomain was decided against as unnecessary; the routing code is left in place as inert, already-tested infrastructure.
- **Test suite**: 247 tests passing (25 test files) — storefront (inventory join, cart logic, idempotency, mailing list, broadcast, checkout reservation) plus SCA Tracker (scoring, aggregates, comparison, insights, trends, queries, format, cook-detail-fields)
- **Known tech debt**: `productName` slug matching in CheckoutClient is fragile; `aggregateByProduct` in lib/cart.ts is unused by production code (see v1.0-MILESTONE-AUDIT.md). v2.0: 10 Warning + 10 Info code-review findings across Phases 9-11 (0 Critical); Phase 9 has no formal VERIFICATION.md (functionally covered by its 09-07 human-verify checkpoint) — full detail in `.planning/milestones/v2.0-MILESTONE-AUDIT.md`

## Constraints

- **Tech stack**: Next.js App Router, TypeScript, Tailwind CSS — already established
- **Payment**: Square invoices (keep existing integration) — no new payment processing
- **Inventory**: Square Inventory API remains source of truth — no migration to Supabase
- **Database**: Supabase (Postgres) for drops, orders, mailing list, email logs
- **Email**: Resend for transactional and mailing list emails
- **Hosting**: Vercel (implicit from Next.js stack)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Square invoices | Already working, familiar flow, PRD non-goal is online payment processing | ✓ Good |
| Supabase for new data | Need structured drops/orders/mailing list without overloading Square | ✓ Good |
| Square stays for inventory | Atomic inventory already handled by Square; avoid dual-source complexity | ✓ Good |
| Resend for email | Simple API for transactional + mailing list broadcasts | ✓ Good |
| Database-driven drops, no admin UI | Flexibility to configure drops without redeploy; admin dashboard deferred | ✓ Good |
| Home page keeps ordering focus | Current layout works well as a sales funnel; secondary pages are navigation | ✓ Good |
| MAIL-01 deferred (D-10) | Square invoice email covers MVP confirmation; Resend confirmation is post-MVP | ✓ Good |
| Slot reservation before Square calls | Atomicity guarantee; capacity never oversold even on partial failures | ✓ Good |
| Deterministic idempotency SHA-256 | Prevents duplicate Square orders on retries without UUID randomness | ✓ Good |
| Unsubscribe via signed JWT (Jose) | Stateless token — no DB lookup needed for verification, 30-day expiry | ✓ Good |
| Single migration file | All DDL, RLS, functions in one file — simpler to inspect and replay | ✓ Good |
| Fire-and-forget Supabase writes | Order save and mailing list upsert don't block checkout success | ✓ Good |
| productName slug matching (INT-02) | Pragmatic for MVP with known product names; fragile if Square catalog drifts | ⚠️ Revisit |
| Read-only tracker, no new auth, service-role Supabase reads only | SCA data is public competition history; avoiding auth/write surface keeps v2.0 scoped and low-risk | ✓ Good |
| Shared repo/Vercel project/design system (not a separate app) | Zero infra duplication, reuses ember/smoke theme and deploy pipeline | ✓ Good |
| Host-based routing via `proxy.ts`, not a path prefix | Next.js 16 renamed `middleware.ts`; pathname-prefix-generic `resolveScaRouting()` meant Phase 11's new routes needed zero routing config | ✓ Good |
| `sca` schema types in a dedicated file, not merged into `database.types.ts` | Avoids touching storefront's `public` schema types; deliberate Phase 9 decision (D-06) | ✓ Good |
| Single shared `deriveScoreMetrics()` for all derived score math | Zero duplicated `distance_from_winning`/`distance_from_perfect` logic across Phases 9-11 (confirmed by milestone integration check) | ✓ Good |
| Single shared `buildComparisonTable()` for Dashboard + Competition Detail | One comparison-table implementation reused via an `aggregateSource` parameter rather than two separate builders | ✓ Good |
| AI Review Detail stays drill-down-only, reached only from its own list (D-07) | Matches Cook/Competition Detail precedent; Cook Detail renders AI reviews inline instead of cross-linking to `/sca/ai-reviews/[id]` | ✓ Good |
| Human-verify checkpoints at the end of each SCA Tracker phase | This repo has no jsdom/RTL rendering tests for `app/sca` pages — live browser checks were the only way to catch the Phase 10 discoverability/aggregate-scope gaps and Phase 11's mobile nav-overflow regression before shipping | ✓ Good |
| `sca.bigmattsbbq.com` subdomain dropped; `/sca` path is canonical | The path already serves the tracker identically on every environment; a dedicated subdomain added a DNS dependency and a dangling-CNAME takeover surface for zero user-visible benefit | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-28 — SCA subdomain dropped; /sca is the canonical SCA Tracker URL*
