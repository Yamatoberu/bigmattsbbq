---
phase: quick-260828-fhk
plan: 01
subsystem: testing
tags: [playwright, e2e, vitest, checkout, storefront]

# Dependency graph
requires: []
provides:
  - Playwright E2E test harness (playwright.config.ts, npm test:e2e / test:e2e:ui)
  - Deterministic FrozenItemDTO / DropDTO fixtures and network-stub helpers under e2e/
  - Browser-level coverage of browse -> add-to-cart -> sold-out capture
  - Browser-level coverage of sauce-bump prompt -> checkout submit -> confirmation redirect
affects: [storefront, checkout, ci]

# Tech tracking
tech-stack:
  added: ["@playwright/test ^1.62.1 (devDependency, chromium browser only)"]
  patterns:
    - "Network-layer stubbing via page.route() for /api/frozen-items, /api/drop, /api/checkout keeps specs deterministic and avoids mutating live Square/Supabase state"
    - "Server-side-only data (checkout page's direct Supabase fetchActiveDrop() call) is gated with a beforeEach hasActiveDrop() check that calls test.skip() with a documented reason, rather than faked"
    - "Card-scoped locators use getByRole('article').filter({ has: getByRole('heading', { name, exact: true }) }) to avoid substring collisions with package/bundle card text"

key-files:
  created:
    - playwright.config.ts
    - e2e/fixtures/frozenItems.ts
    - e2e/fixtures/activeDrop.ts
    - e2e/support/stubs.ts
    - e2e/browseFrozenItems.spec.ts
    - e2e/checkoutFlow.spec.ts
  modified:
    - package.json
    - package-lock.json
    - .gitignore

key-decisions:
  - "Covered availability (price + Add to Cart) instead of numeric stock counts on the landing page, since no component renders VariationDTO.remaining (constraint correction in plan)"
  - "Forced sold-out state by stubbing GET /api/drop's soldOut flags instead of using /api/dev/set-inventory, since storefront sold-out logic reads drop.soldOut, not Square inventory (constraint correction in plan)"
  - "Checkout specs gate on a real active Supabase drop via hasActiveDrop() and skip cleanly (not fail) when absent, because app/checkout/page.tsx resolves the drop through a direct server-side Supabase call that page.route cannot intercept"

patterns-established:
  - "e2e/support/stubs.ts is the single source of network-stub helpers (stubFrozenItems, stubActiveDrop, stubCheckout, seedCart, hasActiveDrop) for all future Playwright specs"
  - "e2e/fixtures/*.ts holds deterministic DTOs; withSoldOut() shows the pattern for pure fixture variants"

requirements-completed: [E2E-01, E2E-02, E2E-03, E2E-04, E2E-05]

# Metrics
duration: 6min
completed: 2026-08-28
---

# Quick Task 260828-fhk: Scaffold Playwright for E2E Testing Summary

