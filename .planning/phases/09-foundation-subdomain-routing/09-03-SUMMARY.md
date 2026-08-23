---
phase: 09-foundation-subdomain-routing
plan: 03
subsystem: database
tags: [supabase, postgrest, typescript-codegen, service-role, schema-scoping]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing (plan 01)
    provides: "sca schema exposed to PostgREST via Supabase dashboard 'Exposed schemas' allowlist, confirmed by npm run check:sca"
provides:
  - "lib/database-sca.types.ts — generated TypeScript types for the sca schema only, top-level Database key is `sca`"
  - "lib/supabase-sca.ts — getScaSupabaseClient() server-only, sca-scoped, service-role singleton"
  - "tests/supabase-sca.test.ts — singleton, env-validation, and schema-scoping coverage"
  - "Exact sca table/column names (recorded below) for 09-05 and 09-06 to consume"
affects: [09-05-derive-score-metrics, 09-06-sca-shell-live-read, 10-core-browsing, 11-analytics-and-ai-reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Schema-scoped Supabase clients live as siblings (lib/supabase-sca.ts next to lib/supabase.ts), each with its own generated Database type file — never merge schema types into one file (avoids SupabaseClient<Db, SchemaName> generic constraint failure and avoids risking the other schema's generated output)"
    - "vi.mock(\"server-only\", () => ({})) at the top of any test file that imports a server-only-guarded module — the server-only package throws unconditionally outside a react-server module graph, which is how Vitest resolves it under environment: \"node\""

key-files:
  created:
    - lib/database-sca.types.ts
    - lib/supabase-sca.ts
    - tests/supabase-sca.test.ts
    - .planning/phases/09-foundation-subdomain-routing/deferred-items.md
  modified: []

key-decisions:
  - "Used the Supabase CLI (npx supabase gen types typescript --project-id wpziabhigztyjrmjpmbw --schema sca) rather than the MCP generate_typescript_types tool — no Supabase MCP tools were exposed in this execution session's toolset, so the plan's documented CLI fallback was used. The CLI ran without requiring npx supabase login; no auth gate was hit."
  - "Test file mocks the server-only package (vi.mock(\"server-only\", () => ({}))) because importing it directly under Vitest's node environment throws unconditionally (confirmed via probe) — this is required to exercise lib/supabase-sca.ts in tests at all, not a workaround for a bug in the module itself"
  - "Schema-scoping test assertion uses the plan's documented fallback ((client as any).rest.schemaName === \"sca\") because the installed @supabase/supabase-js (2.101.1) does not set an Accept-Profile header on the query builder before the request is actually dispatched — confirmed via direct inspection"

patterns-established:
  - "sca table names: chef, competition, cook, cook_ai_review, cook_detail, cook_weather, score"
  - "Score table (holds cook scores) is `score`; columns: id, cook_id, appearance, doneness, texture, taste, overall_impression, total_score, first_place_score, placement, field_size, ticket_number, score_notes, created_at, updated_at"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 12min
completed: 2026-08-23
---

# Phase 09 Plan 03: Generate sca Types + Schema-Scoped Service-Role Client Summary

**Server-side code now has a typed, service-role-only door into the `sca` schema via `getScaSupabaseClient()`, backed by generated types in `lib/database-sca.types.ts` whose top-level `Database` key is `sca` — the storefront's `lib/supabase.ts` and `lib/database.types.ts` are untouched.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-23T20:30:00Z (approx)
- **Completed:** 2026-08-23T20:42:20Z
- **Tasks:** 2 completed (both auto)
- **Files modified:** 3 created (lib/database-sca.types.ts, lib/supabase-sca.ts, tests/supabase-sca.test.ts), plus 1 out-of-scope-tracking file (deferred-items.md)

## Accomplishments
- `lib/database-sca.types.ts` generated from the live `wpziabhigztyjrmjpmbw` Supabase project's `sca` schema via the Supabase CLI, scoped to `sca` only — no `public` key, `tsc --noEmit` passes
- `lib/supabase-sca.ts` exports `getScaSupabaseClient()`: `server-only`-guarded, singleton, `db.schema: "sca"`, typed as `SupabaseClient<Database, "sca">`, reusing the existing `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars (no new secrets)
- `tests/supabase-sca.test.ts` covers env-validation (missing URL, missing key), singleton identity, and schema-scoping — all 4 cases pass
- Full verification suite green: `npm run check:sca` PASS, `npx tsc --noEmit` exit 0, `npm run test` 17 files / 108 tests pass, `npm run build` succeeds, post-build grep confirms `SUPABASE_SERVICE_ROLE_KEY` appears nowhere under `.next/static`
- Recorded exact `sca` table and score-column names (below) for plans 09-05 and 09-06

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate sca schema TypeScript types into their own file** - `5c902d9` (feat)
2. **Task 2: Schema-scoped service-role client plus tests** - `5c1132c` (feat)

**Plan metadata:** commit to follow this summary (docs: complete plan)

## Files Created/Modified
- `lib/database-sca.types.ts` - Generated `Database` type keyed on `sca` only; 480 lines, 7 tables
- `lib/supabase-sca.ts` - `getScaSupabaseClient()` server-only singleton, schema-scoped via `db.schema: "sca"`
- `tests/supabase-sca.test.ts` - 4 tests: two missing-env-var throw cases, singleton identity, schema-scoping assertion
- `.planning/phases/09-foundation-subdomain-routing/deferred-items.md` - Logs one out-of-scope pre-existing `npm run lint` breakage discovered during verification (not fixed — outside this plan's file scope and not part of its `<verification>` block)

## sca Schema Reference (for 09-05 / 09-06)

Tables under `Database["sca"]["Tables"]`: `chef`, `competition`, `cook`, `cook_ai_review`, `cook_detail`, `cook_weather`, `score`.

`score` table columns (holds cook scores, FK `cook_id` -> `cook.id`, one-to-one):
`id`, `cook_id`, `appearance`, `doneness`, `texture`, `taste`, `overall_impression`, `total_score`, `first_place_score`, `placement`, `field_size`, `ticket_number`, `score_notes`, `created_at`, `updated_at`.

## Decisions Made
- Used the Supabase CLI (`npx supabase gen types typescript --project-id wpziabhigztyjrmjpmbw --schema sca`) instead of the MCP `generate_typescript_types` tool — no Supabase MCP tools were present in this session's exposed toolset (only Read/Write/Edit/Bash), so the plan's documented CLI fallback path was taken. The CLI succeeded without an `npx supabase login` prompt.
- Test file mocks `server-only` via `vi.mock("server-only", () => ({}))` — confirmed by direct probe that importing the real package under Vitest's `environment: "node"` throws unconditionally (it only no-ops under the `react-server` export condition, which Vitest does not set by default). This is required plumbing to test a `server-only`-guarded module, not a defect being papered over.
- Schema-scoping test uses the plan's documented fallback assertion (`(client as any).rest.schemaName === "sca"`) rather than the `Accept-Profile` header check, because the installed `@supabase/supabase-js` (2.101.1) does not populate that header on the query builder object before dispatch — confirmed by direct inspection of `client.from("chef").select("*").headers`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `server-only` import throws under Vitest, blocking Task 2's test file**
- **Found during:** Task 2 (writing `tests/supabase-sca.test.ts`)
- **Issue:** `lib/supabase-sca.ts` correctly starts with `import "server-only"` per the plan's D-05/T-09-21 requirement. Vitest resolves this package under Node's default export condition (not `react-server`), where `server-only`'s `index.js` throws unconditionally — so any test importing `lib/supabase-sca.ts` would fail immediately, not just the env-validation paths the plan's test cases target.
- **Fix:** Added `vi.mock("server-only", () => ({}))` at the top of `tests/supabase-sca.test.ts`, confirmed via an isolated probe test to work correctly across `vi.resetModules()` between test cases.
- **Files modified:** `tests/supabase-sca.test.ts` (already in the plan's `files_modified` list — no scope expansion)
- **Verification:** `npx vitest run tests/supabase-sca.test.ts` — 4/4 pass; `npm run test` — 17 files / 108 tests pass; `npm run build` still succeeds (confirming the real `server-only` guard is untouched in production code, only the test harness is mocked)
- **Committed in:** `5c1132c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to make Task 2's test file actually runnable; no change to the shipped `lib/supabase-sca.ts` behavior or the plan's required file list. No scope creep.

### Acceptance-Criteria Script Mismatches (non-blocking, informational)

Two of the plan's literal grep-count acceptance criteria did not match exactly, though the underlying requirement they check is satisfied:

- Task 1: `grep -cE '^\s{2}sca: \{' lib/database-sca.types.ts` returns **2**, not the expected 1. The current Supabase CLI version (2.84.10, newer than the plan author likely used) additionally emits an `export const Constants = { sca: { Enums: {} } } as const` block at the bottom of the generated file, which also matches the 2-space-indent `sca: {` pattern. The semantic requirement — `Database`'s only top-level schema key is `sca`, no `public` key present, `tsc --noEmit` passes — is fully satisfied (verified independently).
- Task 2: `grep -c 'SupabaseClient<Database, "sca">' lib/supabase-sca.ts` returns **2**, not the expected 3. The plan's criterion description ("module-scope variable, return type, and the createClient generic") appears to assume the `createClient` call generic literally reads `SupabaseClient<Database, "sca">` text, but `createClient<Database, "sca">(...)` (matching the storefront's own `createClient<Database>(...)` pattern in `lib/supabase.ts`) does not contain the substring `SupabaseClient`. The file correctly has the module-scope variable and return type typed as `SupabaseClient<Database, "sca">` (2 occurrences) and `createClient<Database, "sca">` for construction (1 occurrence, correctly named for that function).

Neither is a functional defect; both are literal-grep mismatches against a scripted acceptance check. No code changes were made in response to preserve the exact interface shape shown in the plan's `<interfaces>` block, which was the actual authority mirrored (`lib/supabase.ts`'s `createClient<Database>(...)` shape).

## Issues Encountered
None beyond the deviation and acceptance-criteria notes above.

## User Setup Required

None - no external service configuration required beyond what plan 09-01 already resolved (sca schema exposed to PostgREST).

## Next Phase Readiness
- `09-05-derive-score-metrics` and `09-06-sca-shell-live-read` are unblocked: `getScaSupabaseClient()` and `lib/database-sca.types.ts` are ready to import, and the exact `score` table column names they depend on are recorded above.
- No outstanding blockers for the rest of Phase 9.

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

All created files verified on disk (`lib/database-sca.types.ts`, `lib/supabase-sca.ts`, `tests/supabase-sca.test.ts`) and both task commit hashes (`5c902d9`, `5c1132c`) verified present in git log.
