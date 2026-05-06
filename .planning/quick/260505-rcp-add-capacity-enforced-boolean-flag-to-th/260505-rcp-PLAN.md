---
phase: 260505-rcp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/0003_capacity_enforced.sql
  - lib/types.ts
  - lib/drops.ts
  - app/api/checkout/route.ts
  - components/OrderLanding.tsx
  - tests/drops.test.ts
  - tests/checkoutDropGate.test.ts
autonomous: true
requirements:
  - RCP-01
  - RCP-02
  - RCP-03

must_haves:
  truths:
    - "A new `capacity_enforced` column exists on `public.drops`, NOT NULL, default `true`"
    - "When `capacity_enforced=true`, all existing capacity gates behave identically to today (back-compat)"
    - "When `capacity_enforced=false`, `checkDropReady` does not 409 on the global sold-out condition"
    - "When `capacity_enforced=false`, the checkout route does not 409 on per-pickup sold-out and skips both `reserve_pickup_slot` and `release_pickup_slot` RPC calls"
    - "When `capacity_enforced=false`, `DropDTO.soldOut.pulledPork` and `DropDTO.soldOut.brisket` are always `false` so `OrderLanding` does not mark items sold out"
    - "Square inventory `remaining` checks (FrozenItemCard / PackageCard `inStock`) are unchanged"
  artifacts:
    - path: "supabase/migrations/0003_capacity_enforced.sql"
      provides: "Adds capacity_enforced BOOLEAN NOT NULL DEFAULT true to public.drops"
      contains: "alter table public.drops"
    - path: "lib/types.ts"
      provides: "DropDTO.capacityEnforced: boolean field"
      contains: "capacityEnforced"
    - path: "lib/drops.ts"
      provides: "fetchActiveDrop selects capacity_enforced and maps it to capacityEnforced; checkDropReady honors capacity_enforced flag"
      contains: "capacity_enforced"
    - path: "app/api/checkout/route.ts"
      provides: "Checkout route reads drop.capacity_enforced and bypasses pickup-sold-out check + reservation RPCs when false"
      contains: "capacity_enforced"
    - path: "components/OrderLanding.tsx"
      provides: "itemSoldOut driven by drop.soldOut booleans (which are forced false when capacity disabled)"
  key_links:
    - from: "lib/drops.ts:fetchActiveDrop"
      to: "DropDTO.capacityEnforced"
      via: "select column → DTO field"
      pattern: "capacity_enforced"
    - from: "lib/drops.ts:checkDropReady"
      to: "globallySoldOut gate"
      via: "early return ok:true when capacity_enforced=false"
      pattern: "capacity_enforced"
    - from: "app/api/checkout/route.ts"
      to: "reserve_pickup_slot RPC loop"
      via: "if (capacity_enforced) { ...reservation loop... }"
      pattern: "capacity_enforced"
---

<objective>
Add a `capacity_enforced` boolean flag to the drops table and thread it through every Supabase-driven capacity gate so a single drop can be configured to skip capacity enforcement entirely.

Purpose: Allow drops where capacity is not the constraint (e.g. test drops, low-pressure sales, or drops where Square inventory alone gates supply) without ripping out the existing capacity infrastructure. Default behavior is unchanged.

Output: Migration `0003_capacity_enforced.sql`, updated `DropDTO` shape, updated `fetchActiveDrop`/`checkDropReady` logic, updated checkout route reservation flow, updated UI sold-out logic, and updated unit tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@lib/types.ts
@lib/drops.ts
@app/api/checkout/route.ts
@components/OrderLanding.tsx
@supabase/migrations/0001_foundation.sql
@supabase/migrations/0002_drop_cutoff.sql
@tests/drops.test.ts
@tests/checkoutDropGate.test.ts

<interfaces>
<!-- Current shapes the executor must preserve and extend. -->

From `lib/types.ts` (DropDTO needs a new `capacityEnforced: boolean` field):
```typescript
export interface DropDTO {
  id: string;
  title: string;
  status: DropStatus;
  orderCutoffAt: string | null;
  capacity: { pulledPork: CapacitySlot; brisket: CapacitySlot };
  soldOut: { pulledPork: boolean; brisket: boolean };
  pickupOptions: PickupOptionDTO[];
  // NEW: capacityEnforced: boolean;
}
```

