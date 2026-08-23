---
phase: 05-content-mailing-list
plan: "01"
subsystem: mailing-list
tags: [setup, testing, mailing-list, resend, jose, env]
requirements: [MAIL-02, MAIL-03, MAIL-05, MAIL-06]

dependency_graph:
  requires: []
  provides:
    - resend@^6.12.0 in dependencies
    - jose@^6.2.2 in dependencies
    - BROADCAST_SECRET env var
    - UNSUBSCRIBE_SECRET env var
    - tests/mailingList.test.ts (MAIL-02/MAIL-03 scaffold)
    - tests/unsubscribeToken.test.ts (MAIL-05 scaffold)
    - tests/broadcast.test.ts (MAIL-06 scaffold)
  affects:
    - Plans 03, 04, 05 (can now import resend and jose without compile failures)
    - Plans 03, 04, 05 (have automated verify targets)

tech_stack:
  added:
    - resend@6.12.0 (runtime dependency)
    - jose@6.2.2 (runtime dependency)
  patterns:
    - Wave 0 test scaffold pattern: test files created RED before route implementations exist
    - vi.doMock + vi.resetModules pattern for dynamic import testing
    - BROADCAST_SECRET read directly from process.env (not via getSquareEnv() — matches Supabase pattern)

key_files:
  created:
    - .env.example
    - tests/mailingList.test.ts
    - tests/unsubscribeToken.test.ts
    - tests/broadcast.test.ts
  modified:
    - package.json (added resend, jose to dependencies)
    - package-lock.json (updated lockfile)

decisions:
  - BROADCAST_SECRET and UNSUBSCRIBE_SECRET share same value for MVP (per RESEARCH.md Assumption A3)
  - env vars read from process.env directly (not via lib/env.ts) — consistent with Supabase pattern
  - .env.example created from scratch (file did not exist in git history at current HEAD)

metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-19"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 5 Plan 01: Install resend/jose, add env vars, and Wave 0 test scaffolds Summary

**One-liner:** Installed resend@6.12.0 and jose@6.2.2, populated BROADCAST_SECRET/UNSUBSCRIBE_SECRET in .env.local, and created three RED test scaffold files that will turn green when Plans 03/04/05 implement their route targets.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Install resend and jose, add BROADCAST_SECRET env vars | 7b7f1e9 | package.json, package-lock.json, .env.example |
| 2 | Create Wave 0 test scaffolds | 212ec8b | tests/mailingList.test.ts, tests/unsubscribeToken.test.ts, tests/broadcast.test.ts |

## Verification Results

- `npm ls resend jose` shows both at `^6` major with no unmet peer deps
- `node -e "require('resend'); require('jose')"` exits 0
- `.env.local` contains `BROADCAST_SECRET=` and `UNSUBSCRIBE_SECRET=` with 64-char hex values
- `.env.example` documents both vars with empty placeholder values
- `tests/mailingList.test.ts` fails with "Cannot find module" for `../app/api/mailing-list/route` (correct RED state)
- `tests/unsubscribeToken.test.ts` fails with "Cannot find module" for `../lib/unsubscribeToken` (correct RED state)
- `tests/broadcast.test.ts` fails with "Cannot find module" for `../app/api/admin/broadcast/route` (correct RED state)
- All 42 existing tests remain green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Created .env.example from scratch**
- **Found during:** Task 1
- **Issue:** `.env.example` did not exist in the repository at current HEAD (beb3753). The plan's `files_modified` listed `.env.example` as a file to modify, but no such file existed in the worktree or git history at HEAD.
- **Fix:** Created `.env.example` from scratch with all known env vars from `.env.local` (using empty placeholder values) plus the new Phase 5 vars.
- **Files modified:** `.env.example`
- **Commit:** 7b7f1e9

**2. [Rule 3 - Blocking] npm install run in worktree directory, not main project**
- **Found during:** Task 1
- **Issue:** Initial `npm install` ran in the main project directory (`/Users/matt/Development/BigMattsBbq`) rather than the worktree (`/Users/matt/Development/BigMattsBbq/.claude/worktrees/agent-a98fea88`). Since each is a separate working tree, the package changes only applied to the main project.
- **Fix:** Re-ran `npm install resend@^6.12.0 jose@^6.2.2` inside the worktree directory so package.json and package-lock.json changes are committed on the worktree branch.
- **Files modified:** package.json, package-lock.json (in worktree)
- **Commit:** 7b7f1e9

## Known Stubs

None — this plan is pure infrastructure (packages + env vars + test scaffolds). No UI components or data flows.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model documents.

## Self-Check: PASSED

- `tests/mailingList.test.ts` exists: FOUND
- `tests/unsubscribeToken.test.ts` exists: FOUND
- `tests/broadcast.test.ts` exists: FOUND
- `.env.example` exists: FOUND
- Commit 7b7f1e9 exists: FOUND
- Commit 212ec8b exists: FOUND
