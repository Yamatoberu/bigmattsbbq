---
phase: 04-checkout-email
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - app/api/checkout/route.ts
  - app/api/dev/set-inventory/route.ts
  - components/CheckoutClient.tsx
  - lib/idempotency.ts
  - tests/checkoutReservation.test.ts
  - tests/idempotency.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the checkout API route, dev inventory route, checkout client component, idempotency utility, and their test files. The overall design is sound — the reservation-before-Square-call pattern is well-structured and the rollback logic is thorough.

Four issues require attention before this code ships. The most significant is a capacity-release bug that can free a slot for a successfully-placed order if any code after `publishInvoice` throws unexpectedly. Two other warnings are a silent array mutation in `newIdempotencyKey` and a dead code branch in `CheckoutClient` that compares mismatched Square ID types. The fourth warning is a code duplication between the route and `lib/cart.ts` where the route's inline aggregation is not covered by the corresponding test.

---

## Warnings

### WR-01: Inner catch releases capacity after publishInvoice succeeds

**File:** `app/api/checkout/route.ts:361-372`

**Issue:** The inner `try/catch` (line 168) wraps all Square API calls including `publishInvoice`. If `publishInvoice` succeeds and the invoice email is sent, but any subsequent code inside the same try block throws an unexpected exception (e.g., a thrown error from the Supabase `orders.insert` call — not via the `if (orderSaveErr)` path but an actual throw from the client itself), the inner catch fires, releases all reserved capacity, then re-throws. The drop slot is now free even though the customer received an invoice. The outer catch then returns a 500, but the damage is done.

The mailing-list upsert at lines 349-360 and the order-save at lines 334-346 are both inside the inner try. Either could throw in an edge case (network timeout, malformed response object, etc.).

**Fix:** Move the order-save and mailing-list upsert outside the inner try block, after it completes successfully. Reserve the inner try exclusively for Square API calls that warrant capacity rollback:

```typescript
// Inner try: Square API calls only — rollback on failure
try {
  // ... Square calls through publishInvoice ...
} catch (squareError) {
  for (const r of reserved) {
    await supabase.rpc("release_pickup_slot", { ... });
  }
  throw squareError;
}

// Post-Square: Supabase writes (fire-and-forget, no rollback needed)
const { error: orderSaveErr } = await supabase.from("orders").insert({ ... });
if (orderSaveErr) {
  logError("Order save to Supabase failed (non-blocking)", orderSaveErr, requestId);
}

if (parsed.data.optInMailingList) {
  const { error: mailingErr } = await supabase.from("mailing_list").upsert(...);
  if (mailingErr) {
    logError("Mailing list insert failed (non-blocking)", mailingErr, requestId);
  }
}
```

---

### WR-02: `newIdempotencyKey` mutates the caller's input array

**File:** `lib/idempotency.ts:5`

**Issue:** `Array.prototype.sort()` sorts in place and returns the same array reference. Calling `.sort()` on `inputs` mutates the array passed by the caller. In `route.ts` every caller spreads a new array (`[...idempotencyBase, "suffix"]`), so the mutation is harmless today. But the function's signature is `inputs: string[]`, which does not communicate any ownership transfer. A future caller passing a reused array would have it silently reordered.

Additionally, the sort-before-hash design means `newIdempotencyKey(["order", "a"])` and `newIdempotencyKey(["a", "order"])` are identical, which is fine for the current callers but removes the ability to encode sequence in the key.

**Fix:** Sort a copy instead of the original:

```typescript
export function newIdempotencyKey(inputs: string[]): string {
  return createHash("sha256")
    .update([...inputs].sort().join("|"))
    .digest("hex")
    .slice(0, 45);
}
```

---

### WR-03: `CheckoutClient` compares `sauceVariationId` (variation ID) against `item.itemId` (catalog item ID)

**File:** `components/CheckoutClient.tsx:69`

**Issue:** The `sauceVariationId` prop is a Square **variation** ID (the `SQUARE_SAUCE_VARIATION_ID` env var). The condition `item.itemId === sauceVariationId` compares it against `item.itemId`, which is a Square **catalog item** (parent) ID. In Square's data model these are distinct identifiers with different prefixes and values. This branch will never match, making lines 70-72 dead code. The sauce variation is still found via the explicit `ids.add(sauceVariationId)` on line 65 and the name-match on lines 74-77, but the dead branch may confuse future maintainers.

