---
phase: quick-260912-isg
plan: 01
subsystem: infra
tags: [next, dependencies, eslint, npm-audit, security]

requires: []
provides:
  - "next 16.3.5 (fixes critical unauthenticated RCE advisory present in 16.1.6)"
  - "Eight other in-scope dependencies bumped to latest patch/minor"
  - "Working npm run lint backed by a flat eslint.config.mjs (eslint-config-next/core-web-vitals)"
  - "npm audit clean (0 vulnerabilities)"
affects: [ci, dev-workflow, security]

tech-stack:
  added: [eslint@9.39.5, eslint-config-next@16.3.5]
  patterns:
    - "Flat ESLint config (eslint.config.mjs) replacing the removed `next lint` subcommand — global-ignores entry first, then the spread eslint-config-next/core-web-vitals array export"
    - "Per-rule severity downgrade (error -> warn) in a trailing config object as the non-invasive way to make a newly-added lint gate pass without touching application source"

key-files:
  created:
    - eslint.config.mjs
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "npm install required --legacy-peer-deps to work around an npm 10.9.8 arborist bug (TypeError: Cannot read properties of null reading 'edgesOut') triggered by vitest 4.1.11's optional peer tree (@vitest/browser-playwright et al.). No actual peer conflict exists — confirmed by tsc/test/build all passing clean afterward. Environment's npm 10.9.8 predates CLAUDE.md's documented npm 11.12.1, which is the likely root cause."
  - "Downgraded react-hooks/set-state-in-effect and react-hooks/error-boundaries from error to warn in eslint.config.mjs's trailing config object. These two rules accounted for all 6 of 6 lint errors across 6 call sites in pre-existing application code (CountdownTimer.tsx, CartContext.tsx, useActiveDrop.ts, useAttributionSources.ts, useFrozenItems.ts, app/api/admin/broadcast/route.tsx) that this task must not touch. Downgrading makes `npm run lint` exit 0 (a usable CI gate) while keeping every finding visible as a warning for a follow-up triage task."
  - "next-env.d.ts drift from `npm run build` regenerating its .next/types reference was reverted rather than committed, matching the precedent set by quick task 260910-usw for the identical dev-vs-build path diff — it is a routine build artifact, not a change caused by the version bump (confirmed: tsc --noEmit passes clean with the pre-bump reference restored)."

requirements-completed: ["SEC-DEP-01", "DX-LINT-01"]

duration: 7min
completed: 2026-09-12
---

# Quick Task 260912-isg: Bump outdated dependencies + repair ESLint Summary

**`next` 16.1.6 → 16.3.5 closes a critical unauthenticated RCE advisory; eight other packages bumped to latest patch/minor; `npm audit` now reports 0 vulnerabilities; `npm run lint` is a working command again via a new flat `eslint.config.mjs` (eslint-config-next/core-web-vitals).**

## Performance

- **Duration:** 7 min
- **Tasks:** 2 of 2
- **Files modified:** 3 (`package.json`, `package-lock.json`, `eslint.config.mjs`)

## Accomplishments

- `next` upgraded 16.1.6 → 16.3.5, closing the critical unauthenticated RCE advisory that motivated this task.
- Eight other in-scope packages bumped to their target versions (see table below); `react`, `react-dom`, `tailwindcss`, `typescript`, `zod` verified unchanged on their current majors.
- `npm audit` went from 18 vulnerabilities (3 critical, 7 high, 6 moderate, 2 low) at baseline to **0 vulnerabilities**, entirely via non-forced `npm audit fix` — no manual advisory triage was needed.
- `npm run lint` restored: `eslint.config.mjs` created (global ignores + `eslint-config-next/core-web-vitals`), `scripts.lint` changed from the removed `next lint` to `eslint .`. Confirmed working — no "Invalid project directory" crash, real findings produced.
- All baseline quality gates hold: `tsc --noEmit` clean, 314/314 Vitest tests pass (no regression from baseline count), `npm run build` succeeds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump dependencies to latest patch/minor and clear the audit backlog** - `b8b3da2` (feat)
2. **Task 2: Add flat ESLint config and repair the lint script** - `fd30a8e` (feat)
3. **Cleanup: revert next-env.d.ts build-artifact drift** - `688b358` (chore) — not a plan task; see Deviations

**Plan metadata:** deferred to the orchestrator per this quick task's constraints (docs commit handled separately).

## Package Version Changes

