---
phase: quick-260910-t3o
plan: 01
subsystem: testing
tags: [playwright, e2e, chrome-devtools-protocol, redirects]

requires: []
provides:
  - Browser-level Playwright coverage proving a real Chromium navigation to /review lands at the exact configured Google review URL
affects: [e2e-test-suite]

tech-stack:
  added: []
  patterns:
    - "CDP Fetch-domain session (context.newCDPSession + Fetch.enable/Fetch.requestPaused/Fetch.fulfillRequest) for intercepting a cross-origin URL that is only reached via an HTTP redirect chain, when page.route()/context.route() cannot see that hop"

key-files:
  created: []
  modified:
    - e2e/reviewRedirect.spec.ts

key-decisions:
  - "Used a raw CDP session instead of page.route() to intercept the g.page hop, because page.route()/context.route() never receive Fetch.requestPaused for a request that is reached via an automatic HTTP redirect (real or fulfilled, single-hop or multi-hop) in this Playwright/Chromium combination — verified empirically across 7+ variations before switching approach"

patterns-established:
  - "For hermetic Playwright tests of navigation redirects to third-party domains, use context.newCDPSession(page) + Fetch domain interception rather than page.route() when the target is reached via a redirect chain rather than a direct page.goto()"

requirements-completed: [ISSUE-17-FOLLOWUP]

duration: ~20min
completed: 2026-09-11
---

# Quick Task 260910-t3o: Browser-level Playwright coverage for /review redirect Summary

**Second Playwright case in e2e/reviewRedirect.spec.ts proves a real Chromium navigation to /review lands at the exact Google review URL, via a CDP Fetch-domain interception rather than page.route() (which cannot see this hop)**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-11T03:12:55Z
- **Tasks:** 1 (single-task plan)
- **Files modified:** 1

## Accomplishments
- Added a second `test(...)` to the existing `test.describe("review redirect", ...)` block that drives a real browser through `page.goto("/review")` and asserts `page.url()` equals `https://g.page/r/CeLcycUsx16aEAI/review`
- The g.page hop is fulfilled locally via a Chrome DevTools Protocol Fetch-domain interception, so the suite makes zero real network calls to Google
- A secondary assertion on the stub's own body text guards against a vacuous pass (URL set without the navigation actually completing at the intercepted destination)
- The original request-level 307/location test is untouched, byte-for-byte

## Task Commits

1. **Task 1: Add a browser-navigation case to e2e/reviewRedirect.spec.ts** - `9ae6360` (test)

**Plan metadata:** (this SUMMARY + STATE.md update, committed separately by the orchestrator)

## Files Created/Modified
- `e2e/reviewRedirect.spec.ts` - Added a second Playwright test using a CDP Fetch-domain session to intercept the g.page hop and assert `page.url()` lands on the real destination string

## Decisions Made
- **CDP session instead of page.route()** (see Deviations below) — the only change from the plan's literal implementation instructions; the resulting test satisfies every stated `must_haves.truths` and the full `success_criteria` list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] page.route()/context.route() cannot intercept a redirect-chain hop; switched to a raw CDP Fetch-domain session**
- **Found during:** Task 1, first verification run
- **Issue:** The plan's `<interfaces>` section asserted "`page.route()` intercepts navigation requests, including cross-origin ones, so the hop to `g.page` can be fulfilled locally without any real network call." This is factually incorrect for this exact scenario in this environment (Playwright 1.62.1 / Chromium). Implementing the test exactly as specified (`page.route("https://g.page/r/CeLcycUsx16aEAI/review", ...)` + `page.goto("/review")`) produced a **real** navigation all the way to Google's live Maps page (`page.url()` ended at a real `www.google.com/maps/place/...` URL, different on every run), because `/review`'s real 307 is followed automatically by the browser and that followed request never triggers `Fetch.requestPaused`.
- **Investigation:** Verified via a disposable debug spec (never committed) that:
  - A *direct* `page.goto()` to the exact g.page URL string is reliably intercepted by `page.route()`.
  - Any request reached via an *automatic* HTTP redirect — whether the real 307 from Next.js, a `route.fulfill()`-synthesized 307, a same-origin hop, or a completely unrelated domain (`example.com`) — is **not** paused by `page.route()` or `context.route()`, even with a maximally permissive `"**/*"` pattern, `context`-level routing, or Chromium launched with `--disable-site-isolation-trials --disable-features=IsolateOrigins,site-per-process`.
  - A raw CDP session (`context.newCDPSession(page)` + `Fetch.enable({ patterns: [...] })` + `Fetch.requestPaused` + `Fetch.fulfillRequest`) reliably intercepts the exact same redirected request that `page.route()` misses.
