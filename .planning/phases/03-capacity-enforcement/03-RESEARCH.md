# Phase 3: Capacity Enforcement (Gap Closure) — Research

**Researched:** 2026-04-12
**Domain:** Supabase RPC wiring, TypeScript type correction, dead code cleanup, planning artifact maintenance
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `reserve_pickup_slot` is called after `publishInvoice` succeeds. Intentional for MVP gap closure — Phase 4 (ORD-01) will pre-reserve before Square API calls.
- **D-02:** Reservation failure after `publishInvoice` is non-blocking. Log the error (`logError`) and return a successful checkout response. Customer already has a valid Square invoice; failing at this point creates confusing UX.
- **D-03:** Group cart items by `productName`, aggregate quantities per product, call `reserve_pickup_slot` once per product type. Log outcome of each call individually (success or failure). Succeed after all calls.
- **D-04:** `productName` is passed from the client in each cart item payload. `CheckoutClient` already has item names from the `/api/frozen-items` fetch and can include them in the cart.
- **D-05:** Valid `productName` values are `"pulled_pork"` and `"brisket"` — enforced by Zod union in `cartSchema`. These match the string literals the Supabase RPC checks.
- **D-06:** The Zod `cartSchema` in `app/api/checkout/route.ts` gains a `productName: z.union([z.literal("pulled_pork"), z.literal("brisket")])` field.
- **D-07:** `place_preorder` in `lib/database.types.ts` has `p_drop_id` and `p_pickup_id` typed as `number` — they must be `string` (UUID). Straight fix; no behavior change.
- **D-08:** `getSupabaseEnv()` is exported from `lib/env.ts` but never called anywhere in the application (only appears in tests). Remove the export.
- **D-09:** `02-03-SUMMARY.md` and `02-05-SUMMARY.md` need `requirements-completed` frontmatter added — documentary cleanup only.

### Claude's Discretion

- Exact aggregation logic (Map vs reduce vs object accumulator) for grouping cart items by productName
- Whether to use `Promise.allSettled` or sequential awaits for the RPC calls (sequential is fine given the small number of products)
- Log message text and structure for reservation outcomes
- How to handle Supabase client RPC call syntax for `reserve_pickup_slot`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. Phase 4 (ORD-01) will replace this post-publish reservation with a proper pre-reservation before any Square calls.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-03 | Drops are managed in Supabase with configurable products, capacity, and pickup options per drop | RPC `reserve_pickup_slot` is the mechanism that enforces per-product capacity; wiring it closes the enforcement gap left by Phase 2 |
| ORD-05 | Products display sold-out indicators in real-time when capacity is reached | Sold-out state in `DropDTO.soldOut` is derived from `reserved_*` vs `capacity_*` columns; calling `reserve_pickup_slot` after each order keeps those counters current, which the existing polling hook in `OrderLanding` reflects |
</phase_requirements>

---

## Summary

Phase 3 is a narrowly scoped gap-closure phase with six discrete tasks. Four are code changes; two are planning artifact updates. No new schema, no new tables, no new dependencies. All required infrastructure (the Supabase RPC functions, the typed client, the checkout route) was built in Phases 1 and 2. This phase wires the final missing connection: calling `reserve_pickup_slot` after `publishInvoice` so capacity counters actually update when orders are placed.

The most consequential change is the checkout route modification. The `cartSchema` must gain a `productName` field, `CheckoutClient` must populate it from the frozen items map, and the route must aggregate quantities per product name and call the RPC. The RPC is already deployed in Supabase and the Supabase client is already initialized in the route. The call pattern is `supabase.rpc('reserve_pickup_slot', { p_drop_id, p_pickup_option_id, p_product_name, p_quantity })`, returning `{ data: { ok: boolean, reason?: string }, error }`.

Secondary tasks are simpler: fix two wrong types in `lib/database.types.ts`, remove a dead export from `lib/env.ts` (which requires updating the one test that imports it), update a verification document, and add frontmatter to two summary files.

**Primary recommendation:** Implement the checkout route RPC wiring first (it is the only task with real risk), then handle the type fix, dead code removal, artifact updates, and Phase 1 validation completion in any order.

---

## Standard Stack

