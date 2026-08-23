# Deferred Items — Phase 09 Foundation & Subdomain Routing

Out-of-scope discoveries logged during execution, not fixed per scope-boundary rule.

## `npm run lint` fails with "Invalid project directory provided, no such directory: .../lint"

- **Discovered during:** 09-03 Task 2 verification pass
- **Cause:** Pre-existing — `next lint` (Next.js 16.1.6) appears to no longer accept its legacy invocation form in this project; unrelated to any file touched by plan 09-03 (`lib/database-sca.types.ts`, `lib/supabase-sca.ts`, `tests/supabase-sca.test.ts`).
- **Scope:** Not in 09-03's `<verification>` block (which lists `check:sca`, `tsc --noEmit`, `test`, `build`, targeted `git diff`, and a bundle grep — not `lint`). Out of scope for this plan per the scope-boundary rule.
- **Status:** Not fixed. Left for a future plan/quick task to migrate `next lint` to the ESLint CLI directly, per Next.js 16 migration guidance.

## Build/tooling artifacts modified during 09-05 verification (not committed)

- **Discovered during:** 09-05 verification pass (`npx tsc --noEmit`, `npm run test`)
- **Files:** `next-env.d.ts` (Next.js regenerated the `.next/dev/types/routes.d.ts` reference to `.next/types/routes.d.ts` — a Next.js 16 internal path change, not caused by any 09-05 source edit), `supabase/.temp/cli-latest` (Supabase CLI version-check cache bumped from `v2.84.2` to `v2.115.0` by an ambient CLI invocation, unrelated to `lib/sca/scoring.ts` or `tests/sca-scoring.test.ts`), `.planning/config.json` (`use_worktrees: false` field present locally, not present at session start — left over from a prior/parallel session, not written by this plan).
- **Scope:** None of these files are in 09-05's `files_modified` list (`lib/sca/scoring.ts`, `tests/sca-scoring.test.ts`). Out of scope per the scope-boundary rule.
- **Status:** Not committed, left as local working-tree drift. Harmless — regenerated/derived files, no functional impact on the shipped plan.
