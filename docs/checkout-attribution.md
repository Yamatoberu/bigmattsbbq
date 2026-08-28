# Checkout Attribution ("How did you hear about us?")

This document records the design contract behind the customer-facing "How did
you hear about us?" question added to checkout in Phase 12. Read this before
extending it (UTM capture, Meta campaign IDs, email-campaign attribution,
first-touch reporting) or before reporting a bug that "attribution isn't
showing up anywhere."

## 1. What is stored and where

The customer's selected source's stable `code` (never the display `label`,
never the numeric `id`) is written to the Square Order's `metadata` map under
key `attribution_source`. The optional free-text detail the customer typed
(for sources like "AI", "Event", "Other") is written under
`attribution_detail`.

Both keys ride **inline in the same `POST /v2/orders` request** that
`app/api/checkout/route.ts` already sends to create the order — there is no
second Square API call and no webhook involved. See `buildAttributionMetadata()`
in `lib/square.ts` for the exact builder, and its call site inside the
`order` object literal passed to `createOrder()`.

The choice list itself (the dropdown options) lives in Supabase
`public.attribution_sources`, read via `lib/attributionSources.ts` and served
by `GET /api/attribution-sources`. Supabase stores no order data for this
feature — Square remains the sole system of record for orders, invoices, and
their metadata.

## 2. Key naming convention and how to extend it

The `attribution_*` prefix is the reserved namespace for this concern.
Square's Order `metadata` field has hard limits:

- Max **10** entries per order
- Key max **60** characters, charset restricted to `[a-zA-Z0-9_-]`
- Value max **255** characters

This phase uses 2 of the 10 available slots (`attribution_source`,
`attribution_detail`), leaving 8 for future keys. When the deferred
UTM/campaign/first-touch work lands, follow this naming shape:

- `attribution_utm_source`
- `attribution_utm_medium`
- `attribution_utm_campaign`
- `attribution_campaign_id`
- `attribution_first_touch`

Values must stay structured and separate — **never concatenate** source and
detail into one string (e.g. `"ai:ChatGPT"`). Each fact gets its own key so
future reporting queries don't need to parse a compound value.

## 3. Why Order `metadata` and not Order Custom Attributes

Square offers two mechanisms that could plausibly hold this data: Order
`metadata` (what this phase uses) and the separate Order Custom Attributes
API. Custom Attributes was rejected because:

- Every operation in that API (`CreateOrderCustomAttributeDefinition`,
  `UpsertOrderCustomAttribute`, `BulkUpsertOrderCustomAttributes`,
  `RetrieveOrderCustomAttribute`) is tagged `x-release-status: BETA` in
  Square's OpenAPI spec.
- It requires a one-time `CreateOrderCustomAttributeDefinition` setup call
  before any value can ever be written.
- Values are keyed by `order_id`, so they **cannot** be set inline at
  `CreateOrder` time — they mandate a follow-up call after the order already
  exists, introducing a new "can this fail after the order is real?" failure
  mode.

The counterweight: `Order.metadata` is itself tagged `x-release-status: BETA`
at the field level (though the `Order` object and the `CreateOrder` operation
are `PUBLIC`). This is a risk knowingly accepted for this phase, because the
field has been present and documented in Square's public docs for years.

**Re-verification trigger:** re-check `x-release-status` on `Order.metadata`
before any Square API version bump past the pinned `2026-04-21` in
`lib/square.ts`.

## 4. Visibility — read this before reporting a bug

Application-written Square metadata is **private to the writing
application**. It does NOT appear in the Square Seller Dashboard order view,
no matter how thoroughly you look. If you go looking for "Heard about us: AI
(ChatGPT)" in the Dashboard, you will not find it — this is expected, not a
bug.

The two ways to see an attribution answer today:

1. The `Heard about us: <label> (<detail>)` line in the fire-and-forget Slack
   new-order notification (`notifySlackNewOrder` in
   `app/api/checkout/route.ts`).
2. `npm run check:attribution -- <orderId>`, which calls `RetrieveOrder`
   directly (`scripts/check-order-attribution.mjs`).

