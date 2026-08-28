---
phase: quick-260828-fhk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - .gitignore
  - playwright.config.ts
  - e2e/fixtures/frozenItems.ts
  - e2e/fixtures/activeDrop.ts
  - e2e/support/stubs.ts
  - e2e/browseFrozenItems.spec.ts
  - e2e/checkoutFlow.spec.ts
autonomous: true
requirements: [E2E-01, E2E-02, E2E-03, E2E-04, E2E-05]

must_haves:
  truths:
    - "`npm run test:e2e` boots the dev server and runs Playwright specs without manual setup"
    - "A spec proves the landing page renders frozen items with prices and working Add to Cart buttons"
    - "A spec proves a sold-out item renders the notify-me capture instead of Add to Cart"
    - "A spec proves the sauce-bump prompt appears on /checkout when the cart holds meat and no sauce"
    - "A spec proves submitting the checkout form posts a Zod-shaped body and lands on /confirmation showing the orderId"
    - "Running `npm test` (Vitest) is unaffected — it never picks up e2e specs"
    - "No spec creates a real Square invoice or mutates Supabase drop capacity"
  artifacts:
    - path: "playwright.config.ts"
      provides: "webServer + baseURL + chromium project config"
      contains: "webServer"
    - path: "e2e/support/stubs.ts"
      provides: "Network stubbing helpers for /api/drop, /api/frozen-items, /api/checkout"
      exports: ["stubFrozenItems", "stubActiveDrop", "stubCheckout", "seedCart"]
    - path: "e2e/fixtures/frozenItems.ts"
      provides: "Deterministic FrozenItemDTO[] fixture"
      exports: ["frozenItemsFixture", "variationIds"]
    - path: "e2e/fixtures/activeDrop.ts"
      provides: "Deterministic DropDTO fixture + sold-out variant builder"
      exports: ["activeDropFixture", "withSoldOut"]
    - path: "e2e/browseFrozenItems.spec.ts"
      provides: "Browse + stock-limit edge case coverage"
    - path: "e2e/checkoutFlow.spec.ts"
      provides: "Sauce bump + checkout submit + confirmation coverage"
  key_links:
    - from: "playwright.config.ts"
      to: "npm run dev"
      via: "webServer command"
      pattern: "webServer[\\s\\S]*npm run dev"
    - from: "e2e/support/stubs.ts"
      to: "/api/drop"
      via: "page.route fulfillment"
      pattern: "page\\.route.*api/drop"
    - from: "e2e/support/stubs.ts"
      to: "localStorage big-matts-bbq-cart"
      via: "addInitScript cart seeding"
      pattern: "big-matts-bbq-cart"
    - from: "package.json"
      to: "playwright test"
      via: "test:e2e script"
      pattern: "\"test:e2e\""
---

<objective>
Scaffold Playwright as an additive E2E layer alongside the existing Vitest unit suite, and cover the storefront critical path: browse frozen items → add to cart → checkout → confirmation, plus the sauce-bump prompt and the sold-out/stock-limit edge case.

Purpose: The storefront critical path currently has zero browser-level coverage. Vitest covers pure functions (`isSauceBumpNeeded`, `resolvePackageToCartItems`, `joinInventoryCounts`, checkout reservation/line-item logic) but nothing proves the React → API → redirect wiring actually works in a browser.

Output: `playwright.config.ts`, an `e2e/` suite with fixtures and stub helpers, and `test:e2e` / `test:e2e:ui` npm scripts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@lib/types.ts
@lib/cart.ts
@components/OrderLanding.tsx
@components/CheckoutClient.tsx
@components/FrozenItemCard.tsx
@components/SoldOutCapture.tsx
@components/cart/CartContext.tsx
@app/checkout/page.tsx
@app/confirmation/page.tsx
@vitest.config.ts

<constraint_corrections>
Two premises in the task description are contradicted by the current code. The executor MUST follow the corrected behavior below, not the original premise.

