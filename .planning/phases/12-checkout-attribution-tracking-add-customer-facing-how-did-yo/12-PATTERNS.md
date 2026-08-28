# Phase 12: Checkout Attribution Tracking - Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/attributionSources.ts` (new) | service (Supabase data-access) | CRUD (read-only) | `lib/drops.ts` | exact |
| `lib/square.ts` (`buildAttributionMetadata` addition) | utility (pure helper, appended to existing service) | transform | `lib/square.ts` → `extractVariationIds` / `mapCatalogToFrozenItems` (pure helpers in same file) | exact |
| `lib/types.ts` (add `AttributionSourceDTO`, extend `CheckoutRequestBody`) | model (type definitions) | transform | `lib/types.ts` (existing `PickupOptionDTO`, `DropDTO`) | exact |
| `app/api/attribution-sources/route.ts` (new) | route (thin GET API) | request-response | `app/api/frozen-items/route.ts` | exact |
| `app/api/checkout/route.ts` (extend `checkoutSchema`, order body, Slack message) | route (POST orchestration) | request-response | itself (existing file, extend in place) | exact |
| `components/hooks/useAttributionSources.ts` (new) | hook | request-response (client fetch) | `components/hooks/useFrozenItems.ts` | exact |
| `components/CheckoutClient.tsx` (extend form) | component | request-response (form state + submit) | itself (existing file, extend in place) | exact |
| `tests/attributionMetadata.test.ts` (new) | test (unit) | transform | no direct existing unit-test analog for a pure `lib/square.ts` helper — model on `tests/checkoutLineItems.test.ts`'s assertion style, not its mocking scaffold | partial |
| `tests/checkoutLineItems.test.ts` (extend) | test (unit, route-level) | request-response | itself (existing file, extend in place) | exact |
| `e2e/checkoutFlow.spec.ts` (extend) | test (E2E) | request-response | itself (existing file, extend in place); stub helper pattern from `e2e/support/stubs.ts` | exact |

## Pattern Assignments

### `lib/attributionSources.ts` (new) — service, CRUD (read-only)

**Analog:** `lib/drops.ts`

