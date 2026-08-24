---
phase: 10-core-browsing-dashboard-competitions-cook-detail
plan: 04
subsystem: database
tags: [supabase, postgrest, typescript, vitest, server-only]

requires:
  - phase: 09-foundation-subdomain-routing
    provides: getScaSupabaseClient() schema-scoped client, lib/database-sca.types.ts generated Row types
  - phase: 10-core-browsing-dashboard-competitions-cook-detail
    plan: 01
    provides: lib/sca/types.ts view-model contracts (CookWithScore, CompetitionWithCooks, CookWithDetails)
provides:
  - lib/sca/queries.ts — server-only data-access layer with parseScaId, getAllCooksWithScores, getCompetitions, getCompetitionWithCooks, getCookWithDetails
  - PGRST116-to-null mapping centralized in one module for both [id] detail pages
affects: [10-05, 10-06, 10-07, 10-08]

tech-stack:
  added: []
  patterns:
    - "Single server-only query module per data domain — no page inlines a Supabase call"
    - "Detail queries map PGRST116 (.single() zero-row) to null internally; caller decides notFound() vs generic error"
    - "Regex-gated ([+^\\d+$/) + Number.isSafeInteger + >0 validation for untrusted route id params before any query touches them"
    - "Embedded/relational select() in one round trip per page instead of N+1 manual joins"

key-files:
  created:
    - lib/sca/queries.ts
    - tests/sca-queries.test.ts
  modified: []

key-decisions:
  - "parseScaId rejects on a strict /^\\d+$/ regex before any Number() coercion, so whitespace-trimmed-but-otherwise-malformed strings (fractional, exponential, SQL-injection-shaped) never reach a Supabase .eq() call"
  - "cook_ai_review null embed normalized to [] inside getCookWithDetails so the Cook Detail page can rely on .length without a null check"
  - "This module performs zero logging and renders zero user-facing text — it only throws or returns null/data; pages own logError + presentation, per WR-02 avoidance"

patterns-established:
  - "Chainable hand-rolled Supabase client stub in tests (records .from/.select/.order/.eq/.single args, thenable chain) rather than a mocking library — matches tests/supabase-sca.test.ts precedent, no network access, no env vars required"

requirements-completed: [COMP-01, COMP-02, COOK-01, COOK-02]

duration: 20min
completed: 2026-08-24
---

# Phase 10 Plan 04: SCA Query Module & Route-ID Validator Summary

**Server-only `lib/sca/queries.ts` centralizing all five Phase 10 Supabase reads (Dashboard, Competitions list, Competition detail, Cook detail) plus `parseScaId`, the one input-validation control in this read-only tracker.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-24T02:25:00Z (approx)
- **Completed:** 2026-08-24T02:45:32Z
- **Tasks:** 2 completed
- **Files modified:** 2 (both created)

## Accomplishments
- Centralized all Phase 10 Supabase reads behind one server-only module, so no page inlines catalog/relational query knowledge
- Implemented `parseScaId` as the phase's sole ASVS V5 input-validation control, covering fractional/exponential/oversized/negative/array/SQL-injection-shaped input with a regex gate before any numeric coercion
- Mapped `.single()`'s `PGRST116` zero-row signal to `null` inside the module (not the page), so both `[id]` routes share identical 404 semantics with zero duplicated error-code strings
- Covered every query contract (select shape, ordering direction, PGRST116 mapping, error propagation, null-embed normalization) with a hand-rolled chainable mock client requiring no network access and no environment variables

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement lib/sca/queries.ts server-only data access and parseScaId** - `11d869d` (feat)
2. **Task 2: Add tests/sca-queries.test.ts covering id validation and query contracts** - `d8d1d58` (test)

## Files Created/Modified
- `lib/sca/queries.ts` - `parseScaId`, `getAllCooksWithScores`, `getCompetitions`, `getCompetitionWithCooks`, `getCookWithDetails`; `server-only` guarded, zero logging/user-facing text
- `tests/sca-queries.test.ts` - 24 tests across 5 describe blocks covering every `<behavior>` case in the plan, using a hand-rolled chainable Supabase stub

## Decisions Made
- Task 2 was written and verified against the already-implemented Task 1 module rather than run as a strict RED-before-implementation TDD cycle, matching the plan's own task ordering (implementation task first, test task second, both `type="auto"`) — tests were still written from the `<behavior>` spec independently of reading the implementation's internals beyond its exported signatures, and all 24 assertions passed on first run against the real implementation with no adjustments needed to either file
- Followed the plan's mock-client design exactly: a `then()`-thenable chain object recording `.from`/`.select`/`.order`/`.eq`/`.single` call arguments, avoiding any external mocking library

## Deviations from Plan

None - plan executed exactly as written. All acceptance-criteria greps (`server-only` header, `getScaSupabaseClient` usage count, `PGRST116` count of 2, `ascending: false` count of 1, `cook_ai_review(*)` count of 1, zero `logError`/`console.` calls, zero `sca.`-prefixed table names, 5 exported functions) matched exactly on first implementation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`lib/sca/queries.ts` is ready for Wave 3's four page plans (Dashboard, Competitions list, Competition detail, Cook detail) to import directly — each page needs only a `try/catch` around one query call plus `logError` + generic-message presentation (or `notFound()` for a `null` detail result). `app/sca/page.tsx` still inlines its own Phase 9 count query and is out of this plan's scope (`files_modified` was limited to `lib/sca/queries.ts` and `tests/sca-queries.test.ts`); rewiring it onto `getAllCooksWithScores()`/`getCompetitions()` is expected in the Dashboard/Competitions page plans. No blockers.

---
*Phase: 10-core-browsing-dashboard-competitions-cook-detail*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created files verified present on disk; both task commit hashes verified present in git log.