From `lib/drops.ts`:
```typescript
export interface DropReadinessRow {
  status: string;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
  order_cutoff_at: string | null;
  // NEW: capacity_enforced: boolean;
}
export function checkDropReady(drop: DropReadinessRow | null): DropReadiness;
```

From the checkout route, the `dropRow` shape selected from Supabase must add `capacity_enforced` so `checkDropReady` and the reservation-loop guard both have access to it.

Migration filename convention (existing files):
- `supabase/migrations/0001_foundation.sql`
- `supabase/migrations/0002_drop_cutoff.sql`
- New file: `supabase/migrations/0003_capacity_enforced.sql`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add capacity_enforced column and thread it through types + lib/drops.ts</name>
  <files>supabase/migrations/0003_capacity_enforced.sql, lib/types.ts, lib/drops.ts, tests/drops.test.ts, tests/checkoutDropGate.test.ts</files>
  <action>
1. Create `supabase/migrations/0003_capacity_enforced.sql` containing:
   ```sql
   -- =============================================================================
   -- Big Matt's BBQ — Migration 0003
   -- Adds capacity_enforced flag to drops so a drop can opt out of capacity gates
   -- =============================================================================

   alter table public.drops
     add column capacity_enforced boolean not null default true;
   ```
   Match the comment-banner style of `0002_drop_cutoff.sql`.

2. In `lib/types.ts`, add `capacityEnforced: boolean;` to `DropDTO`. Place it after `pickupOptions` for minimal diff.

3. In `lib/drops.ts`:
   - Add `capacity_enforced` to the `select(...)` string of the `drops` query in `fetchActiveDrop`.
   - In the returned object, add `capacityEnforced: drop.capacity_enforced`.
   - When `drop.capacity_enforced === false`, force `soldOut.pulledPork = false` and `soldOut.brisket = false` on the returned DTO. The reasoning: the UI uses `drop.soldOut.*` to disable items, and a non-enforced drop must never disable items via that path. Keep the `capacity` totals/reserved values as-is (they remain accurate for reporting, just not enforced).
   - Add `capacity_enforced: boolean;` to the `DropReadinessRow` interface.
   - In `checkDropReady`, after the status/cutoff checks but before the `globallySoldOut` block, return `{ ok: true }` early when `drop.capacity_enforced === false`. The status and cutoff gates still apply — only the capacity-derived sold-out gate is bypassed.

4. Update `tests/drops.test.ts`:
   - Add `capacity_enforced: true` to every `DropRow` literal (existing tests must keep working with the default-on behavior).
   - Add a new test: "forces soldOut booleans to false when capacity_enforced is false" — feed a row where `reserved_pulled_pork >= capacity_pulled_pork` AND `capacity_enforced: false`, assert `result.soldOut.pulledPork === false`.
   - Add a new test: "exposes capacityEnforced on the DTO" — assert `result.capacityEnforced` matches the input row.

5. Update `tests/checkoutDropGate.test.ts`:
   - Add `capacity_enforced: true` to the `activeRow` literal.
   - Add a new test: "returns ok even when globally sold out if capacity_enforced is false" — pass a row with both reserved at capacity but `capacity_enforced: false`, assert `{ ok: true }`.
   - Add a new test: "still returns 409 closed when status is closed even if capacity_enforced is false" — capacity flag does NOT bypass status/cutoff gates.

Use the Edit tool for source/test files; use Write for the new migration. Do NOT touch Square inventory logic.
  </action>
  <verify>
    <automated>npx vitest run tests/drops.test.ts tests/checkoutDropGate.test.ts</automated>
  </verify>
  <done>Migration file exists. `DropDTO` has `capacityEnforced`. `fetchActiveDrop` selects and maps the column and forces soldOut to false when disabled. `checkDropReady` short-circuits to ok when disabled. All tests pass — including new cases that prove both bypass behavior and the back-compat default.</done>
</task>

<task type="auto">
  <name>Task 2: Wire capacity_enforced through checkout route and OrderLanding UI</name>
  <files>app/api/checkout/route.ts, components/OrderLanding.tsx</files>
  <action>
