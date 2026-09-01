---
phase: quick-260507-fix-bundle-variation-ids-and-orderitems
plan: 01
subsystem: payments
tags: [square, checkout, bundles, catalog]

requires: []
provides:
  - Bundle checkout line items resolve to the correct Square catalog item via name-normalized lookup, closing the stale-variation-ID and silent-mismatch bugs
affects: [checkout, catalog]

tech-stack:
  added: []
  patterns: [normalizeMatch()-based (lowercase+trim) catalog name lookup with console.warn on miss, superseding hardcoded variation ID config]

key-files:
  created: []
  modified:
    - components/OrderLanding.tsx
    - lib/config.ts
    - components/CheckoutClient.tsx

key-decisions:
  - "The plan's proposed fix (swap 3 stale bundleVariationId values in lib/config.ts, delete the orderItems flatMap in CheckoutClient) was NOT what ultimately shipped between this plan's two cited commits — see Deviations from Plan below for the real sequence"
  - "completed: 2026-05-07 reflects when the second cited commit (80942a7) closed the plan, not when the underlying bug was fully resolved architecturally (that happened in the intervening eec344a refactor, also on 2026-05-07)"

requirements-completed: []

duration: unknown (backfilled)
completed: 2026-05-07
---

# Quick Task 260507: Fix Bundle Checkout — Variation IDs + orderItems Expansion Summary

**Bundle checkout line items now resolve against the Square catalog via a normalized (lowercase+trim) `catalogName` match with a `console.warn` on miss, replacing an earlier hardcoded `bundleVariationId` config approach that had gone stale — though the two commits this task cites bookend three other unrelated commits that did the actual architectural pivot.**

> **Backfilled summary.** This task shipped across two commits, 2026-05-06 → 2026-05-07; the summary was written retroactively on 2026-09-01 from the implementing commits, not recorded at execution time. Timing metrics are unavailable.

## Performance

