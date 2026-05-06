---
title: Tailwind Color Tokens — Issue 14
slug: tailwind-color-tokens
date: 2026-05-06
status: complete
---

# Summary

Added `gold` and `pit` design token palettes to `tailwind.config.ts` and replaced all warm-palette magic hex strings across 12 source files.

## What changed

- `tailwind.config.ts`: added `gold` (300/400/600) and `pit` (card/surface/btn/img) palettes; adjusted `smoke-400` from `#3a2b23` → `#3a2a20` to match actual usage
- 12 app/component files: 60+ inline hex values replaced with token classes
- NavBar cool-gray hex values (#17181c, #1b1c22, #2b2b2f, #2f3036) intentionally left as-is per plan
- `public/code_review.md` Issue 14 marked DONE

## Commit

726de36 — refactor: tokenize magic hex colors into Tailwind design tokens
