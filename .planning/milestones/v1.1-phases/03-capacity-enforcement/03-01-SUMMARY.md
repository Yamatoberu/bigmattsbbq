---
phase: 03-capacity-enforcement
plan: "01"
subsystem: checkout
tags: [capacity, reservation, supabase-rpc, zod, tdd]
dependency_graph:
  requires: []
  provides: [reserve_pickup_slot wired into checkout, productName in cart payload]
  affects: [app/api/checkout/route.ts, components/CheckoutClient.tsx]
tech_stack:
  added: []
  patterns: [non-blocking fire-and-forget RPC after Square publishInvoice, Zod union literal for product name validation, aggregation map before RPC calls]
key_files:
  created:
    - tests/checkoutReservation.test.ts
  modified:
    - app/api/checkout/route.ts
    - components/CheckoutClient.tsx
decisions:
  - "Cast Supabase Json return type to { ok: boolean; reason?: string } inline — avoids adding a shared type for a single-use RPC shape"
  - "Reservation failure is non-blocking (D-02): log via logError and continue, checkout returns 200 with orderId/invoiceId/pickupNote"
  - "Aggregation done with a Map before looping RPC calls — one call per product type (max 2), not one per cart line item"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_changed: 3
requirements: [DATA-03, ORD-05]
---

# Phase 03 Plan 01: Checkout Reservation Wiring Summary

Wire `reserve_pickup_slot` Supabase RPC into the checkout flow so capacity counters are atomically updated after each order — closing the critical v1.0 audit gap where orders did not decrement capacity.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create checkout reservation test scaffold | ac85ffc | tests/checkoutReservation.test.ts |
| 2 | Wire reserve_pickup_slot into checkout route and update CheckoutClient | 0907581 | app/api/checkout/route.ts, components/CheckoutClient.tsx |

## What Was Built

**Checkout route (`app/api/checkout/route.ts`):**
- Extended `cartSchema` with `productName: z.union([z.literal("pulled_pork"), z.literal("brisket")]).optional()`
- After `publishInvoice` succeeds, quantities are aggregated by `productName` into a `Map<string, number>`
- One `supabase.rpc('reserve_pickup_slot', ...)` call per distinct product type (max 2)
- Reservation failure logged via `logError` but does not block checkout — returns 200 success

**CheckoutClient (`components/CheckoutClient.tsx`):**
- Added `productNameMap` useMemo that maps `variationId -> "pulled_pork" | "brisket"` by slugifying item names
- Cart payload in `handleSubmit` now spreads `productName` for meat items, omits it for sauce items

**Tests (`tests/checkoutReservation.test.ts`):**
- 6 tests covering: schema accepts pulled_pork, brisket, and no-productName (sauce); schema rejects invalid_meat; aggregation groups and sums; sauce items skipped in aggregation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error on reserveResult.ok**
- **Found during:** Task 2 build verification
- **Issue:** `supabase.rpc()` returns `Json` type per `database.types.ts`; accessing `.ok` directly causes TS error "Property 'ok' does not exist on type 'string'"
- **Fix:** Added inline cast `const reserveData = reserveResult as { ok: boolean; reason?: string } | null` before accessing `.ok`
- **Files modified:** app/api/checkout/route.ts
- **Commit:** 0907581

**2. [Rule 3 - Blocking] Worktree soft-reset deleted planning files and restored files from older base**
- **Found during:** Initial branch check
- **Issue:** Worktree HEAD was at 3840de6 (pre-phase-3 commits); soft-reset to b886233 staged all phase-3 planning files as deletions, which were committed with the test file
- **Fix:** Restored all planning files, ROADMAP.md, REQUIREMENTS.md, STATE.md from b886233 in a cleanup commit
- **Files modified:** All .planning/ files restored
- **Commit:** 540ff10

## Known Stubs

None — all wired logic flows to live Supabase RPC.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The `reserve_pickup_slot` RPC was already in the schema; this plan only wires the existing RPC into the checkout route. Threat mitigations T-03-01 through T-03-04 are all implemented:
- T-03-01: Zod union literal on productName — only `"pulled_pork"` and `"brisket"` accepted
- T-03-02: `z.number().int().positive()` on quantity already present
- T-03-03: Max 2 RPC calls bounded by product type count
- T-03-04: RPC failure details logged server-side; client receives generic success response

## Self-Check: PASSED

All created files exist on disk. All task commits (ac85ffc, 0907581) found in git log.
