---
phase: quick-20260501-hero-redesign-full-bleed
plan: 01
subsystem: ui
tags: [tailwind, css, hero, landing-page]

requires: []
provides:
  - Full-bleed atmospheric hero section (`.hero-panel`) replacing the striped panel card on both the active-drop and no-drop `OrderLanding` paths
affects: [landing-page, homepage]

tech-stack:
  added: []
  patterns: [full-bleed section background via layered CSS radial-gradients + a `::after` bottom fade pseudo-element, replacing a bordered card component]

key-files:
  created: []
  modified:
    - app/globals.css
    - components/OrderLanding.tsx

key-decisions:
  - "Hero background layers are pure CSS on `.hero-panel` (two radial-gradient ember glows + a linear-gradient dark base), not a wrapping `<div>` with an inline gradient overlay — the previous markup had a separate absolutely-positioned overlay div inside `hero-panel`; that div was removed entirely and its glow folded into the CSS class"
  - "Bottom fade into the next section uses a `.hero-panel::after` pseudo-element (`linear-gradient(to bottom, transparent, #120c09)`) rather than an inline gradient on the section itself, keeping the fade reusable if hero-panel is used elsewhere"

requirements-completed: []

duration: unknown (backfilled)
completed: 2026-05-01
---

# Quick Task 20260501: Hero Redesign — Full-Bleed Atmospheric Summary

**Full-bleed atmospheric hero replacing the striped, rounded-card hero panel — two ember radial-gradient glows over a dark base, with a bottom-fade pseudo-element blending into the order section, on both the active-drop and no-drop `OrderLanding` render paths.**

> **Backfilled summary.** This task shipped on 2026-05-01; the summary was written retroactively on 2026-09-01 from the implementing commit, not recorded at execution time. Timing metrics are unavailable.

## Performance

- **Duration:** unknown (backfilled)
- **Started:** unknown
- **Completed:** 2026-05-01 (commit `feef870`, author date `2026-05-01 20:42:07 -0600`)
- **Tasks:** unknown (backfilled from a single implementing commit)
- **Files modified:** 2 (`app/globals.css`, `components/OrderLanding.tsx`)

## Accomplishments
- Rewrote `.hero-panel` in `app/globals.css`: removed `rounded-lg`, `border border-[#3a2a1e]`, and the `repeating-linear-gradient` diagonal stripe pattern; replaced with `background: radial-gradient(ellipse 80% 60% at 20% 40%, rgba(180, 50, 12, 0.22), transparent 65%), radial-gradient(ellipse 50% 40% at 5% 60%, rgba(230, 70, 34, 0.12), transparent 60%), linear-gradient(180deg, #0d0906 0%, #110a07 70%, #120c09 100%);`
- Added a new `.hero-panel::after` rule — a full-width, 6rem-tall (`h-24`) absolutely-positioned bottom fade (`linear-gradient(to bottom, transparent, #120c09)`) so the hero visually bleeds into the dark order section below
- Expanded `.hero-content` from a capped `max-w-xl px-6 py-5 md:px-12 md:py-8` box to full-width `px-6 py-14 md:px-12 md:py-20`, removing the old width cap entirely
- Restructured both render paths in `components/OrderLanding.tsx` (163 lines touched): removed the `<section className="px-4 pb-10 pt-6 md:px-10"><div className="mx-auto max-w-3xl"><div className="hero-panel">` wrapper nesting and the separate absolutely-positioned radial overlay `<div>`, replacing it with a single `<section className="hero-panel">` whose direct child is `<div className="hero-content mx-auto max-w-5xl ...">` — collapsing three nested wrapper elements into one section
- No-drop path: mailing-list signup form content now renders centered directly inside the full-bleed section, no card box
- Active-drop path: added a new `<h1>` headline ("Frozen BBQ,<br />straight from the pit.") that did not exist in the pre-redesign markup, alongside the pickup-option list and Shop This Drop / Review Cart CTAs, all now inside the `max-w-5xl` full-bleed container instead of `max-w-6xl`

## Task Commits
Single implementing commit (no TDD pairing — this is a styling/markup change):

1. `feef870` (style) - "style: replace striped hero panel with full-bleed atmospheric design"

## Files Created/Modified
- `app/globals.css` - `.hero-panel` rewritten from bordered/striped card to full-bleed atmospheric background; new `.hero-panel::after` bottom-fade layer added; `.hero-content` width cap removed (18 lines changed)
- `components/OrderLanding.tsx` - Both the no-drop and active-drop hero render paths restructured to use the new full-bleed `.hero-panel`/`.hero-content` classes directly on `<section>`/`<div>` instead of a nested card wrapper with a separate overlay div; active-drop path gained a headline that was not present before (90 insertions / 91 deletions)

## Decisions Made
- Kept both drop-state hero paths (no-drop mailing-list capture, active-drop order CTA) visually consistent by applying the same `.hero-panel`/`.hero-content` class pair to both, rather than diverging their markup structure
- Folded the previously separate radial-gradient overlay `<div>` into the `.hero-panel` CSS class itself, eliminating a DOM node that existed purely for background decoration

## Deviations from Plan

The diff goes beyond the plan's stated scope in one place: the plan's `## Changes` section describes only CSS/class restructuring (`.hero-panel`, `.hero-content`, wrapper removal) and does not mention adding new content. The shipped commit adds a new `<h1>` headline ("Frozen BBQ,<br />straight from the pit.") to the active-drop path that was not present in the pre-redesign markup and is not described anywhere in `PLAN.md`. Everything else — the CSS gradient rewrite, the bottom-fade pseudo-element, the wrapper-div removal on both paths, and the `max-w-5xl` content width — matches the plan's design spec exactly (verified by diffing commit `feef870` against `PLAN.md`).

## Issues Encountered
- Plan frontmatter `status: in-progress` is stale — the work in fact shipped in commit `feef870` on 2026-05-01 and has been live since. No summary was ever written at the time, which is what this backfill corrects.

## User Setup Required
None - pure CSS/JSX change, no new environment variables, dependencies, or schema changes.

## Next Phase Readiness
- No blockers. The full-bleed hero has been live on both the no-drop and active-drop `OrderLanding` paths since 2026-05-01.
- Verify with `grep -n 'hero-panel' app/globals.css` — two rules present (`.hero-panel` and `.hero-panel::after`), no `repeating-linear-gradient` or `rounded-lg`/`border` remaining on `.hero-panel`.

---
*Quick task: 20260501-hero-redesign-full-bleed*
*Completed: 2026-05-01*

## Self-Check: PASSED

- FOUND: app/globals.css
- FOUND: components/OrderLanding.tsx
- FOUND: feef870