1. **"seeing live stock counts on the landing page"** — the landing page does NOT render stock counts. `VariationDTO.remaining` exists in `lib/types.ts` but no component displays it. `FrozenItemCard` renders name, description, price, and either an Add to Cart button or `<SoldOutCapture />`. Cover **availability** (price + Add to Cart present), not numeric stock counts. Do not add stock-count UI — that is a product change, out of scope here.

2. **"use POST /api/dev/set-inventory to force a sold-out state"** — this no longer drives storefront UI. Quick task `260506-tr9` ("Remove Square inventory from stock display") moved all in-stock checks onto `drop.soldOut` from the Supabase `drops` table. `OrderLanding` computes sold-out from `drop.capacityEnforced && drop.soldOut.brisket` etc.; `/api/dev/set-inventory` only writes Square inventory counts, which nothing in the UI reads. Force the sold-out state by stubbing the `GET /api/drop` response instead. Leave `/api/dev/set-inventory` untouched.
</constraint_corrections>

<interfaces>
<!-- Contracts the executor needs. Do not go exploring — these are authoritative. -->

From lib/types.ts:
```typescript
export interface VariationDTO {
  variationId: string; name: string; priceCents: number; currency: string; remaining: number;
}
export interface FrozenItemDTO {
  itemId: string; name: string; description: string; variations: VariationDTO[];
}
export interface PickupOptionDTO {
  id: string; locationLabel: string; pickupDateLabel: string; pickupAtISO: string; isSoldOut: boolean;
}
export interface CapacitySlot { total: number; reserved: number; }
export interface DropDTO {
  id: string;
  title: string;
  status: "upcoming" | "active" | "closed";
  orderCutoffAt: string | null;
  capacity: { pulledPork: CapacitySlot; brisket: CapacitySlot; sauce: CapacitySlot;
              familyNight: CapacitySlot; backyardHost: CapacitySlot; freezerFiller: CapacitySlot; };
  soldOut: { pulledPork: boolean; brisket: boolean; sauce: boolean;
             familyNight: boolean; backyardHost: boolean; freezerFiller: boolean; };
  pickupOptions: PickupOptionDTO[];
  capacityEnforced: boolean;
}
export interface CheckoutResponseBody { orderId: string; invoiceId: string; pickupNote: string; }
```

Client-side data flow facts that determine what is stubbable:
- `app/page.tsx` server-renders `fetchActiveDrop()` into `<OrderLanding initialDrop>`, then `useActiveDrop` immediately re-fetches `GET /api/drop` and **overwrites** state. Stubbing `/api/drop` therefore fully controls the landing page after hydration.
- `useFrozenItems` fetches `GET /api/frozen-items` on mount. Stubbing it fully controls catalog rendering on both `/` and `/checkout`.
- `app/checkout/page.tsx` calls `fetchActiveDrop()` **server-side** and `redirect("/")` when there is no active drop. `page.route()` CANNOT intercept this — it is a direct Supabase call, not HTTP. Checkout specs therefore require a real active drop to exist in Supabase and must skip cleanly when one does not.
- `CartProvider` hydrates from `localStorage["big-matts-bbq-cart"]` holding `CartItem[]` (`{ variationId, quantity }[]`).
- `CheckoutClient` submit button is disabled while `useFrozenItems` `isLoading` is true, so `/api/frozen-items` must be stubbed on `/checkout` too.

Landing page filtering (`OrderLanding`): `individualItems` excludes any catalog item whose lowercased name contains a lowercased `PACKAGES[].name` — i.e. "family night", "backyard host", "freezer filler". Fixture items named `Family Night Bundle` / `Backyard Host Bundle` / `Freezer Filler Bundle` are excluded from the individual-items grid and used for package pricing only.

Sold-out mapping (`OrderLanding`): an individual item is sold out when `drop.capacityEnforced` AND its lowercased name contains `pulled pork` / `brisket` / `sauce` AND the matching `drop.soldOut` flag is true.

