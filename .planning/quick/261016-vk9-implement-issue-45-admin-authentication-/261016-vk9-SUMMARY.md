---
status: incomplete
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

Incomplete: hosted test signup still enabled, SMTP/callback configuration and actual
recovery-email delivery unverified, no test mailbox supplied. Record final evidence
and keep PR draft until these checks complete. See docs/admin-auth-verification.md.
