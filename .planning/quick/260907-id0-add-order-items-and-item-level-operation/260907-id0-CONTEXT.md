# Quick Task 260907-id0: Add order_items and item-level operational reporting support (Issue #3) - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Task Boundary

Add a first-party `order_items` table (FK to `orders.id`, added in issue #9) so operations
can reliably know what each checkout contains — product/variant identifiers, a display name
snapshot, quantity, and a price snapshot — without depending on Square order-creation timing
or trusting client-submitted names/prices (GitHub issue #3, blocked by #9 which is now
resolved and verified live).

Also resolve the checkout payload's dead second line-item shape: `app/api/checkout/route.ts`
has an `orderItems` field (schema + `(parsed.data.orderItems ?? cart)` fallback) that is never
populated by `components/CheckoutClient.tsx` or anywhere else in the codebase — confirmed by a
full-repo grep. `cart` is always what's actually sent to Square today. `lib/cart.ts`'s
`resolvePackageToCartItems()` already expands package/bundle configs into flat, real Square
`variationId` entries client-side before they reach the cart, so there is no bundle-level
catalog object needing server-side expansion. `parsed.data.cart` (the same array `orders`
already stores verbatim as `cart_snapshot` since #9) is the single source of truth for
`order_items`. Delete the dead `orderItems` field/schema/fallback as part of this task.

</domain>

<decisions>
## Implementation Decisions

### Snapshot source & timing
- Do a dedicated Square Catalog lookup — reuse the existing `searchCatalogItems()` +
  `mapCatalogToFrozenItems()` (already used by `app/api/frozen-items/route.ts`) — server-side,
  immediately after drop/pickup validation and **before any Square order/customer/invoice
  call**. This produces a `variationId -> {name, priceCents}` map used to build the
  server-derived, non-client-trusted name/price snapshot for every cart line.
- This costs one extra Square API round-trip on every checkout. Accepted tradeoff: line items
  then exist even for `order_status = 'failed'` rows (see below), and the snapshot source is
  independent of whether the Square order call itself later succeeds.
- If the Catalog lookup call itself fails (Square API error), treat it as fatal — return a 500
  before the `orders` row is even inserted, the same way #9 treats its own insert failure as
  fatal. Do not insert a partial/incomplete order.
- If a cart entry's `variationId` isn't found in the returned catalog map (stale/tampered id),
  also treat it as fatal for the whole checkout (a clear error response) rather than silently
  dropping that line or inserting a placeholder. Square would eventually reject an invalid
  `catalog_object_id` anyway — failing earlier with a clearer message is strictly better.

### Atomicity ("no partial writes")
- Sequential inserts from the route: insert the `orders` row (as #9 already does), then insert
  `order_items` rows. If the items insert fails, delete the just-inserted `orders` row and
  return the same 500 shape the order-insert failure path already returns (matches #9's
  `markOrderFailed`-adjacent style — plain PostgREST calls, no new Postgres function).
- No Postgres RPC/transaction function. This intentionally does not reintroduce the kind of
  `SECURITY DEFINER` RPC pattern #13 removed (that removal was about capacity-reservation
  logic specifically, not about RPCs in general — but the simpler compensating-delete approach
  is preferred here and matches #9's established style).
- Not literally crash-proof (a process death between the two writes could theoretically orphan
  an `orders` row with no items), but acceptable at this app's volume — consistent with the
  risk tolerance already expressed when the capacity-enforcement system was removed (#13) for
  being unnecessary at current order volume.

### Items on failure
- Write `order_items` for **every** inserted `orders` row, including ones that end up
  `order_status = 'failed'` after a later Square call fails (customer create, order create,
  invoice create/publish). This is only possible because the snapshot is built before any
  Square call — order and items are inserted together immediately after drop/pickup
  validation, before the Square `try` block that #9 introduced.
- This matches #9's audit-trail philosophy: a failed row still shows exactly what was
  attempted, at the line-item level.

### Claude's Discretion
- Exact `order_items` column set beyond what the issue specifies. Recommended shape, following
  this repo's existing snake_case / nullable-only-when-truly-optional conventions:
  - `id uuid primary key default gen_random_uuid()`
  - `order_id uuid not null references public.orders(id) on delete cascade`
  - `variation_id text not null` (Square catalog variation id — the identifier this codebase
    already uses everywhere, e.g. `CartItem.variationId`)
  - `item_id text` (Square catalog parent item id, e.g. `FrozenItemDTO.itemId` — cheap to
    include from the same catalog lookup, useful for future grouping/reporting even though
    every current catalog item has exactly one variation)
  - `item_name text not null` (catalog item name snapshot, e.g. `"Brisket"`)
  - `variation_name text not null` (catalog variation name snapshot, e.g. `"Regular"` — stored
    separately from `item_name` rather than pre-combined, since combining them into a single
    display string is presentation logic and production counts/pack lists likely want to group
    by `item_name` alone)
  - `quantity integer not null` with a `> 0` check
  - `unit_price_cents integer not null` (server-derived at submission time, matching the
    USD-only / cents-as-integer convention `orders.total_amount_cents` already established in
    #9 — no currency column)
  - `created_at timestamptz not null default now()`
  - RLS enabled with zero policies, matching every other table in this schema (service role
    bypasses; anon/authenticated denied by default)
  - An index on `order_id` (needed for the FK and for future pack-list/production-count
    queries)
- Migration numbering: next sequential file after `0008_order_status_totals.sql`
  (`0009_order_items.sql`), following the additive-migration header/section style established
  in `0006`–`0008`.
- Whether to hand-edit `lib/database.types.ts` for the new table in the same commit, matching
  the precedent set by #9 (`260904-w6s`) and `260904-uyl` — yes, follow that precedent unless a
  reason not to turns up during planning.
- Test coverage: extend `tests/checkoutOrderPersistence.test.ts` (or add a sibling file) to
  cover the items insert, the catalog-lookup-before-Square ordering, the compensating delete on
  items-insert failure, and items existing on the `order_status = 'failed'` path. Read that
  existing test file's structure before planning to match its patterns.
- Whether `notifySlackNewOrder`'s line-item source changes now that a Catalog lookup already
  happens earlier in the request (it currently sources line items from Square's `createOrder`
  response, per #9) — no requirement to change it; leave it as #9 left it unless doing so would
  create real duplication that's clearly better to collapse. Note there are now two
  Catalog-derived name sources in the same request (the new pre-Square lookup and Square's own
  post-`createOrder` `line_items`) — this is an accepted, intentional duplication given they
  serve different purposes (one must exist before Square is called, one is Square's own
  post-hoc echo), not a bug to fix silently.

</decisions>

<specifics>
## Specific Ideas

No specific UI/copy requirements — this is a backend/persistence change with no user-facing
surface, same as #9.

</specifics>

<canonical_refs>
## Canonical References

- GitHub issue #3: https://github.com/Yamatoberu/bigmattsbbq/issues/3
- GitHub issue #9 (prerequisite, resolved): first-party `orders` persistence —
  `.planning/quick/260904-w6s-persist-frozen-drop-orders-in-supabase-b/` for the established
  pattern (insert-before-Square, compensating/best-effort updates, `order_status` lifecycle)
- GitHub issue #4: where Square webhook/event-retry idempotency belongs — NOT this issue's
  scope. #3's "retried checkout handling cannot duplicate line items" criterion is read
  narrowly: the `order_items` write for a given request must not duplicate itself within one
  atomic write, not "prevent a browser retry from creating a second order" (that broader
  dedup problem already exists for `orders` itself since #9 and is out of scope here).
- `supabase/migrations/0008_order_status_totals.sql` — most recent migration, style/header
  precedent to follow
- `app/api/checkout/route.ts` — route to modify
- `lib/square.ts` `searchCatalogItems()` + `mapCatalogToFrozenItems()` — reused for the
  pre-Square catalog lookup
- `app/api/frozen-items/route.ts` — existing caller of the same two functions, for call-shape
  reference

</canonical_refs>
