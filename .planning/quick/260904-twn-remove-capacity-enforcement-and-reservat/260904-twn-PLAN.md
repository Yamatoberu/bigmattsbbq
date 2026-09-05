---
phase: quick-260904-twn
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [ISSUE-13]
files_modified:
  - app/api/checkout/route.ts
  - lib/drops.ts
  - lib/types.ts
  - components/OrderLanding.tsx
  - components/CheckoutClient.tsx
  - app/api/test-seed/route.ts
  - lib/database.types.ts
  - supabase/migrations/0005_remove_capacity_enforcement.sql
  - tests/checkoutReservation.test.ts
  - tests/checkoutDropGate.test.ts
  - tests/checkoutLineItems.test.ts
  - tests/checkoutInvoiceDueDate.test.ts
  - tests/checkoutSlack.test.ts
  - tests/drops.test.ts
  - tests/storefront-state.test.ts
  - e2e/fixtures/activeDrop.ts
  - e2e/browseFrozenItems.spec.ts

must_haves:
  truths:
    - "A customer can complete checkout on an active drop and receive a Square invoice with no reservation RPC involved"
    - "The homepage loads the active drop and renders packages and individual items with no sold-out gating"
    - "The checkout page lists every pickup option as selectable"
    - "npm run test passes with zero reservation mocks or capacity fixtures anywhere in tests/"
    - "drops and drop_pickup_options carry no capacity_*/reserved_* columns, and reserve_pickup_slot/release_pickup_slot no longer exist"
  artifacts:
    - path: "supabase/migrations/0005_remove_capacity_enforcement.sql"
      provides: "Destructive migration dropping capacity/reserved columns and both reservation RPCs"
      contains: "drop function if exists public.reserve_pickup_slot"
    - path: "app/api/checkout/route.ts"
      provides: "Checkout with no reservation, rollback, or sold-out branch"
    - path: "lib/drops.ts"
      provides: "fetchActiveDrop and checkDropReady with no capacity columns"
    - path: "lib/types.ts"
      provides: "DropDTO without capacity/soldOut/capacityEnforced"
  key_links:
    - from: "lib/drops.ts"
      to: "supabase drops table"
      via: "select() column list must contain no dropped column"
      pattern: "select\\(\\s*\"id, title, status, order_cutoff_at\""
    - from: "app/api/checkout/route.ts"
      to: "lib/drops.ts checkDropReady"
      via: "status + order_cutoff_at gate only"
      pattern: "checkDropReady\\(dropRow\\)"
---

