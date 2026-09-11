---
phase: quick-260910-sw4
plan: 01
subsystem: infra
tags: [next-config, redirects, playwright, e2e]

# Dependency graph
requires: []
provides:
  - Stable /review short URL that 307-redirects to Big Matt's Google review form
  - Playwright smoke test asserting the redirect status and destination
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Config-level next.config.js redirects() for stable public-facing short URLs"]

key-files:
  created: [e2e/reviewRedirect.spec.ts]
  modified: [next.config.js]

key-decisions:
  - "permanent: false (307) chosen deliberately over permanent: true (308) so browsers/CDNs never hard-cache the mapping, keeping the Google destination editable without stranding printed QR cards"
  - "Destination is a hardcoded literal string in next.config.js with no interpolation of request data, so the route is structurally not an open redirect"

patterns-established:
  - "Stable public short URLs for printed/QR materials belong in next.config.js redirects(), not as app routes or route handlers"

requirements-completed: [ISSUE-17]

# Metrics
duration: 8min
completed: 2026-09-11
---

# Quick Task 260910-sw4: Add Stable Google Review Redirect Summary

**Config-level `/review` -> Google review form 307 redirect in next.config.js, with a hermetic Playwright smoke test asserting only the status code and location header**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-11T02:45:00Z
- **Completed:** 2026-09-11T02:52:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `/review` now redirects (HTTP 307) to `https://g.page/r/CeLcycUsx16aEAI/review`, giving printed QR cards a stable target independent of the underlying Google URL
- Added a hermetic Playwright test that stops at the redirect (`maxRedirects: 0`) and never makes a real network call to Google

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the /review redirect to next.config.js** - `5d32003` (feat)
2. **Task 2: Add the Playwright redirect smoke test** - `a131c8a` (test)

**Plan metadata:** committed separately by the orchestrator (docs)

## Files Created/Modified
- `next.config.js` - Added `async redirects()` returning a single `/review` -> Google review URL entry with `permanent: false`
- `e2e/reviewRedirect.spec.ts` - Playwright smoke test asserting 307 status and `location` header via the `request` APIRequestContext fixture

## Decisions Made
- Used `permanent: false` (307) per plan requirement, not incidental — avoids aggressive browser/CDN caching of a mapping that may change
- Kept the destination as a single hardcoded string literal (no env var, no wildcard, no query/header interpolation) so it stays a one-line edit and cannot become an open redirect

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification Performed

- `node -e "..."` config assertion (Task 1): exact destination, `permanent: false`, exactly one redirect entry — PASSED
- `npx playwright test e2e/reviewRedirect.spec.ts` — 1 passed
- `npx tsc --noEmit` — clean, no output
- `npm run test` — 304/304 Vitest tests passed (unchanged from baseline)
- `npm run build` — succeeded; route table shows no new route file for `/review` (it's a config redirect, not a page) and no changes to `/`, `/checkout`, `/catering`, `/about`, `/contact`, `/orders`, or `/sca/*`

Note: `npm run lint` was not run as part of this plan's verification — it is a pre-existing, unrelated repo-wide failure already logged in STATE.md's Deferred Items (discovered during quick task 260910-sbl).

## Follow-up (deferred, not part of this plan)

Issue #17 lists "verified in the deployed Vercel environment" as an acceptance criterion, which cannot be satisfied locally. **After this merges and Vercel deploys, manually confirm that `https://bigmattsbbq.com/review` lands on the Google review form in a real mobile browser** (ideally via a scanned QR code). This check is still outstanding as of this summary.

Also out of scope per the issue: designing/printing the physical card, generating QR artwork, a custom review landing page, and review analytics/attribution.

## Next Phase Readiness

`/review` is live in code and verified locally end-to-end. No blockers. The only remaining step is the post-deploy human verification noted above, which is not a code task.

---
*Phase: quick-260910-sw4*
*Completed: 2026-09-11*

## Self-Check: PASSED

- FOUND: next.config.js
- FOUND: e2e/reviewRedirect.spec.ts
- FOUND: .planning/quick/260910-sw4-add-stable-google-review-redirect-for-pr/260910-sw4-SUMMARY.md
- FOUND: 5d32003 (Task 1 commit)
- FOUND: a131c8a (Task 2 commit)
