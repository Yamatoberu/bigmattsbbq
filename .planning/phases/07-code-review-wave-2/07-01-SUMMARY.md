---
phase: 07-code-review-wave-2
plan: "01"
subsystem: layout
tags: [html-semantics, layout, regression-fix]
dependency_graph:
  requires: []
  provides: [valid-html5-main-landmark]
  affects: [app/layout.tsx]
tech_stack:
  added: []
  patterns: [html5-landmark-semantics]
key_files:
  created: []
  modified:
    - app/layout.tsx
decisions:
  - "Option A chosen: layout drops to <div id=page-content>, pages keep their own <main> — matches code_review.md Issue 3 recommendation"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-07"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 07 Plan 01: Nested `<main>` Regression Fix Summary

## One-liner

Replaced `<main>` wrapper in `app/layout.tsx` with `<div id="page-content">`, restoring valid HTML5 landmark semantics (one `<main>` per document route).

## What Was Built

Fixed Issue 3 from `public/code_review.md` — the nested `<main>` regression. `app/layout.tsx` was wrapping `{children}` in `<main>`, while three pages (checkout, confirmation, orders) also rendered their own root `<main>`. HTML5 allows only one `<main>` per document.

Applied Option A from the code review: the layout wrapper drops to `<div id="page-content">`, and the per-page `<main>` elements become the sole document landmark for each route.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Replace `<main>` wrapper in layout.tsx with `<div id="page-content">` | a7f745c | Done |
| 2 | Verify three page files retain `<main>` as root (no edits — assertion-only) | N/A (no file changes) | Done |

## Verification Results

Task 1 static checks:
- `grep -c '<div id="page-content">{children}</div>' app/layout.tsx` → `1` (correct)
- `grep -c '<main>{children}</main>' app/layout.tsx` → `0` (old wrapper removed)
- `grep -c '<main' app/layout.tsx` → `0` (no `<main>` anywhere in layout)
- All imports (Providers, NavBar, Footer) intact
- `npm run build` exits 0

Task 2 assertion checks:
- `app/checkout/page.tsx`: exactly 1 `<main>`, className `bg-ember-radial bg-grain`, zero `page-content`
- `app/confirmation/page.tsx`: exactly 1 `<main>`, className `section-spacing bg-ember-radial bg-grain`, zero `page-content`
- `app/orders/page.tsx`: exactly 1 `<main>`, className `section-spacing bg-ember-radial bg-grain`, zero `page-content`
- `git diff` on the three page files is empty (no edits made)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Pure markup change — no new network endpoints, auth paths, or data exposure surfaces introduced.

## Self-Check: PASSED

- `app/layout.tsx` modified with correct `<div id="page-content">` wrapper
- Commit `a7f745c` exists in git log
- Build exits 0
- Three page files unmodified and verified correct