**Fix:** Remove the dead branch (lines 69-72). If the intent was to support a catalog item ID as the env var, document that, change the prop type accordingly, and fix the comparison — but the current system uses a variation ID, so the simplest fix is deletion:

```typescript
const sauceVariationIds = useMemo(() => {
  const ids = new Set<string>();
  if (sauceVariationId) {
    ids.add(sauceVariationId);
  }
  for (const item of frozenItems) {
    if (normalizeMatch(item.name).includes("sauce")) {
      for (const variation of item.variations) {
        ids.add(variation.variationId);
      }
    }
  }
  return Array.from(ids);
}, [frozenItems, sauceVariationId]);
```

---

### WR-04: Route duplicates `aggregateByProduct` from `lib/cart.ts`; test covers the lib version, not the route's inline copy

**File:** `app/api/checkout/route.ts:127-132` / `lib/cart.ts:54-64`

**Issue:** The route contains an inline `totals` Map build (lines 127-132) that is functionally identical to `aggregateByProduct` in `lib/cart.ts`. `lib/cart.ts` exports `aggregateByProduct`, which `tests/checkoutReservation.test.ts` imports and tests directly (lines 106-127). However, the route never calls `aggregateByProduct` — it uses its own copy. The test gives false confidence: it verifies the lib helper, not the code path that actually runs during checkout.

**Fix:** Replace the inline aggregation in the route with a call to `aggregateByProduct`:

```typescript
import { aggregateByProduct } from "../../../lib/cart";

// Replace lines 127-132:
const totals = aggregateByProduct(parsed.data.cart);
```

The test then exercises the exact code that runs during checkout.

---

## Info

### IN-01: `orderId ?? null` and `invoiceId ?? null` are unreachable fallbacks

**File:** `app/api/checkout/route.ts:339-340`

**Issue:** At the point of the `orders.insert` call, both `orderId` (verified at line 251) and `invoiceId` (verified at line 296) are guaranteed to be non-null strings. The `?? null` expressions are dead code and could mislead readers into thinking these values might still be undefined here.

**Fix:**

```typescript
square_order_id: orderId,
square_invoice_id: invoiceId,
```

---

### IN-02: Checkout fetch does not send an `x-request-id` header

**File:** `components/CheckoutClient.tsx:126-129`

**Issue:** The server generates a request ID via `crypto.randomUUID()` fallback (route.ts line 42) when no `x-request-id` header is present. This means checkout errors cannot be correlated in logs by request ID from the client side. The project logging convention uses `requestId` in every `logError` call, but without the client sending it, the ID is not available to the user or support.

**Fix:** Generate and send a request ID from the client, and surface it in the error message for user reporting:

```typescript
const requestId = crypto.randomUUID();
const response = await fetch("/api/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-request-id": requestId
  },
  body: JSON.stringify({ ... })
});
```

---

### IN-03: Pickup sold-out pre-check uses AND logic without an explanatory comment

**File:** `app/api/checkout/route.ts:103-105`

**Issue:** The pickup-level sold-out check (`reserved_pulled_pork >= capacity_pulled_pork && reserved_brisket >= capacity_brisket`) returns 409 only when **both** product types are exhausted at that pickup slot. A pickup with only pulled_pork at capacity (and brisket still available) will not be flagged as sold out here — the per-product enforcement is delegated to the `reserve_pickup_slot` RPC. `lib/drops.ts` has an explanatory comment for the same pattern at lines 107-110, but the route has no comment, making the AND condition look like an oversight.

**Fix:** Add a comment matching the pattern in `lib/drops.ts`:

```typescript
// Coarse gate: only block when every product type at this pickup is exhausted.
// Per-product enforcement (e.g. pulled pork full, brisket available) is handled
// atomically by the reserve_pickup_slot RPC below.
const pickupSoldOut =
  pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork &&
  pickupRow.reserved_brisket >= pickupRow.capacity_brisket;
```

---

_Reviewed: 2026-04-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
