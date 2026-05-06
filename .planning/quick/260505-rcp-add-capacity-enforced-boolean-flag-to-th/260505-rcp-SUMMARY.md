---
phase: 260505-rcp
plan: "01"
subsystem: drops/checkout/capacity
tags: [capacity, drops, supabase, checkout, feature-flag]
dependency_graph:
  requires: []
  provides: [capacity_enforced_flag]
  affects: [drops, checkout, order-landing]
tech_stack:
  added: []
  patterns: [feature-flag via DB column, guard wrapping, DTO field forwarding]
key_files:
  created:
    - supabase/migrations/0003_capacity_enforced.sql
  modified:
    - lib/types.ts
    - lib/drops.ts
    - lib/database.types.ts
    - app/api/checkout/route.ts
    - tests/drops.test.ts
    - tests/checkoutDropGate.test.ts
decisions:
  - "capacity_enforced defaults to true so existing behavior is fully preserved without any data migration"
  - "soldOut booleans forced to false in fetchActiveDrop when capacity_enforced=false so UI never disables items via Supabase capacity path"
  - "checkDropReady short-circuits after status/cutoff gates but before globallySoldOut gate to preserve status enforcement"
  - "reservation loop wrapped with if (capacityEnforced) so empty reserved array naturally no-ops all rollback sites"
  - "database.types.ts updated manually to reflect migration (column not yet applied to remote Supabase)"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-05"
  tasks_completed: 2
  files_changed: 7
---

# Phase 260505-rcp Plan 01: Add capacity_enforced Flag to Drops — Summary

One-liner: Adds a `capacity_enforced BOOLEAN NOT NULL DEFAULT true` column to `public.drops` and threads it through `DropDTO`, `fetchActiveDrop`, `checkDropReady`, and the checkout route so a drop can opt out of all Supabase capacity gates while leaving Square inventory checks untouched.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add column, thread through types and lib/drops.ts | 87e3a5a | 0003_capacity_enforced.sql, lib/types.ts, lib/drops.ts, tests/drops.test.ts, tests/checkoutDropGate.test.ts |
| 2 | Wire through checkout route and database types | b361ca3 | app/api/checkout/route.ts, lib/database.types.ts |

## Verification

- `npx vitest run` — 61 tests pass (12 test files)
- `npx tsc --noEmit` — compiles cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated lib/database.types.ts to include capacity_enforced**
- **Found during:** Task 2 (TypeScript compile)
- **Issue:** Supabase generated types in `lib/database.types.ts` did not include `capacity_enforced` on the `drops` Row/Insert/Update shapes. This caused `SelectQueryError` from the Supabase typed client because the column was in the select string but not known to the type system.
- **Fix:** Added `capacity_enforced: boolean` to `drops.Row`, `capacity_enforced?: boolean` to `drops.Insert` and `drops.Update` in `lib/database.types.ts`.
- **Files modified:** `lib/database.types.ts`
- **Commit:** b361ca3

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced. The `capacity_enforced` column is read-only from the application layer; it can only be set by a Supabase admin/migration.

## Self-Check: PASSED

- supabase/migrations/0003_capacity_enforced.sql: FOUND
- lib/types.ts (capacityEnforced field): FOUND
- lib/drops.ts (capacity_enforced select + map + gate): FOUND
- lib/database.types.ts (capacity_enforced in drops Row): FOUND
- app/api/checkout/route.ts (capacityEnforced guard): FOUND
- Commit 87e3a5a: FOUND
- Commit b361ca3: FOUND
