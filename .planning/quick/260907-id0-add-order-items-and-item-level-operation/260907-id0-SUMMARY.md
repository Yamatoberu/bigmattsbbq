---
phase: quick-260907-id0
plan: 01
subsystem: database, api
tags: [supabase, postgres, square-catalog, checkout, order-items, rls]

# Dependency graph
requires:
  - phase: quick-260904-w6s
    provides: public.orders lifecycle columns (order_status, payment_status, total_amount_cents) and the pre-Square orders-insert pattern this plan builds order_items on top of
provides:
  - public.order_items table (additive migration 0009, FK to public.orders on delete cascade, RLS enabled with zero policies)
  - Server-derived Square Catalog snapshot lookup in the checkout route, run before any Square customer/order/invoice call
  - One order_items row per cart entry on every checkout, including orders that later become order_status='failed'
  - Removal of the dead orderItems Zod field / orderItemSchema / (orderItems ?? cart) fallback from the checkout route
affects: [checkout, operations reporting, order-detail-views]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-Square catalog snapshot pattern: searchCatalogItems + mapCatalogToFrozenItems called before any Supabase or Square write, flattened into a variationId -> {itemId, itemName, variationName, unitPriceCents} Map, so line-item names/prices are always server-derived and never client-trusted"
    - "Compensating delete pattern: a second-write failure (order_items) after a first write succeeded (orders) deletes the first row and returns the same 500 shape, rather than leaving an orphaned row or introducing a transactional RPC"

key-files:
  created:
    - supabase/migrations/0009_order_items.sql
    - tests/checkoutOrderItems.test.ts
  modified:
    - lib/database.types.ts
    - app/api/checkout/route.ts
    - tests/checkoutOrderPersistence.test.ts
    - tests/checkoutSlack.test.ts
    - tests/checkoutLineItems.test.ts
    - tests/checkoutInvoiceDueDate.test.ts

key-decisions:
  - "Migration 0009 is purely additive (new table only); it must be applied to Supabase BEFORE this code deploys, same ordering as 0008, since the route hard-depends on order_items existing on every checkout"
  - "Unknown-variation checkout failures return 400 (not 500) — a stale/tampered variationId is a bad request the client can recover from via refresh"
  - "getSquareEnv() is hoisted out of the Square try block to just before the catalog lookup since it only throws on missing env vars, before any row is inserted"
  - "notifySlackNewOrder keeps sourcing line items from Square's createOrder response, not the new catalog map — intentional per CONTEXT, not a bug"
  - "No Postgres RPC or transaction function for the two-write (orders, order_items) sequence — a compensating delete on order_items failure is the chosen mitigation, consistent with the risk tolerance set when capacity enforcement was removed (issue #13)"

patterns-established:
  - "Catalog-snapshot-before-Square: any future write that needs a trustworthy name/price snapshot should look it up from Square Catalog server-side before persisting, never from client-supplied fields"

requirements-completed: [ISSUE-3]

# Metrics
duration: ~13min
completed: 2026-09-07
---

# Quick Task 260907-id0: Add order_items and item-level checkout persistence Summary

