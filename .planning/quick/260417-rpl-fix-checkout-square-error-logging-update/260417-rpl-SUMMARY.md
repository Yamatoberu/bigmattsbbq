---
phase: quick
plan: 260417-rpl
subsystem: logging
tags: [logging, observability, square, error-handling]
dependency_graph:
  requires: []
  provides: [square-error-observability]
  affects: [app/api/checkout/route.ts, lib/logger.ts]
tech_stack:
  added: []
  patterns: [duck-type error enrichment]
key_files:
  created: []
  modified:
    - lib/logger.ts
    - app/api/checkout/route.ts
decisions:
  - Duck-type status/body spread in logError rather than typed SquareError param — keeps signature generic and works for any error with these fields
metrics:
  duration: ~5 minutes
  completed: "2026-04-18T01:58:51Z"
  tasks_completed: 2
  files_modified: 2
---

# Quick 260417-rpl: Fix Checkout Square Error Logging Update — Summary

**One-liner:** Extended `logError` to duck-type spread `status` and `body` fields, and added an explicit `logError` call in checkout's inner Square catch block so Square API rejections are fully captured before re-throw.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Extend logError to emit status and body from duck-typed errors | 7c6d5f8 |
| 2 | Log squareError in checkout route inner catch before re-throw | cda4d5d |

## Changes Made

### lib/logger.ts

Replaced single-line `console.error` call with a duck-type spread pattern. After building the `normalized` object from the `instanceof Error` check, the function now checks if `error` is a non-null object and spreads `status` and `body` onto the output when present. No signature change.

### app/api/checkout/route.ts

Added `logError("Square API call failed", squareError, requestId)` immediately before `throw squareError` in the inner catch block (lines ~304-315). `logError` was already imported — no new imports needed.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run build`: compiled successfully, no TypeScript errors
- `npm run test`: 38/38 tests passed across 8 test files

## Self-Check: PASSED

- lib/logger.ts modified and compiled cleanly
- app/api/checkout/route.ts modified and compiled cleanly
- Commits 7c6d5f8 and cda4d5d exist in git log
