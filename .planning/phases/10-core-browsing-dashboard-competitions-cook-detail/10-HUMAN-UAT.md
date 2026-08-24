---
status: diagnosed
phase: 10-core-browsing-dashboard-competitions-cook-detail
source: [10-09-PLAN.md Task 2 human verification]
started: 2026-08-24T00:48:00-06:00
updated: 2026-08-24T00:52:00-06:00
---

## Current Test

[complete — developer reported issues instead of "approved"]

## Tests

### 1. Cook detail discoverability
expected: There is a reasonably discoverable way to browse to individual cook detail pages, not only by already knowing a cook's presence in a comparison table.
result: ISSUE — the only entry points to `/sca/cooks/[id]` are clicking a cook column header inside a `ComparisonTable` (rendered on the Dashboard or a Competition detail page). There is no cooks index/list page and no other link anywhere in the app that surfaces an individual cook without first landing on a comparison table.

### 2. Competition detail comparison scope
expected: Per developer feedback — the competition detail page should show only the scores from the selected competition's cook(s), compared against the chef's rolling/overall average (the same kind of average used on the Dashboard), rather than recomputing Worst Cook / Best Cook / Cook Averages from just that competition's own (often single-cook) set.
result: ISSUE — `app/sca/competitions/[id]/page.tsx` calls `buildComparisonTable(competition.cook, { aggregates: true })`, so Worst/Best/Cook Averages are derived from `competition.cook` only. For a single-cook competition (the common case in the live data — e.g. competition 4), this makes the Worst/Best/Average columns identical to the one cook's own score, which is redundant and not useful. The developer wants the comparison to be against the overall/rolling average across all recorded cooks instead.

## Summary

total: 2
passed: 0
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- id: G-10-1
  category: navigation
  description: "No way to browse to a cook's detail page except via a comparison table column header — no cooks index/list page exists."
  affected_requirement: COOK-01
  affected_files: ["app/sca/", "components/sca/ScaNavBar.tsx"]
  suggested_fix: "Add a discoverable navigation path to cook detail pages — e.g. a Cooks index/list page and/or a nav entry, or make cook rows/links more prominent on existing pages."

- id: G-10-2
  category: ux / data-modeling
  description: "Competition detail's comparison table computes Worst Cook / Best Cook / Cook Averages from only that competition's own cooks, which is degenerate for single-cook competitions. Developer wants the competition's cook(s) compared against the chef's overall/rolling average instead."
  affected_requirement: COMP-03
  affected_files: ["app/sca/competitions/[id]/page.tsx", "lib/sca/comparison.ts"]
  suggested_fix: "On Competition detail, pass the overall/global aggregate (computed once across all cooks, same source as the Dashboard's Cook Averages) into the comparison table instead of recomputing Worst/Best/Average scoped to just this competition's cooks."
