---
phase: quick-260919-swq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/dev/set-inventory/route.ts
  - app/api/frozen-items/route.ts
  - lib/square.ts
  - lib/types.ts
  - lib/normalizers.ts
  - lib/database.types.ts
  - tests/inventoryJoin.test.ts
  - tests/packageMapping.test.ts
  - tests/checkoutDropGate.test.ts
  - tests/frozenItemsRoute.test.ts
  - e2e/fixtures/frozenItems.ts
  - e2e/browseFrozenItems.spec.ts
  - components/FrozenItemCard.tsx
  - components/PackageCard.tsx
  - components/SoldOutCapture.tsx
  - components/OrderLanding.tsx
  - README.md
  - CLAUDE.md
  - public/security_review.md
autonomous: true
requirements: [ISSUE-38]
tags: [cleanup, square, inventory, refactor]

must_haves:
  truths:
    - "GET /api/frozen-items returns catalog items whose variations carry no `remaining` field and never calls a Square Inventory endpoint"
    - "POST /api/dev/set-inventory no longer exists (404 in every environment)"
    - "Product and package cards never render a sold-out state; every variation shows an Add to Cart button"
    - "The Individual Items section subtitle reads 'Mix and match individual items for this drop.'"
    - "npm run lint, npm run build, and npm test all pass with tests/inventoryJoin.test.ts gone and tests/frozenItemsRoute.test.ts added"
    - "README.md, CLAUDE.md, and public/security_review.md no longer describe inventory joins or the set-inventory endpoint"
  artifacts:
    - path: "app/api/frozen-items/route.ts"
      provides: "Catalog-only GET handler"
      contains: "mapCatalogToFrozenItems"
    - path: "tests/frozenItemsRoute.test.ts"
      provides: "Regression coverage that the menu route is catalog-only"
      min_lines: 40
    - path: "lib/types.ts"
      provides: "VariationDTO without `remaining`"
    - path: "lib/database.types.ts"
      provides: "Empty public Functions block (place_preorder stub removed)"
      contains: "Functions: {"
  key_links:
    - from: "app/api/frozen-items/route.ts"
      to: "lib/square.ts"
      via: "searchCatalogItems + mapCatalogToFrozenItems only"
      pattern: "mapCatalogToFrozenItems\\(\\{ items, relatedObjects \\}\\)"
    - from: "tests/frozenItemsRoute.test.ts"
      to: "app/api/frozen-items/route.ts"
      via: "imports GET with lib/square and lib/env mocked"
      pattern: "from \"../app/api/frozen-items/route\""
---

