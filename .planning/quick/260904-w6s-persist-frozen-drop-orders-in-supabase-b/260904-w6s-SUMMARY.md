---
phase: quick-260904-w6s
plan: 01
subsystem: checkout / orders persistence
tags: [supabase, migrations, checkout, square, slack]
dependency-graph:
  requires: []
  provides:
    - public.orders.order_status / payment_status / total_amount_cents (migration only, not yet applied)
    - markOrderFailed() helper in app/api/checkout/route.ts
    - notifySlackNewOrder() sourced from Square order.line_items instead of a hardcoded label map
  affects:
    - app/api/checkout/route.ts
    - lib/database.types.ts
    - lib/square.ts
tech-stack:
  added: []
  patterns:
    - "Insert-then-enrich order persistence: a pending row is written before any external
      payment-soliciting call, then updated in place as each downstream call succeeds"
    - "Best-effort bookkeeping writes: the insert is fatal (500) but post-insert updates
      and failure-marking are logged-and-swallowed so they never mask a successful checkout"
key-files:
  created:
    - supabase/migrations/0008_order_status_totals.sql
    - tests/checkoutOrderPersistence.test.ts
  modified:
    - lib/database.types.ts
    - lib/square.ts
    - app/api/checkout/route.ts
    - tests/checkoutSlack.test.ts
    - tests/checkoutLineItems.test.ts
    - tests/checkoutInvoiceDueDate.test.ts
decisions:
  - "No currency column added — total_amount_cents is a plain integer, USD-only assumption documented in the migration header (per CONTEXT)"
  - "PRODUCT_NAME_LABELS deleted entirely; productName stays in cartSchema untouched so lib/cart.ts and components/CheckoutClient.tsx needed zero changes"
  - "lib/database.types.ts hand-edited in the same commit as the migration, matching the precedent set by quick task 260904-uyl"
  - "Insert failure is fatal (500, before any Square call runs); the two post-Square success updates and all failure-marking are best-effort, logged via logError, and never change the customer-facing response"
  - "Migration 0008 was NOT applied to Supabase by the executor — it is committed only, per the plan's <human-check>, and must be applied before the code is deployed (opposite ordering from 0006/0007)"
metrics:
  duration: ~20min
  completed: 2026-09-04
---

# Phase quick-260904-w6s Plan 01: Persist frozen-drop orders in Supabase Summary

