---
phase: 02-drop-config-storefront
plan: "01"
subsystem: schema-types
tags: [supabase, migration, typescript, types, dto]

dependency_graph:
  requires:
    - phase: 01-02
      provides: "Live Supabase project with drops table (without order_cutoff_at), real generated database.types.ts"
  provides:
    - supabase/migrations/0002_drop_cutoff.sql — additive migration adding order_cutoff_at + seed drop activation
    - lib/database.types.ts — regenerated from live schema, now includes order_cutoff_at in drops Row/Insert/Update
    - lib/types.ts — new DropStatus, CapacitySlot, PickupOptionDTO, DropDTO exports
    - lib/types.ts — CheckoutRequestBody updated to use top-level dropId + pickupOptionId
    - Seed "Test Drop - April 2026" now status='active' with order_cutoff_at populated
  affects: [02-02 drops API, 02-03 storefront/checkout wiring, 02-04 OrderLanding, 02-05 legacy PickupOption cleanup]

tech_stack:
  added: []
  patterns:
    - "Append-only migrations: 0001_foundation.sql untouched; 0002_drop_cutoff.sql adds new column + updates seed"
    - "Legacy interface retained across boundary: PickupOption stays until plan 02-05 final cleanup"
    - "Types regenerated via npx supabase gen types typescript after schema change"

key_files:
  created:
    - supabase/migrations/0002_drop_cutoff.sql
  modified:
    - lib/database.types.ts
    - lib/types.ts

key-decisions:
  - "Linked Supabase CLI to project wpziabhigztyjrmjpmbw and repaired migration 0001 to 'applied' because Phase 1 deployed it via SQL Editor (no CLI tracking)"
  - "Regenerated types with --schema public --project-id flag (matches Phase 1 plan 01-02 procedure)"
  - "Appended new DTOs after CheckoutRequestBody in lib/types.ts to keep legacy PickupOption interface in its original position"

requirements-completed:
  - DATA-03
  - DATA-04
  - DATA-05

metrics:
  duration: "~10 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 02 Plan 01: Schema Cutoff and DTO Types Summary

**Added `order_cutoff_at` timestamptz column to drops via migration 0002, activated the seed drop, regenerated `lib/database.types.ts` from live schema, and published the `DropDTO`/`PickupOptionDTO`/`CheckoutRequestBody` contracts that every downstream Phase 2 plan will import.**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-04-11 (Phase 02 execution begin)
- **Completed:** 2026-04-11
- **Tasks:** 2
- **Files modified:** 1 created + 2 modified

## Accomplishments

- Wrote `supabase/migrations/0002_drop_cutoff.sql` exactly to plan spec (additive `alter table` + idempotent seed update).
- Linked the Supabase CLI to project `wpziabhigztyjrmjpmbw` (link state was missing because Phase 1 deployed via SQL Editor).
- Repaired migration history with `npx supabase migration repair --status applied 0001` so the remote knew 0001 was already live before pushing 0002.
- Applied migration 0002 to the live dev Supabase project via `npx supabase db push`.
- Verified via REST API: `drops.order_cutoff_at` column exists, seed drop `Test Drop - April 2026` is now `status='active'` with `order_cutoff_at='2026-05-09T05:59:59+00:00'` (the +00:00 value is correct — `'2026-05-08 23:59:59-06'` UTC-normalized).
- Regenerated `lib/database.types.ts` via `npx supabase gen types typescript --project-id wpziabhigztyjrmjpmbw --schema public > lib/database.types.ts`. File grew from 374 → 376 lines with `order_cutoff_at` now present in drops Row / Insert / Update.
- Added `DropStatus`, `CapacitySlot`, `PickupOptionDTO`, and `DropDTO` as named exports in `lib/types.ts` verbatim per the plan spec.
- Replaced the `CheckoutRequestBody` interface to use top-level `dropId: string` + `pickupOptionId: string` (removed the nested `pickup: PickupOption` field). Legacy `PickupOption` interface deliberately retained for plan 02-05 cleanup.
- `rm -rf .next && npx tsc --noEmit` exits 0.
- `npm run test`: 13/13 tests pass across 4 test files.

## Exact Commands Used

```bash
# Supabase CLI setup
npx supabase link --project-ref wpziabhigztyjrmjpmbw
npx supabase migration repair --status applied 0001

# Migration apply
npx supabase db push

# Type regeneration (this is the command the plan asked to record)
npx supabase gen types typescript --project-id wpziabhigztyjrmjpmbw --schema public > lib/database.types.ts
```

The type-generation command matches Phase 1 plan 01-02's procedure exactly (`--project-id` + redirect to `lib/database.types.ts`).

## Seed Drop State

**Before this plan:** `{ title: "Test Drop - April 2026", status: "upcoming", order_cutoff_at: <column did not exist> }`

**After this plan:** `{ title: "Test Drop - April 2026", status: "active", order_cutoff_at: "2026-05-09T05:59:59+00:00" }`

The seed was flipped from `upcoming` → `active` by migration 0002 (not already-active). This is required for plan 02-04's server component to render a live drop during Phase 2 development.

## Legacy PickupOption Confirmation

The `PickupOption` interface in `lib/types.ts` is preserved verbatim:

```typescript
export interface PickupOption {
  locationLabel: "Preston" | "Orem";
  pickupDateLabel: string;
  pickupAtISO: string;
}
```

Plan 02-05 will delete this after `CheckoutClient`, `Footer`, and `lib/config.ts` are migrated to the new `PickupOptionDTO` shape.

## Task Commits

1. **Task 1: Write migration 0002_drop_cutoff.sql** — `f96082b` (feat)
2. **Task 2: Regenerate database.types.ts and add DropDTO/PickupOptionDTO** — `be14544` (feat)

Plan metadata will be committed by the orchestrator in the final phase wrap-up.

## Files Created/Modified

- `supabase/migrations/0002_drop_cutoff.sql` — Additive migration: adds `order_cutoff_at timestamptz` to `drops`, updates seed drop to `status='active'` with populated cutoff.
- `lib/database.types.ts` — Regenerated from live schema. `drops` Row/Insert/Update now include `order_cutoff_at: string | null` / `string | null | undefined`.
- `lib/types.ts` — Added `DropStatus` type alias, `CapacitySlot`, `PickupOptionDTO`, `DropDTO` interfaces. Replaced `CheckoutRequestBody` with the new `dropId` / `pickupOptionId` shape. `PickupOption` interface left in place.

## Decisions Made

- **Linked and repaired Phase 1 migration state**: The remote project had no tracked migrations because Phase 1 deployed 0001 via the Supabase SQL Editor. Before pushing 0002, I ran `supabase migration repair --status applied 0001` so `db push` would only apply 0002, not re-run 0001. Documented here so Phase 3+ know the remote migration history is now CLI-tracked from 0001 onward.
- **Appended new DTOs after `CheckoutRequestBody`**: Kept the existing `PickupOption` interface in its original position (line 36) so the plan 02-05 delete diff will be minimal and easy to review. New types are grouped together at the bottom of the file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Linked Supabase CLI and repaired migration history**

- **Found during:** Task 1 (attempting `supabase db push`)
- **Issue:** Running `supabase db push` in a never-linked working tree requires `supabase link`, and the remote project had no rows in its migration history table because Phase 1 applied 0001 via the SQL Editor. Without repair, `db push` would attempt to re-apply 0001, which would fail on existing objects.
- **Fix:** `npx supabase link --project-ref wpziabhigztyjrmjpmbw`, then `npx supabase migration repair --status applied 0001`, then `npx supabase db push`.
- **Files modified:** None in source tree (only `supabase/.temp/` CLI state, which is gitignored/untracked).
- **Verification:** `npx supabase migration list` now shows `0001 | 0001` and `0002 | 0002`; REST query against drops confirms `order_cutoff_at` column exists.
- **Committed in:** N/A (CLI state, not tracked).

---

**Total deviations:** 1 auto-fixed (blocking).
**Impact on plan:** None on plan tasks — this was unavoidable infra glue to make `supabase db push` work in a project where Phase 1 used the SQL Editor path. No source file changes needed.

## Issues Encountered

- **Pre-existing uncommitted state in `lib/database.types.ts`:** At the start of this plan, `git diff lib/database.types.ts` already showed the 374-line Phase 1 regenerated types vs the Phase 1 placeholder committed in `7d54710`. Phase 1 plan 01-02's human step to run `supabase gen types` never produced a commit. Task 2 overwrites the file with a fresh 376-line regeneration (now including `order_cutoff_at`) and commits it in `be14544`, subsuming the uncommitted drift. Net effect: `lib/database.types.ts` is now committed and in sync with the live schema.

## User Setup Required

None. All automation succeeded with the existing `.env.local` credentials and the previously-authenticated `npx supabase` CLI session.

## Next Phase Readiness

- Plan 02-02 can now query `order_cutoff_at` from `lib/database.types.ts` without TypeScript errors.
- Plan 02-02 can import `DropDTO`, `PickupOptionDTO`, `CapacitySlot`, `DropStatus` from `lib/types.ts`.
- Plan 02-03 / 02-04 can send `{ dropId, pickupOptionId, customer, cart }` per the new `CheckoutRequestBody`.
- Plan 02-05 still owns the final cleanup of the legacy `PickupOption` interface and `PICKUP_OPTIONS` export in `lib/config.ts`.
- Blockers unchanged from STATE.md: Resend DNS verification (Phase 3) and Square API version bump (~June 2026).

## Known Stubs

None — this plan is schema + type additions only. No UI, no stubs, no placeholder data. The new DTO types have no producers or consumers yet; they become load-bearing in plan 02-02.

## Self-Check

**Created files exist:**

- FOUND: supabase/migrations/0002_drop_cutoff.sql

**Modified files in git state:**

- FOUND: lib/database.types.ts (committed in be14544)
- FOUND: lib/types.ts (committed in be14544)

**Commits exist:**

- FOUND: f96082b (Task 1 — migration)
- FOUND: be14544 (Task 2 — types regeneration + DTOs)

**Verification gates:**

- `rm -rf .next && npx tsc --noEmit` exit 0: PASS
- `npm run test` 13/13: PASS
- Plan overall verification block (greps + tsc + test): PASS

## Self-Check: PASSED

---
*Phase: 02-drop-config-storefront*
*Completed: 2026-04-11*
