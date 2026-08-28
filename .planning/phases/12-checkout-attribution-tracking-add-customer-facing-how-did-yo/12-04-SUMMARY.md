---
phase: 12-checkout-attribution-tracking
plan: 04
subsystem: ui
tags: [typescript, react, nextjs]

# Dependency graph
requires:
  - phase: 12-01
    provides: "AttributionSourceDTO contract"
  - phase: 12-02
    provides: "GET /api/attribution-sources — public route serving the active source list as DTOs"
provides:
  - "useAttributionSources() client fetch hook"
  - "customer-facing 'How did you hear about us?' dropdown + contextual detail input on /checkout"
affects: [12-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused the single established client-fetch-hook shape (useFrozenItems) for a second, unrelated data source (attribution sources) — third consumer of this shape in the repo counting frozen-items and pickup options"

key-files:
  created:
    - components/hooks/useAttributionSources.ts
  modified:
    - components/CheckoutClient.tsx

key-decisions:
  - "Hook surfaces its own error state rather than swallowing it; the D-09 silent-degradation requirement is implemented at the consumer (CheckoutClient's render gate), not inside the hook, matching the plan's explicit separation of concerns"
  - "isLoading from useAttributionSources is deliberately never destructured in CheckoutClient, so the attribution fetch can never enter the submit button's disabled expression"

requirements-completed: [D-03, D-04, D-05, D-06, D-07, D-08, D-09]

# Metrics
duration: 6min
completed: 2026-08-28
---

# Phase 12 Plan 04: Customer-Facing Attribution Question Summary

**Added a "How did you hear about us? (optional)" dropdown as the last field of the checkout Customer Info form, with a contextual optional detail input for the three sources that ask for one, wired to submit the stable code — degrading silently and without blocking checkout if the source list fails to load.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-28T21:31:32Z
- **Completed:** 2026-08-28T21:33:56Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Shipped `components/hooks/useAttributionSources.ts`, a structural copy of the existing `useFrozenItems` client-fetch-hook shape, fetching `/api/attribution-sources` with `cache: "no-store"` and returning `{ sources, isLoading, error, reload }`
- Extended `CheckoutClient.tsx`'s Customer Info form with a `<select>` (not radio buttons, D-05) as the last field, listing the 8 active sources pre-sorted by `sortOrder` from the API, plus a conditional single-line detail `<input>` (`maxLength={255}`) that appears only for `ai`/`event`/`other` with hardcoded contextual labels (D-06) and is cleared in the same `setFormState` update whenever the newly-selected source does not require detail (D-07)
- Gated the entire question on `!attributionSourcesError && attributionSources.length > 0` (D-09) so a Supabase/API outage makes the question disappear with zero customer-visible error, and left `useAttributionSources()`'s `isLoading` undestructured so the fetch can never affect the submit button's `disabled` expression
- Wired `customer.attributionSourceCode` / `customer.attributionDetail` into the `POST /api/checkout` body using the same `|| undefined` empty-string coercion already used for `phone`, sending the stable `code` (never the label, never the numeric `id` — D-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the useAttributionSources client hook** - `8e89d06` (feat)
2. **Task 2: Add the attribution dropdown, conditional detail input, and submit wiring to CheckoutClient** - `9613e83` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified
- `components/hooks/useAttributionSources.ts` - New client hook, structural copy of `useFrozenItems`; fetch fallback message `"Unable to load attribution sources"`; catch path resets to `{ sources: [], isLoading: false, error: message }` rather than swallowing the error
- `components/CheckoutClient.tsx` - Added `ATTRIBUTION_DETAIL_LABELS` / `ATTRIBUTION_DETAIL_FALLBACK_LABEL` module consts; `useAttributionSources()` call (only `sources`/`error` destructured); `attributionSourceCode`/`attributionDetail` added to `formState`; derived `selectedAttributionSource`/`showAttributionDetail`/`attributionDetailLabel`; new `<select>` + conditional `<input>` block inside the existing `md:grid-cols-2` Customer Info grid, gated on `!attributionSourcesError && attributionSources.length > 0`; submit payload extended with both new customer fields

## Decisions Made
- Error surfacing lives in the hook; silent degradation (D-09) lives in the consumer's render gate — this matches the plan's explicit instruction that the hook is not responsible for hiding its own failure
- `isLoading` from `useAttributionSources()` is never destructured in `CheckoutClient`, keeping the submit button's `disabled` expression byte-identical to before this plan (`isSubmitting || isLoading || !pickupOptionId`, where `isLoading` still refers only to `useFrozenItems`)

## Deviations from Plan

### Auto-fixed Issues

None — Rules 1-3 were not triggered; the plan's action specifications mapped directly onto the existing `useFrozenItems` template and `CheckoutClient` form structure with no bugs, missing functionality, or blockers encountered.

## Issues Encountered

None.

## Known Stubs

None — the dropdown and detail input are fully wired to the live `/api/attribution-sources` route and the real checkout submit payload; no placeholder values or unwired data paths were introduced.

## Threat Flags

None — all new surface (server-supplied `label` rendered as `<option>` text, `attributionDetail` free-text input, attribution-fetch-failure handling, and the client/server boundary around `lib/supabase.ts`/`lib/attributionSources.ts`) was explicitly covered by this plan's own `<threat_model>` (T-12-08, T-12-09, T-12-10, T-12-05) and verified via the plan's grep-based acceptance criteria plus a `dangerouslySetInnerHTML` absence check.

## User Setup Required

None - no external service configuration required. Verified live against the already-configured Supabase `attribution_sources` table (`GET /api/attribution-sources` on a running dev server returned all 8 active rows in the expected `sortOrder`, matching this plan's `<live_data>` table exactly).

## Next Phase Readiness
- Plan 05 (E2E coverage) can now stub or exercise `/api/attribution-sources` against a live `CheckoutClient` that renders the dropdown, conditional detail input, and submits `attributionSourceCode`/`attributionDetail` on `POST /api/checkout`
- No blockers

---
*Phase: 12-checkout-attribution-tracking*
*Completed: 2026-08-28*

## Self-Check: PASSED

All created/modified files exist on disk (`components/hooks/useAttributionSources.ts`, `components/CheckoutClient.tsx`, `12-04-SUMMARY.md`) and all referenced commit hashes (8e89d06, 9613e83) are present in git history.