**Server-derived `public.order_items` line-item snapshots written on every checkout via a pre-Square Square Catalog lookup, with a compensating-delete failure path and removal of the dead `orderItems` request field (Issue #3).**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-09-07T19:25Z (approx, first task commit)
- **Completed:** 2026-09-07T19:31:43Z
- **Tasks:** 3 completed
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- Additive migration `0009_order_items.sql` creates `public.order_items` (FK to `public.orders` with `on delete cascade`, `quantity > 0` check, RLS enabled with zero policies, `order_id` index) and `lib/database.types.ts` was hand-edited to match
- `POST /api/checkout` now performs one Square Catalog lookup (`searchCatalogItems` + `mapCatalogToFrozenItems`, mirroring `app/api/frozen-items/route.ts`) after drop/pickup validation and before every Supabase write and every Square call, building a `variationId -> {itemId, itemName, variationName, unitPriceCents}` map
- Every inserted `orders` row now gets one `order_items` row per cart entry, in cart order, with `item_name`/`variation_name`/`unit_price_cents` sourced exclusively from the Catalog map — never from client-supplied fields — including orders that later become `order_status = 'failed'`
- A Catalog lookup failure returns 500 with nothing written; an unknown cart `variationId` returns 400 with nothing written; an `order_items` insert failure deletes the just-inserted `orders` row (the route's only delete) and returns the existing 500 shape
- Deleted `orderItemSchema`, the `orderItems` Zod field, and the `(parsed.data.orderItems ?? cart)` fallback — Square `line_items` now derive from `cart` directly
- 9 new Vitest tests (`tests/checkoutOrderItems.test.ts`) plus 2 added to `tests/checkoutOrderPersistence.test.ts` cover the full behavior; all 4 pre-existing checkout test files were widened with a shared catalog fixture and pass unmodified against both the old and new route

## Task Commits

Each task was committed atomically:

1. **Task 1: Add migration 0009_order_items.sql and the matching generated types** - `81a5e06` (feat)
2. **Task 2: RED — widen the shared checkout mocks and write the order_items tests** - `2f29d18` (test)
3. **Task 3: GREEN — pre-Square catalog snapshot, order_items persistence, and dead-field removal** - `b3ee390` (feat)

**Plan metadata:** commit deferred to orchestrator (per constraints, docs artifacts not committed by this executor)

## Files Created/Modified
- `supabase/migrations/0009_order_items.sql` - Additive migration: `public.order_items` table, RLS enabled with zero policies, `order_id` index
- `lib/database.types.ts` - Hand-edited `order_items` Row/Insert/Update types and FK relationship, positioned alphabetically before `orders`
- `app/api/checkout/route.ts` - Hoisted `getSquareEnv()`, added pre-Square catalog lookup + unknown-variation guard, `order_items` insert with compensating `orders` delete, removed dead `orderItems` field/schema/fallback
- `tests/checkoutOrderItems.test.ts` - New: 9 tests for catalog-before-Square ordering, items insert payload, client-data isolation, unknown-variation/catalog-failure fatal paths, compensating delete, items-on-failed-orders, dead-field inertness
- `tests/checkoutOrderPersistence.test.ts` - Widened shared mocks (catalog fixture, `order_items`/`delete` branches); added Tests 10-11 confirming the orders insert and `cart_snapshot` are unaffected
- `tests/checkoutSlack.test.ts` - Widened shared mocks in both `orders`-branch locations (two supabase mock setups in this file)
- `tests/checkoutLineItems.test.ts` - Widened shared mocks
- `tests/checkoutInvoiceDueDate.test.ts` - Widened shared mocks

## Decisions Made
- Migration-first deployment ordering locked in (same as issue #9's migration 0008): `0009` must be applied to the shared Supabase project before this code deploys, or every checkout would 500 on the missing table
- Unknown-variation failures are 400, not 500, matching the plan's explicit discretion note (client's correct recovery is a refresh, not a retry)
- No Postgres RPC/transaction function introduced for the `orders` → `order_items` two-write sequence; a compensating delete on the second write's failure is the accepted risk, matching the project's post-issue-#13 risk tolerance
- `lib/cart.ts` and `components/CheckoutClient.tsx` were deliberately left untouched; `cartSchema`'s `productName` union still passes through to `cart_snapshot` unchanged

## Deviations from Plan

None - plan executed exactly as written. All three tasks' automated verify gates passed without needing any Rule 1-4 auto-fixes. One incidental build artifact (`next-env.d.ts`, regenerated by `npm run build` during Task 3 verification) was reverted before committing since it was not in the plan's `files_modified` list and is Next.js-managed, not a deviation.

## Issues Encountered
None.

## User Setup Required

**A Supabase migration requires manual application before this code is deployed.** See the plan's `<human-check>` section in `260907-id0-PLAN.md` for the full checklist:

1. Take a Supabase point-in-time snapshot/backup of project `wpziabhigztyjrmjpmbw`
2. Apply `supabase/migrations/0009_order_items.sql`
3. Confirm the currently deployed code is unaffected (homepage, `/api/drop`, an existing checkout still work — `0009` adds a table nobody reads yet)
4. Spot-check the schema and RLS (columns, `relrowsecurity = t`, zero rows in `pg_policies` for `order_items`)
5. **Only then** merge and deploy this code, then run one full Square-sandbox checkout end to end with a throwaway drop + pickup option and a multi-line cart, confirming: one `orders` row (`order_status = 'invoiced'`), one `order_items` row per cart line with correct `order_id`, catalog-sourced `item_name`/`variation_name` (not client labels), and `unit_price_cents × quantity` summed reconciling against `total_amount_cents`
6. Force a Square failure (temporarily point `SQUARE_HOST` at an unreachable host) and confirm the resulting `order_status = 'failed'` row still carries its `order_items` rows; restore `SQUARE_HOST`
7. Force a stale-id rejection via curl with a bogus `variationId` and confirm a 4xx with no new `orders` or `order_items` rows
8. Confirm cascade: deleting the test `orders` row removes its `order_items` rows; use this to clean up test data, then delete the throwaway drop/pickup option
9. Regenerate `lib/database.types.ts` from the live schema and diff against this plan's hand-edit to confirm agreement
10. Optionally run `npm run test:e2e` and review `e2e/checkoutFlow.spec.ts` fixtures if it exercises the real route

**This executor did not apply migration 0009 to any database** — it only created the `.sql` file, per the plan's explicit reservation of migration application as a human step.

## Next Phase Readiness
- `public.order_items` is ready to back per-order pack lists, production counts, and per-item revenue reporting once the migration is applied and the code deployed
- No blockers for future work; the next natural extension (not part of this task) would be an operations-facing read of `order_items` for pack-list generation

---
*Phase: quick-260907-id0*
*Completed: 2026-09-07*

## Self-Check: PASSED

All 8 files-created/modified claims verified present on disk; all 3 task commit hashes (81a5e06, 2f29d18, b3ee390) verified present in git log.