<objective>
Remove the retired inventory-tracking functionality from the application (GitHub issue #38): the Square Inventory API calls, the `remaining` stock field, the sandbox-only `set-inventory` write endpoint, the sold-out card UI, and every doc/test reference to them. Add a regression test proving the frozen-items menu route is catalog-only.

Purpose: Stock is no longer tracked anywhere (Square inventory reads were replaced by drop-level gating, then capacity enforcement was removed in #13). The leftover code is dead, the `set-inventory` route is an unauthenticated write surface (flagged in `public/security_review.md`), and the `remaining: 0` placeholder misleads readers into thinking stock is still tracked.

Output: Deleted `app/api/dev/`, `lib/normalizers.ts`, `components/SoldOutCapture.tsx`, `tests/inventoryJoin.test.ts`; trimmed `lib/square.ts`, `lib/types.ts`, `lib/database.types.ts`, the frozen-items route, three components, three test/e2e files; new `tests/frozenItemsRoute.test.ts`; updated README.md, CLAUDE.md, public/security_review.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260919-swq-remove-inventory-tracking-from-applicati/260919-swq-CONTEXT.md
@./CLAUDE.md

Branch and git rules (from CONTEXT.md and CLAUDE.md, non-negotiable):
- The repo is ALREADY on branch `claude/38-remove-inventory-tracking`. Do NOT create, switch, or rebase branches. Do NOT push.
- Commit code/doc changes with a conventional one-line subject (e.g. `refactor: remove inventory tracking (#38)`). The orchestrator commits `.planning/` artifacts separately — do not stage `.planning/`.
- The database audit is DONE (CONTEXT.md "Database audit" section). Write NO migration, touch NO `supabase/` files, and do NOT change `lib/env.ts` or `.env.example` — all Square env vars remain required by checkout.

<interfaces>
<!-- Current state of the code being removed/edited. Executor should work from these directly. -->

From app/api/frozen-items/route.ts (current, lines 4-11 and 30-43):
```typescript
import { joinInventoryCounts } from "../../../lib/normalizers";
import {
  batchRetrieveInventoryCounts,
  extractVariationIds,
  mapCatalogToFrozenItems,
  searchCatalogItems,
  SquareError
} from "../../../lib/square";
// ...
    const frozenItems = mapCatalogToFrozenItems({ items, relatedObjects });
    const variationIds = extractVariationIds(frozenItems);
    const inventory = await batchRetrieveInventoryCounts({ host: env.host, accessToken: env.accessToken, locationId: env.locationId, variationIds, requestId });
    const withInventory = joinInventoryCounts(frozenItems, inventory.counts ?? []);
    return NextResponse.json(withInventory);
```

From lib/square.ts — exports to DELETE (line numbers current as of master):
```typescript
export async function batchRetrieveInventoryCounts(params: {...})   // line 97, ends line 121
export async function batchSetInventoryCounts(params: {...})        // line 234, ends line 259
export function extractVariationIds(items: FrozenItemDTO[])         // line 303, ends line 305
// inside mapCatalogToFrozenItems (line ~289): the object literal key  `remaining: 0`
```
Keep untouched: `SQUARE_VERSION`, `SquareError`, `squareFetch`, `searchCatalogItems`, `searchCustomerByEmail`, `createCustomer`, `createOrder`, `createInvoice`, `publishInvoice`, `mapCatalogToFrozenItems` (minus the `remaining` key), `truncateToByteLimit`, `buildAttributionMetadata`, and every other export.

From lib/types.ts (line 1-7):
```typescript
export interface VariationDTO {
  variationId: string;
  name: string;
  priceCents: number;
  currency: string;
  remaining: number;   // <- remove this line
}
```

From lib/database.types.ts (lines 282-295) — the stale stub to replace:
```typescript
    Functions: {
      place_preorder: {
        Args: { p_drop_id: number; p_email: string; p_full_name: string; p_items: Json; p_opt_in?: boolean; p_phone?: string; p_pickup_id: number }
        Returns: Json
      }
    }
```
Replace the whole block with the generated-types empty form already used for Views/Enums in the same file and for Functions in lib/database-sca.types.ts line 347:
```typescript
    Functions: {
      [_ in never]: never
    }
```

From components/FrozenItemCard.tsx (lines 5, 10, 13, 17, 53-62): `import { SoldOutCapture }`, `soldOut?: boolean` prop, `soldOut = false` default, the `${soldOut ? " opacity-60" : ""}` className suffix, and the `{soldOut ? (<SoldOutCapture />) : (<button ...>Add to Cart</button>)}` ternary — the button branch is the only branch to keep.

From components/PackageCard.tsx (lines 5, 12, 15, 52-61): same shape — `import { SoldOutCapture }`, `soldOut?: boolean`, `soldOut = false`, and the `{soldOut ? (<SoldOutCapture />) : (<button className="button-primary" onClick={onAdd} disabled={isDisabled}>Add to Cart</button>)}` ternary. PackageCard has no `opacity-60` conditional. Keep `isDisabled`.

From components/OrderLanding.tsx line 166:
```tsx
              subtitle="Mix and match individual items while supplies last."
```

Mocking style to mirror for the new route test — tests/attributionSourcesRoute.test.ts:
```typescript
vi.mock("next/server", () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) } }));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve({ get: (_: string) => null }) }));
vi.mock("../lib/logger", () => ({ logError: vi.fn() }));
// module-scoped vi.fn() handles, wired via vi.mock("../lib/<module>", () => ({ fn: (...args) => handle(...args) }))
import { GET } from "../app/api/<route>/route";
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Strip inventory code from the server/lib layer and fix compile-coupled tests and fixtures</name>
  <files>app/api/dev/set-inventory/route.ts, app/api/frozen-items/route.ts, lib/square.ts, lib/types.ts, lib/normalizers.ts, lib/database.types.ts, tests/inventoryJoin.test.ts, tests/packageMapping.test.ts, tests/checkoutDropGate.test.ts, e2e/fixtures/frozenItems.ts, e2e/browseFrozenItems.spec.ts</files>
  <action>
All edits below are locked decisions from CONTEXT.md "Application cleanup". Use `git rm` for deletions so the removals are staged.

1. Delete `app/api/dev/set-inventory/route.ts` and remove the now-empty `app/api/dev/` directory entirely (`git rm -r app/api/dev`). Nothing else lives under `app/api/dev/`.
2. Delete `lib/normalizers.ts` and `tests/inventoryJoin.test.ts` (`git rm`). `joinInventoryCounts` has no other callers.
3. `app/api/frozen-items/route.ts`: remove the `joinInventoryCounts` import line and drop `batchRetrieveInventoryCounts` and `extractVariationIds` from the `../../../lib/square` import (keep `mapCatalogToFrozenItems`, `searchCatalogItems`, `SquareError`). Replace lines 30-43 with a single `const frozenItems = mapCatalogToFrozenItems({ items, relatedObjects });` followed by `return NextResponse.json(frozenItems);`. Leave the `headers()`/`requestId`, `getSquareEnv()`, `searchCatalogItems(...)` call, and the catch block exactly as they are. Note `env.locationId` is no longer read in this route — that is expected; the variable stays required in `lib/env.ts` because checkout uses it.
4. `lib/square.ts`: delete the three functions `batchRetrieveInventoryCounts` (~97-121), `batchSetInventoryCounts` (~234-259), and `extractVariationIds` (~303-305), each including its blank-line separator so no double blank lines remain. Inside `mapCatalogToFrozenItems`, remove the `remaining: 0` key and the trailing comma on the preceding `currency:` line so the object literal stays valid. Do not touch any other function.
5. `lib/types.ts`: remove `remaining: number;` from `VariationDTO`.
6. `lib/database.types.ts`: replace the entire `place_preorder` entry inside the public `Functions:` block with `[_ in never]: never` (see interfaces block). The function was dropped by migration 0018; this is a types-only edit — no migration.
7. `tests/packageMapping.test.ts`: remove the four `, remaining: N` fields from the VariationDTO fixture literals on lines 22, 30, 59, 60 (they would now be TS excess-property errors).
8. `tests/checkoutDropGate.test.ts` line 13: rename the test title to `"returns ok when drop is active"`.
9. `e2e/fixtures/frozenItems.ts`: remove the six `remaining: N` lines (and the trailing comma on the preceding `currency: "USD"` line in each variation) so each variation object ends at `currency: "USD"`.
10. `e2e/browseFrozenItems.spec.ts` line 6: rename the test title to `"renders items with prices and add-to-cart"`. No other change to the spec.

Do not add replacement stock counters, feature flags, or any new field. Do not edit `lib/env.ts`, `.env.example`, or anything under `supabase/`.
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && test ! -e app/api/dev && test ! -e lib/normalizers.ts && test ! -e tests/inventoryJoin.test.ts && ! grep -rn "remaining\|Inventory\|normalizers\|extractVariationIds\|place_preorder" app lib e2e tests/packageMapping.test.ts && npx tsc --noEmit && npx vitest run tests/packageMapping.test.ts tests/checkoutDropGate.test.ts</automated>
  </verify>
  <done>`app/api/dev/`, `lib/normalizers.ts`, and `tests/inventoryJoin.test.ts` are gone; `lib/square.ts` exports no inventory functions and `mapCatalogToFrozenItems` emits no `remaining`; `VariationDTO` has no `remaining`; `lib/database.types.ts` public `Functions` is `[_ in never]: never`; `npx tsc --noEmit` is clean; the two edited unit test files pass; the grep in verify returns no hits.</done>
</task>

<task type="auto">
  <name>Task 2: Remove the sold-out UI branch and add the catalog-only menu-route regression test</name>
  <files>components/FrozenItemCard.tsx, components/PackageCard.tsx, components/SoldOutCapture.tsx, components/OrderLanding.tsx, tests/frozenItemsRoute.test.ts</files>
  <action>
Component cleanup (locked decisions from CONTEXT.md):

1. `components/FrozenItemCard.tsx`: remove the `SoldOutCapture` import; remove `soldOut?: boolean` from `FrozenItemCardProps`; change the destructure to `{ item, onAdd }`; change the `<article className=...>` to the plain string `"glass-card flex h-full flex-col gap-4 p-5"` (no template literal, no `opacity-60`); replace the `{soldOut ? (<SoldOutCapture />) : (<button ...>Add to Cart</button>)}` ternary with just the `<button>` element, preserving its `className="button-primary px-4 py-2 text-xs"` and `onClick={() => onAdd(variation.variationId)}`.
2. `components/PackageCard.tsx`: remove the `SoldOutCapture` import; remove `soldOut?: boolean` from `PackageCardProps`; change the destructure to `{ pkg, priceCents, onAdd, isDisabled }`; replace the ternary with just the `<button className="button-primary" onClick={onAdd} disabled={isDisabled}>Add to Cart</button>`.
3. Delete `components/SoldOutCapture.tsx` (`git rm`). After steps 1-2 it has zero importers; `components/MailingListSection.tsx` and `POST /api/mailing-list` stay untouched.
4. `components/OrderLanding.tsx` line 166: change the subtitle to exactly `"Mix and match individual items for this drop."` (user-chosen wording). `OrderLanding` never passed `soldOut`, so no prop-site edits are needed.

New regression test — create `tests/frozenItemsRoute.test.ts` (file name is Claude's discretion per CONTEXT.md; use this one). Mirror the mocking style of `tests/attributionSourcesRoute.test.ts` exactly (see interfaces block): mock `next/server` (`NextResponse.json` returning `{ body, status }`), `next/headers` (`headers()` resolving to `{ get: () => null }`), and `../lib/logger` (`logError: vi.fn()`). Additionally:
- Mock `../lib/env` so `getSquareEnv` returns a fixed object `{ host: "https://connect.squareupsandbox.com", accessToken: "test-token", locationId: "loc-1", frozenCategoryId: "cat-frozen", sauceVariationId: "var-sauce", environment: "sandbox" }`.
- Mock `../lib/square` with ONLY three exports: `searchCatalogItems` (module-scoped `vi.fn()` handle), `mapCatalogToFrozenItems` (module-scoped `vi.fn()` handle), and `SquareError` (a minimal `class SquareError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }`). Deliberately do NOT define any inventory export on the mock: if the route ever imports `batchRetrieveInventoryCounts`/`extractVariationIds` again, Vitest throws on the missing mock export and the test fails — that is the "no inventory function is invoked" guard.
- Import `{ GET } from "../app/api/frozen-items/route"` after the mocks, and `readFileSync` from `node:fs` plus `resolve` from `node:path` for the source-text assertion below.
- `beforeEach(() => vi.clearAllMocks())`.

Three `it` cases inside `describe("GET /api/frozen-items")`:
  (a) "returns the mapped catalog items without a remaining field": `searchCatalogItems` resolves `{ items: [], relatedObjects: [] }`; `mapCatalogToFrozenItems` returns a two-item fixture whose variations have only `variationId`, `name`, `priceCents`, `currency`. Assert `status === 200`, `body` `toEqual` the fixture, and that `JSON.stringify(body)` does not contain the substring `"remaining"`; also iterate every `variation` in `body` and assert `"remaining" in variation` is false.
  (b) "calls only the catalog functions — no inventory lookup": same happy-path arrangement. Assert `searchCatalogItems` was called exactly once with an object containing `categoryId: "cat-frozen"` and `accessToken: "test-token"` (`expect.objectContaining`), `mapCatalogToFrozenItems` called exactly once, and — as the durable source-level guard — that `readFileSync(resolve(__dirname, "../app/api/frozen-items/route.ts"), "utf8")` does not match `/inventory|normalizers|extractVariationIds|remaining/i`.
  (c) "passes a SquareError status through with a customer-safe body": `searchCatalogItems` rejects with `new SquareError("catalog unavailable", 503)`. Assert `status === 503`, `body.error` is a string not containing `"catalog unavailable"`, `body.requestId` is a string, and `logError` was called exactly once with `call[2] === body.requestId` (same pattern as the attribution route test).

No `server-only` mock is needed — the route does not import it (verify with grep before adding one; only add `vi.mock("server-only", () => ({}))` if `npx vitest run` complains).
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && test ! -e components/SoldOutCapture.tsx && ! grep -rn "soldOut\|SoldOut\|opacity-60\|while supplies last" components app && grep -q 'subtitle="Mix and match individual items for this drop."' components/OrderLanding.tsx && npx vitest run tests/frozenItemsRoute.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>`FrozenItemCard` and `PackageCard` have no `soldOut` prop and always render the Add to Cart button; `SoldOutCapture.tsx` is deleted with zero remaining importers; the Individual Items subtitle is the user-chosen wording; `tests/frozenItemsRoute.test.ts` exists with the three cases above, all passing; `npx tsc --noEmit` is clean.</done>
</task>

<task type="auto">
  <name>Task 3: Update docs, run the full gate, and commit</name>
  <files>README.md, CLAUDE.md, public/security_review.md</files>
  <action>
Doc edits (locations locked by CONTEXT.md "Documentation"; exact replacement wording is Claude's discretion — keep it terse and factual):

1. `README.md`:
   - Line 37: `SQUARE_LOCATION_ID`: Square location for pickup and inventory` → `SQUARE_LOCATION_ID`: Square location used for orders and invoices at checkout` (the var stays required; only the description changes).
   - Line 58: `Returns frozen menu items with inventory counts.` → `Returns frozen menu items and prices from the Square Catalog.`
   - Lines 61-62: delete the `POST /api/dev/set-inventory` bullet and its `Updates physical counts for testing.` sub-bullet.
   - Line 84: delete the `- inventory count joins` bullet; add `- frozen-items menu route (catalog only)` in its place so the Tests list stays accurate.
2. `CLAUDE.md` — every stale reference, so the grep gate below is clean. Do not restructure sections; edit in place:
   - Line 18: drop the word "inventory" from "all catalog, inventory, and payment data flows through the Square API" → "catalog and payment data flow through the Square API" (leave the rest of the sentence as-is).
   - Line 22 (data-flow bullet 1): rewrite to say `useFrozenItems` fetches `GET /api/frozen-items`, which calls Square's Catalog API and returns `FrozenItemDTO[]` via `mapCatalogToFrozenItems()` in `lib/square.ts`. No mention of Inventory or `joinInventoryCounts`.
   - Line 34: delete the `lib/normalizers.ts` table row.
   - Line 50: "Three test files in `tests/` cover inventory join logic, package-to-cart-item mapping, and sauce bump logic." → replace "inventory join logic" with "the catalog-only frozen-items route" (and drop the word "Three" — say "Test files in `tests/` cover ...").
   - Line 65: rewrite the Constraints bullet to `**Inventory**: not tracked — no stock counts from Square or Supabase; Square Catalog is the product source of truth`.
   - Line 113: delete the `app/api/dev/set-inventory/route.ts - POST (sandbox only)` bullet.
   - Line 128: remove `normalizers.ts` from the Lib modules example list.
   - Line 131: replace `joinInventoryCounts` with `mapCatalogToFrozenItems`.
   - Line 137: replace `isSoldOut` with `isDisabled`.
   - Line 142: remove `InventoryCount` from the internal-only interfaces example list.
   - Line 192: drop "inventory" from "catalog, inventory, customers, and orders" → "catalog, customers, and orders".
   - Line 201: remove `POST /api/dev/set-inventory` from the Contains list.
   - Line 202: remove `lib/normalizers.ts` from the Depends-on list.
   - Line 211: remove `normalizers.ts` from the lib Contains list.
   - Line 219: "Normalized representation of a Square catalog item with inventory counts" → "Normalized representation of a Square catalog item and its variations".
   - Line 221: "Created by: `mapCatalogToFrozenItems` + `joinInventoryCounts` in `lib/square.ts` and `lib/normalizers.ts`" → "Created by: `mapCatalogToFrozenItems` in `lib/square.ts`".
   - Line 255: "Fetch and merge Square catalog + inventory, return `FrozenItemDTO[]`" → "Fetch the Square catalog category, return `FrozenItemDTO[]`".
   - Lines 259-261 (and the blank line before them): delete the `app/api/dev/set-inventory/route.ts` entry-point block (Location/Triggers/Responsibilities).
   Do NOT edit the auto-generated "This is NOT the Next.js you know" block or the Developer Profile block. Keep `.env.example` unchanged.
3. `public/security_review.md` line 72 (the `/api/dev/set-inventory` unauthenticated write` row in "Findings Reviewed and Excluded"): append to the "Why Excluded" cell, after the existing sentence, ` **Resolved:** endpoint removed by #38. SEC-01's env-validation and test-seed portions remain tracked in #22.` — user chose "add a resolution note" rather than deleting the row.

