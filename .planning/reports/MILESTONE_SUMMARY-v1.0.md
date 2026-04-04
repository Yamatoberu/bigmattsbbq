# Milestone v1.0 — Project Summary

**Generated:** 2026-04-04
**Purpose:** Team onboarding and project review

---

## 1. Project Overview

Big Matt's BBQ is a mobile-first Next.js website that serves as a sales funnel for limited-run frozen BBQ drops. Customers preorder frozen BBQ products (sold in 0.5 lb bags), select a pickup location, and receive a Square invoice via email. The site also captures mailing list subscribers for drop notifications and provides static catering/about/contact pages.

**Core Value:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

**Milestone scope:** Transform the existing Square-powered storefront into a production-ready drop platform by adding Supabase for data management, Resend for email, and database-driven drop configuration.

**Current status:** Phase 1 (Foundation) complete. Phases 2-4 are planned but not yet started.

| Phase | Status |
|-------|--------|
| 1. Foundation | Complete |
| 2. Drop Config & Storefront | Not started |
| 3. Checkout Integration | Not started |
| 4. Mailing List & Content | Not started |

---

## 2. Architecture & Technical Decisions

**Tech Stack:**
- **Framework:** Next.js 16 App Router, TypeScript 5.5, React 18, Tailwind CSS
- **Payments:** Square API (catalog, inventory, customers, invoices) — existing
- **Database:** Supabase (Postgres) — new in Phase 1 — for drops, orders, mailing list, email logs
- **Email:** Resend (planned for Phase 3+)
- **Hosting:** Vercel

**Key architectural decisions:**

- **Hybrid backend:** Square remains source of truth for catalog/inventory/payments. Supabase handles drops, orders, mailing list, and email logs. No migration of existing Square data.
  - **Why:** Avoids dual-source complexity for inventory; each system handles what it does best.
  - **Phase:** Initialization

- **Server-only Supabase client:** All Supabase calls go through API routes via a service-role singleton (`lib/supabase.ts`). No client-side Supabase SDK.
  - **Why:** Mirrors the existing `lib/square.ts` pattern; keeps secrets server-side.
  - **Phase:** 1

- **Two-level capacity enforcement:** Global per-product AND per-pickup-location per-product. Strictest wins.
  - **Why:** Prevents both global overselling and per-location overselling. The 5-bag buffer (200 global vs 3×65=195 local) absorbs rounding.
  - **Phase:** 1

- **Atomic conditional UPDATE for reservations:** `UPDATE ... SET reserved = reserved + N WHERE reserved + N <= capacity` — no `SELECT FOR UPDATE`.
  - **Why:** Simpler, faster, and sufficient for the expected concurrency level.
  - **Phase:** 1

- **RLS enabled with no policies = deny all:** Anon key queries are blocked. Service role bypasses RLS unconditionally.
  - **Why:** Security by default; no accidental data exposure through anon key.
  - **Phase:** 1

- **Auto-generated types:** `supabase gen types` produces `lib/database.types.ts`. Never hand-edit.
  - **Why:** Types stay in sync with the live schema automatically.
  - **Phase:** 1

---

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 1 | Foundation | Complete | PostgreSQL schema with 5 tables, RLS, atomic slot-reservation RPC functions, and typed Node.js singleton client |
| 2 | Drop Config & Storefront | Planned | Database-driven drop configuration with live drop state UI |
| 3 | Checkout Integration | Planned | Atomic capacity enforcement, order logging, and confirmation email |
| 4 | Mailing List & Content | Planned | Standalone mailing list, static pages, and site-wide navigation |

### Phase 1 Detail

**Plans executed:** 2/2

1. **Plan 01-01** (Wave 1, autonomous): Created `supabase/migrations/0001_foundation.sql` with all 5 tables (drops, drop_pickup_options, orders, mailing_list, email_logs), RLS on every table, `reserve_pickup_slot` and `release_pickup_slot` RPC functions, indexes, and seed data. Built `lib/supabase.ts` singleton client, `lib/database.types.ts` placeholder types, extended `lib/env.ts` with `getSupabaseEnv()`, and wrote 6 unit tests.

2. **Plan 01-02** (Wave 2, human checkpoint): User created the Supabase project, ran the migration, added env vars, and generated real TypeScript types (374 lines). Then automated: created `app/api/test-seed/route.ts` verification route confirming live connectivity — 1 drop, 3 pickup options queryable.

**Verification:** 11/11 must-haves passed. No gaps found.

---

## 4. Requirements Coverage