Sauce bump (`lib/cart.ts` `isSauceBumpNeeded`): true when cart meat quantity > 0 and sauce quantity === 0. `CheckoutClient` builds `sauceVariationIds` from `process.env.SQUARE_SAUCE_VARIATION_ID` plus every variation of any catalog item whose name contains "sauce".

Checkout POST body built by `CheckoutClient.handleSubmit`:
```typescript
{ dropId: string; pickupOptionId: string; packageId?: string;
  customer: { firstName: string; lastName: string; email: string; phone?: string };
  cart: Array<{ variationId: string; quantity: number; productName?: string }> }
```
On a 2xx it clears the cart and pushes `/confirmation?orderId=...&pickupNote=...`.

Sold-out UI (`SoldOutCapture`): renders an email input with `aria-label="Email address for drop notifications"` and a submit button labelled `Notify Me`. When sold out, `FrozenItemCard` renders this INSTEAD of the `Add to Cart` button.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Playwright and scaffold config + scripts</name>
  <files>package.json, playwright.config.ts, .gitignore</files>
  <action>
Verify package legitimacy first (T-QT-SC mitigation): run `npm view @playwright/test repository.url maintainers dist-tags` and confirm the repository resolves to `github.com/microsoft/playwright` and the package is Microsoft-maintained. Abort and report if it does not.

Install `@playwright/test` as a devDependency with `npm install --save-dev @playwright/test`, then download only the chromium binary with `npx playwright install chromium`. The browser download is roughly 150MB and requires network access; if it fails, report the failure rather than silently continuing.

Create `playwright.config.ts` at the repo root using `defineConfig` from `@playwright/test`. Set `testDir` to `./e2e`, `fullyParallel` true, `forbidOnly` to the truthiness of `process.env.CI`, `retries` to 2 under CI and 0 locally, `reporter` to `list`, and a per-test `timeout` of 60000 to absorb Next dev-server compile latency. Under `use`, set `baseURL` to `process.env.PLAYWRIGHT_BASE_URL` falling back to `http://localhost:3000` and `trace` to `on-first-retry`. Define a single project named `chromium` using `devices["Desktop Chrome"]`. Configure `webServer` with command `npm run dev`, `url` matching the baseURL, `reuseExistingServer` set to the negation of `process.env.CI`, and `timeout` 120000.

Do NOT touch `vitest.config.ts`. Its `include` is already scoped to `tests/**/*.test.ts`, and the new specs live in `e2e/` with a `.spec.ts` suffix, so the two runners cannot collide. Do not add a `tests/e2e/` directory.

Add npm scripts to `package.json`: `test:e2e` running `playwright test`, and `test:e2e:ui` running `playwright test --ui`. Leave the existing `test` and `test:watch` scripts exactly as they are.

Append Playwright artifact paths to `.gitignore` under the existing "local tooling / artifacts" section: `/test-results`, `/playwright-report`, `/blob-report`, and `/playwright/.cache`. These matter because trace files can capture request bodies from a dev server running against real `.env.local` credentials.
  </action>
  <verify>
    <automated>npx playwright --version && node -e "const p=require('./package.json');if(!p.scripts['test:e2e']||!p.scripts['test:e2e:ui'])process.exit(1);if(!p.devDependencies['@playwright/test'])process.exit(1)" && grep -v '^#' .gitignore | grep -c 'playwright-report' && npx playwright test --list --config=playwright.config.ts</automated>
  </verify>
  <done>`@playwright/test` is in devDependencies, chromium is installed, `playwright.config.ts` parses under `--list`, both npm scripts exist, and `.gitignore` covers Playwright artifacts.</done>
</task>