| Package | Before | After | Kind |
|---------|--------|-------|------|
| next | 16.1.6 | 16.3.5 | dependency |
| @supabase/supabase-js | 2.101.1 | 2.116.0 | dependency |
| resend | 6.12.2 | 6.28.0 | dependency |
| @react-email/render | 2.0.8 | 2.1.0 | dependency |
| supabase (CLI) | 2.84.10 | 2.117.0 | devDependency |
| vitest | 4.0.18 | 4.1.11 | devDependency |
| @playwright/test | 1.62.1 | 1.63.0 | devDependency |
| autoprefixer | 10.4.20 | 10.6.0 | devDependency |
| postcss | 8.4.45 | 8.5.28 | devDependency |
| eslint | (none) | 9.39.5 | devDependency (new) |
| eslint-config-next | (none) | 16.3.5 | devDependency (new) |

`react`, `react-dom` (18.3.1), `tailwindcss` (3.4.19, root resolution), `typescript` (5.9.3, within existing `^5.5.4` range), `zod` (3.25.76, within existing `^3.24.2` range) all confirmed unchanged on their pre-existing majors via `npm ls`.

Transitive packages moved by `npm audit fix` (no `--force`): `esbuild`, `picomatch` (all occurrences, including nested under `tinyglobby`/`vite`), `postcss-selector-parser`, `vite`, `launch-editor`, `ws` — all resolved without crossing any major boundary of the five out-of-scope packages.

## npm audit — Final State

**0 vulnerabilities.** No residual advisories to document — `npm audit fix` (non-forced, run twice as it resolved iteratively) cleared the entire baseline backlog of 18 vulnerabilities (3 critical, 7 high, 6 moderate, 2 low).

## npm run lint — Finding Counts by Rule

After the `eslint.config.mjs` rule downgrade (see Decisions), `npm run lint` exits 0 with 7 warnings, 0 errors:

| Rule | Count | Severity | Files |
|------|-------|----------|-------|
| `react-hooks/set-state-in-effect` | 5 | warning (downgraded from error) | `CountdownTimer.tsx`, `cart/CartContext.tsx`, `hooks/useActiveDrop.ts`, `hooks/useAttributionSources.ts`, `hooks/useFrozenItems.ts` |
| `react-hooks/error-boundaries` | 1 | warning (downgraded from error) | `app/api/admin/broadcast/route.tsx` |
| `react-hooks/exhaustive-deps` | 1 | warning (default severity) | `hooks/useActiveDrop.ts` (missing `state.drop` dependency) |

This is the triage input for a follow-up task. None of these findings were fixed in this task — application source was not touched.

## Rule Downgrades in eslint.config.mjs

| Rule | From | To | Reason |
|------|------|-----|--------|
| `react-hooks/set-state-in-effect` | error | warn | 5 of 6 lint errors; calling `setState` synchronously inside `useEffect` across existing data-fetching hooks and cart hydration. Fixing requires refactoring effect bodies (e.g., moving initial state into `useState` initializers or lazy state), which is application-logic work out of this task's scope. |
| `react-hooks/error-boundaries` | error | warn | 1 of 6 lint errors; JSX constructed inside a `try/catch` in the broadcast admin route. Fixing requires wrapping in an error boundary or restructuring the render call, also out of scope. |

Both are new rules in `eslint-config-next@16.3.5`'s `core-web-vitals` preset (React Compiler / React 19-era hook-safety rules) that the repo has never been linted against before. Downgrading was the option this task's own instructions specified for this exact situation ("errors, small and mechanical count, leaving lint red is unusable").

## Package Reverted from Target Version

None. All nine target packages, plus the two new ESLint devDependencies, landed at their intended versions with zero exceptions.

## Files Created/Modified

- `package.json` — nine dependency/devDependency version bumps, two new devDependencies (`eslint`, `eslint-config-next`), `scripts.lint` changed from `"next lint"` to `"eslint ."`.
- `package-lock.json` — full lockfile resolution for all of the above plus `npm audit fix`'s transitive resolutions.
- `eslint.config.mjs` (new) — flat config: global-ignores entry (`.next/**`, `node_modules/**`, `test-results/**`, `playwright-report/**`, `coverage/**`, `mcp-servers/**`), spread of `eslint-config-next/core-web-vitals`, trailing rule-downgrade config object.

## Decisions Made

