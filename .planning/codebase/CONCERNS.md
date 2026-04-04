# Codebase Concerns

**Analysis Date:** 2026-04-03

---

## Tech Debt

**Hardcoded pickup dates in config:**
- Issue: `PICKUP_OPTIONS` in `lib/config.ts` contains two hardcoded past pickup dates: `"2026-03-14"` and `"2026-03-28"`. Both dates are already in the past relative to today (2026-04-03). Any customer visiting the site right now will see expired pickup slots and submit orders with stale `pickupAtISO` values to Square.
- Files: `lib/config.ts` (lines 37–48), `components/CheckoutClient.tsx` (line 104)
- Impact: Orders submitted today carry past pickup timestamps. Square may accept or reject these silently. The storefront advertises "Orders close March 10, 2026" in the hero copy.
- Fix approach: Extract pickup options to environment variables or an admin-editable data source. Alternatively add a date-gate check that hides the checkout flow when all pickup options are expired.

**Hero copy contains expired deadline:**
- Issue: `components/OrderLanding.tsx` line 77 contains the literal string `"Limited supply. Orders close March 10, 2026."` — this date is hard-coded and already 24 days in the past.
- Files: `components/OrderLanding.tsx`
- Impact: Misleading storefront state. Users arriving today see an order-close date that has passed, but the checkout flow is still active.
- Fix approach: Move the cutoff date to `lib/config.ts` alongside `PICKUP_OPTIONS` and derive the display string from the same value. Gate the checkout link on `cutoffDate > now`.

**Package configs reference items by fuzzy name match:**
- Issue: `lib/config.ts` packages use `itemName: "Brisket"` and `variationName: "1 lb"` which are resolved at runtime via `includes()` substring matching in `lib/cart.ts:resolvePackageToCartItems`. If Square catalog item names change even slightly (e.g. "Smoked Brisket" → "Beef Brisket"), packages silently resolve to zero items and disable themselves.
- Files: `lib/config.ts`, `lib/cart.ts` (lines 31–44)
- Impact: Package cards become disabled without any error surfaced to admins. The mismatch is invisible.
- Fix approach: Store `variationId` directly on `PackageItemConfig` entries (the field already exists but is unused). Populate it from Square catalog IDs at setup time to eliminate fuzzy matching.

**`sauceVariationId` naming confusion:**
- Issue: In `components/CheckoutClient.tsx` (lines 47–65), the prop `sauceVariationId` is compared against `item.itemId` (line 53: `item.itemId === sauceVariationId`). An item ID and a variation ID are different Square concepts. This is a logic bug — the comparison will never be true since `sauceVariationId` from env is always a variation ID, never an item ID.
- Files: `components/CheckoutClient.tsx` (lines 52–55)
- Impact: The `sauceVariationIds` set is only populated via the name-based `"sauce"` substring fallback and the direct variation ID match path. The item-ID branch is dead code. This means sauce detection depends entirely on catalog item names containing the word "sauce."
- Fix approach: Remove the dead `item.itemId === sauceVariationId` branch. Document that sauce detection relies solely on catalog name substring matching and the explicit variation ID.

**`CartSummary` component is unused:**
- Issue: `components/CartSummary.tsx` is defined and exported but never imported anywhere in the codebase.
- Files: `components/CartSummary.tsx`
- Impact: Dead code. Adds maintenance surface without benefit.
- Fix approach: Delete the file or wire it into `OrderLanding.tsx` to replace the inline estimated total display.

---

## Security Considerations

**No rate limiting on checkout API:**
- Risk: `POST /api/checkout` calls Square's Customer, Order, and Invoice APIs in sequence. There is no request rate limiting, no CAPTCHA, and no per-IP throttling. A bot could spam this endpoint and create unbounded Square API objects and email invoices.
- Files: `app/api/checkout/route.ts`
- Current mitigation: None.
- Recommendations: Add Vercel Edge rate limiting, a Cloudflare WAF rule, or an in-process token bucket. At minimum, add a honeypot field or Turnstile challenge on the checkout form.

**Dev inventory endpoint relies only on `SQUARE_ENV` value:**
- Risk: `POST /api/dev/set-inventory` checks `env.environment !== "sandbox"` before proceeding (line 28). If `SQUARE_ENV` is accidentally set to `"sandbox"` in production, this endpoint becomes live and lets any caller overwrite Square inventory counts.
- Files: `app/api/dev/set-inventory/route.ts` (line 28)
- Current mitigation: Environment variable check only.
- Recommendations: Add a `NODE_ENV === "production"` guard in addition to the Square env check, or remove the route entirely for production deployments (e.g. via a build-time exclude or Vercel environment-based routing).

