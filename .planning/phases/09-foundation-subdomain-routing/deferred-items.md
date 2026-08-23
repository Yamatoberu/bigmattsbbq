# Deferred Items — Phase 09 Foundation & Subdomain Routing

Out-of-scope discoveries logged during execution, not fixed per scope-boundary rule.

## `npm run lint` fails with "Invalid project directory provided, no such directory: .../lint"

- **Discovered during:** 09-03 Task 2 verification pass
- **Cause:** Pre-existing — `next lint` (Next.js 16.1.6) appears to no longer accept its legacy invocation form in this project; unrelated to any file touched by plan 09-03 (`lib/database-sca.types.ts`, `lib/supabase-sca.ts`, `tests/supabase-sca.test.ts`).
- **Scope:** Not in 09-03's `<verification>` block (which lists `check:sca`, `tsc --noEmit`, `test`, `build`, targeted `git diff`, and a bundle grep — not `lint`). Out of scope for this plan per the scope-boundary rule.
- **Status:** Not fixed. Left for a future plan/quick task to migrate `next lint` to the ESLint CLI directly, per Next.js 16 migration guidance.
