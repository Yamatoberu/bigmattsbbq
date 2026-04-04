# Roadmap: Big Matt's BBQ — Supabase + Resend Integration

## Overview

This milestone transforms the existing Square-powered storefront into a production-ready drop platform. The work moves in four phases along a clear dependency chain: establish the Supabase foundation first, wire the storefront to live drop data second, extend the checkout with atomic capacity enforcement and email third, and complete the site with mailing list signup and static content pages last. When all four phases are done, the site can run multiple drops without code changes.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Supabase schema, RLS, typed client, and atomic reservation function
- [ ] **Phase 2: Drop Config & Storefront** - Database-driven drop configuration with live drop state UI
- [ ] **Phase 3: Checkout Integration** - Atomic capacity enforcement, order logging, and confirmation email
- [ ] **Phase 4: Mailing List & Content** - Standalone mailing list, static pages, and site-wide navigation

## Phase Details

### Phase 1: Foundation
**Goal**: The Supabase project is fully set up with all tables, RLS enforced, the atomic reservation function deployed, and a typed client ready for all feature work
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. All five Supabase tables (drops, drop_pickup_options, orders, mailing_list, email_logs) exist and are visible in Supabase Studio
  2. Row-level security is enabled on every table — direct anon key writes to any table are rejected
  3. The `reserve_pickup_slot` Postgres RPC function is deployed and callable
  4. `lib/supabase.ts` exists with a typed singleton client and `npx tsc --noEmit` passes with no new errors
  5. A seeded test drop record exists in Supabase and is queryable from a Next.js API route
**Plans:** 1/2 plans executed

Plans:
- [x] 01-01-PLAN.md — Migration SQL, Supabase client, env validation, and unit tests
- [x] 01-02-PLAN.md — Supabase project setup (human), type generation, and verification API route

**UI hint**: no

### Phase 2: Drop Config & Storefront
**Goal**: The storefront reads live drop configuration from Supabase — pickup options, order cutoff, and drop state — replacing all hardcoded config
**Depends on**: Phase 1
**Requirements**: DATA-03, DATA-04, DATA-05, ORD-04, ORD-05
**Success Criteria** (what must be TRUE):
  1. The ordering page displays pickup locations and dates pulled from the active Supabase drop record, not from hardcoded config
  2. When no drop is active, the ordering page shows a "no active drop" state instead of an empty or broken UI
  3. When a drop's capacity is reached, products display sold-out indicators without requiring a page reload
  4. The checkout flow rejects orders server-side when the drop is not active or has no capacity remaining
**Plans**: TBD
**UI hint**: yes

### Phase 3: Checkout Integration
**Goal**: Every completed checkout atomically reserves a pickup slot, logs the order to Supabase, and sends the customer a branded confirmation email
**Depends on**: Phase 2
**Requirements**: ORD-01, ORD-02, ORD-03, MAIL-01, MAIL-04
**Success Criteria** (what must be TRUE):
  1. Submitting the checkout form reserves a pickup slot via Postgres RPC before any Square API call — concurrent submissions cannot both succeed when one slot remains
  2. A completed order is recorded in the Supabase orders table with a JSONB cart snapshot
  3. The customer receives a branded confirmation email with their order summary, selected pickup details, and a pay-at-pickup reminder
  4. An email failure does not cause the checkout to return an error — the Square invoice email acts as fallback and the failure is logged to email_logs
  5. Re-submitting an identical checkout (same customer, drop, and cart) does not create a duplicate Square invoice or Supabase order record
**Plans**: TBD
**UI hint**: no

### Phase 4: Mailing List & Content
**Goal**: Visitors can sign up for drop notifications from the home page and footer, the checkout offers a mailing list opt-in, and the full site navigation links to completed catering, about, and contact pages
**Depends on**: Phase 3
**Requirements**: MAIL-02, MAIL-03, MAIL-04 (standalone route), MAIL-05, MAIL-06, NAV-01, PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. A visitor can enter their email in the home page mailing list section and receive a confirmation without placing an order
  2. The same mailing list signup is available in the site-wide footer on every page
  3. A mailing list subscriber can click an unsubscribe link in any email and be removed from future broadcasts
  4. The site navigation shows links to Home, Frozen Drops, Catering, About, and Contact on every page
  5. The Catering, About, and Contact pages load with correct static content and the Catering page includes a mailto CTA to catering@bigmattsbbq.com
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In Progress|  |
| 2. Drop Config & Storefront | 0/? | Not started | - |
| 3. Checkout Integration | 0/? | Not started | - |
| 4. Mailing List & Content | 0/? | Not started | - |
