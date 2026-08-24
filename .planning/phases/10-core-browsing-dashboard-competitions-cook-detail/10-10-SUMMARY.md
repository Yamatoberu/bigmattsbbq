---
phase: 10-core-browsing-dashboard-competitions-cook-detail
plan: 10
subsystem: ui
tags: [nextjs, react, typescript, supabase, sca-tracker]

# Dependency graph
requires:
  - phase: 10-core-browsing-dashboard-competitions-cook-detail
    provides: getAllCooksWithScores query, CookWithScore type, lib/sca/format.ts helpers, app/sca/cooks/[id]/page.tsx detail route, app/sca/competitions/page.tsx list-page template
provides:
  - "/sca/cooks index route listing every recorded cook newest-first"
  - "sortCooksByRecencyDesc pure helper in lib/sca/aggregates.ts"
  - "Cooks entry in the SCA nav bar, discoverable from any SCA page"
affects: [10-11, 10-12, 11-analytics-ai-reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "List-page template pattern (dynamic force-dynamic, LINK_CLASSES constant, try/catch + logError + generic errorMessage, three-branch error/empty/list render) now used identically by app/sca/competitions/page.tsx and app/sca/cooks/page.tsx"

key-files:
  created:
    - app/sca/cooks/page.tsx
  modified:
    - lib/sca/aggregates.ts
    - tests/sca-aggregates.test.ts
    - components/sca/ScaNavBar.tsx

key-decisions:
  - "Cooks nav entry supersedes the nav half of D-11 (Cook Detail stays drill-down-only) because human UAT (G-10-1) found drill-down-only undiscoverable"
  - "sortCooksByRecencyDesc mirrors sortCooksAscending's copy-before-sort discipline but sorts descending with a b.id - a.id tie-break, kept in lib/sca/aggregates.ts rather than lib/sca/comparison.ts since it drives index-page ordering, not comparison-table construction"

patterns-established:
  - "Index/list pages for SCA entities (Competitions, Cooks) share one structural template; future entity list pages should clone this same three-branch pattern"

requirements-completed: [COOK-01]

# Metrics
duration: 6min
completed: 2026-08-24
---

# Phase 10 Plan 10: Cooks Index Navigation Summary

**Added a `/sca/cooks` index route and nav entry so any visitor can reach cook detail pages without first landing on a comparison table, closing gap G-10-1.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-24T18:22:00Z
- **Completed:** 2026-08-24T18:23:25Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `/sca/cooks` server component lists every cook newest-first with em-dash fallbacks for missing scores, mirroring the existing Competitions list-page template
- `sortCooksByRecencyDesc` added to `lib/sca/aggregates.ts` with 5 new unit tests (ordering, tie-break, non-mutation, empty input, unscored-cook retention)
- SCA nav bar now exposes Dashboard, Competitions, and Cooks; the Cooks link highlights on both `/sca/cooks` and `/sca/cooks/{id}` with zero changes to `isActive`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sortCooksByRecencyDesc to lib/sca/aggregates.ts with unit coverage** - `ccf64e2` (test)
2. **Task 2: Create the /sca/cooks index route** - `b413845` (feat)
3. **Task 3: Add the Cooks entry to the SCA nav bar** - `35b780c` (feat)

**Plan metadata:** commit pending (docs: complete plan)

## Files Created/Modified
- `lib/sca/aggregates.ts` - Added `sortCooksByRecencyDesc(cooks): CookWithScore[]`, a pure descending-by-`cooked_at` sort with `id` tie-break, non-mutating
- `tests/sca-aggregates.test.ts` - Added a `sortCooksByRecencyDesc` describe block (5 tests) reusing the existing `makeCook` fixture factory
- `app/sca/cooks/page.tsx` - New async Server Component `ScaCooksPage`; `force-dynamic`, calls `getAllCooksWithScores()`, orders with `sortCooksByRecencyDesc`, renders error/empty/list branches with locked copy, each row links to `/sca/cooks/{id}`
- `components/sca/ScaNavBar.tsx` - Appended `{ label: "Cooks", href: "/sca/cooks" }` to `scaNavLinks`

## Decisions Made
- Kept `sortCooksByRecencyDesc` in `lib/sca/aggregates.ts` (not `lib/sca/comparison.ts`) since it is index-page display ordering, not comparison-table column construction — matches the plan's interface contract
- Did not touch `isActive` in `ScaNavBar.tsx`; its existing `startsWith(href + "/")` fallback already covers `/sca/cooks/{id}` highlighting

## Deviations from Plan

None — plan executed exactly as written. All three tasks matched their `<action>` blocks with no bug fixes, missing functionality, or blocking issues encountered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-10-1 is closed: a visitor can reach any cook detail page from the nav bar (Cooks → View Cook) in two clicks, no comparison table involved
- `/sca/cooks` renders every recorded cook newest-first; unscored cooks show em dashes, never `0`/`NaN`/blank
- `npm run test` (24 files, 216 tests), `npx tsc --noEmit`, and `npm run build` all pass clean
- 10-11-PLAN.md (G-10-2, COMP-03 gap closure for Competition Detail's comparison scope) is unblocked and can proceed independently — no shared files with this plan beyond `lib/sca/aggregates.ts`, which this plan only added to (no existing exports changed)

---
*Phase: 10-core-browsing-dashboard-competitions-cook-detail*
*Completed: 2026-08-24*

## Self-Check: PASSED

- FOUND: app/sca/cooks/page.tsx
- FOUND: ccf64e2 (test commit)
- FOUND: b413845 (feat commit)
- FOUND: 35b780c (feat commit)