- **Duration:** unknown (backfilled) — shipped across two commits spanning 2026-05-06 07:53 to 2026-05-07 13:16, roughly 29 hours wall-clock, but three unrelated intervening commits (dc7b34a, 34830ed, eec344a, all 2026-05-07 09:15–09:44) landed between them, so the real active work time for this task's two commits cannot be isolated from git history alone
- **Started:** 2026-05-06T07:53:53-06:00 (commit `c753abb`)
- **Completed:** 2026-05-07T13:16:28-06:00 (commit `80942a7`)
- **Tasks:** unknown (backfilled; plan describes 2 changes, shipped as 2 commits closing different halves of the underlying bug, not a 1:1 match to the plan's proposed diff)
- **Files modified:** 3 across both commits (`components/OrderLanding.tsx`, `lib/config.ts`, `components/CheckoutClient.tsx`)

## Accomplishments
- `c753abb` (2026-05-06) closed the "stale variation ID causes wrong items in the Individual Items grid" half of the bug: replaced `OrderLanding.tsx`'s `bundleVariationIds`-based filter (a `Set<string>` of variation IDs used to exclude bundle components from the individual-items list) with a name-based filter (`bundleItemNames`, matching on lowercased package name substring) — this decouples the individual-items filter from variation ID staleness entirely
- `80942a7` (2026-05-07) closed the "checkout silently fails to find the bundle's catalog item / Square line item" half: normalized the `catalogName` lookup in `CheckoutClient.tsx`'s `bundleVariationIdToInfo` and `productNameMap` builders from an exact `item.name === pkg.catalogName` match to `normalizeMatch(item.name) === normalizeMatch(pkg.catalogName)` (lowercase+trim), and added `console.warn` calls that fire immediately when a package's `catalogName` has no matching catalog item, surfacing mismatches during testing instead of a silent `undefined` variation

## Task Commits
Two commits closing two different halves of the original bug description (no TDD pairing — both are direct fixes):

1. `c753abb` (fix) - "fix: correct bundle variation IDs and filter by item name" — closed the individual-items-list stale-variation-ID filtering bug (OrderLanding.tsx side)
2. `80942a7` (fix) - "fix: normalize catalogName match and warn on missing bundle in CheckoutClient" — closed the silent catalog-name-mismatch bug (CheckoutClient.tsx side)

## Files Created/Modified
- `components/OrderLanding.tsx` - `bundleVariationIds` Set-based filter replaced with `bundleItemNames` name-substring filter for excluding bundle components from Individual Items (commit `c753abb`)
- `lib/config.ts` - `bundleVariationId` values in `PACKAGES` swapped in commit `c753abb` (see Deviations below for why this direction does not match the plan's stated old→new mapping); the field itself was removed entirely two days later in the intervening `eec344a` refactor in favor of `catalogName`
- `components/CheckoutClient.tsx` - `bundleVariationIdToInfo` and `productNameMap` catalog lookups changed from exact-match to `normalizeMatch()`-normalized match, with `console.warn` added on miss (commit `80942a7`)

## Decisions Made
- Neither commit deletes an `orderItems` flatMap from `CheckoutClient.tsx` as the plan proposed — by the time `80942a7` landed, `orderItems` expansion logic had already been added and removed by the intervening `dc7b34a`/`34830ed` commits, and `bundleVariationId` itself had been replaced by `catalogName` in `eec344a`. `80942a7`'s fix targets the catalogName-lookup approach that superseded the plan's original diff target.

## Deviations from Plan

**This is the load-bearing deviation for this backfill — read carefully.** The plan (`PLAN.md`, `status: complete`) proposed two isolated changes: (1) update three stale `bundleVariationId` hex values in `lib/config.ts`, and (2) delete an `orderItems` flatMap expansion in `CheckoutClient.tsx`. Diffing the two cited commits against that plan shows:

1. `c753abb`'s `lib/config.ts` diff changes the three `bundleVariationId` values in the **opposite direction** from what the plan specifies. The plan says `backyard-host: QQU57H5MIGIRGVE3EHYSZ4RI → TXDOELPK4D7CUBWJBNLVD3TB`; the actual commit changes `backyard-host` from `TXDOELPK4D7CUBWJBNLVD3TB` back to `QQU57H5MIGIRGVE3EHYSZ4RI` (and similarly reverses `family-night` and `freezer-filler`). This indicates the plan's proposed IDs had already been superseded by a different fix before `c753abb` executed, and the executor at the time corrected in the direction that matched the live Square catalog rather than the plan's stale proposal.
2. `c753abb` does not touch `CheckoutClient.tsx` at all — the `orderItems` flatMap deletion the plan describes is not in this commit.
3. Between the two cited commits, three unrelated commits landed on 2026-05-07 (`dc7b34a` "expand bundle variations to individual items for Square order only", `34830ed` "use correct bundle variation IDs and send bundles as-is to Square", `eec344a` "refactor: replace hardcoded bundleVariationId with dynamic catalogName lookup"). The third of these, `eec344a`, is an architectural pivot: it removed the `bundleVariationId` field from `PackageConfig`/`lib/config.ts` entirely and replaced hardcoded-ID matching with dynamic `catalogName`-based lookup (`lib/types.ts` `catalogName: string` field, confirmed still present in the current codebase — `grep -c bundleVariationId lib/config.ts` returns 0 today).
4. `80942a7`'s fix operates entirely on the `catalogName`-based lookup introduced by `eec344a`, not on the `bundleVariationId` approach the plan described removing `orderItems` from.

**Conclusion:** the plan's originally diagnosed root cause (stale hardcoded variation IDs + a redundant `orderItems` expansion) was real, but the actual fix that shipped is architecturally different — the codebase moved away from hardcoded `bundleVariationId` matching to dynamic `catalogName` matching, and this task's two commits are the pre- and post-pivot bookends of that larger, undocumented refactor rather than a direct implementation of the plan's proposed diff.

**Disambiguation from `260507-bcm`.** A different quick task from the same window, `260507-bcm` ("Fix bundle price showing zero in checkout order summary", commit `70aa204`, 2026-05-07), is already summarized and already has its own STATE.md row. This task is NOT that one. `260507-bcm` covers the zero-price display bug in the checkout order summary UI; this task (`260507-fix-bundle-variation-ids-and-orderitems`) covers `bundleVariationId` staleness and the eventual `catalogName`-based replacement plus normalized matching in `CheckoutClient`. A future reader should not collapse these two into a single fix.

## Issues Encountered
- The plan's `status: complete` frontmatter is accurate in outcome (the underlying bug is fixed in the current codebase) but the plan's specific proposed diff was superseded by a larger refactor before it fully landed — see Deviations above.

## User Setup Required
None - no new environment variables, dependencies, or schema changes. Bundle catalog names in `lib/config.ts` (`catalogName` field) must continue to match the live Square catalog item names (case/whitespace now tolerant via `normalizeMatch()`).

## Next Phase Readiness
- No blockers. Bundle checkout line-item resolution has used the `catalogName` + `normalizeMatch()` approach since 2026-05-07 with no further fixes needed in this area since.
- Verify with `grep -c 'bundleVariationId' lib/config.ts` (expect 0 — field fully removed) and `grep -n 'normalizeMatch' components/CheckoutClient.tsx` (confirms normalized matching is in place).

---
*Quick task: 260507-fix-bundle-variation-ids-and-orderitems*
*Completed: 2026-05-07*

## Self-Check: PASSED

- FOUND: components/OrderLanding.tsx
- FOUND: lib/config.ts
- FOUND: components/CheckoutClient.tsx
- FOUND: c753abb
- FOUND: 80942a7
