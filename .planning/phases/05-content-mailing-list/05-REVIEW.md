---
phase: 05-content-mailing-list
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - app/about/page.tsx
  - app/api/admin/broadcast/route.ts
  - app/api/checkout/route.ts
  - app/api/dev/set-inventory/route.ts
  - app/api/mailing-list/route.ts
  - app/api/unsubscribe/route.ts
  - app/catering/page.tsx
  - app/contact/page.tsx
  - app/layout.tsx
  - app/unsubscribe/page.tsx
  - components/CateringSection.tsx
  - components/Footer.tsx
  - components/MailingListSection.tsx
  - components/NavBar.tsx
  - components/OrderLanding.tsx
  - lib/idempotency.ts
  - lib/unsubscribeToken.ts
  - package.json
  - tests/broadcast.test.ts
  - tests/checkoutReservation.test.ts
  - tests/mailingList.test.ts
  - tests/unsubscribeToken.test.ts
  - .env.example
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

This phase introduces the mailing list signup flow (Footer + MailingListSection forms, `/api/mailing-list`, `/api/unsubscribe`), the broadcast admin endpoint (`/api/admin/broadcast`), the JWT-based unsubscribe token library (`lib/unsubscribeToken.ts`), static content pages (About, Catering, Contact), and checkout updates with drop/pickup slot reservation via Supabase RPC.

The architecture is solid: Zod validates all API boundaries, the unsubscribe JWT uses `jose` with a proper expiry, the broadcast route checks auth before parsing the body, and the reservation rollback logic in checkout is careful. Ten issues were found: one critical (timing-safe secret comparison), five warnings, and four informational items.

---

## Critical Issues

### CR-01: Non-timing-safe bearer token comparison in broadcast route

**File:** `app/api/admin/broadcast/route.ts:29`
**Issue:** The `authorize()` function compares the bearer secret with the JavaScript `===` operator. String equality in JS is not timing-safe — a patient attacker can use response-time differences to determine the correct secret character-by-character. This endpoint triggers a mass email send to all subscribers, making it a high-value target worth protecting with a timing-safe comparison.
**Fix:**
```typescript
import { timingSafeEqual } from "crypto";

function authorize(requestHeaders: Headers): boolean {
  const secret = process.env.BROADCAST_SECRET;
  if (!secret || secret.length < 16) return false;
  const authHeader = requestHeaders.get("authorization");
  if (!authHeader) return false;
  const expected = `Bearer ${secret}`;
  // Lengths must match before comparing bytes; unequal length is itself a safe reject.
  if (authHeader.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}
```

---

## Warnings

### WR-01: Silent re-subscribe failure — unsubscribed users cannot rejoin the list

**File:** `app/api/mailing-list/route.ts:28-38`
**Issue:** The route performs a plain `insert` and silently returns 200 on a `23505` unique-violation error. This correctly handles a user who tries to sign up twice, but it also silently swallows the case where a previously-unsubscribed user (whose row has `subscribed = false`) tries to rejoin. The 200 response tells them "You're on the list!" but their `subscribed` column remains `false` in the database — they will receive no emails from future broadcasts.
**Fix:** Use an upsert to set `subscribed = true` on conflict so re-subscribes are handled correctly. This also eliminates the `23505` special-case:
```typescript
const { error } = await supabase
  .from("mailing_list")
  .upsert(
    { email: parsed.data.email, subscribed: true },
    { onConflict: "email", ignoreDuplicates: false }
  );

if (error) {
  logError("mailing-list upsert failed", error, requestId);
  return NextResponse.json(
    { error: "Signup failed. Please try again.", requestId },
    { status: 500 }
  );
}
```

### WR-02: UNSUBSCRIBE_SECRET falls back to BROADCAST_SECRET — keys should not be shared

**File:** `lib/unsubscribeToken.ts:7-13`
**Issue:** `getSecret()` falls back from `UNSUBSCRIBE_SECRET` to `BROADCAST_SECRET`. These serve different purposes: `BROADCAST_SECRET` is an HTTP bearer credential; `UNSUBSCRIBE_SECRET` is a JWT signing key embedded in end-user emails that live for 30 days. Sharing them creates two problems: (1) rotating the broadcast credential for security reasons immediately invalidates all outstanding unsubscribe links — every previously sent email now contains a broken link; (2) anyone who obtains `BROADCAST_SECRET` (e.g., through a log leak) can forge valid unsubscribe JWTs for arbitrary email addresses, silently unsubscribing any recipient. The `.env.example` already documents `UNSUBSCRIBE_SECRET` as its own variable; the fallback undercuts that.
**Fix:** Remove the fallback and require `UNSUBSCRIBE_SECRET` explicitly:
```typescript
function getSecret(): Uint8Array {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing or too-short UNSUBSCRIBE_SECRET. Set it in .env.local to a 32+ character random value."
    );
  }
  return new TextEncoder().encode(secret);
}
```

### WR-03: Pickup slot sold-out gate uses AND, missing early rejection for single-product carts

**File:** `app/api/checkout/route.ts:101-108`
**Issue:** The early guard fires only when both product types are exhausted at the slot:
```typescript
const pickupSoldOut =
  pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork &&
  pickupRow.reserved_brisket >= pickupRow.capacity_brisket;
```
A customer ordering only pulled pork passes this gate even when pulled pork capacity is full — they reach the `reserve_pickup_slot` RPC, which correctly rejects the reservation, but the error message they receive is the generic RPC message rather than the user-friendly "This pickup slot is sold out." The gate should check whether the products actually in the cart are available.

