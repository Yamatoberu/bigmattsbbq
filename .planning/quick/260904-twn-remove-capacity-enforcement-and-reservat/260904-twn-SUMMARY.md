---
phase: quick-260904-twn
plan: 01
subsystem: checkout
tags: [supabase, checkout, drops, capacity, reservation, migration]

# Dependency graph
requires: []
provides:
  - "Checkout route with zero reservation RPCs and no capacity gating"
  - "DropDTO/PickupOptionDTO reduced to a minimal shape with no capacity or sold-out fields"
  - "supabase/migrations/0005_remove_capacity_enforcement.sql (not yet applied to any Supabase project)"
affects: [checkout-rewrite-9-10, drops-schema]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration ordering: drop RPC functions before dropping the columns their bodies reference (Postgres does not dependency-track plpgsql function bodies)"

key-files:
  created:
    - supabase/migrations/0005_remove_capacity_enforcement.sql
  modified:
    - app/api/checkout/route.ts
    - lib/drops.ts
    - lib/types.ts
    - components/OrderLanding.tsx
    - components/CheckoutClient.tsx
    - app/api/test-seed/route.ts
    - lib/database.types.ts
    - tests/checkoutDropGate.test.ts
    - tests/checkoutLineItems.test.ts
    - tests/checkoutInvoiceDueDate.test.ts
    - tests/checkoutSlack.test.ts
    - tests/drops.test.ts
    - tests/storefront-state.test.ts
    - e2e/fixtures/activeDrop.ts
    - e2e/browseFrozenItems.spec.ts

key-decisions:
  - "D-1: dropped the capacity/reserved columns and capacity_enforced via a new migration rather than leaving them dormant; both reservation RPCs dropped in the same migration since their bodies reference the dropped columns"
  - "D-2: removed DropDTO.capacity, DropDTO.soldOut, DropDTO.capacityEnforced, CapacitySlot, and PickupOptionDTO.isSoldOut outright — no data source remains to populate them"
  - "D-3: kept the soldOut? prop on PackageCard/FrozenItemCard and components/SoldOutCapture.tsx untouched, defaulting to false, preserving the mailing-list capture UI for a future sold-out signal"
  - "D-4: migration file is committed but NOT applied to any Supabase project — applying it is a manual, ordered human step that must happen after the code deploy (see human-check in the plan)"

requirements-completed: [ISSUE-13]

# Metrics
duration: ~25min
completed: 2026-09-05
---

# Quick Task 260904-twn: Remove Capacity Enforcement and Reservation System Summary

**Removed the entire per-drop/per-pickup-option capacity reservation system (both the write-side RPC calls in checkout and the read-side capacity fields on DropDTO) from code, and added a forward-only migration that drops the two reservation RPC functions and all 25 capacity/reserved/capacity_enforced columns — not yet applied to Supabase.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-04T21:35:00Z (approx)
- **Completed:** 2026-09-05T03:44:18Z
- **Tasks:** 3/3 completed
- **Files modified:** 17 (2 created: migration + this summary; 1 deleted: tests/checkoutReservation.test.ts; 14 modified)

