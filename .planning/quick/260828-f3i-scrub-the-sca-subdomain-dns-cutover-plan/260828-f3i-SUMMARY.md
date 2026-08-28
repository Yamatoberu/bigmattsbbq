---
phase: quick-260828-f3i
plan: 01
subsystem: docs
tags: [documentation, project-state, sca-tracker]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing
    provides: proxy.ts host-based routing, docs/sca-subdomain-deployment.md checklist
provides:
  - Documentation scrubbed of the sca.bigmattsbbq.com DNS cutover as pending/outstanding work
  - /sca recorded everywhere as the canonical SCA Tracker URL
affects: [future-milestone-planning, sca-tracker-docs]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md
    - .planning/PROJECT.md
    - .planning/STATE.md

key-decisions:
  - "sca.bigmattsbbq.com subdomain and its DNS cutover decided against; /sca is canonical and sufficient"
  - "Shipped routing code (proxy.ts, lib/sca/routing.ts, SCA_HOSTNAME) deliberately left in place — inert and already tested, removing it would be pure churn"

patterns-established: []

requirements-completed: [QUICK-260828-f3i]

# Metrics
duration: ~12min
completed: 2026-08-28
---

# Quick Task 260828-f3i: Scrub SCA Subdomain DNS Cutover Plan Summary

**Deleted `docs/sca-subdomain-deployment.md` and rewrote README/PROJECT.md/STATE.md so `/sca` reads as the canonical, already-shipped SCA Tracker URL instead of a subdomain pending manual DNS cutover.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3 completed
- **Files modified:** 3 (docs/sca-subdomain-deployment.md deleted, README.md, .planning/PROJECT.md, .planning/STATE.md)

## Accomplishments
- Removed the now-false "pending DNS cutover" framing from all docs and planning artifacts
- README's SCA Tracker section now states `/sca` is canonical and describes `proxy.ts` host-based routing as dormant-but-shipped infrastructure, not an imminent step
- PROJECT.md's Next Milestone Goals, Active requirements, Context, and Key Decisions table all reflect the decision against the subdomain
- STATE.md carries a dated `[Quick 260828-f3i]` decision entry explaining the scrub, including why the routing code stays and why there's no dangling-CNAME concern to unwind
- Confirmed `proxy.ts`, `lib/sca/routing.ts`, and `.env.example` are byte-identical to HEAD — zero application code touched
- Full test suite still passes at 247/247; `npm run build` succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the deployment doc and rewrite the README SCA section** - `71f4ca5` (docs, doc deletion) + `46231cd` (docs, README rewrite — split into two commits because the initial `git add` with two pathspecs silently dropped README.md when `git rm` had already staged the deletion)
2. **Task 2: Remove the DNS cutover item from PROJECT.md and record the decision** - `4f3cd2c` (docs)
3. **Task 3: Append the decision to STATE.md and confirm no code changed** - not committed here; `.planning/STATE.md` is a docs artifact and is left for the orchestrator's docs commit per execution constraints. No code files were modified in this task (verified via `git diff --stat HEAD -- proxy.ts lib/sca/ .env.example app/ components/ tests/` returning empty).

**Plan metadata:** left to orchestrator (SUMMARY.md, STATE.md, PLAN.md commit handled in a later step)

## Files Created/Modified
- `docs/sca-subdomain-deployment.md` - deleted (obsolete DNS cutover checklist)
- `README.md` - "## SCA Tracker" section rewritten: `/sca` is canonical, `proxy.ts` routing described as dormant-but-shipped
- `.planning/PROJECT.md` - Next Milestone Goals, Active requirements, Current State, What This Is, Context, Key Decisions table, and footer all updated to drop cutover language and record the decision
- `.planning/STATE.md` - new `[Quick 260828-f3i]` decision entry appended; frontmatter `last_updated`/`last_activity` refreshed

## Decisions Made
- `sca.bigmattsbbq.com` subdomain dropped in favor of `/sca` as the sole canonical URL — the path already serves the tracker identically everywhere, and a dedicated subdomain would add a DNS dependency and a dangling-CNAME takeover surface for no user-visible benefit.
- The shipped routing code (`proxy.ts`, `lib/sca/routing.ts`, `SCA_HOSTNAME` env var) is deliberately retained rather than removed — it's inert when no `sca.*` host is bound, already tested, and removing it would be pure churn with regression risk.

## Deviations from Plan

None - plan executed exactly as written, with one process note: Task 1's `git add docs/sca-subdomain-deployment.md README.md` was run as a single command after `git rm` had already staged the deletion; git accepted the already-staged deletion pathspec silently but did not stage README.md's modification in that same invocation, so README.md's changes landed in a second commit (`46231cd`) instead of being combined into `71f4ca5`. Both commits are docs-only, task-scoped, and together deliver exactly what Task 1 specified — no code impact, no scope change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- No outstanding docs debt on the SCA subdomain topic; a future reader will not mistake the DNS cutover for live pending work.
- `docs/` directory is now empty (git does not track empty directories — no further cleanup needed).
- Next milestone scoping (via `/gsd:new-milestone`) now sees three clean candidate goals instead of four, with the DNS item correctly absent.

---
*Quick task: 260828-f3i*
*Completed: 2026-08-28*

## Self-Check: PASSED

- docs/sca-subdomain-deployment.md confirmed deleted from working tree
- README.md, .planning/PROJECT.md, .planning/STATE.md, and this SUMMARY.md all confirmed present
- Commits 71f4ca5, 46231cd, 4f3cd2c confirmed in git log
