# Quick Task 260919-swq: Remove inventory tracking from application (issue #38) — Summary

**One-liner:** Deleted the dead Square Inventory read/write code path (`batchRetrieveInventoryCounts`, `batchSetInventoryCounts`, `extractVariationIds`, `joinInventoryCounts`, the sandbox `POST /api/dev/set-inventory` write endpoint, the `remaining` stock field, and the sold-out card UI), added a catalog-only regression test for `GET /api/frozen-items`, and scrubbed every doc reference — no database migration needed since Supabase never tracked inventory.

**Branch:** `claude/38-remove-inventory-tracking` (not pushed)
**Commits:**
- `d80bb60` — refactor: strip inventory tracking from server/lib layer (#38)
- `e84dded` — refactor: remove sold-out UI branch, add frozen-items regression test (#38)
- `dd57f53` — docs: remove stale inventory references from README/CLAUDE/security review (#38)

## What changed

### Deleted
- `app/api/dev/set-inventory/route.ts` (and the now-empty `app/api/dev/` directory)
- `lib/normalizers.ts` (`joinInventoryCounts`, no other callers)
- `tests/inventoryJoin.test.ts`
- `components/SoldOutCapture.tsx` (zero importers after the card cleanup)

### Edited
- `app/api/frozen-items/route.ts` — returns `mapCatalogToFrozenItems(...)` directly; no inventory batch-retrieve call; `env.locationId` no longer read here (still required by `lib/env.ts` for checkout)
- `lib/square.ts` — removed `batchRetrieveInventoryCounts`, `batchSetInventoryCounts`, `extractVariationIds`; `mapCatalogToFrozenItems` no longer emits `remaining: 0`
- `lib/types.ts` — `VariationDTO` no longer has `remaining: number`
- `lib/database.types.ts` — public `Functions` block replaced with `[_ in never]: never` (the `place_preorder` stub was for a function already dropped by migration 0018)
- `components/FrozenItemCard.tsx`, `components/PackageCard.tsx` — dropped `soldOut` prop, `opacity-60` conditional, and the `SoldOutCapture` ternary branch; every variation always renders the Add to Cart button
- `components/OrderLanding.tsx` — Individual Items subtitle changed to "Mix and match individual items for this drop."
- `tests/packageMapping.test.ts` — removed `remaining:` fields from `VariationDTO` fixtures
- `tests/checkoutDropGate.test.ts` — renamed test title to "returns ok when drop is active"
- `e2e/fixtures/frozenItems.ts` — removed `remaining:` fields from all 6 fixture variations
- `e2e/browseFrozenItems.spec.ts` — renamed test title to "renders items with prices and add-to-cart"
- `README.md` — `SQUARE_LOCATION_ID` description, `GET /api/frozen-items` description, removed `POST /api/dev/set-inventory` bullet, Tests list entry updated
- `CLAUDE.md` — data-flow bullet, lib modules table, Tests section, Inventory constraint, API route list, naming-pattern examples (`joinInventoryCounts`→`mapCatalogToFrozenItems`, `isSoldOut`→`isDisabled`, `InventoryCount` removed), architecture layer/entry-point descriptions all reworded to drop inventory references
- `public/security_review.md` — appended a **Resolved:** note to the `/api/dev/set-inventory` finding row: "endpoint removed by #38. SEC-01's env-validation and test-seed portions remain tracked in #22."

### Added
- `tests/frozenItemsRoute.test.ts` — 3 cases proving `GET /api/frozen-items` is catalog-only:
  1. response items/variations contain no `remaining` field
  2. only `searchCatalogItems`/`mapCatalogToFrozenItems` are called (no inventory function), plus a source-text regex guard against reintroducing `inventory|normalizers|extractVariationIds|remaining` in the route file
  3. a `SquareError` status passes through with a customer-safe error body and matching `requestId` logged via `logError`

## Database audit evidence (verbatim from CONTEXT.md — no migration written)

> ### Database audit (DONE — no migration)
> - Migration history 0001–0018: all `capacity_*`/`reserved_*` columns on `public.drops` and `public.drop_pickup_options`, plus `reserve_pickup_slot`/`release_pickup_slot`, were dropped in `0005_remove_capacity_enforcement.sql`; nothing re-added them. `0018` dropped the untracked `place_preorder` function (referenced nonexistent `drop_inventory`).
> - Live read-only inspection on 2026-09-20 via Supabase MCP of production (`wpziabhigztyjrmjpmbw`) and test (`ujpviiulhibzztbricxu`): regex `(capacity|reserved|reserv|inventory|stock|on_hand|onhand|remaining|sold_out|soldout|available|avail_)` over `information_schema.columns/tables/triggers/sequences` and `pg_proc` names + bodies (schemas public, menu_costing, production, sca) returned **zero rows** on both. `public.drops` columns: `id,created_at,title,status,order_cutoff_at`; `public.drop_pickup_options`: `id,drop_id,location_label,pickup_date,pickup_start_date,pickup_end_date`.
> - Intentionally retained: `menu_costing.*` (ingredient/packaging costing catalog — "inventory" only in comments), `production.*` (fulfillment scaffolding), `sca.*`, `public.orders`/`order_items` quantities.
> - Decision: **no new migration**. Record this evidence in the SUMMARY and in the PR body. No seed script changes needed (`supabase/seed.sql` has no inventory refs).

**Why no migration:** the application-layer inventory code being removed here (Square Inventory API calls, `remaining` field, sold-out UI) was already fully decoupled from the database — no `capacity`/`reserved`/`inventory`/`stock`/`remaining`/`sold_out`/`available` column, table, function, trigger, or sequence exists on either Supabase project as of this audit. There is nothing in the schema for this cleanup to touch.

## Full gate results

- **`npm run lint`**: exit 0, 7 pre-existing warnings (react-hooks/set-state-in-effect x2, react-hooks/exhaustive-deps, etc. from `260912-isg` triage list), 0 errors, 0 new warnings.
- **`npm run build`**: succeeded (Next.js 16.3.5, Turbopack). Route list confirms `/api/dev/set-inventory` no longer exists; all other routes compile.
- **`npm test`**: `Test Files 32 passed (32)` / `Tests 322 passed (322)` — matches the expected 321 − 2 (`inventoryJoin.test.ts`, deleted) + 3 (`frozenItemsRoute.test.ts`, new) = 322. `inventoryJoin` does not appear in the run output.
- **Grep gate**: `grep -rn "remaining\|soldOut\|SoldOut\|Inventory\|normalizers\|set-inventory" app components lib tests e2e README.md CLAUDE.md --exclude=frozenItemsRoute.test.ts` returned exactly one line:
  ```
  CLAUDE.md:64:- **Inventory**: not tracked — no stock counts from Square or Supabase; Square Catalog is the product source of truth
  ```
  This is the intended, reworded Inventory constraint line — the only acceptable hit per the plan.
- **`lib/database-sca.types.ts`**: checked separately per plan instruction — zero matches, no edit needed.
- **`git diff --quiet HEAD -- supabase lib/env.ts .env.example`**: exit 0 (no changes) — confirmed nothing under `supabase/`, `lib/env.ts`, or `.env.example` was touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Stale `.next/` generated types referenced the deleted route**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** `.next/types/validator.ts` and `.next/dev/types/validator.ts` (gitignored build artifacts from a prior `next dev`/`next build` run) still imported `app/api/dev/set-inventory/route.js`, which no longer exists, causing `tsc --noEmit` to fail with `TS2307: Cannot find module`.
- **Fix:** Removed the stale `.next/` directory (`rm -rf .next`, not tracked by git — confirmed via `.gitignore`). Regenerated cleanly during Task 3's `npm run build`.
- **Files modified:** none (build artifact only, no source change, no commit needed).

**2. [Rule 1 - Bug] `vi.mock` hoisting broke the new test's `SquareError` mock class**
- **Found during:** Task 2, first run of `tests/frozenItemsRoute.test.ts`
- **Issue:** Vitest hoists `vi.mock(...)` calls above all other module-level statements, including `class SquareError extends Error {...}` declared as a plain `const`-adjacent class before the mock factory. This produced `ReferenceError: Cannot access 'SquareError' before initialization`.
- **Fix:** Wrapped the class declaration in `vi.hoisted(() => {...})`, which Vitest hoists together with the mock call, resolving the ordering issue. Mirrors Vitest's documented pattern for this exact case.
- **Files modified:** `tests/frozenItemsRoute.test.ts`
- **Commit:** `e84dded`

**3. [Rule 1 - Bug] TS2352 unsafe cast on `response.body` in the new test**
- **Found during:** Task 2, `npx tsc --noEmit` after Vitest passed
- **Issue:** `GET`'s real return type is `Promise<NextResponse>` (the mock only changes runtime behavior, not the imported type), so casting `response.body` directly to the fixture array type triggered `TS2352` (insufficient overlap with `ReadableStream<Uint8Array>`).
- **Fix:** Cast through `unknown` first (`response.body as unknown as typeof fixture`), matching the existing pattern in `tests/attributionSourcesRoute.test.ts`.
- **Files modified:** `tests/frozenItemsRoute.test.ts`
- **Commit:** `e84dded`

No architectural changes, no auth gates, no out-of-scope fixes deferred.

## Known Stubs

None. No hardcoded empty/placeholder values were introduced — the sold-out UI branch was removed entirely rather than stubbed, and the frozen-items route returns real catalog data with no dead code paths left behind.

## Self-Check: PASSED

All created/edited files confirmed present, all deleted files confirmed absent, and all three commit hashes (`d80bb60`, `e84dded`, `dd57f53`) confirmed present in `git log`.