<task type="auto">
  <name>Task 2: Add deterministic fixtures, stub helpers, and the browse + sold-out spec</name>
  <files>e2e/fixtures/frozenItems.ts, e2e/fixtures/activeDrop.ts, e2e/support/stubs.ts, e2e/browseFrozenItems.spec.ts</files>
  <behavior>
    - Landing page with a stubbed active drop renders each individual item's name and formatted price
    - Each in-stock individual item exposes an enabled `Add to Cart` button
    - Clicking `Add to Cart` on Brisket persists a cart entry to `localStorage["big-matts-bbq-cart"]`
    - With `capacityEnforced: true` and `soldOut.brisket: true`, the Brisket card renders the `Notify Me` capture and NO `Add to Cart` button
    - Sibling items (Pulled Pork) remain orderable in the same sold-out render
    - Bundle catalog items never appear in the individual-items grid
  </behavior>
  <action>
Create `e2e/fixtures/frozenItems.ts` exporting a `variationIds` const object of stable string ids (keys for pulled pork, brisket, sauce, and the three bundles — values are arbitrary literals like `var-brisket`, since nothing validates them against Square when the API is stubbed) and a `frozenItemsFixture` const typed as `FrozenItemDTO[]` imported from `../../lib/types`. Include six items: `Pulled Pork`, `Brisket`, `House BBQ Sauce`, `Family Night Bundle`, `Backyard Host Bundle`, `Freezer Filler Bundle`. Give each a single variation named `Regular` with a distinct non-round `priceCents`, currency `USD`, and a `remaining` value. Use named exports only, no default export, no JSDoc.

Create `e2e/fixtures/activeDrop.ts` exporting `activeDropFixture` typed as `DropDTO` with `status: "active"`, `capacityEnforced: true`, every `soldOut` flag false, an `orderCutoffAt` computed as a fixed offset in the future so the countdown renders, and two `pickupOptions` with `isSoldOut` false. Also export a `withSoldOut(flags: Partial<DropDTO["soldOut"]>): DropDTO` helper that returns a shallow clone of the fixture with the supplied flags merged over `soldOut`. Keep it pure — no mutation of the base fixture.

Create `e2e/support/stubs.ts` exporting four named helpers, each taking a Playwright `Page` as its first argument:
- `stubFrozenItems(page, items = frozenItemsFixture)` — fulfills `**/api/frozen-items` with a 200 JSON array.
- `stubActiveDrop(page, drop = activeDropFixture)` — fulfills `**/api/drop` with a 200 JSON object.
- `stubCheckout(page, response)` — fulfills `**/api/checkout` with a 200 `CheckoutResponseBody` and returns a handle exposing the captured request body so a spec can assert on it. Prefer a small closure that records `route.request().postDataJSON()` into a mutable holder the caller reads after the click.
- `seedCart(page, items)` — calls `page.addInitScript` to write `JSON.stringify(items)` into `localStorage` under the key `big-matts-bbq-cart` before any page script runs. Must be called before `page.goto`.

All route stubs must be registered before `page.goto` so the mount-time fetches are intercepted. Use `route.fulfill` with `contentType: "application/json"`.

Create `e2e/browseFrozenItems.spec.ts` with two tests inside a `test.describe("browse frozen items")`. Both stub `/api/drop` and `/api/frozen-items` and then visit `/`.

Test one ("renders in-stock items with prices and add-to-cart"): assert the `Brisket` and `Pulled Pork` headings are visible, assert their formatted prices are visible, assert the Brisket card's `Add to Cart` button is enabled, assert no heading matching `Family Night Bundle` appears (bundle catalog items are filtered out of the individual grid), click the Brisket `Add to Cart` button, and assert `localStorage["big-matts-bbq-cart"]` parses to an array containing the brisket variation id with quantity 1.

Test two ("sold-out item swaps add-to-cart for the notify capture"): stub the drop with `withSoldOut({ brisket: true })`, then assert that within the Brisket card the `Notify Me` button and the input labelled `Email address for drop notifications` are visible while `Add to Cart` is not, and that the Pulled Pork card still shows an enabled `Add to Cart`.

