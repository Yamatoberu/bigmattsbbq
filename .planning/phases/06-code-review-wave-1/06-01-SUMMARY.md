---
phase: 06-code-review-wave-1
plan: 01
subsystem: api
tags: [security, sandbox-guard, info-leak, square, supabase]

requires:
  - phase: 05-navigation-and-content
    provides: "completed v1.0 site with test-seed route present but unguarded"

provides:
  - "GET /api/test-seed returns 404 in production environments"
  - "sandbox guard executes before any Supabase client allocation"

affects: [code-review-wave-1]

tech-stack:
  added: []
  patterns:
    - "Sandbox guard pattern: call getSquareEnv() at top of try block, return 404 if environment !== sandbox, before any external service calls"

key-files:
  created: []
  modified:
    - "app/api/test-seed/route.ts"

key-decisions:
  - "Mirror exact guard pattern from app/api/dev/set-inventory/route.ts — getSquareEnv() called first, bare { error: 'Not found.' } body with no requestId on 404"
  - "Guard placed before getSupabaseClient() so production callers cannot trigger any DB activity"

patterns-established:
  - "Sandbox-only route guard: import getSquareEnv, check environment !== sandbox, return 404 before any external service client allocation"

requirements-completed: []

duration: 1min
completed: 2026-05-06
---

# Phase 06 Plan 01: Code Review Wave 1 — Sandbox Guard for /api/test-seed Summary

**Sandbox-only access control guard added to GET /api/test-seed, returning 404 before any Supabase query when SQUARE_ENV is not "sandbox"**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-06T21:13:25Z
- **Completed:** 2026-05-06T21:14:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `getSquareEnv()` import to `app/api/test-seed/route.ts` alongside existing imports
- Inserted sandbox guard as the first statement inside the try block, before `getSupabaseClient()`
- Production callers now receive HTTP 404 with `{"error":"Not found."}` and no request ID — identical to the `dev/set-inventory` reference pattern
- Sandbox behavior entirely unchanged: same JSON shape, same `x-request-id` header, same 500 fallback paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sandbox guard to /api/test-seed GET handler** - `1f05a8e` (fix)

**Plan metadata:** see final commit below

## Files Created/Modified

- `app/api/test-seed/route.ts` — Added `getSquareEnv` import and sandbox environment guard before Supabase client allocation

## Decisions Made

- Used exact guard pattern from `app/api/dev/set-inventory/route.ts`: call `getSquareEnv()`, check `env.environment !== "sandbox"`, return bare `{ error: "Not found." }` with status 404 and no `x-request-id` header — consistent with existing precedent in the codebase
- Guard positioned before `getSupabaseClient()` per the plan's threat model (T-06-01, T-06-03): production callers get a cheap constant-time 404 response without allocating a Supabase connection or running any query

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Critical security finding Issue 1 from `public/code_review.md` closed
- Ready for Phase 06 Plan 02 execution
- No blockers

---
*Phase: 06-code-review-wave-1*
*Completed: 2026-05-06*
