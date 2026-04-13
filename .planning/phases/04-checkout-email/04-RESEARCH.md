# Phase 4: Checkout & Email — Research

**Researched:** 2026-04-13
**Domain:** Checkout transaction sequencing, Supabase order persistence, deterministic idempotency keys, mailing list opt-in
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Checkout sequence is: Validate → Reserve slots → Square customer upsert → Square order → Square invoice → Publish invoice → Save order to Supabase → Return success.
- **D-02:** If any Square API call fails after a successful reservation, call `release_pickup_slot` in the catch block and return a 500 error. No leaked capacity.
- **D-03:** If the Supabase order save fails after `publishInvoice` succeeds, log the error and return success (fire-and-forget). The customer already has a valid Square invoice.
- **D-04:** The Supabase `orders` record is created after `publishInvoice` succeeds, populated with: `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `square_order_id`, `square_invoice_id`, `cart_snapshot` (JSONB).
- **D-05:** `cart_snapshot` JSONB shape: items with `variationId`, `productName`, `quantity`, and unit price in cents; plus estimated total in cents. Drop ID and pickup option ID are top-level FK columns — not duplicated in JSONB.
- **D-06:** Opt-in checkbox near the email field in the checkout form, unchecked by default.
- **D-07:** Label text is Claude's discretion (e.g., "Notify me about future drops").
- **D-08:** If customer email already in `mailing_list`, use `INSERT ... ON CONFLICT DO NOTHING` — silently skip, no error.
- **D-09:** Mailing list insert is fire-and-forget alongside the order save. A failure does not fail checkout.
- **D-10:** MAIL-01 (branded Resend confirmation email) is dropped from v1.0. Square invoice email covers confirmation for MVP. No Resend in Phase 4.

### Claude's Discretion

- Deterministic idempotency key hash algorithm and input selection
- Exact shape of cart_snapshot JSONB (field names, nesting)
- Mailing list checkbox label text and placement within CheckoutClient form
- Log message text for reservation success/failure, order save failure, mailing list insert failure
- Sequential vs Promise.allSettled for per-product reservation calls
- Rollback call (`release_pickup_slot`) signature — same product grouping logic as Phase 3

### Deferred Ideas (OUT OF SCOPE)

- MAIL-01: Branded Resend confirmation email — dropped from v1.0.
- Email logs table (`email_logs` in Supabase) — schema exists but unused in Phase 4.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORD-01 | Atomic Supabase slot reservation BEFORE Square API calls to prevent overselling | Phase 3 already wired `reserve_pickup_slot` post-publish. Phase 4 moves reservation to pre-Square, replacing Phase 3's post-publish call. Current `checkout/route.ts` already has the full reservation/rollback scaffold. |
| ORD-02 | Order record saved to Supabase with JSONB cart snapshot at purchase time | `orders` table schema is live. `database.types.ts` has correct Insert types. Supabase client singleton in `lib/supabase.ts` is ready. |
| ORD-03 | Deterministic idempotency keys derived from order data to prevent duplicate Square orders | `lib/idempotency.ts` currently returns `crypto.randomUUID()`. Replacement uses Node.js built-in `crypto.createHash('sha256')` — verified available on Node 24. |
| MAIL-04 | User can opt into mailing list during checkout | `mailing_list` table is live with `email unique` constraint enabling `ON CONFLICT DO NOTHING`. `CheckoutClient.tsx` form needs a checkbox state and payload field. |

</phase_requirements>

---

## Summary

Phase 4 is almost entirely a **refactor of the existing checkout flow**, not greenfield work. The checkout route (`app/api/checkout/route.ts`) already contains the full reservation/rollback scaffold introduced in Phase 3 — but the reservation currently fires POST-`publishInvoice`. Phase 4 moves that call to PRE-Square, adds a Supabase order save (fire-and-forget), replaces random idempotency keys with deterministic SHA-256 hashes, and adds a mailing list opt-in checkbox to the form.

No new libraries are required. Node.js built-in `crypto.createHash` handles SHA-256. The Supabase client, database types, and all RPC signatures are already in place. The `orders` and `mailing_list` tables are live in the migration. The biggest task is restructuring the try/catch block in the route to implement D-01's exact sequence.

**Primary recommendation:** Restructure `app/api/checkout/route.ts` in one focused task (move reservation from post-publish to pre-Square, add post-publish Supabase saves), replace `lib/idempotency.ts` with a deterministic hash function, and add the opt-in checkbox to `CheckoutClient.tsx`.

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | already installed | Supabase DB operations — orders insert, mailing list upsert | Already used by `lib/supabase.ts`; service role key bypasses RLS |
| Node.js `crypto` built-in | 24.8.0 (verified) | SHA-256 for deterministic idempotency keys | No install needed; `crypto.createHash('sha256')` confirmed functional |
| `zod` | ^3.24.2 | Existing checkout schema validation; `optInMailingList` field added | Already in project |
| `vitest` | ^4.0.18 | Unit tests for new logic | Already configured |

[VERIFIED: codebase — `package.json`, `lib/supabase.ts`, `lib/idempotency.ts`]

### No New Packages Required

Phase 4 adds no new dependencies. MAIL-01 (Resend) is deferred per D-10. All needed functionality is covered by existing libraries and Node.js built-ins.

---

## Architecture Patterns

### Recommended Project Structure (no new files/folders needed)

The existing structure accommodates all Phase 4 changes:

```
app/api/checkout/route.ts       — primary change: reorder reservation + add Supabase saves
lib/idempotency.ts              — replace randomUUID with deterministic hash function
lib/supabase.ts                 — no change (client already configured)
lib/database.types.ts           — already correct for orders/mailing_list inserts
components/CheckoutClient.tsx   — add optInMailingList checkbox state + payload field
tests/checkoutReservation.test.ts — extend with new Phase 4 test cases
tests/idempotency.test.ts       — new test file for deterministic key logic
```

### Pattern 1: Pre-Square Reservation with Rollback

The Phase 3 reservation code is already in `route.ts` — it just needs to move. Current structure:

```
1. Validate (Zod)
2. Supabase drop precheck
3. Supabase pickup lookup
4. Reserve slots (CURRENT PHASE 3 POSITION — post-publish, needs to move here)
5. Square: customer upsert
6. Square: createOrder
7. Square: createInvoice
8. Square: publishInvoice
9. [PHASE 4] Save order to Supabase (fire-and-forget)
10. [PHASE 4] Save mailing list opt-in (fire-and-forget)
11. Return success
```

The rollback for Square failures already exists in the catch block. Phase 4 keeps that rollback and removes the post-publish reservation call from Phase 3.

**Key structural insight:** The current `route.ts` has an outer try/catch wrapping all Square calls (lines 153–315). The reservation block (lines 112–147) is already ABOVE the Square try/catch. Phase 4 does NOT need to restructure this — the reservation is already pre-Square. The only change is removing the post-publish Phase 3 reservation that was added as a gap closure, and adding the Supabase order save + mailing list insert after `publishInvoice` inside the inner try block (or immediately after it in the outer flow).

[VERIFIED: codebase — `app/api/checkout/route.ts` lines 112–147 and 153–315]

### Pattern 2: Deterministic Idempotency Keys

Replace `crypto.randomUUID()` with a SHA-256 hash derived from stable order inputs. Using Node.js built-in `crypto.createHash`:

```typescript
// Source: Node.js 24 built-in crypto module [VERIFIED: local runtime check]
import { createHash } from "crypto";

