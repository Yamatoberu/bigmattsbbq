---
phase: 10-core-browsing-dashboard-competitions-cook-detail
plan: 08
subsystem: ui
tags: [nextjs, app-router, server-components, supabase, sca]

# Dependency graph
requires:
  - phase: 10-04
    provides: parseScaId, getCookWithDetails (null-on-PGRST116 contract), CookWithDetails type
  - phase: 10-05
    provides: presentational component conventions (.glass-card, section-spacing, drill-down link classes)
provides:
  - "app/sca/cooks/[id]/page.tsx — Cook Detail page (header, Score Breakdown, Process Variables, AI Reviews)"
  - "app/sca/not-found.tsx — on-brand 404 rendered inside the SCA ScaNavBar/ScaFooter shell"
affects: [11-analytics-ai-reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object-level null guard on cook.score before any field read (real cook 7 has score: null)"
    - "deriveScoreMetrics is the sole source of distance_from_winning/distance_from_perfect — never computed inline in page code"
    - "AI Reviews section always renders regardless of array length (D-10); empty-state copy is locked verbatim"

key-files:
  created:
    - app/sca/cooks/[id]/page.tsx
    - app/sca/not-found.tsx
  modified: []

key-decisions:
  - "Cook page header falls back to cookColumnLabel(competition?.name, steak_label) when steak_label is null, so the h1 is never an empty string"
  - "Competition link in the cook header and the back-link target are both omitted/redirected to /sca/competitions when cook.competition is null (nullable FK, defensive per RESEARCH.md Open Question 3)"

patterns-established:
  - "Sparse-data Server Component pattern: guard the whole nullable relation object before touching any field, then render every value through formatScoreValue so nulls collapse to the em dash uniformly"

requirements-completed: [COOK-01, COOK-02]

duration: 3min
completed: 2026-08-24
---

# Phase 10 Plan 08: Cook Detail Page Summary

**Cook Detail page (`app/sca/cooks/[id]/page.tsx`) rendering competition context, full score breakdown, process variables, and AI reviews, with an on-brand SCA 404 (`app/sca/not-found.tsx`) for malformed/unknown ids.**

## Performance

- **Duration:** 3 min (first commit to last commit)
- **Started:** 2026-08-24T00:35:19-06:00
- **Completed:** 2026-08-24T00:36:34-06:00
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- Cook Detail page renders header (steak label with fallback), Score Breakdown, Process Variables, and AI Reviews sections against the real `sca` schema, all four verified against live cooks
- Sparse-data paths (18 of 20 real cooks have no `cook_detail`, 18 of 20 have no AI reviews) render the locked D-09/D-10 fallback copy verbatim, verified against cook 1 (sparse) not just cooks 19/20 (fully populated)
- Cook 7's object-level-null `score` renders an all-em-dash breakdown without throwing during SSR
- On-brand 404 at `app/sca/not-found.tsx` picked up automatically by every `notFound()` call under `app/sca`, rendering inside the existing `ScaNavBar`/`ScaFooter` shell

## Task Commits

Each task was committed atomically:

1. **Task 1: Build app/sca/cooks/[id]/page.tsx (COOK-01, COOK-02)** - `c4ba4fe` (feat)
2. **Task 2: Add app/sca/not-found.tsx on-brand 404** - `b4a1085` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `app/sca/cooks/[id]/page.tsx` - Cook Detail Server Component: async `params: Promise<{ id: string }>`, `parseScaId` + `notFound()` gate before any query, `getCookWithDetails` inside try/catch with locked generic error copy, Score Breakdown (object-null-guarded `cook.score`, `deriveScoreMetrics` for the two distance rows), Process Variables (`getPresentProcessFields`, D-09 fallback), AI Reviews (always renders, D-10 fallback, JSX-text-only rendering of model-generated `comments`/`prompt`)
- `app/sca/not-found.tsx` - Synchronous Server Component, no data fetching, no `"use client"`, renders "Not found" copy and a "Back to Dashboard" link inside the SCA shell

## Decisions Made
- Header fallback uses `cookColumnLabel` (already built in 10-01) rather than a bespoke fallback string, keeping the "never empty h1" rule consistent with the rest of the SCA surface
- Back-link target is conditional: `/sca/competitions/${cook.competition.id}` when the FK is populated, `/sca/competitions` otherwise — avoids ever rendering a link to a null competition id

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm run build` succeeded; route table lists `/sca/cooks/[id]` and the SCA shell's `_not-found` behavior is exercised by `app/sca/not-found.tsx`
- `npx tsc --noEmit` exits 0
- `npm run test` — 24 files, 211 tests, all passing
- All Task 1 acceptance-criteria greps passed (await-params count, parseScaId/notFound counts, locked-copy counts, `getPresentProcessFields`/`deriveScoreMetrics` counts, zero inline distance math, zero `dangerouslySetInnerHTML`, zero `error.message`, zero `PGRST116`, zero `"use client"`)
- Live dev server: `/sca/cooks/abc` → 404, `/sca/cooks/999999` → 404 (both rendering the on-brand not-found page with "Back to Dashboard"), cook 1 (sparse, ids 1-18 range) shows both "No process detail recorded for this cook." and "No AI reviews yet.", cooks 19/20 show neither fallback (real process fields + AI reviews present), cook 7 (object-null score) returns 200 with an all-em-dash breakdown
- `grep -rn "dangerouslySetInnerHTML" app/sca/ components/sca/` returns nothing (T-10-27 mitigation confirmed)

## Next Phase Readiness
- COOK-01 and COOK-02 requirements closed; Cook Detail is now a fully-linked drill-down target for the comparison table and summary cards built in earlier Phase 10 plans
- On-brand 404 shell now covers both dynamic SCA routes (`/sca/competitions/[id]` and `/sca/cooks/[id]`)
- Plan 10-09 (final Phase 10 plan) can proceed; no blockers identified

---
*Phase: 10-core-browsing-dashboard-competitions-cook-detail*
*Completed: 2026-08-24*
