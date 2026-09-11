---
phase: quick-260910-usw
plan: 01
subsystem: api
tags: [nextjs, after, waitUntil, slack, vercel-serverless]

requires:
  - phase: quick-260910-tsd
    provides: notifySlackNewSubscriber and the mailing-list Slack notification test suite this plan modifies
provides:
  - "Slack notification for new mailing-list signups deferred via Next.js after() instead of an unawaited inline fetch"
  - "Regression tests proving the notification is registered as a deferred callback, not fired inline"
affects: [mailing-list, checkout-slack-notifications]

tech-stack:
  added: []
  patterns:
    - "next/server after() for fire-and-forget side effects that must survive past the HTTP response on Vercel serverless"
    - "vi.mock('next/server', importOriginal) partial mock with a vi.hoisted queue to test after() callbacks without a real request scope"

key-files:
  created: []
  modified:
    - app/api/mailing-list/route.ts
    - tests/mailingListSlack.test.ts
    - tests/mailingList.test.ts

key-decisions:
  - "Used next/server's after() rather than adding the @vercel/functions package. next/server does NOT export waitUntil on Next.js 16.1.6 (verified: typeof require('next/server').waitUntil === 'undefined'), but it does export after() as a stable API (node_modules/next/server.d.ts). after() is the Next.js-native form of the same primitive -- on Vercel it runs on top of the platform's waitUntil -- so it fixes the bug with zero new dependencies and zero new supply-chain surface."
  - "after() throws 'after was called outside a request scope' when invoked outside a real Next.js request (e.g. a route handler invoked directly by Vitest). Both mailing-list test files therefore carry an identical inline vi.mock('next/server', importOriginal) partial mock that spreads the real module (keeping NextResponse functional) and replaces after() with a function that pushes onto a vi.hoisted afterQueue array, plus a flushAfter() helper that drains it. The mock is duplicated per-file rather than extracted to a shared module because vi.resetModules() (called in both files' beforeEach) would tear out a shared module's state, and vi.mock factories are hoisted per-module anyway."
  - "app/api/checkout/route.ts and its notifySlackNewOrder function were not opened or modified -- confirmed byte-for-byte unchanged via git diff --stat, per the task owner's explicit instruction to leave the working checkout notification alone."

requirements-completed: ["ISSUE-15-FIX"]  # Task 3 production checkpoint confirmed by user 2026-09-11: curl POST and a real production signup both landed correctly in #email-signup with no ECONNRESET.

duration: 6min
completed: 2026-09-11
---

# Quick Task 260910-usw: Defer mailing-list Slack notification with after() Summary

**`notifySlackNewSubscriber`'s fetch to `hooks.slack.com` is now registered via Next.js `after()` instead of being fired unawaited inline, so Vercel keeps the serverless invocation alive until the webhook POST settles instead of freezing the socket mid-TLS-handshake.**

## Performance

- **Duration:** 6 min
- **Tasks:** 3 of 3 (Task 3 human-verify checkpoint confirmed on production Vercel 2026-09-11)
- **Files modified:** 3

## Accomplishments

- Diagnosed and fixed the root cause of the `ECONNRESET hooks.slack.com` failures seen in Vercel logs: the unawaited `fetch(...).catch(...)` was still mid-handshake when Vercel froze the function after flushing the HTTP response, and the resulting error surfaced on a later, unrelated request when the frozen instance thawed.
- `notifySlackNewSubscriber` is now `async`, awaits its own fetch inside a try/catch, and never throws — a Slack outage still yields a 200 signup.
- `POST` registers the notification with `after(() => notifySlackNewSubscriber({...}))`, so the fetch doesn't even start until the response has been flushed, and Vercel keeps the invocation alive until it settles.
- Two new regression tests (`Test 9`, `Test 10` in `tests/mailingListSlack.test.ts`) fail against the old inline implementation and pass against the fix, guarding against this ever regressing back to being called inline.
- `app/api/checkout/route.ts` (`notifySlackNewOrder`) is confirmed untouched; no new dependency was added (`package.json`/`package-lock.json` diff is empty).

## Task Commits

1. **Task 1: Add the next/server after() test harness and two failing regression tests** — `0f94c77` (test)
2. **Task 2: Defer the Slack notification with after() so Vercel keeps the function alive** — `d1fa9b4` (feat)

**Plan metadata commit:** deferred to the orchestrator per this quick task's constraints (docs commit handled separately).

## Files Created/Modified

- `app/api/mailing-list/route.ts` — `notifySlackNewSubscriber` converted to `async`, awaits the Slack `fetch` with try/catch logging on failure (never throws); `POST` wraps the call in `after(() => ...)` instead of calling it inline; import line now brings in `after` alongside `NextResponse`.
- `tests/mailingListSlack.test.ts` — added the `next/server` partial mock harness (`afterQueue` + `flushAfter()`), updated Tests 1/2/7/8 to `await flushAfter()` before asserting on the Slack fetch, and added Test 9 (fetch deferred until flush) and Test 10 (exactly one `after()` callback on success, zero on all three failure paths: 400 invalid email, 500 Resend error, 500 missing env var).
- `tests/mailingList.test.ts` — added the same harness plus `afterQueue.length = 0` in `beforeEach` so its three existing success-path 200 assertions don't hit the real (unmocked) `after()`, which would throw outside a request scope and 500 via the route's outer catch.

## Decisions Made

See `key-decisions` in frontmatter: `after()` over `@vercel/functions`; duplicated per-file test mock over a shared helper module; checkout route left untouched.

## Deviations from Plan

None — plan executed exactly as written. Task 1 landed the RED state (exactly Test 9 and Test 10 failing, all other 17 cases across both files passing); Task 2 landed the GREEN state (314/314 tests passing, `tsc --noEmit` clean, `npm run build` succeeding).

One incidental non-code artifact was reverted rather than committed: running `npm run build` regenerated `next-env.d.ts` (its `.next/dev/types/routes.d.ts` reference changed to `.next/types/routes.d.ts` — a dev-vs-build artifact, unrelated to this change and not one of the plan's three target files). It was reverted with `git checkout -- next-env.d.ts` before staging so the diff stays exactly the three files the plan specifies.

## Issues Encountered

None.

## User Setup Required

None — no new environment variables or dashboard configuration. `SLACK_EMAIL_WEBHOOK_URL` is unchanged from the prior task (260910-tsd).

## Next Phase Readiness — Task 3 CONFIRMED (human-verify checkpoint passed)

Deployed to production via push to `master` (commit `f05e279`, Vercel deployment `dpl_BsZ4eJEhSW7nXtUWu9R28AQEHd4S`, READY). Verified via Vercel MCP:

1. `curl -L -X POST https://bigmattsbbq.com/api/mailing-list` returned `{"ok":true}` in ~0.7s — fast, no perceptible delay from the deferred Slack call.
2. Vercel runtime logs for that request and for follow-up requests (`/api/frozen-items`, `/`) showed no `Slack subscriber notification failed` / `ECONNRESET` / `hooks.slack.com` entries anywhere in the window — including on the later unrelated requests, which is exactly where the old bug used to surface.
3. `get_runtime_errors` for the same window: no runtime errors found.
4. User independently ran a real signup through the production site and confirmed both the curl test and the live signup landed correctly in `#email-signup`.

Checkout's existing Slack notification (`notifySlackNewOrder`) was not touched by this change and was out of scope for this checkpoint.

`ISSUE-15-FIX` is closed.

---
*Quick task: 260910-usw*
*Code completed: 2026-09-11*
*Production verification: CONFIRMED 2026-09-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`0f94c77`, `d1fa9b4`) confirmed present in git history.
