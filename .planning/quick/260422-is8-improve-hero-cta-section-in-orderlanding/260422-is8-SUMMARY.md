---
phase: 260422-is8
plan: 01
subsystem: ui
tags: [react, nextjs, tailwind, hero, cta]

requires: []
provides:
  - Hero CTA region in OrderLanding active-drop view with primary Shop This Drop button scrolling to #order
  - Conditional Review Cart link only visible when cartCount > 0
  - Drop title + order cutoff elevated to badge/pill row above CTA buttons
affects: [OrderLanding]

tech-stack:
  added: []
  patterns:
    - "Reuse existing .badge CSS class for contextual pill styling with inline Tailwind overrides for color variants"
    - "next/link with href='#order' for same-page smooth-scroll to section anchor"

key-files:
  created: []
  modified:
    - components/OrderLanding.tsx

key-decisions:
  - "Used bg-[#b31414] text-white inline overrides on the deadline badge to distinguish urgency from the gold title badge — no new CSS class needed"
  - "Dropped inline-flex/px/py/text-sm overrides from Review Cart Link — .button-secondary already applies those"

patterns-established: []

requirements-completed:
  - is8-01
  - is8-02
  - is8-03

duration: 5min
completed: 2026-04-22
---

# Quick Task 260422-is8: Improve Hero CTA Section in OrderLanding Summary

**Hero CTA restructured: primary "Shop This Drop" scroll-to-order button always visible, conditional Review Cart link, drop deadline elevated to gold/red badge pills above the buttons**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-22T00:00:00Z
- **Completed:** 2026-04-22T00:00:00Z
- **Tasks:** 1 of 2 complete (Task 2 is human visual verification checkpoint)
- **Files modified:** 1

## Accomplishments
- Replaced the lone always-visible Review Cart secondary button with a primary "Shop This Drop" button (`href="#order"`, `.button-primary` class) that scroll-anchors to the order section
- Drop title and order cutoff are now rendered as badge/pill elements (gold title badge, red deadline badge) positioned above the CTA button row
- Review Cart secondary link now conditionally renders only when `cartCount > 0` — invisible on fresh/empty cart visits

## Task Commits

1. **Task 1: Restructure hero CTA region** - `64d6057` (feat)

## Files Created/Modified
- `components/OrderLanding.tsx` - Hero CTA region in active-drop branch restructured (lines ~86-113); no other sections touched

## Decisions Made
- Overrode badge gold background with `bg-[#b31414] text-white` inline Tailwind on the deadline pill to visually distinguish urgency — reuses `.badge` base styles, no new CSS class
- Kept `next/link` (not `<a>`) for the `#order` scroll anchor, consistent with existing Link usage in the file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 1 code complete, build passing; awaiting human visual verification (Task 2 checkpoint)
- Verification steps: empty cart = no Review Cart visible, "Shop This Drop" scrolls to order section, cart items > 0 = Review Cart appears with count badge

## Self-Check

- [x] `components/OrderLanding.tsx` modified - file exists and was edited
- [x] Commit `64d6057` exists in git log
- [x] `npm run build` passed with no TypeScript errors

## Self-Check: PASSED

---
*Phase: 260422-is8*
*Completed: 2026-04-22*
