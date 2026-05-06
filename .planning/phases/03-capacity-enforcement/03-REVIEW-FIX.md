---
phase: 03-capacity-enforcement
fixed_at: 2026-04-12T10:46:00Z
review_path: .planning/phases/03-capacity-enforcement/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-12T10:46:00Z
**Source review:** .planning/phases/03-capacity-enforcement/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, CR-02, WR-01, WR-02, WR-03)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Capacity reservation never called — overselling is possible

**Files modified:** `app/api/checkout/route.ts`
**Commit:** 90b3a2f
**Applied fix:** Moved `reserve_pickup_slot` RPC calls to run before any Square API calls. Added a `reserved` tracking array so that if any reservation fails, all previously reserved slots are released via `release_pickup_slot` before returning 409. Wrapped all Square API calls (customer lookup/create, order creation, invoice creation/publish) in an inner try/catch that also releases all reserved slots on unexpected errors before re-throwing to the outer handler. Returns 409 with the RPC's reason string (or a fallback message) when capacity is unavailable.

**Status:** fixed: requires human verification (logic ordering and rollback correctness)

---

### CR-02: Per-pickup-option capacity is fetched but never enforced

**Files modified:** `app/api/checkout/route.ts`
**Commit:** 90b3a2f
**Applied fix:** Extended the `drop_pickup_options` select to include `capacity_pulled_pork`, `capacity_brisket`, `reserved_pulled_pork`, `reserved_brisket`. Added a `pickupSoldOut` check immediately after the null guard — returns 409 with "This pickup slot is sold out. Please choose another." when both product types at the specific pickup option are exhausted.

---

### WR-01: Test schema diverges from production — reservation tests exercise stub logic

**Files modified:** `app/api/checkout/route.ts`, `lib/cart.ts`, `tests/checkoutReservation.test.ts`
**Commit:** 9369668
**Applied fix:** Exported `cartSchema` from the route (`export const cartSchema`). Added `aggregateByProduct` as an exported function in `lib/cart.ts` (extracted from the inline totals-building logic already present in the route). Updated `tests/checkoutReservation.test.ts` to import both from their production locations instead of redefining local copies. All 6 reservation tests continue to pass against the real production schema and utility.

---

### WR-02: `checkDropReady` sold-out check uses AND — single-product sellout is not blocked

**Files modified:** `lib/drops.ts`
**Commit:** 65a2ebf
**Applied fix:** Added an explanatory comment above the `globallySoldOut` AND condition documenting that this is an intentional coarse gate (blocks only when all product types are globally exhausted) and that per-product capacity is enforced atomically by `reserve_pickup_slot` during checkout. No logic change — the AND semantics are correct given the CR-01 fix now ensures the RPC handles per-product enforcement before Square is touched.

---

### WR-03: Untested `NEXT_PUBLIC_SUPABASE_URL` fallback path

**Files modified:** `tests/supabase.test.ts`
**Commit:** f1e021f
**Applied fix:** Added `delete process.env.NEXT_PUBLIC_SUPABASE_URL` to the "throws when SUPABASE_URL is missing" test case so the fallback env var cannot silently satisfy the check and prevent the expected throw. All 4 supabase tests continue to pass.

---

_Fixed: 2026-04-12T10:46:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