Full gate (all must pass; report each result in the SUMMARY):
- `npm run lint` (exit 0; the 7 pre-existing warnings from 260912-isg are acceptable, no new warnings/errors).
- `npm run build`.
- `npm test` (expect the total to be 321 minus the 2 `inventoryJoin` cases plus the 3 new `frozenItemsRoute` cases; confirm `inventoryJoin` no longer appears in the run output).
- Grep gate: `grep -rn "remaining\|soldOut\|SoldOut\|Inventory\|normalizers\|set-inventory" app components lib tests e2e README.md CLAUDE.md --exclude=frozenItemsRoute.test.ts`. The ONLY acceptable hits are: `CLAUDE.md` line 65 (`**Inventory**: not tracked ...`) and the `public/security_review.md` row is outside the searched paths. `lib/database-sca.types.ts` is generated and has no matches today; if it shows a hit, do NOT edit it — report it instead. Zero hits are permitted in `app/`, `components/`, `lib/`, `tests/` (excluding the new test), and `e2e/`.
- `git status` must show no changes under `supabase/`, `lib/env.ts`, or `.env.example`.

Commit: stage exactly the files in this plan's `files_modified` (including the deletions) — never `.planning/`. Use one short conventional subject line, e.g. `refactor: remove inventory tracking (#38)`; per-task commits are fine if the executor workflow commits per task, but every subject must be one short line with a conventional prefix. Do NOT push and do NOT open a PR — the orchestrator handles PR creation (the PR body must cite the CONTEXT.md database-audit evidence: zero inventory/capacity/reserved columns, functions, triggers, or sequences on production `wpziabhigztyjrmjpmbw` and test `ujpviiulhibzztbricxu` as of 2026-09-20; migrations 0005 and 0018 already dropped everything; no new migration). Record that same evidence verbatim in the SUMMARY.
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && npm run lint && npm run build && npm test && test "$(grep -rn "remaining\|soldOut\|SoldOut\|Inventory\|normalizers\|set-inventory" app components lib tests e2e README.md CLAUDE.md --exclude=frozenItemsRoute.test.ts | grep -v '^CLAUDE.md:.*\*\*Inventory\*\*: not tracked' | wc -l)" -eq 0 && grep -q "endpoint removed by #38" public/security_review.md && git diff --quiet HEAD -- supabase lib/env.ts .env.example</automated>
  </verify>
  <done>README.md, CLAUDE.md, and public/security_review.md carry no stale inventory/normalizers/set-inventory references (only the reworded CLAUDE.md Inventory constraint remains); lint, build, and the full Vitest suite pass; the grep gate is clean; nothing under `supabase/`, `lib/env.ts`, or `.env.example` changed; all code and doc changes are committed on `claude/38-remove-inventory-tracking` with conventional one-line subjects, nothing pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| public internet → `/api/dev/set-inventory` | Previously an unauthenticated POST that wrote Square inventory counts, gated only by `SQUARE_ENV === "sandbox"`. Removed by this plan. |