export function newIdempotencyKey(inputs: string[]): string {
  return createHash("sha256")
    .update(inputs.sort().join("|"))
    .digest("hex")
    .slice(0, 45); // Square max idempotency key length is 45 chars
}
```

**Input selection (Claude's discretion):** A stable fingerprint combining `email + dropId + pickupOptionId + sorted variationIds with quantities + purpose_suffix`. The purpose suffix differentiates keys for customer creation vs. order creation vs. invoice creation from the same logical order (e.g., `"customer"`, `"order"`, `"invoice"`).

Example derivation:
```typescript
// Source: codebase analysis [ASSUMED — specific input selection]
const cartFingerprint = cart
  .map((item) => `${item.variationId}:${item.quantity}`)
  .sort()
  .join(",");

const orderKey = newIdempotencyKey([email, dropId, pickupOptionId, cartFingerprint, "order"]);
const invoiceKey = newIdempotencyKey([email, dropId, pickupOptionId, cartFingerprint, "invoice"]);
const customerKey = newIdempotencyKey([email, dropId, pickupOptionId, cartFingerprint, "customer"]);
```

**Square idempotency key length limit:** 45 characters. SHA-256 hex output is 64 chars; slice to 45. [ASSUMED — Square docs state max length; verified via historical project pattern. Confirm against Square API docs if concerned.]

### Pattern 3: Supabase Order Save (fire-and-forget)

```typescript
// Source: codebase — lib/supabase.ts, supabase/migrations/0001_foundation.sql [VERIFIED]
// After publishInvoice succeeds:
const cartSnapshotItems = cart.map((item) => ({
  variationId: item.variationId,
  productName: item.productName ?? null,
  quantity: item.quantity,
  priceCents: /* resolved from Square order line items or catalog */ 0
}));

