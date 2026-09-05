---
phase: quick-260904-uyl
plan: 01
subsystem: checkout / drops data layer
tags: [supabase, migrations, timezone, checkout, pickup]
dependency-graph:
  requires: []
  provides:
    - lib/timezone.ts (PICKUP_TIME_ZONE, zonedNoonToUtcISO)
    - lib/drops.ts formatPickupWindow
    - drop_pickup_options.pickup_start_date / pickup_end_date (expand migration only)
    - orders.assigned_pickup_date (dormant)
  affects:
    - app/api/checkout/route.ts
    - components/CheckoutClient.tsx
    - lib/drops.ts, lib/types.ts, lib/database.types.ts
tech-stack:
  added: []
  patterns:
    - Intl.DateTimeFormat-based per-date UTC-offset computation (no hardcoded offsets)
    - Expand/contract migration split for schema changes that both add and remove column reads in one deploy
key-files:
  created:
    - lib/timezone.ts
    - tests/timezone.test.ts
    - supabase/migrations/0006_pickup_windows.sql
    - supabase/migrations/0007_drop_pickup_at.sql
  modified:
    - lib/database.types.ts
    - lib/drops.ts
    - lib/types.ts
    - components/CheckoutClient.tsx
    - app/api/checkout/route.ts
    - e2e/fixtures/activeDrop.ts
    - tests/drops.test.ts
    - tests/storefront-state.test.ts
    - tests/checkoutSlack.test.ts
    - tests/checkoutInvoiceDueDate.test.ts
    - tests/checkoutLineItems.test.ts
decisions:
  - "pickup_date is left byte-for-byte untouched (D-1) — still the invoice due_date, still the fetchActiveDrop sort key"
  - "pickup_at is dropped in this task rather than deferred to issue #10 (D-3), with consumers rewired now"
  - "Customer-facing time-of-day is removed, not replaced (D-4) — the checkout pickup card shows only a date window"
  - "Square's required pickup_details.pickup_at instant is synthesized as noon America/Denver on pickup_start_date via a DST-correct Intl-based helper (D-5)"
  - "Migration split into expand (0006, additive) and contract (0007, drops pickup_at), applied manually in an order that differs from quick task 260904-twn's single-step pattern, because this change both adds and removes column reads in the same deploy"
  - "Neither migration was applied to Supabase by the executor — both are committed only, per the plan's <human-check>"
metrics:
  duration: ~35min
  completed: 2026-09-05
---

# Phase quick-260904-uyl Plan 01: Add pickup-window columns to drop_pickup_options Summary

Replaces the ambiguous `drop_pickup_options.pickup_at` timestamptz (which could disagree
with `pickup_date` by a calendar day) with an explicit `pickup_start_date` /
`pickup_end_date` window, a DST-correct helper for synthesizing Square's required pickup
instant, and a shared window-label formatter used by both the storefront and the
checkout route.

## What Was Built

**Task 1 — `lib/timezone.ts` + additive types.** New dependency-free module exporting
`PICKUP_TIME_ZONE` ("America/Denver") and `zonedNoonToUtcISO(date, timeZone)`, which
computes noon-local-to-UTC via the standard `Intl.DateTimeFormat` offset-diff technique
(no hardcoded UTC offset literal, verified by grep gate). `tests/timezone.test.ts` proves
both MST (`2026-01-15` → `19:00:00.000Z`) and MDT (`2026-07-15` → `18:00:00.000Z`)
instants, plus both DST transition days. `lib/database.types.ts` additively gained
`pickup_start_date`/`pickup_end_date` on `drop_pickup_options` and
`assigned_pickup_date` on `orders`, while `pickup_at` stayed in place so the tree kept
compiling.

**Task 2 — window-label formatter, read side rewired.** `formatPickupDate` was
rewritten to take a date-only `YYYY-MM-DD` string and format via `Date.UTC` +
`timeZone: "UTC"` — this is the fix for the `<date_only_trap>` off-by-one bug (a naive
`new Date("2026-09-03")` parsed as UTC midnight would render as "Sep 2" in
America/Denver). A regression test asserts `formatPickupDate("2026-09-03") === "Sep 3"`.
Added `formatPickupWindow(startDate, endDate)`, returning a single date when equal or an
en-dash (`U+2013`) range otherwise. `fetchActiveDrop` now selects the window columns,
orders by `pickup_date`, and emits `PickupOptionDTO` with no `pickupAtISO`.
`CheckoutClient`'s pickup-option card no longer renders any time of day (D-4).

**Task 3 — checkout route rewired, Square instant synthesized.** `app/api/checkout/route.ts`
now selects the window columns instead of `pickup_at`, derives `pickupDateLabel` via
the shared `formatPickupWindow` (deleting the second instance of the date-only trap that
was inlined here), and synthesizes `pickup_details.pickup_at` for Square as
`zonedNoonToUtcISO(pickupRow.pickup_start_date, PICKUP_TIME_ZONE)`. `due_date:
pickupRow.pickup_date` is untouched (D-1). Added a multi-day Slack notification
regression test asserting the window label (`"Jun 1 – Jun 3"`) appears in the pickup
line.

**Task 4 — migrations + type cleanup.** Two forward-only migrations:
`0006_pickup_windows.sql` (expand — adds nullable window columns, backfills from
`pickup_date`, promotes to `not null`, adds the `pickup_end_date >= pickup_start_date`
check constraint, adds dormant `orders.assigned_pickup_date`) and
`0007_drop_pickup_at.sql` (contract — drops `pickup_at`, with a header comment stating
the ordering prerequisite). `lib/database.types.ts` had `pickup_at` removed from
`drop_pickup_options` now that no consumer reads it. **Neither migration was applied to
Supabase** — both are committed only, per the plan's `<human-check>`; application is a
manual, ordered step (apply `0006` to sandbox, verify, apply `0006` to production,
verify, deploy code, verify end to end, then apply `0007` to sandbox then production).

