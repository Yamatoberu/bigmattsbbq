---
phase: 09-foundation-subdomain-routing
plan: 05
subsystem: sca-scoring
tags: [typescript, vitest, tdd, sca, derived-metrics]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing (plan 03)
    provides: "lib/database-sca.types.ts generated Database type (sca.score.Row with total_score/first_place_score) and getScaSupabaseClient()"
provides:
  - "lib/sca/scoring.ts — deriveScoreMetrics(score) and PERFECT_SCORE, the single source of truth for distance_from_winning / distance_from_perfect"
  - "tests/sca-scoring.test.ts — 10 passing cases including a compile-time-proven real sca score row pass-through"
affects: [10-core-browsing, 11-analytics-and-ai-reviews]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure derived-metric functions live under lib/sca/ alongside lib/sca/routing.ts, following the lib/normalizers.ts small-pure-function style (named export function declarations, no JSDoc, explicit == null checks instead of falsy checks)"
    - "Compile-time contract tests: alias the generated Database['sca']['Tables'][table]['Row'] type in the test file and pass a literal of that type straight into the function under test — proves no adapter/mapping code is needed at real call sites, checked by both tsc and a runtime it() case"

key-files:
  created:
    - lib/sca/scoring.ts
    - tests/sca-scoring.test.ts
  modified: []

key-decisions:
  - "PERFECT_SCORE (254.5) defined exactly once in lib/sca/scoring.ts; a repo-wide grep in acceptance criteria confirms no other file under lib/app/components duplicates the literal"
  - "ScoreMetricsInput fields (total_score, first_place_score) typed as number | null | undefined — matches the generated sca.score.Row shape (number | null) exactly, so a real row satisfies the input type with no widening or narrowing needed"
  - "No clamping, rounding, or Math.abs applied — values above the perfect-score cap or above the winning score are returned as negative numbers; formatting for display is a caller concern, not this module's"

patterns-established:
  - "Plan-level TDD gate followed for Task 1: RED test(09-05) commit (module-not-found failure confirmed) before GREEN feat(09-05) commit implementing lib/sca/scoring.ts"

requirements-completed: [INFRA-05]

# Metrics
duration: 1min
completed: 2026-08-23
---

# Phase 09 Plan 05: SCA Derived Score Metrics Summary

**Single shared `deriveScoreMetrics()` function in `lib/sca/scoring.ts` computes `distance_from_winning` and `distance_from_perfect` from a real `sca.score` row with no field mapping, backed by 10 passing Vitest cases and a compile-time proof that the generated `Database["sca"]["Tables"]["score"]["Row"]` type satisfies the function's input type.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-08-23T20:45:00Z (approx)
- **Completed:** 2026-08-23T20:46:32Z
- **Tasks:** 2 completed (Task 1 TDD: RED + GREEN, Task 2: real-row proof)
- **Files modified:** 2 created (lib/sca/scoring.ts, tests/sca-scoring.test.ts)

## Accomplishments
- `lib/sca/scoring.ts` exports `PERFECT_SCORE = 254.5` and `deriveScoreMetrics(score: ScoreMetricsInput): ScoreMetrics`, implementing both REQUIREMENTS.md INFRA-05 formulas verbatim with explicit `== null` checks so a legitimate `0` score is never treated as missing
- `tests/sca-scoring.test.ts` covers all 8 behavior-block cases from the plan plus the `PERFECT_SCORE` constant assertion and a real-row compile-time/runtime proof — 10/10 pass
- Confirmed via grep that `254.5` appears nowhere else under `lib`, `app`, or `components` — the constant cannot drift
- Confirmed `Database["sca"]["Tables"]["score"]["Row"]` (from plan 09-03's generated types) is directly assignable to `ScoreMetricsInput` with zero field renaming — Phase 10/11 pages can pass a fetched row straight into `deriveScoreMetrics` with no adapter code
- Full suite green: `npx tsc --noEmit` exit 0, `npm run test` 18 files / 118 tests pass, `git diff --stat lib/database-sca.types.ts` empty (generated types untouched)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing test for deriveScoreMetrics formulas** - `e21eca2` (test)
2. **Task 1 GREEN: implement deriveScoreMetrics and PERFECT_SCORE** - `66d07e1` (feat)
3. **Task 2: prove deriveScoreMetrics accepts a real sca score row** - `659d81a` (test)

**Plan metadata:** commit to follow this summary (docs: complete plan)

_Note: Task 1 is TDD (`tdd="true"`) — RED then GREEN, no REFACTOR commit was needed since the GREEN implementation was already minimal and matched repo conventions on first pass._

## Files Created/Modified
- `lib/sca/scoring.ts` - `PERFECT_SCORE` constant, `ScoreMetricsInput`/`ScoreMetrics` interfaces, `deriveScoreMetrics()` pure function (23 lines)
- `tests/sca-scoring.test.ts` - 10 Vitest cases: formula correctness, null/undefined handling, unclamped negative results, `PERFECT_SCORE` value, and a real `sca.score.Row`-typed literal passed straight into the function under test

## sca `score` Table Reference (for Phase 10/11)

Score table is `score` (confirmed unchanged from 09-03-SUMMARY.md). Both derived-metric source columns live directly on this table — no separate placement/competition table lookup needed:
- `total_score: number | null`
- `first_place_score: number | null`

`deriveScoreMetrics({ total_score, first_place_score })` returns `{ distance_from_winning: number | null, distance_from_perfect: number | null }`. Both outputs are `null` only when their required source field(s) are `null`/`undefined`; otherwise they are exact (possibly negative) numbers with no rounding — format for display at the call site.

## Decisions Made
- No deviations required from the plan's documented field names — the generated `score.Row` columns (`total_score`, `first_place_score`) matched `ScoreMetricsInput` exactly, so Task 2 needed no adjustment to `lib/sca/scoring.ts`'s types (the "if the assertion does not compile" contingency in the plan was not triggered).
- Kept `ScoreMetricsInput` as a plain two-field interface (not a `Pick<ScaScoreRow, ...>` utility type) per the plan's interface style guidance — the assignability proof in the test still holds because a full `ScaScoreRow` is structurally compatible with the smaller `ScoreMetricsInput`.

## Deviations from Plan

None - plan executed exactly as written. No auto-fixes were needed; the generated types from 09-03 already matched the plan's assumed field names (`total_score`, `first_place_score`) with no adjustment required.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `deriveScoreMetrics` and `PERFECT_SCORE` are ready to import from `lib/sca/scoring.ts` by Phase 10 (Dashboard comparison table, competition detail page) and Phase 11 (analytics trends) with no adapter code — a row from `getScaSupabaseClient().from("score").select()` can be passed directly.
- No outstanding blockers for the rest of Phase 9.

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

All created files verified on disk (`lib/sca/scoring.ts`, `tests/sca-scoring.test.ts`) and all three task commit hashes (`e21eca2`, `66d07e1`, `659d81a`) verified present in git log.
