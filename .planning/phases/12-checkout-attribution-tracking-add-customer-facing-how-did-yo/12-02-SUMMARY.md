---
phase: 12-checkout-attribution-tracking
plan: 02
subsystem: api
tags: [typescript, supabase, nextjs, vitest, tdd]

# Dependency graph
requires:
  - phase: 12-01
    provides: "AttributionSourceDTO contract, attribution_sources Supabase types, buildAttributionMetadata()"
provides:
  - "fetchActiveAttributionSources() — throwing Supabase read of active attribution_sources rows"
  - "resolveAttributionLabel() — never-throwing code->label resolver for the checkout Slack path"
  - "GET /api/attribution-sources — public route serving the active source list as DTOs"
affects: [12-03, 12-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Never-throwing resolver pattern: wrap entire body in try/catch, log via logError, return null on any failure — used when a lookup runs after an already-committed external side effect (Square order/invoice) and must never abort a successful checkout"

key-files:
  created:
    - lib/attributionSources.ts
    - app/api/attribution-sources/route.ts
    - tests/attributionSourcesRoute.test.ts
  modified: []

key-decisions:
  - "resolveAttributionLabel() intentionally does NOT filter on is_active — a source deactivated between page load and checkout submit should still resolve to a readable label for the Slack notification"

patterns-established:
  - "Thin GET route pattern reused a third time (frozen-items, now attribution-sources): resolve x-request-id, try/fetch/return 200, catch/logError/return generic 500 + requestId, never interpolate the raw error into the response body"

requirements-completed: [D-04, D-08, D-09, D-01]

# Metrics
duration: 3min
completed: 2026-08-28
---

# Phase 12 Plan 02: Attribution Sources API Bridge Summary

**GET /api/attribution-sources thin route backed by a server-only Supabase reader, plus a never-throwing resolveAttributionLabel() for the post-order Slack notification path.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-28T21:21:30Z
- **Completed:** 2026-08-28T21:24:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (all created)

## Accomplishments
- Shipped `lib/attributionSources.ts` with a throwing list fetch (`fetchActiveAttributionSources`, explicit column list, active-only, sorted by `sort_order`) and a guaranteed-non-throwing label resolver (`resolveAttributionLabel`) for the checkout route's post-order Slack path
- Shipped `GET /api/attribution-sources`, modeled directly on the existing `app/api/frozen-items/route.ts` thin-route pattern: 200 + DTO array on success, generic logged 500 (never leaking the raw Postgres/PostgREST error) on Supabase failure
- TDD RED→GREEN cycle for the route: failing test committed first (module didn't exist), then the route implementation made all 3 tests pass — success passthrough, customer-safe 500, and single `logError` call carrying the response `requestId`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/attributionSources.ts with fetchActiveAttributionSources and a non-throwing label resolver** - `d80c25d` (feat)
2. **Task 2: Ship GET /api/attribution-sources with success and Supabase-failure coverage** - `c796a02` (test, RED) → `14db826` (feat, GREEN)

**Plan metadata:** (pending — this commit)

_Note: Task 2 was TDD — the RED test commit landed first and was confirmed failing (`Cannot find module '.../route'`) before the GREEN implementation commit._

## Files Created/Modified
- `lib/attributionSources.ts` - `fetchActiveAttributionSources()` (throws on Supabase error, explicit column list, `is_active=true`, ordered by `sort_order`) and `resolveAttributionLabel()` (try/catch-wrapped, never throws, logs via `logError`, does not filter on `is_active`)
- `app/api/attribution-sources/route.ts` - `GET` handler: `runtime = "nodejs"`, resolves `x-request-id`, returns 200 + DTO array or a generic logged 500
- `tests/attributionSourcesRoute.test.ts` - 3 tests: success DTO passthrough, customer-safe 500 with no leaked Postgres error substring, single `logError` call carrying the same `requestId` as the response body

## Decisions Made
- `resolveAttributionLabel()` deliberately omits the `is_active` filter present in `fetchActiveAttributionSources()` — a source deactivated between page load and checkout submission should still resolve to a human-readable label for the D-01 Slack line, since the customer already selected it while it was active

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast `response.body` via `as unknown as {...}` in the new test to satisfy `tsc --noEmit`**
- **Found during:** Task 2 GREEN verification (`npx tsc --noEmit`)
- **Issue:** The plan's `<action>` didn't specify a cast pattern for `response.body`; the mocked `NextResponse.json` return shape (`{ body, status }`) is untyped in the test file, but `tsc --noEmit` type-checks the *real* `next/server` `NextResponse.json` return type (`NextResponse<unknown>`, `.body: ReadableStream<Uint8Array> | null`) since `vi.mock` calls have no effect on static type-checking. Direct `as { error: string }` casts failed with TS2352 (insufficient overlap).
- **Fix:** Matched the existing repo pattern from `tests/checkoutReservation.test.ts` (`response.body as unknown as {...}`), which routes through `unknown` first.
- **Files modified:** `tests/attributionSourcesRoute.test.ts`
- **Verification:** `npx tsc --noEmit` exits 0; `npx vitest run tests/attributionSourcesRoute.test.ts` still passes 3/3
- **Committed in:** `14db826` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug — type-check-only, no runtime behavior change)
**Impact on plan:** No scope creep; test assertions and coverage are identical to what the plan specified, only the TypeScript cast syntax changed to type-check cleanly.

## Acceptance Criteria Note

Task 1's acceptance criteria expected `grep -n "sort_order" lib/attributionSources.ts` to return exactly 2 matches, but the same task's `<action>` explicitly specifies the map line `sortOrder: row.sort_order`, which itself contains the substring `sort_order` and produces a 3rd match (select column list, `.order()` call, and the map assignment). Implemented the action's literal, unambiguous code contract as written; this is a pre-existing inconsistency between the plan's acceptance-criteria grep count and its own action text, not a functional issue — `is_active`, `throw`-count, `logError`-count, exported-function-count, `npx tsc --noEmit`, and `npm run test` acceptance criteria all pass exactly as specified.

## Issues Encountered

None beyond the TypeScript cast noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can import `resolveAttributionLabel` directly into `app/api/checkout/route.ts` for the post-order Slack notification line
- Plan 04 can consume `GET /api/attribution-sources` from a client component (e.g. `useAttributionSources` hook) to populate the checkout dropdown
- No blockers

---
*Phase: 12-checkout-attribution-tracking*
*Completed: 2026-08-28*

## Self-Check: PASSED

All created files exist on disk (`lib/attributionSources.ts`, `app/api/attribution-sources/route.ts`, `tests/attributionSourcesRoute.test.ts`) and all referenced commit hashes (d80c25d, c796a02, 14db826, b1bda0d) are present in git history.
