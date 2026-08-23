---
phase: 05-content-mailing-list
plan: "05"
subsystem: api
tags: [broadcast, resend, email, admin, security, mailing-list, bearer-auth, jwt, supabase]

# Dependency graph
requires:
  - phase: 05-01
    provides: resend and jose packages installed; BROADCAST_SECRET and UNSUBSCRIBE_SECRET env vars; RED tests in tests/broadcast.test.ts
  - phase: 05-04
    provides: signUnsubscribeToken from lib/unsubscribeToken.ts
  - phase: 05-03
    provides: mailing_list table with subscribed column; email_logs table via Supabase
provides:
  - "Protected POST /api/admin/broadcast endpoint: bearer auth, fetch active subscribers, send per-recipient Resend email with unsubscribe JWT, log each attempt to email_logs"
affects: [future-admin-ui, v2-drop-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bearer auth before body parsing — no info leaked to unauthorized callers"
    - "Resend instantiated inside handler (not module scope) to avoid build-time RESEND_API_KEY requirement"
    - "Sequential per-recipient loop prevents Resend rate-limit bursts"
    - "dropId encoded in template field as drop_notification:{dropId} — email_logs has no drop_id column"
    - "Authorization header read from request.headers directly (not next/headers) for testability"

key-files:
  created:
    - app/api/admin/broadcast/route.ts
  modified: []

key-decisions:
  - "Read Authorization header from request.headers (not next/headers) so tests can pass Request objects directly without mocking Next.js header context"
  - "Resend instantiated inside handler body per RESEARCH Pitfall 4 — avoids build-time env var requirement"
  - "Sequential send loop chosen over Promise.all to respect Resend rate limits at MVP subscriber scale"
  - "401 responses contain only { error: 'Unauthorized' } with no requestId to prevent metadata enumeration"

patterns-established:
  - "Admin endpoints: bearer auth check as first operation, before JSON parsing or DB access"

requirements-completed: [MAIL-06]

# Metrics
duration: 15min
completed: 2026-04-19
---

# Phase 05 Plan 05: Broadcast Email Endpoint Summary

**Protected POST /api/admin/broadcast with bearer auth, per-recipient Resend sends, signed JWT unsubscribe links, and email_logs audit trail**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-19T14:25:00Z
- **Completed:** 2026-04-19T14:40:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Implemented bearer-auth-gated broadcast endpoint that sends drop-notification emails to all active mailing list subscribers
- Each email includes a recipient-specific signed JWT unsubscribe link generated via `signUnsubscribeToken`
- Every send attempt writes an `email_logs` row with status (`sent`/`failed`) and Resend message ID
- All 4 tests in `tests/broadcast.test.ts` pass (auth missing → 401, wrong secret → 401, correct secret + empty list → 200 no sends, unset env → 401 fail-closed)

## Task Commits

1. **Task 1: Create POST /api/admin/broadcast route** - `08c349d` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `app/api/admin/broadcast/route.ts` - Protected broadcast endpoint: bearer auth, subscriber fetch, Resend send loop, email_logs write

## Decisions Made
- Read `Authorization` header from `request.headers` directly rather than `next/headers` — the pre-written tests pass a `Request` object directly and don't mock `next/headers`, so using `request.headers` makes the route testable without a Next.js context
- `Resend` class instantiated inside the handler body (not at module scope) per RESEARCH Pitfall 4, so missing `RESEND_API_KEY` doesn't cause a build-time crash
- Sequential `for...of` loop (not `Promise.all`) to avoid Resend rate-limit bursts at MVP subscriber scale
- `dropId` is encoded in the `template` field as `drop_notification:{dropId}` because `email_logs` has no `drop_id` column per RESEARCH Pitfall 5
- 401 response body is `{ error: "Unauthorized" }` with no `requestId` — minimizes metadata available to scanners/enumerators (T-5-05-01 mitigation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used request.headers instead of next/headers for Authorization**
- **Found during:** Task 1 (route creation + test execution)
- **Issue:** Plan's provided code used `import { headers } from "next/headers"` and called `await headers()`, but the pre-written test file passes a `Request` object directly and never mocks `next/headers`. Using `next/headers` would have caused tests to fail with a missing Next.js context error.
- **Fix:** Removed `next/headers` import. Read `Authorization` header from `request.headers` (the Web API standard `Headers` object on the `Request`). All plan behavior is preserved.
- **Files modified:** app/api/admin/broadcast/route.ts
- **Verification:** 4 broadcast tests pass
- **Committed in:** 08c349d

---

**Total deviations:** 1 auto-fixed (1 bug — test compatibility)
**Impact on plan:** Minor adaptation. Auth behavior identical; all plan acceptance criteria met.

## Issues Encountered
- Worktree was initialized from a planning-only commit (86c5223) missing all Phase 5 implementation files. Resolved by resetting to the correct base commit (80d9ba6) and checking out the working tree files before beginning plan execution. No plan work was affected.

## Known Stubs
None — the broadcast route is fully wired: bearer auth, Supabase query, Resend send, email_logs write.

## Next Phase Readiness
- `POST /api/admin/broadcast` is curl-testable once `RESEND_API_KEY`, `BROADCAST_SECRET`, and `EMAIL_FROM` are set in `.env.local`
- v1 mailing list notification workflow is complete (subscribe → store → broadcast → unsubscribe)
- No blockers for remaining Phase 5 plans

---
*Phase: 05-content-mailing-list*
*Completed: 2026-04-19*