See `key-decisions` in frontmatter: `--legacy-peer-deps` workaround for an npm arborist bug; two-rule severity downgrade to keep `npm run lint` green; `next-env.d.ts` build drift reverted (not committed) per existing project precedent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worked around npm 10.9.8 arborist crash with `--legacy-peer-deps`**
- **Found during:** Task 1 (installing `vitest@4.1.11` as a standalone devDependency bump)
- **Issue:** `npm install --save-dev vitest@4.1.11` (and the batched install alongside `supabase`/`@playwright/test`/`autoprefixer`/`postcss`) failed with `TypeError: Cannot read properties of null (reading 'edgesOut')` inside `@npmcli/arborist`'s peer-set loader — reproducible, not resolved by `npm cache clean --force`. Isolated to `vitest@4.1.11`'s optional peer tree (`@vitest/browser-playwright`, `@vitest/browser-webdriverio`, etc.) triggering an npm 10.x arborist bug, not a real peer conflict.
- **Fix:** Re-ran the same installs with `--legacy-peer-deps`. This is not a package-manager-install-of-an-unverified-package situation (excluded from Rule 3) — it is a flag change to work around a tool bug installing the exact, already-verified target versions from `<target_versions>`.
- **Verification:** `npx tsc --noEmit`, `npm run test` (314/314), and `npm run build` all passed clean afterward with no peer-dependency-related runtime or type errors, confirming no real conflict was masked.
- **Committed in:** `b8b3da2` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Fixed `import/no-anonymous-default-export` warning in the new `eslint.config.mjs`**
- **Found during:** Task 2 (`npm run lint` first run against the just-created config)
- **Issue:** The initial `export default [...]` array literal triggered the config's own `import/no-anonymous-default-export` rule.
- **Fix:** Assigned the array to a `const config` before `export default config;`. This is the file the task itself creates, not application source, so it is in-scope.
- **Verification:** Warning gone on next `npm run lint` run.
- **Committed in:** `fd30a8e` (Task 2 commit)

**3. [Rule 1 - Bug] Reverted an unintended `next-env.d.ts` change from the Task 1 commit**
- **Found during:** Post-Task-1 review, before starting Task 2
- **Issue:** Running `npm run build` as part of Task 1's verification regenerated `next-env.d.ts` (`.next/dev/types/routes.d.ts` → `.next/types/routes.d.ts` + a new `root-params.d.ts` reference). This was initially committed alongside `package.json`/`package-lock.json` in `b8b3da2` under the assumption it was a mechanical consequence of the 16.3.5 upgrade. Further investigation (and the identical diff previously hit and reverted by quick task 260910-usw under next 16.1.6, unrelated to any version bump) showed this is a routine `next dev` vs. `next build` types-path difference, not caused by this task's changes — and Task 1's own scope is explicitly "package.json and package-lock.json only."
- **Fix:** `git checkout edab80e -- next-env.d.ts` to restore the pre-task reference, committed as a standalone `chore` commit (`688b358`) rather than amending `b8b3da2`.
- **Verification:** `npx tsc --noEmit` re-run clean with the reverted file; final `git diff edab80e HEAD --stat` confirms exactly the three intended files (`package.json`, `package-lock.json`, `eslint.config.mjs`) changed across the whole quick task.
- **Committed in:** `688b358`

---

**Total deviations:** 3 auto-fixed (1 blocking-tooling workaround, 1 missing-critical fix to the task's own new file, 1 bug — reverted an out-of-scope artifact)
**Impact on plan:** All three were necessary to land the plan's actual scope cleanly. No application source was touched at any point; no scope creep into fixing lint findings or upgrading out-of-scope majors.

## Issues Encountered

npm 10.9.8 (the environment's installed version) hit a known-class arborist bug resolving `vitest@4.1.11`'s optional peer dependency tree. CLAUDE.md documents npm 11.12.1 as the expected version — this environment's npm predates that, which is the most likely explanation. Worked around with `--legacy-peer-deps`; no upgrade to npm itself was made (out of scope for this task, and orthogonal to the target package versions).

## User Setup Required

None — no environment variables or dashboard configuration involved.

## Next Phase Readiness

`npm run lint` is now a real CI-usable gate (`eslint .`, exits 0). The 7 remaining warnings (5 `react-hooks/set-state-in-effect`, 1 `react-hooks/error-boundaries`, 1 `react-hooks/exhaustive-deps`) are ready to be picked up as a dedicated lint-cleanup follow-up task — the finding table above is the triage input. No blockers for further dependency or feature work.

STATE.md's deferred-items table `tech_debt` row for the `npm run lint` / "Invalid project directory" failure (discovered during quick task 260910-sbl) is resolved by this task.

---
*Quick task: 260912-isg*
*Completed: 2026-09-12*

## Self-Check: PASSED

`eslint.config.mjs` confirmed present on disk. All three commits (`b8b3da2`, `fd30a8e`, `688b358`) confirmed present in git history.