No new libraries are needed. All required packages are already installed.

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@supabase/supabase-js` | Already installed | Supabase client for RPC calls | `[VERIFIED: lib/supabase.ts]` |
| `zod` | ^3.24.2 | Extend `cartSchema` with `productName` union | `[VERIFIED: package.json]` |
| `vitest` | ^4.0.18 | Test framework for new unit tests | `[VERIFIED: vitest.config.ts]` |

**Installation:** None required.

---

## Architecture Patterns

### RPC Call Pattern (verified from codebase)

The Supabase client in this codebase is a typed singleton returned by `getSupabaseClient()`. RPC calls follow this pattern:

```typescript
// [VERIFIED: lib/database.types.ts — reserve_pickup_slot Args shape]
const { data, error } = await supabase.rpc('reserve_pickup_slot', {
  p_drop_id: parsed.data.dropId,
  p_pickup_option_id: parsed.data.pickupOptionId,
  p_product_name: productName,  // "pulled_pork" | "brisket"
  p_quantity: quantity
});
// data: { ok: boolean, reason?: string } | null
// error: PostgrestError | null
```

The RPC returns `jsonb` from the SQL function. The JS client materializes it as the JSON object directly (no `.data.data` double-wrap).

### Cart Aggregation Pattern

Cart items after the schema change will look like:
```typescript
{ variationId: string; quantity: number; productName: "pulled_pork" | "brisket" }
```

Aggregation groups by `productName` and sums quantities. A `Map<string, number>` is the cleanest approach given the small product set:

```typescript
// [ASSUMED] — pattern derived from phase decisions and existing cart iteration in route.ts
const totals = new Map<string, number>();
for (const item of parsed.data.cart) {
  totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
}
```

### Non-Blocking Post-Publish Pattern

Per D-02, reservation failures must not surface as checkout failures:

```typescript
// [ASSUMED] — pattern derived from D-02 and D-03 decisions
for (const [productName, quantity] of totals) {
  const { data: reserveResult, error: reserveErr } = await supabase.rpc('reserve_pickup_slot', {
    p_drop_id: parsed.data.dropId,
    p_pickup_option_id: parsed.data.pickupOptionId,
    p_product_name: productName,
    p_quantity: quantity
  });
  if (reserveErr || !reserveResult?.ok) {
    logError("reserve_pickup_slot failed", reserveErr ?? reserveResult, requestId);
    // non-blocking: continue and return success
  }
}
```

### productName in CheckoutClient

`CheckoutClient` builds `cartDetails` from `variationMap` (keyed by `variationId`) where each entry contains the item name. The item name from `FrozenItemDTO.name` (e.g. "Pulled Pork" or "Brisket") needs to be mapped to the canonical `productName` slug. The mapping from display name to slug must be deterministic — matching on `item.name.toLowerCase().includes("pulled_pork")` etc. is fragile. Instead, the `productName` should come directly from the `FrozenItemDTO` by matching parent item name, or the `frozenItems` array can be inspected to find which `variationId` belongs to which item.

The cleanest approach: build a second map in `CheckoutClient` keyed by `variationId` → `productName` (string literal), populated by checking if `item.name.toLowerCase().replace(/\s+/g, "_")` matches `"pulled_pork"` or `"brisket"`. This is deterministic and aligns with D-05.

```typescript
// [ASSUMED] — specific implementation left to Claude's discretion per CONTEXT.md
const productNameMap = new Map<string, "pulled_pork" | "brisket">();
for (const item of frozenItems) {
  const slug = item.name.toLowerCase().replace(/\s+/g, "_") as "pulled_pork" | "brisket";
  if (slug === "pulled_pork" || slug === "brisket") {
    for (const variation of item.variations) {
      productNameMap.set(variation.variationId, slug);
    }
  }
}
```

Cart items sent to checkout: `{ variationId, quantity, productName }`.

### Type Fix Pattern

The existing `place_preorder` Args block in `lib/database.types.ts`:
```typescript
// CURRENT (wrong)
place_preorder: {
  Args: {
    p_drop_id: number
    p_pickup_id: number
    // ...
  }
}

