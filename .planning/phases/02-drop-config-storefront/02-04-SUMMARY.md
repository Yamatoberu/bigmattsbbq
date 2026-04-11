---
phase: 02-drop-config-storefront
plan: 04
subsystem: ui
tags: [react, supabase, polling, next.js, vitest, typescript]

# Dependency graph
requires:
  - phase: 02-drop-config-storefront plan 02
    provides: fetchActiveDrop, DropDTO, /api/drop route
  - phase: 02-drop-config-storefront plan 03
    provides: checkDropReady, checkout drop gate
provides:
  - useActiveDrop client polling hook (30s interval, seeded by server prop)
  - OrderLanding teaser state when no active drop (email capture stub)
  - OrderLanding active state with drop title/cutoff banner and soldOut wiring
  - FrozenItemCard soldOut prop with opacity-60 treatment
  - checkDropReady enforces order_cutoff_at (closes CR-01 blocker)
  - app/page.tsx server-side fetchActiveDrop with graceful SSR fallback
affects: [02-05-drop-config-storefront, 03-email-confirmation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side prop seeding for client polling hook (initialDrop avoids loading flash)
    - Teaser-first rendering: early return for no-drop state, full UI only when active
    - soldOut prop derived from DropDTO.soldOut by item name matching (lowercase includes)

key-files:
  created:
    - components/hooks/useActiveDrop.ts
  modified:
    - lib/drops.ts
    - tests/checkoutDropGate.test.ts
    - app/api/checkout/route.ts
    - components/FrozenItemCard.tsx
    - components/OrderLanding.tsx
    - app/page.tsx

key-decisions:
  - "null order_cutoff_at treated as no deadline (unlimited) — avoids false 409s when cutoff not configured"
  - "Invalid date string (NaN from Date.parse) fails safe by allowing the drop through — DB schema constraint prevents this in practice"
  - "useActiveDrop accepts initialDrop param so server-passed drop seeds client state, avoiding loading flash on first render"
  - "SSR fetchActiveDrop failure degrades to teaser page (null drop) rather than 500 — Supabase outage still shows UI"
  - "soldOut derived by item name matching (lowercase includes) rather than IDs — keeps UI logic decoupled from Square variation IDs"

patterns-established:
  - "Server-seed + client-poll: server component fetches initial data, passes as prop to client hook, hook polls for updates"
  - "Conditional early return for inactive states before main render"

requirements-completed: [DATA-03, DATA-04, ORD-05]

# Metrics
duration: 12min
completed: 2026-04-11
---

# Phase 02 Plan 04: UI Drop Wiring Summary

**Active drop data wired into storefront via server-side SSR fetch + 30s client polling, with teaser page when no drop is active and cutoff enforcement closing CR-01**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-11T23:34:00Z
- **Completed:** 2026-04-11T23:46:00Z
- **Tasks:** 3
- **Files modified:** 6 (1 created)

## Accomplishments
- Closed CR-01 blocker: `checkDropReady` now rejects orders when `order_cutoff_at` is in the past (409 with copy)
- Created `useActiveDrop` hook that seeds from server prop and polls `/api/drop` every 30 seconds for live sold-out reactivity
- Wired `OrderLanding` to show teaser (email capture stub) when no active drop, and full ordering UI with live drop title/cutoff banner when active
- `FrozenItemCard` now accepts `soldOut` prop — dimmed with `opacity-60`, all variations disabled when true

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce order_cutoff_at in checkDropReady** - `c3093b9` (feat)
2. **Task 2: useActiveDrop hook and soldOut prop on FrozenItemCard** - `b81b1f9` (feat)
3. **Task 3: Wire drop data into OrderLanding and app/page.tsx** - `dad4e45` (feat)

## Files Created/Modified
- `components/hooks/useActiveDrop.ts` - Client polling hook returning {drop, isLoading, error} from /api/drop, 30s interval
- `lib/drops.ts` - Added `order_cutoff_at: string | null` to DropReadinessRow; added cutoff enforcement in checkDropReady
- `tests/checkoutDropGate.test.ts` - Updated activeRow fixture with order_cutoff_at; added 3 new cutoff tests (9 total)
- `app/api/checkout/route.ts` - Updated drops SELECT to include order_cutoff_at column
- `components/FrozenItemCard.tsx` - Added soldOut optional prop; opacity-60 wrapper; isSoldOut ORs with prop
- `components/OrderLanding.tsx` - Accepts initialDrop prop; renders teaser vs active UI; wires soldOut from drop.soldOut
- `app/page.tsx` - Converted to async server component; fetchActiveDrop with logError fallback; force-dynamic

## Decisions Made
- `null` order_cutoff_at is treated as no deadline — avoids false 409s when cutoff is not configured on a drop
- `useActiveDrop` accepts `initialDrop` parameter to seed client state from SSR fetch, avoiding loading flash
- SSR `fetchActiveDrop` failure degrades to teaser page (null drop) rather than 500 — Supabase outage still renders UI
- soldOut derived by item name lowercase matching rather than Square variation IDs — keeps UI logic decoupled

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree was initialized from an older base commit; resolved by `git reset --soft` to target commit and `git checkout HEAD -- .` to restore working tree files from full git history.
- Stale `.next/types` cache caused phantom TypeScript errors; cleared with `rm -rf .next/types` (pre-existing known issue per STATE.md).

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `components/OrderLanding.tsx` teaser form `onSubmit` is `event.preventDefault()` — mailing list backend wiring deferred to Phase 4 (per plan spec, intentional stub)

## Next Phase Readiness
- Plan 02-05 can now wire pickup option selection into CheckoutClient using the DropDTO.pickupOptions array
- Teaser email capture form is rendered but form submission is a no-op — Phase 4 mailing list plan will wire the backend
- All 27 tests pass; TypeScript clean

## Self-Check: PASSED

All files verified present. All commits verified in git history.

---
*Phase: 02-drop-config-storefront*
*Completed: 2026-04-11*
