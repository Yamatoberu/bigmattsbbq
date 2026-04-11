---
phase: 02-drop-config-storefront
plan: 05
subsystem: ui
tags: [react, next.js, supabase, typescript, checkout]

# Dependency graph
requires:
  - phase: 02-drop-config-storefront plan 02
    provides: fetchActiveDrop, DropDTO, /api/drop route
  - phase: 02-drop-config-storefront plan 04
    provides: useActiveDrop, OrderLanding drop wiring, teaser state
provides:
  - CheckoutClient consuming DropDTO.pickupOptions for live pickup rendering
  - checkout/page.tsx server-side fetchActiveDrop with redirect when null
  - New checkout payload shape {dropId, pickupOptionId, customer, cart}
  - WR-02 fix: pickup DB error returns 500, not-found returns 404
  - D-12 clean break: PICKUP_OPTIONS deleted from lib/config.ts
affects: [03-email-confirmation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side drop fetch with redirect guard before rendering checkout form
    - Live pickup option rendering from DropDTO.pickupOptions with sold-out state
    - Submit guard: button disabled and early-return validation when no pickupOptionId selected

key-files:
  created: []
  modified:
    - lib/config.ts
    - lib/types.ts
    - components/CheckoutClient.tsx
    - components/Footer.tsx
    - app/checkout/page.tsx
    - app/api/checkout/route.ts

key-decisions:
  - "D-12 executed: PICKUP_OPTIONS deleted cleanly — lib/config.ts now exports PACKAGES only"
  - "Redirect to / when no active drop at checkout — teaser page handles no-drop UX, no 404/500"
  - "Submit disabled and early-return guard both applied for pickupOptionId — belt-and-suspenders UX"
  - "Footer hardcoded pickup bar removed alongside PICKUP_OPTIONS deletion — was dead data"

# Metrics
duration: 8min
completed: 2026-04-11
---

# Phase 02 Plan 05: Checkout Pickup Migration Summary

**CheckoutClient migrated from hardcoded PICKUP_OPTIONS to live DropDTO.pickupOptions; checkout page redirects when no active drop; WR-02 pickup error distinction fixed; D-12 dead code removed**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-11T17:33:00Z
- **Completed:** 2026-04-11T17:41:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Deleted `PICKUP_OPTIONS` from `lib/config.ts` and `PickupOption` interface from `lib/types.ts` (decision D-12 clean break)
- Rewrote `CheckoutClient` to accept `drop: DropDTO` prop and render `drop.pickupOptions` as interactive cards matching UI-SPEC (gold ring on selected, opacity-60 + Sold Out badge for sold-out options)
- Updated checkout payload to `{dropId, pickupOptionId, customer, cart}` — aligns with the existing Zod schema in the checkout route
- Added submit guard: button disabled when no `pickupOptionId` selected; early-return validation in `handleSubmit`
- Updated `app/checkout/page.tsx` to async server component: fetches active drop, redirects to `/` when null or not active
- Fixed WR-02: separated `if (pickupErr)` (500) from `if (!pickupRow)` (404) in the checkout route's pickup lookup
- Removed hardcoded pickup bar from `Footer.tsx` (was the only other `PICKUP_OPTIONS` consumer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete PICKUP_OPTIONS and legacy PickupOption** - `2efdafd` (feat)
2. **Task 2: Rewrite CheckoutClient + checkout page + WR-02 fix** - `2e93458` (feat)

## Files Created/Modified

- `lib/config.ts` - Removed PICKUP_OPTIONS export and PickupOption import; now exports PACKAGES only
- `lib/types.ts` - Deleted legacy PickupOption interface; PickupOptionDTO preserved
- `components/CheckoutClient.tsx` - Accepts drop: DropDTO; renders pickup options from drop.pickupOptions; new payload shape; submit guard
- `components/Footer.tsx` - Removed PICKUP_OPTIONS import and hardcoded pickup date bar (auto-fix: was the only other consumer)
- `app/checkout/page.tsx` - Async server component; fetchActiveDrop with redirect when null/inactive; passes drop to CheckoutClient
- `app/api/checkout/route.ts` - Split combined pickupErr/!pickupRow check into separate 500 (DB error) and 404 (not found) branches

## Decisions Made

- D-12 executed: `PICKUP_OPTIONS` deleted from `lib/config.ts` — no dead code remaining
- Redirect to `/` when no active drop at checkout — `OrderLanding` teaser handles the no-drop UX; avoids a blank or broken checkout page
- Submit disabled guard (`!pickupOptionId`) applied at button level AND early-return in `handleSubmit` for belt-and-suspenders UX
- Footer hardcoded pickup bar removed alongside the PICKUP_OPTIONS deletion — it was stale data with no live source

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Footer.tsx used PICKUP_OPTIONS — removed alongside config cleanup**
- **Found during:** Task 1 (pre-scan of PICKUP_OPTIONS consumers)
- **Issue:** `components/Footer.tsx` imported `PICKUP_OPTIONS[0]` to display a hardcoded pickup date in the footer bar. Deleting `PICKUP_OPTIONS` would have broken the build.
- **Fix:** Removed the hardcoded pickup bar from Footer entirely. The live drop data is now surfaced in OrderLanding; Footer no longer needs to show static pickup info.
- **Files modified:** `components/Footer.tsx`
- **Commit:** `2efdafd`

## Known Stubs

None — all pickup option rendering is wired to live DropDTO data. No hardcoded or placeholder values remain in the checkout flow.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `lib/config.ts` exists, no PICKUP_OPTIONS: VERIFIED
- `lib/types.ts` exists, no legacy PickupOption: VERIFIED
- `components/CheckoutClient.tsx` uses drop.pickupOptions: VERIFIED
- `app/checkout/page.tsx` has fetchActiveDrop and redirect: VERIFIED
- `app/api/checkout/route.ts` has separate pickupErr/!pickupRow branches: VERIFIED
- Commit `2efdafd` exists: VERIFIED
- Commit `2e93458` exists: VERIFIED
- 27 tests pass, tsc clean: VERIFIED

---
*Phase: 02-drop-config-storefront*
*Completed: 2026-04-11*