**Playwright E2E harness added alongside Vitest, covering browse/add-to-cart/sold-out and sauce-bump/checkout/confirmation via network-level stubs — zero production code touched.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-28T17:14:58Z
- **Completed:** 2026-08-28T17:20:06Z
- **Tasks:** 3
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments
- `@playwright/test` installed (verified against `github.com/microsoft/playwright` before install) with chromium-only browser download; `playwright.config.ts` wires `npm run dev` as the webServer with a 60s test timeout and 120s server boot timeout
- Deterministic fixtures (`e2e/fixtures/frozenItems.ts`, `e2e/fixtures/activeDrop.ts`) and four stub helpers (`stubFrozenItems`, `stubActiveDrop`, `stubCheckout`, `seedCart`) plus a live-drop gate (`hasActiveDrop`) in `e2e/support/stubs.ts`
- `e2e/browseFrozenItems.spec.ts`: proves the landing page renders in-stock items with prices and a working Add to Cart button that persists to `localStorage`, and that a sold-out item swaps to the `Notify Me` capture while sibling items stay orderable
- `e2e/checkoutFlow.spec.ts`: proves the sauce-bump prompt appears/dismisses correctly and that a full checkout submit posts a Zod-shaped body and redirects to `/confirmation` with the returned `orderId`/`pickupNote`, clearing the cart — skips cleanly (not fails) when no live Supabase drop exists
- `npm run test:e2e` runs all 4 specs green; `npm test` (Vitest, 25 files / 247 tests) is unaffected; `npx tsc --noEmit` reports zero errors under `e2e/` or `playwright.config.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright and scaffold config + scripts** - `3fd414b` (chore)
2. **Task 2: Add deterministic fixtures, stub helpers, and the browse + sold-out spec** - `61ff101` (feat)
3. **Task 3: Add the checkout flow spec covering sauce bump and confirmation redirect** - `ed91ecc` (feat)

**Plan metadata:** committed separately by the orchestrator (docs commit not made by this executor per instructions)

## Files Created/Modified
- `playwright.config.ts` - `testDir: ./e2e`, chromium project, `npm run dev` webServer, `on-first-retry` tracing
- `e2e/fixtures/frozenItems.ts` - Six-item `FrozenItemDTO[]` fixture (3 individual + 3 bundle catalog items) and `variationIds` lookup
- `e2e/fixtures/activeDrop.ts` - Active `DropDTO` fixture plus pure `withSoldOut()` variant builder
- `e2e/support/stubs.ts` - `stubFrozenItems`, `stubActiveDrop`, `stubCheckout` (with captured-request-body handle), `seedCart`, `hasActiveDrop`
- `e2e/browseFrozenItems.spec.ts` - Browse + stock-limit/sold-out edge case coverage
- `e2e/checkoutFlow.spec.ts` - Sauce bump + checkout submit + confirmation coverage, gated on a live Supabase active drop
- `package.json` / `package-lock.json` - `@playwright/test` devDependency, `test:e2e` / `test:e2e:ui` scripts
- `.gitignore` - Playwright artifact directories (`/test-results`, `/playwright-report`, `/blob-report`, `/playwright/.cache`)

## Decisions Made
- Applied both plan-documented constraint corrections as written: availability-only coverage on the landing page (no stock-count UI), and sold-out state forced via `/api/drop` stub rather than `/api/dev/set-inventory`.
- Scoped card locators with `getByRole("article").filter({ has: getByRole("heading", { name, exact: true }) })` rather than `hasText` substring filters — an early run of the browse spec found `hasText: "Brisket"` matching bundle package cards whose description text mentions "Brisket" (e.g. "Family Night" bundle description), causing strict-mode violations. Exact-heading `has` filtering resolved this with no change to plan scope.

## Deviations from Plan

None beyond the locator-scoping fix documented above under Decisions Made (a within-task correction to satisfy the plan's own instruction to use role/label locators over CSS classes — not a scope change).

## Issues Encountered
- Initial `hasText: "Brisket"` / `hasText: "Pulled Pork"` locators in the browse spec matched multiple `<article>` elements (package bundle cards whose description text contains "Brisket"/"Pulled Pork"), causing Playwright strict-mode violations on the first `--reporter=list` run. Resolved by scoping to an exact-match heading via `.filter({ has: ... })` instead of a text substring filter. No production code involved; fixed before the Task 2 commit.

## User Setup Required

None - no external service configuration required. `.env.local` already had the required Square/Supabase credentials, and the checkout spec gates on a live active Supabase drop rather than requiring new setup.

## Next Phase Readiness
- `npm run test:e2e` is ready to run locally or in CI (CI env var toggles `forbidOnly`/`retries`/`reuseExistingServer`).
- Checkout coverage is currently conditional on a live active Supabase drop; if no drop is active at CI run time, both checkout tests report as skipped (not failed) with a clear reason — this is expected behavior per the plan, not a gap.
- No blockers for future E2E spec additions; `e2e/support/stubs.ts` and `e2e/fixtures/*.ts` are the established extension points.

---
*Quick task: 260828-fhk-scaffold-playwright-for-e2e-testing-and-*
*Completed: 2026-08-28*

## Self-Check: PASSED

All 7 created files verified present on disk; all 3 task commit hashes (3fd414b, 61ff101, ed91ecc) verified present in git log.