Note: the gate currently runs before the `totals` map is built, so the fix requires reordering as well.
**Fix:** Move the gate to after the `totals` map is built (after line 117), then check per product:
```typescript
const pickupSoldOut = [...totals.entries()].some(([productName]) => {
  if (productName === "pulled_pork") {
    return pickupRow.reserved_pulled_pork >= pickupRow.capacity_pulled_pork;
  }
  if (productName === "brisket") {
    return pickupRow.reserved_brisket >= pickupRow.capacity_brisket;
  }
  return false;
});
```

### WR-04: broadcast `html` payload has no maximum length

**File:** `app/api/admin/broadcast/route.ts:10-14`
**Issue:** The Zod schema caps `subject` at 200 characters but places no upper bound on `html`. A very large payload would be sent in full to every subscriber, potentially hitting Resend's per-email byte limit and causing silent send failures for the entire batch. This is an admin-only path but should still be bounded.
**Fix:**
```typescript
const schema = z.object({
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(100_000), // 100 KB is a generous but reasonable ceiling
  dropId: z.string().optional()
});
```

### WR-05: Unreliable test — module cache not reset before re-importing with changed secret

**File:** `tests/unsubscribeToken.test.ts:29-36`
**Issue:** The test "rejects a token signed with a different secret" changes `process.env.UNSUBSCRIBE_SECRET` on line 32 and then immediately calls `import("../lib/unsubscribeToken")`. Because no `vi.resetModules()` call precedes the re-import, Vitest returns the cached module instance, which still holds a reference to the `TextEncoder`-encoded bytes of the *original* secret captured when `getSecret()` was first called. The test therefore verifies nothing — it passes because `jwtVerify` happens to reject the token for some other reason, or it becomes silently correct by coincidence. This is a flaky-test risk.
**Fix:** Reset the module registry before changing the secret:
```typescript
it("rejects a token signed with a different secret", async () => {
  const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
  const token = await signUnsubscribeToken("a@b.com");

  vi.resetModules(); // flush cached module so new env var is picked up
  process.env.UNSUBSCRIBE_SECRET = "different-secret-at-least-32-characters-long-yyyyyyyyyyyyyy";
  const { verifyUnsubscribeToken } = await import("../lib/unsubscribeToken");
  await expect(verifyUnsubscribeToken(token)).rejects.toThrow();
});
```

---

## Info

### IN-01: Draft copy note left in production About page

**File:** `app/about/page.tsx:28-30`
**Issue:** A paragraph reading "Draft copy — Matt will revise before launch." is rendered on the live `/about` page and is visible to all users.
**Fix:** Remove or replace the paragraph before going live.

### IN-02: `NEXT_PUBLIC_SITE_URL` is consumed by broadcast route but absent from `.env.example`

**File:** `app/api/admin/broadcast/route.ts:17` and `.env.example`
**Issue:** `getBaseUrl()` checks `process.env.NEXT_PUBLIC_SITE_URL` first when building unsubscribe URLs. This variable does not appear in `.env.example`, so developers and deployment checklists have no prompt to set it. Without it, the fallback reads `x-forwarded-proto` and `host` from request headers, which works fine on Vercel but can silently generate `http://localhost:3000` URLs in local broadcast testing.
**Fix:** Add to `.env.example`:
```
# Optional: canonical site URL; used in broadcast email unsubscribe links.
NEXT_PUBLIC_SITE_URL=
```

### IN-03: `newIdempotencyKey` sorts inputs — ordering cannot be used for disambiguation

**File:** `lib/idempotency.ts:4-7`
**Issue:** Inputs are sorted before hashing (`[...inputs].sort().join("|")`), so `["a", "b"]` and `["b", "a"]` produce the same key. Every current call site uses a unique suffix ("customer", "order", "invoice", "publish"), so there are no collisions today, but this is a non-obvious invariant. A future caller that relies on input order for uniqueness would silently produce key collisions.
**Fix:** Either remove the sort and document that call sites must pass inputs in a stable order, or add a comment explaining why the sort is intentional:
```typescript
// Inputs are sorted so key is stable regardless of caller order.
// Each call site must use a unique suffix token to prevent collision between operations.
```

### IN-04: Dead code — `?? "no-order"` and `?? "no-invoice"` fallbacks in publish idempotency key are unreachable

**File:** `app/api/checkout/route.ts:270-271`
**Issue:** Inside the `publishInvoice` call, the idempotency key includes `orderId ?? "no-order"` and `invoiceId ?? "no-invoice"`. At that point in the code both variables are guaranteed non-null: `orderId` is checked by the guard at lines 245-257 (which returns early if absent) and `invoiceId` is checked by the guard at lines 296-309. The `?? "..."` fallbacks are dead code and create the false impression that null is possible.
**Fix:** Use the variables directly without the null-coalescing fallback (TypeScript should narrow their types after the guards):
```typescript
idempotencyKey: newIdempotencyKey([
  customer.email,
  parsed.data.dropId,
  invoiceId,
  String(invoiceVersion ?? 0),
  "publish"
])
```

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
