# Quick Task 260904-w6s: Persist frozen-drop orders in Supabase before payment completion (Issue #9) - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Task Boundary

Create a first-party Supabase `orders` record when a customer submits a frozen-drop order, before Square payment completion, instead of relying on Square's order object as the source of truth after the fact (GitHub issue #9). The `orders` table already exists (from `0001_foundation.sql`) with `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `cart_snapshot`, `square_order_id`, `square_invoice_id`, `assigned_pickup_date` — but nothing in `app/api/checkout/route.ts` writes to it today. It is missing totals and order/payment status columns needed by this issue.

Also update `notifySlackNewOrder` in `app/api/checkout/route.ts` so it reflects the new first-party order model instead of the current hardcoded 6-category `productName` → `PRODUCT_NAME_LABELS` map (a leftover from the removed capacity-enforcement system, issue #13).

Prerequisite #13 (capacity enforcement removal) is already merged/closed — checkout route is already simplified, no RPC reservation calls to work around.

</domain>

<decisions>
## Implementation Decisions

### Write timing
- Insert the Supabase `orders` row immediately after drop/pickup validation succeeds, **before** any Square API calls (customer search/create, order create, invoice create/publish).
- Initial row: `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `cart_snapshot` (raw request cart), `order_status = 'pending'`, `payment_status = 'unpaid'`, totals/Square IDs null.
- After Square's `createOrder` responds: update the same row with `square_order_id` and totals (from `order.total_money`).
- After Square's `createInvoice`/`publishInvoice` succeeds: update the same row with `square_invoice_id` and `order_status = 'invoiced'`.
- This produces exactly one Supabase order record per submitted checkout, created before any payment-soliciting step (invoice publish), with an audit trail even if a later Square call fails.

### Status model
- Two separate columns: `order_status` and `payment_status` (not a single combined status).
- `order_status` lifecycle: `'pending'` → `'invoiced'` (Square order + invoice created and published) → `'failed'` (see failure handling below). Enforce with a check constraint, matching the existing `drops.status` convention.
- `payment_status` lifecycle: `'unpaid'` → (future, out of scope for this issue — no payment webhook exists yet) `'paid'`. Defaults to `'unpaid'` and stays there for the life of this issue's scope.

### Failure handling
- If any Square call fails after the Supabase row exists (customer create, order create, invoice create, or publish), update that row's `order_status = 'failed'` before re-throwing/returning the error response. Do not delete the row — it stays as an audit trail of an attempted-but-incomplete order.
- `payment_status` is left at its default (`'unpaid'`) on failure — no payment was ever solicited.
- Best-effort: if the failure-marking update itself fails, log it via `logError` but do not let that mask or replace the original checkout error response.

### Slack notification (notifySlackNewOrder)
- Stop sourcing line items from the hardcoded `productName` → `PRODUCT_NAME_LABELS` category map.
- Instead, build the Slack line items from Square's `createOrder` response `line_items` (name + quantity), which Square populates automatically from the catalog when line items are created via `catalog_object_id`. This is accurate for any current or future catalog item, not just the six legacy categories.
- `notifySlackNewOrder` should reflect the persisted order model's data (drop/pickup/customer/totals as applicable) rather than the raw request cart shape.
- The `PRODUCT_NAME_LABELS` map and the `productName` field's use for Slack display become dead code once this lands — the planner should decide whether to remove `PRODUCT_NAME_LABELS`/the cart's `productName` filtering entirely or leave `productName` in the schema for any other remaining consumer (check before removing — `lib/cart.ts` / `isSauceBumpNeeded` may still depend on `productName` client-side; that usage is unrelated to Slack display and must not be touched).

### Claude's Discretion
- Exact new column names/types beyond what's specified above (e.g. whether a `currency` column accompanies `total_amount_cents`, or a fixed USD assumption is documented instead) — follow existing schema conventions (snake_case, nullable until known, matching `lib/database.types.ts` generation conventions already used for other columns).
- Migration numbering/filename (next sequential migration after `0007_drop_pickup_at.sql`) and whether column additions land in one migration or are split, following the additive/expand-contract patterns already established in `supabase/migrations/`.
- Whether to regenerate `lib/database.types.ts` (and the `-sca` variant if applicable) as part of this task or flag it as a follow-up — check how prior migrations in this repo handled type regeneration (e.g. `260904-uyl` in recent commit history) and match that pattern.
- Test coverage: whether new/updated Vitest tests are needed for the insert/update flow and the new Slack line-item sourcing (existing `tests/checkoutSlack.test.ts` and `tests/checkoutLineItems.test.ts` likely need updates — read them before planning to avoid breaking their current assertions).

</decisions>

<specifics>
## Specific Ideas

No specific UI/copy requirements — this is a backend/persistence change with no user-facing surface. The Slack message format (customer, order lines, pickup, attribution, order ID) should stay structurally similar; only the line-item data source changes.

</specifics>

<canonical_refs>
## Canonical References

- GitHub issue #9: https://github.com/Yamatoberu/bigmattsbbq/issues/9
- GitHub issue #13 (prerequisite, already closed): capacity enforcement removal
- `supabase/migrations/0001_foundation.sql` — existing `orders` table definition
- `supabase/migrations/0006_pickup_windows.sql` / `0007_drop_pickup_at.sql` — established expand/contract migration pattern to follow
- `app/api/checkout/route.ts` — checkout route and `notifySlackNewOrder` to modify
- `lib/square.ts` `createOrder()` — response includes `order.total_money` and (per Square Orders API) `line_items` with catalog-populated names when created via `catalog_object_id`

</canonical_refs>
