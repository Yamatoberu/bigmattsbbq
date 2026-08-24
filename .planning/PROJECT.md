# Big Matt's BBQ — Website Refresh & Frozen Drops

## Current Milestone: v2.0 SCA Tracker

**Goal:** Ship a read-only, production-quality SCA (Steak Cookoff Association) competition tracker at `sca.bigmattsbbq.com`, sharing this repo, Vercel project, and Big Matt's BBQ visual design system with the storefront, reading live data from the existing Supabase `sca` schema via server-side service-role access.

**Target features:**
- Dashboard: summary cards (latest/best/worst cook, average total score, average gap to first), a side-by-side comparison table, data-driven "what stands out" summaries
- Competitions: list by date, detail view with event metadata + all cooks, side-by-side comparison within an event
- Cook detail: competition, steak label, process variables, score breakdown, AI review history
- Analytics: read-only trend views (score over time, gap to first over time, key judging categories)
- AI Reviews: list + detail views for stored AI appearance reviews tied to cooks
- Host-based subdomain routing (`sca.bigmattsbbq.com`) within this same Next.js app/Vercel project
- Server-side-only Supabase reads against the `sca` schema (service-role client, never exposed to the browser) — no new auth system, no write/create/edit/delete flows this milestone

## What This Is

A mobile-first website for Big Matt's BBQ that serves as a sales funnel for limited-run frozen BBQ drops and a catering presence. Customers preorder frozen BBQ products (sold in 0.5 lb bags), select a pickup location, and receive a Square invoice via email. The site captures mailing list subscribers for drop notifications and provides static catering/about/contact pages.

v1.0 shipped: storefront is now database-driven (Supabase), capacity is enforced atomically, orders are persisted, mailing list is fully operational with unsubscribe and broadcast capability.

## Core Value

Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

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

### Active

- [ ] Branded Resend confirmation email with order summary, pickup details, pay-at-pickup reminder (MAIL-01 — deferred from v1.0 via D-10)
- [ ] Square API version bump from `2024-12-18` (reaches EOL ~June 2026)
- [ ] Admin dashboard to manage drops, view orders, and manage mailing list (v2)
- [ ] Admin can create/edit/close drops without editing Supabase directly (v2)
- [ ] v2.0 SCA Tracker requirements — see `.planning/REQUIREMENTS.md`

### Out of Scope

- Online payment processing — payment collected at pickup (Square invoices for tracking only)
- Shipping frozen products — pickup-only model
- Subscriptions or recurring billing — not part of the drop model
- Complex catering scheduling — static page with email CTA instead
- SMS notifications or waitlists — future consideration
- Accounting system integrations — not needed for MVP

## Context

- **Shipped version**: v1.0 + v1.1 (Phases 6-8) complete; v2.0 SCA Tracker Phases 9-10 complete (Phase 11 next)
- **Tech stack**: Next.js 16 App Router, TypeScript, Tailwind CSS, React 18, Supabase (Postgres), Resend, Square API
- **Architecture**: Square for catalog/inventory/payments; Supabase for drops, orders, mailing list, email logs; Resend for email
- **Pickup locations**: Cache Valley and Utah County, configurable per drop via `drop_pickup_options` table
- **Design system**: Custom Tailwind theme with `ember` (warm orange-red) and `smoke` (dark browns) palettes, Playfair Display + Source Sans 3 fonts
- **Test suite**: 56 tests passing (12 test files) — inventory join, cart logic, idempotency, mailing list, broadcast, unsubscribe token, checkout reservation
- **Known tech debt**: `productName` slug matching in CheckoutClient is fragile; `aggregateByProduct` in lib/cart.ts is unused by production code (see v1.0-MILESTONE-AUDIT.md)

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-24 — Phase 10 (Core Browsing) complete, both UAT gaps closed and verified*