**Imports pattern** (`lib/drops.ts` lines 1-3):
```typescript
import "server-only";
import { getSupabaseClient } from "./supabase";
import type { DropDTO, DropStatus, PickupOptionDTO } from "./types";
```
Copy this exact shape: `import "server-only"` first (enforces server-only import, matches RESEARCH.md's explicit requirement), then `getSupabaseClient`, then a `type`-only import from `./types`.

**Core CRUD (read) pattern** (`lib/drops.ts` lines 14-29, the `fetchActiveDrop` function):
```typescript
export async function fetchActiveDrop(): Promise<DropDTO | null> {
  const supabase = getSupabaseClient();

  const { data: drop, error: dropErr } = await supabase
    .from("drops")
    .select(
      "id, title, status, order_cutoff_at, capacity_pulled_pork, ..."
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dropErr) {
    throw dropErr;
  }
  if (!drop) {
    return null;
  }
  // ... map snake_case row -> camelCase DTO
}
```
Apply directly to `fetchActiveAttributionSources()` per RESEARCH.md's Pattern 2 example — same `getSupabaseClient()` call, same `if (error) throw error` early-return-on-error convention (no try/catch inside the lib function; the caller/route handles errors), same snake_case→camelCase row mapping done inline with `.map()`. RESEARCH.md already supplies the exact target implementation (lines 149-166 of RESEARCH.md); use `lib/drops.ts`'s structure to validate that implementation matches established conventions (it does).

**Row mapping pattern** (`lib/drops.ts` lines 48-61, mapping pickup rows to DTOs):
```typescript
const pickupOptions: PickupOptionDTO[] = (pickupRows ?? []).map((row) => ({
  id: row.id,
  locationLabel: row.location_label,
  pickupDateLabel: formatPickupDate(row.pickup_at),
  pickupAtISO: row.pickup_at,
  isSoldOut: /* ... */
}));
```
Mirrors the `(data ?? []).map((row) => ({ id: row.id, code: row.code, ... }))` shape RESEARCH.md specifies for `fetchActiveAttributionSources`.

---

### `lib/square.ts` (add `buildAttributionMetadata`) — utility, transform

**Analog:** existing pure helpers in the same file, `mapCatalogToFrozenItems` and `extractVariationIds` (`lib/square.ts` lines 257-299)

**Pattern:** Both existing helpers are plain, synchronous, non-throwing pure functions with no I/O, placed at the bottom of `lib/square.ts` after all the `squareFetch`-based API call functions. `extractVariationIds` (lines 297-299) is the simplest analog — a one-line pure transform with an explicit param/return type:
```typescript
export function extractVariationIds(items: FrozenItemDTO[]) {
  return items.flatMap((item) => item.variations.map((variation) => variation.variationId));
}
```
Add `buildAttributionMetadata` in the same style — exported, pure, defensively guards against undefined/empty input (matching `mapCatalogToFrozenItems`'s liberal use of `?.` and `??` fallbacks, e.g. `itemData.name || "Untitled"`, `priceMoney?.amount ?? 0`). RESEARCH.md already provides the exact target implementation (lines 99-116) — it follows this file's established defensive-fallback idiom precisely (`.trim()`, `.slice()`, `?? undefined` early return). No changes needed to that RESEARCH.md snippet; just append it after `extractVariationIds`.

**SquareError / squareFetch pattern (for context, not to be duplicated):** `buildAttributionMetadata` must NOT use `squareFetch` — it is a pure value-builder consumed by the existing `createOrder()` call, not a new Square API call. This matches RESEARCH.md's explicit Anti-Pattern guidance (no new network call, no fire-and-forget for this piece).

---

### `lib/types.ts` — model, transform

**Analog:** existing DTO/request-body interfaces in the same file

**Pattern** (`lib/types.ts` lines 9-14 and 40-50):
```typescript
export interface VariationDTO {
  variationId: string;
  name: string;
  priceCents: number;
  currency: string;
  remaining: number;
}

export interface CheckoutRequestBody {
  dropId: string;
  pickupOptionId: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  cart: CartItem[];
}
```
Add `AttributionSourceDTO` following the `VariationDTO`/`PickupOptionDTO` naming convention (`...DTO` suffix, camelCase fields, exported `interface`, no class):
```typescript
export interface AttributionSourceDTO {
  id: string;
  code: string;
  label: string;
  requiresDetail: boolean;
  sortOrder: number;
}
```
Extend `CheckoutRequestBody.customer` with `attributionSourceCode?: string; attributionDetail?: string;` — directly following the existing `phone?: string` optional-field precedent in the same interface (line 47).

---

### `app/api/attribution-sources/route.ts` (new) — route, request-response

**Analog:** `app/api/frozen-items/route.ts` (full file, 56 lines)

**Imports pattern** (lines 1-12):
```typescript
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSquareEnv } from "../../../lib/env";
import { joinInventoryCounts } from "../../../lib/normalizers";
import {
  batchRetrieveInventoryCounts,
  extractVariationIds,
  mapCatalogToFrozenItems,
  searchCatalogItems,
  SquareError
} from "../../../lib/square";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";
```
For the new route, swap the Square imports for `fetchActiveAttributionSources` from `../../../lib/attributionSources`; keep `NextResponse`, `headers`, `logError`, and `export const runtime = "nodejs"` identical.

**Core GET handler pattern** (lines 16-55):
```typescript
export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const env = getSquareEnv();
    const { items, relatedObjects } = await searchCatalogItems({ /* ... */ });
    const frozenItems = mapCatalogToFrozenItems({ items, relatedObjects });
    /* ... */
    return NextResponse.json(withInventory);
  } catch (error) {
    logError("Failed to load frozen items", error, requestId);
    const status = error instanceof SquareError ? error.status : 500;
    return NextResponse.json(
      {
        error: "Unable to load frozen menu right now. Please try again.",
        requestId
      },
      { status }
    );
  }
}
```
New route body: replace the Square calls with a single `const sources = await fetchActiveAttributionSources();` then `return NextResponse.json(sources);`. Error branch: there is no `SquareError` here (Supabase errors, not Square), so `status` is always `500` on failure — mirror the `logError(message, error, requestId)` + `NextResponse.json({ error, requestId }, { status })` shape exactly, but drop the `instanceof SquareError` branch since it doesn't apply. Per D-09 (graceful degrade on Supabase failure), this route still returns a proper error response — the *graceful degrade* happens client-side in `useAttributionSources`/`CheckoutClient` (hide the question), not by having the route silently return `200 []`.

---

### `app/api/checkout/route.ts` (extend in place) — route, request-response

**Analog:** itself — extend existing patterns already in this file

**Zod schema extension pattern** (lines 86-98, `checkoutSchema`):
```typescript
const checkoutSchema = z.object({
  dropId: z.string().uuid(),
  pickupOptionId: z.string().uuid(),
  packageId: z.string().optional(),
  orderItems: z.array(orderItemSchema).min(1).optional(),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional()
  }),
  cart: z.array(cartSchema).min(1)
});
```
Add to the nested `customer` object (matching RESEARCH.md's Code Examples section, lines 224-231):
```typescript
attributionSourceCode: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/).optional(),
attributionDetail: z.string().trim().min(1).max(255).optional()
```
Follows the exact `.optional()` precedent already set by `phone: z.string().optional()` in the same object (D-04).

**Order body extension pattern** (lines 301-323, the `createOrder` call body):
```typescript
body: {
  order: {
    location_id: env.locationId,
    customer_id: customerId,
    line_items: (parsed.data.orderItems ?? cart).map((item) => ({
      quantity: item.quantity.toString(),
      catalog_object_id: item.variationId
    })),
    fulfillments: [ /* ... */ ]
  }
}
```
Add a `metadata: buildAttributionMetadata({ code: parsed.data.customer.attributionSourceCode, detail: parsed.data.customer.attributionDetail })` key alongside `location_id`/`customer_id`/`line_items`/`fulfillments`. Import `buildAttributionMetadata` alongside the existing named imports from `../../../lib/square` (lines 6-13). Per RESEARCH.md, `undefined` metadata is safe — no conditional spread needed, matching the existing `phone_number: customer.phone` precedent in `createCustomer`'s body (line 268), which already relies on `undefined`-key-drop behavior in `JSON.stringify`.

**Fire-and-forget Slack pattern** (lines 29-66, `notifySlackNewOrder`):
```typescript
function notifySlackNewOrder({ customer, cart, locationLabel, pickupDateLabel, orderId }: { /* ... */ }): void {
  const webhookUrl = process.env.SLACK_ORDERS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines = cart
    .filter((item) => item.productName && PRODUCT_NAME_LABELS[item.productName])
    .map((item) => `  • ${PRODUCT_NAME_LABELS[item.productName!]} × ${item.quantity}`);

  const message = [
    "New Order — Big Matt's BBQ",
    "",
    `Customer: ${customer.firstName} ${customer.lastName} · ${customer.email}`,
    "Order:",
    ...lines,
    `Pickup: ${locationLabel} — ${pickupDateLabel}`,
    `Order ID: ${orderId}`,
  ].join("\n");

  fetch(webhookUrl, { /* ... */ }).catch((err) => {
    console.warn("Slack order notification failed", err);
  });
}
```
Per D-01, add an attribution-source label lookup and append a conditional line before `.join("\n")`, e.g. `...(attributionLabel ? [`Heard about us: ${attributionLabel}${attributionDetail ? ` (${attributionDetail})` : ""}`] : [])`. The function signature must accept the label (not raw code) since the Slack message is human-readable — resolve `code` → `label` before calling `notifySlackNewOrder` (the checkout route already has the parsed request data; whether it needs to re-fetch active sources or just echo back whatever the client sent is a planner-level decision, but the append point and non-blocking `.catch()` shape must match this existing function exactly, unchanged).

**Error handling / requestId pattern** (lines 124-137, 415-426): unchanged — reuse the existing top-level `try/catch`, `logError(message, error, requestId)`, and `error instanceof SquareError ? error.status : 500` shape. Per D-10, the attribution write itself must not introduce a new failure path into this catch block — `buildAttributionMetadata` must be non-throwing (see `lib/square.ts` pattern above), so no new catch logic is needed here.

---

### `components/hooks/useAttributionSources.ts` (new) — hook, request-response

**Analog:** `components/hooks/useFrozenItems.ts` (full file, 43 lines)

**Full pattern to copy** (lines 1-42):
```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { FrozenItemDTO } from "../../lib/types";

interface FrozenItemsState {
  items: FrozenItemDTO[];
  isLoading: boolean;
  error?: string;
}

export function useFrozenItems() {
  const [state, setState] = useState<FrozenItemsState>({
    items: [],
    isLoading: true
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await fetch("/api/frozen-items", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load frozen items");
      }
      const data = (await response.json()) as FrozenItemDTO[];
      setState({ items: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load frozen items";
      setState({ items: [], isLoading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load
  };
}
```
Per CONTEXT.md's own guidance and RESEARCH.md, model `useAttributionSources` on this exact shape: `{sources: AttributionSourceDTO[], isLoading, error}` state, `fetch("/api/attribution-sources", { cache: "no-store" })`, identical error-normalization (`error instanceof Error ? error.message : "fallback"`), identical `useCallback`/`useEffect` wiring, identical `{...state, reload: load}` return shape. Per D-09, the *consumer* (`CheckoutClient`) is responsible for hiding the dropdown when `error` is set or `sources.length === 0` — this hook itself should behave exactly like `useFrozenItems` (surface the error, don't swallow it).

---

### `components/CheckoutClient.tsx` (extend in place) — component, request-response

**Analog:** itself — extend existing patterns already in this file

**Optional-field form-state pattern** (lines 27-32, `formState` init, and lines 352-360, the `phone` field JSX):
```typescript
const [formState, setFormState] = useState({
  firstName: "",
  lastName: "",
  email: "",
  phone: ""
});
```
```tsx
<label className="text-sm text-smoke-600">
  Phone (optional)
  <input
    type="tel"
    className="input-field mt-2"
    value={formState.phone}
    onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
  />
</label>
```
Per D-03, add `attributionSourceCode: ""` and `attributionDetail: ""` to `formState`, and per D-06/D-07 render a `<select>` (not `<input>`) using the same `input-field` class and `label` wrapper convention as the `phone` field, placed after it (last field, before submit button per D-03). Add a conditional detail `<input>` (same shape as `phone`) that only renders when the selected option's `requiresDetail` is true — clear `attributionDetail` in the `<select>`'s `onChange` when switching to a non-`requiresDetail` option or to no selection (D-07).

**Hook consumption pattern** (line 24):
```typescript
const { items: frozenItems, isLoading } = useFrozenItems();
```
Add `const { sources: attributionSources, error: attributionSourcesError } = useAttributionSources();` alongside it. Per D-09, gate the dropdown's render on `!attributionSourcesError && attributionSources.length > 0` (hide entirely on failure, do not block submit or show an error to the customer).

**Submit body pattern** (lines 160-176, the `fetch("/api/checkout", ...)` body):
```typescript
body: JSON.stringify({
  dropId: drop.id,
  pickupOptionId,
  packageId: selectedPackageId,
  customer: {
    firstName: formState.firstName,
    lastName: formState.lastName,
    email: formState.email,
    phone: formState.phone || undefined
  },
  cart: items.map((item) => ({ /* ... */ }))
})
```
Add `attributionSourceCode: formState.attributionSourceCode || undefined, attributionDetail: formState.attributionDetail || undefined` to the `customer` object, following the exact `|| undefined` empty-string-to-undefined coercion already used for `phone`.

**Error/submitting state pattern** (lines 33-34, 138-196): unchanged — reuse `error`/`isSubmitting` state and the existing `try/catch` in `handleSubmit` verbatim; attribution fields are just additional form inputs feeding the same submit payload, no new error branch needed (submission validity is unaffected by attribution per D-04/D-09).

---

### `tests/attributionMetadata.test.ts` (new) — unit test

**Analog:** No direct unit-test analog exists for a pure, dependency-free `lib/square.ts` helper (the closest existing unit tests — `tests/checkoutLineItems.test.ts` — test a route handler with heavy mocking, not a pure function). Model instead on Vitest conventions visible across the repo (`describe`/`it`/`expect` from `"vitest"`, no mocking needed since `buildAttributionMetadata` has no I/O):
```typescript
import { describe, it, expect } from "vitest";
import { buildAttributionMetadata } from "../lib/square";

describe("buildAttributionMetadata", () => {
  it("returns undefined when no code is provided", () => {
    expect(buildAttributionMetadata({})).toBeUndefined();
  });
  it("truncates an oversized detail to 255 chars", () => { /* ... */ });
  it("never throws on garbage input", () => { /* ... */ });
});
```
Per RESEARCH.md's Wave 0 gap and D-10, this file must specifically assert: undefined-key omission when no code, truncation behavior, and no-throw behavior for adversarial input (e.g. extremely long strings, non-string-coercible values if the type system is bypassed).

---

### `tests/checkoutLineItems.test.ts` (extend) — unit test, request-response

**Analog:** itself (full file, 236 lines) — extend in place, or create a sibling `tests/checkoutAttribution.test.ts` using the identical scaffold if the planner prefers a dedicated file (RESEARCH.md allows either).

**Mocking scaffold pattern** (lines 1-61): copy verbatim — `vi.mock("server-only", ...)`, `vi.mock("next/server", ...)`, `vi.mock("next/headers", ...)`, `vi.mock("../lib/env", ...)`, the `createOrderMock`/`searchCustomerByEmailMock`/etc. `vi.fn()` mocks wired through `vi.mock("../lib/square", ...)`, `vi.mock("../lib/logger", ...)`, `vi.mock("../lib/idempotency", ...)`, the `supabaseMock` object and `vi.mock("../lib/supabase", ...)`, and `vi.mock("../lib/drops", () => ({ checkDropReady: () => ({ ok: true }) }))`. Add `buildAttributionMetadata` to the existing `vi.mock("../lib/square", ...)` block's returned object (currently missing — must be added even if the real implementation is used via `vi.importActual`, or stub it directly since it's pure).

**Assertion pattern** (lines 156-173, Test 1):
```typescript
it("Test 1: with packageId having bundleVariationId, createOrder receives exactly N cart line items (no phantom bundle line)", async () => {
  const cart = [ /* ... */ ];
  await callCheckout({ dropId: DROP_ID, pickupOptionId: PICKUP_ID, packageId: "family-night", customer: { /* ... */ }, cart });
  expect(createOrderMock).toHaveBeenCalledOnce();
  const callBody = createOrderMock.mock.calls[0][0] as { body: { order: { line_items: unknown[] } } };
  expect(callBody.body.order.line_items.length).toBe(2);
});
```
Add new tests asserting `callBody.body.order.metadata` shape: `{ attribution_source: "ai" }` when `attributionSourceCode` is present, `attribution_detail` present only when `attributionDetail` is present, and the key entirely absent (`undefined`) when neither is submitted (D-08, and the "no empty-object noise" requirement from RESEARCH.md's Test Map). Use `callCheckout({ ..., customer: { ...base, attributionSourceCode: "ai", attributionDetail: "ChatGPT" } })` following the exact `callCheckout` helper (lines 140-147) already defined in this file.

---

### `e2e/checkoutFlow.spec.ts` (extend) — E2E test

**Analog:** itself (full file, 94 lines) — extend in place

**Stub setup pattern** (`e2e/support/stubs.ts` lines 8-19, `stubFrozenItems`, and lines 38-56, `stubCheckout`):
```typescript
export async function stubFrozenItems(page: Page, items: FrozenItemDTO[] = frozenItemsFixture): Promise<void> {
  await page.route("**/api/frozen-items", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(items) })
  );
}

export async function stubCheckout(page: Page, response: CheckoutResponseBody): Promise<CheckoutStubHandle> {
  let capturedBody: unknown;
  await page.route("**/api/checkout", (route) => {
    capturedBody = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  return { getRequestBody: () => capturedBody };
}
```
Add a new `stubAttributionSources(page, sources: AttributionSourceDTO[])` helper to `e2e/support/stubs.ts` following the exact `stubFrozenItems` shape (`page.route("**/api/attribution-sources", ...)`), plus a new fixture file `e2e/fixtures/attributionSources.ts` mirroring `e2e/fixtures/frozenItems.ts`'s export-a-const-array pattern. Extend `stubCheckout`'s `getRequestBody()` usage in the existing "submitting checkout posts a valid body" test (lines 38-93) to additionally assert `body.customer.attributionSourceCode` / `body.customer.attributionDetail` when a source is selected in the new test(s) for D-06/D-07 (dropdown shows/hides detail input, clears stale detail on switch).

**Test structure pattern** (lines 13-21, `test.describe` + `beforeEach` skip-guard):
```typescript
test.describe("checkout flow", () => {
  test.beforeEach(async ({ request }) => {
    const active = await hasActiveDrop(request);
    test.skip(!active, "/checkout server-renders fetchActiveDrop() ...");
  });
  // ...
});
```
New attribution-specific tests belong inside this same `describe` block, reusing the identical `beforeEach` skip-guard (they depend on the same live-Supabase-drop precondition as the existing tests).

## Shared Patterns

### Server-only Supabase access
**Source:** `lib/drops.ts` line 1 (`import "server-only"`), `lib/supabase.ts` (`getSupabaseClient()`)
**Apply to:** `lib/attributionSources.ts`
```typescript
import "server-only";
import { getSupabaseClient } from "./supabase";
```
Never import `lib/supabase.ts` or the new `lib/attributionSources.ts` from a client component — matches the CONTEXT.md canonical-refs constraint and the existing repo-wide rule that Supabase access is server-only, mirrored by API routes only.

### Thin GET route → lib fetch function → NextResponse.json
**Source:** `app/api/frozen-items/route.ts` (full file)
**Apply to:** `app/api/attribution-sources/route.ts`
```typescript
export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();
  try {
    const data = await someLibFunction();
    return NextResponse.json(data);
  } catch (error) {
    logError("...", error, requestId);
    return NextResponse.json({ error: "...", requestId }, { status: 500 });
  }
}
export const runtime = "nodejs";
```

### Error handling / logError / requestId propagation
**Source:** `lib/logger.ts` (`logError`), used identically in `app/api/frozen-items/route.ts` and `app/api/checkout/route.ts`
**Apply to:** All new/modified API routes and any lib function that can throw
```typescript
const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();
try {
  // ...
} catch (error) {
  logError("Descriptive failure message", error, requestId);
  const status = error instanceof SquareError ? error.status : 500;
  return NextResponse.json({ error: "Customer-safe message.", requestId }, { status });
}
```

### Zod `.optional()` field extension mirroring `phone`
**Source:** `app/api/checkout/route.ts` line 95 (`phone: z.string().optional()`)
**Apply to:** `checkoutSchema.customer` new fields
```typescript
attributionSourceCode: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/).optional(),
attributionDetail: z.string().trim().min(1).max(255).optional()
```

### Fire-and-forget non-blocking side effect
**Source:** `notifySlackNewOrder` in `app/api/checkout/route.ts` lines 29-66
**Apply to:** D-01's Slack enrichment only (NOT the Square metadata write — see Anti-Patterns in RESEARCH.md; metadata rides inline in the existing `createOrder` call, it is not a separate fire-and-forget call)
```typescript
fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) })
  .catch((err) => { console.warn("Slack order notification failed", err); });
```

### `useX()` client-data-fetching hook shape
**Source:** `components/hooks/useFrozenItems.ts` (full file)
**Apply to:** `components/hooks/useAttributionSources.ts`
```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
interface XState { items: T[]; isLoading: boolean; error?: string; }
export function useX() {
  const [state, setState] = useState<XState>({ items: [], isLoading: true });
  const load = useCallback(async () => { /* fetch, cache: "no-store", normalize error */ }, []);
  useEffect(() => { void load(); }, [load]);
  return { ...state, reload: load };
}
```

### E2E route stubbing via `page.route`
**Source:** `e2e/support/stubs.ts` (`stubFrozenItems`, `stubCheckout`)
**Apply to:** new `stubAttributionSources` helper, `e2e/checkoutFlow.spec.ts` extensions
```typescript
export async function stubX(page: Page, data: T = fixtureDefault): Promise<void> {
  await page.route("**/api/x", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) })
  );
}
```

## No Analog Found

None. Every file in scope has at least a partial match in the existing codebase; `tests/attributionMetadata.test.ts` has no direct unit-test analog for a pure `lib/square.ts` helper specifically (see its Pattern Assignment above for the closest structural reference), but this is a well-understood Vitest gap, not a missing architectural pattern.

## Metadata

**Analog search scope:** `lib/`, `app/api/`, `components/`, `components/hooks/`, `tests/`, `e2e/`, `e2e/support/`, `e2e/fixtures/`
**Files scanned/read in full:** `lib/drops.ts`, `lib/square.ts`, `lib/types.ts`, `lib/supabase.ts`, `lib/logger.ts`, `lib/env.ts`, `lib/database.types.ts` (partial, drops/drop_pickup_options tables), `components/hooks/useFrozenItems.ts`, `app/api/frozen-items/route.ts`, `app/api/checkout/route.ts`, `components/CheckoutClient.tsx`, `tests/checkoutLineItems.test.ts`, `e2e/checkoutFlow.spec.ts`, `e2e/support/stubs.ts`
**Pattern extraction date:** 2026-08-28
