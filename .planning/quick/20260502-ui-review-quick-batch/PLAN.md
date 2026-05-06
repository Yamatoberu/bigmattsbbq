---
slug: ui-review-quick-batch
title: UI Review Quick Batch — Issues 2, 5, 6, 7, 11
created: 2026-05-02
---

Fix the five mechanical UI review issues from public/UI_review.md.

## Tasks

1. **Issue 2** — `components/OrderLanding.tsx`: Change both `<main>` wrappers to `<div>` (layout already provides the single `<main>`)
2. **Issue 5** — `components/FrozenItemCard.tsx`: Parse dash-formatted descriptions into `<ul><li>` lists
3. **Issue 6** — `components/OrderLanding.tsx`: Wrap pickup location badges in `<ul aria-label="Pickup locations">` with `<li>` items
4. **Issue 7** — `components/FrozenItemCard.tsx`: Suppress "Regular" variation label; separate stock count into its own accessible element
5. **Issue 11** — `components/Testimonials.tsx`: Change layout `<div>` attribution row to `<p>`; `components/OrderLanding.tsx` estimated-total `<div>` to `<p>`

## Files

- `components/OrderLanding.tsx`
- `components/FrozenItemCard.tsx`
- `components/Testimonials.tsx`
