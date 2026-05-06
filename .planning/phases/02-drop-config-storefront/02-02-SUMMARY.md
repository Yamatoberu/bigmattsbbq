---
phase: 02-drop-config-storefront
plan: "02"
subsystem: drops-data-layer
tags: [supabase, server-only, api-route, tdd, dto]

dependency_graph:
  requires:
    - phase: 02-01
      provides: "DropDTO / PickupOptionDTO / DropStatus exports in lib/types.ts; drops.order_cutoff_at column + active seed row"
  provides:
    - lib/drops.ts — server-only fetchActiveDrop() + formatPickupDate() helper
    - app/api/drop/route.ts — GET /api/drop returning DropDTO | null
    - tests/drops.test.ts — 5 unit tests covering active/null/sold-out/error paths
    - server-only npm dependency (^0.0.1)
  affects:
    - 02-03 checkout preflight (will reuse fetchActiveDrop for server-side drop gating)
    - 02-04 OrderLanding (will consume /api/drop via client polling hook)
    - 02-05 legacy PickupOption cleanup (unaffected — this plan added new code only)

tech_stack:
  added:
    - "server-only ^0.0.1 — build-time marker preventing client bundles from importing server modules"
  patterns:
    - "TDD RED→GREEN cadence: failing tests committed first as a separate atomic commit, then implementation flipped them green in one shot"
    - "vi.doMock + dynamic import for module-level Supabase mocking (mirrors tests/supabase.test.ts)"
    - "Thenable shim on drop_pickup_options query chain — the real call awaits after .order() without a terminal method, so the mock builder exposes a .then on the .order() return"
    - "API route mirrors app/api/frozen-items/route.ts (headers+requestId+try/catch+logError)"

key_files:
  created:
    - lib/drops.ts
    - app/api/drop/route.ts
    - tests/drops.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Mock drop_pickup_options chain uses a .then shim on .order() rather than adding a .maybeSingle() that the production code does not call — matches the real await shape"
  - "vi.doMock(\"server-only\", () => ({})) in the test helper so the test runner does not choke on the build-time-only marker module"
  - "fetchActiveDrop throws on Supabase errors (not swallow+null) so /api/drop can return a 500 with the real error logged via logError, matching the frozen-items error contract"

requirements-completed:
  - DATA-03
  - DATA-04

metrics:
  duration: "~15 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 02 Plan 02: Drops Data Layer Summary

**Shipped the server-only `fetchActiveDrop()` Supabase query and the `/api/drop` GET route that every downstream Phase 2 plan now depends on, with 5 TDD-locked unit tests pinning the sold-out capacity math before any UI consumes it.**

## Performance

- **Duration:** ~15 minutes
- **Started:** 2026-04-11
- **Completed:** 2026-04-11
- **Tasks:** 2 (RED + GREEN)
- **Files:** 3 created, 2 modified

## Accomplishments

- **Task 1 (RED):** Wrote `tests/drops.test.ts` with 5 tests — active drop, null drop, pulled-pork-sold-out, mixed pickup sold-out derivation, and Supabase error path. Confirmed all 5 failed with `Cannot find module lib/drops` before shipping the implementation.
- **Task 2 (GREEN):** Installed `server-only`, created `lib/drops.ts` matching the RESEARCH.md reference implementation exactly, created `app/api/drop/route.ts` mirroring the `frozen-items` handler pattern. All 5 drops tests went green on the first run — no mock-builder iteration required.
- `npx vitest run tests/drops.test.ts`: 5/5 green.
- `npm run test`: 18/18 across 5 files (added 5 new tests without breaking any existing ones).
- `rm -rf .next && npx tsc --noEmit`: exits 0.
- `package.json` now lists `server-only ^0.0.1` in dependencies.

## Files Created/Modified

