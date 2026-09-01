---
phase: quick-260505-fus
plan: 01
subsystem: ui
tags: [drops, conditional-rendering, landing-page]

requires: []
provides:
  - Targeted per-section conditional rendering in OrderLanding — only hero, bundles, and individual-items sections gate on an active drop; all other sections render unconditionally
affects: [landing-page, homepage]

tech-stack:
  added: []
  patterns: [inline JSX guard `{drop && drop.status === "active" && (...)}` applied independently per section, replacing an all-or-nothing early return]

key-files:
  created: []
  modified:
    - components/OrderLanding.tsx

key-decisions:
  - "Three independent inline guards, not one wrapping fragment — the description blurb and testimonials strip sit between the hero and bundles sections and must remain unconditional, so each of the three drop-gated sections carries its own `{drop && drop.status === \"active\" && (...)}` block rather than a single collapsed conditional"
  - "The now-unused mailing-list local state (mlEmail/mlState/mlError) and handleMailingListSubmit were removed along with the early-return block, since MailingListSection (already rendered unconditionally at the bottom) owns email capture for the no-drop state"
  - "useState and FormEvent imports dropped as unused after the early-return removal; useMemo retained since variationMap/bundleVariationIds/individualItems still depend on it"

requirements-completed: [QUICK-FUS-01]

duration: unknown (backfilled)
completed: 2026-05-05
---

# Quick Task 260505-fus: Hide Only Hero/Bundles/Items When No Active Drop Summary

**Removed the all-or-nothing early return that stripped the homepage down to a single email-capture hero between drops; hero, "Choose Your Drop" bundles, and "Individual Items" are now the only three sections gated on `drop && drop.status === "active"`, with description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, and the mailing list section rendering unconditionally.**

> **Backfilled summary.** This task shipped on 2026-05-05; the summary was written retroactively on 2026-09-01 from the implementing commit, not recorded at execution time. Timing metrics are unavailable.

## Performance

- **Duration:** unknown (backfilled)
- **Started:** unknown
- **Completed:** 2026-05-05 (commit `dde136a`, author date `2026-05-05 19:20:21 -0600`)
- **Tasks:** 1 (single TDD-flagged task in the plan; shipped as one commit, no separate RED/GREEN commit pair found in git history)
- **Files modified:** 1 (`components/OrderLanding.tsx`)

## Accomplishments
- Deleted the entire early-return block (`if (!drop || drop.status !== "active") { return (...) }`) that previously rendered a stripped-down "Next Drop" email-capture-only page when there was no active drop
- Removed the now-dead `mlEmail`/`mlState`/`mlError` local state and `handleMailingListSubmit` handler that existed only to power the deleted early-return's inline mailing-list form
- Dropped the now-unused `useState` and `FormEvent` imports; kept `useMemo` since `variationMap`, `bundleVariationIds`, and `individualItems` still depend on it
- Wrapped the hero section (`<section className="hero-panel">`), the "Choose Your Drop" bundles section (`<section id="order" className="section-spacing bg-[#120c09]">`), and the "Individual Items" section (`<section className="section-spacing">` containing `individualItems.map`) each independently in `{drop && drop.status === "active" && (...)}`
- Left the description blurb, testimonials strip, catering cross-sell, FAQ, pitmaster/about section, and `<MailingListSection />` completely unconditional and untouched in structure — they now render on every page load regardless of drop state
- Net diff removed more than it added (117 insertions / 184 deletions) because the deleted early-return block and its dedicated mailing-list form markup were larger than the three new inline guard wrappers

## Task Commits
Single implementing commit (plan was flagged `tdd="true"` but the type-check-driven verification in this plan's `<verify>` block is build/grep-based, not a RED/GREEN Vitest pairing, and no separate test commit exists in git history for this hash):

1. `dde136a` (feat) - "feat(homepage): hide hero/bundles/items when no active drop"

## Files Created/Modified
- `components/OrderLanding.tsx` - Early-return "Next Drop" block and its supporting mailing-list state/handler removed; hero, bundles, and individual-items sections each wrapped in an independent `drop && drop.status === "active"` guard; all other sections left unconditional (117 insertions / 184 deletions)

## Decisions Made
- Used three separate inline guards rather than one wrapping conditional block, since the description blurb and testimonials strip render between the hero and the bundles section and must stay visible in the no-drop state — collapsing the guards would have hidden them too
- Preserved `MailingListSection` (already unconditionally rendered at the bottom of the component) as the sole mailing-list capture mechanism for the no-drop state, rather than reintroducing a dedicated inline form

## Deviations from Plan

None - plan executed as written. Cross-checking the diff against the plan's `must_haves.truths`:
- "When no active drop exists, the description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, and MailingListSection are all visible" — confirmed; none of these sections were touched by the diff, so they remain unconditional.
- "When no active drop exists, the hero section, 'Choose Your Drop' bundles section, and 'Individual Items' section are NOT rendered" — confirmed; all three are now wrapped in `{drop && drop.status === "active" && (...)}`.
- "When an active drop exists, all sections render exactly as they did before" — confirmed; the wrapped sections' inner JSX is byte-identical to the pre-diff markup, only the surrounding guard changed.
- "The early-return block ... is removed" — confirmed; `grep -c 'if (!drop || drop.status !== "active")' components/OrderLanding.tsx` returns 0 against the current file.

## Issues Encountered
None.

## User Setup Required
None - pure JSX/state-cleanup change, no new environment variables, dependencies, or schema changes.

## Next Phase Readiness
- No blockers. The targeted-conditional behavior — hiding only hero/bundles/items rather than the entire page — has been live since 2026-05-05.
- Verify with `grep -c 'drop && drop.status === "active"' components/OrderLanding.tsx` (expect 3, one per gated section) and `grep -c 'if (!drop || drop.status !== "active")' components/OrderLanding.tsx` (expect 0).

---
*Quick task: 260505-fus*
*Completed: 2026-05-05*

## Self-Check: PASSED

- FOUND: components/OrderLanding.tsx
- FOUND: dde136a
