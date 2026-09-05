# Quick Task 260904-uyl: Add pickup-window columns to drop_pickup_options - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Task Boundary

Implements GitHub issue #6 (Yamatoberu/bigmattsbbq): add `pickup_start_date` and
`pickup_end_date` to `drop_pickup_options`, add a dormant nullable
`orders.assigned_pickup_date`, and — per discussion below — drop the existing
`pickup_at` column entirely, rewiring its current consumers rather than leaving it
in place. `pickup_date` is explicitly NOT touched in this task.

Parent project: #1. Prerequisite work (#13, capacity-enforcement removal) is
already done and deployed. This task's migration should be sequenced as its own
step, independent of #9/#3 (orders/order_items persistence), since it only touches
`drop_pickup_options` and adds one dormant column to `orders`.

</domain>

<decisions>
## Implementation Decisions

### pickup_date column
Leave `pickup_date` completely untouched — same type, same values, no migration
touches it. The checkout route still reads it for the Square invoice `due_date`,
and `lib/drops.ts` still selects it. Retiring `pickup_date` is explicitly #10's job
once the checkout route is rewritten for windows; doing it here would break
current invoice due-date behavior before #10 ships.

### orders.assigned_pickup_date
Add now, in this task, as a nullable `date` column on `orders`. It is dormant —
no code reads or writes it until #7 (admin assignment workflow) exists. Owner
confirmed this is cheaper than giving #7 its own migration later.

### pickup_at column — DROP IT, rewire consumers now
Owner explicitly wants `pickup_at` gone in this task, not deferred to #10. Reason
(confirmed against live data): `pickup_date` and `pickup_at` can show different
calendar dates for the same row (e.g. one existing row has
`pickup_date: "2026-09-03"` but `pickup_at: "2026-09-04T00:00:00+00:00"` — midnight
UTC is 6pm Mountain the day before), which has caused real confusion running a
drop. Owner accepted the full scope implication of this choice (see below) rather
than deferring to #10.

**Customer-facing time-of-day is being removed, not replaced.** `pickup_at`'s
time-of-day is currently shown to customers at checkout
(`components/CheckoutClient.tsx` ~line 296-303, via `option.pickupAtISO` →
`toLocaleTimeString` in `America/Denver`) using real per-location times already in
the data (e.g. 5pm/8pm/11pm Mountain across different rows). Owner explicitly chose
**"drop time-of-day entirely for now — windows only."** Checkout will show only the
date window (e.g. a single date, or "Sep 1–Sep 3" for a range). Do not invent a
replacement time-of-day field or fixed display time — there should be no visible
time at all in the customer-facing pickup option card after this change.

**Square still needs a timestamp.** The checkout route currently passes
`pickup_at: pickupRow.pickup_at` directly into Square's order fulfillment
(`pickup_details.pickup_at`, required RFC3339 instant for `type: "PICKUP"`). Once
`pickup_at` is gone, synthesize this instant as **noon America/Denver on
`pickup_start_date`** (owner's explicit choice — "Square just needs *a* valid
instant," precision beyond the date doesn't matter operationally since the window
columns are the real source of truth). This conversion must correctly account for
Denver's DST offset (UTC-7 standard / UTC-6 daylight) — do not hardcode a fixed
UTC offset string, since that will be wrong for roughly half the year. Use the
standard `Intl.DateTimeFormat`-based offset-computation technique (format a UTC
guess through the target IANA zone, diff against the parts, adjust), matching the
correctness the codebase already gets for free on the *display* side via
`toLocaleDateString`/`toLocaleTimeString` with `timeZone: "America/Denver"`. Add a
focused unit test asserting correct offsets for both a standard-time date (e.g.
January) and a daylight-time date (e.g. July).

