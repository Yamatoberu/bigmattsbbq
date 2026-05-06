---
id: 260502-ui3
slug: fix-blank-whitespace-at-page-bottom
description: "Fix Issue 3 — excessive blank whitespace at bottom of every page"
status: complete
completed: "2026-05-02"
---

# Summary

Removed `flex-1` from `<main>` in `app/layout.tsx` — the sticky-footer mechanism that caused `main` to expand and create a large dark void on short pages. Added intentional bottom padding to the three short pages most affected: Contact (`pb-24`), About (`pb-20`), and the no-drop Home state (`pb-32` on the hero-content div).

## Changes
- `app/layout.tsx` — removed `flex-1` from `<main>`
- `app/contact/page.tsx` — added `pb-24` to outer section
- `app/about/page.tsx` — added `pb-20` to outer section
- `components/OrderLanding.tsx` — added `pb-32` to no-drop hero-content div
- `public/UI_review.md` — marked Issue 3 DONE
