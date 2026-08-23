---
phase: 05-content-mailing-list
plan: "02"
subsystem: nav-layout
tags: [nav, layout, accessibility, mobile, hamburger, drawer]
status: checkpoint-pending

dependency_graph:
  requires: [05-01]
  provides: [site-wide-nav, layout-lift]
  affects: [OrderLanding, layout, NavBar, Footer]

tech_stack:
  added: []
  patterns:
    - usePathname for active-link detection with hash-stripping
    - useEffect body scroll lock with cleanup
    - Escape keydown handler with isOpen guard

key_files:
  created: []
  modified:
    - components/NavBar.tsx
    - app/layout.tsx
    - components/OrderLanding.tsx

decisions:
  - No icon library — inline SVGs for hamburger/close per UI-SPEC constraint
  - Server Component layout.tsx imports client component NavBar — Next.js handles boundary automatically
  - Hash stripped before pathname comparison to prevent Frozen Drops link from always appearing inactive

metrics:
  duration_minutes: ~15
  completed_date: "2026-04-19"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 3
---

# Phase 5 Plan 02: NavBar Lift & Mobile Drawer Summary

Site-wide NavBar refactored with 5 links, mobile hamburger drawer, active-route highlighting, and lifted into app/layout.tsx so every route renders it exactly once.

## Status

**CHECKPOINT PENDING — Task 3 (human-verify) not yet approved.**

Tasks 1 and 2 are committed and build-verified. Task 3 requires human visual verification of the nav on desktop and mobile.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Refactor NavBar with 5 links, drawer, active highlighting | 476abca | components/NavBar.tsx |
| 2 | Lift NavBar + Footer to layout.tsx, remove from OrderLanding | 5d18cc4 | app/layout.tsx, components/OrderLanding.tsx |

## What Was Built

### Task 1 — NavBar.tsx rewrite

- 5 nav links at module scope: Home `/`, Frozen Drops `/#order`, Catering `/catering`, About `/about`, Contact `/contact`
- Desktop (≥md): logo left, centered nav links, `Order Now` + `Cart` right
- Mobile (<md): logo left, hamburger + Cart right; no centered links, no Order Now button
- Mobile drawer: `aside#mobile-nav-drawer` slides from left with same 5 links
- Drawer closes on: link tap (`onClick={() => setIsOpen(false)}`), overlay click, Escape keypress
- Active link: `text-[#f0c16a]` gold; inactive: `text-smoke-800`; hash stripped via `href.split("#")[0]` before pathname compare
- Body scroll locked while drawer open (`document.body.style.overflow`), restored in useEffect cleanup
- Hamburger button: 44×44px minimum touch target (`min-h-[44px] min-w-[44px]`), inline SVG ≡/✕
- Cart badge (red circle, item count) always visible on mobile and desktop
- Named export only — no default export

### Task 2 — Layout lift

- `app/layout.tsx` (Server Component): added `import { NavBar }` and `import { Footer }`, wrapped children as `<NavBar />{children}<Footer />` inside Providers
- `components/OrderLanding.tsx`: removed all NavBar imports, Footer imports, `<NavBar />` renders, `<Footer />` renders
- Both `<main className="bg-ember-radial bg-grain">` wrappers preserved in OrderLanding
- Build confirmed: "Compiled successfully", Route (app) table present

## Verification

- `npm run build` exits 0, "Compiled successfully" with Route (app) table
- All acceptance criteria grep checks passed
- TypeScript errors present are pre-existing RED test stubs from Plan 01 (broadcast/mailingList/unsubscribeToken routes not yet implemented — expected)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None introduced in this plan. `/orders` page stub pre-existed and is unchanged.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Nav is client-side DOM manipulation only. Body scroll lock cleanup confirmed (T-5-02-01 mitigated). Hash-stripping before pathname compare confirmed (T-5-02-02 mitigated).

## Self-Check: PASSED

- [x] components/NavBar.tsx exists with all required acceptance criteria strings
- [x] app/layout.tsx contains NavBar and Footer imports and JSX
- [x] components/OrderLanding.tsx has zero occurrences of NavBar or Footer
- [x] Commits 476abca and 5d18cc4 exist in git log
- [x] `npm run build` produced "Compiled successfully"
