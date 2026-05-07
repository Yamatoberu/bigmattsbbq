---
phase: 07-code-review-wave-2
plan: "02"
subsystem: ui
tags: [react-hooks, useCallback, useMemo, exhaustive-deps, stale-closure, CartContext]

# Dependency graph
requires:
  - phase: 07-code-review-wave-2
    provides: code review findings defining target shape for CartContext fix
provides:
  - CartProvider with stable callback references and complete useMemo dep array
affects: [consumers of useCart() hook, CheckoutClient, any component reading cart context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useCallback with empty dep array for callbacks that close only over stable useState setters"
    - "useMemo dep array must list all captured references, including callback refs"

key-files:
  created: []
  modified:
    - components/cart/CartContext.tsx

key-decisions:
  - "Option A (useCallback + complete deps) chosen over Option B (useReducer): minimal change surface, callbacks already use functional updater form so empty dep arrays are correct"
  - "All six callbacks use empty dep arrays [] because they close only over stable useState setters (setItems, setSelectedPackageId) and a module-scope pure function (mergeCartItems)"

patterns-established:
  - "useCallback pattern: wrap mutators in useCallback with empty deps when body uses only functional updaters"
  - "useMemo dep array completeness: list all captured values including stable callback refs"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-05-07
---

# Phase 07 Plan 02: CartContext useCallback Refactor Summary

**Six CartContext mutators wrapped in useCallback with stable identities; useMemo dep array expanded from 3 to 9 entries to eliminate latent stale-closure risk**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-07T02:34:00Z
- **Completed:** 2026-05-07T02:36:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `useCallback` import to CartContext (alphabetical insertion in React import)
- Wrapped all six cart mutators (`addItem`, `addItems`, `setQuantity`, `removeItem`, `setPackage`, `clear`) in `useCallback` with empty dep arrays — correct because all bodies use only stable `useState` setters and an imported pure function
- Expanded `useMemo` dep array from 3 entries (`items`, `isReady`, `selectedPackageId`) to 9 entries — adds the six now-stable callback references
- Eliminated the latent stale-closure foot-gun flagged as Issue 4 in `public/code_review.md`
- All 61 tests pass; `npm run build` exits 0; context shape and consumer behavior unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap CartContext callbacks in useCallback and complete useMemo dep array** - `ea36e1f` (refactor)

## Files Created/Modified
- `/Users/matt/Development/BigMattsBbq/components/cart/CartContext.tsx` - Added `useCallback` import; wrapped six mutators; expanded `useMemo` dep array to nine entries

## Decisions Made
- Chose Option A (useCallback + complete deps) from the code review recommendations. Option B (useReducer) would have been a larger structural change with no additional benefit since the current functional-updater pattern already prevents stale reads.
- Empty dep arrays `[]` are correct for all six callbacks: they close only over `setItems`/`setSelectedPackageId` (stable `useState` setters, no listing needed) and `mergeCartItems` (module-scope import, not a closure capture).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CartContext is now exhaustive-deps compliant; stable callback references won't cause unnecessary consumer re-renders
- Ready to proceed with remaining wave-2 issues (3, 6, 7, 12 per `public/code_review.md`)

---
*Phase: 07-code-review-wave-2*
*Completed: 2026-05-07*
