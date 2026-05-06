---
phase: quick-260505-fkj
plan: 01
subsystem: ui
tags: [next.js, tailwind, homepage, catering, cross-sell]

requires: []
provides:
  - Catering cross-sell block on homepage between Individual Items and FAQ, styled to match The Pitmaster section
  - Removal of redundant trailing catering section (Event-ready BBQ) after MailingListSection
affects: [homepage, catering funnel]

tech-stack:
  added: []
  patterns:
    - "Dark editorial sections (bg-[#120c09], max-w-2xl text-center, display font h2, ember-gold eyebrow + link) used for The Pitmaster now extended to catering cross-sell"

key-files:
  created: []
  modified:
    - components/OrderLanding.tsx
    - public/russel_review.md

key-decisions:
  - "Used <Link> (Next.js) rather than <a> for the /catering CTA, consistent with internal routing convention"
  - "Placed catering cross-sell immediately after Individual Items grid — high engagement position where scrolling buyers are primed"

patterns-established:
  - "Editorial dark-bg sections (Pitmaster pattern) are the canonical treatment for brand narrative blocks on the homepage"

requirements-completed:
  - QUICK-260505-FKJ-01

duration: 5min
completed: 2026-05-05
---

# Quick 260505-fkj Plan 01: Reposition Catering Cross-Sell Block Summary

**Catering cross-sell block moved to post-items position on homepage, styled as Pitmaster-matched dark editorial section with "Feeding a crowd?" headline and /catering CTA; redundant trailing minimal section removed**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-05-05
- **Tasks:** 2 of 2 (human-verify checkpoint approved)
- **Files modified:** 2

## Accomplishments

- New catering cross-sell section inserted between Individual Items grid and FAQ, visually matching The Pitmaster block (same `bg-[#120c09]`, `max-w-2xl text-center`, display-font H2, ember-gold `#f0c16a` eyebrow + link treatment)
- Copy: eyebrow "Catering", heading "Feeding a crowd?", body about Utah events/per-person pricing/fresh-cooked day-of, CTA "See Catering Packages →" linking to `/catering`
- Deleted the previous `bg-[#0f0b08]` section with `SectionHeader eyebrow="Catering" title="Event-ready BBQ"` and "See full catering menu →" button that was rendering after `<MailingListSection />`
- Marked Issue 5 (catering cross-sell) as done in `public/russel_review.md`
- Build passes with zero TypeScript or lint errors

## Task Commits

1. **Task 1: Reposition + restyle catering block; remove trailing duplicate** - `78ed3d4` (feat)

## Files Created/Modified

- `components/OrderLanding.tsx` - Inserted catering cross-sell block between Individual Items and FAQ; removed trailing catering section after MailingListSection
- `public/russel_review.md` - Marked Issue 5 catering cross-sell as done in the status table

## Decisions Made

- Used `<Link href="/catering">` (not `<a>`) for the CTA — consistent with Next.js internal routing convention and how the now-deleted trailing section had already used `Link`
- No imports removed: `SectionHeader` remains in use by Choose Your Drop, Individual Items, and FAQ sections; `Link` is used by the new catering block

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Homepage section order: Hero → origin paragraph → Testimonials strip → Choose Your Drop → Individual Items → Catering cross-sell → FAQ → The Pitmaster → Mailing List
- Issue 5 catering cross-sell complete; Issue 5 Value Ladder / Drop Club (Issue 9 in review table) remains TODO

## Self-Check: PASSED

- `components/OrderLanding.tsx` contains "Feeding a crowd?" at line 273
- Commit `78ed3d4` exists in git log
- "Event-ready BBQ" returns zero matches in OrderLanding.tsx
- "See full catering menu" returns zero matches in OrderLanding.tsx
- `/catering` link count is exactly 1
- Build succeeded (no TS or lint errors)
