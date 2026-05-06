---
plan: 05-06
phase: 05-content-mailing-list
status: complete
started: 2026-04-19
completed: 2026-04-19
key-files:
  created:
    - app/catering/page.tsx
    - app/about/page.tsx
    - app/contact/page.tsx
  modified:
    - components/CateringSection.tsx
    - components/OrderLanding.tsx
    - app/layout.tsx
---

## Summary

Created three static content pages (PAGE-01, PAGE-02, PAGE-03) and extended `CateringSection` with tier included-items details and a conditional home-page teaser link.

## What Was Built

- **components/CateringSection.tsx** — Extended with `TIERS` array (Basic/Plus/Ultra each with full included-items bullet list), `showFullMenuLink` prop for home-page teaser link, and catering mailto updated to `catering@bigmattsbbq.com`
- **components/OrderLanding.tsx** — Passes `showFullMenuLink` to CateringSection; NavBar/Footer removed (now in RootLayout)
- **app/catering/page.tsx** — `/catering` route with CateringSection (no teaser link), booking advance block ("How far in advance?"), service area block ("Where we cater"), bottom mailto CTA
- **app/about/page.tsx** — `/about` route with 3-paragraph draft copy and "Draft copy — Matt will revise before launch." disclaimer
- **app/contact/page.tsx** — `/contact` route with General Inquiries, Catering, and Service Area entries in glass-card; no form element per D-22
- **app/layout.tsx** — NavBar and Footer restored to RootLayout (had been reverted by worktree restore; also added Viewport export)

## Requirements Satisfied

- PAGE-01: /catering renders with expanded CateringSection, booking details, service area, mailto CTA
- PAGE-02: /about renders with 3-paragraph draft copy and disclaimer
- PAGE-03: /contact renders with general + catering emails and service area; no form
- D-19: /catering uses same tiers + dedicated catering email
- D-20: Home CateringSection has "See full catering menu →" teaser link
- D-21: About copy drafted by Claude, flagged for Matt's review
- D-22: Contact has email CTAs only, no form

## Human Verification

Task 4 checkpoint: Matt approved pages at http://localhost:3000. Nav links working on all pages, tier cards correct, emails correct.

## Deviations

- Worktree restore-from-base commit reverted `app/layout.tsx`, `components/NavBar.tsx`, and `components/OrderLanding.tsx` to pre-05-02 state. Resolved post-merge: NavBar conflict resolved keeping full 5-link nav + improvements; NavBar/Footer re-added to RootLayout; duplicates removed from OrderLanding.
