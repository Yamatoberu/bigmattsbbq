---
phase: quick-260912-isg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - eslint.config.mjs
autonomous: true
requirements: [SEC-DEP-01, DX-LINT-01]
user_setup: []

must_haves:
  truths:
    - "next resolves to 16.3.5 (the version that fixes the critical unauthenticated RCE advisory)"
    - "npm audit reports 0 vulnerabilities, or only advisories with no non-breaking fix available"
    - "npm run build succeeds against the upgraded dependency tree"
    - "all 314 Vitest tests pass and npx tsc --noEmit is clean after the bump"
    - "npm run lint executes ESLint and exits without a crash (no 'Invalid project directory' error)"
    - "react, react-dom, tailwindcss, typescript, and zod remain on their current major versions"
  artifacts:
    - path: "eslint.config.mjs"
      provides: "Flat ESLint config wiring eslint-config-next for Next 16 + TypeScript"
      contains: "eslint-config-next"
    - path: "package.json"
      provides: "Upgraded dependency versions and a working lint script"
      contains: "eslint"
  key_links:
    - from: "package.json scripts.lint"
      to: "eslint.config.mjs"
      via: "eslint CLI auto-discovery of flat config at repo root"
      pattern: "\"lint\":\\s*\"eslint"
    - from: "eslint.config.mjs"
      to: "eslint-config-next"
      via: "ESM import of the CJS Linter.Config[] array export"
      pattern: "from \"eslint-config-next"
---

<objective>
Bump outdated dependencies to their latest patch/minor versions — most importantly `next` 16.1.6 → 16.3.5, which closes numerous security advisories including a critical unauthenticated RCE — and restore the broken `npm run lint` script, which has been non-functional since Next.js 16 removed the `next lint` subcommand.

Purpose: The repo currently ships 18 known vulnerabilities (3 critical, 7 high) and has no working lint command, so the only quality gates are `tsc --noEmit` and `npm run build`. Both problems are one-time, self-contained fixes.

Output: Updated `package.json` + `package-lock.json` with bumped versions and ESLint devDependencies; a new `eslint.config.mjs` flat config; a `lint` script that actually runs.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@package.json
@CLAUDE.md

<baseline>
Measured immediately before this plan (2026-09-12), on a clean `master` working tree:

- `npx tsc --noEmit` — clean, zero errors
- `npm run test` — 314/314 Vitest tests pass
- `npm audit` — 18 vulnerabilities (3 critical, 7 high, 6 moderate, 2 low)
- `npm run lint` — FAILS with `Invalid project directory provided, no such directory: <repo>/lint`
- No ESLint config exists anywhere in the repo (`ls .eslintrc* eslint.config*` → none)

These are the numbers to compare against. Test count and tsc cleanliness must not regress.
</baseline>

<target_versions>
Confirmed available via `npm outdated` on 2026-09-12. These are the exact `Latest` values, all patch/minor within the current major:

| Package | Current | Target | Kind |
|---------|---------|--------|------|
| next | 16.1.6 | 16.3.5 | dependency |
| @supabase/supabase-js | 2.101.1 | 2.116.0 | dependency |
| resend | 6.12.2 | 6.28.0 | dependency |
| @react-email/render | 2.0.8 | 2.1.0 | dependency |
| supabase | 2.84.10 | 2.117.0 | devDependency (CLI) |
| vitest | 4.0.18 | 4.1.11 | devDependency |
| @playwright/test | 1.62.1 | 1.63.0 | devDependency |
| autoprefixer | 10.4.20 | 10.6.0 | devDependency |
| postcss | 8.4.45 | 8.5.28 | devDependency |

**OUT OF SCOPE — do not touch.** These have newer majors available and migrating them is not part of this task:
`react` / `react-dom` (18.3.1, 19.x available), `tailwindcss` (3.4.x, 4.x available), `typescript` (5.9.x, 7.x available), `zod` (3.25.x, 4.x available).

