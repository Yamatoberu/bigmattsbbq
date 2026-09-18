---
phase: quick
plan: 260917-s2u
subsystem: supabase-migrations
tags: [supabase, migrations, schema-drift, menu_costing, sca, production, config-toml, seed]
dependency-graph:
  requires: []
  provides: [migrations-0010-through-0016, supabase-config-toml, supabase-seed-sql]
  affects: [supabase/migrations, supabase/config.toml, supabase/seed.sql]
tech-stack:
  added: []
  patterns: [retroactive-capture-migration, verbatim-sql-transcription]
key-files:
  created:
    - supabase/migrations/0010_menu_costing_schema.sql
    - supabase/migrations/0011_menu_costing_add_vendor_shorthand.sql
    - supabase/migrations/0012_attribution_sources.sql
    - supabase/migrations/0013_sca_schema.sql
    - supabase/migrations/0014_sca_trigger_functions.sql
    - supabase/migrations/0015_sca_rls_policies.sql
    - supabase/migrations/0016_production_schema.sql
    - supabase/config.toml
    - supabase/.gitignore
    - supabase/seed.sql
  modified: []
decisions:
  - "menu_costing (0010-0011) and attribution_sources (0012) transcribed byte-for-byte from production's own supabase_migrations.schema_migrations.statements column, since Supabase itself tracked these as discrete migrations on prod even though they were never committed to this repo"
  - "sca (0013-0015) and production (0016) schemas were never tracked by Supabase's own migration system on prod at all (created out-of-band); reconstructed from bigmattsbbq-test's structural-clone migrations instead, with only a hand-added `create schema if not exists` line since the schema-creation statement itself was never captured anywhere"
  - "No RLS added to menu_costing (12 tables) or production (4 tables) beyond what's actually live today (RLS disabled on both) — faithful capture, not remediation; that decision remains open with the user"
  - "supabase/config.toml generated via `npx supabase init` rather than hand-written; it already matched the plan's required project_id/major_version defaults exactly, so no manual edits were needed"
  - "seed.sql sets order_cutoff_at to null on the synthetic active drop so it can never appear closed to checkDropReady() regardless of when `supabase db reset` runs"
metrics:
  duration: ~25min
  completed: 2026-09-17
---

# Quick Task 260917-s2u: Capture full live Supabase schema drift Summary

Retroactively captured five schemas' worth of live-but-uncommitted Supabase drift (menu_costing, its vendor shorthand column, attribution_sources, sca, and production) into 7 new numbered migration files, transcribed byte-for-byte from production's own migration-tracking table and a verified structural clone — plus scaffolded `supabase/config.toml` and a synthetic `supabase/seed.sql` so a human with Docker can run `supabase db reset` and get a queryable active drop.

## What Was Built

### Task 1: 7 new migration files (`supabase/migrations/0010`–`0016`)

- **0010_menu_costing_schema.sql** — full `menu_costing` schema: 2 enum types, 12 tables, 3 indexes, 2 views, 2 functions, and all `comment on` statements. Transcribed verbatim from prod's `supabase_migrations.schema_migrations.statements` for version `20260724212041`.
- **0011_menu_costing_add_vendor_shorthand.sql** — `menu_costing.vendors.shorthand` column + comment + `'RD'` seed update, from prod version `20260724213129`.
- **0012_attribution_sources.sql** — `public.attribution_sources` table, RLS enable, one public-read policy, 8 seed rows, from prod version `20260828181057`. This one *is* part of the storefront app (Phase 12 checkout attribution).
- **0013_sca_schema.sql** — `create schema if not exists sca;` (hand-added, since prod never tracked this as its own statement) + 7 tables + RLS enable + 7 FKs + 5 sca-specific indexes, from `bigmattsbbq-test`'s `clone_sca_schema`/`clone_indexes` migrations.
- **0014_sca_trigger_functions.sql** — 2 trigger functions + 6 triggers, from `clone_sca_trigger_functions`.
- **0015_sca_rls_policies.sql** — 7 `sca.*` RLS policies (chef self-manage, competition/cook/cook_ai_review/cook_detail/cook_weather/score owner-manage), from the `sca.*`-only subset of `clone_rls_policies`. The attribution_sources policy from that same source migration was correctly excluded (already in 0012).
- **0016_production_schema.sql** — `create schema if not exists production;` + 4 tables (equipment, production_runs, products, production_cooks) with all CHECK constraints and 3 FKs + 7 production-specific indexes, from `clone_production_schema`/`clone_indexes`.

