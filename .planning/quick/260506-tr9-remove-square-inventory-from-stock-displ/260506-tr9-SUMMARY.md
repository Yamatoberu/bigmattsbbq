---
phase: 260506-tr9
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, sold-out, inventory, square, supabase]

requires:
  - phase: 260506-t9u
    provides: "drop.soldOut.* Supabase fields driving individual item sold-out state"

provides:
  - "FrozenItemCard with soldOut prop as sole availability gate, no variation.remaining dependency"
  - "OrderLanding package sold-out decoupled from catalog canAdd (uses drop.soldOut.* only)"
  - "itemSoldOut in OrderLanding short-circuits to false when drop.capacityEnforced is false"

affects: [OrderLanding, FrozenItemCard, PackageCard, sold-out, inventory]

tech-stack:
  added: []
  patterns:
    - "Availability = Supabase drop.soldOut.*; catalog presence (variationMap/canAdd) drives isDisabled only"
    - "capacityEnforced guard applied in parent (OrderLanding), not child (FrozenItemCard)"

key-files:
  created: []
  modified:
    - components/FrozenItemCard.tsx
    - components/OrderLanding.tsx

key-decisions:
  - "soldOut and isDisabled separation: sold-out (stock signal from Supabase) and canAdd (catalog presence) are now orthogonal — a package missing from the Square catalog can still show sold-out state"
  - "capacityEnforced guard moved into itemSoldOut computation in OrderLanding so FrozenItemCard receives a pre-computed boolean and needs no awareness of drop state"
  - "variationMap value type trimmed to priceCents+currency only — remaining field removed since nothing reads it after this change"

patterns-established:
  - "Single availability source: all UI sold-out decisions read exclusively from drop.soldOut.*, never from variation.remaining"

requirements-completed: [TR9-01, TR9-02, TR9-03]

duration: 8min
completed: 2026-05-06
---

# Phase 260506-tr9: Remove Square Inventory from Stock Display Summary

**Sold-out gating in FrozenItemCard and OrderLanding now reads exclusively from Supabase drop.soldOut.*, eliminating variation.remaining from all UI availability decisions**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-07T03:22:00Z
- **Completed:** 2026-05-07T03:30:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed `ignoreStock` prop and `variation.remaining` stock gating from `FrozenItemCard` — the `soldOut` prop is now the sole gate for SoldOutCapture vs Add to Cart rendering
- Eliminated the "X left" Square inventory count display from FrozenItemCard entirely
- Fixed incorrect `soldOut={canAdd && pkgSoldOut}` in package rendering — sold-out state (Supabase) and catalog availability (canAdd) are now orthogonal signals passed via separate props
- `itemSoldOut` in OrderLanding now wraps in `drop.capacityEnforced &&` guard, replacing the removed `ignoreStock={!drop.capacityEnforced}` prop pattern
- Trimmed `variationMap` value type to `{priceCents, currency}` — `remaining` removed since no code reads it from the map

## Task Commits

1. **Task 1: Strip variation.remaining stock gating and "X left" display from FrozenItemCard** - `0c69c56` (refactor)
2. **Task 2: Clean up package soldOut derivation in OrderLanding and drop ignoreStock callsite** - `1cdd49b` (refactor)

## Files Created/Modified

- `components/FrozenItemCard.tsx` - Removed ignoreStock prop, isSoldOut replaced with soldOut directly, "X left" display block deleted
- `components/OrderLanding.tsx` - Package pkgSoldOut no longer gated on canAdd; itemSoldOut wrapped in capacityEnforced guard; ignoreStock callsite removed; variationMap value type trimmed

## Decisions Made

- `soldOut` and `isDisabled` are intentionally separate concerns on PackageCard: a package whose bundle variation is absent from Square catalog should still render as sold-out (showing email capture) if Supabase says so — `isDisabled` handles the catalog-missing case
- `capacityEnforced` guard applied in OrderLanding (parent) rather than FrozenItemCard (child), keeping FrozenItemCard a pure presentational component with no drop-level awareness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

TypeScript reported an error during Task 1 verification because OrderLanding still passed the now-removed `ignoreStock` prop. This was expected — the plan's tasks are sequential and Task 2 resolves the callsite. Final `npx tsc --noEmit` after both tasks passed cleanly.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced. Pure UI refactor.

## Next Phase Readiness

- Single source of truth for availability is established across all UI sold-out decisions
- `variation.remaining` remains in DTO/API layer (lib/types.ts, lib/normalizers.ts, lib/square.ts) for forward compatibility — safe to remove in a future cleanup phase if the field is no longer needed anywhere
- All 77 Vitest tests pass; TypeScript is green

---
*Phase: 260506-tr9*
*Completed: 2026-05-06*