### Known consumers that MUST be updated in this task (found via full-codebase grep before planning — treat as authoritative, not something to re-derive)
- `lib/drops.ts`: `fetchActiveDrop()` currently selects `pickup_at`, does
  `.order("pickup_at", { ascending: true })`, and builds
  `pickupDateLabel: formatPickupDate(row.pickup_at)` /
  `pickupAtISO: row.pickup_at` on each mapped pickup option.
  - Drop `pickup_at` from the select.
  - Order by `pickup_date` instead (kept column, already reliable for chronological
    sort — do not order by `pickup_start_date`/`pickup_end_date` for this, since
    ordering semantics for a date *range* per row is a separate design question
    this task doesn't need to solve).
  - Replace `pickupDateLabel` derivation with a new window-label helper (see
    below) built from `pickup_start_date`/`pickup_end_date`, not from `pickup_at`.
  - Remove `pickupAtISO` entirely — no replacement value.
- `lib/types.ts`: remove `PickupOptionDTO.pickupAtISO`.
- `components/CheckoutClient.tsx`: delete the `<p>` block (~lines 296-303) that
  renders `option.pickupAtISO` as a time. Leave the `option.pickupDateLabel`
  `<p>` above it untouched — it keeps working, just now sourced from the window
  label instead of a single instant.
- `app/api/checkout/route.ts`:
  - Drop `pickup_at` from the `drop_pickup_options` select (currently
    `"id, location_label, pickup_at, pickup_date"`).
  - Replace the `pickupDateLabel = new Date(pickupRow.pickup_at).toLocaleDateString(...)`
    line with the same window-label helper used in `lib/drops.ts` (extract a
    shared function rather than duplicating the formatting logic — natural home is
    alongside the existing `formatPickupDate` export in `lib/drops.ts`, since this
    route already imports from there for `checkDropReady`).
  - Replace the Square fulfillment's `pickup_at: pickupRow.pickup_at` with the
    synthesized noon-Denver-on-`pickup_start_date` instant described above.
  - `pickupNote` (built from `pickupDateLabel`) and the Slack notification
    (`notifySlackNewOrder`, which receives `pickupDateLabel`) both consume the new
    window label automatically since they just take the string — no separate
    change needed there beyond the label derivation itself.
- Tests referencing `pickup_at` / `pickupAtISO` that need fixture/assertion
  updates: `tests/drops.test.ts`, `tests/checkoutSlack.test.ts`,
  `tests/checkoutInvoiceDueDate.test.ts`, `tests/checkoutLineItems.test.ts`.
- `e2e/fixtures/activeDrop.ts`: remove `pickupAtISO` fields from both fixture
  pickup options.
- `lib/database.types.ts`: hand-edit to drop `pickup_at` from
  `drop_pickup_options` Row/Insert/Update and add `pickup_start_date`/
  `pickup_end_date` (both `string`, following the existing `pickup_date: string`
  pattern) plus `orders.assigned_pickup_date` (`string | null`, following the
  existing `order_cutoff_at: string | null` pattern). This is a stopgap like the
  0005 migration's — the migration itself is not applied by the executor (see
  below), so this hand-edit lets TypeScript compile against the intended
  post-migration shape. Note in the summary that it must be regenerated once the
  migration is actually applied.

### Window label formatting
New helper (name and exact location at planner's discretion, but co-locate with
`formatPickupDate` in `lib/drops.ts` and export it): given `pickup_start_date` and
`pickup_end_date` (both `date` strings), render:
- A single formatted date (reuse the existing `formatPickupDate`-style output,
  e.g. "Sep 3") when `pickup_start_date === pickup_end_date`.
- A range (e.g. "Sep 1 – Sep 3") when they differ.
This is the only new customer-facing formatting behavior introduced by this task.

### DB constraint (Claude's discretion, no explicit owner input)
Add `check (pickup_end_date >= pickup_start_date)` on `drop_pickup_options` in the
migration. Cheap, catches bad config early, doesn't conflict with any existing row
(all current rows are single-day, so backfilled start == end trivially satisfies
it).

### Backfill
All 3 existing `drop_pickup_options` rows are single-day (confirmed against live
data). Backfill `pickup_start_date = pickup_end_date = pickup_date` for every
existing row in the same migration that adds the columns.

### Column types
`pickup_start_date`, `pickup_end_date`, and `orders.assigned_pickup_date` are all
`date` type, matching the existing `pickup_date` column — not `timestamptz`.

### Migration application (mirrors the #13 pattern)
The executor creates the migration file but does **not** apply it to Supabase —
that was a deliberate manual, verified step last time (deploy code first, then
apply). Follow the same pattern: migration file committed, not applied, with an
explicit human-check noting code must deploy before the migration runs (since the
code drops `pickup_at` from its selects — if the migration runs first, nothing
breaks by column absence since selects would already be dropped in the same
deploy; but if the *old* deployed code runs against the *new* schema, its
`pickup_at`-selecting queries would 500. So: deploy code first, then apply
migration — same ordering rule as #13, same reason.)

### Claude's Discretion
- Exact naming/placement of the window-label helper function.
- Whether the Intl-offset-computation helper for the Denver noon instant lives in
  `lib/square.ts`, `lib/drops.ts`, or a new small utility module — planner's call,
  but it must be unit-tested for both standard and daylight time.
- Migration file naming (follow the `000N_description.sql` pattern; this is
  migration `0006`, following `0005_remove_capacity_enforcement.sql`).

</decisions>

<specifics>
## Specific Ideas

Concrete example that motivated dropping `pickup_at`: an existing row has
`pickup_date: "2026-09-03"` and `pickup_at: "2026-09-04T00:00:00+00:00"` — same
row, two different calendar dates depending on which column you read. This is the
exact confusion to eliminate; the fix is not "sync the two fields," it's
"eliminate the ambiguous one."

</specifics>

<canonical_refs>
## Canonical References

- GitHub issue #6: https://github.com/Yamatoberu/bigmattsbbq/issues/6
- GitHub issue #1 (parent): https://github.com/Yamatoberu/bigmattsbbq/issues/1
- Prior quick task 260904-twn (#13) established the pattern this task follows:
  migration committed but not applied by the executor; applied manually afterward
  with a pre/post health check against the live site.

</canonical_refs>
