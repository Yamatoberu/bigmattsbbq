---
phase: quick
plan: 260501-sc1
subsystem: hero-section
tags: [ui, hero, mailing-list, no-drop, active-drop]
dependency_graph:
  requires: []
  provides: [redesigned-hero-section]
  affects: [components/OrderLanding.tsx, app/globals.css]
tech_stack:
  added: []
  patterns: [inline-form-in-hero, badge-driven-drop-info]
key_files:
  created: []
  modified:
    - app/globals.css
    - components/OrderLanding.tsx
decisions:
  - Removed MailingListSection from active-drop path entirely; no separate mailing list section in active-drop view
  - Mailing list state/handler colocated in OrderLanding.tsx rather than extracted to hook
metrics:
  duration: "~3 minutes"
  completed: "2026-05-02"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick Plan 260501-sc1: Hero Section Redesign Summary

**One-liner:** Reduced hero padding ~50%, moved mailing list signup inline in no-drop hero, replaced generic marketing copy with live drop badges and pickup options in active-drop hero.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Reduce hero-content padding in globals.css | 8f3ecbe | app/globals.css |
| 2 | Rewrite both hero paths in OrderLanding.tsx | a25a39a | components/OrderLanding.tsx |

## What Was Built

### Task 1 — globals.css padding reduction
The `.hero-content` rule changed from `py-12 md:py-16` to `py-5 md:py-8`, reducing vertical padding by ~58% on mobile and ~50% on desktop.

### Task 2 — OrderLanding.tsx hero redesign

**No-drop path:**
- Replaced the marketing heading + tagline + separate `<MailingListSection />` below the hero with a compact inline email signup form inside the hero panel itself
- Added a "Next Drop" badge above the headline
- Form POSTs to `/api/mailing-list` with success/error state management
- Success state shows confirmation copy; error state shows inline alert

**Active-drop path:**
- Removed "Pit-Smoked Barbecue. Ready in 30 Minutes." heading and bullet list
- Replaced with drop title badge + order cutoff badge at top
- Pickup options list (`drop.pickupOptions.map`) renders date/location pairs immediately below badges
- CTA buttons (Shop This Drop, Review Cart) preserved with same behavior

**Cleanup:** `MailingListSection` import removed; component no longer used anywhere in OrderLanding.tsx.

## Verification

Build passed with exit 0 and no TypeScript errors:
```
✓ Generating static pages (15/15)
```

Import spot-check confirmed:
- `useState` and `FormEvent` present in imports
- `MailingListSection` absent from file
- `pickupOptions` present (active-drop path)
- `handleMailingListSubmit` present (no-drop form handler)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- app/globals.css modified: FOUND
- components/OrderLanding.tsx modified: FOUND
- Commit 8f3ecbe: FOUND
- Commit a25a39a: FOUND