Scope card assertions with a locator that filters `page.getByRole("article")` by a contained heading, so a sold-out assertion for Brisket cannot be satisfied by another card. Prefer role- and label-based locators over CSS classes throughout — Tailwind class strings in this repo change frequently.
  </action>
  <verify>
    <automated>npx playwright test e2e/browseFrozenItems.spec.ts --reporter=list</automated>
  </verify>
  <done>Both browse tests pass against an auto-booted dev server, with no dependence on live Supabase drop state or Square catalog contents.</done>
</task>

<task type="auto">
  <name>Task 3: Add the checkout flow spec covering sauce bump and confirmation redirect</name>
  <files>e2e/checkoutFlow.spec.ts, e2e/support/stubs.ts</files>
  <behavior>
    - With a brisket-only cart, /checkout shows the "Don't forget the sauce" prompt and an `Add Sauce` button
    - Clicking `Add Sauce` adds the sauce line to the order summary and dismisses the prompt
    - Filling the customer form and submitting posts a body matching the checkout contract: non-empty dropId, non-empty pickupOptionId, customer object with firstName/lastName/email, and a cart array of `{ variationId, quantity }`
    - A successful checkout response redirects to /confirmation and renders the returned orderId and pickupNote
    - The cart is emptied after a successful submit
    - The suite skips with a clear message (never fails) when Supabase has no active drop
  </behavior>
  <action>
Add one more named export to `e2e/support/stubs.ts`: `hasActiveDrop(request)` taking a Playwright `APIRequestContext`, issuing `GET /api/drop`, and returning true only when the response is ok and the parsed body is a non-null object with `status === "active"`.

Create `e2e/checkoutFlow.spec.ts`. In a `test.beforeAll` (or a `test.beforeEach` using the `request` fixture), call `hasActiveDrop` and `test.skip` the whole describe block when it returns false, with the skip reason stating that `/checkout` server-renders `fetchActiveDrop()` and redirects to `/` without a real active drop in Supabase, so this suite needs one to exist.

This gate is required because `app/checkout/page.tsx` resolves the drop through a direct Supabase call on the server. `page.route` cannot intercept it. Do not try to work around this by adding a test-only override to `lib/drops.ts` or `app/checkout/page.tsx` — production code is out of scope for this plan.

Every test in this file must stub `/api/frozen-items` with `frozenItemsFixture` (otherwise the submit button stays disabled while `useFrozenItems` loads and cart line names fall back to `"Item"`), seed the cart via `seedCart` before navigating, and stub `POST /api/checkout` via `stubCheckout`. Stubbing checkout is mandatory, not a convenience: the real route reserves capacity against the live Supabase `drops` row and publishes a real Square invoice. Letting E2E hit it would corrupt the live drop's reserved counts on every run.

Test one ("sauce bump prompts when the cart has meat and no sauce"): seed the cart with a single brisket variation at quantity 1, visit `/checkout`, assert a heading matching `/don.?t forget the sauce/i` is visible (the source renders a `&apos;` entity, so match loosely), click `Add Sauce`, then assert the sauce item name appears in the order summary and the prompt heading is gone.

Test two ("submitting checkout posts a valid body and reaches confirmation"): seed a brisket-plus-sauce cart so the bump prompt is absent, visit `/checkout`, select the first non-sold-out pickup option button if none is preselected, fill `First name`, `Last name`, and `Email` via their label text, install a `stubCheckout` returning a fixed `orderId`, `invoiceId`, and `pickupNote`, click `Submit Order`, and then assert three things: the page URL matches `/confirmation`, the confirmation page displays the stubbed orderId and pickupNote, and `localStorage["big-matts-bbq-cart"]` is an empty array.

Then assert the captured request body: `dropId` is a non-empty string, `pickupOptionId` is a non-empty string, `customer.email` equals the value typed into the form, and `cart` is an array whose entries each carry a string `variationId` and a positive integer `quantity`. Assert shape, never fixed id values — `dropId` and `pickupOptionId` come from the real Supabase drop and will differ between environments.