## Verification

- `npx tsc --noEmit` — clean after every task and at the end.
- `npm run test` — 29 test files, 275 tests, all passing (including the 4 new/changed
  test files and the pre-existing suite).
- `npm run build` — production build succeeds.
- Repo-wide dead-identifier gate (`grep -rn 'pickup_at\|pickupAtISO' app/ lib/
  components/ tests/ e2e/ | grep -v 'pickup_at: zonedNoonToUtcISO' | grep -c .`) — `0`.
- Expand-migration purity gate (no destructive statement in `0006` beyond the paired
  `drop constraint if exists`) — `0`.
- `grep -n '\-07:00\|\-06:00' lib/timezone.ts` — `0` (no hardcoded offset).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test-file mocks of `lib/drops` were missing `formatPickupWindow`**
- **Found during:** Task 3, running `tests/checkoutSlack.test.ts`,
  `tests/checkoutInvoiceDueDate.test.ts`, `tests/checkoutLineItems.test.ts`
- **Issue:** All three files had `vi.mock("../lib/drops", () => ({ checkDropReady: () =>
  ({ ok: true }) }))`. Once `app/api/checkout/route.ts` started importing
  `formatPickupWindow` from `lib/drops`, this mock would have returned `undefined` for
  that export, crashing the route at runtime. Not called out explicitly in the plan's
  task 3 action steps (which only described fixture-data edits for these files).
- **Fix:** Changed each mock to `vi.importActual` the real module and re-export its
  actual `formatPickupWindow` alongside the stubbed `checkDropReady`.
- **Files modified:** `tests/checkoutSlack.test.ts`, `tests/checkoutInvoiceDueDate.test.ts`,
  `tests/checkoutLineItems.test.ts`
- **Commit:** ca64411

**2. [Rule 3 - Blocking] Own draft unit test for the DST-offset invariant had a math bug**
- **Found during:** Task 1, first test run
- **Issue:** The "computes rather than hardcodes" invariant test compared raw millisecond
  timestamps between a January and a July date (6 months apart), so the ~15,638,400,000ms
  calendar gap swamped the 1-hour DST difference the test intended to isolate.
- **Fix:** Compared `getUTCHours()` of the two resulting instants (19 vs 18) instead of
  raw epoch millisecond deltas.
- **Files modified:** `tests/timezone.test.ts`
- **Commit:** 82ba690

### Out-of-scope, deferred

**`npm run lint` is broken independent of this task.** Running it prints `Invalid
project directory provided, no such directory: /home/mgregory/Development/bigmattsbbq/lint`
regardless of whether this task's changes are present (confirmed via `git stash` against
the pre-task commit). This is a pre-existing `next lint` / Next.js 16 CLI-argument
mismatch unrelated to any file this task touches. Logged to
`.planning/quick/260904-uyl-add-pickup-window-columns-to-drop-pickup/deferred-items.md`
and left unfixed per the scope boundary rule; not required by any Task 1-4 `<done>`
criterion.

**`next-env.d.ts` was regenerated by running `npm run build` for verification** (its
`.next/dev/types/routes.d.ts` reference briefly changed to `.next/types/routes.d.ts`).
This is a build-tool artifact, not a task deliverable — it was reverted with `git
checkout -- next-env.d.ts` before the Task 4 commit so no stray generated-file diff
landed in the history.

## Known Stubs

None. `orders.assigned_pickup_date` is intentionally dormant per D-2 (issue #7's job to
wire it up) — this is documented in the migration and the interfaces contract, not a
stub masking missing functionality for this task's own goal.

## Threat Flags

None. All new surface (the migrations, the timezone helper, the Square `pickup_at`
synthesis) was explicitly covered by the plan's `<threat_model>` STRIDE register
(T-uyl-01 through T-uyl-06); no additional trust-boundary surface was introduced beyond
what the plan anticipated.

## Self-Check: PASSED

Verified files exist:
- FOUND: lib/timezone.ts
- FOUND: tests/timezone.test.ts
- FOUND: supabase/migrations/0006_pickup_windows.sql
- FOUND: supabase/migrations/0007_drop_pickup_at.sql

Verified commits exist:
- FOUND: 82ba690 (Task 1)
- FOUND: 5ff74e2 (Task 2)
- FOUND: ca64411 (Task 3)
- FOUND: 1ca41db (Task 4)

## Manual Follow-Up Required

Per the plan's `<human-check>`, apply the migrations manually in this exact order
(this differs from quick task 260904-twn's single-step pattern — see the plan's
`<scope_note>` for why):

1. Snapshot/backup Supabase.
2. Apply `0006` only to sandbox; confirm homepage and `/api/drop` still 200.
3. Spot-check the backfill in sandbox (`pickup_start_date = pickup_end_date =
   pickup_date` on every row, no nulls).
4. Apply `0006` only to production; re-confirm the live homepage and `/api/drop`.
5. Deploy this code change; confirm checkout end to end (Square order with valid
   `pickup_at`, invoice `due_date` correct, Slack notification carries the window
   label, and the pickup card shows a date with no time).
6. Apply `0007` — sandbox first, re-verify, then production.
7. Regenerate `lib/database.types.ts` from the live schema and diff against this
   task's hand-edit to confirm agreement.