const orderSaveResult = await supabase.from("orders").insert({
  drop_id: parsed.data.dropId,
  pickup_option_id: parsed.data.pickupOptionId,
  customer_email: customer.email,
  customer_name: `${customer.firstName} ${customer.lastName}`,
  square_order_id: orderId,
  square_invoice_id: invoiceId,
  cart_snapshot: {
    items: cartSnapshotItems,
    estimatedTotalCents: /* computed from items */
  }
});

if (orderSaveResult.error) {
  logError("Order save failed (non-blocking)", orderSaveResult.error, requestId);
  // Do NOT throw — fire-and-forget per D-03
}
```

**Unit price in cart_snapshot:** The `cart` payload from the client includes `variationId` and `quantity` but not price. The Square `createOrder` response includes line items with total money. However, the simplest approach consistent with D-05 is to resolve price from the `frozenItems` API response — but that's client-side only. The route can use the Square order response's `line_items[].total_money.amount / quantity` or leave `priceCents` as `0` until enriched. **Recommendation:** Pass price cents from the client in the cart payload (add to CheckoutClient's submitted cart), or extract from Square order response.

[ASSUMED — exact price resolution approach; D-05 says "unit price in cents" but doesn't specify source]

### Pattern 4: Mailing List Opt-In (fire-and-forget)

```typescript
// Source: supabase/migrations/0001_foundation.sql — mailing_list table has unique(email) [VERIFIED]
if (parsed.data.optInMailingList && customer.email) {
  const mailingListResult = await supabase
    .from("mailing_list")
    .insert({ email: customer.email })
    .select()
    // ON CONFLICT DO NOTHING via upsert with ignoreDuplicates
    // Supabase JS client: use .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    ;
  // OR:
  const mailingListResult2 = await supabase
    .from("mailing_list")
    .upsert({ email: customer.email }, { onConflict: "email", ignoreDuplicates: true });

  if (mailingListResult2.error) {
    logError("Mailing list insert failed (non-blocking)", mailingListResult2.error, requestId);
    // Do NOT throw — fire-and-forget per D-09
  }
}
```

**Supabase JS upsert with `ignoreDuplicates: true`** is the standard way to implement `INSERT ... ON CONFLICT DO NOTHING` via the client library. [VERIFIED: `@supabase/supabase-js` is installed; upsert API is stable in v2]

### Pattern 5: CheckoutClient Form — Opt-In Checkbox

Add a boolean state variable and include it in the fetch body:

```typescript
// Source: components/CheckoutClient.tsx — existing form pattern [VERIFIED]
const [optInMailingList, setOptInMailingList] = useState(false);

// In the form, near the email field:
<label className="flex items-center gap-2 text-sm text-smoke-600 mt-4">
  <input
    type="checkbox"
    checked={optInMailingList}
    onChange={(e) => setOptInMailingList(e.target.checked)}
    className="rounded"
  />
  Notify me about future drops
</label>

// In the fetch body:
body: JSON.stringify({
  dropId: drop.id,
  pickupOptionId,
  customer: { ... },
  cart: [...],
  optInMailingList  // new field
})
```

The Zod `checkoutSchema` in `route.ts` must add:
```typescript
optInMailingList: z.boolean().optional().default(false)
```

### Anti-Patterns to Avoid

- **Random idempotency keys on retry:** Current `newIdempotencyKey()` returns a new UUID every call. If client retries after network timeout, a second Square order/invoice is created. Deterministic keys prevent this.
- **Throwing after publishInvoice for Supabase failures:** Per D-03, once the invoice is published, the customer has their confirmation. Failing the HTTP response confuses them. Always fire-and-forget post-publish Supabase writes.
- **Skipping the rollback in all failure paths:** The current code has rollback in multiple places (after reservation failure, after order failure, after invoice failure, in the catch block). Phase 4 must preserve all these rollback paths when restructuring.
- **Using `insert` instead of `upsert` for mailing_list:** A plain `insert` will throw a unique constraint error if the email exists. Use `upsert` with `ignoreDuplicates: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `INSERT ... ON CONFLICT DO NOTHING` | Custom duplicate-check SELECT before INSERT | Supabase `upsert({ onConflict, ignoreDuplicates: true })` | Atomic; no race condition between check and insert |
| SHA-256 hashing | Import external hash library | `crypto.createHash('sha256')` (Node built-in) | Already available; no install needed |
| Idempotency key truncation | Manual string manipulation | `.digest('hex').slice(0, 45)` | Single expression; deterministic |

