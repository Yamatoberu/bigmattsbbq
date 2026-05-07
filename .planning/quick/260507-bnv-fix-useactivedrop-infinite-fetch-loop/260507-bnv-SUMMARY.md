---
phase: quick-260507-bnv
plan: "01"
subsystem: hooks
tags: [bugfix, react-hooks, polling, tdd]
dependency_graph:
  requires: []
  provides: [useActiveDrop two-effect structure]
  affects: [components/NavBar.tsx, components/OrderLanding.tsx]
tech_stack:
  added: []
  patterns: [two-effect React hook pattern for mount + conditional polling]
key_files:
  created: []
  modified:
    - components/hooks/useActiveDrop.ts
    - tests/useActiveDrop.test.ts
decisions:
  - Split single effect into mount-only ([load] deps) and polling ([load, state.drop?.status] deps) to prevent infinite fetch loop
  - Polling effect deps key on state.drop?.status (primitive) not state.drop (object) to avoid re-evaluation on identity changes from each successful fetch
metrics:
  duration: "113s"
  completed: "2026-05-07T14:29:12Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260507-bnv Plan 01: Fix useActiveDrop Infinite Fetch Loop Summary

**One-liner:** Split single-effect useActiveDrop into mount-load effect ([load]) and conditional-polling effect ([load, state.drop?.status]) to eliminate tight infinite request loop against /api/drop.

## What Was Done

The `useActiveDrop` hook had a single `useEffect` with dep array `[load, state.drop, state.drop?.status]` that called `load()` unconditionally at its top. Because `load()` calls `setState({ drop: data, ... })` with a fresh object on every successful fetch, `state.drop`'s identity changed on every response — re-triggering the effect — producing a tight infinite loop against `/api/drop`.

**Fix:** Replace the single effect with two effects:

1. **Mount-only load effect** (`[load]` deps): calls `void load()` exactly once on mount. Since `load` is wrapped in `useCallback(async () => {...}, [])` with empty deps, its identity is stable — this effect fires only once.

2. **Conditional polling effect** (`[load, state.drop?.status]` deps): evaluates `shouldPoll = state.drop !== null && status !== "closed"`. If polling is appropriate, sets up a `setInterval(() => void load(), POLL_INTERVAL_MS)` and returns `clearInterval` as cleanup. The dep array keys on `state.drop?.status` (a primitive string) rather than `state.drop` (an object), so the interval is only re-evaluated when the drop status actually changes — not on every successful fetch.

## TDD Gate Compliance

- RED commit (`e41e3f7`): Updated test file with 11 assertions for two-effect structure — 3 tests failed as expected (Tests 1, 2, 3 assert the new structure not yet present in implementation).
- GREEN commit (`00c4d51`): Implemented two-effect structure — all 11 tests pass; 77 tests across 13 suites green.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update useActiveDrop tests to assert two-effect structure (RED) | e41e3f7 | tests/useActiveDrop.test.ts |
| 2 | Split useActiveDrop into mount-load and conditional-polling effects (GREEN) | 00c4d51 | components/hooks/useActiveDrop.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] `components/hooks/useActiveDrop.ts` exists and contains exactly two `useEffect(` calls
- [x] `tests/useActiveDrop.test.ts` exists with 11 assertions under updated describe block
- [x] Commit `e41e3f7` exists (test RED state)
- [x] Commit `00c4d51` exists (implementation GREEN state)
- [x] All 77 tests pass (`npm run test` exits 0)
- [x] Public return shape `{ drop, isLoading, error, reload }` unchanged
