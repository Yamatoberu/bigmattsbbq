---
phase: 01-foundation
plan: "01"
subsystem: data-layer
tags: [supabase, postgresql, rls, typescript, migrations]
dependency_graph:
  requires: []
  provides: [supabase-client, database-schema, env-validation]
  affects: [lib/env.ts, lib/supabase.ts, lib/database.types.ts]
tech_stack:
  added:
    - "@supabase/supabase-js@^2.101.1 — typed Supabase JS client"
    - "supabase@^2.84.10 (devDep) — CLI for gen types"
  patterns:
    - "Service role singleton (server-only) — getSupabaseClient() follows lib/square.ts pattern"
    - "Conditional UPDATE for atomic slot reservation — no SELECT FOR UPDATE needed"
    - "RLS enable with no policies = deny all anon; service role bypasses unconditionally"
key_files:
  created:
    - supabase/migrations/0001_foundation.sql
    - lib/supabase.ts
    - lib/database.types.ts
    - tests/supabase.test.ts
  modified:
    - lib/env.ts
    - .env.example
    - package.json
    - package-lock.json
decisions:
  - "v_count declared as int (not bool) for GET DIAGNOSTICS ROW_COUNT per Pitfall 6"
  - "Single migration file for simplicity — all DDL, RLS, functions, and seed in one file"
  - "Placeholder database.types.ts to be overwritten by supabase gen types after project creation"
  - "lib/supabase.ts reads process.env directly (not via getSupabaseEnv) — simpler, no interface needed by callers"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  files_created: 4
  files_modified: 4
---

# Phase 01 Plan 01: Supabase Foundation Summary

**One-liner:** PostgreSQL schema with 5 tables, RLS, atomic slot-reservation RPC functions, and typed Node.js singleton client using @supabase/supabase-js service role pattern.

## What Was Built

Established the complete Supabase data layer for the Big Matt's BBQ frozen drops platform. All code files are written and tested; the migration itself is ready to be pasted into the Supabase SQL editor once the human creates a Supabase project (Plan 02).

### Migration SQL (`supabase/migrations/0001_foundation.sql`)

Five tables covering the full data model:
- `drops` — one record per limited-run event with per-product capacity tracking
- `drop_pickup_options` — per-location rows for each drop with independent capacity
- `orders` — one record per successful reservation with Square IDs and cart snapshot
- `mailing_list` — email subscribers with unsubscribe token
- `email_logs` — audit trail for all sent emails

RLS enabled on all five tables with no policies (deny all for anon). Service role bypasses RLS unconditionally at the database level.

Two atomic RPC functions:
- `reserve_pickup_slot` — checks and increments capacity at global + location level atomically; rolls back global increment if location check fails
- `release_pickup_slot` — decrements capacity at both levels; called when downstream Square API calls fail after a successful reservation

Seed data: Test Drop with 200/200 global capacity and 3 pickup locations (Cache Valley, Utah County, Sandy) at 65/65 each. The 5-bag buffer (200 vs 3×65=195) is intentional per D-08.

### TypeScript Infrastructure

- `lib/database.types.ts` — placeholder `Database` type with Row/Insert/Update shapes for all 5 tables and both RPC functions; will be overwritten by `supabase gen types` after project creation
- `lib/supabase.ts` — server-only singleton following the `lib/square.ts` pattern exactly; throws on missing env vars; auth session management disabled (service role pattern)
- `lib/env.ts` — extended with `SupabaseEnv` interface and `getSupabaseEnv()` function after existing `getSquareEnv()`
- `.env.example` — documented `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix)

### Tests (`tests/supabase.test.ts`)

6 unit tests covering:
- `getSupabaseClient` throws when SUPABASE_URL missing
- `getSupabaseClient` throws when SUPABASE_SERVICE_ROLE_KEY missing
- `getSupabaseClient` returns a SupabaseClient with `.from` method when vars set
- `getSupabaseClient` returns the same singleton on repeated calls
- `getSupabaseEnv` throws when vars missing
- `getSupabaseEnv` returns `{ url, serviceRoleKey }` when vars set

All 6 pass. TypeScript compiles cleanly across all source files.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 98e3eeb | feat(01-01): install Supabase deps and create foundation migration SQL |
| Task 2 | 7d54710 | feat(01-01): add Supabase TypeScript client, env validation, and unit tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getSupabaseEnv test using require() in ESM module environment**
- **Found during:** Task 2 — first test run
- **Issue:** `getSupabaseEnv` tests used `require()` which fails in the project's ESM test environment (Vitest + TypeScript `moduleResolution: bundler`)
- **Fix:** Imported `getSupabaseEnv` at the top of the test file via static `import` instead; env var manipulation in `afterEach` still correctly restores original values
- **Files modified:** tests/supabase.test.ts
- **Commit:** 7d54710

## Known Stubs

None — the placeholder `lib/database.types.ts` is not a stub; it is intentionally a placeholder with the correct shape, documented to be regenerated by `supabase gen types` in Plan 02. All types are structurally correct for the migration schema.

## Self-Check: PASSED
