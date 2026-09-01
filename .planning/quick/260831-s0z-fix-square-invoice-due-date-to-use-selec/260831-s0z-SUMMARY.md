---
phase: quick-260831-s0z
plan: 01
subsystem: payments
tags: [square, checkout, invoices, vitest, tdd]

requires: []
provides:
  - Square invoice due_date sourced from the customer's selected pickup date instead of the checkout timestamp
affects: [checkout, invoicing]

tech-stack:
  added: []
  patterns: [TDD RED/GREEN commit pairing for a one-line logic fix]

key-files:
  created:
    - tests/checkoutInvoiceDueDate.test.ts
  modified:
    - app/api/checkout/route.ts

key-decisions:
  - "due_date is read directly off pickupRow.pickup_date with no intermediate variable, fallback, or date parsing, since the column is a non-nullable Postgres date already in YYYY-MM-DD format"
  - "A pickup date in the past for an active drop is an accepted risk (operator data problem), not handled by a clamp — Square rejecting the invoice with a 4xx is a louder, safer failure than the prior silent-today behavior"

requirements-completed: [QUICK-260831-s0z]

duration: 3min
completed: 2026-08-31
---

# Quick Task 260831-s0z: Fix Square Invoice Due Date Summary

**Square invoice `due_date` now reads `pickupRow.pickup_date` instead of `new Date().toISOString().slice(0, 10)`, so invoices are due on the customer's chosen pickup day rather than the day checkout happened.**

## Performance

- **Duration:** ~3 min (test commit to fix commit)
- **Started:** 2026-08-31T20:14:00-06:00 (approx.)
- **Completed:** 2026-08-31T20:14:36-06:00
- **Tasks:** 2 (1 TDD implementation task, 1 verification-only task)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Regression test (`tests/checkoutInvoiceDueDate.test.ts`) proves the invoice `due_date` tracks the selected pickup option's `pickup_date`, not the clock
- Removed the last `new Date()` usage from the invoice due-date path in `app/api/checkout/route.ts`
- Confirmed zero regressions across the full 278-test Vitest suite and a clean `tsc --noEmit`

## Task Commits

TDD RED/GREEN pairing for Task 1; Task 2 was verification-only (no commit).

1. **Task 1 (RED): add failing test for invoice due date** - `6c983bd` (test)
2. **Task 1 (GREEN): source invoice due_date from selected pickup date** - `d799f89` (feat)
3. **Task 2: full suite + type-check verification** - no commit (verification-only, zero files modified, zero regressions found)

## Files Created/Modified
- `tests/checkoutInvoiceDueDate.test.ts` - Three-test regression suite proving `due_date` in the `createInvoice` call body equals the pickup option's `pickup_date`, is not today's date, and tracks a second differing fixture date
- `app/api/checkout/route.ts` - Deleted `const dueDate = new Date().toISOString().slice(0, 10);` and changed `payment_requests[0].due_date` to read `pickupRow.pickup_date` directly

## Decisions Made
- Read `pickup_date` directly with no intermediate variable, null-coalesce, or date formatting — the column is a non-nullable Postgres `date` already in `YYYY-MM-DD`, matching Square's expected format exactly
- Left the past-pickup-date degenerate case unhandled per the plan's threat model (accepted risk T-s0z-02) — it's an operator drop-lifecycle problem, not a checkout-route concern

## Deviations from Plan

None - plan executed exactly as written. TDD gate sequence followed: RED commit (`6c983bd`, all 3 tests failing against old code with the actual `2026-09-01` clock date vs. expected `2099-06-01`/`2099-09-15` fixture dates) then GREEN commit (`d799f89`, all 3 tests passing).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. This is a server-side logic change with no new environment variables, dependencies, or schema changes.

## Next Phase Readiness
- No blockers. The fix is isolated to `app/api/checkout/route.ts` (one line) and the invoice due-date behavior is now locked in by a dedicated regression test.
- `grep -c 'dueDate' app/api/checkout/route.ts` returns 0; `grep -n 'due_date' app/api/checkout/route.ts` shows exactly one match: `due_date: pickupRow.pickup_date`.

---
*Quick task: 260831-s0z*
*Completed: 2026-08-31*

## Self-Check: PASSED

- FOUND: tests/checkoutInvoiceDueDate.test.ts
- FOUND: app/api/checkout/route.ts
- FOUND: 6c983bd
- FOUND: d799f89