1. In `app/api/checkout/route.ts`:
   - Extend the `drops` select string at line 59 to include `capacity_enforced` so the row passed to `checkDropReady` has the new field. The select becomes:
     `"id, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket, capacity_enforced"`.
   - After the `checkDropReady` call (which now internally honors the flag), capture the flag locally:
     ```ts
     const capacityEnforced = dropRow?.capacity_enforced ?? true;
     ```
     Place this immediately after the readiness check passes (just before the `pickupRow` fetch) so the rest of the handler can branch on it.
   - Wrap the per-pickup sold-out block (current lines ~103-111, the `pickupSoldOut` 409 return) in `if (capacityEnforced) { ... }`. When the flag is false, skip the entire check.
   - Wrap the reservation loop (current lines ~122-149, the `reserve_pickup_slot` for-loop including the rollback-on-failure logic) in `if (capacityEnforced) { ... }`. When the flag is false, do NOT call `reserve_pickup_slot` and leave `reserved` as an empty array. Do not change the aggregation of `totals` (that is harmless work and keeps the diff minimal).
   - The three `release_pickup_slot` rollback sites further down (customer creation failure, order failure, invoice failure, and the outer `catch` for Square errors) iterate over `reserved`. Because `reserved` will be empty when `capacityEnforced=false`, those loops naturally no-op. Confirm by reading — do not add an explicit guard.
   - Do NOT touch Square order/invoice creation logic, idempotency keys, or error handling.

2. In `components/OrderLanding.tsx`:
   - The `itemSoldOut` derivation around lines 181-183 already reads from `drop.soldOut.pulledPork` / `drop.soldOut.brisket`. Because Task 1 forces those booleans to `false` when `capacityEnforced=false`, no UI change is required for individual items.
   - Verify by inspection (no edit) that no other UI branch uses raw capacity/reserved math from `drop.capacity.*` to render sold-out state. If any such branch exists, gate it on `drop.capacityEnforced` the same way (force not-sold-out when disabled). Search the file for `capacity.` and `soldOut` and confirm only the existing `drop.soldOut.*` reads are present.
   - Leave the `inStock` / `bundleRemaining` / `variation.remaining` logic at lines 125-131 untouched — that is Square inventory, not Supabase capacity, and is explicitly out of scope.

3. Run a `tsc`-equivalent compile check via `npm run build` is overkill — instead rely on `npx tsc --noEmit` to catch any type drift from the new `capacityEnforced` field.

Use the Edit tool for surgical changes. Do not rewrite the route handler wholesale.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run</automated>
  </verify>
  <done>Checkout route reads `capacity_enforced` from the drop row and skips both the per-pickup sold-out 409 and the `reserve_pickup_slot` loop when the flag is false. `OrderLanding.tsx` reflects the new behavior automatically through `drop.soldOut.*`. TypeScript compiles cleanly. Full test suite passes.</done>
</task>

</tasks>

<verification>
- [ ] `supabase/migrations/0003_capacity_enforced.sql` exists and adds the column with `NOT NULL DEFAULT true`
- [ ] `DropDTO.capacityEnforced: boolean` is exported from `lib/types.ts`
- [ ] `fetchActiveDrop` selects and maps `capacity_enforced`; forces `soldOut` booleans to false when disabled
- [ ] `checkDropReady` short-circuits to `{ ok: true }` when `capacity_enforced=false`, but still enforces status and cutoff
- [ ] Checkout route bypasses the per-pickup sold-out check and the reservation loop when `capacity_enforced=false`
- [ ] Existing back-compat: drops with `capacity_enforced=true` (the default) behave identically to before
- [ ] `npx vitest run` passes (existing + new tests)
- [ ] `npx tsc --noEmit` passes
</verification>

<success_criteria>
With `capacity_enforced=true` (default): all existing checkout, capacity, and UI behavior is unchanged. With `capacity_enforced=false` on a drop: customers can place orders even when reserved totals equal or exceed capacity, no `reserve_pickup_slot` rows are written, the UI does not display sold-out badges driven by Supabase capacity, and Square inventory continues to gate item availability through the unchanged `remaining` checks.
</success_criteria>

<output>
After completion, create `.planning/quick/260505-rcp-add-capacity-enforced-boolean-flag-to-th/260505-rcp-SUMMARY.md`
</output>