Do not assert on email delivery. The real route emails a Square invoice, which this spec never triggers; the app-observable success contract is the redirect and the rendered orderId. Server-side Zod validation of that payload is already covered by the Vitest suite (`tests/checkoutDropGate.test.ts`, `tests/checkoutLineItems.test.ts`, `tests/checkoutReservation.test.ts`), so this spec's job is proving the browser builds and sends a conforming body.
  </action>
  <verify>
    <automated>npx playwright test e2e/checkoutFlow.spec.ts --reporter=list && npx tsc --noEmit 2>&1 | grep -c '^e2e/\|^playwright.config' | grep -qx 0 && npm test</automated>
  </verify>
  <done>Checkout specs pass (or skip with the documented reason when no active drop exists), `tsc` reports zero errors under `e2e/` or `playwright.config.ts`, and the existing Vitest suite still passes unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → devDependencies | New package + browser binary enter the build |
| Playwright dev server → `.env.local` | Specs run a dev server holding live Square and Supabase service credentials |
| Spec → real `POST /api/checkout` | Would reserve live drop capacity and publish a real Square invoice |
| Trace/report artifacts → git | Traces can embed request bodies and headers from a credentialed server |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-QT-SC | Tampering | `npm install @playwright/test` | mitigate | Task 1 verifies `npm view @playwright/test repository.url` resolves to `github.com/microsoft/playwright` and the package is Microsoft-maintained before install, and aborts otherwise. Only one package is added; no transitive package-manager installs beyond it. |
| T-QT-01 | Tampering | `POST /api/checkout` | mitigate | Task 3 mandates `stubCheckout` on every checkout spec so no run reserves live Supabase drop capacity or publishes a Square invoice. Explicitly called out in the task action as non-optional. |
| T-QT-02 | Information Disclosure | `test-results/`, `playwright-report/`, trace zips | mitigate | Task 1 adds `/test-results`, `/playwright-report`, `/blob-report`, `/playwright/.cache` to `.gitignore`; `trace` is set to `on-first-retry` rather than `on`, minimizing captured traffic. |
| T-QT-03 | Denial of Service | Next dev server startup latency | accept | `webServer.timeout` 120000 and per-test `timeout` 60000 absorb cold-compile latency; worst case is a local test timeout with no production impact. |
| T-QT-04 | Tampering | `lib/`, `app/`, `vitest.config.ts` | mitigate | Plan scope forbids production-code changes; Task 3 explicitly prohibits adding a test-only drop override to `lib/drops.ts` or `app/checkout/page.tsx`. `files_modified` excludes all production source. |
</threat_model>

<verification>
1. `npm run test:e2e` boots the dev server and runs all specs green (checkout specs may report as skipped if Supabase has no active drop — that is a pass, not a failure).
2. `npm test` still runs the 25 Vitest files with no e2e specs collected.
3. `npx tsc --noEmit` produces zero errors originating in `e2e/` or `playwright.config.ts`.
4. `git status` shows no untracked Playwright artifact directories.
5. No file under `lib/`, `app/`, or `components/` is modified.
</verification>

<success_criteria>
- `@playwright/test` installed, chromium downloaded, `playwright.config.ts` present with a `npm run dev` webServer and `http://localhost:3000` baseURL.
- `test:e2e` and `test:e2e:ui` scripts exist; `test` and `test:watch` unchanged.
- `e2e/` contains fixtures, stub helpers, and two spec files covering browse, sold-out, sauce bump, and checkout → confirmation.
- Specs are deterministic: catalog, drop state, and checkout response are all stubbed at the network layer; no spec depends on Square sandbox inventory or mutates Supabase.
- Vitest suite and all production source are untouched.
</success_criteria>

<output>
Create `.planning/quick/260828-fhk-scaffold-playwright-for-e2e-testing-and-/260828-fhk-SUMMARY.md` when done
</output>
</content>
</invoke>