`@types/node` and `@types/react` also have in-range patch updates. Do not bump them deliberately, but if `npm audit fix` or the lockfile refresh moves them **within their existing semver range** (20.x / 18.x), that is acceptable — just do not let them cross a major.
</target_versions>

<eslint_package_facts>
Verified against the npm registry on 2026-09-12 — use these facts rather than re-deriving them:

- `eslint-config-next@16.3.5` exists and matches the target Next version. Provenance confirmed: published from `vercel/next.js`, directory `packages/eslint-config-next` — the official first-party Next.js ESLint config. Not an [ASSUMED] or [SUS] package.
- Its peer dependencies are `eslint: ">=9.0.0"` and `typescript: ">=3.3.1"` (typescript is an optional peer). The repo's TypeScript 5.9.3 satisfies this.
- It bundles everything else as **its own dependencies** — `typescript-eslint`, `globals`, `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-import-resolver-node`, `eslint-import-resolver-typescript`. **Do not install any of these separately** — they are not peers and adding them will create duplicate-plugin conflicts.
- Therefore the only new devDependencies needed are `eslint` and `eslint-config-next`.
- Pin `eslint` to `^9` (latest 9.x is 9.39.5). ESLint 10.x also satisfies the peer range, but every bundled plugin's peer list explicitly includes `^9.0.0`, so 9.x is the lowest-risk choice for a task whose goal is "make the script run," not "adopt the newest ESLint."
- Export shape: all four entry points (`.`, `./typescript`, `./core-web-vitals`, `./parser`) declare `declare const config: Linter.Config[]; export = config;` — i.e. each is a **CommonJS array export of flat config objects**. In an `.mjs` file this is consumed as a default import that is itself an array, so it must be spread (`...nextConfig`), never used directly as a config object.
</eslint_package_facts>

<repo_layout>
Top-level source directories ESLint will encounter: `app/`, `components/`, `lib/`, `emails/`, `tests/`, `e2e/`, `scripts/`, `supabase/`, `docs/`, `public/`, `mcp-servers/`.

`mcp-servers/` is a separate nested project with its own `node_modules` (see `.gitignore`: `mcp-servers/**/node_modules`) and must be excluded from linting. `.next/`, `node_modules/`, `test-results/`, `playwright-report/`, and `coverage/` must also be excluded.
</repo_layout>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump dependencies to latest patch/minor and clear the audit backlog</name>
  <files>package.json, package-lock.json</files>
  <action>
Update the nine packages listed in the `<target_versions>` table to their target versions. Prefer a single `npm install` invocation per dependency group so the lockfile is resolved once rather than nine times: one `npm install` with all five runtime `dependencies` at their exact target versions, then one `npm install --save-dev` with the four devDependencies at their target versions. Let npm write the caret ranges into `package.json` as it normally does — the existing file already uses `^` for every one of these.

Do not hand-edit version strings in `package.json` and then run a bare `npm install`; that path can silently leave the lockfile resolving to an older satisfying version.

After the bumps land, run `npm audit fix` — **without** `--force`. The `--force` flag is what pulls in major upgrades, and this task must not cross any major boundary. Several of the reported advisories (vite, ws, launch-editor) are transitive under `vitest`, so the vitest 4.0.18 → 4.1.11 bump is expected to resolve most of them on its own; `npm audit fix` mops up whatever remains that has a non-breaking fix.

Then confirm nothing crossed a major: run `npm ls next react react-dom tailwindcss typescript zod` and check that `react`/`react-dom` are still 18.3.1, `tailwindcss` still 3.x, `typescript` still 5.x, and `zod` still 3.x. `next` must read 16.3.5.

If `npm audit` still reports vulnerabilities after `npm audit fix`, do **not** escalate to `--force` and do **not** start upgrading majors to chase them. Record the residual advisories (package, severity, why no non-breaking fix exists) in the SUMMARY as a known-remaining item and move on — that is the correct outcome for this task's scope.