### Data Foundation
- **DATA-01:** Supabase schema created with tables for drops, drop_pickup_options, orders, mailing_list, and email_logs — **Complete**
- **DATA-02:** Row-level security enabled on all Supabase tables from initial creation — **Complete**
- DATA-03: Drops managed in Supabase with configurable products, capacity, and pickup options — *Pending (Phase 2)*
- DATA-04: Each drop has a state (upcoming/active/closed) controlling ordering — *Pending (Phase 2)*
- DATA-05: Drop pickup options stored in Supabase, replacing hardcoded config — *Pending (Phase 2)*

### Ordering & Checkout
- ORD-01 through ORD-05 — *Pending (Phases 2-3)*

### Email & Mailing List
- MAIL-01 through MAIL-06 — *Pending (Phases 3-4)*

### Content & Navigation
- NAV-01, PAGE-01 through PAGE-03 — *Pending (Phase 4)*

**Summary:** 2/20 v1 requirements complete. 18 pending across Phases 2-4. 0 orphaned.

---

## 5. Key Decisions Log

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| D-01 | Two-level capacity: global + per-location | 1 | Prevents both global and local overselling |
| D-02 | Per-product capacity (pulled pork, brisket independent) | 1 | Products sell at different rates |
| D-03 | Capacity unit = bag count (integer, 1 bag = 0.5 lb) | 1 | Matches business model |
| D-04 | Reservation fails immediately, no hold-and-expire | 1 | Simpler, matches drop urgency |
| D-05 | Auto-release on downstream failure | 1 | Square call failure shouldn't orphan capacity |
| D-06 | Conditional UPDATE (no explicit row locks) | 1 | Sufficient for expected concurrency |
| D-07 | 3 pickup locations: Cache Valley, Utah County, Sandy | 1 | Sandy is a real upcoming location |
| D-08 | 200 global / 65 per-location (5-bag buffer) | 1 | Reflects actual business expectations |
| D-09 | Server-only Supabase client | 1 | Matches lib/square.ts pattern, keeps secrets server-side |
| D-10 | Auto-generated types via supabase gen types CLI | 1 | Prevents schema/type drift |
| — | Keep Square for catalog/inventory/payments | Init | Already working, familiar flow |
| — | Supabase for new data (drops, orders, mailing list) | Init | Structured data without overloading Square |
| — | Resend for email | Init | Simple API for transactional + mailing list |
| — | No admin dashboard for MVP | Init | Manage drops directly in Supabase |

---

## 6. Tech Debt & Deferred Items

### Known Issues
- **Stale `.next/` cache:** TypeScript compilation can report phantom errors from `.next/types/` referencing pages that don't exist yet. Fix: `rm -rf .next` before `tsc --noEmit`. This will recur as new pages are added in future phases.

### Blockers for Future Phases
- **Resend DNS verification:** Domain verification for bigmattsbbq.com must be initiated before Phase 3 coding begins (up to 48-hour propagation).
- **Square API version:** `2024-12-18` reaches end-of-life ~June 2026 — bump during or before Phase 3.

### Deferred to v2
- Admin dashboard for managing drops (ADMIN-01, ADMIN-02)
- SMS notifications (NOTF-01)
- Waitlist signup for sold-out products (NOTF-02)

---

## 7. Getting Started

### Run the project
```bash
npm install
npm run dev          # Start dev server at localhost:3000
```

### Required env vars (`.env.local`)
```
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_FROZEN_CATEGORY_ID=...
SQUARE_SAUCE_VARIATION_ID=...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### Key directories
| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js pages and API routes |
| `app/api/` | API routes (frozen-items, checkout, test-seed) |
| `components/` | React components (cart, cards, layout) |
| `lib/` | Shared logic: Square client, Supabase client, types, config, utilities |
| `supabase/migrations/` | Database migration SQL |
| `tests/` | Vitest unit tests |

### Tests
```bash
npm run test              # Run all tests (13 tests across 4 files)
npm run test:watch        # Watch mode
npx vitest run tests/supabase.test.ts  # Single file
```

### Where to look first
- `lib/supabase.ts` — Supabase client singleton (new)
- `lib/square.ts` — Square API client (existing, pattern reference)
- `lib/types.ts` — Shared TypeScript interfaces
- `lib/config.ts` — Hardcoded packages and pickup options (will be replaced by Supabase data in Phase 2)
- `supabase/migrations/0001_foundation.sql` — Complete database schema
- `app/api/test-seed/route.ts` — Verify Supabase connectivity

### Verify Supabase is working
```bash
curl http://localhost:3000/api/test-seed
# Expected: { ok: true, drops: [...], pickupOptions: [...], summary: { dropCount: 1, pickupOptionCount: 3 } }
```

---

## Stats

- **Timeline:** 2026-04-03 → 2026-04-04
- **Phases:** 1/4 complete
- **Plans executed:** 2
- **Commits:** 18
- **Files changed:** 29 (+5,738 / -2)
- **Contributors:** mgregory
