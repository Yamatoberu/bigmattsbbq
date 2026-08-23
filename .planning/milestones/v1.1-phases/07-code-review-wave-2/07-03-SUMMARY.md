---
phase: 07-code-review-wave-2
plan: 03
subsystem: auth
tags: [jwt, secrets, env-config, security, key-rotation, jose]

# Dependency graph
requires:
  - phase: 05-mailing-list
    provides: unsubscribeToken module with signUnsubscribeToken and verifyUnsubscribeToken using jose HS256
provides:
  - getSecret() in lib/unsubscribeToken.ts reads only UNSUBSCRIBE_SECRET (no BROADCAST_SECRET fallback)
  - Operator documentation in .env.example explaining independent rotation semantics for both secrets
affects: [05-mailing-list, broadcast-route, unsubscribe-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Secrets with different rotation semantics must be independent env vars — no OR-fallback between them"
    - "Error messages on missing secrets explicitly state what NOT to reuse"

key-files:
  created: []
  modified:
    - lib/unsubscribeToken.ts
    - .env.example
    - tests/unsubscribeToken.test.ts

key-decisions:
  - "Remove BROADCAST_SECRET fallback from getSecret() to prevent silent JWT invalidation when broadcast secret is rotated"
  - "Error message explicitly says 'Do NOT reuse BROADCAST_SECRET' to guide operator toward correct configuration"
  - "Document rotation semantics in .env.example so the constraint is visible at setup time"

patterns-established:
  - "Pattern: Secrets with different rotation semantics must never share a fallback chain"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-05-06
---

# Phase 07 Plan 03: Decouple UNSUBSCRIBE_SECRET from BROADCAST_SECRET Summary

**Removed OR-fallback from getSecret() so rotating BROADCAST_SECRET can never silently invalidate 30-day unsubscribe JWT links; error message now explicitly warns "Do NOT reuse BROADCAST_SECRET"**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T20:37:00Z
- **Completed:** 2026-05-06T20:39:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `getSecret()` in `lib/unsubscribeToken.ts` now reads only `process.env.UNSUBSCRIBE_SECRET` — zero references to `BROADCAST_SECRET`
- Error message updated to include "Do NOT reuse BROADCAST_SECRET" — guides operator toward correct independent configuration
- `.env.example` Phase 5 block expanded with a documentation comment explaining the two secrets have different rotation semantics and MUST be independent
- TDD cycle completed: 4 new failing tests committed (RED), then implementation committed (GREEN), all 65 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests for UNSUBSCRIBE_SECRET decoupling** - `de9aadc` (test)
2. **Task 1 (GREEN): Decouple UNSUBSCRIBE_SECRET from BROADCAST_SECRET in getSecret()** - `230c89d` (feat)
3. **Task 2: Document independent rotation semantics in .env.example** - `b99ba4f` (docs)

_Note: Task 1 followed TDD (test → feat commits per RED/GREEN cycle)_

## Files Created/Modified
- `lib/unsubscribeToken.ts` - `getSecret()` rewritten: single env var read, new error message
- `.env.example` - Phase 5 block annotated with rotation semantics documentation
- `tests/unsubscribeToken.test.ts` - 4 new tests covering missing UNSUBSCRIBE_SECRET, short UNSUBSCRIBE_SECRET, and BROADCAST_SECRET no-fallback behavior

## Decisions Made
- Removed OR-fallback entirely rather than keeping it for any grace period — the fix is authoritative; the operator must set `UNSUBSCRIBE_SECRET` independently
- Error message explicitly names the forbidden pattern ("Do NOT reuse BROADCAST_SECRET") to reduce operator confusion during initial setup or incident response

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
Operators who have been relying on `BROADCAST_SECRET` as a fallback for `UNSUBSCRIBE_SECRET` must now set `UNSUBSCRIBE_SECRET` independently (min 32 chars) in `.env.local` and Vercel env vars. Existing `.env.example` documents this requirement.

## TDD Gate Compliance

- RED gate: `de9aadc` — test(07-03) commit with 4 failing tests
- GREEN gate: `230c89d` — feat(07-03) commit making all tests pass
- REFACTOR: Not needed (minimal, focused change)

## Next Phase Readiness
- `lib/unsubscribeToken.ts` is correct and fully tested (8 tests, 65 total passing)
- Any future broadcast/unsubscribe changes should maintain the invariant that `UNSUBSCRIBE_SECRET` is the sole secret for JWT operations
- Phase 07-04 can proceed independently

---
*Phase: 07-code-review-wave-2*
*Completed: 2026-05-06*