| public internet → `GET /api/frozen-items` | Unauthenticated read; response shape shrinks (no `remaining`). No new input surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-38-01 | Tampering | `app/api/dev/set-inventory/route.ts` | mitigate | Delete the route and `batchSetInventoryCounts`; Task 3 grep gate and `test ! -e app/api/dev` prove it cannot be reintroduced silently. Resolution note added to `public/security_review.md`. |
| T-38-02 | Information Disclosure | `GET /api/frozen-items` error path | mitigate | Existing customer-safe error body + `logError` retained unchanged; `tests/frozenItemsRoute.test.ts` case (c) asserts the raw Square message never reaches the client. |
| T-38-03 | Denial of Service | `GET /api/frozen-items` | accept | Removing the Inventory batch-retrieve call halves outbound Square requests per page load; no new risk introduced. |
| T-38-SC | Tampering | npm/pip/cargo installs | accept | No package installs in this plan (`package.json`/lockfile untouched). |
</threat_model>

<verification>
- `npx tsc --noEmit` clean after Task 1 and Task 2.
- `npx vitest run tests/frozenItemsRoute.test.ts` passes (3 cases) after Task 2.
- `npm run lint`, `npm run build`, `npm test` all pass after Task 3.
- Grep gate `grep -rn "remaining\|soldOut\|SoldOut\|Inventory\|normalizers\|set-inventory" app components lib tests e2e README.md CLAUDE.md --exclude=frozenItemsRoute.test.ts` returns only the reworded CLAUDE.md Inventory constraint line.
- `git diff --quiet HEAD -- supabase lib/env.ts .env.example` succeeds (no migration, no env changes).
- `git branch --show-current` is `claude/38-remove-inventory-tracking`; `git log origin/claude/38-remove-inventory-tracking..HEAD` shows the new commit(s) unpushed (or the remote branch does not exist yet).
</verification>

