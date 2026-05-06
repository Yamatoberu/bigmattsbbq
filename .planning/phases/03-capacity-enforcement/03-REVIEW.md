---
phase: 03-capacity-enforcement
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - app/api/checkout/route.ts
  - components/CheckoutClient.tsx
  - lib/database.types.ts
  - lib/env.ts
  - tests/checkoutReservation.test.ts
  - tests/supabase.test.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the checkout API route, checkout client component, Supabase types, environment validation, and two test files targeting capacity reservation and Supabase client behavior. The core value proposition of this phase — preventing overselling by enforcing capacity at checkout time — is not yet implemented. The checkout route validates drop readiness and creates a Square order/invoice, but never calls the `reserve_pickup_slot` RPC that exists in the database schema. Additionally, the per-pickup-option capacity columns in `drop_pickup_options` are fetched but never checked. The test file for reservation exercises a `productName`-annotated cart schema and aggregation helper that do not exist in production code, so those tests pass against stub logic rather than the real checkout path.

---

## Critical Issues

### CR-01: Capacity reservation never called — overselling is possible

**File:** `app/api/checkout/route.ts:141`

**Issue:** The route checks global drop readiness via `checkDropReady()` and fetches the pickup row, but it never calls `reserve_pickup_slot` (the Supabase RPC defined in `lib/database.types.ts`). A Square order and invoice are created — incrementing committed inventory — without decrementing any capacity counter in Supabase. Under concurrent load, multiple requests that all read the same `reserved_*` values will all pass the readiness check and all create orders, resulting in overselling.

**Fix:** After confirming `pickupRow` exists, call `reserve_pickup_slot` for each product type in the cart before proceeding to Square. Roll back (call `release_pickup_slot`) if the Square order or invoice creation fails.

```typescript
// After pickupRow confirmed, before getSquareEnv():
const reservations: Array<{ productName: string; quantity: number }> = [];
for (const item of parsed.data.cart) {
  if (!item.productName) continue; // sauce items have no capacity slot
  const { data: reserveResult, error: reserveErr } = await supabase.rpc(
    "reserve_pickup_slot",
    {
      p_drop_id: parsed.data.dropId,
      p_pickup_option_id: parsed.data.pickupOptionId,
      p_product_name: item.productName,
      p_quantity: item.quantity
    }
  );
  if (reserveErr || !reserveResult?.ok) {
    // Release any already-reserved slots
    for (const r of reservations) {
      await supabase.rpc("release_pickup_slot", {
        p_drop_id: parsed.data.dropId,
        p_pickup_option_id: parsed.data.pickupOptionId,
        p_product_name: r.productName,
        p_quantity: r.quantity
      });
    }
    return NextResponse.json(
      { error: reserveResult?.error ?? "Capacity unavailable for selected pickup.", requestId },
      { status: 409 }
    );
  }
  reservations.push({ productName: item.productName, quantity: item.quantity });
}
// ... proceed with Square API calls; wrap in try/catch to release on failure
```

---

### CR-02: Per-pickup-option capacity is fetched but never enforced

**File:** `app/api/checkout/route.ts:76-96`

**Issue:** `drop_pickup_options` rows carry their own `capacity_pulled_pork`, `capacity_brisket`, `reserved_pulled_pork`, and `reserved_brisket` columns (confirmed in `lib/database.types.ts`). The select at line 78 fetches only `id, location_label, pickup_at, pickup_date` — the capacity columns are omitted. Even if the global drop check (`checkDropReady`) passes, a specific pickup slot can be individually full and the route will not detect it. The only capacity guard is the aggregate drop-level check, which only trips when every meat type is globally exhausted.

**Fix:** Include capacity columns in the pickup option select and check them before reserving:

```typescript
const { data: pickupRow, error: pickupErr } = await supabase
  .from("drop_pickup_options")
  .select(
    "id, location_label, pickup_at, pickup_date, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket"
  )
  .eq("id", parsed.data.pickupOptionId)
  .eq("drop_id", parsed.data.dropId)
  .maybeSingle();

// After null check:
const pickupSoldOut =
  pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork &&
  pickupRow.reserved_brisket >= pickupRow.capacity_brisket;
if (pickupSoldOut) {
  return NextResponse.json(
    { error: "This pickup slot is sold out. Please choose another.", requestId },
    { status: 409 }
  );
}
```

---

## Warnings

### WR-01: Test schema diverges from production — reservation tests exercise stub logic

**File:** `tests/checkoutReservation.test.ts:6-10`

