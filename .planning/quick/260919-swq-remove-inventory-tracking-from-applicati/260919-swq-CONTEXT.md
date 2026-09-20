# Quick Task 260919-swq: Remove inventory tracking from application (issue #38) - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Task Boundary

GitHub issue #38 (Yamatoberu/bigmattsbbq): remove the retired inventory-tracking
functionality from the application. Branch `claude/38-remove-inventory-tracking`
is already checked out off `origin/master` and the issue is claimed.

Everything below was verified against latest master on 2026-09-19/20 by the
orchestrator. The planner should NOT re-audit the database; use the evidence.

</domain>

<decisions>
## Implementation Decisions

### Application cleanup (all confirmed present on master)
- Delete `app/api/dev/set-inventory/route.ts` (whole directory `app/api/dev/`).
- `app/api/frozen-items/route.ts`: return `mapCatalogToFrozenItems(...)` output directly; drop the `batchRetrieveInventoryCounts`, `extractVariationIds`, `joinInventoryCounts` imports/calls.
- `lib/square.ts`: remove `batchRetrieveInventoryCounts()` (line ~97), `batchSetInventoryCounts()` (~234), `extractVariationIds()` (~303; no other callers), and the `remaining: 0` placeholder in `mapCatalogToFrozenItems` (~289). Keep catalog/customer/order/invoice functions untouched.
- `lib/types.ts`: remove `remaining: number` from `VariationDTO`.
- Delete `lib/normalizers.ts` and `tests/inventoryJoin.test.ts`.
- `components/FrozenItemCard.tsx`, `components/PackageCard.tsx`: remove `soldOut` prop, the `opacity-60` conditional, the `SoldOutCapture` branch and import. `OrderLanding.tsx` never passes `soldOut`.
- Delete `components/SoldOutCapture.tsx` (no callers after the above). `components/MailingListSection.tsx` and `POST /api/mailing-list` stay.
- `components/OrderLanding.tsx` line ~166: replace subtitle "Mix and match individual items while supplies last." with **"Mix and match individual items for this drop."** (user-chosen wording).
- `tests/packageMapping.test.ts`: remove `remaining:` fields from VariationDTO fixtures.
- `tests/checkoutDropGate.test.ts` line 13: rename "returns ok when drop is active and not sold out" → "returns ok when drop is active".
- `e2e/fixtures/frozenItems.ts`: remove `remaining:` fields. `e2e/browseFrozenItems.spec.ts` line 6: rename "renders in-stock items with prices and add-to-cart" → "renders items with prices and add-to-cart".
- `lib/database.types.ts`: remove the stale `place_preorder` Functions stub (function was dropped in migration 0018; its body referenced the nonexistent `drop_inventory` table). User approved.
- Add regression coverage for the catalog-only menu route: a Vitest test that mocks `lib/square` and `lib/env`, calls the `GET` handler in `app/api/frozen-items/route.ts`, and asserts (a) the response contains no `remaining` field and (b) no inventory function is invoked. Follow the mocking style of existing route tests (e.g. `tests/attributionSourcesRoute.test.ts`).

### Documentation
- `README.md`: line 37 `SQUARE_LOCATION_ID` description → drop "and inventory" (it is still used by checkout for `location_id` on orders/invoices — keep the var); line 58 "Returns frozen menu items with inventory counts." → catalog-only wording; remove line 61 `POST /api/dev/set-inventory`; line 84 "inventory count joins" → remove from tests list.
- `CLAUDE.md`: update line 22 data-flow bullet, line 34 normalizers row (remove), line 113 API route list, line 131 example function name (`joinInventoryCounts` → another real export e.g. `mapCatalogToFrozenItems`), line 137 (`isSoldOut` → another real boolean e.g. `isDisabled`), line 201, line 221, lines 259-261 (remove set-inventory entry point). Keep `.env.example` unchanged — all Square vars are still required by checkout.
- `public/security_review.md` line 72: append a resolution note to that row: endpoint removed by #38 (this PR); SEC-01's env-validation and test-seed portions remain in #22. User chose "add a resolution note".

### Database audit (DONE — no migration)
- Migration history 0001–0018: all `capacity_*`/`reserved_*` columns on `public.drops` and `public.drop_pickup_options`, plus `reserve_pickup_slot`/`release_pickup_slot`, were dropped in `0005_remove_capacity_enforcement.sql`; nothing re-added them. `0018` dropped the untracked `place_preorder` function (referenced nonexistent `drop_inventory`).
- Live read-only inspection on 2026-09-20 via Supabase MCP of production (`wpziabhigztyjrmjpmbw`) and test (`ujpviiulhibzztbricxu`): regex `(capacity|reserved|reserv|inventory|stock|on_hand|onhand|remaining|sold_out|soldout|available|avail_)` over `information_schema.columns/tables/triggers/sequences` and `pg_proc` names + bodies (schemas public, menu_costing, production, sca) returned **zero rows** on both. `public.drops` columns: `id,created_at,title,status,order_cutoff_at`; `public.drop_pickup_options`: `id,drop_id,location_label,pickup_date,pickup_start_date,pickup_end_date`.
- Intentionally retained: `menu_costing.*` (ingredient/packaging costing catalog — "inventory" only in comments), `production.*` (fulfillment scaffolding), `sca.*`, `public.orders`/`order_items` quantities.
- Decision: **no new migration**. Record this evidence in the SUMMARY and in the PR body. No seed script changes needed (`supabase/seed.sql` has no inventory refs).

### Out of scope
- `lib/env.ts` Square env validation and `app/api/test-seed` — remain in issue #22.
- No feature flags, no replacement stock counters.

### Claude's Discretion
- Exact wording of README/CLAUDE.md replacement sentences.
- Test file name for the new menu-route regression test (suggest `tests/frozenItemsRoute.test.ts`).

</decisions>

<specifics>
## Specific Ideas

Commit style: conventional prefix, one short line (`refactor: remove inventory tracking (#38)` etc.). Commit code and docs changes; the orchestrator commits `.planning/` artifacts separately. Do NOT push.

Verification the executor must run and report: `npm run lint`, `npm run build`, `npm test`, plus `grep -rn "remaining\|soldOut\|SoldOut\|Inventory\|normalizers\|set-inventory" app components lib tests e2e README.md CLAUDE.md` returning only intended hits (e.g. none in app/components/lib; `menu_costing` comments are in migrations only).

</specifics>

<canonical_refs>
## Canonical References

- GitHub issue #38: https://github.com/Yamatoberu/bigmattsbbq/issues/38
- Related: #22 (SEC-01 remaining work), #19 (security review)
- `supabase/migrations/0005_remove_capacity_enforcement.sql`, `0018_drop_dead_place_preorder.sql`

</canonical_refs>
