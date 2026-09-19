---
phase: quick-260918-via
plan: 01
subsystem: database
tags: [supabase, postgres, security-advisory, migrations, documentation]

requires:
  - phase: quick-260917-s2u
    provides: migrations 0001-0016 capturing the full live schema of both Supabase projects
provides:
  - "supabase/migrations/0017_function_search_path.sql — search_path = '' pinned on 4 advisor-flagged functions"
  - "supabase/migrations/0018_drop_dead_place_preorder.sql — drops the dead public.place_preorder SECURITY DEFINER function + orphaned order_number_seq sequence"
  - "docs/supabase-environments.md — two-environment model, env-var conventions, promotion + rollback workflow"
affects: [issue-14, supabase-migrations, security]

tech-stack:
  added: []
  patterns:
    - "Retroactive-capture migration header style (banner comment + full forensic context) extended to remediation migrations, not just schema captures"

key-files:
  created:
    - supabase/migrations/0017_function_search_path.sql
    - supabase/migrations/0018_drop_dead_place_preorder.sql
    - docs/supabase-environments.md
  modified: []

key-decisions:
  - "Drop public.place_preorder and public.order_number_seq outright (2026-09-19) rather than leave a non-functional, anon-reachable SECURITY DEFINER entry point on production's API surface"
  - "No cascade on either drop statement in 0018 — fail loudly on unexpected dependents rather than silently widen blast radius"

patterns-established:
  - "Remediation migrations (0017, 0018) follow the same forensic-header convention as the retroactive-capture migrations (0010-0016): full context in the comment block, minimal SQL body"

requirements-completed: [ISSUE-14-AC-SEARCHPATH, ISSUE-14-AC-DEADFN, ISSUE-14-AC-DOCS]

duration: 12min
completed: 2026-09-18
---

# Quick Task 260918-via: Close out remaining issue #14 acceptance criteria Summary

**Two forward-only remediation migrations (search_path hardening on 4 functions, dropping a dead anon-reachable SECURITY DEFINER function) plus a new docs/supabase-environments.md documenting the two-project model and the promotion/rollback workflow — all repo-files-only, nothing applied live.**

## Performance

- **Duration:** 12 min
- **Tasks:** 3 completed
- **Files modified:** 3 (all new files)

## Accomplishments

- `supabase/migrations/0017_function_search_path.sql` pins `search_path = ''` on the 4 functions Supabase's `function_search_path_mutable` advisory flagged (`menu_costing.calculate_item_unit_cost`, `menu_costing.round_price_point`, `sca.touch_updated_at`, `sca.default_competition_steak_label`) — a pure hardening change, no behavioral effect since all four bodies are already fully schema-qualified.
- `supabase/migrations/0018_drop_dead_place_preorder.sql` drops `public.place_preorder(bigint, bigint, jsonb, text, text, text, boolean)` — a `SECURITY DEFINER` function found live on production, `EXECUTE`-granted to `anon`/`authenticated`, callable unauthenticated over PostgREST, referencing 4 nonexistent tables and a `bigint`/`uuid` type mismatch that makes it provably dead — plus its orphaned `public.order_number_seq` sequence.
- `docs/supabase-environments.md` documents the two-project model (`bigmattsbbq-test` / production), the three env vars and where their values come from, the five-step schema-promotion workflow (including the MCP destructive-SQL classifier limitation discovered live this session), and the forward-only corrective-migration + Supabase PITR/backups rollback story.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0017 pinning search_path on the 4 advisor-flagged functions** - `7aa74fd` (feat)
2. **Task 2: Write migration 0018 dropping the dead public.place_preorder function and its orphaned sequence** - `0ec1da8` (feat)
3. **Task 3: Write docs/supabase-environments.md** - `36494ef` (docs)

_No TDD tasks in this plan — all repo-file authoring, verified by grep-based automated gates per task._

## Files Created/Modified

- `supabase/migrations/0017_function_search_path.sql` - New migration, 4 `alter function ... set search_path = ''` statements with correct signatures per 0010/0014
- `supabase/migrations/0018_drop_dead_place_preorder.sql` - New migration, 2 `drop ... if exists` statements (no cascade) plus full forensic header
- `docs/supabase-environments.md` - New 108-line ops doc; two-environment table, env-var section, promotion workflow, rollback/incidents section, related-reading file map

## Decisions Made

- Drop `public.place_preorder` and `public.order_number_seq` outright rather than attempt to fix or repurpose the dead function, per the user's 2026-09-19 decision recorded in the plan and reproduced in the migration header.
- No `cascade` on either drop statement — an unexpected dependency should fail the migration loudly, not silently take out more than intended.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' automated verification gates passed on first attempt (after one line-wrap fix inside Task 3's own drafting, before the file was ever committed — the phrase "Point-in-Time Recovery" was initially split across a wrapped line, which would have failed the task's own grep gate; fixed before verification ran, not a deviation from the plan's intent).

## Issues Encountered

None.

## Migrations NOT applied — this is a repo-files-only task

**Migrations `0017` and `0018` are written and committed to this repo but have NOT been applied to either Supabase project** (`bigmattsbbq-test`, ref `ujpviiulhibzztbricxu`, or production, ref `wpziabhigztyjrmjpmbw`). No Supabase MCP tool, `supabase db` command, or `psql` invocation was used at any point in this task — verified by `git status --porcelain` showing only the three new files (plus the untracked `.planning/quick/` directory) and zero modified files.

Applying both migrations live is the orchestrator's next step, outside this quick task's repo-only scope, following the five-step promotion workflow now documented in `docs/supabase-environments.md` §3: apply to `bigmattsbbq-test` first, verify with `get_advisors` + a spot-check, run the full local verification suite, then apply the identical SQL to production and re-run `get_advisors` there.

## User Setup Required

None - no external service configuration required by this task. Live application of 0017/0018 is a follow-up step for the orchestrator/user, not a config step for this task.

## Next Phase Readiness

- Repo now contains all 18 migrations needed to make both Supabase projects match the tracked schema exactly, including the two remaining advisory/security remediations for issue #14.
- `docs/supabase-environments.md` gives the next migration author (human or agent) a single place to learn the promotion workflow, including the MCP destructive-SQL classifier gotcha, without rediscovering it.
- Blocker for full issue #14 closure: migrations 0017 and 0018 still need to be applied to `bigmattsbbq-test` then production, and `get_advisors` re-run against both afterward to confirm the `function_search_path_mutable` advisory clears and no new advisory appears.

---
*Quick task: 260918-via*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 3 created files confirmed present on disk (supabase/migrations/0017_function_search_path.sql, supabase/migrations/0018_drop_dead_place_preorder.sql, docs/supabase-environments.md) and all 3 task commit hashes (7aa74fd, 0ec1da8, 36494ef) confirmed present in git log.
