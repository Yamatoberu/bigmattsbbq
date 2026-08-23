---
phase: 09-foundation-subdomain-routing
plan: 06
subsystem: frontend
tags: [nextjs, server-components, supabase, design-system, sca-tracker]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing (plan 02)
    provides: "proxy.ts host-based rewrite into app/sca and x-sca-area chrome suppression in app/layout.tsx"
  - phase: 09-foundation-subdomain-routing (plan 03)
    provides: "getScaSupabaseClient() and lib/database-sca.types.ts (sca schema types)"
provides:
  - "components/sca/ScaNavBar.tsx — tracker-specific sticky header, Dashboard-only nav"
  - "components/sca/ScaFooter.tsx — tracker footer linking back to bigmattsbbq.com"
  - "app/sca/layout.tsx — SCA shell nesting inside the root layout"
  - "app/sca/page.tsx — first real /sca page proving proxy + schema client + types end to end"
affects: ["10-core-browsing", "11-analytics-and-ai-reviews"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SCA shell components live under components/sca/ as siblings to the storefront's NavBar/Footer, never importing storefront-only hooks (useCart, useActiveDrop)"
    - "app/sca/layout.tsx supplies its own header/footer since app/layout.tsx (plan 09-02) suppresses NavBar/Footer for x-sca-area requests"
    - "Server Component data reads for the sca schema use head:true count queries to avoid transferring row data through a service-role client"

key-files:
  created:
    - components/sca/ScaNavBar.tsx
    - components/sca/ScaFooter.tsx
    - app/sca/layout.tsx
    - app/sca/page.tsx
  modified: []

key-decisions:
  - "ScaNavBar ships with a single module-scope scaNavLinks array (Dashboard -> /sca only) per D-10, so Phase 10/11 add entries rather than restructure the component"
  - "Active-link state treats both / and /sca as the Dashboard-active pathname, since the production host rewrite leaves the browser URL bar showing / while the actual route rendered is /sca"
  - "No mobile drawer/hamburger ported from NavBar.tsx — a single nav link fits every viewport, so that complexity was intentionally omitted rather than copied and left dead"
  - "app/sca/page.tsx wraps the Supabase count query in try/catch and renders the raw error.message inline rather than throwing, per the plan's T-09-62 mitigation — a Server Component throw would produce an opaque 500 and hide any future PGRST106-style schema-exposure regression"

patterns-established:
  - "Every hex color and utility class in the new SCA components already exists verbatim in components/NavBar.tsx, components/Footer.tsx, app/globals.css, or tailwind.config.ts — zero new visual primitives per D-09"

requirements-completed: [INFRA-04, INFRA-01]

# Metrics
duration: 8min
completed: 2026-08-23
---

# Phase 09 Plan 06: On-Brand SCA Shell + Live Index Page Summary

**`/sca` now renders inside its own tracker-specific header/footer built entirely from existing ember/smoke design tokens, and the index page performs a real head-only count query against the `sca.competition` table via `getScaSupabaseClient()` — proving the proxy rewrite, chrome suppression, service-role client, and generated types all work together end to end.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-23T20:43:00Z (approx)
- **Completed:** 2026-08-23T20:51:30Z
- **Tasks:** 3 completed (all auto)
- **Files modified:** 4 created (components/sca/ScaNavBar.tsx, components/sca/ScaFooter.tsx, app/sca/layout.tsx, app/sca/page.tsx)

## Accomplishments

- `ScaNavBar` — sticky header mirroring `NavBar.tsx`'s exact container/logo/link classes, small `56px` logo linking to `https://bigmattsbbq.com`, "SCA Tracker" wordmark in the display font, single Dashboard nav link (`aria-label="SCA Tracker"`), zero storefront hooks or links imported
- `ScaFooter` — plain Server Component mirroring `Footer.tsx`'s border/padding/text scale, links back to the marketing site instead of showing `CONTACT_EMAIL`
- `app/sca/layout.tsx` — real path-segment nested layout (not a route group, per D-01), supplies its own `metadata.title`, wraps children in `ScaNavBar`/`ScaFooter` inside a `flex min-h-screen flex-col` wrapper; does not re-declare `<html>`/`<body>`/fonts/`globals.css`
- `app/sca/page.tsx` — async Server Component, `dynamic = "force-dynamic"`, calls `getScaSupabaseClient().from("competition").select("*", { count: "exact", head: true })`; renders the live count in a `.glass-card`, a sparse "no competitions yet" state at zero, and a plain-text (non-linking) note that Dashboard/Competitions/Analytics/AI Reviews arrive later
- Verified live end-to-end: `curl /sca` and `curl -H 'Host: sca.bigmattsbbq.com' /` both render "SCA Tracker" with no "Catering", the storefront `/` still renders "Catering" with no "SCA Tracker", and the page shows a real count of `13` competitions pulled from the live `sca` schema
- `grep -rl SUPABASE_SERVICE_ROLE_KEY .next/static` returns 0 after build — service-role key never reaches the client bundle

## Task Commits

Each task was committed atomically:

1. **Task 1: ScaNavBar and ScaFooter** — `37553e3` (feat)
2. **Task 2: SCA route shell layout** — `0cb0b8a` (feat)
3. **Task 3: SCA index page with a live sca-schema read** — `b106157` (feat)

**Plan metadata:** commit to follow this summary (docs: complete plan)

## Files Created/Modified

- `components/sca/ScaNavBar.tsx` - Tracker-specific sticky header; `"use client"`, `usePathname()` active-link state, single `scaNavLinks` module-scope array
- `components/sca/ScaFooter.tsx` - Tracker footer; plain Server Component, links to `https://bigmattsbbq.com`
- `app/sca/layout.tsx` - Nested layout under `app/sca/`, own `metadata.title`, wraps children in the tracker chrome
- `app/sca/page.tsx` - Async Server Component; live `sca.competition` count query, error state, sparse-zero state

## Decisions Made

See `key-decisions` in frontmatter. No architectural deviation from the plan's locked D-08/D-09/D-10 requirements.

## Deviations from Plan

None — plan executed exactly as written. All acceptance-criteria grep counts matched the plan's literal expectations exactly (unlike 09-03's two informational mismatches, this plan's checks all returned the exact expected values).

## Issues Encountered

None. `npx tsc --noEmit`, `npm run build`, and `npm run test` (118 tests, 18 files) all passed clean on first attempt.

## User Setup Required

None — no external service configuration required. This plan reuses the existing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars already validated by plan 09-03's `getScaSupabaseClient()`.

## Next Phase Readiness

- `app/sca/layout.tsx` is now the stable shell every future Phase 10/11 route under `app/sca/*` will nest inside automatically
- `ScaNavBar`'s `scaNavLinks` array is ready for Phase 10 to append Competitions/Cook Detail entries and Phase 11 to append Analytics/AI Reviews entries, without restructuring the component
- Phase 9 is now feature-complete pending only the final metadata/state commit for this plan — all 6 plans (09-01 through 09-06) delivered: schema exposure preflight, host routing, sca-scoped client + types, deployment checklist, score-metrics utility, and this on-brand shell with a live read

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

All four created source files verified on disk (`components/sca/ScaNavBar.tsx`, `components/sca/ScaFooter.tsx`, `app/sca/layout.tsx`, `app/sca/page.tsx`) and all three task commit hashes (37553e3, 0cb0b8a, b106157) verified present in git log.