If the build or tests fail after the bump, diagnose and fix forward within the bumped versions (e.g. a renamed export in a minor release). If a specific package's bump proves to be the cause and cannot be reconciled without touching application logic, revert that one package to its current version, leave the other eight bumped, and record the exception in the SUMMARY. `next` 16.3.5 is the one bump that is not optional — it is the security fix this task exists for.

Do not modify any application source file. This task touches `package.json` and `package-lock.json` only.
  </action>
  <verify>
    <automated>node -p "require('./node_modules/next/package.json').version" | grep -q '^16\.3\.5$' && npx tsc --noEmit && npm run test && npm run build</automated>
  </verify>
  <done>
`next` resolves to 16.3.5. `npm audit` reports 0 vulnerabilities (or only advisories with no non-breaking fix, documented in the SUMMARY). `npx tsc --noEmit` is clean. All 314 Vitest tests pass — the count must not drop. `npm run build` succeeds. `react`, `react-dom`, `tailwindcss`, `typescript`, and `zod` are unchanged on their current majors. No file outside `package.json` / `package-lock.json` was modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add flat ESLint config and repair the lint script</name>
  <files>eslint.config.mjs, package.json</files>
  <action>
Install the two new devDependencies identified in `<eslint_package_facts>`: `eslint@^9` and `eslint-config-next@^16.3.5`. Install nothing else — every plugin and parser is already a dependency of `eslint-config-next` and installing them separately causes duplicate-plugin errors.

Create `eslint.config.mjs` at the repo root. It is a flat config that default-exports an array built from two pieces:

1. A leading ignores-only entry listing the excluded paths from `<repo_layout>`. In flat config, a config object containing only an `ignores` key applies globally, so this must be the first element and must not carry any other key.
2. The spread of `eslint-config-next`'s `core-web-vitals` entry point, imported as a default ESM import. Because the package uses `export = config` where `config` is `Linter.Config[]`, the default import binding **is** the array — spread it, do not nest it. Use the `core-web-vitals` entry rather than the bare root entry so the Next.js Core Web Vitals rules are active; it is a superset of the base config.

Do not add custom rule overrides, a `languageOptions` block, or a TypeScript project-service configuration. The bundled config already handles TS parsing, and this task's goal is a functional script, not a curated rule set.

Change `scripts.lint` in `package.json` from `next lint` to `eslint .` — ESLint 9 auto-discovers `eslint.config.mjs` at the working directory root, so no `--config` flag or file-extension glob is needed.

Run `npm run lint` and confirm it actually executes ESLint. The previous failure mode was the `next lint` CLI treating `lint` as a directory path; the fix is proven when that "Invalid project directory" message is gone and ESLint produces real output (either a clean exit or a list of file-scoped findings with rule names).

**Do not fix lint findings in this task.** If ESLint reports pre-existing errors or warnings across the codebase, that is expected — the repo has never been linted. Record the finding counts by rule in the SUMMARY so they can be triaged separately. The only acceptable in-scope adjustment is widening the `ignores` list if ESLint is scanning generated or vendored output that should never have been linted (for example a build artifact directory missed in `<repo_layout>`).

One exception to "do not fix findings": if ESLint exits non-zero purely because of **errors** (not warnings) and the count is small and mechanical, leaving `npm run lint` red means the script is functional but the gate is unusable. In that case, prefer downgrading those specific rules to `"warn"` in a trailing config object in `eslint.config.mjs` over editing application source — this task must not touch application code. Document any rule downgrades and the reason in the SUMMARY.
  </action>
  <verify>
    <automated>test -f eslint.config.mjs && grep -q 'eslint-config-next' eslint.config.mjs && grep -q '"lint": "eslint' package.json && npm run lint 2>&1 | tee /tmp/lint-out.txt; ! grep -q 'Invalid project directory' /tmp/lint-out.txt</automated>
  </verify>
  <done>
