---
phase: 12-checkout-attribution-tracking
plan: 01
subsystem: database
tags: [typescript, supabase, square, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "attribution_sources Row/Insert/Update entry in Database.public.Tables (lib/database.types.ts)"
  - "AttributionSourceDTO shared contract (lib/types.ts)"
  - "CheckoutRequestBody.customer.attributionSourceCode / attributionDetail optional fields (lib/types.ts)"
  - "buildAttributionMetadata() pure, non-throwing, byte-safe Square metadata builder (lib/square.ts)"
affects: [12-02, 12-03, 12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Byte-safe (UTF-8) truncation via Buffer.byteLength + Array.from code points, never .slice() on JS string length, for any free-text value bound for an external API's byte-oriented limit"
    - "Pure, non-throwing value builders that type-guard external input at runtime even when the TS signature already claims the type is safe"

key-files:
  created:
    - tests/attributionMetadata.test.ts
  modified:
    - lib/database.types.ts
    - lib/types.ts
    - lib/square.ts

key-decisions:
  - "AttributionSourceDTO.id is number (bigint primary key), not string/uuid — corrects an earlier guess in 12-RESEARCH.md/12-PATTERNS.md, confirmed against the live Supabase schema"
  - "attribution_sources inserted as the alphabetically-first table key in Database.public.Tables to match the Supabase-generated-file convention"
  - "Truncation limits (60 bytes for attribution_source, 255 bytes for attribution_detail) enforced as UTF-8 byte budgets, not JS string length, so emoji/CJK detail text can never produce an oversized Square metadata value"

patterns-established:
  - "Byte-budget truncation helper (truncateToByteLimit) as a private, non-exported helper in lib/square.ts, reusable by future metadata-shaping code in this file"

requirements-completed: [D-08, D-10]

# Metrics
duration: 3min
completed: 2026-08-28
---

# Phase 12 Plan 01: Type & Data-Safety Foundation Summary

**Supabase `attribution_sources` types, `AttributionSourceDTO` contract, and a byte-safe non-throwing `buildAttributionMetadata()` Square helper with full UTF-8 boundary test coverage.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-28T21:17:02Z
- **Completed:** 2026-08-28T21:19:30Z
- **Tasks:** 2 completed
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments
- Taught the generated Supabase `Database` type about `public.attribution_sources` (all 8 live columns, correct nullability/defaults) so `supabase.from("attribution_sources")` type-checks against real column names
- Added the shared `AttributionSourceDTO` contract and extended `CheckoutRequestBody.customer` with optional `attributionSourceCode`/`attributionDetail` fields for downstream plans 02-04 to consume directly
- Shipped `buildAttributionMetadata()` in `lib/square.ts` — a pure, non-throwing, byte-safe metadata builder that guarantees a malformed or oversized attribution value can never abort a valid Square checkout (D-10), proven by 12 unit tests including emoji/CJK multi-byte boundary cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add attribution_sources to generated Supabase types and declare the shared DTO contracts** - `3a4e974` (feat)
2. **Task 2: Add the non-throwing buildAttributionMetadata helper with D-10 unit coverage** - `0637f28` (test, RED) → `5452cc4` (feat, GREEN)

**Plan metadata:** (pending — this commit)

_Note: Task 2 was TDD — RED test commit landed first and was confirmed failing (12/12 tests failing on missing export) before the GREEN implementation commit._

## Files Created/Modified
- `lib/database.types.ts` - Added `attribution_sources` Row/Insert/Update/Relationships entry (8 columns, `id: number`) as the alphabetically-first table key
- `lib/types.ts` - Added `export interface AttributionSourceDTO`; extended `CheckoutRequestBody.customer` with `attributionSourceCode?: string` and `attributionDetail?: string`
- `lib/square.ts` - Added private `truncateToByteLimit()` helper and exported `buildAttributionMetadata()` pure builder
- `tests/attributionMetadata.test.ts` - 12 unit tests covering key omission, whitespace trimming, ASCII/emoji/CJK byte-safe truncation, round-trip integrity, and no-throw on adversarial (non-string, 100k-char) input

## Decisions Made
- `AttributionSourceDTO.id` is `number`, matching the live `bigint` primary key — corrected from an earlier `string`/uuid guess in prior research artifacts
- Truncation is measured in UTF-8 bytes (`Buffer.byteLength`) via code-point-aware trimming, never `.slice()` on JS string length, since Square's metadata value limits are byte-oriented and free-text `attributionDetail` can contain multi-byte characters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None - this plan produces types and a pure helper only; no UI or runtime wiring is expected at this stage (that's plans 02-04).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 02, 03, and 04 can now import `AttributionSourceDTO`, the extended `CheckoutRequestBody`, the `attribution_sources` Supabase types, and `buildAttributionMetadata()` directly without re-deriving any of these contracts
- `buildAttributionMetadata()` is ready to be wired into the existing `createOrder()` call site in a later plan — it is not yet called from any route
- No blockers

---
*Phase: 12-checkout-attribution-tracking*
*Completed: 2026-08-28*

## Self-Check: PASSED

All created/modified files exist on disk and all referenced commit hashes (3a4e974, 0637f28, 5452cc4, 3855a2e) are present in git history.