- `lib/drops.ts` (created, 71 lines) — `import "server-only";` marker + `formatPickupDate()` helper + `fetchActiveDrop()` reading from `drops` and `drop_pickup_options`, deriving `DropDTO` with per-product and per-pickup `soldOut` / `isSoldOut` booleans.
- `app/api/drop/route.ts` (created, 24 lines) — `GET` handler returning `DropDTO | null` as JSON on success, 500 with `{ error, requestId }` on failure. `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- `tests/drops.test.ts` (created, 221 lines) — 5 `it()` blocks using `vi.doMock` + `vi.resetModules` + dynamic import. Mocks both `../lib/supabase` and `server-only`.
- `package.json` / `package-lock.json` — added `server-only ^0.0.1`.

## Task Commits

1. **Task 1 (RED):** `002253a` — `test(02-02): add failing tests for fetchActiveDrop`
2. **Task 2 (GREEN):** `7826da3` — `feat(02-02): add server-only drops data layer and /api/drop route`

Plan-level SUMMARY/STATE commit will be made by the orchestrator in the phase wrap-up.

## Decisions Made

- **Thenable shim on pickup chain**: `fetchActiveDrop` awaits `.order("pickup_at", { ascending: true })` directly on the pickup query — there is no terminal method like `.maybeSingle()` (the plan's must_haves explicitly notes this). The mock builder therefore exposes a `.then` on the object returned by `.order()` for the `drop_pickup_options` branch, so the `await` resolves against the test's `pickupResult`. For the `drops` branch, `.order()` just returns the chain because the terminal method is `.maybeSingle()`.
- **Mock `server-only` in tests**: `vi.doMock("server-only", () => ({}))` in the test helper prevents the `import "server-only"` statement at the top of `lib/drops.ts` from crashing Node during dynamic import. The marker package is intentionally a no-op at runtime, so an empty mock is accurate.
- **Throw on Supabase errors, return null on "no row"**: `fetchActiveDrop` treats a null-result-with-no-error as "no active drop" (returns `null`) but rethrows any error object from Supabase so the API route can log+500. This matches the frozen-items handler contract and lets `/api/drop` distinguish "no drop configured" (200 with `null` body) from "data layer is broken" (500 with error envelope).

## Deviations from Plan

None. The plan's reference `fetchActiveDrop` implementation and the test mock pattern both shipped verbatim. No Rule 1/2/3 auto-fixes were needed. The GREEN step compiled and passed on the first run.

## Test Mock Shape Notes for Plan 03

The checkout preflight in plan 02-03 will reuse `fetchActiveDrop` (or very similar Supabase access) and can reuse this mock builder pattern. Two things to carry forward:

1. **Chain terminals**: `drops` uses `.maybeSingle()` (awaitable), `drop_pickup_options` uses bare `.order()` (thenable). Any mock must implement both shapes.
2. **Mock `server-only`**: Any test that transitively imports `lib/drops.ts` needs `vi.doMock("server-only", () => ({}))` or Vitest will fail to resolve the real marker package in the Node test environment.

Plan 03's preflight likely adds an `.eq("id", dropId)` filter before `.maybeSingle()`, so the mock's `.eq` chain fallthrough already handles that.

## Issues Encountered

- Pre-existing `.next/` "deleted" entries in `git status` predate this plan (Phase 1 cleanup artifacts) and are out of scope. `.next/` is not in `.gitignore` but all the deletions are already staged-as-deletions from a prior plan — not touched here.

## User Setup Required

None. `server-only` installed via `npm install server-only`, no DNS or keys changed.

## Next Phase Readiness

- Plan 02-03 can import `fetchActiveDrop` from `lib/drops` for its server-side checkout drop gate.
- Plan 02-04 can hit `GET /api/drop` from a client polling hook (e.g., `useActiveDrop`) and get a typed `DropDTO | null` payload with `x-request-id` tracing.
- Plan 02-05's legacy PickupOption cleanup is unaffected by this plan.
- Blockers unchanged from STATE.md (Resend DNS verification, Square API version bump).

## Known Stubs

None. `fetchActiveDrop` queries live Supabase data and derives all fields from real columns. No placeholder data, no empty-array shortcuts, no TODO/FIXME markers. `/api/drop` returns real JSON or a real error envelope — no mocked response.

## Self-Check

**Created files exist:**

- FOUND: lib/drops.ts
- FOUND: app/api/drop/route.ts
- FOUND: tests/drops.test.ts

**Modified files:**

- FOUND: package.json (server-only added)
- FOUND: package-lock.json

**Commits exist:**

- FOUND: 002253a (Task 1 RED — test file)
- FOUND: 7826da3 (Task 2 GREEN — lib/drops + api/drop + package.json)

**Verification gates:**

- `npx vitest run tests/drops.test.ts` 5/5 green: PASS
- `npm run test` 18/18 green: PASS
- `rm -rf .next && npx tsc --noEmit` exit 0: PASS
- `head -1 lib/drops.ts` == `import "server-only";`: PASS
- `grep -q 'export async function fetchActiveDrop' lib/drops.ts`: PASS
- `grep -q 'export async function GET' app/api/drop/route.ts`: PASS
- `grep 'server-only' package.json`: PASS

## Self-Check: PASSED

---
*Phase: 02-drop-config-storefront*
*Completed: 2026-04-11*
