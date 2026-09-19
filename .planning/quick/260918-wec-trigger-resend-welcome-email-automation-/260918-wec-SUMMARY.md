---
phase: quick-260918-wec
plan: 01
subsystem: api
tags: [resend, mailing-list, automation, vitest]

requires: []
provides:
  - "Optional RESEND_WELCOME_EVENT env var gating a new Resend welcome-email Automation trigger"
  - "shouldSendWelcome pre-create dedup lookup via resend.contacts.get"
  - "triggerWelcomeAutomation fire-and-forget resend.events.send via after()"
affects: [mailing-list-signup, resend-integration]

tech-stack:
  added: []
  patterns:
    - "Module-scoped async helper functions colocated in the route file, mirroring notifySlackNewSubscriber (no lib/resend.ts extraction)"
    - "Pre-check via contacts.get before contacts.create to detect genuine newness, since contacts.create silently succeeds on existing emails"

key-files:
  created: []
  modified:
    - lib/env.ts
    - .env.example
    - tests/mailingList.test.ts
    - app/api/mailing-list/route.ts

key-decisions:
  - "Feature is fully gated on optional RESEND_WELCOME_EVENT; when unset, contacts.get is never called and behavior is byte-for-byte unchanged from before this plan"
  - "shouldSendWelcome fails closed (returns false, no welcome) on any lookup error other than not_found, so Resend rate-limiting or outages cannot cause duplicate welcome emails"
  - "Test 7 (trigger failure swallowed) implemented as one test with two sequential POST calls covering both a resolved-error result and a rejected promise, to land on exactly 17 total tests as specified"

requirements-completed: [ISSUE-18]

duration: 3min
completed: 2026-09-18
---

# Quick Task 260918-wec: Trigger Resend Welcome Email Automation Summary

**New/re-subscribing mailing-list contacts now fire the Resend welcome-email Automation exactly once via a contacts.get pre-check + after()-deferred events.send, fully gated on optional RESEND_WELCOME_EVENT.**

## Performance

- **Duration:** ~3 min (23:23:17 -> 23:25:37 UTC-6)
- **Started:** 2026-09-18T23:23:17-06:00
- **Completed:** 2026-09-18T23:25:37-06:00
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `ResendEnv` gained an optional `welcomeEvent` field (trimmed, empty -> undefined), documented in `.env.example`'s Phase 8 Resend block
- `shouldSendWelcome` + `triggerWelcomeAutomation` helpers added to `app/api/mailing-list/route.ts`, wired into `POST` between `getResendEnv()` and `contacts.create`
- 8 new Vitest cases (17 total in `tests/mailingList.test.ts`) cover new-subscriber trigger, active-duplicate suppression, re-subscribe trigger, lookup-error fail-closed, env-unset no-op, create-error suppression, swallowed trigger failure/rejection, and invalid-body no-op
- Response contract (`200`/`400`/`500`) is provably unaffected by the lookup or trigger paths — both only ever `console.warn`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add optional RESEND_WELCOME_EVENT to ResendEnv and document it in .env.example** - `436fd22` (feat)
2. **Task 2: Extend the mailing-list test harness and add the 8 welcome-automation cases (RED)** - `9b0b26a` (test)
3. **Task 3: Implement shouldSendWelcome + triggerWelcomeAutomation and wire into POST (GREEN)** - `bdb894e` (feat)

_TDD gate sequence confirmed: `test(...)` commit `9b0b26a` precedes `feat(...)` commit `bdb894e`._

## Files Created/Modified
- `lib/env.ts` - `ResendEnv.welcomeEvent?` field; `getResendEnv()` reads/trims `RESEND_WELCOME_EVENT`, still throws only for the three required vars
- `.env.example` - Documents `RESEND_WELCOME_EVENT` in the Phase 8 Resend block (optional, dashboard Automation Trigger name, suggested value)
- `tests/mailingList.test.ts` - Harness gains `contactsGetMock`/`eventsSendMock`; 8 new welcome-automation cases in a new `describe` block; existing 9 tests unchanged in behavior
- `app/api/mailing-list/route.ts` - `shouldSendWelcome` (pre-create dedup lookup, fail-closed) and `triggerWelcomeAutomation` (fire-and-forget `events.send` with `FIRST_NAME` payload) helpers; `POST` widened to `ResendEnv`, calls `shouldSendWelcome` before `contacts.create`, defers `triggerWelcomeAutomation` via `after()` after the existing Slack `after()` call, only on the success path

## Decisions Made
- No new dependencies (resend@6.28.0 already present) and no `lib/resend.ts` extraction — helpers stay in the route file next to `notifySlackNewSubscriber`, per the locked design
- `shouldSendWelcome` returns `true` only for `error.name === "not_found"` or `data.unsubscribed === true`; every other outcome (active duplicate, any other lookup error, thrown exception) returns `false`
- Welcome trigger fires strictly after the existing Slack notification's `after()` registration and only inside the success branch, so ordering and status-code behavior for every existing path are untouched

## Deviations from Plan

None - plan executed exactly as written. One clarification was needed to hit the plan's exact "17 tests" success criterion: Task 2's `<behavior>` describes "Test 7" as having "two assertions/cases (a) and (b)" — implemented as a single `it` block performing two sequential `POST` calls (one with `eventsSendMock` resolving a Resend error object, one with it rejecting), rather than two separate `it` blocks, since two separate tests would have produced 18 tests instead of the specified 17. This is a direct reading of the plan's own wording ("two assertions/cases" within Test 7), not a scope change.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None — plan executed exactly as written, with the Test 7 structure interpreted per its own explicit wording to match the locked 17-test count.

## Issues Encountered
None.

## User Setup Required

**External service requires manual configuration before this feature does anything.** No `USER-SETUP.md` was generated (single-step, already documented inline in `.env.example`), but for the record:
1. In the Resend dashboard, create an Automation with a Trigger step bound to a custom event name (e.g. `subscriber.welcome`).
2. Set `RESEND_WELCOME_EVENT` in `.env.local` (and Vercel) to that exact event name.
3. Until that var is set, this code is a complete no-op — `contacts.get` and `events.send` are never called, matching pre-plan behavior exactly.

## Verification Results

- `npx vitest run tests/mailingList.test.ts` -> **17 passed (17)**
- `npm run test` -> **322 passed (322)** across 32 test files (314 baseline + 8 new)
- `npx tsc --noEmit` -> clean, no output
- `grep -n "welcomeEvent" lib/env.ts` -> interface field (line 38) + read/trim (44-46) + return (54)
- `grep -n "events.send\|contacts.get" app/api/mailing-list/route.ts` -> both calls present, each inside its own helper only (`shouldSendWelcome` line 53, `triggerWelcomeAutomation` line 74)
- `grep -v '^#' .env.example | grep '^RESEND_WELCOME_EVENT='` -> exactly one line

## Next Phase Readiness
Issue #18's locked design is fully implemented and merged into the mailing-list route. No blockers. The feature stays dormant until the Resend dashboard Automation is created and `RESEND_WELCOME_EVENT` is set (user's manual step, outside repo scope).

---
*Quick task: 260918-wec*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 5 modified/created files exist on disk; all 3 task commit hashes (436fd22, 9b0b26a, bdb894e) confirmed present in `git log --oneline --all`.