// CORRECTED (matches live schema — both are UUIDs)
place_preorder: {
  Args: {
    p_drop_id: string
    p_pickup_id: string
    // ...
  }
}
```

`reserve_pickup_slot` and `release_pickup_slot` already use `string` — confirmed in `lib/database.types.ts` lines 230-244. `[VERIFIED: lib/database.types.ts]`

### Dead Code Removal Pattern

`getSupabaseEnv()` is exported from `lib/env.ts` at line 39. It is imported in `tests/supabase.test.ts` at line 2. The test's `describe("getSupabaseEnv", ...)` block (lines 62-93) tests only the removed function and must be deleted alongside the export. The `describe("getSupabaseClient", ...)` block (lines 7-60) tests `lib/supabase.ts` and is unaffected.

No other callers exist in application code. `[VERIFIED: codebase — lib/supabase.ts reads process.env directly; no import of getSupabaseEnv anywhere in app/]`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Capacity enforcement | Custom counter logic | `reserve_pickup_slot` RPC (already deployed) | The RPC uses `UPDATE ... WHERE reserved + quantity <= capacity` — atomicity is in the SQL, not the application |
| Schema validation | Manual type assertions | Zod union (`z.literal("pulled_pork"), z.literal("brisket")`) | Catches invalid productName at the API boundary before any Supabase calls |

---

## Common Pitfalls

### Pitfall 1: Double-counting sauce items

**What goes wrong:** Sauce items are in the cart (added by sauce-bump logic) and have a `variationId` but no valid `productName` (not `"pulled_pork"` or `"brisket"`). If sauce ends up in the Zod-validated cart payload, it fails schema validation.

**Why it happens:** The Zod `cartSchema` union `z.literal("pulled_pork") | z.literal("brisket")` correctly rejects sauce. But `CheckoutClient` must not include sauce variation IDs in the `cart` array it sends — or must filter them out before sending — to avoid a 400. `[VERIFIED: CheckoutClient.tsx — sauce items are in `items` state from CartContext; the payload sends `items` as-is]`

**How to avoid:** In `CheckoutClient.handleSubmit`, filter the `items` array to only include items where `productNameMap.has(item.variationId)` before sending. Sauce items won't be in the map and will be silently excluded. Alternatively, extend the Zod schema to accept an optional `productName` field (making it optional for sauce items). Decision D-05/D-06 mandates the union — filter approach is simpler.

**Warning signs:** 400 response from checkout route when sauce is in the cart.

### Pitfall 2: RPC result shape

**What goes wrong:** Treating `data` from `supabase.rpc(...)` as the full response body. The RPC returns `jsonb { ok: boolean, reason?: string }`. The JS client unwraps one level — `data` is `{ ok: boolean, reason?: string }` directly, not `{ data: { ok: ... } }`.

**Why it happens:** Confusion between Supabase table query response shape vs RPC response shape.

**How to avoid:** Check `data?.ok` not `data?.data?.ok`. `[VERIFIED: migration SQL returns `jsonb_build_object('ok', true)` directly]`

### Pitfall 3: Singleton client and test isolation

**What goes wrong:** `tests/supabase.test.ts` uses `vi.resetModules()` + dynamic imports to reset the module singleton between tests. Removing `getSupabaseEnv` and its test block leaves the `getSupabaseClient` describe block intact — but if the `afterEach` or import pattern is disrupted, tests may share state.

**Why it happens:** The singleton `let _client` in `lib/supabase.ts` caches across imports unless modules are reset.

**How to avoid:** Keep the existing `vi.resetModules()` + dynamic import pattern in the `getSupabaseClient` describe block. Only delete the `getSupabaseEnv` describe block and the top-level `import { getSupabaseEnv }` statement. `[VERIFIED: tests/supabase.test.ts lines 7-60 are self-contained]`

### Pitfall 4: `CheckoutRequestBody` type in `lib/types.ts` becomes stale

**What goes wrong:** `lib/types.ts` exports `CheckoutRequestBody` with `cart: CartItem[]`. `CartItem` is `{ variationId: string; quantity: number }`. Adding `productName` to the Zod schema but not to `CartItem` / `CheckoutRequestBody` will cause a TypeScript compile error when the route tries to access `item.productName`.

**How to avoid:** Update `CartItem` in `lib/types.ts` to add `productName?: "pulled_pork" | "brisket"` (optional — sauce items won't have it in the component), OR create a separate `CheckoutCartItem` type used only in the checkout route. Given the filtering approach to exclude sauce, all items reaching the route have a `productName` — so the Zod-inferred type is the source of truth and `CartItem` in `lib/types.ts` can be left unchanged if the route uses the inferred Zod type rather than the `CartItem` interface.

---

## Code Examples

### Current cartSchema (verified)

```typescript
// [VERIFIED: app/api/checkout/route.ts lines 20-23]
const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive()
});
```

### Updated cartSchema (target)

```typescript
// [ASSUMED] — per D-06
const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive(),
  productName: z.union([z.literal("pulled_pork"), z.literal("brisket")])
});
```

### Current checkout route response location (verified)

```typescript
// [VERIFIED: app/api/checkout/route.ts lines 216-228]
await publishInvoice({ ... });

