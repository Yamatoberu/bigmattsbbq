---
phase: 05-content-mailing-list
plan: "04"
subsystem: mailing-list
tags: [unsubscribe, jwt, jose, mailing-list, security]
dependency_graph:
  requires: [05-01]
  provides: [lib/unsubscribeToken.ts, app/api/unsubscribe/route.ts, app/unsubscribe/page.tsx]
  affects: [05-05]
tech_stack:
  added: []
  patterns: [jose-hs256-jwt, suspense-useSearchParams, inner-try-catch-status-differentiation]
key_files:
  created:
    - lib/unsubscribeToken.ts
    - app/api/unsubscribe/route.ts
    - app/unsubscribe/page.tsx
  modified: []
decisions:
  - "Algorithm pinned to HS256 via algorithms:[ALG] in jwtVerify to prevent algorithm confusion attacks (alg=none, asymmetric downgrade)"
  - "Inner try/catch around verifyUnsubscribeToken returns 401 for token failures vs 500 for DB failures — client uses this distinction"
  - "DB UPDATE affects 0 rows on unknown email silently — prevents email enumeration (D-08 pattern)"
  - "Suspense wrapper required for useSearchParams in Next.js App Router static generation"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-19"
  tasks_completed: 3
  files_created: 3
  files_modified: 0
---

# Phase 05 Plan 04: Unsubscribe Token Library and Page Summary

**One-liner:** Jose HS256 signed JWT unsubscribe system with server-side token verification, Supabase flag flip, and three-state client page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create lib/unsubscribeToken.ts (TDD GREEN) | 66c70e1 | lib/unsubscribeToken.ts |
| 2 | Create POST /api/unsubscribe route | b8f06d7 | app/api/unsubscribe/route.ts |
| 3 | Create /unsubscribe client page with three-state UI | ebcbc86 | app/unsubscribe/page.tsx |

## Verification Results

- `npm run test -- --run tests/unsubscribeToken.test.ts`: 4/4 passed (RED → GREEN)
- `npm run build`: exits 0, /unsubscribe and /api/unsubscribe both listed in route table
- All acceptance criteria met for all 3 tasks

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three files are fully wired with real behavior.

## Threat Surface Scan

No new threat surface beyond what is documented in the plan's `<threat_model>`. The `/api/unsubscribe` POST endpoint and JWT verification path match the registered threats T-5-01 through T-5-04-07, all mitigated as planned.

## Self-Check: PASSED

- lib/unsubscribeToken.ts: FOUND
- app/api/unsubscribe/route.ts: FOUND
- app/unsubscribe/page.tsx: FOUND
- Commit 66c70e1: FOUND
- Commit b8f06d7: FOUND
- Commit ebcbc86: FOUND
