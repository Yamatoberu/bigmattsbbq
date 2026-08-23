---
phase: 02-drop-config-storefront
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - supabase/migrations/0002_drop_cutoff.sql
  - lib/database.types.ts
  - lib/types.ts
  - lib/drops.ts
  - app/api/drop/route.ts
  - tests/drops.test.ts
  - package.json
  - tests/checkoutDropGate.test.ts
  - app/api/checkout/route.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase adds a `order_cutoff_at` column to the `drops` table, a `fetchActiveDrop` function that surfaces the drop as a `DropDTO`, a `checkDropReady` guard reused by checkout, and a new `GET /api/drop` endpoint. The overall structure is clean and consistent with the existing codebase conventions.

One critical issue was found: the checkout route re-reads drop status from the database but never verifies that the `order_cutoff_at` deadline has passed, allowing orders to slip through after the cutoff window closes even though the UI would show the drop as closed. Four warnings cover a type-safety hole on the `place_preorder` RPC function signature, a 500/404 ambiguity in pickup validation, a missing test for the Supabase error path on pickup rows, and a global sold-out logic mismatch between `checkDropReady` and `fetchActiveDrop`. Three info items note an unused legacy interface, a minor duplicate date-formatting inline in checkout, and a `pickupErr` log that swallows the distinction between a DB error and a not-found row.

---

## Critical Issues

### CR-01: `order_cutoff_at` is never enforced at checkout

**File:** `app/api/checkout/route.ts:54-74`

**Issue:** The checkout precheck reads `id, status, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket` from `drops` but never selects or evaluates `order_cutoff_at`. A drop's `order_cutoff_at` is currently `2026-05-08 23:59:59-06` for the active seed drop. If the admin closes the drop by updating `status` to `closed`, the gate works. But the `order_cutoff_at` column is intended as the canonical "orders stop here" signal; the status field is secondary. If anything relies on `order_cutoff_at` alone (e.g., a scheduled job that never flips the status), all checkout requests will pass `checkDropReady` — the cutoff is never checked on the server.

Beyond the scheduled-job scenario, `checkDropReady` also receives a `DropReadinessRow` that has no `order_cutoff_at` field at all (`lib/drops.ts:73-79`), so even if the call site wanted to enforce it, the data shape prevents it.

**Fix:** Add `order_cutoff_at` to `DropReadinessRow` and enforce it inside `checkDropReady`:

```typescript
// lib/drops.ts — update DropReadinessRow
export interface DropReadinessRow {
  status: string;
  order_cutoff_at: string | null;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
}

// lib/drops.ts — add cutoff check in checkDropReady, before sold-out check
if (drop.order_cutoff_at && new Date() > new Date(drop.order_cutoff_at)) {
  return {
    ok: false,
    status: 409,
    error: "This drop has closed. Orders are no longer being accepted."
  };
}
```

Then update the `SELECT` in `app/api/checkout/route.ts` to include `order_cutoff_at`:

```typescript
.select("id, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket")
```

---

## Warnings

### WR-01: `place_preorder` RPC args use `number` IDs but tables use UUID strings

**File:** `lib/database.types.ts:216-226`

**Issue:** The generated `Database` type declares `place_preorder` with `p_drop_id: number` and `p_pickup_id: number`, but `drops.id` and `drop_pickup_options.id` are both `string` (UUID) in their `Row` types (`lib/database.types.ts:63` and `18`). If `place_preorder` is called via the Supabase client using these generated types, TypeScript will accept a numeric ID and the RPC call will either fail at runtime or silently pass the wrong value. This is a type-contract mismatch between the RPC function definition and the underlying table schemas.

**Fix:** Regenerate types from the live schema via `npx supabase gen types typescript`. If the function signature in the database genuinely uses integer IDs (unlikely given the UUID PKs), the Postgres function itself needs to be corrected. Expected correct shape:

```typescript
place_preorder: {
  Args: {
    p_drop_id: string    // uuid
    p_pickup_id: string  // uuid
    ...
  }
}
```

---

### WR-02: Pickup option DB error and "not found" merged into a single 404 response

**File:** `app/api/checkout/route.ts:83-93`

**Issue:** The condition `if (pickupErr || !pickupRow)` conflates two distinct failure modes: a Supabase query error (likely a transient infrastructure problem, warrants 500) and a legitimate "pickup option does not exist" case (warrants 404). When `pickupErr` is set, the route returns 404 to the client, which is incorrect — the client will interpret this as "bad input" and not retry, while the real cause may be a temporary database outage. Only the DB error is logged; if `!pickupRow` is the cause, the log call passes `new Error("pickup option not found")` as if it were a server fault.

**Fix:** Split the two cases:

```typescript
if (pickupErr) {
  logError("Checkout pickup option lookup failed", pickupErr, requestId);
  return NextResponse.json(
    { error: "Unable to verify pickup option.", requestId },
    { status: 500 }
  );
}
if (!pickupRow) {
  return NextResponse.json(
    { error: "Pickup option not found for this drop.", requestId },
    { status: 404 }
  );
}
```