`eslint.config.mjs` exists at the repo root, imports `eslint-config-next/core-web-vitals`, and spreads it into the exported array alongside a leading global-ignores entry. `eslint` and `eslint-config-next` are in `devDependencies` and nothing else was added. `package.json` `scripts.lint` is `eslint .`. `npm run lint` runs ESLint to completion with no "Invalid project directory" error and no config-resolution or missing-plugin crash. Any remaining findings are documented in the SUMMARY, not fixed. No application source file was modified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local `node_modules` | Third-party package code enters the build and runtime, executing with full developer/CI privileges |
| Upgraded `next` runtime → HTTP request handling | The upgrade's entire purpose is to move this boundary off a vulnerable version |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260912-01 | Elevation of Privilege | `next@16.1.6` request handling | mitigate | Upgrade to 16.3.5, the version carrying the fix for the unauthenticated RCE advisory; Task 1 gates on `node -p require('next/package.json').version` reading exactly 16.3.5 |
| T-260912-02 | Tampering | npm install of `eslint`, `eslint-config-next` | mitigate | Both verified against the npm registry on 2026-09-12: `eslint` is the ESLint org's canonical package; `eslint-config-next@16.3.5` publishes from `vercel/next.js` / `packages/eslint-config-next` and version-matches the target Next release. Neither is [ASSUMED] or [SUS], so no blocking human checkpoint is required |
| T-260912-03 | Tampering | `npm audit fix` transitive resolution | mitigate | `--force` is explicitly forbidden in Task 1; a post-fix `npm ls` on the five out-of-scope packages proves no major boundary was crossed |
| T-260912-04 | Denial of Service | `ws` / `vite` advisories under the vitest tree | mitigate | Dev-only dependency tree, not shipped to production; addressed by the vitest 4.1.11 bump plus non-forced `npm audit fix`. Residual dev-only advisories with no non-breaking fix are accepted and documented rather than chased |
| T-260912-05 | Information Disclosure | Residual unfixable advisories | accept | Any advisory left after non-forced `npm audit fix` is recorded in the SUMMARY with package, severity, and reason; escalating to major upgrades is out of scope for this task |
</threat_model>

<verification>
Run the full gate after both tasks are complete, from a single clean state:

1. `node -p "require('./node_modules/next/package.json').version"` → `16.3.5`
2. `npx tsc --noEmit` → exits 0, no output
3. `npm run test` → 314 passing (count must not regress from baseline)
4. `npm run build` → succeeds
5. `npm run lint` → ESLint runs to completion, no "Invalid project directory", no plugin/config resolution crash
6. `npm audit` → 0 vulnerabilities, or only advisories with no non-breaking fix (each documented in the SUMMARY)
7. `npm ls react react-dom tailwindcss typescript zod` → react/react-dom 18.3.1, tailwindcss 3.x, typescript 5.x, zod 3.x
8. `git status --porcelain` → only `package.json`, `package-lock.json`, and the new `eslint.config.mjs` are changed. Zero application source files.
</verification>

<success_criteria>
- `next` is on 16.3.5 and the critical advisories against 16.1.6 no longer apply
- The eight other in-scope packages are on their target patch/minor versions
- `npm audit` is clean, or every residual advisory is documented with a reason it cannot be fixed non-breakingly
- `npm run lint` is a working command backed by a real flat ESLint config
- Baseline quality gates hold: tsc clean, 314 tests passing, production build succeeding
- No major version was crossed and no application code was touched
</success_criteria>

<output>
Create `.planning/quick/260912-isg-bump-outdated-dependencies-next-to-16-3-/260912-isg-SUMMARY.md` when done.

The SUMMARY must explicitly record:
- The before/after version of every package that moved (including anything `npm audit fix` moved transitively)
- The final `npm audit` count, and for each residual advisory: package, severity, and why no non-breaking fix exists
- The `npm run lint` finding counts grouped by rule — this is the triage input for a follow-up task
- Any rule downgraded to `"warn"` in `eslint.config.mjs`, with the reason
- Any package reverted from its target version, with the reason

Also update the STATE.md deferred-items table: the `tech_debt` row for `npm run lint` failing with "Invalid project directory" (discovered during quick task 260910-sbl) is resolved by this task and should be marked as such.
</output>
