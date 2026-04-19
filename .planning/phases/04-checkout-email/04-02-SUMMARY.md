---
phase: 04-checkout-email
plan: "02"
subsystem: checkout-persistence
tags: [supabase, orders, mailing-list, checkout, forms]
dependency_graph:
  requires: [04-01]
  provides: [order-persistence, mailing-list-optin]
  affects: [app/api/checkout/route.ts, components/CheckoutClient.tsx]
tech_stack:
  added: []
  patterns: [fire-and-forget supabase write, upsert with ignoreDuplicates, zod boolean field with default]
key_files:
  created: []
  modified:
    - app/api/checkout/route.ts
    - components/CheckoutClient.tsx
    - tests/checkoutReservation.test.ts
decisions:
  - Order save and mailing list upsert are fire-and-forget (D-03, D-09) — checkout succeeds regardless of Supabase write failures
  - MAIL-01 satisfied by existing Square invoice email per D-10 — no Resend integration needed in this plan
  - priceCents in cart_snapshot is for record-keeping only (T-04-04 accepted threat) — Square order uses catalog_object_id for actual invoice pricing
  - isOptedIntoMailingList state variable follows CLAUDE.md boolean is-prefix convention; payload field is optInMailingList per Zod schema
metrics:
  duration: ~20 minutes
  completed: 2026-04-17
  tasks_completed: 3
  files_modified: 3
---

# Phase 04 Plan 02: Order Persistence and Mailing List Opt-In Summary

Supabase order save with full cart_snapshot JSONB after publishInvoice, fire-and-forget mailing list upsert on checkout opt-in, and unchecked opt-in checkbox in the checkout form.

## What Was Built

### Task 1: Checkout route — order save + mailing list upsert

**`app/api/checkout/route.ts`** — Three additions:

1. `priceCents` added to `cartSchema` (optional, nonnegative int) and `optInMailingList` added to `checkoutSchema` (optional boolean, defaults false).

2. After `publishInvoice` succeeds, a Supabase order record is saved with all D-04 fields: `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `square_order_id`, `square_invoice_id`, and `cart_snapshot` JSONB. The cart snapshot contains per-item `variationId`, `productName`, `quantity`, `priceCents`, and an `estimatedTotalCents` sum. Failures are logged via `logError` and do not fail the checkout (D-03).

3. When `optInMailingList` is true, `mailing_list` is upserted with `onConflict: "email"` and `ignoreDuplicates: true` (D-08). Failures are logged and do not fail the checkout (D-09).

4. ORD-01 verified: the `reserve_pickup_slot` RPC block appears at line 134, before the Square try block at line 165. Comment added to document the guarantee.

### Task 2: CheckoutClient — opt-in checkbox + priceCents in payload

**`components/CheckoutClient.tsx`** — Three additions:

1. `isOptedIntoMailingList` state (boolean, default false) per CLAUDE.md `is`-prefix convention.

2. Opt-in checkbox rendered after the customer info grid and before the error message: `<label>` wrapper makes full row clickable, `accent-[#e64622]` ember styling, label text "Notify me about future drops" per D-07.

3. Fetch body now sends `priceCents` per cart item (from `variationMap`) and `optInMailingList: isOptedIntoMailingList` at the top level per D-05.

### Task 3: Test coverage for ORD-02 and MAIL-04

**`tests/checkoutReservation.test.ts`** — Added `setupSuccessMocks` helper that wires all Supabase table mocks and Square function mocks for a full happy-path. Added 4 new tests across 2 describe blocks:

- `order save (ORD-02)`: verifies insert called with correct fields and cart_snapshot; verifies 200 returned when insert fails (fire-and-forget)
- `mailing list opt-in (MAIL-04)`: verifies upsert called with `{ email }` when `optInMailingList: true`; verifies upsert NOT called when `optInMailingList: false`

Test count: 7 → 11 in `checkoutReservation.test.ts`. Full suite: 44 → 48 passing.

## Commits

| Hash | Message |
|------|---------|
| `8eb4051` | feat(04-02): add Supabase order save and mailing list upsert to checkout route |
| `37b4169` | feat(04-02): add mailing list opt-in checkbox and priceCents to checkout form |
| `48c0b05` | test(04-02): add order save and mailing list opt-in test cases |

## Deviations from Plan

None — plan executed exactly as written.

The `idempotencyBase` variable found in the current `route.ts` (added by the 04-01 agent running in parallel) was preserved without modification. The new order save and mailing list blocks were inserted after `publishInvoice` as specified, compatible with the updated idempotency logic.

## Known Stubs

None. Order save writes real data to `orders` table. Mailing list writes real data to `mailing_list` table. Checkbox state flows through to the fetch body and Zod validation.

## Threat Flags

No new network endpoints or auth paths introduced. All writes go through the existing server-side Supabase client (`lib/supabase.ts`). T-04-07 (RLS on orders) is a pre-existing mitigation from the Supabase foundation phase.

## Self-Check: PASSED

- app/api/checkout/route.ts: FOUND
- components/CheckoutClient.tsx: FOUND
- tests/checkoutReservation.test.ts: FOUND
- commit 8eb4051: FOUND
- commit 37b4169: FOUND
- commit 48c0b05: FOUND