**Issue:** The test file defines a local `cartSchema` with a `productName` field (`"pulled_pork" | "brisket"`) and an `aggregateByProduct` helper, then tests those in isolation. The production `cartSchema` in `app/api/checkout/route.ts` has no `productName` field, and `aggregateByProduct` is not implemented anywhere in `lib/`. The tests pass, but they do not test any real production code. When `productName` is added to the production schema to support `reserve_pickup_slot` (see CR-01), these tests will need to be updated to import the actual schema and helper rather than redefining them.

**Fix:** Once `productName` is added to the production `cartSchema` and a `aggregateByProduct` utility is implemented in `lib/`, update the test to import from those modules:

```typescript
import { cartSchema } from "../app/api/checkout/route"; // or wherever schema is extracted
import { aggregateByProduct } from "../lib/cart";
```

---

### WR-02: `checkDropReady` sold-out check uses AND — single-product sellout is not blocked

**File:** `lib/drops.ts:107-116`

**Issue:** The sold-out guard at lines 107-109 only triggers when *both* pulled pork AND brisket are exhausted simultaneously:

```typescript
const globallySoldOut =
  drop.reserved_pulled_pork >= drop.capacity_pulled_pork &&
  drop.reserved_brisket >= drop.capacity_brisket;
```

If pulled pork sells out but brisket slots remain, the gate stays open. A customer who orders only pulled pork will still pass the readiness check and can be charged for meat that is no longer available. Per-product capacity enforcement (CR-01) will catch this at the reservation layer, but `checkDropReady` itself gives misleading readiness signals.

**Fix:** If the intent is to block any order that requests a product type which is fully sold out, the gate should check per-product in context of the cart. If the intent is only to block when the entire drop is exhausted, document that explicitly and ensure `reserve_pickup_slot` provides the per-product guard.

---

### WR-03: Untested `NEXT_PUBLIC_SUPABASE_URL` fallback path

**File:** `tests/supabase.test.ts:24-38` / `lib/supabase.ts:10`

**Issue:** `lib/supabase.ts` reads `process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL`. The test at line 25 only deletes `SUPABASE_URL`, and the "throws when SUPABASE_URL is missing" test at line 24 does not set `NEXT_PUBLIC_SUPABASE_URL`. If that var happens to be set in the test environment (e.g., from a `.env.test` or leakage from `process.env`), the test that expects a throw would silently pass using the fallback URL and not actually throw. There is no test covering "throws when BOTH url vars are missing but NEXT_PUBLIC_SUPABASE_URL is set."

**Fix:** Explicitly clear both URL vars in the "throws" test cases:

```typescript
it("throws when SUPABASE_URL is missing", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL; // also clear the fallback
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { getSupabaseClient } = await import("../lib/supabase");
  expect(() => getSupabaseClient()).toThrow("Missing Supabase environment variables");
});
```

---

## Info

### IN-01: `sauceVariationIds` logic compares IDs from different namespaces

**File:** `components/CheckoutClient.tsx:55`

**Issue:** Line 55 reads `item.itemId === sauceVariationId`, comparing a catalog item ID (`itemId` on `FrozenItemDTO`) against `sauceVariationId` (a variation-level ID from `SQUARE_SAUCE_VARIATION_ID`). These are distinct Square object types — a catalog item ID will never equal a variation ID. This branch will never execute, meaning the variation IDs of the sauce item will only be populated via the name-based fallback on line 60 (`item.name.includes("sauce")`). The dead branch is misleading and adds noise to the `sauceVariationIds` computation.

**Fix:** Remove the dead branch or correct the comparison to match variation IDs:

```typescript
// Remove lines 55-59 — the name-based fallback at line 60 is the correct path
// OR: if the intent is to match by variation, use:
for (const variation of item.variations) {
  if (variation.variationId === sauceVariationId) {
    ids.add(variation.variationId);
  }
}
```

---

### IN-02: `SQUARE_ENV` cast bypasses validation

**File:** `lib/env.ts:16`

**Issue:** `process.env.SQUARE_ENV` is cast directly to `SquareEnv["environment"]` without validation:

```typescript
const environment = (process.env.SQUARE_ENV as SquareEnv["environment"]) || "sandbox";
```

A value like `"prod"` or `"production "` (with trailing space) would silently pass through as a non-matching string. While the downstream impact is low (it controls logging/behavior, not auth), the cast pattern is inconsistent with the validated approach used for the other required vars.

**Fix:**

```typescript
const rawEnv = process.env.SQUARE_ENV;
const environment: SquareEnv["environment"] =
  rawEnv === "production" ? "production" : "sandbox";
```

---

_Reviewed: 2026-04-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
