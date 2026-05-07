---
phase: 07-code-review-wave-2
plan: "04"
subsystem: ui
tags: [polling, react-hooks, performance, supabase-load, useEffect]

requires:
  - phase: 07-code-review-wave-2
    provides: Code review issues list (code_review.md)

provides:
  - Conditional polling in useActiveDrop — stops when drop is null or closed
  - Static analysis test suite for useActiveDrop source structure

affects: [components/hooks/useActiveDrop.ts, OrderLanding, NavBar]

tech-stack:
  added: []
  patterns:
    - "Conditional setInterval: guard with shouldPoll before scheduling interval to avoid idle load"
    - "Extended useEffect dep array for null transitions and status changes on same object"

key-files:
  created:
    - tests/useActiveDrop.test.ts
  modified:
    - components/hooks/useActiveDrop.ts

key-decisions:
  - "Poll only when drop is non-null AND status is not 'closed' — upcoming drops continue polling to catch active flip"
  - "Include both state.drop and state.drop?.status in dep array: object ref covers null transitions, status covers same-object changes"
  - "NavBar double-polling consolidation deferred to future plan — both loops now short-circuit on closed/null, mitigating worst case"
  - "Static analysis (source pattern matching) chosen for tests because hook uses React hooks incompatible with node test environment"

patterns-established:
  - "shouldPoll guard: declare boolean then early-return before setInterval to prevent idle polling"

requirements-completed: []

duration: 7min
completed: 2026-05-07
---

# Phase 07 Plan 04: Stop useActiveDrop Polling When Drop Is Null or Closed Summary

**Conditional setInterval guard eliminates steady /api/drop + Supabase background load during multi-week dormant periods between drops**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-07T02:41:15Z
- **Completed:** 2026-05-07T02:42:11Z
- **Tasks:** 1 (TDD — RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Replaced unconditional `setInterval` with `shouldPoll` guard (`state.drop !== null && status !== "closed"`)
- Extended `useEffect` dep array from `[load]` to `[load, state.drop, state.drop?.status]` so effect re-runs on null transitions and status changes
- Wrote 11 static analysis tests covering all 6 behavioral scenarios from the plan (RED: 4 fail, GREEN: 11 pass)
- `upcoming` status continues to poll (needed to detect flip to `active`); only `null` and `closed` suppress polling
- Build and full test suite (76 tests, 13 files) pass

## Task Commits

1. **Task 1 RED — Failing tests for conditional polling** - `36b06b9` (test)
2. **Task 1 GREEN — Implement conditional polling** - `c119b0d` (feat)

## Files Created/Modified

- `tests/useActiveDrop.test.ts` — 11 static analysis tests verifying shouldPoll guard, dep array, no inactive literal, clearInterval preserved
- `components/hooks/useActiveDrop.ts` — useEffect block updated with shouldPoll guard and extended dep array

## Decisions Made

- Used static analysis (source file pattern matching) for tests rather than React rendering. The test environment is `node` (not jsdom), and testing the hook runtime behavior would require a React test harness. Source-level verification is simpler and directly checks the structural requirements from the plan.
- `"upcoming"` status continues to poll. The plan explicitly notes this: we want to detect the flip to `"active"`. Only `"closed"` and `null` suppress polling.
- NavBar double-polling consolidation deferred per the plan's objective note. Both polling loops now short-circuit when drop is closed/null — the worst case (steady multi-week background load) is resolved. Consolidation via context is a future plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 07 plan 04 is the final plan in the code-review-wave-2 phase
- All 4 plans in phase 07 are now complete
- No blockers introduced

---
*Phase: 07-code-review-wave-2*
*Completed: 2026-05-07*
