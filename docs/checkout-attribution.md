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

Attribution is best-effort and must never fail a checkout (D-10) — including
the checkout request itself, not just a hypothetical later persistence step.
`attributionSourceCode`/`attributionDetail` are deliberately **not** part of
`checkoutSchema`'s strict validation (that schema still gates `dropId`,
`customer.email`, `cart`, etc. as normal — only attribution is exempted).
Instead:

1. **`checkoutSchema`** accepts `attributionSourceCode`/`attributionDetail` as
   unconstrained optional strings, so a malformed value can never fail
   `safeParse` and therefore can never 400 the whole checkout.
2. **`sanitizeAttribution()`** in `app/api/checkout/route.ts` applies the real
   bounds (`attributionSourceCode` max 60 chars, charset `[a-zA-Z0-9_-]`;
   `attributionDetail` max 255 chars) *after* the checkout payload has already
   passed validation. A value that fails these bounds is silently dropped —
   the order still creates with no `metadata` (or with just the code, if only
   `detail` was invalid) — and the drop is logged via `logError` for
   visibility, never returned to the customer as an error.
3. **`buildAttributionMetadata()` in `lib/square.ts`** is a second, independent
   layer: it re-trims and byte-truncates the already-sanitized value (UTF-8
   byte length via `Buffer.byteLength`, not JS string `.length`, so emoji/CJK
   detail text can never overflow Square's byte-oriented limit) and cannot
   throw.

This matters because the Supabase-managed source list (`attribution_sources`)
is explicitly designed to change without a deploy — an operator can add a row
via Supabase Studio with a code containing a space, apostrophe, emoji, or
more than 60 characters. Before this fix, that row would have silently broken
checkout for every customer who selected it, because the bounds were enforced
inside the same Zod object that gates the whole request. `sanitizeAttribution()`
exists precisely so that scenario degrades to "no attribution" instead.

A Supabase failure loading the source list hides the question entirely
(the dropdown never renders) rather than blocking the checkout page (D-09).
The submitted code is deliberately **not** cross-checked against live active
Supabase rows at submit time — the source list can change without a deploy,
and a mismatch is a data-quality issue, not a correctness one; `sanitizeAttribution()`
only enforces shape (length/charset), never membership in the active list.

### Why the metadata write itself can't be "isolated" like the Slack call

D-10 is phrased as "a failure to persist attribution (after order/payment
otherwise succeeded) must not fail the checkout response" — language that
presumes a *separable* persistence step, the shape of the Slack notification
(a genuinely separate, `fire-and-forget notifySlackNewOrder` call that is
`.catch()`-swallowed after the order already exists).

The Square metadata write is **not** that shape: `attribution_source`/
`attribution_detail` ride inline in the `metadata` map of the very same
`POST /v2/orders` request that creates the order. There is no second call to
isolate. That's exactly why validation has to happen *before* the request is
built (Section 5, steps 1–3) rather than by wrapping the Square call in a
try/catch that swallows failures — by the time that call would run, a bad
value would already have prevented the order (and payment) from being
created at all. Making the value un-rejectable before the request is sent is
the only way to guarantee D-10 for a field that rides inline.

**Re-verification trigger:** if Square's metadata limits change, or if
`buildAttributionMetadata()` ever gains a code path that can throw, re-check
that `sanitizeAttribution()`'s bounds still match Square's real limits.

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
