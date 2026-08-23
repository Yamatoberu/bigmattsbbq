---
phase: 09-foundation-subdomain-routing
plan: 01
subsystem: infra
tags: [supabase, postgrest, schema-exposure, preflight-script]

# Dependency graph
requires: []
provides:
  - "scripts/check-sca-schema.mjs — one-command PGRST106 / exposed-schema preflight check, no service-role key leakage"
  - "npm run check:sca script"
  - "Confirmed-reachable sca schema in Supabase project wpziabhigztyjrmjpmbw (dashboard change applied by user)"
affects: [09-03-generate-sca-types-and-client, 09-05-derive-score-metrics, 09-06-sca-shell-live-read]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preflight scripts for external-service configuration live in scripts/ as plain Node ESM (.mjs), invoked only via a dedicated npm script, never imported by app/lib/components"
    - "Node 24's --env-file-if-exists flag used instead of a dotenv dependency for script-only env loading"

key-files:
  created:
    - scripts/check-sca-schema.mjs
  modified:
    - package.json

key-decisions:
  - "Confirmed PGRST106 blocker was a dashboard-only 'Exposed schemas' setting, not a code or grants problem; no Management API automation was attempted since the setting is dashboard-only for this project"
  - "INFRA-01 is NOT marked complete in REQUIREMENTS.md by this plan — its frontmatter lists INFRA-01 because this plan is a required unblocking prerequisite, but the actual service-role client that reads the sca schema is built in 09-03 and exercised live in 09-06. Requirements.md traceability table left as Pending for INFRA-01 until those plans land."

patterns-established:
  - "Any future external-service dashboard-config blocker should ship a matching one-command preflight script (PASS/FAIL, no secret leakage, actionable remediation text) rather than being verified ad hoc"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-08-23
---

# Phase 09 Plan 01: Expose sca Schema + Preflight Check Summary

**One-command `npm run check:sca` PostgREST reachability probe shipped, and the confirmed PGRST106 blocker (sca schema missing from Supabase's Data API "Exposed schemas" allowlist) is now resolved — live probe returns `PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.` with exit 0.**

## Performance

- **Duration:** 5 min active work across two sessions (Task 1 committed earlier same day; Task 2 checkpoint resumed and closed this session)
- **Started:** 2026-08-23T14:20:00Z (Task 1)
- **Completed:** 2026-08-23 (Task 2 resume)
- **Tasks:** 2 completed (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 2 (scripts/check-sca-schema.mjs, package.json) — Task 2 produced no code diff, only a verified external-service state change

## Accomplishments
- `scripts/check-sca-schema.mjs` created: resolves Supabase URL/key exactly as `lib/supabase.ts` does, issues a single `Accept-Profile: sca` fetch against `/rest/v1/`, and prints an unambiguous PASS/FAIL with the exact dashboard remediation steps on failure — never logs the service-role key or Authorization header
- `check:sca` npm script added, ordered after `lint` and before `test` per plan
- User applied the dashboard fix: added `sca` to Supabase project `wpziabhigztyjrmjpmbw`'s Data API "Exposed schemas" list (alongside existing `public`, `graphql_public`) and saved
- Live re-run of `npm run check:sca` in this session confirms the fix: stdout is `PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.`, exit code `0`, no `PGRST106` in output
- The confirmed hard blocker for INFRA-01/INFRA-02 and every later Supabase-touching plan in Phase 9 is now removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sca schema reachability preflight script** — `fc73c1a` (feat)
2. **Task 2: Expose the sca schema in the Supabase dashboard** — no code commit (dashboard-only configuration change performed by the user outside this repo; verified via live `npm run check:sca` re-run, evidence captured below)

**Plan metadata:** commit to follow this summary (docs: complete plan)

## Files Created/Modified
- `scripts/check-sca-schema.mjs` - PGRST106 / exposed-schema preflight probe; PASS/FAIL with remediation text, no secret leakage
- `package.json` - Adds `check:sca` script entry between `lint` and `test`

## Decisions Made
- No Management API automation was attempted for the "Exposed schemas" setting — per the plan's explicit instruction, this is a dashboard-only control for this Supabase project, so the checkpoint correctly routed to human action rather than an auto-fix attempt
- `INFRA-01` is left `Pending` in `.planning/REQUIREMENTS.md` rather than checked off by this plan. This plan's frontmatter lists `requirements: [INFRA-01]` because removing the PGRST106 blocker is a hard prerequisite for that requirement, but the requirement text ("Server-side Supabase client reads the sca schema using the service-role key") describes work delivered in `09-03-PLAN.md` (client + generated types) and exercised live in `09-06-PLAN.md`. Marking it complete here would misrepresent traceability.

## Deviations from Plan

None — plan executed exactly as written. Task 2 resumed cleanly from the prior paused checkpoint; no auto-fixes were needed since the blocker was purely a dashboard setting outside repo scope.

## Issues Encountered
- None this session. The checkpoint reached in a prior run (PGRST106 failure) is the expected/documented failure mode described in the plan's `<what-built>` block, not an unplanned issue.

## Checkpoint Resolution Evidence

```
$ npm run check:sca
> big-matts-bbq@1.0.0 check:sca
> node --env-file-if-exists=.env.local scripts/check-sca-schema.mjs

PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.
exit=0
```

All three Task 2 acceptance criteria confirmed from this output:
- Exits 0 — confirmed (`exit=0`)
- stdout contains the literal string `sca schema is reachable` — confirmed
- stdout does NOT contain `PGRST106` — confirmed

## User Setup Required

None further — the one required external action (adding `sca` to Supabase's Data API "Exposed schemas" list for project `wpziabhigztyjrmjpmbw`) was already completed and verified in this session.

## Next Phase Readiness
- `09-03-PLAN.md` (generate `lib/database-sca.types.ts` and build the server-only sca-scoped service-role client) is now unblocked — the schema is confirmed reachable so type generation and live queries will succeed
- `09-05-PLAN.md` and `09-06-PLAN.md`, which depend on real sca-schema reads, are also unblocked transitively
- No outstanding blockers for the rest of Phase 9

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

All created files verified on disk (`scripts/check-sca-schema.mjs`) and Task 1 commit hash `fc73c1a` verified present in git log.
