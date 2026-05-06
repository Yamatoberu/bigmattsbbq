# Phase 3: Capacity Enforcement (Gap Closure) — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire `reserve_pickup_slot` into the checkout flow after `publishInvoice` succeeds, so capacity counters are atomically updated after each order. Also: fix the `place_preorder` type mismatch in `lib/database.types.ts`, clean up the `getSupabaseEnv()` dead export in `lib/env.ts`, update Phase 2 `VERIFICATION.md`, add `requirements-completed` frontmatter to two Phase 2 summaries, and run `/gsd-validate-phase 1` to close Phase 1 Nyquist gaps.

This is a gap closure phase. The tasks are explicitly enumerated in ROADMAP.md. No new capabilities, no schema changes.

</domain>

<decisions>
## Implementation Decisions

### Reservation Wiring

- **D-01:** `reserve_pickup_slot` is called **after** `publishInvoice` succeeds, per the ROADMAP task spec. This is intentional for the MVP gap closure — Phase 4 (ORD-01) will pre-reserve before Square API calls.
- **D-02:** Reservation failure after `publishInvoice` is **non-blocking**. Log the error (`logError`) and return a successful checkout response. The customer already has a valid Square invoice; failing the checkout at this point creates a confusing UX (invoice received, checkout says failed).
- **D-03:** All RPC calls are attempted regardless of prior failures. Group cart items by `productName`, aggregate quantities per product, call `reserve_pickup_slot` once per product type. Log the outcome of each call individually (success or failure). Succeed after all calls.

### Product Name Mapping

- **D-04:** `productName` is passed from the client in each cart item payload. `CheckoutClient` already has item names from the `/api/frozen-items` fetch and can include them in the cart.
- **D-05:** Valid `productName` values are `"pulled_pork"` and `"brisket"` — enforced by Zod union in `cartSchema`. These match the string literals the Supabase RPC checks (`p_product_name = 'pulled_pork'` / `'brisket'`).
- **D-06:** The Zod `cartSchema` in `app/api/checkout/route.ts` gains a `productName: z.union([z.literal("pulled_pork"), z.literal("brisket")])` field.

### Type Fix

- **D-07:** `place_preorder` in `lib/database.types.ts` has `p_drop_id` and `p_pickup_id` typed as `number` — they must be `string` (UUID), matching the live schema. This is a straight fix; no behavior change.

### Dead Code Cleanup

- **D-08:** `getSupabaseEnv()` is exported from `lib/env.ts` but never called anywhere in the application (only appears in tests). Remove the export. The Supabase client (`lib/supabase.ts`) uses env vars directly.
- **D-09:** `02-03-SUMMARY.md` and `02-05-SUMMARY.md` need `requirements-completed` frontmatter added — documentary cleanup only.

### Claude's Discretion

- Exact aggregation logic (Map vs reduce vs object accumulator) for grouping cart items by productName
- Whether to use `Promise.allSettled` or sequential awaits for the RPC calls (sequential is fine given the small number of products)
- Log message text and structure for reservation outcomes
- How to handle Supabase client RPC call syntax for `reserve_pickup_slot`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `.planning/PROJECT.md` — Project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — DATA-03, ORD-05 are this phase's requirements

### Phase 1 Foundation
- `.planning/phases/01-foundation/01-CONTEXT.md` — Capacity model (D-01 through D-10), reservation behavior decisions
- `supabase/migrations/0001_foundation.sql` — RPC definitions for `reserve_pickup_slot` and `release_pickup_slot`; exact `p_product_name` string values used

### Phase 2 Artifacts
- `.planning/phases/02-drop-config-storefront/02-CONTEXT.md` — Prior phase decisions
- `.planning/phases/02-drop-config-storefront/02-05-SUMMARY.md` — What was built in checkout migration; context for what the checkout route and CheckoutClient look like now

### Key Source Files
- `app/api/checkout/route.ts` — The primary file being modified; add reserve_pickup_slot call and updated Zod schema
- `lib/database.types.ts` — Fix place_preorder type mismatch (p_drop_id, p_pickup_id: number → string)
- `lib/env.ts` — Remove dead getSupabaseEnv() export
- `components/CheckoutClient.tsx` — Add productName to cart item payloads sent to checkout route

</canonical_refs>

<code_context>
## Existing Code Insights

### Current Checkout Flow (app/api/checkout/route.ts)
1. Parse + validate payload with Zod (`checkoutSchema`)
2. Pre-check drop state (Supabase query)
3. Look up pickup option (Supabase query)
4. Square: search/create customer
5. Square: createOrder
6. Square: createInvoice
7. Square: publishInvoice ← **reserve_pickup_slot goes here, after this**
8. Return `{ orderId, invoiceId, pickupNote }`

### Supabase Client
- `lib/supabase.ts` — `getSupabaseClient()` singleton (server-only)
- RPC call pattern: `supabase.rpc('reserve_pickup_slot', { p_drop_id: ..., p_pickup_option_id: ..., p_product_name: ..., p_quantity: ... })`

### Dead Code
- `getSupabaseEnv()` in `lib/env.ts` — exported but has zero callers in app code; `lib/supabase.ts` reads env vars directly via `process.env`
- `tests/supabase.test.ts` imports it — check if test still makes sense after removal, or update the test

### Type Mismatch Location
- `lib/database.types.ts` → `Functions` → `place_preorder` → `Args` → `p_drop_id: number` and `p_pickup_id: number`
- Both should be `string` (UUID) — same as `reserve_pickup_slot` which already has correct `string` types

</code_context>

<specifics>
## Specific Details

- The two valid `productName` values (`"pulled_pork"`, `"brisket"`) come directly from the Supabase RPC SQL — hardcoded in the `CASE WHEN` expressions of `reserve_pickup_slot`. These are not configurable; they're literals in the migration.
- The 5-bag global buffer (200 global - 195 sum of per-location) from Phase 1 means global sold-out triggers before per-location; `reserve_pickup_slot` checks both levels atomically.
- `release_pickup_slot` exists (see migration) but is **not used in Phase 3**. It's the rollback for when Square calls fail before publish — a path that already works from Phase 1 planning. Phase 3 only adds the post-publish reservation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Phase 4 (ORD-01) will replace this post-publish reservation with a proper pre-reservation before any Square calls.

</deferred>

---

*Phase: 03-capacity-enforcement*
*Context gathered: 2026-04-12*
