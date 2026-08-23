---
phase: 04-checkout-email
fixed_at: 2026-04-17T00:00:00Z
review_path: .planning/phases/04-checkout-email/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-17T00:00:00Z
**Source review:** .planning/phases/04-checkout-email/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Inner catch releases capacity after publishInvoice succeeds

**Files modified:** `app/api/checkout/route.ts`
**Commit:** 4a305ed
**Applied fix:** Moved the Supabase order-save and mailing-list upsert blocks out of the inner try block. The inner try now ends immediately after `publishInvoice`, so the catch clause only fires on genuine Square API failures. The Supabase writes execute after the inner try/catch closes, eliminating the risk of capacity being released for a successfully-placed order if a Supabase call throws unexpectedly.

---

### WR-02: `newIdempotencyKey` mutates the caller's input array

**Files modified:** `lib/idempotency.ts`
**Commit:** 0163f2f
**Applied fix:** Changed `.update(inputs.sort().join("|"))` to `.update([...inputs].sort().join("|"))` so the sort operates on a copy, leaving the caller's array unmodified.

---

### WR-03: `CheckoutClient` compares `sauceVariationId` (variation ID) against `item.itemId` (catalog item ID)

**Files modified:** `components/CheckoutClient.tsx`
**Commit:** d481514
**Applied fix:** Removed the dead branch (`if (item.itemId === sauceVariationId)`) inside the `sauceVariationIds` memo. The variation ID is already added unconditionally via `ids.add(sauceVariationId)` at the top of the memo, and the name-match branch below correctly picks up all sauce variations. The dead branch was unreachable because Square variation IDs and catalog item IDs are distinct identifier namespaces.

---

### WR-04: Route duplicates `aggregateByProduct` from `lib/cart.ts`; test covers the lib version, not the route's inline copy

**Files modified:** `app/api/checkout/route.ts`
**Commit:** 4a305ed
**Applied fix:** Imported `aggregateByProduct` from `../../../lib/cart` and replaced the inline 4-line Map-build loop with `const totals = aggregateByProduct(parsed.data.cart)`. The existing test in `tests/checkoutReservation.test.ts` now exercises the exact code path that runs during checkout.

---

_Fixed: 2026-04-17T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
