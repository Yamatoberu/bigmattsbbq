---
phase: 11-analytics-ai-reviews
plan: 02
subsystem: database
tags: [supabase, typescript, sca, ai-reviews, tdd]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing
    provides: getScaSupabaseClient(), lib/database-sca.types.ts generated Row types, parseScaId()
  - phase: 10-core-browsing
    provides: lib/sca/queries.ts and lib/sca/types.ts idioms (list query, detail query + PGRST116-to-null, embed-typed view models)
provides:
  - AiReviewCookSummary and AiReviewWithCook view-model types in lib/sca/types.ts
  - getAllAiReviews() — every cook_ai_review row, newest-first, cook + competition embedded, unfiltered by review_type
  - getAiReviewById(id) — single review by id, null on PGRST116, cook + competition embedded
affects: [11-04-ai-review-pages, 11-05-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared module-private embed select string (AI_REVIEW_EMBED_SELECT) keeps list and detail queries byte-identical"
    - "TDD RED/GREEN cycle for query functions: describe blocks written and confirmed failing before implementation"

key-files:
  created: []
  modified:
    - lib/sca/types.ts
    - tests/sca-queries.test.ts
    - lib/sca/queries.ts

key-decisions:
  - "AiReviewWithCook derived via intersection with ScaCookAiReviewRow (generated alias) rather than hand-typing the seven cook_ai_review columns, matching CompetitionWithCooks's idiom"
  - "cook field kept nullable on AiReviewWithCook even though cook_id is NOT NULL in the schema, matching the file's defensive single-embed convention"
  - "No .eq(\"review_type\", ...) filter added to getAllAiReviews — D-03 requires every stored row including photo_review"

patterns-established:
  - "Embed select string extracted to a single module-private const shared by both the list and detail query for a table, preventing select-string drift"

requirements-completed: [AIRV-01, AIRV-02]

# Metrics
duration: 1min
completed: 2026-08-24
---

# Phase 11 Plan 02: AI Reviews Data Layer Summary

**Two Supabase queries (`getAllAiReviews`, `getAiReviewById`) joining `cook_ai_review` → `cook` → `competition`, newest-first and unfiltered by review_type, with matching view-model types and full TDD coverage.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-08-24T15:12:39-06:00
- **Completed:** 2026-08-24T15:13:25-06:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `AiReviewCookSummary` and `AiReviewWithCook` view-model types added to `lib/sca/types.ts`, reusing the generated `ScaCookRow`/`ScaCookAiReviewRow` aliases rather than duplicating column names
- `getAllAiReviews()` implemented: `cook_ai_review` joined to `cook` and `competition`, ordered `created_at` descending, no `review_type` filter (every stored review, including `photo_review`, comes back per D-03)
- `getAiReviewById(id)` implemented: same embed, `PGRST116` mapped to `null`, other errors rethrown, following the exact convention already used by `getCompetitionWithCooks`/`getCookWithDetails`
- Full TDD cycle executed: 9 new tests written and confirmed RED (functions didn't exist) before implementation, then GREEN after

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AiReviewCookSummary and AiReviewWithCook to lib/sca/types.ts** - `79629b6` (feat)
2. **Task 2: Add getAllAiReviews and getAiReviewById describe blocks to tests/sca-queries.test.ts** - `cd01217` (test — RED)
3. **Task 3: Implement getAllAiReviews and getAiReviewById in lib/sca/queries.ts** - `407a60c` (feat — GREEN)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified
- `lib/sca/types.ts` - Added `AiReviewCookSummary` (Pick of id/steak_label + nullable competition) and `AiReviewWithCook` (ScaCookAiReviewRow intersected with nullable cook embed)
- `tests/sca-queries.test.ts` - Added `describe("getAllAiReviews")` (6 tests: table, select embed, no review_type filter, order, null-data, error) and `describe("getAiReviewById")` (3 tests: PGRST116, reject, success with eq/single assertions)
- `lib/sca/queries.ts` - Added `AI_REVIEW_EMBED_SELECT` shared constant, `getAllAiReviews()`, `getAiReviewById(id)`, and `AiReviewWithCook` to the type-only import block

## Decisions Made
- Reused `ScaCookAiReviewRow` via intersection type instead of hand-writing the seven `cook_ai_review` columns, per the plan's explicit instruction and the file's existing `CompetitionWithCooks` idiom
- Kept `cook: AiReviewCookSummary | null` nullable despite `cook_id` being NOT NULL in the schema, matching every other single-embed field in `lib/sca/types.ts` (defensive null-check convention, RESEARCH.md Pitfall 3)
- Extracted the embed select string to a single shared `const` (`AI_REVIEW_EMBED_SELECT`) so the list and detail queries cannot drift apart — plan allowed either extraction or duplication; extraction chosen for DRYness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getAllAiReviews()` and `getAiReviewById()` are ready for consumption by `app/sca/ai-reviews/page.tsx` and `app/sca/ai-reviews/[id]/page.tsx` (plan 11-04)
- `AiReviewWithCook.cook` nullability must be defensively checked by any consuming page before rendering back-links, matching the pattern already established for `CookWithScore.competition`
- Full test suite (247 tests, 25 files) and `tsc --noEmit` remain clean; zero new dependencies added

---
*Phase: 11-analytics-ai-reviews*
*Completed: 2026-08-24*
