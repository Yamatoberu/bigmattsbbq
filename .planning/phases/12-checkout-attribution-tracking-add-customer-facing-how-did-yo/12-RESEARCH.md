# Phase 12: Checkout Attribution Tracking - Research

**Researched:** 2026-08-28
**Domain:** Square Orders API (order metadata / custom attributes) + Supabase-backed dropdown config
**Confidence:** HIGH (core Square mechanism, verified directly against Square's authoritative OpenAPI spec) / MEDIUM (Beta-status risk, dashboard-visibility caveat)

## Summary

The correct, currently-supported mechanism is the Order **`metadata`** field (`map<string,string>`, up to 10 entries, 255-char values), written **inline in the same `POST /v2/orders` request body** this repo's `createOrder()` already sends — not a follow-up call, not Order Custom Attributes, not a webhook. This was verified directly against Square's canonical OpenAPI specification (`components/schemas/Order.metadata`, `components/schemas/CreateOrderRequest`), which is the same source that generates developer.squareup.com.

Order Custom Attributes was the intuitive-sounding candidate the phase description warned against assuming — and correctly so. Every operation in that API (`CreateOrderCustomAttributeDefinition`, `UpsertOrderCustomAttribute`, `BulkUpsertOrderCustomAttributes`, `RetrieveOrderCustomAttribute`) is tagged `x-release-status: BETA` in the spec, requires a one-time attribute-*definition* setup call before any value can ever be written, and — critically — values are keyed by `order_id`, meaning they **cannot** be set inline at `CreateOrder` time; they require a mandatory follow-up call after the order exists. That's strictly more new API surface, more Beta exposure, and a genuine new "can this fail after the order is real?" failure mode — for no benefit over `metadata` when the payload is two short strings.

Order `metadata` itself also carries an `x-release-status: BETA` tag on the field (not the whole `Order` object, which is `PUBLIC`) — flag this to the user, but note it's been in this state for years across Square's public docs and is the field Square's own docs recommend for exactly this "reference/associate an order with something outside Square" use case. One important non-obvious caveat: metadata written by an application is **private to that application** — it will not appear in Big Matt's standard Square Seller Dashboard order view. This is precisely why the phase's D-01 (Slack line) matters: it's the only channel giving Big Matt human-readable visibility today; any future in-dashboard-style reporting must be built in this app by reading the metadata back via `RetrieveOrder`/`SearchOrders` with the same access token.

**Primary recommendation:** Add `metadata: { attribution_source, attribution_detail? }` directly into the `order` object literal already built in `app/api/checkout/route.ts` before the existing `createOrder()` call — built via a small, defensive, non-throwing helper in `lib/square.ts` — so a malformed/oversized attribution value can never abort order creation. Write is synchronous (it's part of the one request already being awaited), not fire-and-forget; safety comes from validating/truncating the *data* before it's added to the body, not from isolating a *call*.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Attribution source list (dropdown options) | API / Backend (`GET /api/attribution-sources`) | Database / Storage (Supabase `attribution_sources`) | Supabase is system of record for the config list; a thin API route mirrors the existing `GET /api/frozen-items` pattern — routes never let client components query Supabase directly |
| Attribution selection UI (dropdown + conditional detail input) | Browser / Client (`CheckoutClient.tsx`) | — | Pure form state, mirrors existing `phone` field handling in the same client component |
| Attribution persistence to Square | API / Backend (`app/api/checkout/route.ts` + `lib/square.ts`) | — | Same tier that already owns `createOrder`/`createInvoice`/`publishInvoice`; no new tier introduced |
| Attribution read-back for reporting (future) | API / Backend | — | Out of scope for this phase, but must go through this app's Square access token (`RetrieveOrder`/`SearchOrders`), not Square's Seller Dashboard, per the metadata-privacy caveat above |
| Slack visibility of attribution | API / Backend (fire-and-forget `notifySlackNewOrder`) | — | Existing non-blocking side-effect tier; D-01 appends a line here |

## Standard Stack

No new external packages are required for this phase. Both integration points (Square REST, Supabase) already exist in the repo via `lib/square.ts`'s raw `squareFetch` helper and `lib/supabase.ts`'s `getSupabaseClient()`. `zod` (already a dependency) covers request validation for the two new optional fields.

### Package Legitimacy Audit

**N/A — this phase installs no new npm packages.** No `slopcheck`/registry verification was needed; all work uses libraries already present in `package.json` (`@supabase/supabase-js`, `zod`, `next`).

## Architecture Patterns

### System Architecture Diagram

```
Browser (CheckoutClient.tsx)
  │
  │ 1. on mount: GET /api/attribution-sources
  ▼
API Route (app/api/attribution-sources/route.ts)  ──▶  lib/attributionSources.ts ──▶ Supabase (attribution_sources, RLS: anon SELECT active rows)
  │
  │ 2. dropdown renders {label}; on select, code stored in formState
  ▼
Browser (CheckoutClient.tsx)
  │
  │ 3. user submits: POST /api/checkout
  │    body.customer.attributionSourceCode?, body.customer.attributionDetail?
  ▼
API Route (app/api/checkout/route.ts)
  │
  │ 4. checkoutSchema.safeParse() — shape-only validation (optional, bounded length)
  │ 5. buildAttributionMetadata(code, detail) — pure, non-throwing, in lib/square.ts
  ▼
createOrder({ body: { order: { ..., metadata: {...} } } })  ──▶  Square POST /v2/orders (single request, unchanged failure path)
  │
  │ 6. (existing) createInvoice → publishInvoice
  │ 7. (existing, unchanged) notifySlackNewOrder — D-01 appends attribution line, fire-and-forget
  ▼
Response to browser: { orderId, invoiceId, pickupNote }   (unchanged shape)

Later (future phase, out of scope here):
Reporting tool ──▶ GET /v2/orders/{id} or POST /v2/orders/search (same Square access token) ──▶ reads order.metadata.attribution_source / attribution_detail
```

### Recommended Project Structure

```
lib/
├── square.ts                  # add buildAttributionMetadata() pure helper (existing file)
├── attributionSources.ts      # NEW — mirrors lib/drops.ts: import "server-only"; fetchActiveAttributionSources()
├── types.ts                   # add AttributionSourceDTO
app/api/
├── checkout/route.ts          # existing; checkoutSchema + order body gain attribution fields
├── attribution-sources/
│   └── route.ts                # NEW — mirrors app/api/frozen-items/route.ts
components/
├── CheckoutClient.tsx          # add dropdown + conditional detail input (D-03)
├── hooks/
│   └── useAttributionSources.ts # NEW — mirrors components/hooks/useFrozenItems.ts
tests/
├── attributionMetadata.test.ts # NEW — unit tests for buildAttributionMetadata()
├── checkoutLineItems.test.ts   # existing pattern to extend/mirror for the createOrder body assertion
e2e/
├── checkoutFlow.spec.ts        # existing Playwright spec — extend for D-06/D-07 UI behavior
```

### Pattern 1: Inline metadata on the existing `createOrder` call
**What:** Extend the `order` object literal already built in `app/api/checkout/route.ts` (the one passed to `createOrder({ body: { order: {...} } })`) with a `metadata` key, computed by a pure helper.
**When to use:** Any time attribution (or, later, other lightweight structured order-level facts) needs to ride along with order creation without a second network call.
**Example:**
```typescript
// Source: verified against Square OpenAPI spec (components.schemas.Order.metadata,
// components.schemas.CreateOrderRequest) — https://developer.squareup.com/reference/square/objects/Order
// lib/square.ts
export function buildAttributionMetadata(params: {
  code?: string;
  detail?: string;
}): Record<string, string> | undefined {
  const code = params.code?.trim();
  if (!code) return undefined;

  const metadata: Record<string, string> = {
    attribution_source: code.slice(0, 60) // Square metadata VALUE limit is 255; key charset [a-zA-Z0-9_-] is ours, fixed
  };

  const detail = params.detail?.trim();
  if (detail) {
    metadata.attribution_detail = detail.slice(0, 255); // Square hard limit on metadata values
  }

  return metadata;
}
```
```typescript
// app/api/checkout/route.ts — inside the existing order body literal
import { buildAttributionMetadata } from "../../../lib/square";

// ...
body: {
  order: {
    location_id: env.locationId,
    customer_id: customerId,
    line_items: (parsed.data.orderItems ?? cart).map(/* unchanged */),
    fulfillments: [/* unchanged */],
    metadata: buildAttributionMetadata({
      code: parsed.data.customer.attributionSourceCode,
      detail: parsed.data.customer.attributionDetail
    })
  }
}
```
Note for the planner: `metadata: undefined` in a JS object literal is safe (JSON.stringify drops `undefined` keys), so this can be a plain property assignment — no conditional spread required. Confirm this against the existing `phone_number: customer.phone` pattern in `createCustomer`'s body, which already relies on the same `undefined`-is-dropped behavior.

### Pattern 2: Supabase-backed dropdown list (mirrors existing `useFrozenItems`/`GET /api/frozen-items`)
**What:** A read-only `GET` route backed by a `lib/` fetch function, consumed by a client hook with `{data, isLoading, error}` shape.
**When to use:** Any new Supabase-config-list needed by a client component. No better/newer pattern exists in the repo — `lib/drops.ts` + `app/api/checkout/route.ts`'s inline Supabase reads and `useFrozenItems`/`app/api/frozen-items` are the two established variants; the latter is the closer match since this is a simple `GET`, no capacity/reservation logic.
**Example:**
```typescript
// Source: repo pattern — components/hooks/useFrozenItems.ts (read, unmodified)
// lib/attributionSources.ts
import "server-only";
import { getSupabaseClient } from "./supabase";
import type { AttributionSourceDTO } from "./types";

export async function fetchActiveAttributionSources(): Promise<AttributionSourceDTO[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("attribution_sources")
    .select("id, code, label, sort_order, requires_detail")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    requiresDetail: row.requires_detail,
    sortOrder: row.sort_order
  }));
}
```

### Anti-Patterns to Avoid
- **Fire-and-forget for the Square metadata write:** Unlike `notifySlackNewOrder`, there is no separate Square call to isolate — metadata rides inside the request that's already being awaited. Wrapping it in a `.catch()`-style detached call would be pointless (it can't be detached; it's one field in one object) and would obscure the real failure boundary. Safety must come from validating/truncating the *value* before it's placed in the body, per Pattern 1.
- **Order Custom Attributes "because it sounds more correct":** Do not use it here. It is Beta-gated end-to-end, requires a pre-created definition, and cannot be set inline at order creation (see Sources below) — objectively worse fit than `metadata` for two simple strings.
- **Concatenated single string in `metadata`:** The phase spec requires structured, separate values (`source`, `detail`). Do not compress to `"ai:ChatGPT"` in one key — that fights the "extensible later" requirement and makes reporting queries harder.
- **Assuming the business owner sees this in Square's Dashboard:** Application-written metadata is private to the writing application. Do not describe this to the user as "visible in Square" without qualifying "via this app's own API calls only."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured per-order key/value storage | A custom "order notes" convention (e.g. stuffing JSON into the invoice `description`) | Square Order `metadata` | Purpose-built, documented, queryable field with defined limits — no ad hoc parsing needed on read-back |
| Validating a dynamic, Supabase-owned enum of source codes | A hardcoded Zod `z.union([z.literal(...)])` list (like `productName`) that must be kept in sync with the DB | Shape-only validation (non-empty, bounded length, safe charset) — see Common Pitfalls | The list changes in Supabase without a deploy; a hardcoded union would silently reject valid new codes or require a redundant DB round-trip on every checkout just to validate |

**Key insight:** This phase needs almost no new machinery — the two "don't hand-roll" risks are really "don't over-engineer" risks (don't invent a bespoke storage convention when Square already has one; don't invent enum validation for a value that's supposed to stay decoupled from deploys).

## Common Pitfalls

### Pitfall 1: Assuming Order Custom Attributes because the name matches the ask
**What goes wrong:** "Custom Attributes for Orders" sounds exactly like what's needed, so it's easy to reach for without checking Beta status or call sequencing.
**Why it happens:** The docs page title practically restates the requirement.
**How to avoid:** Verified above against the OpenAPI spec: all Order Custom Attributes operations are `x-release-status: BETA`, require a one-time `CreateOrderCustomAttributeDefinition` call, and values are written via `order_id`-keyed follow-up calls (`UpsertOrderCustomAttribute` / `BulkUpsertOrderCustomAttributes`) — never inline at `CreateOrder`.
**Warning signs:** Any plan that includes a "create custom attribute definition" one-time setup step, or an `order_id` in an upsert-attribute request body, has picked this path — reconsider.

### Pitfall 2: Letting a malformed attribution value fail the whole checkout
**What goes wrong:** If `metadata` is built carelessly (e.g., an unbounded free-text `detail` exceeding 255 chars, or a key with invalid characters), Square will reject the entire `CreateOrder` request with a 400 — which, unlike Order Custom Attributes' separate call, IS the same call that creates the order, so a bad attribution value would abort a valid checkout. This directly violates D-10.
**Why it happens:** Treating "attribution can't fail checkout" as solved by "isolate the network call" (the Slack pattern) rather than "sanitize the data before it's part of the call."
**How to avoid:** `buildAttributionMetadata()` must never throw and must always truncate/trim to Square's documented limits (60-char key — fixed by us, not user input; 255-char value) before the value ever reaches the request body. Zod validation at the API boundary (`checkoutSchema`) is a second line of defense (reject absurdly long input with a 400 *before* even reaching Square), but the helper must be defensive independent of Zod in case validation bounds and Square's actual limits ever drift.
**Warning signs:** Any code path where `metadata` is built with unclamped user input, or where building `metadata` can throw and isn't wrapped.

### Pitfall 3: Expecting attribution to be visible in Square's Seller Dashboard
**What goes wrong:** Big Matt looks at an order in the Square Dashboard expecting to see "Heard about us: AI (ChatGPT)" and doesn't find it, concluding the feature is broken.
**Why it happens:** Metadata written via the API by a third-party application is private to that application — Square's own first-party dashboard UI does not surface application-private metadata the way it does native order fields.
**How to avoid:** This is exactly why D-01 (Slack line) exists — set expectations that Slack (and any future in-app reporting screen built on `RetrieveOrder`/`SearchOrders`) is the visibility path, not the Square Dashboard.
**Warning signs:** Any acceptance criterion phrased as "verify in the Square Dashboard" for this feature.

### Pitfall 4: `lib/database.types.ts` and `supabase/migrations/` don't know about `attribution_sources`
**What goes wrong:** CONTEXT.md states the table is "already created" in Supabase, but a repo-wide check found no `attribution_sources` migration file under `supabase/migrations/` (only `0001_foundation.sql` through `0004_per_item_capacity.sql` exist) and no corresponding entry in `lib/database.types.ts`'s generated `Database["public"]["Tables"]`. This matches this project's established pattern of creating Supabase tables out-of-band (dashboard/MCP) without capturing a migration — the same gap already exists for the `sca` schema tables per prior phase notes.
**Why it happens:** Tables created directly against the live database (dashboard, MCP tools) don't automatically produce a migration file or regenerate types.
**How to avoid:** Add a Wave 0 task to (a) confirm the live table's exact column types via a Supabase read/dashboard check (id type — likely `uuid` or `int8`, `code text`, `label text`, `is_active boolean`, `sort_order int`, `requires_detail boolean`), (b) hand-add or regenerate the `attribution_sources` entry in `lib/database.types.ts` so `getSupabaseClient()` calls are type-checked, and (c) optionally back-fill a migration file for drift-tracking (lower priority — the repo has already accepted this gap elsewhere per STATE.md).
**Warning signs:** TypeScript errors on `.from("attribution_sources")` calls, or silent `any`-typed rows if the table is queried without updating `database.types.ts`.

## Code Examples

### Reading metadata back (future reporting; confirms round-trip works, not built this phase)
```typescript
// Source: Square OpenAPI spec — /v2/orders/{order_id} (RetrieveOrder, PUBLIC, requires ORDERS_READ)
// https://developer.squareup.com/reference/square/orders-api/retrieve-order
const order = await squareFetch({
  host, accessToken, method: "GET", path: `/v2/orders/${orderId}`
});
// order.order.metadata?.attribution_source, order.order.metadata?.attribution_detail
```

### Extending `checkoutSchema` (shape-only validation, matches `phone` optionality)
```typescript
customer: z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  attributionSourceCode: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  attributionDetail: z.string().trim().min(1).max(255).optional()
})
```
Regex mirrors Square's own metadata *key* charset constraint (`[a-zA-Z0-9_-]`) even though `attributionSourceCode` becomes a metadata *value*, not a key — it's a reasonable, cheap slug-safety net for a code that Supabase itself defines as a stable short string (per CONTEXT.md's worked examples: `ai`, `event`, `referral`, `other`). Do not cross-check against live Supabase active rows in this validator (see Don't Hand-Roll) — accept any shape-valid string; a mismatch just produces a Slack line / metadata value that doesn't match a currently-active row, which is a data-quality issue, not a checkout-blocking one.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — no prior attribution mechanism exists in this repo | Order `metadata` (this research) | N/A, greenfield for this repo | First structured order-level metadata usage; sets the `attribution_*` key-naming convention for future UTM/campaign work |

**Deprecated/outdated:** Nothing found deprecated in this domain as of Square-Version 2026-04-21 (this repo's pin) through the current spec (checked against the live spec, whose CreateOrder reference page showed `Square-Version: 2026-08-19` as of this research — four months newer than the repo's pin, but `metadata` has existed on `Order` for years pre-dating both versions, so no version bump is required for this phase).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact live column types of the `attribution_sources` table (`id` type, nullability) match CONTEXT.md's description (id, code, label, is_active, sort_order, requires_detail) — not independently verified against the live Supabase schema in this research session (no Supabase MCP/DB access available to this research agent). | Pitfall 4, Recommended Project Structure | Type mismatch in `database.types.ts` or a failed `.select()` if a column name/type differs from assumption; low risk (caught immediately by TypeScript/dev-time testing), but should be confirmed in Wave 0 before writing `lib/attributionSources.ts`. |
| A2 | Square's Order `metadata` field remaining `x-release-status: BETA` does not carry a practical deprecation/removal risk for this phase's timeline. | Summary, Pitfall 1 | If Square ever removes/reworks the Beta `metadata` field, attribution silently stops persisting (though checkout itself would remain unaffected per the defensive design) — low likelihood given the field's multi-year presence in Square's public docs, but genuinely unverifiable beyond "it's still there and documented today." |

## Open Questions (RESOLVED)

> Both questions were closed during planning on 2026-08-28. Assumption A1 above is likewise resolved by Q1's answer. Nothing in this section is open.

1. **Exact Postgres column types for `attribution_sources`** — **RESOLVED (2026-08-28, live schema check).**
   - What we knew: CONTEXT.md listed columns (id, code, label, is_active, sort_order, requires_detail) and RLS behavior (anon/authenticated SELECT of active rows).
   - What was unclear: Whether `id` is `uuid` or `int8`/`serial`, and whether `requires_detail`/`is_active` are non-nullable booleans with defaults.
   - **Resolution:** The planner queried the live Supabase PostgREST OpenAPI definition for `public.attribution_sources`. `id` is **`bigint` (`int8`) → TypeScript `number`, NOT `uuid`/`string`**. All 8 columns are NOT NULL: `id` (identity), `code text`, `label text`, `is_active boolean` (default `true`), `sort_order integer` (default `0`), `requires_detail boolean` (default `false`), `created_at timestamptz` (default `now()`), `updated_at timestamptz` (default `now()`). Eight active rows exist (`referral`, `facebook`, `instagram`, `google`, `ai`, `event`, `returning`, `other`; `ai`/`event`/`other` have `requires_detail = true`).
   - **Authoritative record:** the `<live_schema>` block in `12-01-PLAN.md`'s `<context>`. Note that Pattern 2's snippet above and `12-PATTERNS.md` both guessed `id: string` before this check — **use `number`**; do not re-derive the schema from this research document.

2. **Should the checkout route cross-check `attributionSourceCode` against live active Supabase rows?** — **RESOLVED (adopted: NO — shape-only validation).**
   - What we knew: CONTEXT.md leaves this explicitly to Claude's discretion; strict enum validation is impractical given the dynamic list.
   - What was unclear: Whether the residual risk (an arbitrary client-supplied string landing in Square metadata / the Slack message if the UI is bypassed) is acceptable.
   - **Resolution:** The recommendation was adopted as the final answer. `checkoutSchema` in `app/api/checkout/route.ts` validates **shape only** — `attributionSourceCode`: `z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/).optional()`, `attributionDetail`: `z.string().trim().min(1).max(255).optional()` — with **no** live Supabase cross-check. Implemented in `12-03-PLAN.md`. The accepted residual risk is recorded as threat `T-12-02` (Tampering, disposition **accept**) in `12-01-PLAN.md`'s threat register: this is a best-effort analytics field, not a security boundary; a mismatched code degrades data quality, not correctness or safety.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase project (`attribution_sources` table) | `GET /api/attribution-sources` | Assumed ✓ (per CONTEXT.md, "already created") — not independently verified this session (no live DB access) | — | Wave 0 confirmation step (see Open Question 1) |
| Square sandbox credentials (`.env.local`) | Attribution write to `createOrder` | ✓ (existing `SQUARE_ACCESS_TOKEN`/`SQUARE_LOCATION_ID` already required by `getSquareEnv()`) | Square-Version pinned `2026-04-21` in `lib/square.ts` | — |
| `@supabase/supabase-js` | `lib/attributionSources.ts` | ✓ `^2.101.1` (already a dependency) | 2.101.1 | — |
| `zod` | `checkoutSchema` extension | ✓ `^3.24.2` (already a dependency) | 3.24.2 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Live Supabase schema confirmation — fallback is a Wave 0 verification task rather than assuming CONTEXT.md's column list is byte-for-byte accurate.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (environment: `node`, include: `tests/**/*.test.ts`) |
| Quick run command | `npx vitest run tests/attributionMetadata.test.ts` (and `tests/checkoutLineItems.test.ts` for order-body assertions) |
| Full suite command | `npm run test` |
| E2E framework | Playwright `^1.62.1` (`e2e/checkoutFlow.spec.ts` covers the checkout critical path today) |
| E2E command | `npm run test:e2e` |

### Phase Requirements → Test Map

> This repo has no `REQUIREMENTS.md`; CONTEXT.md's decision IDs (D-01 … D-10) are used as the closest equivalent requirement anchors.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| D-10 | Malformed/oversized attribution value never causes `createOrder`/checkout to fail | unit | `npx vitest run tests/attributionMetadata.test.ts` | ❌ Wave 0 |
| D-08 | `createOrder` receives `metadata.attribution_source = code` (never `label`/`id`) when a source is selected | unit | `npx vitest run tests/checkoutLineItems.test.ts` (extend) | ✅ (extend existing file) |
| — | `metadata` key is omitted entirely from the order body when no attribution was selected (no empty-object noise) | unit | same file as above | ✅ (extend existing file) |
| D-01 | Slack message includes `Heard about us: <label>` (+ detail) when attribution present, and omits the line when absent | unit | `npx vitest run tests/checkoutLineItems.test.ts` or new `tests/checkoutSlack.test.ts` | ❌ Wave 0 (or extend existing) |
| D-04, D-09 | `GET /api/attribution-sources` failure degrades gracefully — dropdown hidden, checkout still submits | unit (route) + manual/E2E | `npx vitest run tests/attributionSourcesRoute.test.ts` (new, mirrors `checkoutLineItems.test.ts` mocking style) | ❌ Wave 0 |
| D-06, D-07 | Selecting a `requires_detail` source shows the detail input with correct copy; switching away clears stale detail before submit | E2E | `npm run test:e2e -- checkoutFlow` (extend) | ❌ Wave 0 (extend `e2e/checkoutFlow.spec.ts`) |
| D-02 | `/confirmation` page renders unchanged (no attribution acknowledgment) | manual / existing E2E coverage | `npm run test:e2e -- checkoutFlow` | ✅ (regression-only, no new assertion needed beyond "unchanged") |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run tests/<file>.test.ts` for the file(s) touched
- **Per wave merge:** `npm run test` (full Vitest suite)
- **Phase gate:** `npm run test` green + relevant `npm run test:e2e -- checkoutFlow` pass before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/attributionMetadata.test.ts` — unit tests for `buildAttributionMetadata()` (D-10: truncation, undefined-key omission, no-throw on garbage input)
- [ ] `tests/attributionSourcesRoute.test.ts` — mirrors `checkoutLineItems.test.ts` mocking style for the new `GET /api/attribution-sources` route
- [ ] Extend `tests/checkoutLineItems.test.ts` (or add `tests/checkoutAttribution.test.ts`) — asserts `metadata` shape on the `createOrder` call body, and the Slack message line (D-01)
- [ ] Extend `e2e/checkoutFlow.spec.ts` — dropdown selection, conditional detail field show/hide, and detail-clearing-on-switch (D-06/D-07)
- [ ] Confirm live `attribution_sources` schema (Open Question 1) before finalizing `lib/database.types.ts` edits

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No auth changes in this phase |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | RLS on `attribution_sources` already restricts to active-row SELECT for anon/authenticated; unchanged by this phase |
| V5 Input Validation | Yes | Zod `safeParse` at `checkoutSchema` (bounded length, safe charset for `attributionSourceCode`; bounded length for `attributionDetail`) — see Code Examples |
| V6 Cryptography | No | No crypto/secrets introduced |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Oversized/malicious free-text `attributionDetail` bloating Square metadata or crashing the `createOrder` request | Denial of Service (indirect — a bad-shaped request could 400 the whole checkout, violating D-10) | Zod `.max(255)` at the API boundary + defensive `.slice()` truncation in `buildAttributionMetadata()` (defense in depth, per Pitfall 2) |
| Client bypasses the UI and submits an `attributionSourceCode` not present in Supabase's active list | Tampering (low severity — data-quality only) | Accepted as out of scope per CONTEXT.md's discretion note; shape-only validation, no live cross-check (see Open Question 2) |
| Free text rendered unsafely (XSS) if a future admin/reporting UI displays `attribution_detail` | Tampering / Elevation of Privilege | Not this phase's concern (no reporting UI built here), but flag for whoever builds that UI: React JSX auto-escapes text content by default — do not use `dangerouslySetInnerHTML` on metadata-sourced strings |

## Sources

### Primary (HIGH confidence)
- Square OpenAPI specification (`components.schemas.Order`, `CreateOrderRequest`, `UpsertOrderCustomAttributeRequest`, `BulkUpsertOrderCustomAttributesRequest`, `CreateOrderCustomAttributeDefinitionRequest`, `Customer`, `OrderCreatedEvent`/`OrderCreatedObject`, and `paths` entries for `/v2/orders`, `/v2/orders/{order_id}`, `/v2/orders/custom-attribute-definitions`, `/v2/orders/{order_id}/custom-attributes/{key}`, `/v2/customers/custom-attributes/bulk-upsert`, `/v2/online-checkout/payment-links`, `/v2/webhooks/subscriptions`) — fetched from `https://raw.githubusercontent.com/square/connect-api-specification/master/api.json`, which is the canonical spec Square uses to generate `developer.squareup.com`. Confirmed: `Order.metadata` = `x-release-status: BETA`; `Order` object itself = `PUBLIC`; `CreateOrder` operation = `PUBLIC`, scope `ORDERS_WRITE`; all Order Custom Attributes operations = `BETA`; `RetrieveOrder`/`SearchOrders`/`BatchRetrieveOrders` = `PUBLIC`, scope `ORDERS_READ`; `UpdateOrder` = `BETA`.
- [Order Object - Square API Reference](https://developer.squareup.com/reference/square/objects/Order) — metadata field description, limits (60-char key, 255-char value, 10 entries, app-private)
- [POST /v2/orders - Square API Reference (CreateOrder)](https://developer.squareup.com/reference/square/orders-api/create-order)
- [Custom Attributes for Orders - Overview](https://developer.squareup.com/docs/orders-custom-attributes-api/overview) — definition-vs-value workflow, `ORDER_READ`/`ORDER_WRITE` scopes, Square-Version 2022-11-16+ requirement

### Secondary (MEDIUM confidence)
- [Metadata - Square Orders API docs](https://developer.squareup.com/docs/orders-api/metadata) — cross-verified against the OpenAPI spec above; matches on limits and app-private behavior
- [Order Custom Attributes API - Square API Reference](https://developer.squareup.com/reference/square/order-custom-attributes-api) — cross-verified Beta status and endpoint list against the spec
- Square Developer Forums discussion confirming application-written order metadata/details are not surfaced to other applications or (by extension) the first-party Seller Dashboard view — used to support the "Big Matt won't see this in the Dashboard" caveat; treated as MEDIUM confidence (community/forum source, not an official docs statement, though consistent with the documented "private to the writing application" behavior).

### Tertiary (LOW confidence)
- None used as load-bearing claims — all Square-mechanism claims in the Recommendation are backed by the primary OpenAPI spec source.

## Metadata

**Confidence breakdown:**
- Standard stack (no new packages): HIGH — nothing to verify beyond what's already installed
- Core Square mechanism (metadata vs. custom attributes): HIGH — verified directly against Square's authoritative OpenAPI spec, cross-checked against rendered docs pages
- Beta-status risk framing: MEDIUM — the flag itself is HIGH confidence (directly from the spec), but the practical "is this actually risky" judgment is inherently forward-looking/unverifiable
- Dashboard-visibility caveat: MEDIUM — corroborated by docs language ("private... can only be read... by the same application") plus a forum thread, not an explicit official statement of "will never appear in the Seller Dashboard"
- Supabase `attribution_sources` schema/pattern: MEDIUM — CONTEXT.md's column description is trusted but not independently re-verified against the live database in this session (no DB access tool available to this research agent); flagged as Open Question 1 / Assumption A1
- Architecture/patterns (mirroring `useFrozenItems`/`lib/drops.ts`): HIGH — read directly from the current codebase

**Research date:** 2026-08-28
**Valid until:** 2026-09-27 (30 days — Square's Beta-tagged fields can change without notice per their terms; re-verify the `x-release-status` of `Order.metadata` if this research is reused after that window, or if a Square API version bump is planned)
