---
id: 260502-ui3
slug: fix-blank-whitespace-at-page-bottom
description: "Fix Issue 3 — excessive blank whitespace at bottom of every page"
status: in_progress
created: "2026-05-02"
---

# Fix Issue 3 — Excessive Blank Whitespace at Page Bottom

## Root Cause
`app/layout.tsx:41` — `<main className="flex-1">` causes `main` to fill all remaining viewport height inside the `flex min-h-screen flex-col` body. On short pages the dark background fills the void.

## Tasks

- [ ] Remove `flex-1` from `<main>` in `app/layout.tsx`
- [ ] Add `pb-24` to outer section in `app/contact/page.tsx`
- [ ] Add `pb-20` to outer section in `app/about/page.tsx`
- [ ] Add `pb-32` to no-drop state hero-content div in `components/OrderLanding.tsx`
- [ ] Mark Issue 3 as DONE in `public/UI_review.md`

## Files
- `app/layout.tsx` — remove `flex-1` from `<main>`
- `app/contact/page.tsx` — add `pb-24`
- `app/about/page.tsx` — add `pb-20`
- `components/OrderLanding.tsx` — add `pb-32` to no-drop hero div
- `public/UI_review.md` — mark Issue 3 DONE
