---
phase: 10-core-browsing-dashboard-competitions-cook-detail
plan: 11
subsystem: ui
tags: [nextjs, typescript, sca, comparison-table, gap-closure]

# Dependency graph
requires:
  - phase: 10-core-browsing-dashboard-competitions-cook-detail
    provides: buildComparisonTable (Plan 03), Competition detail page (Plan 04), Dashboard (Plan 06)
provides:
  - "ComparisonTableOptions view-model contract with aggregateSource and aggregateScopeLabel"
  - "buildComparisonTable supports computing Worst/Best/Cook Averages from a set separate from the displayed columns"
  - "Competition detail compares event cooks against all-time aggregates, closing G-10-2"
affects: [competition-detail, dashboard, comparison-table]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildComparisonTable(cooks, options) accepts an optional aggregateSource that defaults to cooks, keeping existing call sites (Dashboard) byte-identical while letting new call sites (Competition detail) widen the aggregate scope"
    - "aggregateScopeLabel appends a parenthetical suffix to aggregate column labels only, never to cook-kind column labels or row labels"

key-files:
  created: []
  modified:
    - lib/sca/types.ts
    - lib/sca/comparison.ts
    - tests/sca-comparison.test.ts
    - app/sca/competitions/[id]/page.tsx

key-decisions:
  - "aggregateSource defaults to the cooks argument when omitted, so the Dashboard's existing buildComparisonTable(cooks, { aggregates: true }) call needed zero changes and is byte-for-byte unchanged"
  - "Competition detail's single try/catch now Promise.all's getCompetitionWithCooks and getAllCooksWithScores in parallel rather than adding a second try/catch, keeping the locked generic error message and avoiding an extra network round trip in series"
  - "On-screen disambiguation paragraph added above the comparison table (not just the (All Time) label suffix) so the widened scope cannot be misread as event-scoped, per the plan's explicit requirement"

requirements-completed: [COMP-03]

# Metrics
duration: 8min
completed: 2026-08-24
---

# Phase 10 Plan 11: Competition Detail All-Time Aggregate Comparison Summary

**Gave `buildComparisonTable` a separable `aggregateSource`/`aggregateScopeLabel`, and pointed Competition detail's Worst/Best/Cook Averages columns at every recorded cook instead of just that event's own cooks, closing G-10-2 without touching the Dashboard's output.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-24T18:21:00Z
- **Completed:** 2026-08-24T18:29:13Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- `buildComparisonTable` now accepts an optional `aggregateSource` (defaults to `cooks`, preserving Dashboard behavior exactly) and an optional `aggregateScopeLabel` that appends a scope suffix to the three aggregate column labels only
- Competition detail (`app/sca/competitions/[id]/page.tsx`) fetches `getAllCooksWithScores()` in parallel with `getCompetitionWithCooks()` via `Promise.all`, and passes `{ aggregates: true, aggregateSource: allCooks, aggregateScopeLabel: "All Time" }` — a single-cook competition's Worst/Best/Average columns no longer echo that cook's own score
- Added an on-screen disambiguation paragraph above the comparison table and updated the table caption so the widened scope reads as intentional, not a bug
- 8 new regression tests added to `tests/sca-comparison.test.ts` (26 total, all passing), including the exact G-10-2 regression case: a single-cook comparison against a three-cook aggregate source where the average `total_score` cell differs from the cook's own cell
- Verified against live data (competition 4, the single-cook case cited in the UAT): rendered HTML contains `Best Cook (All Time)`, `Worst Cook (All Time)`, `Cook Averages (All Time)`
- Verified the Dashboard (`/sca`) still renders unsuffixed `Worst Cook` / `Best Cook` / `Cook Averages` labels with zero occurrences of "All Time" in its rendered output

## Task Commits

1. **Task 1: Give buildComparisonTable a separable aggregate source and scope label** - `37bada5` (feat)
2. **Task 2: Point Competition detail at the all-time aggregate** - `7a8e2ed` (feat)

**Plan metadata:** (pending — this summary's commit)

## Files Created/Modified
- `lib/sca/types.ts` - Added exported `ComparisonTableOptions` interface (`aggregates`, `aggregateSource?`, `aggregateScopeLabel?`) directly beneath `ComparisonTableModel`
- `lib/sca/comparison.ts` - `buildComparisonTable` signature now takes `ComparisonTableOptions`; aggregate branch resolves `aggregateSource = options.aggregateSource ?? cooks` and appends `scopeSuffix` to the three aggregate column labels; `computeBestWorstAverage`/`buildAverageCells` now called with `aggregateSource` instead of `cooks`
- `tests/sca-comparison.test.ts` - Added `describe("buildComparisonTable aggregate source", ...)` block with 8 new tests covering: no-source-provided parity with Dashboard, the G-10-2 regression (average differs from single cook's own score), worst/best hrefs pointing at the wider source, worst/best rows showing the source cook's own competition/date, scope label suffix applied only to aggregate columns, suffix omission, empty-source em-dash/null-href rendering, and non-mutation of the source array with correct column count
- `app/sca/competitions/[id]/page.tsx` - Imports `getAllCooksWithScores` and `CookWithScore`; declares `allCooks`; single try block now `Promise.all`s both queries; `buildComparisonTable` call passes `aggregateSource: allCooks, aggregateScopeLabel: "All Time"`; caption text updated; added a `mb-3 text-sm text-smoke-800` disambiguation paragraph above the table in the non-empty branch

## Decisions Made
- Kept the Dashboard's call site (`app/sca/page.tsx`) completely untouched — the default-to-`cooks` behavior of `aggregateSource` means zero code change was needed there, and this was verified both by a dedicated unit test and by live HTML diffing against the running dev server
- Used `Promise.all` inside the existing single try/catch rather than adding a second try/catch, per the plan's explicit instruction and to avoid a second generic-error code path (keeps the locked error string and `logError` call-site count at one)
- Column `key`/`kind` values (`worst`/`best`/`average`) were left unchanged since `ComparisonTable`'s Best-column accent styling keys off `kind`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `npx tsc --noEmit`, `npm run build`, and `npm run test` (224 tests across 24 files) all passed on the first attempt after implementation. `npm run lint` failed with a pre-existing, unrelated "Invalid project directory" error from `next lint` (not caused by this plan's changes and not part of this plan's verification gates) — left untouched, out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- G-10-2 is closed; COMP-03 requirement is complete
- `buildComparisonTable`'s `aggregateSource`/`aggregateScopeLabel` pattern is reusable by any future call site needing a comparison scoped differently from its displayed columns
- No blockers for remaining Phase 10/11 work

---
*Phase: 10-core-browsing-dashboard-competitions-cook-detail*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created/modified files verified present; both task commits (`37bada5`, `7a8e2ed`) verified present in git log.