**No authentication on any API route:**
- Risk: All three API routes (`/api/checkout`, `/api/frozen-items`, `/api/dev/set-inventory`) are fully public with no authentication. The frozen-items endpoint leaks full catalog structure and live inventory counts to anyone.
- Files: `app/api/frozen-items/route.ts`, `app/api/checkout/route.ts`, `app/api/dev/set-inventory/route.ts`
- Current mitigation: `frozen-items` and `checkout` are intended to be public; the dev endpoint is sandbox-gated.
- Recommendations: For `dev/set-inventory`, add a shared secret header check (`x-dev-secret`) in addition to the env guard.

**`searchParams` read synchronously in server component:**
- Risk: `app/confirmation/page.tsx` reads `searchParams.orderId` and `searchParams.pickupNote` directly as a synchronous prop. In Next.js 15+, `searchParams` is a Promise and must be awaited. This is a known breaking change for App Router pages — access patterns that worked in Next.js 14 produce stale or undefined values.
- Files: `app/confirmation/page.tsx` (lines 4, 8–9)
- Current mitigation: Currently appears to work in Next.js 16.1.6 but may behave incorrectly under concurrent rendering.
- Recommendations: Await `searchParams` using `async function ConfirmationPage({ searchParams }: ...) { const params = await searchParams; }` per Next.js 15 conventions.

**Order IDs and pickup notes exposed in URL query params:**
- Risk: After checkout, the user is redirected to `/confirmation?orderId=...&pickupNote=...`. Square order IDs are in the URL, visible in browser history, server logs, and referrer headers.
- Files: `app/api/checkout/route.ts` (line 175–178), `components/CheckoutClient.tsx` (lines 129–133)
- Current mitigation: Order IDs are Square-generated opaque strings with no direct financial exposure.
- Recommendations: Consider storing confirmation data in sessionStorage and redirecting to a clean `/confirmation` URL, or use a Next.js route handler to pass data server-side.

---

## Performance Bottlenecks

**`/api/frozen-items` makes two sequential Square API calls:**
- Problem: `GET /api/frozen-items` calls `searchCatalogItems` then `batchRetrieveInventoryCounts` in series. There is no caching — every page load from every visitor hits Square twice.
- Files: `app/api/frozen-items/route.ts` (lines 23–41)
- Cause: No `next: { revalidate }` on the route, and `useFrozenItems` fetches with `cache: "no-store"`.
- Improvement path: Add short-lived ISR caching (`export const revalidate = 30` on the route) to serve catalog data from Next.js cache. Inventory counts change infrequently enough to tolerate 30–60 second staleness. Alternatively use SWR with a stale-while-revalidate strategy in the hook.

**`useFrozenItems` called in two separate components:**
- Problem: Both `OrderLanding` and `CheckoutClient` independently call `useFrozenItems()`, resulting in two separate `/api/frozen-items` fetches when a user navigates from the landing page to checkout.
- Files: `components/OrderLanding.tsx` (line 20), `components/CheckoutClient.tsx` (line 22)
- Cause: No shared data layer or React Query/SWR deduplication.
- Improvement path: Lift `useFrozenItems` data into a context provider or use SWR (which deduplicates concurrent requests automatically).

---

## Fragile Areas

**Package resolution silently degrades on catalog mismatch:**
- Files: `lib/cart.ts` (lines 21–52), `lib/config.ts`
- Why fragile: If any catalog item name or variation name in Square changes, `resolvePackageToCartItems` returns a partial array. The availability check in `OrderLanding.tsx` (lines 94–96) disables the package card but shows no error message to users or operators — the package just silently disappears.
- Safe modification: When changing catalog item names in Square, always update `lib/config.ts` `itemName`/`variationName` values in the same deploy. Better: migrate to direct `variationId` references.
- Test coverage: `tests/packageMapping.test.ts` covers the happy path only — no tests for partial match or name mismatch scenarios.

**`CheckoutClient` re-fetches frozen items independently:**
- Files: `components/CheckoutClient.tsx`
- Why fragile: The checkout page uses `useFrozenItems()` solely to build a `variationMap` for display names and prices. If the fetch fails on the checkout page (network error, Square outage), the cart items show as "Item" with $0.00 prices. The checkout form remains submittable with unknown items.
- Safe modification: Accept pre-resolved cart details as props from the landing page via state or URL, or make the checkout UI read-only on load failure.
- Test coverage: No tests for the checkout component.