A future in-app reporting screen must read attribution back via
`RetrieveOrder` / `SearchOrders` using this application's own Square access
token — Square's Dashboard will never show it natively.

## 5. Reliability contract

Attribution is best-effort and must never fail a checkout (D-10). Two
independent layers enforce this:

- **Zod bounds at `POST /api/checkout`** (`app/api/checkout/route.ts`):
  `attributionSourceCode` max 60 chars, charset `[a-zA-Z0-9_-]`;
  `attributionDetail` max 255 chars. Out-of-bounds input is rejected with a
  400 **before any Square call is made.**
- **`buildAttributionMetadata()` in `lib/square.ts`** independently trims and
  byte-truncates the value (UTF-8 byte length via `Buffer.byteLength`, not JS
  string `.length`, so emoji/CJK detail text can never overflow Square's
  byte-oriented limit) and cannot throw.

A Supabase failure loading the source list hides the question entirely
(the dropdown never renders) rather than blocking the checkout page (D-09).
The submitted code is deliberately **not** cross-checked against live active
Supabase rows at submit time — the source list can change without a deploy,
and a mismatch is a data-quality issue, not a correctness one.

### Residual risk: D-10 holds by validation, not by call isolation

D-10 is phrased as "a failure to persist attribution (after order/payment
otherwise succeeded) must not fail the checkout response." That phrasing
presumes a *separable* persistence step that can fail on its own — the shape
of the Slack notification, which is a genuinely separate,
`fire-and-forget notifySlackNewOrder` call that is `.catch()`-swallowed after
the order already exists.

Attribution is **not** that shape. `attribution_source` / `attribution_detail`
ride inline in the `metadata` map of the very same `POST /v2/orders` request
that creates the order. There is no second call to isolate: if that request
400s because of a bad metadata value, no order is created at all. The failure
mode D-10 literally describes (a persistence step failing after the order
already exists) cannot occur for attribution, and the failure mode that
*can* occur — a bad value poisoning order creation itself — would be worse
than the one D-10 describes.

Therefore the guarantee is delivered by making the value **un-rejectable
before the request is sent**, not by isolating a call afterwards. The two
layers named in Section 5 are deliberately redundant:

1. Zod bounds at `POST /api/checkout` reject out-of-range input with a 400
   before Square is contacted at all.
2. `buildAttributionMetadata()` in `lib/square.ts` independently trims,
   byte-truncates to Square's UTF-8 limits, type-guards non-string input, and
   contains no `throw` — so even if the Zod bounds and Square's real limits
   ever drift apart, the value placed in the order body is in-spec.

Removing either layer silently re-opens the risk.

This is a **design** mitigation, not a **runtime** one. Nothing at runtime
catches an attribution-caused `CreateOrder` rejection and retries without
metadata. The residual risk is accepted because both layers are unit-tested
(`tests/attributionMetadata.test.ts`, including multi-byte boundary cases)
and because Square's documented limits for this field are stable.

**Re-verification trigger:** if Square's metadata limits change, if
`buildAttributionMetadata()` ever gains a code path that can throw, or if the
Zod bounds are loosened, this tradeoff must be re-evaluated — and a runtime
retry-without-metadata fallback should be considered at that point.

## 6. Out of scope

The following are explicitly deferred and not built by this phase:

- Automatic UTM capture
- Meta campaign ID capture
- Email campaign attribution
- First-touch acquisition reporting
- Any use of Supabase `public.orders` for attribution

## 7. File map

| Concern | File |
|---------|------|
| Source list (dropdown options) | `lib/attributionSources.ts` |
| API route serving the source list | `app/api/attribution-sources/route.ts` |
| Client hook | `components/hooks/useAttributionSources.ts` |
| UI (dropdown + conditional detail input) | `components/CheckoutClient.tsx` |
| Validation + Square persistence + Slack | `app/api/checkout/route.ts` |
| Metadata builder | `lib/square.ts` (`buildAttributionMetadata`) |
| Readback / manual verification | `scripts/check-order-attribution.mjs` |