<success_criteria>
- `app/api/dev/`, `lib/normalizers.ts`, `components/SoldOutCapture.tsx`, `tests/inventoryJoin.test.ts` deleted.
- `lib/square.ts` no longer exports `batchRetrieveInventoryCounts`, `batchSetInventoryCounts`, or `extractVariationIds`; `mapCatalogToFrozenItems` emits no `remaining`.
- `VariationDTO` has no `remaining`; all fixtures (`tests/packageMapping.test.ts`, `e2e/fixtures/frozenItems.ts`) updated; `lib/database.types.ts` public `Functions` is empty.
- `GET /api/frozen-items` returns `mapCatalogToFrozenItems(...)` directly; `tests/frozenItemsRoute.test.ts` proves catalog-only behavior.
- `FrozenItemCard`/`PackageCard` have no `soldOut` prop; Individual Items subtitle reads "Mix and match individual items for this drop."
- Two test titles renamed (`checkoutDropGate`, `browseFrozenItems`).
- README.md, CLAUDE.md, public/security_review.md updated as specified; `.env.example`, `lib/env.ts`, `supabase/` untouched.
- Lint, build, full test suite, and grep gate all pass; changes committed on the existing branch, not pushed.
</success_criteria>

<output>
Create `.planning/quick/260919-swq-remove-inventory-tracking-from-applicati/260919-swq-SUMMARY.md` when done. Include: the list of deleted/edited files, the final `npm test` count, the lint/build results, the grep-gate output, the commit hash(es), and the verbatim database-audit evidence from CONTEXT.md (zero inventory/capacity rows on both Supabase projects; migrations 0005/0018 already dropped everything; no new migration written).
</output>
