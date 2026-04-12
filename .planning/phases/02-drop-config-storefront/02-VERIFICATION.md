---
phase: 02-drop-config-storefront
verified: 2026-04-11T12:30:00Z
status: complete
score: 4/4 roadmap success criteria verified
overrides_applied: 0
gaps:
  - truth: "The ordering page displays pickup locations and dates pulled from the active Supabase drop record, not from hardcoded config"
    status: resolved
    resolved_by: "Phase 2 plans 02-04 and 02-05; remaining capacity enforcement moved to Phase 3"
    reason: "OrderLanding.tsx does not fetch from /api/drop or accept a DropDTO prop. CheckoutClient.tsx still imports PICKUP_OPTIONS from lib/config.ts and sends the old {pickup: {...}} payload shape. PICKUP_OPTIONS is still exported from lib/config.ts. Plans 02-04 and 02-05 are documented in the context as remaining work but have no PLAN.md files yet."
    artifacts:
      - path: "components/OrderLanding.tsx"
        issue: "No import of DropDTO, no useActiveDrop hook, no /api/drop fetch — still renders without any drop data"
      - path: "components/CheckoutClient.tsx"
        issue: "Still imports PICKUP_OPTIONS from lib/config.ts and sends old {pickup: {locationLabel, pickupDateLabel, pickupAtISO}} payload shape — will 400 against the updated checkout route"
      - path: "lib/config.ts"
        issue: "PICKUP_OPTIONS is still exported — D-12 decision mandates deleting it; plan 02-05 deferred"
    missing:
      - "Plan 02-04: OrderLanding server component update to fetch drop state + pass to client"
      - "Plan 02-04: useActiveDrop hook consuming /api/drop with polling for sold-out reactivity"
      - "Plan 02-04: No-active-drop teaser UI state"
      - "Plan 02-05: CheckoutClient update to send {dropId, pickupOptionId} and render live pickup options"
      - "Plan 02-05: Delete PICKUP_OPTIONS from lib/config.ts"

  - truth: "When no drop is active, the ordering page shows a 'no active drop' state instead of an empty or broken UI"
    status: resolved
    resolved_by: "Phase 2 plans 02-04 and 02-05; remaining capacity enforcement moved to Phase 3"
    reason: "OrderLanding.tsx renders unchanged from Phase 1 — there is no conditional branch for no-drop state, no teaser page, and no server-side drop check in app/page.tsx. This is the same root cause as the ordering page gap above."
    artifacts:
      - path: "app/page.tsx"
        issue: "Renders <OrderLanding /> unconditionally with no server-side drop state fetch"
      - path: "components/OrderLanding.tsx"
        issue: "No no-drop/teaser conditional render path exists"
    missing:
      - "app/page.tsx: server-side fetchActiveDrop() call + DropDTO prop passed to OrderLanding"
      - "OrderLanding: conditional render of teaser vs active-drop UI"

  - truth: "When a drop's capacity is reached, products display sold-out indicators without requiring a page reload"
    status: resolved
    resolved_by: "Phase 2 plans 02-04 and 02-05; remaining capacity enforcement moved to Phase 3"
    reason: "FrozenItemCard.tsx derives sold-out from Square inventory remaining counts (variation.remaining <= 0), not from Supabase drop capacity. No useActiveDrop polling hook exists anywhere in the codebase. The /api/drop route and DropDTO.soldOut data are built but never wired to the UI."
    artifacts:
      - path: "components/FrozenItemCard.tsx"
        issue: "isSoldOut derived from Square variation.remaining — not Supabase drop capacity soldOut booleans"
      - path: "components/OrderLanding.tsx"
        issue: "No polling hook, no soldOut data from drop — DropDTO.soldOut is never consumed"
    missing:
      - "useActiveDrop hook with polling interval consuming /api/drop"
      - "FrozenItemCard: accept soldOut prop from drop capacity alongside Square remaining"
      - "OrderLanding: wire DropDTO.soldOut to FrozenItemCard sold-out overlay"

deferred: []

human_verification:
  - test: "Confirm checkout rejects the old payload shape from CheckoutClient"
    expected: "Submitting checkout from the browser returns 400 because CheckoutClient sends {pickup:{...}} but the route expects {dropId, pickupOptionId}"
    why_human: "Requires running the dev server and attempting a real checkout submission to confirm the 400 response is surfaced cleanly to the user vs. crashing silently"
---

# Phase 02: Drop Config & Storefront Verification Report

