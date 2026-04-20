---
phase: 05-content-mailing-list
plan: 03
subsystem: mailing-list
tags: [mailing-list, api, forms, supabase, footer]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [POST /api/mailing-list, MailingListSection, Footer (client)]
  affects: [components/OrderLanding.tsx, components/Footer.tsx]
tech_stack:
  added: []
  patterns: [useState form state machine, silent duplicate email (D-08), client component refactor]
key_files:
  created:
    - app/api/mailing-list/route.ts
    - components/MailingListSection.tsx
    - tests/mailingList.test.ts
  modified:
    - components/Footer.tsx
    - components/OrderLanding.tsx
decisions:
  - Used request.headers.get() instead of next/headers to keep route testable without Next.js request context
  - Footer refactored to client component to support useState form state machine
  - Duplicate email returns 200 silently per D-08 (no enumeration vector)
metrics:
  duration_minutes: 12
  completed_date: "2026-04-19"
  tasks_completed: 3
  files_changed: 5
requirements_satisfied: [MAIL-02, MAIL-03]
---

# Phase 5 Plan 3: Mailing List API, Home Section, and Footer Signup Summary

**One-liner:** POST /api/mailing-list with silent-duplicate D-08 behavior, home-page MailingListSection, and Footer refactored to a client component with inline Join List form.

## What Was Built

### Task 1: POST /api/mailing-list route (commit bf8a532)

Created `app/api/mailing-list/route.ts` — a Node.js API route that:
- Validates email with `z.string().trim().toLowerCase().email()` (normalizes whitespace + casing)
- Returns `200 { ok: true }` for both new inserts and duplicate emails (Supabase error code 23505) per D-08 enumeration prevention
- Returns `400 { error: "Invalid email.", requestId }` on invalid input
- Returns `500 { error: "Signup failed. Please try again.", requestId }` on unexpected Supabase errors — never leaks `error.message`, `error.details`, or `error.hint`
- All 4 tests in `tests/mailingList.test.ts` pass (RED → GREEN)

### Task 2: MailingListSection component (commit 505346a)

Created `components/MailingListSection.tsx` — full-width home page section with:
- "Drop Notifications" badge, "Be first to know about the next drop." headline
- Email input + "Notify Me" button with `idle → submitting → success/error` state machine
- Success replaces form with "You're on the list! We'll let you know about the next drop."
- Error shows "Something went wrong. Try again in a moment." below form
- Uses only approved typography (text-4xl, text-sm) and approved color classes
- Wired into `components/OrderLanding.tsx` between FAQ and Catering sections (active-drop branch only)

### Task 3: Footer client component refactor (commit 75abc1a)

Rewrote `components/Footer.tsx` to a `"use client"` component with:
- Inline email input + "Join List" button (sm:w-64 per spec, tighter than home section)
- Same state machine pattern as MailingListSection
- Success: "You're on the list!" (shorter copy per spec)
- Error: "Something went wrong. Try again." (shorter, no "in a moment")
- Preserved border-t, copyright text, and contact email verbatim

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced `next/headers` with `request.headers.get()` in route**
- **Found during:** Task 1 test run
- **Issue:** `headers()` from `next/headers` throws "was called outside a request scope" when imported directly in Vitest (no Next.js request context). All 4 tests failed.
- **Fix:** Replaced `const headerList = await headers(); headerList.get("x-request-id")` with `request.headers.get("x-request-id")` — functionally identical in production, testable without Next.js context.
- **Files modified:** `app/api/mailing-list/route.ts`
- **Commit:** bf8a532

**2. [Rule 3 - Blocking] Copied mailingList.test.ts from main repo to worktree**
- **Found during:** Task 1 test run
- **Issue:** The worktree was based on commit 08cee33 which predates Plan 01's test scaffold — `tests/mailingList.test.ts` did not exist in the worktree.
- **Fix:** Copied test file from main repo (where Plan 01 had already created it) into the worktree's `tests/` directory.
- **Files modified:** `tests/mailingList.test.ts`
- **Commit:** bf8a532

## Known Stubs

None. All form state machines wire to `/api/mailing-list` and display live success/error states.

## Threat Flags

No new threat surface beyond what was analyzed in the plan's threat model. The `/api/mailing-list` endpoint is covered by T-5-03-01 through T-5-03-05.

## Self-Check: PASSED

Files confirmed to exist:
- `app/api/mailing-list/route.ts` — FOUND
- `components/MailingListSection.tsx` — FOUND
- `components/Footer.tsx` — FOUND (refactored)
- `components/OrderLanding.tsx` — FOUND (updated)
- `tests/mailingList.test.ts` — FOUND

Commits confirmed:
- bf8a532 — FOUND (feat(05-03): create POST /api/mailing-list route)
- 505346a — FOUND (feat(05-03): create MailingListSection and wire into OrderLanding)
- 75abc1a — FOUND (feat(05-03): refactor Footer to client component with inline mailing list signup)

Tests: 42/42 passing. Build: exits 0 with Route table.
