---
status: complete
issue: 45
branch: codex/45-admin-auth
---

Implemented Supabase SSR email/password login, recovery handlers/screens, protected
admin landing/read-only access handler, current database permission grants, and
responsive account navigation. Composed cookie refresh with SCA routing; preserved
broadcast bearer authorization. Migration 0019 applied only to test. Added runbook,
SQL access checks, 42 unit checks, and six opt-in live Auth browser checks.

Validation: lint passes (7 existing warnings), 364 unit tests, 16 browser tests,
TypeScript and production build pass. Independent review finding fixed. Synthetic
identities cleaned up. Production unchanged.

Hosted test signup is verified disabled; direct signup returns signup_disabled.
Actual email delivery confirmed by the user. The supplied email link completed
PKCE recovery with the saved requesting-browser state; password update and new
login succeeded, non-admin access was denied, and reused link failed safely.
Temporary recovery identity and generated credentials cleaned up. Production
configuration/provisioning remain release steps. See docs/admin-auth-verification.md
for exact evidence and limits. Ready for reviewer; no production deployment.