Every submitted `POST /api/checkout` now writes a first-party `public.orders` row before
any Square API call runs, enriches that same row as each downstream Square call succeeds,
and marks it `failed` (never deletes it) if any Square call fails midway. The Slack
new-order notification's line items are now sourced from Square's `createOrder` response
instead of a hardcoded six-category label map (GitHub issue #9).

## What Was Built

**Task 1 — Migration + types.** `supabase/migrations/0008_order_status_totals.sql` adds
`order_status text not null default 'pending'` (check: `pending|invoiced|failed`),
`payment_status text not null default 'unpaid'` (check: `unpaid|paid`), and nullable
`total_amount_cents integer` to `public.orders`, plus an index on `square_order_id`. It
is purely additive — nothing is dropped, no RLS policy is added — and its header states
the migration-first ordering constraint (opposite of `0007`'s contract ordering).
`lib/database.types.ts`'s `orders` `Row`/`Insert`/`Update` blocks were hand-edited to
match. `lib/square.ts`'s `createOrder` return type was widened to expose
`order.line_items?: Array<{ name?: string; quantity?: string }>`.

**Task 2 — RED tests.** New `tests/checkoutOrderPersistence.test.ts` (8 tests) proves:
the insert happens exactly once with the right shape, before any Square call; the two
post-Square update calls carry the right columns against the inserted row's id; every
one of the four post-insert Square failure paths (customer creation, order creation,
invoice creation, publish) marks the row `failed`; an insert error is fatal (500,
`createOrder` never called); and an update error is best-effort (still 200 with an
`orderId`). `tests/checkoutSlack.test.ts` gained 5 tests (line items rendered from
Square's response, the legacy label map's absence proven by a mismatched
`productName`/Square-name case, mrkdwn escaping on line-item names, no-`line_items`
graceful handling, and a `Total:` line gated on `total_money` presence). The shared
`setupSupabaseMock()`/`setupSquareMocks()` helpers in all three pre-existing checkout
test files were widened to support an `orders` table branch and a realistic
`createOrder` response (`total_money` + `line_items`). Both new/changed files were
confirmed to fail against the unmodified route (RED gate) before Task 3 began.

**Task 3 — GREEN implementation.** `app/api/checkout/route.ts`: deleted
`PRODUCT_NAME_LABELS`; added `markOrderFailed(supabase, orderRowId, requestId)` which
updates `order_status: "failed"` and logs-but-swallows its own error; inserted the
`orders` row immediately after the pickup-option 404 guard (drop_id, pickup_option_id,
customer_email, customer_name, `cart_snapshot: parsed.data.cart as unknown as Json`,
`order_status: "pending"`, `payment_status: "unpaid"`), returning 500 on insert failure
before any Square call runs; added a best-effort update with `square_order_id` +
`total_amount_cents` right after the `orderId` guard; added a best-effort update with
`square_invoice_id` + `order_status: "invoiced"` right after `publishInvoice` resolves;
added `await markOrderFailed(...)` to all three early-return 500 guards plus the outer
`catch (squareError)` rethrow. Rewrote `notifySlackNewOrder` to take
`lineItems`/`totalAmountCents`/`orderRecordId`/`squareOrderId` instead of `cart`/`orderId`
— line items are filtered to those with a `name`, escaped, and rendered as
`  • <name> × <quantity>`; a `Total: <formatMoney(...)>` line is added when
`total_money` is present; customer name/email are now escaped too; the trailing lines
became `Order ID: <supabase id>` followed by `Square Order: <square id>`.

## Verification

- `npx tsc --noEmit` — clean after every task and at the end.
- `npm run test` — 30 test files, 288 tests, all passing.
- `npm run build` — production build succeeds.
- Dead-code gate: `PRODUCT_NAME_LABELS` count in the route is `0`; `productName` still
  present in the route's `cartSchema` and unchanged (3 occurrences) in `lib/cart.ts`.
- `git diff --stat lib/cart.ts components/CheckoutClient.tsx` — empty (byte-for-byte
  untouched).
- Regression gate: `reserve_pickup_slot|release_pickup_slot|capacity|soldOut` count
  across the route and the new migration — `0`.
- Additive-only gate: `drop column|drop table|create policy` count in the migration
  (excluding idempotency `drop constraint if exists` guards) — `0`.
- `payment_status` appears exactly once in the route (the insert) — confirmed.
- `markOrderFailed(` invoked exactly 4 times — confirmed.
- TDD gate sequence confirmed in git log: `test(260904-w6s): ...` (5ea4507) precedes
  `feat(260904-w6s): ...` (7c325d9).

## Deviations from Plan

None — plan executed exactly as written. One incidental cleanup: `npm run build`
regenerated `next-env.d.ts` (an auto-generated, "should not be edited" file per its own
header) with an unrelated `.next/dev/types` → `.next/types` path change; this was
reverted with `git checkout -- next-env.d.ts` before committing Task 3, since it was not
part of this task's scope.

## Issues Encountered

None.

## Human Steps Still Required

Per the plan's `<human-check>`, migration `0008_order_status_totals.sql` was **not**
applied to any Supabase project by this executor — it exists only as a committed `.sql`
file. Before this code is deployed:

1. Take a Supabase snapshot/backup.
2. Apply the outstanding migrations in order in **sandbox**: `0005`, `0006`, then `0008`
   (hold `0007` — still gated behind the `260904-uyl` code deploy).
3. Confirm the currently deployed sandbox code is unaffected (homepage, `/api/drop`,
   and a checkout all still work — `0008` adds columns nobody reads yet).
4. Spot-check defaults on any existing rows (`pending` / `unpaid` / `null`).
5. Repeat steps 2-4 against **production**.
6. Merge and deploy this code, then run one full sandbox checkout end to end and confirm
   the `public.orders` row, the Slack message content, and `total_amount_cents` all match
   expectations (full checklist in the plan's `<human-check>`).
7. Force a Square failure in sandbox and confirm a `failed` row is left behind with null
   Square ids.
8. Regenerate `lib/database.types.ts` from the live schema and diff it against this
   task's hand-edit to confirm agreement.

## Next Phase Readiness

The `public.orders` table now has the columns needed to hang a future payment webhook
off `payment_status`, and a durable audit trail exists for every attempted checkout
(including partial failures). No blockers — the only remaining work is the manual
migration-application sequence above, which is explicitly out of scope for the executor.

---
*Phase: quick-260904-w6s*
*Completed: 2026-09-04*

## Self-Check: PASSED

All files created/modified confirmed present on disk; all three task commit hashes
(`a21fae3`, `5ea4507`, `7c325d9`) confirmed present in `git log`.