**`publishInvoice` failure leaves orphaned order:**
- Files: `app/api/checkout/route.ts` (lines 166–173)
- Why fragile: The checkout flow creates a Square order, then creates an invoice, then publishes the invoice as three separate API calls with no rollback. If `publishInvoice` throws, the caller receives a 500 error but a real Square order and draft invoice already exist. Retrying checkout will create a duplicate order.
- Safe modification: The idempotency keys are regenerated on each call (`newIdempotencyKey()`), so retries are not idempotent — each retry attempt creates new Square objects.
- Test coverage: No tests for the checkout API route.

**Inventory count from Square is a string that requires parsing:**
- Files: `lib/normalizers.ts` (line 14), `lib/square.ts` (line 104)
- Why fragile: Square returns inventory `quantity` as `string | null`. `joinInventoryCounts` parses it with `parseInt`. If Square ever returns a decimal (e.g. `"1.5"`) or unexpected format, `parseInt` truncates silently rather than erroring.
- Safe modification: Use `Number()` + `Number.isFinite()` for stricter validation. Add a test case for non-integer quantity strings.

---

## Missing Critical Features

**No inventory decrement on order placement:**
- Problem: When a customer places an order, `POST /api/checkout` creates a Square order and invoice but does not decrement inventory. Inventory counts are only updated via the Square dashboard or the dev `set-inventory` endpoint. Multiple customers can therefore order the same "last unit" simultaneously.
- Blocks: Reliable sold-out enforcement at the point of sale.

**No order confirmation email fallback:**
- Problem: The checkout flow relies entirely on Square's invoice email delivery. If Square's email fails or the invoice is not published (see orphaned order concern above), the customer receives no confirmation.
- Blocks: Customer trust and support escalation path.

**No admin visibility into orders:**
- Problem: `app/orders/page.tsx` is a "Coming Soon" stub. There is no operator-facing view of placed orders, customer info, or pickup schedules outside of the Square dashboard.
- Blocks: Operational management of frozen drop fulfillment.

---

## Test Coverage Gaps

**Checkout API route is entirely untested:**
- What's not tested: Customer creation/lookup, order creation, invoice creation, publishInvoice, error paths, duplicate email handling, partial Square failures.
- Files: `app/api/checkout/route.ts`
- Risk: The most business-critical code path has zero automated test coverage.
- Priority: High

**`CheckoutClient` component is untested:**
- What's not tested: Form validation, sauce bump display, cart quantity changes, submit error display, redirect on success.
- Files: `components/CheckoutClient.tsx`
- Risk: UI regressions in the checkout form go undetected.
- Priority: High

**`frozen-items` API route is untested:**
- What's not tested: Square catalog mapping, inventory join, empty catalog response, Square error propagation.
- Files: `app/api/frozen-items/route.ts`
- Risk: Changes to Square response shape or the mapping logic break silently.
- Priority: Medium

**Package resolution failure modes are untested:**
- What's not tested: Partial name match, no match found, empty variations array, mismatched variation name.
- Files: `lib/cart.ts`, `tests/packageMapping.test.ts`
- Risk: Catalog naming changes silently disable packages with no test failure to signal the breakage.
- Priority: Medium

---

## Dependencies at Risk

**`next` version `^16.1.6` is non-standard / pre-release:**
- Risk: Next.js public releases follow a 14.x / 15.x versioning scheme. Version 16.x does not appear in the official Next.js release channel as of this analysis. This may be a canary, RC, or internal build. Canary builds can have undocumented breaking changes and are not covered by LTS support.
- Impact: Unexpected runtime behavior; `searchParams` async handling and other App Router APIs may differ from documented Next.js 15 behavior.
- Migration plan: Pin to a stable Next.js release (15.x) and audit for breaking changes, particularly around `searchParams` and `headers()` async handling.

**No Square SDK — raw fetch with manually pinned API version:**
- Risk: `lib/square.ts` uses raw `fetch` against the Square REST API with `SQUARE_VERSION = "2024-12-18"` pinned. Square deprecates old API versions on a rolling 18-month schedule. There is no automated signal when the pinned version nears end-of-life.
- Impact: API calls may begin failing after the version is sunset without any dependency update triggering a warning.
- Migration plan: Consider adopting the official `squareup` Node.js SDK which handles versioning automatically, or add a comment with the Square API version deprecation date and a calendar reminder.

---

*Concerns audit: 2026-04-03*