<objective>
Remove per-drop and per-pickup-option capacity enforcement and the reservation
system (GitHub issue #13) from code and from the Supabase schema.

Purpose: Capacity enforcement is not relied on at current order volume and is not
expected to be. It sits directly inside `app/api/checkout/route.ts`, which is about
to be rewritten by issues #9 and #10. Removing it first avoids building new
order-persistence logic around code that is being deleted.

Output: A checkout route with no reservation RPCs, a `DropDTO` with no capacity
surface, a migration that drops the dead columns and functions, and a green test
suite with no reservation scaffolding.
</objective>

<scope_note>
**Issue #13 understates the blast radius.** The issue says the reservation system
"lives inside `app/api/checkout/route.ts`". That is true of the *write* side. The
*read* side lives in `lib/drops.ts`: `fetchActiveDrop()` selects the same twelve
capacity/reserved columns plus `capacity_enforced` from both `drops` and
`drop_pickup_options`, and derives `DropDTO.capacity`, `DropDTO.soldOut`,
`DropDTO.capacityEnforced`, and `PickupOptionDTO.isSoldOut` from them. Those fields
feed sold-out badges in `components/OrderLanding.tsx` and pickup-option disabling in
`components/CheckoutClient.tsx`.

Consequence: applying the migration without also stripping the read side would make
`fetchActiveDrop()` fail with a PostgREST "column does not exist" error, 500-ing
`GET /api/drop` and the entire homepage. The read-side removal is therefore not
scope creep — it is a precondition for the migration the issue asks for.

Two things the issue mentions that do **not** apply here, confirmed by grep:
- **Slack notification** — `notifySlackNewOrder()` reads only `cart`, pickup, and
  customer fields. No change needed.
- **Admin views** — the only admin route is `app/api/admin/broadcast/route.tsx`
  (mailing list). No capacity admin UI exists. Do not invent any.
</scope_note>

<decisions>
- **D-1 (owner):** Drop the columns via a new migration rather than leaving them
  dormant. Extend this to `capacity_enforced` (its only purpose was gating the
  enforcement being removed) and to both RPC functions, whose bodies reference the
  dropped columns and would fail at runtime if left behind.
- **D-2:** Remove `DropDTO.capacity`, `DropDTO.soldOut`, `DropDTO.capacityEnforced`,
  the `CapacitySlot` interface, and `PickupOptionDTO.isSoldOut` outright. Forced by
  D-1 — there is no data source left to populate them.
- **D-3:** **Keep** the `soldOut?: boolean` prop on `PackageCard` and
  `FrozenItemCard`, and keep `components/SoldOutCapture.tsx`. Both props default to
  `false`, so nothing renders sold-out after this change. This is a presentational
  API with zero runtime cost, and it preserves the mailing-list capture UI for
  whenever a sold-out signal is reintroduced. Do not delete these components.
- **D-4:** The migration file is committed in Task 3 but is **not** applied to
  Supabase by the executor. Applying it is a deliberate human step that must happen
  *after* the code change is deployed (see `<verification>`).
</decisions>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@app/api/checkout/route.ts
@lib/drops.ts
@lib/types.ts

Project conventions that bind this work (from CLAUDE.md):
- TypeScript `strict: true`; no `any`; 2-space indent; final newline.
- Named exports only outside `app/` page/layout files.
- Zod `safeParse` at API boundaries, never `parse`.
- No comments explaining *what* code does. Comments removed alongside the code they
  described must not be replaced with new narration.
- Vitest, Node environment (not jsdom). Run a single file with
  `npx vitest run tests/<name>.test.ts`.
</context>

<interfaces>
Current shapes being reduced. The executor should not need to re-derive these.

`lib/types.ts` — remove the marked members:
```typescript
export interface CapacitySlot {        // DELETE entire interface
  total: number;
  reserved: number;
}

export interface PickupOptionDTO {
  id: string;
  locationLabel: string;
  pickupDateLabel: string;
  pickupAtISO: string;
  isSoldOut: boolean;                  // DELETE
}

export interface DropDTO {
  id: string;
  title: string;
  status: DropStatus;
  orderCutoffAt: string | null;
  capacity: { ... };                   // DELETE entire member
  soldOut: { ... };                    // DELETE entire member
  pickupOptions: PickupOptionDTO[];
  capacityEnforced: boolean;           // DELETE
}
```

`lib/drops.ts` — `DropReadinessRow` reduces to exactly:
```typescript
export interface DropReadinessRow {
  status: string;
  order_cutoff_at: string | null;
}
```
`DropReadiness` and the `checkDropReady` signature are unchanged.

The twelve column names dropped from **both** `drops` and `drop_pickup_options`:
`capacity_pulled_pork`, `capacity_brisket`, `capacity_sauce`, `capacity_family_night`,
`capacity_backyard_host`, `capacity_freezer_filler`, `reserved_pulled_pork`,
`reserved_brisket`, `reserved_sauce`, `reserved_family_night`,
`reserved_backyard_host`, `reserved_freezer_filler`.
Plus `capacity_enforced`, which exists on `drops` only.

RPC signatures to drop (both `(uuid, uuid, text, integer)`, defined in
`supabase/migrations/0004_per_item_capacity.sql`):
`public.reserve_pickup_slot`, `public.release_pickup_slot`.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Strip reservation and capacity enforcement from the checkout route</name>
  <files>app/api/checkout/route.ts, lib/drops.ts, tests/checkoutReservation.test.ts, tests/checkoutDropGate.test.ts, tests/checkoutLineItems.test.ts, tests/checkoutInvoiceDueDate.test.ts, tests/checkoutSlack.test.ts</files>
  <action>
Per D-1, remove the write side of the reservation system.

In `app/api/checkout/route.ts`:
- Delete the `releaseReserved()` helper function entirely (currently just above `POST`).
- Reduce the `drops` select to `"id, status, order_cutoff_at"`.
- Delete the `capacityEnforced` const derived from `dropRow?.capacity_enforced`.
- Reduce the `drop_pickup_options` select to
  `"id, location_label, pickup_at, pickup_date"`. Keep the `pickupErr` guard and the
  `!pickupRow` 404 — those are unrelated to capacity.
- Delete the entire `if (capacityEnforced) { ... pickupSoldOut ... }` block and its
  409 response.
- Delete the `totals` Map aggregation and its preceding comment. Nothing else
  consumes `totals`.
- Delete the `reserved` array, the `if (capacityEnforced)` reservation loop, and its
  409 response.
- Delete all four remaining `await releaseReserved(...)` calls: in the missing-customer
  branch, the missing-orderId branch, the missing-invoice branch, and the
  `catch (squareError)` block. Each surrounding branch keeps its own
  `NextResponse.json(...)` return. The `catch (squareError)` block reduces to a bare
  `throw squareError;` — leave the try/catch in place so the outer handler still maps
  `SquareError.status`, and delete its now-stale comment.
- Leave `checkDropReady(dropRow)`, `readiness`, `PRODUCT_NAME_LABELS`,
  `notifySlackNewOrder`, `cartSchema` (including its `productName` union),
  `sanitizeAttribution`, and the whole Square/attribution flow untouched.

In `lib/drops.ts`, narrow `checkDropReady` only — do not touch `fetchActiveDrop` in
this task:
- Reduce `DropReadinessRow` to the two-field shape given in `<interfaces>`.
- In `checkDropReady`, delete the `if (!drop.capacity_enforced) return { ok: true };`
  early return, the `globallySoldOut` computation, its 409 response, and the two-line
  comment above it. The function keeps the null check, the status check, and the
  `order_cutoff_at` check, then returns `{ ok: true }`.

Tests:
- Delete `tests/checkoutReservation.test.ts` outright with `git rm`. Every case in it
  asserts reservation behavior that no longer exists.
- `tests/checkoutDropGate.test.ts`: strip all capacity/reserved/capacity_enforced keys
  from the base row fixture. Delete the three cases that assert capacity semantics —
  "returns 409 with sold-out message when all 6 products at capacity", "returns ok when
  only some products are at capacity (global sold-out requires all 6)", and "returns ok
  even when globally sold out if capacity_enforced is false". Keep "still returns 409
  closed when status is closed..." but drop the `capacity_enforced: false` override from
  its fixture and rename it to drop the trailing "even if capacity_enforced is false"
  clause. Keep every status and cutoff case.
- `tests/checkoutLineItems.test.ts`, `tests/checkoutInvoiceDueDate.test.ts`,
  `tests/checkoutSlack.test.ts`: remove the capacity/reserved/capacity_enforced keys
  from the drop-row and pickup-row fixtures, remove `rpc: vi.fn()` from the Supabase
  mock object, and remove the `supabaseMock.rpc.mockResolvedValue(...)` setup lines.
  Do not change any line-item, invoice-due-date, or Slack assertion — those are the
  behaviors this task must prove are unregressed.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/checkoutDropGate.test.ts tests/checkoutLineItems.test.ts tests/checkoutInvoiceDueDate.test.ts tests/checkoutSlack.test.ts && test ! -f tests/checkoutReservation.test.ts && test 0 -eq "$(grep -rn 'reserve_pickup_slot\|release_pickup_slot\|releaseReserved\|capacityEnforced\|capacity_enforced' app/api/checkout/route.ts lib/drops.ts tests/ | grep -v '^\s*//' | grep -vc '^$' || true)"</automated>
  </verify>
  <done>`app/api/checkout/route.ts` contains no `supabase.rpc` call and no capacity branch; `checkDropReady` gates on status and cutoff only; the four listed checkout test files pass with no `rpc` mock; `tests/checkoutReservation.test.ts` no longer exists; `tsc --noEmit` is clean.</done>
</task>

<task type="auto">
  <name>Task 2: Remove the capacity surface from DropDTO and every consumer</name>
  <files>lib/types.ts, lib/drops.ts, components/OrderLanding.tsx, components/CheckoutClient.tsx, tests/drops.test.ts, tests/storefront-state.test.ts, e2e/fixtures/activeDrop.ts, e2e/browseFrozenItems.spec.ts</files>
  <action>
Per D-2, remove the read side. This must land before the Task 3 migration is applied,
or `GET /api/drop` 500s.

`lib/types.ts`: apply the deletions marked in `<interfaces>` — delete the
`CapacitySlot` interface, `PickupOptionDTO.isSoldOut`, and `DropDTO.capacity`,
`DropDTO.soldOut`, `DropDTO.capacityEnforced`. Leave `DropStatus`, the remaining
`PickupOptionDTO` fields, and every other exported type untouched.

`lib/drops.ts` `fetchActiveDrop()`:
- Reduce the `drops` select to `"id, title, status, order_cutoff_at"`.
- Reduce the `drop_pickup_options` select to
  `"id, location_label, pickup_date, pickup_at"`. Keep the `.eq("drop_id", drop.id)`
  filter and the `pickup_at` ordering.
- Delete the `capacityEnforced` const.
- In the `pickupOptions` map, delete the `isSoldOut` property. The mapped object keeps
  `id`, `locationLabel`, `pickupDateLabel`, `pickupAtISO`.
- In the returned object, delete the `capacity`, `soldOut`, and `capacityEnforced`
  members. It returns `id`, `title`, `status`, `orderCutoffAt`, `pickupOptions`.
- Drop the now-unused `PickupOptionDTO` import only if TypeScript reports it unused;
  it is still needed for the `pickupOptions` annotation, so most likely keep it.

`components/OrderLanding.tsx`:
- In the `PACKAGES.map` callback, delete the `pkgSoldOutMap` object and the
  `pkgSoldOut` const, and delete the `soldOut={pkgSoldOut}` prop from `<PackageCard>`.
  Per D-3 leave the `PackageCard` component's own `soldOut` prop declaration alone.
- In the `individualItems.map` callback, delete the `itemSoldOut` const and the
  `nameLower` const that exists only to feed it, and delete the `soldOut={itemSoldOut}`
  prop from `<FrozenItemCard>`. Verify `nameLower` has no other reader in that callback
  before deleting it; if it does, keep it.
- Change nothing else — the `drop.status === "active"` section gates, package
  resolution, pricing, and the cart wiring all stay.

`components/CheckoutClient.tsx`:
- Line ~35: `drop.pickupOptions.find((o) => !o.isSoldOut)` becomes
  `drop.pickupOptions[0]`, preserving the existing possibly-undefined handling at that
  call site.
- Line ~278: delete the `const disabled = option.isSoldOut;` and every use of
  `disabled` in that pickup-option render. Every pickup option is now selectable.
  Remove any sold-out label or `disabled`/`aria-disabled` attribute that was driven
  by it.

`e2e/fixtures/activeDrop.ts`: delete the `slot()` helper, the `capacity` block, the
`soldOut` block, the `capacityEnforced` field, both `isSoldOut: false` lines, and the
entire `withSoldOut()` export.

`e2e/browseFrozenItems.spec.ts`: delete the `withSoldOut` import and the whole
`"sold-out item swaps add-to-cart for the notify capture"` test. Nothing can drive a
sold-out state after this change, so the scenario is unreachable. Leave every other
spec in the file intact.

`tests/drops.test.ts`: remove capacity/reserved/capacity_enforced keys from all drop
and pickup-option row fixtures, and delete every assertion and case that reads
`capacity`, `soldOut`, `capacityEnforced`, or `isSoldOut` — including
`"derives pickupOption.isSoldOut only when both products sold out"`. Keep the cases
covering active-drop selection, the null/no-active-drop path, error propagation, and
`formatPickupDate`.

`tests/storefront-state.test.ts`: remove the `capacity` block and the
`isSoldOut: false` field from the DropDTO-shaped literal, and delete the
`expect(drop.pickupOptions[0].isSoldOut).toBe(false)` assertion. The test's point is
that `pickupOptions` is present on the shape — preserve that.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/drops.test.ts tests/storefront-state.test.ts && test 0 -eq "$(grep -rn 'isSoldOut\|capacityEnforced\|CapacitySlot\|withSoldOut' lib/ components/ app/ tests/ e2e/ | grep -v '^\s*//' | grep -c . || true)"</automated>
  </verify>
  <done>`DropDTO` has exactly `id`, `title`, `status`, `orderCutoffAt`, `pickupOptions`; `fetchActiveDrop` selects no capacity column; `OrderLanding` passes no `soldOut` prop; `CheckoutClient` disables no pickup option; `tsc --noEmit` is clean and the two named test files pass.</done>
</task>

<task type="auto">
  <name>Task 3: Add the drop migration, clean generated types, and verify end to end</name>
  <files>supabase/migrations/0005_remove_capacity_enforcement.sql, app/api/test-seed/route.ts, lib/database.types.ts</files>
  <action>
Create `supabase/migrations/0005_remove_capacity_enforcement.sql` following the header
comment style of `0003_capacity_enforced.sql` and `0004_per_item_capacity.sql`.

Order matters: drop the two functions first, then the columns. The function bodies are
plpgsql and are not dependency-tracked by Postgres, so dropping the columns first would
silently leave two functions that fail at call time.

The migration must, in this order:
1. `drop function if exists public.reserve_pickup_slot(uuid, uuid, text, integer);`
2. `drop function if exists public.release_pickup_slot(uuid, uuid, text, integer);`
3. A single `alter table public.drops` dropping, with `drop column if exists` for each,
   the twelve capacity/reserved columns listed in `<interfaces>` plus `capacity_enforced`.
4. A single `alter table public.drop_pickup_options` dropping the same twelve
   capacity/reserved columns (this table has no `capacity_enforced`).

Use `if exists` on every drop so the migration is idempotent. Do not use `cascade` —
if Postgres reports a dependent object, stop and surface it rather than cascading
through something unexamined. Do not add any `down`/rollback section; this repo's
migrations are forward-only (check `0001`–`0004` and match).

`app/api/test-seed/route.ts` (sandbox-only diagnostic route): reduce the `drops` select
to `"id, title, status"` and the `drop_pickup_options` select to
`"id, location_label, pickup_date"`. Leave the sandbox guard, error handling, and the
response `summary` shape unchanged.

`lib/database.types.ts` is Supabase-generated. Hand-edit it here rather than
regenerating, since the migration has not been applied yet: remove every
`capacity_*` and `reserved_*` key, and `capacity_enforced`, from the `Row`, `Insert`,
and `Update` blocks of both the `drops` and `drop_pickup_options` table types. Also
remove the `reserve_pickup_slot` and `release_pickup_slot` entries from the `Functions`
block if they are present. Leave all other tables and the SCA schema untouched. Add a
note to the task summary that this file should be regenerated from Supabase after the
migration is applied.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run test && npm run build && test 0 -eq "$(grep -rn 'capacity_pulled_pork\|reserved_pulled_pork\|capacity_enforced\|reserve_pickup_slot\|release_pickup_slot' app/ lib/ components/ tests/ e2e/ | grep -c . || true)" && grep -q 'drop function if exists public.reserve_pickup_slot' supabase/migrations/0005_remove_capacity_enforcement.sql</automated>
  </verify>
  <done>`supabase/migrations/0005_remove_capacity_enforcement.sql` exists and drops both functions and all 25 columns idempotently; no TypeScript source under `app/`, `lib/`, `components/`, `tests/`, or `e2e/` mentions any capacity or reservation identifier; `npm run test` and `npm run build` both pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Deployed app → Supabase Postgres | Schema shape is a contract; a column dropped ahead of the code deploy breaks every read |
| Customer → `POST /api/checkout` | Untrusted cart quantities cross here; previously bounded by capacity, now unbounded |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-twn-01 | Denial of Service | `lib/drops.ts` `fetchActiveDrop` → `GET /api/drop` | mitigate | Task 2 removes the column reads; per D-4 the migration is applied only *after* that code is deployed. Ordering is enforced by the `<verification>` human-check below. |
| T-twn-02 | Tampering / data loss | `drops`, `drop_pickup_options` | accept | `drop column` is irreversible and these tables hold live drop configuration. Accepted: the columns are demonstrably unread after Tasks 1–2, all six `capacity_*` values are operator-entered config (not accumulated history), and the owner explicitly chose dropping over dormancy. Take a Supabase point-in-time snapshot before applying. |
| T-twn-03 | Elevation of Privilege (business) | `POST /api/checkout` | accept | Removing enforcement means a customer can order arbitrary quantities with no server-side cap and the drop can oversell. This is the deliberate subject of issue #13 — capacity is not relied on at current volume. Overselling is caught manually via the existing Slack order notification. |
| T-twn-04 | Denial of Service | `reserve_pickup_slot` / `release_pickup_slot` | mitigate | Functions are dropped in the same migration as the columns, and before them, so no orphaned `security definer` function survives referencing missing columns. |

No package-manager installs in this task, so no Package Legitimacy Gate applies.
</threat_model>

<verification>
Run after all three tasks:

```bash
npx tsc --noEmit
npm run test
npm run build
npm run lint
```

Repo-wide dead-identifier gate — must print `0`:

```bash
grep -rn 'capacity_pulled_pork\|capacity_brisket\|capacity_sauce\|capacity_family_night\|capacity_backyard_host\|capacity_freezer_filler\|reserved_pulled_pork\|reserved_brisket\|reserved_sauce\|reserved_family_night\|reserved_backyard_host\|reserved_freezer_filler\|capacity_enforced\|capacityEnforced\|isSoldOut\|CapacitySlot\|reserve_pickup_slot\|release_pickup_slot' \
  app/ lib/ components/ tests/ e2e/ | grep -c .
```

(`supabase/migrations/` is intentionally excluded — `0001`, `0003`, and `0004` are
historical and must not be rewritten; `0005` legitimately names every dropped object.)

<human-check>
**Migration application is a manual, ordered step. Do not let the executor run it.**

1. Merge and deploy the code change to Vercel first. Confirm the homepage loads an
   active drop and `/api/drop` returns 200.
2. Take a Supabase point-in-time snapshot / backup (T-twn-02).
3. Apply `0005` to the Supabase **sandbox** project. Re-check the homepage,
   `/api/test-seed`, and a full sandbox checkout end-to-end (order created, invoice
   emailed, Slack notification fires).
4. Only then apply `0005` to production.
5. Regenerate `lib/database.types.ts` from the live schema and confirm it matches the
   hand-edit made in Task 3.

Applying `0005` before step 1 will 500 the storefront.
</human-check>
</verification>

<success_criteria>
- `app/api/checkout/route.ts` contains no `supabase.rpc` call, no `releaseReserved`, no
  capacity branch, and no `totals` aggregation.
- `checkDropReady` gates only on null, `status`, and `order_cutoff_at`.
- `DropDTO` is `{ id, title, status, orderCutoffAt, pickupOptions }`;
  `PickupOptionDTO` has no `isSoldOut`.
- `supabase/migrations/0005_remove_capacity_enforcement.sql` drops both RPC functions
  and all 25 columns, idempotently, functions first.
- `tests/checkoutReservation.test.ts` is deleted; every other test file passes with no
  `rpc` mock and no capacity fixture.
- `npx tsc --noEmit`, `npm run test`, `npm run build`, and `npm run lint` all pass.
- The repo-wide dead-identifier gate prints `0`.
- `components/SoldOutCapture.tsx` and the `soldOut` props on `PackageCard` /
  `FrozenItemCard` still exist, per D-3.
</success_criteria>

<execution_note>
This is a larger quick task than usual — 17 files across 3 tasks, roughly 25–30%
context each. Every task leaves the tree compiling and testable on its own, so each is
independently committable. If context pressure builds, commit after each task and
`/clear` before starting the next.
</execution_note>

<output>
Create `.planning/quick/260904-twn-remove-capacity-enforcement-and-reservat/260904-twn-SUMMARY.md` when done.
</output>