return NextResponse.json({
  orderId,
  invoiceId,
  pickupNote
});
```

Reserve calls go between `publishInvoice` and `return NextResponse.json(...)`.

### RPC Args shape (verified)

```typescript
// [VERIFIED: lib/database.types.ts lines 237-244]
reserve_pickup_slot: {
  Args: {
    p_drop_id: string
    p_pickup_option_id: string
    p_product_name: string
    p_quantity: number
  }
  Returns: Json
}
```

### place_preorder type fix (verified — current wrong types)

```typescript
// [VERIFIED: lib/database.types.ts lines 215-226 — CURRENT (wrong)]
place_preorder: {
  Args: {
    p_drop_id: number     // must be string (UUID)
    p_pickup_id: number   // must be string (UUID)
    p_email: string
    p_full_name: string
    p_items: Json
    p_opt_in?: boolean
    p_phone?: string
  }
  Returns: Json
}
```

---

## Runtime State Inventory

> Omitted — this is a code change phase, not a rename/refactor/migration phase. No stored data, service configuration, OS registrations, secrets, or build artifacts carry state that this phase alters.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cart sends `{ variationId, quantity }` only | Cart sends `{ variationId, quantity, productName }` | Phase 3 | Route can aggregate by product for RPC calls |
| `reserve_pickup_slot` never called from app code | Called after `publishInvoice` succeeds | Phase 3 | Capacity counters now decrement on order |

**Known artifacts needing cleanup this phase:**

- `getSupabaseEnv()` export in `lib/env.ts` — dead since Phase 1, when `lib/supabase.ts` was rewritten to read `process.env` directly `[VERIFIED: STATE.md decision log]`
- `place_preorder` type mismatch in `lib/database.types.ts` — introduced when types were initially generated before UUID types were confirmed `[VERIFIED: lib/database.types.ts lines 217-218]`
- Phase 2 `VERIFICATION.md` still shows `status: gaps_found` from pre-plans-02-04/05 state — needs update to reflect completion `[VERIFIED: .planning/phases/02-drop-config-storefront/02-VERIFICATION.md]`
- `02-03-SUMMARY.md` and `02-05-SUMMARY.md` missing `requirements-completed` frontmatter `[VERIFIED: both files read — neither has requirements-completed key]`
- Phase 1 `VALIDATION.md` has `nyquist_compliant: false` and `wave_0_complete: false` — all tasks are now complete but the document was never updated `[VERIFIED: 01-VALIDATION.md]`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase JS client materializes RPC `jsonb` return as plain JS object (no double-wrap) | Architecture Patterns | Code checks `data?.ok` but actual shape is `data?.data?.ok` — would silently log wrong error shape |
| A2 | `FrozenItemDTO.name` values are exactly `"Pulled Pork"` and `"Brisket"` enabling slug derivation via toLowerCase/replace | Architecture Patterns | productName mapping fails for any item whose display name doesn't transform cleanly — results in sauce-like filtering behavior |
| A3 | Sauce items in the cart can be excluded via `productNameMap.has(variationId)` filter without breaking the order | Common Pitfalls | If sauce must appear in the Square order line items, filtering it from the Supabase RPC calls is correct; filtering it entirely from `cart` payload would cause Square to miss sauce line items — but current code uses `cart` only for Square line items, not the Supabase RPC |

A3 needs attention: confirm that `cart` in the checkout payload is used only for Square `createOrder` line items and not for anything that requires sauce to have a `productName`. Looking at the checkout route: `cart.map((item) => ({ quantity: item.quantity.toString(), catalog_object_id: item.variationId }))` — the RPC call is separate from the Square order creation. So sauce can remain in the full `cart` for Square, but the Zod schema for `cartSchema.productName` being a required union means sauce items would fail validation unless the field is optional or sauce is sent separately. This is a genuine design decision that resolves to: make `productName` optional in `cartSchema`, or send two parallel arrays, or filter sauce before adding `productName`. **The simplest fix: send all items to Square using the existing `cart` array (unchanged), and send only a filtered subset for the RPC aggregation, where the filter is applied in the route after validation.** This means `productName` in the Zod schema can be optional, and items without it are excluded from the RPC call.

---

## Open Questions

1. **Sauce items and the Zod schema**
   - What we know: D-06 adds `productName: z.union([z.literal("pulled_pork"), z.literal("brisket")])` to `cartSchema`. Sauce items are in `CartContext.items` alongside meat items.
   - What's unclear: Whether `productName` should be required (forcing CheckoutClient to filter sauce before sending) or optional (letting the route filter items without productName for RPC calls).
   - Recommendation: Make `productName` optional in the Zod schema. This avoids breaking the 400-rejection contract for sauce items and keeps CheckoutClient simpler — it just adds `productName` for meat items it can identify and omits it for sauce. The route aggregates only items where `productName` is defined.

2. **`lib/types.ts` CartItem interface**
   - What we know: `CartItem` is used in `CartContext` and throughout the client, but the route uses Zod-inferred types at the API boundary.
   - What's unclear: Whether `CartItem` in `lib/types.ts` needs updating to match the new payload shape.
   - Recommendation: Leave `CartItem` in `lib/types.ts` unchanged. The checkout route operates on the Zod-inferred type. `CheckoutClient` can cast or use a local inline type for the enriched cart items it sends. This avoids rippling type changes into CartContext and cart utility functions.

---

## Environment Availability

> Step 2.6: SKIPPED — Phase 3 is purely code and planning artifact changes. No new external dependencies are introduced. Supabase is already connected (Phase 1). Square is already connected (existing codebase). No new CLI tools, runtimes, or services are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03 | `reserve_pickup_slot` RPC is called after publishInvoice with correct args | unit (mock Supabase) | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 |
| DATA-03 | Quantities are aggregated by productName before RPC call | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 |
| ORD-05 | RPC failure is non-blocking — checkout still returns success | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 |
| ORD-05 | Zod rejects cart items with invalid productName | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 |

Existing tests covering adjacent behavior:
- `tests/checkoutDropGate.test.ts` — 9 tests for `checkDropReady()` (unaffected)
- `tests/supabase.test.ts` — `getSupabaseEnv` describe block must be REMOVED when the export is deleted; `getSupabaseClient` describe block (4 tests) remains intact

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/checkoutReservation.test.ts` — covers DATA-03 and ORD-05; mock pattern follows `tests/checkoutDropGate.test.ts` using `vi.mock("server-only", () => ({}))` and module-level mocking of `lib/supabase`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod union on `productName` — literal values only, no free-form strings reach the RPC |
| V4 Access Control | no | RPC uses service role key (bypasses RLS); no end-user auth in scope |
| V2 Authentication | no | No new auth flows |
| V3 Session Management | no | No sessions |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Injecting arbitrary `productName` to exhaust capacity of non-existent product | Tampering | Zod union literal — only `"pulled_pork"` and `"brisket"` accepted |
| Sending negative quantities to release capacity via reservation | Tampering | `z.number().int().positive()` in cartSchema rejects zero and negative values — `[VERIFIED: route.ts line 22]` |

