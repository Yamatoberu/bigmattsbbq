---
status: resolved
phase: 10-core-browsing-dashboard-competitions-cook-detail
source: [10-09-PLAN.md Task 2 human verification]
started: 2026-08-24T00:48:00-06:00
updated: 2026-08-24T12:45:00-06:00
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

## Re-verification (10-12, gap closure round)

status: approved
verified: 2026-08-24

Both gaps closed by 10-10 (G-10-1) and 10-11 (G-10-2). Re-tested against live Supabase data (21 cooks, 14 competitions; single-cook competition id 4, multi-cook id 1) with the dev server running:

1. **G-10-1** — `/sca/cooks` index lists all 21 cooks newest-first with working `View Cook` links; nav bar reads Dashboard · Competitions · Cooks; Cooks link stays highlighted on cook detail pages. Developer confirmed.
2. **G-10-2** — `/sca/competitions/4` (single-cook) shows `Worst Cook (All Time)`, `Best Cook (All Time)`, `Cook Averages (All Time)`; Cook Averages Total Score (245.08) differs from the single cook's own Total Score (232.5). `/sca/competitions/1` (multi-cook) still lists every cook plus all-time aggregates. Developer confirmed.
3. **Non-regression** — Dashboard's aggregate columns carry no `(All Time)` suffix and are unchanged; Competitions list, Cook Detail, 404 handling, and storefront pages render as before. Developer confirmed.

Developer verdict: **approved**. No new gaps.
