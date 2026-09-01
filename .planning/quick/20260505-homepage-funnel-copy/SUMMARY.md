---
phase: quick-20260505-homepage-funnel-copy
plan: 01
subsystem: ui
tags: [copywriting, conversion, landing-page, funnel]

requires: []
provides:
  - Homepage hero headline rewrite, pre-sell sensory copy block, and origin-story block on the active-drop path of `OrderLanding`
affects: [landing-page, homepage]

tech-stack:
  added: []
  patterns: [copy-only section insertion into an existing JSX return block, no new components]

key-files:
  created: []
  modified:
    - components/OrderLanding.tsx

key-decisions:
  - "All three copy blocks (hero rewrite, pre-sell, origin story) landed as a single atomic commit per the plan's explicit instruction, rather than three separate commits"
  - "Origin story block links out to /about via a plain <a> tag rather than next/link, matching the plan's exact specified markup"

requirements-completed: []

duration: unknown (backfilled)
completed: 2026-05-05
---

# Quick Task 20260505: Homepage Funnel Copy — Issues 1, 3, 8 Summary

**Active-drop hero headline rewritten from "Orders are open!" to "Real Pit-Smoked BBQ — Straight to Your Freezer." with a new subheadline, plus two new copy sections inserted into `OrderLanding.tsx`: a pre-sell sensory block after the hero and an origin-story/pitmaster block before the mailing list section.**

> **Backfilled summary.** This task shipped on 2026-05-05; the summary was written retroactively on 2026-09-01 from the implementing commit, not recorded at execution time. Timing metrics are unavailable.

## Performance

- **Duration:** unknown (backfilled)
- **Started:** unknown
- **Completed:** 2026-05-05 (commit `845099e`, author date `2026-05-05 10:32:08 -0600`)
- **Tasks:** unknown (backfilled from a single implementing commit; plan specified 3 copy changes committed atomically)
- **Files modified:** 1 (`components/OrderLanding.tsx`)

## Accomplishments
- Rewrote the active-drop hero `<h1>` from `Orders are open!` to `Real Pit-Smoked BBQ —<br className="hidden sm:block" /> Straight to Your Freezer.` and added a new `<p>` subheadline immediately after it: "Brisket and pulled pork smoked low and slow for 12–14 hours, vacuum-sealed at peak flavor, and ready to heat any night of the week." (Issue 1)
- Inserted a new pre-sell copy section between the hero and the "Choose Your Drop" bundles section: a single centered paragraph describing the overnight smoking process, wood types, vacuum-sealing, and a "heat and eat" close (Issue 3)
- Inserted a new "The Pitmaster" origin-story section between the FAQ section and `<MailingListSection />`: eyebrow label, `<h2>` headline "One smoker. Twelve-hour cooks. Real BBQ.", a paragraph covering the Covid-hobby-to-catering origin story, and a "Read the full story →" link to `/about` (Issue 8)

## Task Commits
Single implementing commit (matches plan's explicit "commit all three as a single atomic commit" instruction; no TDD pairing — this is a copy-only change):

1. `845099e` (feat) - "feat(homepage): add funnel copy — hero hook, pre-sell block, origin story"

## Files Created/Modified
- `components/OrderLanding.tsx` - Hero `<h1>` text replaced and a new subheadline `<p>` added; new pre-sell `<section>` inserted after the hero; new pitmaster/origin-story `<section>` inserted before `<MailingListSection />` (38 insertions / 1 deletion)

## Decisions Made
- Followed the plan's exact copy text and JSX verbatim, including exact className strings, with no rewording or restructuring

## Deviations from Plan

None - plan executed as written (verified by diffing commit 845099e against PLAN.md). The commit message matches the plan's specified commit message verbatim, and all three copy blocks (hero rewrite + subheadline, pre-sell block, origin-story block) landed exactly as written in `PLAN.md`, in the exact insertion points specified.

## Issues Encountered
- Plan frontmatter `status: pending` is stale — the work in fact shipped in commit `845099e` on 2026-05-05 and has been live since. No summary was ever written at the time, which is what this backfill corrects.

## User Setup Required
None - pure copy/JSX change, no new environment variables, dependencies, or schema changes.

## Next Phase Readiness
- No blockers. All three copy blocks have been live on the active-drop homepage path since 2026-05-05.
- Grep-verifiable copy anchors (do not rely on line numbers, which drift):
  - `grep -n "Real Pit-Smoked BBQ" components/OrderLanding.tsx`
  - `grep -n "Every batch starts the night before" components/OrderLanding.tsx`
  - `grep -n "One smoker. Twelve-hour cooks. Real BBQ." components/OrderLanding.tsx`

---
*Quick task: 20260505-homepage-funnel-copy*
*Completed: 2026-05-05*

## Self-Check: PASSED

- FOUND: components/OrderLanding.tsx
- FOUND: 845099e