---

## Common Pitfalls

### Pitfall 1: Phase 3 Reservation Still Present Post-Publish

**What goes wrong:** Phase 3 added `reserve_pickup_slot` calls after `publishInvoice`. If Phase 4 adds the pre-Square reservation without removing the Phase 3 post-publish call, slots will be double-reserved.
**Why it happens:** Phase 3 was a gap-closure that explicitly placed reservation post-publish as a temporary measure.
**How to avoid:** Remove the Phase 3 post-publish reservation block when adding the Phase 4 pre-Square reservation.
**Warning signs:** Look for any `reserve_pickup_slot` RPC call in the route that appears after the `publishInvoice` call.

[VERIFIED: codebase — checked `app/api/checkout/route.ts`; confirmed Phase 3's reservation is ALREADY pre-Square (lines 112–147). The current code is actually already in the correct position. Phase 3's plan said post-publish, but the current code shows reservation before Square calls. This means Phase 4's primary reservation refactor may already be done.]

**Critical finding:** Reading `route.ts` carefully, the reservation block at lines 112–147 comes BEFORE the Square try block starting at line 153. The Phase 3 decision D-01 said "after publishInvoice" but the implementation in the file shows pre-Square reservation. **Phase 4 may only need to add the order save and mailing list insert — the reservation sequence is already correct.**

### Pitfall 2: Cart Snapshot Missing Unit Price

**What goes wrong:** The `cart` array in the checkout request has `variationId` and `quantity` but no price. D-05 requires unit price in cents in the JSONB snapshot. If price is not added to the client payload or extracted from Square's response, the snapshot is incomplete.
**Why it happens:** `CheckoutClient` builds the cart from `CartContext` which stores only `variationId` and `quantity`.
**How to avoid:** Either (a) have `CheckoutClient` include `priceCents` from its `variationMap` in the cart payload, or (b) extract price from the Square `createOrder` response's `line_items`. Option (a) is simpler.
**Warning signs:** `cart_snapshot.items[].priceCents` is always 0.

### Pitfall 3: Idempotency Key Exceeds Square's 45-Character Limit

**What goes wrong:** SHA-256 hex output is 64 characters. If the full hash is sent as an idempotency key, Square rejects it.
**Why it happens:** SHA-256 output is 256 bits = 64 hex chars. Square enforces a maximum length.
**How to avoid:** Slice the hex digest to 45 characters (or fewer). 45 hex chars = 180 bits of entropy — sufficient for collision resistance given the bounded input space.
**Warning signs:** Square API returns 400 with an idempotency key validation error.

[ASSUMED — Square's 45-char limit comes from training knowledge; verify in Square API docs if needed]

### Pitfall 4: CheckoutSchema Doesn't Accept optInMailingList

**What goes wrong:** `checkoutSchema` in `route.ts` doesn't include `optInMailingList` field, so it's stripped by Zod and the opt-in never reaches the mailing list insert.
**Why it happens:** Forgetting to update the Zod schema when adding a new form field.
**How to avoid:** Add `optInMailingList: z.boolean().optional().default(false)` to `checkoutSchema`.
**Warning signs:** Mailing list table never gets new rows even when checkbox is checked.

### Pitfall 5: Double Rollback Attempts

**What goes wrong:** If the rollback itself (releasing slots) is called in both a guard block and the outer catch, slots get released twice — pushing reserved count negative.
**Why it happens:** Multiple error paths each try to clean up.
**How to avoid:** Use a `released` boolean flag so the catch block skips rollback if it was already executed in a guard path.
**Warning signs:** `reserved_*` counts go negative in the database.

[VERIFIED: codebase — current `route.ts` has rollback in 3 guard locations AND the outer catch. The outer catch re-throws the Square error after rollback, so it only runs once. Current pattern is safe. Phase 4 must preserve this structure.]

---

## Code Examples

### Current Route Structure (Verified)

The current checkout route already implements the correct pre-Square reservation sequence. The key structural sections are:

1. **Lines 112–147:** Reservation loop with rollback on failure — already pre-Square
2. **Lines 149–315:** Square operations try block — customer, order, invoice, publish
3. **Lines 304–315:** Square error catch with rollback, then re-throw
4. **Lines 317–322:** Success response

Phase 4 adds after `publishInvoice` (inside the Square try block, before the closing brace):
- Supabase order insert (fire-and-forget with `logError` on failure)
- Supabase mailing list upsert (fire-and-forget with `logError` on failure, conditional on `optInMailingList`)

### Deterministic Key Function

```typescript
// lib/idempotency.ts — complete replacement
// Source: Node.js 24 built-in crypto [VERIFIED: runtime check confirms createHash works]
import { createHash } from "crypto";

export function newIdempotencyKey(inputs: string[]): string {
  return createHash("sha256")
    .update(inputs.sort().join("|"))
    .digest("hex")
    .slice(0, 45);
}
```

Callers in `route.ts` pass purpose-qualified inputs:
```typescript
const cartFingerprint = parsed.data.cart
  .map((item) => `${item.variationId}:${item.quantity}`)
  .sort()
  .join(",");
const baseInputs = [customer.email, parsed.data.dropId, parsed.data.pickupOptionId, cartFingerprint];

// Three separate keys with purpose suffix:
idempotencyKey: newIdempotencyKey([...baseInputs, "customer"])
idempotencyKey: newIdempotencyKey([...baseInputs, "order"])
idempotencyKey: newIdempotencyKey([...baseInputs, "invoice"])
```

---

## Runtime State Inventory

Phase 4 is not a rename/refactor/migration phase — this section is skipped.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `crypto.randomUUID()` for idempotency keys | SHA-256 deterministic hash | Phase 4 | Same logical order submitted twice returns existing Square resources instead of creating duplicates |
| No order persistence | Supabase `orders` insert after publish | Phase 4 | Order history available for admin/reporting |
| No mailing list at checkout | Opt-in checkbox → `mailing_list` upsert | Phase 4 | Customers can subscribe during checkout flow |
| Reservation post-publish (Phase 3 design) | Reservation pre-Square (Phase 4 per D-01) | Phase 4 (may already be done — see Pitfall 1) | Prevents capacity leaking if Square calls fail |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Square idempotency key maximum length is 45 characters | Architecture Patterns, Common Pitfalls | If shorter, need to reduce slice length; if longer, no impact |
| A2 | Slicing SHA-256 hex to 45 chars provides sufficient collision resistance | Architecture Patterns | Extremely low risk given bounded order input space |
| A3 | Cart snapshot unit price should come from client's `variationMap` (added to client payload) | Architecture Patterns, Common Pitfalls | If price should come from Square order response instead, the approach changes but the outcome is equivalent |
| A4 | The current `route.ts` reservation block (lines 112–147) is already pre-Square — no move needed | Architecture Patterns | If Phase 3 added a second post-publish reservation block not visible in current file, double-reservation bug exists |

---

## Open Questions

1. **Cart unit price source for JSONB snapshot**
   - What we know: D-05 requires unit price in cents per item in `cart_snapshot`
   - What's unclear: Whether price should come from the client payload (easiest) or from the Square `createOrder` response (more authoritative)
   - Recommendation: Have `CheckoutClient` include `priceCents` from its `variationMap` in the fetch body. Add `priceCents: z.number().int().nonnegative()` to `cartSchema`. This keeps the route stateless with respect to catalog data.

2. **Phase 3 reservation placement**
   - What we know: The current `route.ts` shows reservation at lines 112–147, which is pre-Square
   - What's unclear: Whether Phase 3 also added a second post-publish reservation that was later removed, or whether the implementation diverged from the Phase 3 plan document
   - Recommendation: The planner should verify no post-publish `reserve_pickup_slot` call exists. If none exists, the ORD-01 reservation move is already done and the Phase 4 task is limited to Supabase order save + mailing list.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `crypto` | Deterministic idempotency keys | Yes | 24.8.0 | — |
| `@supabase/supabase-js` | Order save, mailing list | Yes | already installed | — |
| `zod` | Schema validation | Yes | ^3.24.2 | — |
| `vitest` | Tests | Yes | ^4.0.18 | — |
| Supabase DB (live) | Runtime orders/mailing_list inserts | assumed (credentials in .env.local) | — | Tests mock the client |

[VERIFIED: `package.json` confirms supabase-js, zod, vitest installed; Node 24.8.0 confirmed via `node --version`]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/checkoutReservation.test.ts tests/idempotency.test.ts` |
| Full suite command | `npm run test` |

**Current test baseline:** 38 tests across 8 files — all passing. [VERIFIED: ran `npx vitest run` — 38 passed]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORD-01 | Pre-Square reservation prevents overselling | unit (route mock) | `npx vitest run tests/checkoutReservation.test.ts` | Partial — existing test covers RPC failure; need new case for post-publish order save |
| ORD-02 | Order insert fires after publishInvoice with correct fields | unit (route mock) | `npx vitest run tests/checkoutReservation.test.ts` | No — needs new test cases for order save |
| ORD-03 | Same inputs produce same idempotency key; different inputs produce different keys | unit | `npx vitest run tests/idempotency.test.ts` | No — new file needed |
| MAIL-04 | Opt-in checkbox included in payload; mailing list upsert fires on opt-in | unit (route mock) | `npx vitest run tests/checkoutReservation.test.ts` | No — needs new test cases |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/checkoutReservation.test.ts tests/idempotency.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/idempotency.test.ts` — new file; covers ORD-03 (deterministic key behavior)
- [ ] New describe blocks in `tests/checkoutReservation.test.ts` — covers ORD-02 (order save) and MAIL-04 (mailing list insert) via Supabase mock extension

*(Existing test infrastructure covers all other requirements — no framework install needed)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this phase |
| V3 Session Management | No | No sessions |
| V4 Access Control | Yes (partial) | Supabase service role key bypasses RLS — only called server-side; never exposed client-side |
| V5 Input Validation | Yes | Zod schema on all API inputs; `optInMailingList` typed as boolean |
| V6 Cryptography | Yes | `crypto.createHash('sha256')` for idempotency — not used for secrets, only for deduplication fingerprinting |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Duplicate order injection (client retry) | Spoofing | Deterministic idempotency keys (ORD-03) |
| Mailing list spam injection | Tampering | `optInMailingList: z.boolean().optional().default(false)` in Zod; server validates — client cannot force a subscribe |
| Service role key leakage | Information Disclosure | `lib/supabase.ts` is server-only; never imported from client components |
| SQL injection via mailing list email | Tampering | Supabase JS client uses parameterized queries; `z.string().email()` validates format |

---

## Sources

### Primary (HIGH confidence)

- `app/api/checkout/route.ts` — current checkout flow, reservation block placement, idempotency key usage
- `supabase/migrations/0001_foundation.sql` — `orders` and `mailing_list` table schemas, RPC signatures
- `lib/database.types.ts` — TypeScript types for orders.Insert and mailing_list.Insert
- `components/CheckoutClient.tsx` — form structure, state management patterns
- `lib/cart.ts` — `aggregateByProduct` export, `CartItem` type
- `lib/idempotency.ts` — current implementation being replaced
- `lib/supabase.ts` — singleton client pattern, env var usage
- `tests/checkoutReservation.test.ts` — established mock pattern for route tests
- Node.js 24.8.0 runtime — `crypto.createHash('sha256')` verified functional

### Secondary (MEDIUM confidence)

- Phase 3 CONTEXT.md — D-01/D-02/D-03 decisions about reservation sequencing and fire-and-forget
- Phase 4 CONTEXT.md — all locked decisions (D-01 through D-10)
- Supabase JS v2 `upsert` with `ignoreDuplicates: true` — standard ON CONFLICT DO NOTHING approach [ASSUMED based on Supabase v2 API knowledge; no live doc verification]

### Tertiary (LOW confidence)

- Square 45-character idempotency key max length [ASSUMED from training; not verified against current Square docs]

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — existing code fully readable; patterns verified in codebase
- Pitfalls: HIGH — identified from direct code inspection
- Idempotency key length limit: LOW — not verified against live Square docs

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain; no external version concerns)