Every file's header comment documents the retroactive-capture origin, the source (prod migration version or bigmattsbbq-test clone), and — for menu_costing/production — an explicit note that no RLS was added since none exists live.

**Verification performed:**
- `ls supabase/migrations | wc -l` → 16 (9 existing + 7 new), confirmed.
- Dollar-quote (`$$...$$`) pairing checked even in all files with `plpgsql`/`sql` function bodies (0010, 0014) — balanced.
- Each new file's SQL body was diffed programmatically against `260917-s2u-RAW-SQL-SOURCES.md`'s fenced code blocks (with comment-only/blank lines normalized out to account for the added `-- Section N:` dividers) and confirmed to contain every source statement verbatim, in order.

### Task 2: `supabase/config.toml` and `supabase/seed.sql`

- `npx supabase init` ran successfully without touching `supabase/migrations/` — it only added `config.toml` and a `.gitignore` (for `.branches`/`.temp`/dotenvx local files). The generated `config.toml` already had `project_id = "bigmattsbbq"` and `[db] major_version = 17` exactly matching the plan's requirements, so no hand-editing was needed. `supabase link` was not run (no access token available, and not needed for this task).
- `supabase/seed.sql` inserts one `public.drops` row (`status = 'active'`, `order_cutoff_at = null`, title `'E2E Test Drop'`) and 3 synthetic `public.drop_pickup_options` rows tied to it, matching the current post-migration-0005/0006/0007 column shape (`location_label`, `pickup_date`, `pickup_start_date`, `pickup_end_date` — no `pickup_at` or capacity/reserved columns, both removed by earlier migrations). Confirmed against `e2e/support/stubs.ts`'s `hasActiveDrop()`, which requires `GET /api/drop`'s JSON body to have `status === "active"` — `lib/drops.ts`'s `fetchActiveDrop()` passes the `drops.status` column straight through, so this seed satisfies it directly.
- No rows inserted into `public.orders`, `public.mailing_list`, or `public.email_logs`, per plan. `public.attribution_sources` is not duplicated here — it's already seeded by migration 0012.

**Verification performed:**
- `grep -n "@" supabase/seed.sql` → no matches (no email addresses or PII).
- Both files confirmed non-empty (`config.toml` 415 lines, `seed.sql` 37 lines).

## Deviations from Plan

None — plan executed exactly as written. `npx supabase init` succeeded on the first attempt (the plan's fallback path of hand-writing `config.toml` was not needed).

## Constraints Honored

- No Supabase MCP tools or CLI commands touched any live database (no `supabase link`, `db push`, or `db reset` against a remote project). `supabase init` is a purely local, repo-files-only operation.
- `supabase/migrations/0001`–`0009` were not modified.
- No RLS enabled/added on `menu_costing` or `production` tables beyond what's documented in the plan/sources.
- Each task committed atomically, code changes only (no docs artifacts in either commit).

## Final Verification

```
npx tsc --noEmit   → clean, no errors
npm run test       → 32 test files, 314/314 tests passed
```

Neither check was expected to be affected by this task (pure SQL/config additions, no TypeScript changes), and both confirm no regressions.

## Commits

- `a3fe3ba` — feat(quick-260917-s2u): capture full live Supabase schema drift into migrations (Task 1, 7 files)
- `8484775` — feat(quick-260917-s2u): scaffold supabase/config.toml and seed.sql for local dev (Task 2, 3 files)

## Follow-up (outside this task's scope)

Applying migrations 0010–0016 to `bigmattsbbq-test` is a separate, already-planned step the orchestrator handles directly via Supabase MCP tools — not performed by this executor per the plan's constraints.

## Self-Check: PASSED

All created files exist on disk and all commit hashes exist in `git log`. See verification commands below.
