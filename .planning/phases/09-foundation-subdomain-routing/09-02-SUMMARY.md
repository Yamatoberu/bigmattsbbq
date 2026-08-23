---
phase: 09-foundation-subdomain-routing
plan: 02
subsystem: infra
tags: [nextjs, proxy, routing, middleware, host-based-rewrite]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing
    provides: Supabase sca schema reachability preflight (09-01, in progress independently)
provides:
  - Pure, framework-free host+path routing decision function (`resolveScaRouting`)
  - Repo-root `proxy.ts` performing the Next.js 16 host-based rewrite into `app/sca`
  - Root layout chrome suppression driven by a non-spoofable `x-sca-area` request header
  - Documented `SCA_HOSTNAME` env var for future staging environments
affects: [10-core-browsing, "any future phase adding routes under app/sca"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js 16 uses proxy.ts (not middleware.ts) at the repo root; exported function must be named `proxy`"
    - "Trust-boundary header stripping: proxy.ts deletes any inbound x-sca-area before computing the real value, so client-supplied headers can never spoof server-side rendering decisions"
    - "Pure decision logic (resolveScaRouting) kept framework-free and unit-testable, separate from the Next.js-specific proxy.ts wrapper"

key-files:
  created:
    - lib/sca/routing.ts
    - proxy.ts
    - tests/sca-routing.test.ts
  modified:
    - app/layout.tsx
    - .env.example

key-decisions:
  - "Implemented resolveScaRouting exactly per plan's locked D-01..D-04 host-matching rules: sca.* prefix match, exact configured/env hostname match, direct /sca path access on any host, no double-prefix rewrite"
  - "Root layout became async to call next/headers' headers(); accepted the resulting opt-in to dynamic rendering for all routes since / and /checkout were already force-dynamic and NavBar client-fetches /api/drop on mount regardless"
  - "proxy.ts strips the inbound x-sca-area header before any routing decision runs (T-09-11), and mutates only url.pathname on rewrite, never host/protocol/origin (T-09-12)"

patterns-established:
  - "SCA_AREA_HEADER and DEFAULT_SCA_HOSTNAME constants live in lib/sca/routing.ts and are imported by both proxy.ts and app/layout.tsx — never re-typed as string literals"

requirements-completed: [INFRA-03]

# Metrics
duration: 3min
completed: 2026-08-23
---

# Phase 09 Plan 02: Host-Based Subdomain Routing Summary

**Next.js 16 `proxy.ts` rewrites `sca.bigmattsbbq.com` traffic into `app/sca` via a pure, unit-tested `resolveScaRouting` decision function, and the root layout suppresses storefront NavBar/Footer using a proxy-stamped, non-spoofable `x-sca-area` header.**

## Performance

- **Duration:** 3 min (task commits e270fcf → 6aafc0e)
- **Started:** 2026-08-23T20:22:30Z
- **Completed:** 2026-08-23T20:24:23Z
- **Tasks:** 3 completed (Task 1 executed as TDD RED/GREEN, 2 commits)
- **Files modified:** 5 (2 created source, 1 created test, 2 edited)

## Accomplishments
- `lib/sca/routing.ts` exports `resolveScaRouting`, `SCA_AREA_HEADER`, `DEFAULT_SCA_HOSTNAME` with full coverage of every host/path branch (case-insensitivity, port-stripping, `sca.*` prefix match, direct `/sca` access on any host, no double-prefix)
- `proxy.ts` created at the repo root (not `middleware.ts` — verified obsolete on Next.js 16.1.6), rewrites sca-host traffic into `/sca`, strips any client-supplied `x-sca-area` header before computing the real value
- `app/layout.tsx` now async, reads the `x-sca-area` header via `next/headers`, and renders NavBar/Footer only for non-SCA requests — fonts, Providers, and `#page-content` wrapper unchanged in both branches
- `SCA_HOSTNAME` documented in `.env.example` as optional, default `sca.bigmattsbbq.com`
- 20 new unit tests in `tests/sca-routing.test.ts`, all passing; full suite (104 tests, 16 files) green with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure host+path routing resolver with full branch coverage** — TDD RED `e270fcf` (test), GREEN `6c66562` (feat)
2. **Task 2: Create proxy.ts at the repo root** — `edaf9c5` (feat)
3. **Task 3: Suppress storefront chrome for SCA requests and document SCA_HOSTNAME** — `6aafc0e` (feat)

**Plan metadata:** commit to follow this summary (docs: complete plan)

## Files Created/Modified
- `lib/sca/routing.ts` - Pure `resolveScaRouting` host+path decision function; no framework imports
- `proxy.ts` - Next.js 16 repo-root proxy; strips inbound `x-sca-area`, rewrites sca-host traffic, matcher excludes `/api`
- `tests/sca-routing.test.ts` - 20 unit tests covering every host/path branch from the plan's behavior table
- `app/layout.tsx` - Async root layout; suppresses NavBar/Footer when `x-sca-area: 1` is present
- `.env.example` - Documents optional `SCA_HOSTNAME` var

## Decisions Made
See `key-decisions` in frontmatter — followed the plan's locked D-01 through D-04 rules exactly, no architectural deviation.

## Deviations from Plan

None - plan executed exactly as written. The plan's own accepted tradeoff (root layout dynamic rendering via `headers()`) was implemented and recorded as specified, not treated as a deviation.

## Issues Encountered
- Stale `.next/` build cache (last built 2026-05-19) referenced two removed routes (`app/unsubscribe`, `app/api/unsubscribe`) in `.next/types/validator.ts`, causing `tsc --noEmit` to fail with unrelated errors before any of this plan's code ran. Deleted `.next/` (gitignored, not a tracked deviation) and re-ran — `tsc --noEmit` passed cleanly afterward. Not caused by this plan's changes; out of scope per the deviation rules' scope boundary.

## User Setup Required

None - no external service configuration required. `SCA_HOSTNAME` is optional; production DNS cutover for `sca.bigmattsbbq.com` remains a manual Hostinger step tracked separately (per STATE.md decision log), unaffected by this plan.

## Next Phase Readiness
- `app/sca` tree can now be built in subsequent plans (09-06 and later) and will automatically receive rewritten traffic and chrome-free rendering with zero further routing changes
- Direct `/sca` visits work today on localhost/preview even though `app/sca/page.tsx` doesn't exist yet (confirmed via dev-server curl: 404 on the SCA host, 200 with `Catering` present on the main host) — proves the rewrite fires correctly ahead of content landing
- No blockers for plan 09-01 (independent files) or future waves in this phase

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

All created files exist on disk; all four task commit hashes (e270fcf, 6c66562, edaf9c5, 6aafc0e) verified present in git log.