**Phase Goal:** The storefront reads live drop configuration from Supabase — pickup options, order cutoff, and drop state — replacing all hardcoded config
**Verified:** 2026-04-11T12:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The ordering page displays pickup locations and dates pulled from the active Supabase drop record, not from hardcoded config | FAILED | OrderLanding.tsx unchanged; CheckoutClient still imports PICKUP_OPTIONS from lib/config.ts; no /api/drop consumption |
| 2 | When no drop is active, the ordering page shows a "no active drop" state | FAILED | app/page.tsx renders OrderLanding unconditionally; no teaser path exists |
| 3 | When a drop's capacity is reached, products display sold-out indicators without requiring a page reload | FAILED | FrozenItemCard sold-out uses Square remaining counts only; no useActiveDrop polling hook; DropDTO.soldOut is never consumed |
| 4 | The checkout flow rejects orders server-side when the drop is not active or has no capacity remaining | VERIFIED | app/api/checkout/route.ts calls checkDropReady() before Square API calls; Zod schema uses dropId + pickupOptionId UUIDs; 24/24 tests pass |

**Score: 1/4 roadmap truths verified** (SC-4 passes; SC-1, SC-2, SC-3 fail)

Note: The plans completed (02-01, 02-02, 02-03) fully achieved their own must-haves. The plan-level score would be higher — but the phase goal requires the full storefront to read live data, which depends on plans 02-04 and 02-05 that are not yet written or executed.

### Deferred Items