---

### WR-03: Global sold-out logic differs between `checkDropReady` and `fetchActiveDrop`

**File:** `lib/drops.ts:96-98` and `lib/drops.ts:51-54`

**Issue:** `checkDropReady` marks the drop as globally sold out only when **both** pulled pork and brisket are at capacity (AND logic). `fetchActiveDrop` uses the same AND logic for both `soldOut` at the drop level and `isSoldOut` per pickup option. This is intentional and consistent within the file. However, there is no guard in `checkDropReady` — or in the checkout route — that verifies whether the **specific pickup option** selected by the customer still has per-slot capacity. A customer could select a pickup option that is slot-sold-out (both products at that slot filled) while the global drop still has remaining capacity at a different location, and the order would proceed to Square without error. The per-slot capacity reservation is presumably enforced by the `reserve_pickup_slot` Postgres function, but that function is never called in the checkout route.

**Fix:** After the pickup option is resolved, verify per-slot availability before proceeding to Square:

```typescript
const slotSoldOut =
  pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork &&
  pickupRow.reserved_brisket >= pickupRow.capacity_brisket;

if (slotSoldOut) {
  return NextResponse.json(
    { error: "This pickup slot is sold out. Please choose another location.", requestId },
    { status: 409 }
  );
}
```

Note: The `drop_pickup_options` query on line 77-82 currently only selects `id, location_label, pickup_at, pickup_date` — capacity fields would also need to be added to the `SELECT`.

---

### WR-04: `checkoutDropGate` tests do not cover `order_cutoff_at` enforcement

**File:** `tests/checkoutDropGate.test.ts:1-69`

**Issue:** Once CR-01 is fixed and `order_cutoff_at` enforcement is added to `checkDropReady`, the test suite has no coverage for the cutoff path. Without a test, it is easy for the enforcement logic to regress silently. This becomes a warning rather than info because the cutoff check is a business-critical guard.

**Fix:** Add two cases to `checkoutDropGate.test.ts`:

```typescript
it("returns 409 when order_cutoff_at is in the past", () => {
  const result = checkDropReady({
    ...activeRow,
    order_cutoff_at: "2020-01-01T00:00:00Z"  // well in the past
  });
  expect(result).toEqual({
    ok: false,
    status: 409,
    error: "This drop has closed. Orders are no longer being accepted."
  });
});

it("returns ok when order_cutoff_at is in the future", () => {
  const result = checkDropReady({
    ...activeRow,
    order_cutoff_at: "2099-01-01T00:00:00Z"
  });
  expect(result).toEqual({ ok: true });
});
```

---

## Info

### IN-01: `PickupOption` interface in `lib/types.ts` appears unused

**File:** `lib/types.ts:36-40`

**Issue:** The `PickupOption` interface (`locationLabel`, `pickupDateLabel`, `pickupAtISO`) was part of the old config-driven pickup system. The new Supabase-backed system uses `PickupOptionDTO` (lines 61-67). `PickupOption` is no longer referenced in any of the reviewed files and is likely dead code.

**Fix:** Confirm no other components reference `PickupOption` (search across `components/`), then remove the interface to avoid confusion between the two similarly-named types.

---

### IN-02: Inline date-formatting logic duplicated between `lib/drops.ts` and `app/api/checkout/route.ts`

**File:** `app/api/checkout/route.ts:131-135` and `lib/drops.ts:5-12`

**Issue:** `lib/drops.ts` exports `formatPickupDate(isoDate)` for exactly this purpose, but the checkout route reimplements the same `toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" })` logic inline.

**Fix:** Import and use the exported helper:

```typescript
import { checkDropReady, formatPickupDate } from "../../../lib/drops";
// ...
const pickupDateLabel = formatPickupDate(pickupRow.pickup_at);
```

---

### IN-03: `drops.test.ts` mock chain silently drops the pickup error branch

**File:** `tests/drops.test.ts:36-48`

**Issue:** The `buildMockClient` helper returns the pickup result only when the `.order()` call is on `drop_pickup_options`. If `table !== "drop_pickup_options"`, it returns `chain` (which has no `then`/promise interface), meaning any accidental order-on-drops path would hang silently. More practically: there is no test for when the `pickupRows` query itself returns an error (`pickupErr` truthy), so that branch in `fetchActiveDrop` (line 42-44 of `lib/drops.ts`) has no test coverage.

**Fix:** Add a test case:

```typescript
it("throws when Supabase returns an error on the pickup options query", async () => {
  mockSupabaseModule(
    buildMockClient(
      { data: dropRow, error: null },
      { data: null, error: new Error("pickup RLS denied") }
    )
  );
  const { fetchActiveDrop } = await import("../lib/drops");
  await expect(fetchActiveDrop()).rejects.toThrow("pickup RLS denied");
});
```

The mock chain also needs a small fix to handle the error path — currently `buildMockClient` only resolves `pickupResult` when `order()` is called on the pickup table; the error case still resolves successfully via the same path, so this test should already work as written.

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
