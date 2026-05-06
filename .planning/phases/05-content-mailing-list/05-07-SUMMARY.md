---
phase: 05-content-mailing-list
plan: "07"
subsystem: dependencies-idempotency
tags: [gap-closure, dependencies, idempotency, regression]
one_liner: "Restored resend@^6.12.2 and jose@^6.2.2 runtime deps plus deterministic SHA-256 idempotency over sorted inputs replacing random-UUID"
dependency_graph:
  requires: []
  provides:
    - resend and jose declared in package.json at ^6 majors
    - newIdempotencyKey(inputs string[]) deterministic SHA-256 implementation
  affects:
    - app/api/admin/broadcast/route.ts (imports resend)
    - app/api/unsubscribe/route.ts (imports jose)
    - app/api/checkout/route.ts (4 idempotency callsites updated)
    - app/api/dev/set-inventory/route.ts (1 idempotency callsite updated)
tech_stack:
  added: []
  patterns:
    - Deterministic idempotency via SHA-256(sorted(inputs).join("|")).slice(0,45)
    - cart spread into idempotency inputs as variationId:quantity strings
key_files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - lib/idempotency.ts
    - app/api/checkout/route.ts
    - app/api/dev/set-inventory/route.ts
    - tests/checkoutReservation.test.ts
decisions:
  - "Included customer.email in all checkout idempotency arrays — stable per user, differentiates customers, pre-image resistant as SHA-256 digest"
  - "Used YYYY-MM-DD date slice for dev/set-inventory key — deterministic within a day without millisecond churn"
  - "Fixed pre-existing TS2352 cast in checkoutReservation.test.ts as part of tsc --noEmit acceptance criterion"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_changed: 6
requirements_closed:
  - MAIL-05
  - MAIL-06
---

# Phase 05 Plan 07: Gap Closure — Dependencies and Idempotency Summary

## What Was Built

Closed two regressions introduced by commit 6235fa8 ("chore(05-06): restore files from base commit 9ec233c") which reverted `package.json`, `package-lock.json`, and `lib/idempotency.ts` to pre-Phase-5 state.

**Gap 1 — Missing runtime dependencies:** `npm install resend@^6.12.0 jose@^6.2.2 --save` added both packages to `dependencies` (not `devDependencies`) and regenerated `package-lock.json` with integrity hashes. Both packages are now present for `npm ci` in fresh clones and CI environments.

**Gap 2 — Idempotency regression:** Replaced the random-UUID `newIdempotencyKey()` with a deterministic SHA-256 implementation over sorted, pipe-joined inputs sliced to 45 characters (Square's limit). Updated all 5 callsites (4 in checkout, 1 in dev set-inventory) to pass meaningful string arrays instead of zero-arg calls.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restore resend and jose to package.json | ed03944 | package.json, package-lock.json |
| 2 | Restore deterministic SHA-256 idempotency | 96273dd | lib/idempotency.ts, app/api/checkout/route.ts, app/api/dev/set-inventory/route.ts, tests/checkoutReservation.test.ts |

## Verification Results

- `npm ls resend jose` — both at `@6.` versions, no missing/peer-dep warnings
- `node -e "require('resend'); require('jose'); console.log('ok')"` — prints `ok`
- `npm ls --depth=0` — no extraneous labels for resend or jose
- `npm run test -- --run tests/idempotency.test.ts` — 6/6 passing
- `npm run test` (full suite) — 56/56 passing across 12 test files
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0, all 17 routes compiled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS2352 type cast in checkoutReservation.test.ts**
- **Found during:** Task 2 verification (tsc --noEmit acceptance criterion)
- **Issue:** `response.body as { error: string }` fails strict TypeScript because `body` is `ReadableStream | null`; the cast was already present before this plan's changes
- **Fix:** Added `unknown` intermediary: `response.body as unknown as { error: string }`
- **Files modified:** tests/checkoutReservation.test.ts (line 211)
- **Commit:** 96273dd

## Known Stubs

None — all data flows are wired. No placeholder text or hardcoded empty values introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check

Files exist:
- lib/idempotency.ts: FOUND
- app/api/checkout/route.ts: FOUND
- app/api/dev/set-inventory/route.ts: FOUND
- package.json: FOUND (contains resend and jose at ^6)

Commits exist:
- ed03944: chore(05-07): install resend and jose
- 96273dd: fix(05-07): restore deterministic SHA-256 idempotency

## Self-Check: PASSED