## Accomplishments
- `POST /api/checkout` no longer calls `supabase.rpc()` at all — no reservation, no rollback, no 409 sold-out branch
- `checkDropReady` gates purely on drop existence, `status`, and `order_cutoff_at`
- `DropDTO` is now exactly `{ id, title, status, orderCutoffAt, pickupOptions }`; every pickup option is selectable in `CheckoutClient`
- `supabase/migrations/0005_remove_capacity_enforcement.sql` drops both RPC functions first, then all 25 columns across `drops` and `drop_pickup_options`, entirely with `if exists` for idempotency
- Full test suite (263 tests across 28 files) and `npm run build` both pass with zero capacity/reservation identifiers left in `app/`, `lib/`, `components/`, `tests/`, or `e2e/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip reservation and capacity enforcement from the checkout route** - `9e20fed` (feat)
2. **Task 2: Remove the capacity surface from DropDTO and every consumer** - `d06e706` (feat)
3. **Task 3: Add the drop migration, clean generated types, and verify end to end** - `e30c4f4` (feat)

_Docs commit (SUMMARY.md/STATE.md) handled separately by the orchestrator, not by this executor._

## Files Created/Modified
- `app/api/checkout/route.ts` - Removed `releaseReserved()`, both RPC calls, the capacity precheck/reservation blocks, and the `totals` aggregation; narrowed `drops`/`drop_pickup_options` selects to non-capacity columns
- `lib/drops.ts` - `checkDropReady`/`DropReadinessRow` narrowed to status+cutoff only; `fetchActiveDrop` narrowed selects and return shape, dropping `capacity`, `soldOut`, `capacityEnforced`
- `lib/types.ts` - Deleted `CapacitySlot`, `PickupOptionDTO.isSoldOut`, and `DropDTO.capacity`/`soldOut`/`capacityEnforced`
- `components/OrderLanding.tsx` - Removed `pkgSoldOutMap`/`pkgSoldOut`/`itemSoldOut` derivations and the `soldOut` props passed to `PackageCard`/`FrozenItemCard`
- `components/CheckoutClient.tsx` - `drop.pickupOptions[0]` replaces the `!o.isSoldOut` find; removed the `disabled` state and "Sold Out" badge from pickup option buttons
- `app/api/test-seed/route.ts` - Narrowed `drops`/`drop_pickup_options` selects to non-capacity columns
- `lib/database.types.ts` - Hand-edited: removed all `capacity_*`/`reserved_*`/`capacity_enforced` keys from `drops`/`drop_pickup_options` Row/Insert/Update blocks, and removed `reserve_pickup_slot`/`release_pickup_slot` from the `Functions` block. **This file must be regenerated from the live Supabase schema once migration 0005 is applied** — the hand-edit is a stopgap so TypeScript compiles against the post-migration shape before the migration actually runs.
- `supabase/migrations/0005_remove_capacity_enforcement.sql` (new) - Drops `reserve_pickup_slot`/`release_pickup_slot` first, then all 25 capacity/reserved/capacity_enforced columns from `drops` and `drop_pickup_options`, all `if exists`, no `cascade`, no rollback section (forward-only, matching 0001–0004)
- `tests/checkoutReservation.test.ts` (deleted) - Every case asserted reservation behavior that no longer exists
- `tests/checkoutDropGate.test.ts` - Stripped capacity fixtures; removed the three capacity-semantics cases; kept all status/cutoff cases
- `tests/checkoutLineItems.test.ts`, `tests/checkoutInvoiceDueDate.test.ts`, `tests/checkoutSlack.test.ts` - Removed capacity fixtures and the `rpc` mock/mockResolvedValue setup; behavior assertions unchanged
- `tests/drops.test.ts` - Removed capacity/soldOut/isSoldOut/capacityEnforced fixtures and assertions; kept active-drop selection, null-drop, and error-propagation cases
- `tests/storefront-state.test.ts` - Removed the `capacity` block/`isSoldOut` field from the DropDTO-shaped literal and its assertion
- `e2e/fixtures/activeDrop.ts` - Deleted `slot()`, the `capacity`/`soldOut` blocks, `capacityEnforced`, `isSoldOut`, and the `withSoldOut()` export
- `e2e/browseFrozenItems.spec.ts` - Deleted the `withSoldOut` import and the now-unreachable "sold-out item swaps add-to-cart for the notify capture" test

## Decisions Made
See `key-decisions` in frontmatter (D-1 through D-4, inherited from the plan's `<decisions>` section — no new decisions were made during execution beyond what the plan specified).

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues were found beyond what the plan anticipated.

### Other Deviations

**1. Task 1 automated `<verify>` grep scope was broader than Task 1's action scope**
- **Found during:** Task 1 verification
- **Issue:** The plan's Task 1 `<verify>` command greps `app/api/checkout/route.ts lib/drops.ts tests/` for capacity/reservation identifiers and expects `0` matches. But Task 1's own `<action>` explicitly instructs "do not touch `fetchActiveDrop` in this task" (that's Task 2's job), and `fetchActiveDrop` in `lib/drops.ts` still referenced `capacity_enforced`/`capacityEnforced` at that point, as did `tests/drops.test.ts` (also explicitly scoped to Task 2). Running the literal Task 1 verify command therefore printed `20`, not `0`.
- **Resolution:** Verified the narrower scope the action section actually describes — `app/api/checkout/route.ts` plus the four edited checkout test files — which returned zero matches, alongside `tsc --noEmit` and the four checkout test files all passing. Proceeded to Task 2, which closed the remaining `fetchActiveDrop`/`tests/drops.test.ts` references. The full repo-wide dead-identifier gate (run after Task 3, per the plan's top-level `<verification>` section) confirmed `0` matches across `app/ lib/ components/ tests/ e2e/`.
- **Files affected:** None (verification-only; no code change required beyond what Tasks 1–2 already specified).
- **Committed in:** N/A (documentation-only observation, not a code fix)

**2. `npm run lint` fails with a pre-existing, unrelated tooling error**
- **Found during:** Task 3 verification (`npm run lint` from the plan's top-level `<verification>` block)
- **Issue:** `npm run lint` invokes `next lint`, which errors with `Invalid project directory provided, no such directory: /home/mgregory/Development/bigmattsbbq/lint`. This is unrelated to this task's changes — CLAUDE.md confirms no ESLint config file exists in the repo, and this is a known Next.js 16 behavior when no ESLint setup is present.
- **Resolution:** Left as-is per the deviation rules' scope boundary ("Only auto-fix issues DIRECTLY caused by the current task's changes"). Not fixed; not part of this task's file list.
- **Files affected:** None
- **Committed in:** N/A (pre-existing, out of scope)

## Known Stubs

None. This task only removed code (reservation RPCs, capacity fields, sold-out derivations); no new stubs, placeholders, or unwired data sources were introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries were introduced beyond what the plan's `<threat_model>` already documents (T-twn-01 through T-twn-04, all addressed by the plan's own task sequencing and D-4).

## Verification Evidence

```
npx tsc --noEmit                    → clean, no errors
npm run test                        → 28 files, 263 tests passed
npm run build                       → Compiled successfully, all 23 routes generated
npm run lint                        → pre-existing failure, unrelated to this task (see Deviations #2)
```

Repo-wide dead-identifier gate (`capacity_*`, `reserved_*`, `capacity_enforced`, `capacityEnforced`,
`isSoldOut`, `CapacitySlot`, `reserve_pickup_slot`, `release_pickup_slot` across `app/ lib/
components/ tests/ e2e/`): **0 matches**.

`grep -q 'drop function if exists public.reserve_pickup_slot' supabase/migrations/0005_remove_capacity_enforcement.sql` → match found.

`components/SoldOutCapture.tsx` and the `soldOut` props on `PackageCard`/`FrozenItemCard` confirmed still present (D-3).

## Human Verification Required

**Migration application is a manual, ordered step — this executor did NOT apply
`supabase/migrations/0005_remove_capacity_enforcement.sql` to any Supabase project,
per plan decision D-4 and the constraint given for this task.**

Before applying `0005`, in order:
1. Merge and deploy this code change to Vercel. Confirm the homepage loads an active
   drop and `/api/drop` returns 200.
2. Take a Supabase point-in-time snapshot/backup (mitigates T-twn-02 — the column drop
   is irreversible).
3. Apply `0005` to the Supabase **sandbox** project first. Re-check the homepage,
   `/api/test-seed`, and a full sandbox checkout end-to-end (order created, invoice
   emailed, Slack notification fires).
4. Only then apply `0005` to production.
5. Regenerate `lib/database.types.ts` from the live schema and confirm it matches the
   hand-edit made in this task's Task 3.

Applying `0005` before step 1 will 500 the storefront (`GET /api/drop` would fail with
a PostgREST "column does not exist" error) — this ordering constraint is unchanged from
the plan's own `<human-check>` block.

## Self-Check: PASSED

- `supabase/migrations/0005_remove_capacity_enforcement.sql` — FOUND
- `app/api/checkout/route.ts` — FOUND, no `supabase.rpc` call present
- `lib/drops.ts` — FOUND, `DropReadinessRow` reduced to `{ status, order_cutoff_at }`
- `lib/types.ts` — FOUND, `DropDTO` reduced to `{ id, title, status, orderCutoffAt, pickupOptions }`
- `tests/checkoutReservation.test.ts` — CONFIRMED ABSENT (git rm'd in commit `9e20fed`)
- Commit `9e20fed` — FOUND in git log
- Commit `d06e706` — FOUND in git log
- Commit `e30c4f4` — FOUND in git log
