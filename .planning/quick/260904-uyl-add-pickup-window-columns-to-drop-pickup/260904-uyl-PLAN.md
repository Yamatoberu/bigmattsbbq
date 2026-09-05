---
phase: quick-260904-uyl
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [ISSUE-6]
files_modified:
  - lib/database.types.ts
  - lib/timezone.ts
  - lib/drops.ts
  - lib/types.ts
  - components/CheckoutClient.tsx
  - app/api/checkout/route.ts
  - e2e/fixtures/activeDrop.ts
  - tests/timezone.test.ts
  - tests/drops.test.ts
  - tests/storefront-state.test.ts
  - tests/checkoutSlack.test.ts
  - tests/checkoutInvoiceDueDate.test.ts
  - tests/checkoutLineItems.test.ts
  - supabase/migrations/0006_pickup_windows.sql
  - supabase/migrations/0007_drop_pickup_at.sql

must_haves:
  truths:
    - "A single drop can carry a different pickup window per drop_pickup_options row"
    - "A single-day window renders as one date; a multi-day window renders as a start-to-end range"
    - "The checkout page shows each pickup option's date window and no time of day at all"
    - "Square receives a valid RFC3339 pickup_at equal to noon America/Denver on pickup_start_date, correct in both MST and MDT"
    - "The Square invoice due_date still comes from pickup_date, unchanged"
    - "orders.pickup_option_id still durably links an order to its selected pickup window"
    - "No file under app/, lib/, components/, tests/, or e2e/ references pickup_at or pickupAtISO"
  artifacts:
    - path: "lib/timezone.ts"
      provides: "PICKUP_TIME_ZONE and DST-correct zonedNoonToUtcISO"
      exports: ["PICKUP_TIME_ZONE", "zonedNoonToUtcISO"]
    - path: "tests/timezone.test.ts"
      provides: "Standard-time and daylight-time proofs for zonedNoonToUtcISO"
      contains: "2026-01-15T19:00:00.000Z"
    - path: "lib/drops.ts"
      provides: "formatPickupWindow window-label helper and pickup_at-free fetchActiveDrop"
      exports: ["formatPickupDate", "formatPickupWindow", "fetchActiveDrop", "checkDropReady"]
    - path: "supabase/migrations/0006_pickup_windows.sql"
      provides: "Additive expand migration: window columns, backfill, check constraint, dormant orders.assigned_pickup_date"
      contains: "pickup_end_date >= pickup_start_date"
    - path: "supabase/migrations/0007_drop_pickup_at.sql"
      provides: "Contract migration dropping drop_pickup_options.pickup_at"
      contains: "drop column if exists pickup_at"
  key_links:
    - from: "lib/drops.ts fetchActiveDrop"
      to: "drop_pickup_options window columns"
      via: "select() lists the window columns and orders by pickup_date"
      pattern: "pickup_start_date, pickup_end_date"
    - from: "app/api/checkout/route.ts"
      to: "lib/timezone.ts zonedNoonToUtcISO"
      via: "Square PICKUP fulfillment pickup_at synthesis"
      pattern: "pickup_at: zonedNoonToUtcISO\\("
    - from: "app/api/checkout/route.ts"
      to: "lib/drops.ts formatPickupWindow"
      via: "pickupDateLabel feeding pickupNote and the Slack notification"
      pattern: "formatPickupWindow\\(pickupRow\\.pickup_start_date"
---