---

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: supabase/migrations/0001_foundation.sql]` — Full RPC definitions for `reserve_pickup_slot` and `release_pickup_slot`; exact `p_product_name` string values; return shape `jsonb_build_object('ok', ...)`
- `[VERIFIED: lib/database.types.ts]` — Current typed Args for all RPC functions; confirmed type mismatch in `place_preorder`
- `[VERIFIED: app/api/checkout/route.ts]` — Current checkout flow; exact insertion point after `publishInvoice`; current cartSchema
- `[VERIFIED: lib/env.ts]` — `getSupabaseEnv()` export confirmed present; interface `SupabaseEnv` confirmed
- `[VERIFIED: tests/supabase.test.ts]` — Confirmed `getSupabaseEnv` import and test block that must be removed
- `[VERIFIED: .planning/phases/02-drop-config-storefront/02-VERIFICATION.md]` — Current verification status; confirmed `status: gaps_found` needing update
- `[VERIFIED: .planning/phases/02-drop-config-storefront/02-03-SUMMARY.md]` — Confirmed no `requirements-completed` frontmatter key
- `[VERIFIED: .planning/phases/02-drop-config-storefront/02-05-SUMMARY.md]` — Confirmed no `requirements-completed` frontmatter key
- `[VERIFIED: .planning/phases/01-foundation/01-VALIDATION.md]` — Confirmed `nyquist_compliant: false`; tasks listed with `⬜ pending` status

### Secondary (MEDIUM confidence)
- `[ASSUMED]` — Supabase JS client RPC return shape (data is unwrapped jsonb directly); based on Supabase JS library behavior from training knowledge

---

## Metadata

**Confidence breakdown:**
- Core RPC wiring pattern: HIGH — SQL function signature and return shape verified directly in migration file
- Type fix: HIGH — wrong types confirmed in database.types.ts; correct types confirmed from reserve_pickup_slot in same file
- Dead code removal: HIGH — zero application callers confirmed; test import confirmed
- Artifact updates: HIGH — all files read and current state confirmed
- RPC return materialization: MEDIUM — based on training knowledge of Supabase JS client behavior

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain — no fast-moving dependencies)
