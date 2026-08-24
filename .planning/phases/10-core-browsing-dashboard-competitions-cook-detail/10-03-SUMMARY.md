---
phase: 10-core-browsing-dashboard-competitions-cook-detail
plan: 03
subsystem: ui
tags: [typescript, vitest, sca, comparison-table, view-model]

requires:
  - phase: 10-01
    provides: lib/sca/types.ts (ComparisonColumn/Row/TableModel, ProcessField contracts), lib/sca/format.ts (EM_DASH, formatScoreValue, cookColumnLabel, formatCookDate)
  - phase: 10-02
    provides: lib/sca/aggregates.ts (computeBestWorstAverage, computeCategoryAverages)
provides:
  - lib/sca/comparison.ts buildComparisonTable — single shared comparison-table model builder for DASH-02/COMP-03 (D-01)
  - lib/sca/cookDetailFields.ts getPresentProcessFields — non-null process-variable selector for Cook Detail (D-09)
affects: [10-04, 10-05, 10-06, 10-07]

tech-stack:
  added: []
  patterns:
    - "Single pure model-builder function shared by two page contexts via an options flag (aggregates: boolean), preventing DASH-02/COMP-03 drift"
    - "Per-column cell maps keyed by ComparisonColumn.key, then rows assembled by iterating a fixed row-key order and pulling from each column's cell map — guarantees positional alignment"
    - "Ordered array (not object) contract for declared field order (PROCESS_FIELD_LABELS) so key order is an explicit, testable contract rather than incidental object-key order"

key-files:
  created:
    - lib/sca/comparison.ts
    - lib/sca/cookDetailFields.ts
    - tests/sca-comparison.test.ts
    - tests/sca-cook-detail-fields.test.ts
  modified: []

key-decisions:
  - "ProcessFieldKey is declared as an explicit 15-member string-literal union rather than Omit<ScaCookDetailRow, 'id'|'cook_id'|'created_at'|'updated_at'> — the Omit form would embed the metadata column names as quoted string literals in the file, tripping the acceptance-criteria grep that asserts those four names never appear in source"

requirements-completed: [DASH-02, COMP-03, COOK-01]

duration: 15min
completed: 2026-08-24
---

# Phase 10 Plan 03: Comparison Table Model & Cook Detail Process Fields Summary

**Single `buildComparisonTable` pure function producing the eleven-row DASH-02/COMP-03 comparison model (cook columns plus optional worst/best/average columns) reusing existing aggregate and scoring helpers, and `getPresentProcessFields` selecting only non-null `cook_detail` columns in a declared display order.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-24T20:39:00Z (approx)
- **Completed:** 2026-08-24T20:41:09Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 lib files created, 2 test files created)

## Accomplishments
- Built the one comparison-table model builder that both the Dashboard and Competition detail pages will call, with an `aggregates` flag toggling the trailing Worst/Best/Average columns — eliminating any chance of the two surfaces drifting within Phase 10
- Every cell emitted by `buildComparisonTable` is a display-ready string; missing values are always the em dash and `0` is always preserved, with zero null-handling required in the future rendering component
- Built `getPresentProcessFields`, returning `[]` for a missing `cook_detail` row so the Cook Detail page can show D-09's locked "no process detail" fallback copy, and only non-null fields (including real `0` values) in the declared 15-field order otherwise

## Task Commits

Each task was committed atomically via TDD (RED then GREEN):

1. **Task 1: Implement lib/sca/comparison.ts** - `78aea34` (test, RED) + `bb00fe5` (feat, GREEN)
2. **Task 2: Implement lib/sca/cookDetailFields.ts** - `fabc9f2` (test, RED) + `2c09d34` (feat, GREEN)

**Plan metadata:** committed separately (see final docs commit below)

## Files Created/Modified
- `lib/sca/comparison.ts` - `buildComparisonTable(cooks, { aggregates })` and `COMPARISON_ROW_LABELS`; builds cook columns (sorted ascending by `cooked_at`, tie-broken by `id`) plus optional worst/best/average columns, reusing `deriveScoreMetrics`, `computeBestWorstAverage`, `computeCategoryAverages`, `cookColumnLabel`, and `formatScoreValue`
- `lib/sca/cookDetailFields.ts` - `PROCESS_FIELD_LABELS` (ordered array of the 15 displayable `cook_detail` columns) and `getPresentProcessFields(detail)`, which skips null/undefined and blank-string values while retaining numeric `0`
- `tests/sca-comparison.test.ts` - 18 tests covering row order/labels, empty-input with/without aggregates, column ordering and label formula, no-score-row em-dash behavior, `total_score: 0` preservation, best/worst/average column cell sourcing, and a mixed-set NaN/undefined sweep
- `tests/sca-cook-detail-fields.test.ts` - 11 tests covering null/undefined/all-null rows, the real-cook-19 mixed-null field-order fixture, zero-value retention, blank-text exclusion, and metadata-column exclusion

## Decisions Made
- `ProcessFieldKey` is an explicit 15-member string-literal union instead of `Omit<ScaCookDetailRow, "id" | "cook_id" | "created_at" | "updated_at">` — the `Omit` form would put those four column names in the file as quoted strings, which fails the plan's acceptance-criteria grep asserting they never appear in `lib/sca/cookDetailFields.ts`
- Both modules use a single internal cell-building helper (`buildCookCells` in comparison.ts) shared across cook columns and the best/worst aggregate columns, so cell-formatting logic exists in exactly one place

## Deviations from Plan

None - plan executed exactly as written. The `ProcessFieldKey` typing choice above is an implementation detail within Task 2's own acceptance criteria, not a deviation from the plan's `<action>` instructions.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`buildComparisonTable` and `getPresentProcessFields` are ready for the Wave 3 rendering components (Dashboard, Competition detail, Cook detail pages) to import directly. Both are pure, dependency-free of I/O, and fully covered by unit tests. No blockers for 10-04 through 10-07.

---
*Phase: 10-core-browsing-dashboard-competitions-cook-detail*
*Completed: 2026-08-24*
