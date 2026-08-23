---
phase: 04-checkout-email
verified: 2026-04-17T19:45:00Z
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "MAIL-01: Branded confirmation email sent via Resend with order summary, pickup details, and pay-at-pickup reminder"
    reason: "D-10 (Phase 4 CONTEXT) explicitly drops Resend confirmation email from v1.0. Square invoice email covers customer confirmation for MVP. Developer confirmed this in Phase 5 discussion (05-DISCUSSION-LOG.md line 100). Remains post-MVP."
    accepted_by: "mgregory"
    accepted_at: "2026-04-17T00:00:00Z"
human_verification:
  - test: "Submit the checkout form with the opt-in checkbox unchecked, then submit again with it checked"
    expected: "Checkbox renders unchecked by default; clicking it checks it; form submits in both states without error; checked state sends optInMailingList=true in the POST body"
    why_human: "React checkbox state and form behavior cannot be verified without a running browser"
  - test: "Complete a full checkout in the sandbox environment and inspect the Supabase orders table"
    expected: "A row appears in orders with the correct drop_id, pickup_option_id, customer_email, customer_name, square_order_id, square_invoice_id, and a cart_snapshot JSONB containing items with priceCents and estimatedTotalCents"
    why_human: "End-to-end database write requires live Square sandbox credentials and a running Supabase instance"
---

# Phase 4: Checkout & Email Verification Report

**Phase Goal:** Save orders to Supabase, use atomic pre-reservation before Square API calls (ORD-01), send branded confirmation emails via Resend, and add mailing list opt-in at checkout.
**Verified:** 2026-04-17T19:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Same logical order submitted twice produces the same idempotency key for each Square API call | VERIFIED | `lib/idempotency.ts` uses SHA-256 with sorted inputs; 6/6 deterministic tests pass |
| 2 | Different orders produce different idempotency keys | VERIFIED | Tests confirm `newIdempotencyKey(["a","b","c"]) != newIdempotencyKey(["a","b","d"])` |
| 3 | Customer, order, invoice, and publish Square calls each get a unique deterministic key | VERIFIED | `route.ts` lines 186, 224, 272, 317 use `[...idempotencyBase, "customer/order/invoice/publish"]` |
| 4 | Idempotency keys are max 45 characters | VERIFIED | `lib/idempotency.ts` line 7: `.slice(0, 45)` |
| 5 | After publishInvoice succeeds, an order record is saved to Supabase orders table with all required fields | VERIFIED | `route.ts` lines 334-342; test "saves order to Supabase after successful publishInvoice" passes |
| 6 | If the Supabase order save fails, checkout still returns success (fire-and-forget D-03) | VERIFIED | `route.ts` lines 344-346: logs error but does not rethrow; test "returns success even when order save fails" passes |
| 7 | If customer checks opt-in box, their email is upserted into mailing_list | VERIFIED | `route.ts` lines 349-360: conditional upsert with `onConflict: "email"`, `ignoreDuplicates: true`; test passes |
| 8 | If mailing list insert fails, checkout still returns success (fire-and-forget D-09) | VERIFIED | `route.ts` lines 357-359: logs error but does not rethrow |
| 9 | Duplicate mailing list emails are handled silently via ON CONFLICT DO NOTHING | VERIFIED | `route.ts` line 354: `{ onConflict: "email", ignoreDuplicates: true }` |
| 10 | Checkout form shows an unchecked opt-in checkbox labeled "Notify me about future drops" | VERIFIED | `CheckoutClient.tsx` lines 333-341: checkbox with `useState(false)`, label text matches spec |
| 11 | Slot reservation happens before any Square API call | VERIFIED | `route.ts` line 137: `reserve_pickup_slot` RPC at outer-try scope; Square calls inside inner try starting at line 168 |
| 12 | MAIL-01: Branded confirmation email sent via Resend | PASSED (override) | D-10 explicitly drops this from v1.0; Square invoice email covers MVP; developer confirmed deferred in Phase 5 discussion |

