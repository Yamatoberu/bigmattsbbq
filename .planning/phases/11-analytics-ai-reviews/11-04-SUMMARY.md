---
phase: 11-analytics-ai-reviews
plan: 04
subsystem: ui
tags: [nextjs, server-components, sca, ai-reviews]

# Dependency graph
requires:
  - phase: 11-analytics-ai-reviews
    provides: "getAllAiReviews(), getAiReviewById(), AiReviewWithCook/AiReviewCookSummary types (plan 11-02)"
provides:
  - "AI Reviews list route at /sca/ai-reviews (AIRV-01)"
  - "AI Review detail route at /sca/ai-reviews/[id] (AIRV-02)"
affects: [11-05-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "List page renders cook link only when the nullable cook embed is present, falling back to plain text with the same cookColumnLabel() text — no non-null assertion, no dead link"
    - "Detail page subtitle nests two independent optional link segments (cook, then competition) mirroring app/sca/cooks/[id]/page.tsx's own subtitle composition"

key-files:
  created:
    - app/sca/ai-reviews/page.tsx
    - app/sca/ai-reviews/[id]/page.tsx
  modified: []

key-decisions:
  - "List row's cook link renders conditionally on review.cook (not a non-null assertion) — when null, the same cookColumnLabel(null, null) text renders as a plain <p> instead of a Link with an undefined href"
  - "Detail page footer gates 'View Competition' on review.cook?.competition independently of review.cook, matching the plan's explicit requirement that a present cook with a null competition still yields 'View Cook' without 'View Competition'"

patterns-established:
  - "Both new routes reuse the exact LINK_CLASSES constant, section-spacing wrapper, and error/empty three-branch ternary already established by app/sca/cooks/page.tsx and app/sca/cooks/[id]/page.tsx"

requirements-completed: [AIRV-01, AIRV-02]

# Metrics
duration: 3min
completed: 2026-08-24
---

# Phase 11 Plan 04: AI Reviews UI Summary

**Newest-first `/sca/ai-reviews` list (badge + model + date + linked cook + 3-line comment preview) and a `/sca/ai-reviews/[id]` detail page with full comments, conditional prompt section, and independent back-links to cook and competition.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-24T15:21:00-06:00
- **Completed:** 2026-08-24T15:23:29-06:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `/sca/ai-reviews` lists every stored `cook_ai_review` row, newest-first, unfiltered by `review_type` (D-03/D-06), with a `.badge` pill for type, plain label text for model/date, a linked cook label, a 3-line comment preview, and a link into the detail page
- `/sca/ai-reviews/[id]` shows model as h1, review type + date + cook + competition in the subtitle, full untruncated comments, a prompt section rendered only when `prompt` is non-null (D-04, no placeholder), and a footer with independent back-links to the review list, the cook, and the competition (AIRV-02)
- Both routes reuse `parseScaId`/`notFound()`/try-catch-`logError` exactly as established by `app/sca/cooks/[id]/page.tsx` — no second id parser, no raw Supabase error text ever reaches the browser
- `npx tsc --noEmit`, `npm run build`, and `npm run test` (247 tests, 25 files) all pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the /sca/ai-reviews list route** - `d2518d7` (feat)
2. **Task 2: Build the /sca/ai-reviews/[id] detail route** - `d81db01` (feat)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified
- `app/sca/ai-reviews/page.tsx` - New list route; fetches `getAllAiReviews()`, renders error/empty/list three-branch ternary, one `glass-card` row per review with type badge, model, date, conditional cook link, clamped comment preview, and "Read Full Review" link
- `app/sca/ai-reviews/[id]/page.tsx` - New detail route; `parseScaId` + `notFound()` for invalid/missing ids, `getAiReviewById` in try/catch with generic error string, full comments, conditional prompt section, and a three-link footer (list, cook, competition) each independently gated

## Decisions Made
- List row's cook link is rendered only when `review.cook` is non-null; the plan explicitly required avoiding a link to an undefined id, so the null branch renders the same `cookColumnLabel(null, null)` text as plain `<p>` text rather than a disabled or broken link
- Detail page's "View Competition" footer link is gated on `review.cook?.competition` independently of `review.cook`, so a review whose cook is present but whose competition embed is null still surfaces "View Cook" alone — matches the plan's explicit AIRV-02 requirement

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both AI Reviews routes are live and verified via `tsc`, `build`, and the full Vitest suite (247 tests, 25 files, unchanged pass count from 11-02's baseline)
- `app/sca/ai-reviews/page.tsx` and `app/sca/ai-reviews/[id]/page.tsx` are ready for the phase-level 11-05 verification pass, including the nav-entry addition (`ScaNavBar`'s `scaNavLinks` gaining "AI Reviews") called out in 11-UI-SPEC.md but out of scope for this plan's `files_modified` list

---
*Phase: 11-analytics-ai-reviews*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created files (app/sca/ai-reviews/page.tsx, app/sca/ai-reviews/[id]/page.tsx, this SUMMARY.md) confirmed present on disk. Both task commit hashes (d2518d7, d81db01) confirmed present in git log.