No items explicitly addressed in a later milestone phase. Plans 02-04 and 02-05 are part of this same Phase 2 — they are missing plans within the current phase, not deferrals to a future phase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/0002_drop_cutoff.sql` | Additive migration: order_cutoff_at + seed activation | VERIFIED | Contains `alter table public.drops add column order_cutoff_at timestamptz` and seed update |
| `lib/database.types.ts` | Regenerated with order_cutoff_at in drops Row/Insert/Update | VERIFIED | grep finds 3 occurrences of order_cutoff_at |
| `lib/types.ts` | DropDTO, PickupOptionDTO, DropStatus, CapacitySlot; CheckoutRequestBody with dropId+pickupOptionId | VERIFIED | All 6 expected exports confirmed; CheckoutRequestBody updated; legacy PickupOption retained |
| `lib/drops.ts` | server-only fetchActiveDrop() + formatPickupDate() + checkDropReady() | VERIFIED | import "server-only" on line 1; all 3 functions exported; 107 lines, substantive |
| `app/api/drop/route.ts` | GET handler returning DropDTO | null | VERIFIED | runtime=nodejs, dynamic=force-dynamic, uses fetchActiveDrop(), logError |
| `tests/drops.test.ts` | 5+ unit tests for fetchActiveDrop | VERIFIED | 5 tests; vi.doMock + dynamic import pattern; all green |
| `app/api/checkout/route.ts` | Updated Zod schema + drop precheck + checkDropReady | VERIFIED | dropId+pickupOptionId schema; precheck before Square calls; checkDropReady wired |
| `tests/checkoutDropGate.test.ts` | 6+ unit tests for checkDropReady | VERIFIED | 6 tests covering all rejection paths; all green |
| `components/OrderLanding.tsx` | Updated to fetch/render live drop data | MISSING | Still renders hardcoded Square-only content with no DropDTO wiring |
| `components/CheckoutClient.tsx` | Updated to send dropId+pickupOptionId payload | MISSING | Still sends old {pickup: {...}} shape; will 400 against updated checkout route |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/drops.ts` | `lib/supabase.ts` | `getSupabaseClient().from('drops')` | WIRED | Confirmed at line 16 |
| `app/api/drop/route.ts` | `lib/drops.ts` | `import { fetchActiveDrop }` | WIRED | Confirmed at line 3 |
| `tests/drops.test.ts` | `lib/drops.ts` | `vi.doMock` + dynamic import | WIRED | Confirmed; mock pattern correct |
| `app/api/checkout/route.ts` | `lib/drops.ts` (checkDropReady) | `import { checkDropReady }` | WIRED | Confirmed at line 16 |
| `app/api/checkout/route.ts` | `lib/supabase.ts` | precheck select on drops table | WIRED | Confirmed at line 15 |
| `tests/checkoutDropGate.test.ts` | `lib/drops.ts` | direct unit import | WIRED | Confirmed |
| `components/OrderLanding.tsx` | `app/api/drop` | useActiveDrop hook or fetch | NOT_WIRED | No /api/drop consumption anywhere in UI layer |
| `components/CheckoutClient.tsx` | `lib/drops.ts` / `app/api/drop` | dropId/pickupOptionId from live drop data | NOT_WIRED | Still uses PICKUP_OPTIONS from lib/config.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/api/drop/route.ts` | drop (DropDTO | null) | fetchActiveDrop() → Supabase drops + drop_pickup_options | Yes (when DB is live) | FLOWING |
| `components/OrderLanding.tsx` | drop state | None — no /api/drop fetch | No | DISCONNECTED — /api/drop exists but nothing consumes it in the UI |
| `components/CheckoutClient.tsx` | pickup options | PICKUP_OPTIONS from lib/config.ts (hardcoded) | No (hardcoded) | HOLLOW_PROP — should come from DropDTO.pickupOptions |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tests pass | `npm run test` | 24/24 pass across 6 files | PASS |
| TypeScript compiles | `npx tsc --noEmit` (cached result from summary) | exit 0 | PASS |
| Checkout route rejects inactive drop | checkDropReady unit tests | 6/6 pass | PASS |
| OrderLanding renders live drop data | Visual/browser check | Not runnable without server | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DATA-03 | 02-01, 02-02 | Drops managed in Supabase with configurable products, capacity, and pickup options | PARTIAL | Schema + API layer complete; UI never reads from Supabase — storefront still shows hardcoded content |
| DATA-04 | 02-01, 02-02 | Drop state controls ordering availability | PARTIAL | State drives API gating (checkDropReady); storefront UI does not reflect drop state |
| DATA-05 | 02-01 | Pickup options stored in Supabase, replace hardcoded config | BLOCKED | PickupOptionDTO + /api/drop complete; CheckoutClient still imports PICKUP_OPTIONS from lib/config.ts |
| ORD-04 | 02-03 | Checkout validates drop is active before accepting orders | SATISFIED | checkDropReady() called in checkout route; rejects on status, sold-out, and 404 |
| ORD-05 | (unplanned) | Products display sold-out indicators in real-time when capacity reached | BLOCKED | No useActiveDrop hook; FrozenItemCard uses Square inventory remaining, not Supabase drop capacity; no polling mechanism |

Note: ORD-05 appears in the REQUIREMENTS.md traceability table as Phase 2 but was not claimed in any plan's `requirements` frontmatter. It is an orphaned requirement for this phase — no plan owns it.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `lib/drops.ts` (DropReadinessRow, lines 73-79) | `order_cutoff_at` omitted from DropReadinessRow; checkDropReady never enforces cutoff deadline | Blocker (CR-01 from code review) | A drop past its cutoff date will still accept orders if status is not manually flipped to 'closed'. The checkout SELECT also omits order_cutoff_at. |
| `app/api/checkout/route.ts` (lines 83-93) | `if (pickupErr \|\| !pickupRow)` conflates DB error with not-found — returns 404 for both | Warning (WR-02 from code review) | DB errors returned as 404 mislead callers; only one of the two causes is correctly logged |
| `lib/database.types.ts` | `place_preorder` RPC args use `number` IDs but schema uses UUID strings | Warning (WR-01 from code review) | Type mismatch will cause compile or runtime failure when place_preorder is called; needs type regeneration or DB function fix |
| `components/CheckoutClient.tsx` | Sends `{pickup: {...}}` to checkout route that now expects `{dropId, pickupOptionId}` | Blocker | End-to-end checkout is broken — every submission will 400 |

### Human Verification Required

#### 1. Checkout rejection UX

**Test:** Load the app in a browser and attempt to submit a checkout form.
**Expected:** The form should fail with an error (since CheckoutClient sends the old payload shape that the updated route now rejects with 400). Verify the error is surfaced gracefully to the user via the inline error state, not a blank/crash.
**Why human:** Requires running the dev server; the 400 is expected and intentional (plan 02-05 fixes it) but the graceful error display cannot be confirmed by static analysis.

## Gaps Summary

Three of four roadmap success criteria are unmet. The completed plans (02-01, 02-02, 02-03) built the data layer — schema, types, Supabase queries, the `/api/drop` endpoint, and the checkout gate — but the two remaining unplanned/unexecuted plans (02-04, 02-05) are required for the phase goal:

**Plan 02-04** must update `app/page.tsx` to fetch drop state server-side, update `components/OrderLanding.tsx` to conditionally render a teaser or active-drop UI, create a `useActiveDrop` polling hook, and wire `DropDTO.soldOut` into `FrozenItemCard`.

**Plan 02-05** must update `components/CheckoutClient.tsx` to send `{dropId, pickupOptionId}` using live pickup option data from the drop, and delete `PICKUP_OPTIONS` from `lib/config.ts`.

Additionally, one blocker anti-pattern from the code review (CR-01) was confirmed: `checkDropReady` does not enforce `order_cutoff_at` — a drop past its cutoff will continue accepting orders as long as `status` remains `'active'`. This should be addressed before plans 02-04/05 ship.

The three failing truths all share the same root cause: the UI layer was not updated. Once plans 02-04 and 02-05 are planned and executed, all four roadmap success criteria should be achievable.

---

_Verified: 2026-04-11T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