**Score:** 12/12 truths verified (11 direct + 1 override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/idempotency.ts` | Deterministic SHA-256 key generation | VERIFIED | `createHash("sha256")`, sorted inputs, 45-char slice; named export `newIdempotencyKey` |
| `tests/idempotency.test.ts` | Unit tests for deterministic key behavior | VERIFIED | 6 test cases, all passing |
| `app/api/checkout/route.ts` | Deterministic keys at each Square call site; order save; mailing list upsert | VERIFIED | All 4 call sites use `[...idempotencyBase, purpose]`; `from("orders").insert`; `from("mailing_list").upsert` |
| `components/CheckoutClient.tsx` | Mailing list opt-in checkbox; priceCents in cart payload | VERIFIED | `isOptedIntoMailingList` state, checkbox rendered, `priceCents` and `optInMailingList` in fetch body |
| `tests/checkoutReservation.test.ts` | Tests for order save and mailing list behavior | VERIFIED | 4 new test cases in 2 describe blocks; 11/11 tests in file pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/checkout/route.ts` | `lib/idempotency.ts` | `import { newIdempotencyKey }` | WIRED | Line 5: import present; 4 call sites use `newIdempotencyKey([...idempotencyBase, purpose])` |
| `components/CheckoutClient.tsx` | `app/api/checkout/route.ts` | fetch POST body includes `optInMailingList` and `priceCents` | WIRED | Lines 142-145: `priceCents: variationMap.get(...)?.priceCents ?? 0` and `optInMailingList: isOptedIntoMailingList` |
| `app/api/checkout/route.ts` | `supabase.from("orders").insert` | insert after publishInvoice | WIRED | Lines 334-342: insert called with all D-04 fields |
| `app/api/checkout/route.ts` | `supabase.from("mailing_list").upsert` | conditional upsert | WIRED | Lines 349-360: guarded by `parsed.data.optInMailingList` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/api/checkout/route.ts` orders insert | `cartSnapshot` | Derived from `parsed.data.cart` (Zod-validated request body) | Yes — reflects real cart items | FLOWING |
| `app/api/checkout/route.ts` mailing_list upsert | `customer.email` | From `parsed.data.customer.email` (Zod-validated) | Yes — real customer email | FLOWING |
| `components/CheckoutClient.tsx` | `isOptedIntoMailingList` | `useState(false)`, updated by checkbox `onChange` | Yes — user interaction drives value | FLOWING |
| `components/CheckoutClient.tsx` | `priceCents` per cart item | `variationMap.get(item.variationId)?.priceCents ?? 0` | Yes — from live Square catalog via `useFrozenItems` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `newIdempotencyKey` test suite | `npx vitest run tests/idempotency.test.ts` | 6/6 pass | PASS |
| Full test suite (48 tests) | `npm run test` | 48/48 pass | PASS |
| TypeScript compilation | `npx tsc --noEmit` | 0 errors | PASS |
| No zero-arg `newIdempotencyKey()` calls | `grep "newIdempotencyKey()"` in route.ts | 0 matches | PASS |
| Order save and mailing list tests | `checkoutReservation.test.ts` (11 tests) | 11/11 pass | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ORD-01 | 04-02 | Atomic slot reservation before Square API calls | SATISFIED | `reserve_pickup_slot` at line 137, Square try block at line 168 |
| ORD-02 | 04-02 | Order record saved to Supabase with JSONB cart snapshot | SATISFIED | `from("orders").insert` at lines 334-342 with all D-04 fields |
| ORD-03 | 04-01 | Deterministic idempotency keys derived from order data | SATISFIED | SHA-256 in `lib/idempotency.ts`; 4 purpose-suffixed call sites |
| MAIL-01 | 04-02 | Branded confirmation email via Resend | PASSED (override) | D-10 drops from v1.0; Square invoice email accepted as MVP equivalent |
| MAIL-04 | 04-02 | Mailing list opt-in at checkout | SATISFIED | Checkbox in `CheckoutClient.tsx`; conditional upsert in `route.ts` |

### Anti-Patterns Found

No blockers or warnings found. Scanned `lib/idempotency.ts`, `app/api/checkout/route.ts`, `components/CheckoutClient.tsx`, `tests/idempotency.test.ts`, `tests/checkoutReservation.test.ts`.

- No TODO/FIXME/PLACEHOLDER comments
- No stub return values (`return null`, `return {}`, `return []`)
- The `crypto.randomUUID()` at route.ts line 42 is for the request tracing ID (`requestId`), not idempotency — correct and intentional
- `priceCents` defaults to `0` when not in variationMap — acceptable; variationMap is populated from live Square catalog data

### Human Verification Required

#### 1. Opt-In Checkbox UI Behavior

**Test:** Load the checkout page. Verify the "Notify me about future drops" checkbox appears below the customer info grid and above the error area. Verify it is unchecked by default. Click it to check it. Submit the form (or inspect the network request payload).
**Expected:** Checkbox starts unchecked; clicking toggles it; POST body contains `"optInMailingList": true` when checked, `false` (or omitted) when not.
**Why human:** React checkbox state and rendered DOM position cannot be verified without a browser.

#### 2. End-to-End Order Save to Supabase

**Test:** Complete a checkout in the Square sandbox environment using valid credentials. Inspect the Supabase `orders` table after the transaction.
**Expected:** A row exists with `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `square_order_id`, `square_invoice_id`, and a `cart_snapshot` JSONB with `items` array (each containing `priceCents`) and `estimatedTotalCents`.
**Why human:** End-to-end Supabase write requires live Square sandbox credentials, an active drop, and a running Supabase instance — not exercisable via grep or unit tests.

### Gaps Summary

No blocking gaps. All 5 phase requirements are accounted for:

- ORD-01, ORD-02, ORD-03, MAIL-04: Fully implemented and verified with unit tests.
- MAIL-01: Deliberately deferred from v1.0 via D-10 (Phase 4 CONTEXT, confirmed in Phase 5 discussion). Square invoice email covers MVP confirmation. Override documented above.

Two items require human verification before the phase can be considered fully closed: UI checkbox behavior and end-to-end Supabase write. All automated checks pass (48/48 tests, 0 TypeScript errors).

---

_Verified: 2026-04-17T19:45:00Z_
_Verifier: Claude (gsd-verifier)_