- **Fix:** Replaced the planned `page.route()` call with a CDP Fetch-domain session (`context.newCDPSession`, `Fetch.enable` scoped to the exact literal destination URL, `Fetch.fulfillRequest` returning the same self-authored stub body/content-type as originally planned). `context` was already available via Playwright's built-in test fixtures, so **no new import was added** — the plan's "add no new imports" constraint is still honored. All other constraints (no `e2e/support/stubs.ts` helper, no `next.config.js`/`playwright.config.ts` changes, no assertion on Google-authored content, exact literal destination string used rather than a loose glob) are honored exactly as specified.
- **Files modified:** `e2e/reviewRedirect.spec.ts` (same file the plan already scoped this task to — no additional files touched)
- **Verification:** `npx playwright test e2e/reviewRedirect.spec.ts --reporter=list` passes 2/2 consistently across 4 separate runs, each completing in ~3.3-3.5s total (the new case alone completes in 150-170ms — consistent with local interception; the real, unintercepted chain observed during investigation took ~2.9-3.4s per attempt and landed on a different live Google URL each time). `npx tsc --noEmit` is clean. `npm run test` still passes 304/304.
- **Committed in:** `9ae6360` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — implementation-detail bug in the plan's technical assumption, not a scope change)
**Impact on plan:** All four `must_haves.truths` are satisfied exactly as specified: (1) a real browser navigating to `/review` ends up with `https://g.page/r/CeLcycUsx16aEAI/review` in `page.url()`; (2) zero real network requests reach Google's servers; (3) no assertion references Google-authored content; (4) the original request-level 307/location test is unchanged. The one place this diverges from the plan's literal wording is the `must_haves.artifacts`/`key_links` note that the file should `contain: "page.route"` / match pattern `page\.route\(` — the file no longer contains a literal `page.route(` call, because that specific API does not work for this scenario. This is a discovered technical-implementation detail, not a change to what was delivered or verified.

## Issues Encountered
- Extensive empirical investigation was required to isolate the root cause (see Deviations above) before landing on the CDP-based fix. No blockers remain; the shipped test is fast, deterministic, and has been run 4+ times with identical pass/timing results.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `e2e/reviewRedirect.spec.ts` now has full coverage: header-level (`request` fixture, 307 + `location`) and browser-level (`page` fixture, actual navigation lands at the destination).
- The deployed-Vercel manual check (confirming `https://bigmattsbbq.com/review` lands on the real Google review form in a live mobile browser, per issue #17) remains outstanding and was never in scope for local automated tests — no local test can or should attempt to hit Google's live servers for real, per this plan's own hermeticity requirement.
- If a future task needs similar interception of a cross-origin redirect-chain target in Playwright, reuse the CDP Fetch-domain pattern established here rather than `page.route()`/`context.route()`.

---
*Phase: quick-260910-t3o*
*Completed: 2026-09-11*

## Self-Check: PASSED

- FOUND: e2e/reviewRedirect.spec.ts
- FOUND: .planning/quick/260910-t3o-add-a-second-playwright-test-case-for-th/260910-t3o-SUMMARY.md
- FOUND: 9ae6360