<objective>
Add `pickup_start_date` / `pickup_end_date` to `drop_pickup_options`, add a dormant
nullable `orders.assigned_pickup_date`, and remove `drop_pickup_options.pickup_at`
entirely — rewiring every consumer to the new window columns (GitHub issue #6).

Purpose: `pickup_date` and `pickup_at` can report two different calendar dates for the
same row (one live row has `pickup_date: "2026-09-03"` but
`pickup_at: "2026-09-04T00:00:00+00:00"` — midnight UTC is 6pm Mountain the day
before). That has already caused real confusion running a drop. The fix is not to sync
the two fields; it is to eliminate the ambiguous one and replace it with an explicit
date window that can span multiple days.

Output: two migrations (expand then contract, neither applied by the executor), a
DST-correct timezone utility with unit proofs, a shared window-label formatter, and a
green test suite with no `pickup_at` / `pickupAtISO` anywhere in application code.
</objective>

<scope_note>
**The rollout ordering in CONTEXT.md is unsafe for this task's shape, and the plan
corrects it. This is a rollout-procedure fix, not a scope change — every locked
decision still ships in full.**

CONTEXT.md prescribes "deploy code first, then apply the migration," copied from quick
task 260904-twn (#13). That rule was correct there because #13's code change only
*removed* columns from `select()` lists, so new code was trivially compatible with the
old schema.

This task is different: the new code both *removes* `pickup_at` **and adds**
`pickup_start_date` / `pickup_end_date` to its selects. That makes **both** single-step
orderings break production:

- Deploy code first → new code selects `pickup_start_date`, which does not exist yet →
  PostgREST errors → `GET /api/drop` and `POST /api/checkout` 500 until the migration
  lands.
- Apply migration first → old deployed code still selects `pickup_at`, which the
  migration dropped → same 500, in the other direction.

The standard expand/contract split removes the window entirely and delivers 100% of the
locked scope:

1. **`0006_pickup_windows.sql` (expand)** — purely additive. Adds the window columns,
   backfills them, adds the check constraint, adds `orders.assigned_pickup_date`. Old
   deployed code ignores columns it does not select, so this is safe to apply *before*
   the deploy.
2. **Deploy the code.** New code reads the window columns (now present) and no longer
   selects `pickup_at` (still present, now unread).
3. **`0007_drop_pickup_at.sql` (contract)** — drops `pickup_at`. Safe only once no
   deployed code selects it.

`pickup_at` is still fully removed in this task, exactly as the owner decided. Only the
*application order* differs, and it differs because CONTEXT.md's stated rationale
("nothing breaks by column absence since selects would already be dropped in the same
deploy") does not hold once the same deploy also adds new column reads.

Two other things worth stating up front:

- **`app/api/test-seed/route.ts` needs no change.** Grep confirms it selects only
  `"id, location_label, pickup_date"` — no `pickup_at`. Do not touch it.
- **`due_date: pickupRow.pickup_date` at `app/api/checkout/route.ts:336` is untouched.**
  Retiring `pickup_date` belongs to issue #10. Changing it here would regress invoice
  due-date behavior that quick task 260831-s0z deliberately established.
</scope_note>

<decisions>
- **D-1 (owner):** `pickup_date` is left completely untouched — same type, same values,
  no migration statement touches it. The checkout route keeps reading it for the Square
  invoice `due_date`, and `fetchActiveDrop` keeps selecting it (now also as the sort
  key). Retiring it is issue #10's job.
- **D-2 (owner):** `orders.assigned_pickup_date` is added now as a nullable `date`
  column and left dormant — no code reads or writes it until issue #7 exists. Cheaper
  than giving #7 its own migration.
- **D-3 (owner):** `pickup_at` is dropped in this task, not deferred to #10, and its
  consumers are rewired now.
- **D-4 (owner):** Customer-facing time-of-day is **removed, not replaced**. After this
  change there is no visible time at all on the pickup-option card — only the date
  window. Do not invent a replacement time-of-day field, a fixed display time, or a
  "TBD" placeholder.
- **D-5 (owner):** Square's required `pickup_details.pickup_at` instant is synthesized
  as **noon America/Denver on `pickup_start_date`**. Square just needs *a* valid instant;
  the window columns are the operational source of truth. The conversion must compute
  Denver's offset from the IANA database per-date — a hardcoded `-07:00` or `-06:00`
  literal is wrong for roughly half the year and is forbidden.
- **D-6 (Claude's discretion, per CONTEXT):** The DST helper lives in a new pure module
  `lib/timezone.ts` rather than in `lib/drops.ts`. `lib/drops.ts` starts with
  `import "server-only"`, which throws under Vitest's node environment unless every test
  file mocks it. Keeping the helper in a dependency-free module makes
  `tests/timezone.test.ts` a plain import with no mocking scaffolding.
- **D-7 (Claude's discretion, per CONTEXT):** The window-label helper
  `formatPickupWindow` lives in `lib/drops.ts` next to `formatPickupDate`, exactly as
  CONTEXT directs, and is imported by `app/api/checkout/route.ts` (which already imports
  `checkDropReady` from that module) so the formatting logic exists once.
- **D-8 (Claude's discretion):** Migration `0006` adds
  `check (pickup_end_date >= pickup_start_date)`. Cheap, catches bad config early, and
  every existing row satisfies it trivially since the backfill sets start == end.
- **D-9 (Claude's discretion):** `formatPickupDate` is repurposed to take a **date-only**
  `YYYY-MM-DD` string instead of a timestamptz ISO string. See `<date_only_trap>` — this
  is load-bearing, not cosmetic.
- **D-10 (plan):** Two migrations (expand `0006`, contract `0007`) instead of one. See
  `<scope_note>`. Neither is applied by the executor.
</decisions>

<date_only_trap>
**Read this before writing Task 2. Getting it wrong produces an off-by-one date that
every test would still pass and no reviewer would notice.**

`formatPickupDate` currently does `new Date(isoDate)` then `toLocaleDateString` with
`timeZone: "America/Denver"`. That is correct **only because its sole caller passes
`pickup_at`, a full timestamptz**.

Its new input is `pickup_start_date`, a bare `YYYY-MM-DD` date string. `new Date("2026-09-03")`
is parsed by ECMAScript as **UTC midnight**, and UTC midnight rendered in
`America/Denver` is 6pm on **September 2**. So the naive change renders `"2026-09-03"`
as **"Sep 2"** — silently one day early, for every pickup option, forever.

The fix: for date-only input, split the string on `-`, build the instant with
`Date.UTC(year, month - 1, day)`, and format it with `timeZone: "UTC"`. There is no
timezone conversion to perform — a calendar date has no instant, so it must not be
shifted into a zone.

The identical trap exists at `app/api/checkout/route.ts:259`, where the same
`new Date(...).toLocaleDateString(..., timeZone: "America/Denver")` pattern is inlined.
Task 3 deletes that inline block outright and calls `formatPickupWindow` instead, which
inherits the corrected behavior.

Task 2 must include a regression test asserting `formatPickupDate("2026-09-03") === "Sep 3"`.
That assertion fails against the current implementation, which is the point.

Note the contrast: the *display* helper must **not** apply a timezone
(`Date.UTC` + `timeZone: "UTC"`), while the *Square instant* helper in Task 1 **must**
apply one (noon Denver -> UTC). They look similar and are opposites. Do not unify them.
</date_only_trap>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/260904-uyl-add-pickup-window-columns-to-drop-pickup/260904-uyl-CONTEXT.md
@lib/drops.ts
@lib/types.ts
@app/api/checkout/route.ts
@supabase/migrations/0005_remove_capacity_enforcement.sql

Project conventions that bind this work (from CLAUDE.md):
- TypeScript `strict: true`; no `any`; 2-space indent; final newline; UTF-8.
- Named exports only outside `app/` page/layout files.
- Zod `safeParse` at API boundaries, never `parse`.
- **No comments explaining *what* code does.** Do not narrate the timezone maths with
  inline comments; express it through clear identifiers and let the unit test document
  the contract.
- Vitest, node environment (not jsdom), `include: ["tests/**/*.test.ts"]`.
  Single file: `npx vitest run tests/<name>.test.ts`.
- Migrations are forward-only — no `down` / rollback sections. Match the header comment
  style of `0005_remove_capacity_enforcement.sql`.
</context>

<interfaces>
Exact contracts. The executor should not need to re-derive any of these.

New module `lib/timezone.ts`:
```typescript
export const PICKUP_TIME_ZONE = "America/Denver";

export function zonedNoonToUtcISO(date: string, timeZone: string): string;
```
`date` is `YYYY-MM-DD`. Returns an RFC3339 instant (`new Date(ms).toISOString()`).

`lib/drops.ts` — one signature change, one addition:
```typescript
export function formatPickupDate(date: string): string;        // date is now YYYY-MM-DD
export function formatPickupWindow(startDate: string, endDate: string): string;
```

`lib/types.ts` — `PickupOptionDTO` loses one member and gains none:
```typescript
export interface PickupOptionDTO {
  id: string;
  locationLabel: string;
  pickupDateLabel: string;
  pickupAtISO: string;      // DELETE — no replacement value
}
```

`lib/database.types.ts` post-migration shape (Task 1 adds, Task 4 removes):
```typescript
drop_pickup_options.Row:  { drop_id, id, location_label, pickup_date, pickup_start_date, pickup_end_date }
drop_pickup_options.Insert: same, with id optional          // all window fields: string
drop_pickup_options.Update: same, all optional
orders.Row:    { ..., assigned_pickup_date: string | null }
orders.Insert: { ..., assigned_pickup_date?: string | null }
orders.Update: { ..., assigned_pickup_date?: string | null }
```
`assigned_pickup_date` follows the existing `order_cutoff_at: string | null` pattern on
`drops`; the window columns follow the existing `pickup_date: string` pattern. Keys in
each block are alphabetically sorted — preserve that ordering
(`assigned_pickup_date` sorts first in `orders`; `pickup_end_date` sorts before
`pickup_start_date`, both after `pickup_date`).

Existing DDL being extended (`supabase/migrations/0001_foundation.sql`):
```sql
create table public.drop_pickup_options (
  id             uuid primary key default gen_random_uuid(),
  drop_id        uuid not null references public.drops(id) on delete cascade,
  location_label text not null,
  pickup_date    date not null,
  pickup_at      timestamptz not null,
  ...
);
```
`orders.pickup_option_id uuid not null references public.drop_pickup_options(id)` —
unchanged by this task; it remains the durable order-to-window link.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add the post-migration column types and the DST-correct Denver-noon helper</name>
  <files>lib/database.types.ts, lib/timezone.ts, tests/timezone.test.ts</files>
  <behavior>
`zonedNoonToUtcISO(date, "America/Denver")` — noon local, converted to the true UTC
instant, with the offset resolved per-date from the IANA database:
    - "2026-01-15" -> "2026-01-15T19:00:00.000Z"   (MST, UTC-7, standard time)
    - "2026-07-15" -> "2026-07-15T18:00:00.000Z"   (MDT, UTC-6, daylight time)
    - "2026-03-08" -> "2026-03-08T18:00:00.000Z"   (spring-forward day; noon is already MDT)
    - "2026-11-01" -> "2026-11-01T19:00:00.000Z"   (fall-back day; noon is already MST)
    - The Jan and Jul results differ by exactly one hour of offset, proving the value is
      computed rather than hardcoded.
    - Every returned value parses back via Date.parse without NaN.
    - PICKUP_TIME_ZONE === "America/Denver".
These four expected strings were verified against Node's ICU before this plan was
written. Treat them as ground truth: if the implementation disagrees, the implementation
is wrong.
  </behavior>
  <action>
Create `lib/timezone.ts` exporting `PICKUP_TIME_ZONE` and `zonedNoonToUtcISO` per
`<interfaces>` (D-6). Named exports, no default export, no `server-only` import — this
module must stay dependency-free so the test can import it directly.

Implement `zonedNoonToUtcISO` with the standard Intl offset-computation technique. Do
**not** hardcode any UTC offset string (D-5):

1. Split `date` on `-` into numeric year, month, day.
2. Build `target = Date.UTC(year, month - 1, day, 12, 0, 0)` — this is the desired wall
   time treated as if it were UTC.
3. Compute the zone's offset at a given instant with a local helper: format the instant
   through `new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric",
   month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })`,
   read `formatToParts`, drop the `literal` parts, reassemble the numeric parts through
   `Date.UTC(...)`, and subtract the original instant. That difference is the offset in
   milliseconds.
4. `let instant = target - offsetAt(target)`, then run one refinement pass
   `instant = target - offsetAt(instant)`. The refinement makes the result exact when the
   first guess lands on the far side of a transition; it is a no-op for noon, which is
   never near the 2am transition, but costs nothing and removes the edge case from
   consideration.
5. Return `new Date(instant).toISOString()`.

Use `hourCycle: "h23"` specifically — `hour12: false` yields hour `24` for midnight in
some ICU builds and would poison the arithmetic.

Guard the parse: if the split does not yield three finite numbers, throw an `Error` whose
message names the offending input. Do not silently return an invalid date — this value is
sent straight to Square and a bad instant fails the order creation with an opaque error.

Create `tests/timezone.test.ts` covering exactly the four dates and the two invariants in
`<behavior>`. Plain `import` — no `vi.doMock("server-only", ...)` is needed here, unlike
`tests/drops.test.ts`.

`lib/database.types.ts` — **additive edit only in this task.** Add
`pickup_start_date: string` and `pickup_end_date: string` to the `Row`, `Insert`, and
`Update` blocks of `drop_pickup_options` (optional-marked with `?` in `Update`, and in
`Insert` per that block's existing convention), and add `assigned_pickup_date` to the
`Row`, `Insert`, and `Update` blocks of `orders` per `<interfaces>`. Respect the
alphabetical key ordering already used in the file.

**Leave `pickup_at` in place for now.** Removing it here would break `lib/drops.ts` and
`app/api/checkout/route.ts` simultaneously, and those are rewired in two different later
tasks — the tree would not compile in between. Task 4 removes it once no consumer reads
it. Do not touch `lib/database-sca.types.ts`; it holds an unrelated `sca` schema.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/timezone.test.ts && test 0 -eq "$(grep -n '\-07:00\|\-06:00' lib/timezone.ts | grep -c . || true)"</automated>
  </verify>
  <done>`lib/timezone.ts` exports `PICKUP_TIME_ZONE` and `zonedNoonToUtcISO`; `tests/timezone.test.ts` passes all four date cases with the exact expected instants; no hardcoded UTC offset literal appears in `lib/timezone.ts`; `lib/database.types.ts` carries both window columns and `assigned_pickup_date` while still carrying `pickup_at`; `tsc --noEmit` is clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add the window-label formatter and move the read side off pickup_at</name>
  <files>lib/drops.ts, lib/types.ts, components/CheckoutClient.tsx, e2e/fixtures/activeDrop.ts, tests/drops.test.ts, tests/storefront-state.test.ts</files>
  <behavior>
`formatPickupDate(date)` — date-only, timezone-neutral (see `<date_only_trap>`):
    - "2026-09-03" -> "Sep 3"   (this currently returns "Sep 2" — the regression this task fixes)
    - "2026-01-01" -> "Jan 1"
`formatPickupWindow(startDate, endDate)`:
    - ("2026-09-03", "2026-09-03") -> "Sep 3"
    - ("2026-09-01", "2026-09-03") -> "Sep 1 – Sep 3"
    - Separator is a space, U+2013 EN DASH, space. Not a hyphen, not an em dash.
`fetchActiveDrop()`:
    - Maps each row to `{ id, locationLabel, pickupDateLabel }` with no `pickupAtISO` key.
    - A row whose start and end differ yields a range label.
  </behavior>
  <action>
`lib/drops.ts`:

- Rewrite `formatPickupDate` to take a date-only `YYYY-MM-DD` string per D-9 and
  `<date_only_trap>`: split on `-`, build `new Date(Date.UTC(year, month - 1, day))`, and
  format with `toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })`.
  Keep the exported name and the `{ month: "short", day: "numeric" }` output shape so the
  rendered label is visually unchanged. Rename the parameter from `isoDate` to `date` so
  the new contract is legible from the signature. Do **not** pass `America/Denver` here —
  that is precisely the bug.
- Add exported `formatPickupWindow(startDate, endDate)` immediately below it (D-7):
  return `formatPickupDate(startDate)` when the two strings are equal, otherwise
  `` `${formatPickupDate(startDate)} – ${formatPickupDate(endDate)}` `` using U+2013.
- In `fetchActiveDrop`, change the `drop_pickup_options` select from
  `"id, location_label, pickup_date, pickup_at"` to
  `"id, location_label, pickup_date, pickup_start_date, pickup_end_date"`.
- Change `.order("pickup_at", { ascending: true })` to
  `.order("pickup_date", { ascending: true })`. Per CONTEXT, sort on the retained
  `pickup_date` column — do not sort on the window columns; defining sort semantics for a
  date *range* is a separate design question this task does not need to answer.
- In the `pickupOptions` map, replace `pickupDateLabel: formatPickupDate(row.pickup_at)`
  with `pickupDateLabel: formatPickupWindow(row.pickup_start_date, row.pickup_end_date)`
  and delete the `pickupAtISO: row.pickup_at` property outright. The mapped object keeps
  exactly `id`, `locationLabel`, `pickupDateLabel`.
- Leave `checkDropReady`, `DropReadinessRow`, `DropReadiness`, and the `drops` query
  untouched.

`lib/types.ts`: delete `PickupOptionDTO.pickupAtISO` (see `<interfaces>`). Add nothing.
Leave every other exported type alone.

`components/CheckoutClient.tsx`: delete the entire `<p className="text-sm text-smoke-600">`
block at lines ~296-302 that renders `option.pickupAtISO` through `toLocaleTimeString`.
Leave the `{option.pickupDateLabel}` `<p>` on line ~295 exactly as it is — it keeps
working and is now sourced from the window label. Per D-4 the card shows no time and no
placeholder afterward; the surrounding `<div>`, button, and selection logic are unchanged.

`e2e/fixtures/activeDrop.ts`: remove the `pickupAtISO` field from both pickup options.
Keep both `pickupDateLabel` strings and `THREE_DAYS_MS` (still used by `orderCutoffAt`).
The fixture is typed `DropDTO`, so `tsc` proves the removal is complete.

`tests/drops.test.ts`:
- In the local `PickupRow` interface, replace `pickup_at: string` with
  `pickup_start_date: string` and `pickup_end_date: string`.
- Update both row fixtures: `p1` stays single-day (start == end == `"2026-05-09"`), and
  change `p2` to a genuine multi-day window (`pickup_start_date: "2026-05-10"`,
  `pickup_end_date: "2026-05-12"`) so the range branch is covered by a real
  `fetchActiveDrop` result, not only by a direct helper call.
- Replace the `expect(result!.pickupOptions[0].pickupAtISO).toBe(...)` assertion with
  `expect(result!.pickupOptions[0].pickupDateLabel).toBe("May 9")` and add
  `expect(result!.pickupOptions[1].pickupDateLabel).toBe("May 10 – May 12")`.
- Add a `describe` block directly exercising `formatPickupDate` and `formatPickupWindow`
  against every case in `<behavior>`, including the load-bearing
  `formatPickupDate("2026-09-03") === "Sep 3"` regression assertion. These are imported
  from `../lib/drops`, so they must run inside the existing `server-only` mock scaffolding
  — reuse `mockSupabaseModule`'s `vi.doMock("server-only", () => ({}))` pattern rather
  than importing the module at the top of the file.
- The mock client ignores `.order()` arguments, so switching the sort column needs no
  mock change. Keep the null-drop and error-propagation cases as they are.

`tests/storefront-state.test.ts`: remove the `pickupAtISO` line from the DropDTO-shaped
literal at lines ~43-44. Keep `pickupDateLabel` and every existing assertion.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/drops.test.ts tests/storefront-state.test.ts && test 0 -eq "$(grep -rn 'pickupAtISO' lib/ components/ app/ tests/ e2e/ | grep -c . || true)" && test 0 -eq "$(grep -rn 'pickup_at' lib/drops.ts | grep -c . || true)"</automated>
  </verify>
  <done>`formatPickupWindow` is exported from `lib/drops.ts` and returns a single date for equal bounds and an en-dash range otherwise; `formatPickupDate("2026-09-03")` returns `"Sep 3"`; `fetchActiveDrop` selects the window columns, orders by `pickup_date`, and emits no `pickupAtISO`; `PickupOptionDTO` has exactly `id`, `locationLabel`, `pickupDateLabel`; the checkout pickup card renders no time; `pickupAtISO` appears nowhere in the repo source; `tsc --noEmit` is clean and both named test files pass.</done>
</task>

<task type="auto">
  <name>Task 3: Move the checkout route off pickup_at and synthesize Square's instant</name>
  <files>app/api/checkout/route.ts, tests/checkoutSlack.test.ts, tests/checkoutInvoiceDueDate.test.ts, tests/checkoutLineItems.test.ts</files>
  <action>
`app/api/checkout/route.ts` — four edits, nothing else:

1. Line ~190: change the `drop_pickup_options` select from
   `"id, location_label, pickup_at, pickup_date"` to
   `"id, location_label, pickup_date, pickup_start_date, pickup_end_date"`. Keep both
   `.eq(...)` filters, the `pickupErr` guard, and the `!pickupRow` 404 exactly as they are.
2. Lines ~259-263: delete the inline
   `const pickupDateLabel = new Date(pickupRow.pickup_at).toLocaleDateString("en-US", {...})`
   block entirely and replace it with
   `const pickupDateLabel = formatPickupWindow(pickupRow.pickup_start_date, pickupRow.pickup_end_date);`.
   This is the second instance of the `<date_only_trap>` pattern — deleting it, rather
   than adapting it, is what removes the trap. Line ~264
   (`pickupNote = \`${pickupRow.location_label} Pickup - ${pickupDateLabel}\``) is
   unchanged and now carries the window label automatically.
3. Line ~289, inside the Square `fulfillments[0].pickup_details`: replace
   `pickup_at: pickupRow.pickup_at,` with
   `pickup_at: zonedNoonToUtcISO(pickupRow.pickup_start_date, PICKUP_TIME_ZONE),` per D-5.
   The `note` and `recipient` keys are unchanged.
4. Imports: extend the existing `import { checkDropReady } from "../../../lib/drops";` on
   line 17 to `import { checkDropReady, formatPickupWindow } from "../../../lib/drops";`,
   and add `import { PICKUP_TIME_ZONE, zonedNoonToUtcISO } from "../../../lib/timezone";`
   alongside the other `lib/` imports.

**Do not touch line ~336 `due_date: pickupRow.pickup_date`** (D-1). It is the subject of
quick task 260831-s0z and belongs to issue #10. Likewise leave `cartSchema`,
`sanitizeAttribution`, `buildAttributionMetadata`, `notifySlackNewOrder`, the
`PRODUCT_NAME_LABELS` map, and the whole customer/order/invoice flow untouched.
`notifySlackNewOrder` receives `pickupDateLabel` as a plain string (line ~381) and needs
no change — it inherits the window label.

Tests — the three files that carry a `pickup_at` fixture key:

- `tests/checkoutLineItems.test.ts` (~line 84) and `tests/checkoutSlack.test.ts`
  (~line 86): replace `pickup_at: "2099-06-01T12:00:00Z"` with
  `pickup_start_date: "2099-06-01"` and `pickup_end_date: "2099-06-01"`. Keep
  `pickup_date: "2099-06-01"`. Change no line-item and no Slack assertion — those are the
  behaviors this task must prove unregressed.
- `tests/checkoutInvoiceDueDate.test.ts` (~lines 87-88): in `makePickupRow`, replace
  `pickup_at: \`${pickupDate}T12:00:00Z\`` with `pickup_start_date: pickupDate` and
  `pickup_end_date: pickupDate`, keeping `pickup_date: pickupDate`. **Every existing
  due-date assertion must still pass byte-for-byte** — this file is the regression guard
  proving D-1 held and `due_date` still tracks `pickup_date`.
- Add one new case to `tests/checkoutSlack.test.ts` asserting the Slack payload's pickup
  line carries the window label for a **multi-day** row (`pickup_start_date: "2099-06-01"`,
  `pickup_end_date: "2099-06-03"` -> the notification text contains `"Jun 1 – Jun 3"`).
  Follow the file's existing mock and assertion style; do not restructure it.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/checkoutSlack.test.ts tests/checkoutInvoiceDueDate.test.ts tests/checkoutLineItems.test.ts && test 0 -eq "$(grep -n 'pickup_at' app/api/checkout/route.ts | grep -v 'pickup_at: zonedNoonToUtcISO' | grep -c . || true)" && grep -q 'due_date: pickupRow.pickup_date' app/api/checkout/route.ts</automated>
  </verify>
  <done>The checkout route selects the window columns and no `pickup_at`; `pickupDateLabel` comes from `formatPickupWindow`; the only surviving `pickup_at` token in the file is the Square request key assigned from `zonedNoonToUtcISO`; `due_date: pickupRow.pickup_date` is intact; all three checkout test files pass including the new multi-day Slack case; `tsc --noEmit` is clean.</done>
</task>

<task type="auto">
  <name>Task 4: Write the expand and contract migrations, drop pickup_at from the generated types, and verify end to end</name>
  <files>supabase/migrations/0006_pickup_windows.sql, supabase/migrations/0007_drop_pickup_at.sql, lib/database.types.ts</files>
  <action>
Two migrations per D-10 and `<scope_note>`. Match the header comment style of
`0005_remove_capacity_enforcement.sql` (a boxed `-- ===` banner naming the migration
number and its purpose, plus `-- ---` section dividers). Forward-only — no `down`
section, matching `0001`-`0005`. Use `if exists` / `if not exists` on every statement so
both files are idempotent. Do not use `cascade` anywhere.

**`supabase/migrations/0006_pickup_windows.sql` — additive only. Nothing in this file may
drop or alter an existing column.** In order:

1. `alter table public.drop_pickup_options add column if not exists pickup_start_date date;`
   and the same for `pickup_end_date`. Add them **nullable** — the table has live rows and
   a `not null` column with no default would fail immediately.
2. Backfill: `update public.drop_pickup_options set pickup_start_date = pickup_date,
   pickup_end_date = pickup_date where pickup_start_date is null or pickup_end_date is null;`
   All existing rows are single-day (confirmed against the live project), so start == end
   is correct for every one of them.
3. Promote both columns with `alter table public.drop_pickup_options alter column
   pickup_start_date set not null;` and the same for `pickup_end_date`. This runs after the
   backfill, so it cannot fail on existing data.
4. The D-8 check constraint. Postgres has no `add constraint if not exists`, so make it
   idempotent by pairing
   `alter table public.drop_pickup_options drop constraint if exists drop_pickup_options_pickup_window_check;`
   with
   `alter table public.drop_pickup_options add constraint drop_pickup_options_pickup_window_check check (pickup_end_date >= pickup_start_date);`
5. `alter table public.orders add column if not exists assigned_pickup_date date;` — D-2.
   Nullable with no default and no backfill; it stays dormant until issue #7.

Do not add a `not null` constraint, default, or index to `assigned_pickup_date`, and do
not write a single statement touching `pickup_date` (D-1).

**`supabase/migrations/0007_drop_pickup_at.sql` — the contract step.** A single
`alter table public.drop_pickup_options drop column if exists pickup_at;`. Include a
header comment stating in plain terms that this file must not be applied until the code
that stopped selecting `pickup_at` is deployed, and pointing at `0006` as its
prerequisite. That comment is the durable record of the ordering constraint — the
`<human-check>` below only exists for this session.

**Neither migration is applied by the executor.** Create the files, commit them, stop.
Applying them is the ordered human step in `<verification>`.

`lib/database.types.ts` — the subtractive half of the Task 1 edit, now safe because no
consumer reads the column: remove `pickup_at` from the `Row`, `Insert`, and `Update`
blocks of `drop_pickup_options`. Leave the window columns and `assigned_pickup_date` added
in Task 1 in place, leave every other table alone, and do not touch
`lib/database-sca.types.ts`.

This file is Supabase-generated; the hand-edit is a stopgap that lets TypeScript compile
against the intended post-migration shape while the migrations sit unapplied. **Record in
the task summary that `lib/database.types.ts` must be regenerated from the live schema
once `0007` has been applied to both environments,** and that the regenerated output
should be diffed against this hand-edit to confirm they agree.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run test && npm run build && grep -q 'pickup_end_date >= pickup_start_date' supabase/migrations/0006_pickup_windows.sql && grep -q 'assigned_pickup_date date' supabase/migrations/0006_pickup_windows.sql && grep -q 'drop column if exists pickup_at' supabase/migrations/0007_drop_pickup_at.sql && test 0 -eq "$(grep -c 'drop column\|drop constraint drop_pickup_options_pickup_window_check' supabase/migrations/0006_pickup_windows.sql || true)" && test 0 -eq "$(grep -rn 'pickup_at\|pickupAtISO' app/ lib/ components/ tests/ e2e/ | grep -v 'pickup_at: zonedNoonToUtcISO' | grep -c . || true)"</automated>
  </verify>
  <done>`0006` adds both window columns, backfills them from `pickup_date`, promotes them to `not null`, adds the ordering check constraint, and adds nullable `orders.assigned_pickup_date` — with zero drop statements; `0007` drops `pickup_at` and documents its ordering prerequisite in a header comment; `lib/database.types.ts` reflects the post-`0007` shape; neither migration has been applied to Supabase; the only `pickup_at` token left under `app/`, `lib/`, `components/`, `tests/`, or `e2e/` is the Square request key; `npm run test` and `npm run build` both pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Deployed app -> Supabase Postgres | Schema shape is a contract in both directions; this change both adds and removes columns, so either half applied out of order breaks live reads |
| `POST /api/checkout` -> Square Orders API | A synthesized `pickup_at` instant crosses here and must be valid RFC3339 or order creation fails |
| Customer -> `/checkout` page | Pickup window is rendered to the customer and drives a real-world pickup; a wrong date is a wrong outcome, not a cosmetic bug |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-uyl-01 | Denial of Service | `lib/drops.ts` `fetchActiveDrop` and `app/api/checkout/route.ts` -> PostgREST | mitigate | The deploy both adds and removes column reads, so any single-step ordering 500s the storefront (see `<scope_note>`). Split into expand `0006` / deploy / contract `0007`, which is safe at every intermediate state. Ordering is enforced by the `<human-check>` and restated in `0007`'s header comment. |
| T-uyl-02 | Tampering / data loss | `drop_pickup_options.pickup_at` | accept | `drop column` is irreversible and the column holds real per-location pickup times (5pm/8pm/11pm Mountain across current rows). Accepted: the owner explicitly chose removing customer-facing time-of-day over preserving it (D-3, D-4), and `0007` runs only after `0006` has backfilled the replacement window columns. Take a Supabase point-in-time snapshot before applying `0007`. |
| T-uyl-03 | Information Disclosure (wrong data shown) | `formatPickupDate` / `formatPickupWindow` | mitigate | Date-only strings parsed as UTC midnight and rendered in `America/Denver` display one day early (`<date_only_trap>`). Mitigated by formatting with `Date.UTC` + `timeZone: "UTC"` and by the explicit `formatPickupDate("2026-09-03") === "Sep 3"` regression assertion in Task 2. |
| T-uyl-04 | Tampering (bad outbound data) | Square `pickup_details.pickup_at` | mitigate | A hardcoded UTC offset would be wrong for ~half the year, sending Square an instant on the wrong day near midnight. Mitigated by computing the offset per-date via `Intl.DateTimeFormat` and by `tests/timezone.test.ts` asserting both MST and MDT results plus both transition days. `zonedNoonToUtcISO` throws on unparseable input rather than emitting an invalid instant. |
| T-uyl-05 | Tampering (bad config) | `drop_pickup_options` window columns | mitigate | An operator could enter `pickup_end_date < pickup_start_date`, producing a nonsense reversed range on the customer-facing card. Mitigated by the D-8 `check (pickup_end_date >= pickup_start_date)` constraint in `0006`. |
| T-uyl-06 | Repudiation | `orders.pickup_option_id` | accept | Unchanged by this task and still `not null references drop_pickup_options(id)`, so every order keeps its durable link to the selected window. `assigned_pickup_date` is dormant and read by nothing (D-2), so it cannot yet disagree with the linked window. |

No package-manager installs in this task, so no Package Legitimacy Gate applies.
</threat_model>

<verification>
Run after all four tasks:

```bash
npx tsc --noEmit
npm run test
npm run build
npm run lint
```

Repo-wide dead-identifier gate — must print `0`. The single legitimate survivor is the
Square request key on the synthesized-instant line, which is excluded by name:

```bash
grep -rn 'pickup_at\|pickupAtISO' app/ lib/ components/ tests/ e2e/ \
  | grep -v 'pickup_at: zonedNoonToUtcISO' | grep -c .
```

(`supabase/migrations/` is intentionally excluded — `0001` legitimately creates
`pickup_at` and `0007` legitimately drops it; historical migrations must not be
rewritten.)

Expand-migration purity gate — `0006` must contain no destructive statement other than
the paired idempotency `drop constraint if exists`. Must print `0`:

```bash
grep -v '^--' supabase/migrations/0006_pickup_windows.sql \
  | grep 'drop column\|drop table\|drop constraint' \
  | grep -v 'drop constraint if exists drop_pickup_options_pickup_window_check' \
  | grep -c .
```

<human-check>
**Both migrations are applied manually, in a specific order, with the code deploy
sandwiched between them. Do not let the executor apply either one.**

The ordering is not the same as quick task 260904-twn's. Read `<scope_note>` before
starting — applying these in twn's order will 500 the storefront.

1. Take a Supabase point-in-time snapshot / backup (T-uyl-02).
2. Apply **`0006` only** to the Supabase **sandbox** project. It is purely additive, so
   the currently deployed code is unaffected. Confirm the homepage still loads and
   `/api/drop` still returns 200 **before** deploying anything.
3. Spot-check the backfill in sandbox:
   `select id, location_label, pickup_date, pickup_start_date, pickup_end_date from public.drop_pickup_options;`
   Every row must show `pickup_start_date = pickup_end_date = pickup_date`, with no nulls.
4. Apply **`0006` only** to **production**, and re-confirm the live homepage and
   `/api/drop`. Production is still running the old code and is still reading `pickup_at`,
   which is still present — nothing should change.
5. **Now** merge and deploy the code change to Vercel. Confirm: the homepage loads the
   active drop; `/checkout` lists both pickup options showing a date and **no time**; a
   full sandbox checkout succeeds end to end (Square order created with a valid
   `pickup_at` fulfillment, invoice emailed with the correct `due_date`, Slack
   notification fires carrying the window label).
6. Only after the deploy is confirmed healthy, apply **`0007`** — sandbox first, re-verify
   the same flow, then production.
7. Regenerate `lib/database.types.ts` from the live schema and diff it against the Task 1
   + Task 4 hand-edits to confirm they agree.

To exercise a real multi-day window before issue #7 ships an admin UI, hand-edit one
sandbox row (`update public.drop_pickup_options set pickup_end_date = pickup_start_date + 2
where id = '<row>';`) and confirm the checkout card renders the range with an en dash.
Revert it afterward.
</human-check>
</verification>

<success_criteria>
- `drop_pickup_options` carries `pickup_start_date` and `pickup_end_date` (both `date`,
  `not null`), backfilled from `pickup_date`, constrained by
  `pickup_end_date >= pickup_start_date`.
- `orders.assigned_pickup_date` exists as a nullable `date` column and is read and written
  by nothing.
- `pickup_date` is byte-for-byte unchanged in type and value, still selected by
  `fetchActiveDrop`, still the checkout route's invoice `due_date`, and now the
  pickup-option sort key.
- `drop_pickup_options.pickup_at` is dropped by `0007`, and no TypeScript source under
  `app/`, `lib/`, `components/`, `tests/`, or `e2e/` references `pickup_at` or
  `pickupAtISO` except the Square request key assigned from `zonedNoonToUtcISO`.
- `PickupOptionDTO` is exactly `{ id, locationLabel, pickupDateLabel }`.
- The checkout pickup-option card shows the location and the date window and **no time of
  day and no placeholder** (D-4).
- `formatPickupWindow` returns a single date when the bounds are equal and a
  `"Sep 1 – Sep 3"` en-dash range when they differ, and is the single source of the label
  for both `fetchActiveDrop` and the checkout route.
- `formatPickupDate("2026-09-03")` returns `"Sep 3"`, asserted by a test.
- `zonedNoonToUtcISO` returns `2026-01-15T19:00:00.000Z` for January and
  `2026-07-15T18:00:00.000Z` for July, with no hardcoded offset literal in
  `lib/timezone.ts`.
- `0006` contains zero destructive statements beyond the paired
  `drop constraint if exists`; `0007` contains only the `pickup_at` drop plus its ordering
  header comment.
- Neither migration has been applied to Supabase by the executor.
- `npx tsc --noEmit`, `npm run test`, `npm run build`, and `npm run lint` all pass, and
  both repo-wide gates print `0`.
</success_criteria>

<execution_note>
This is a larger quick task — 15 files across 4 tasks, roughly 20-30% context each,
modeled on quick task 260904-twn (17 files, 3 tasks).

Task ordering is load-bearing and additive-before-subtractive: Task 1 adds the new column
types while leaving `pickup_at` in the generated types, Tasks 2 and 3 move the two
consumers off it independently, and Task 4 removes it once nothing reads it. **Every task
leaves the tree compiling and `tsc --noEmit` clean**, so each is independently
committable. Reordering them, or pulling the `pickup_at` removal forward into Task 1,
breaks compilation between tasks.

If context pressure builds, commit after each task and `/clear` before starting the next.
</execution_note>

<output>
Create `.planning/quick/260904-uyl-add-pickup-window-columns-to-drop-pickup/260904-uyl-SUMMARY.md` when done.
</output>
</content>
</invoke>
