# Issue 45 verification evidence

Last checked: October 18, 2026. Implementation branch: `codex/45-admin-auth`.

## Verified

- TypeScript compilation passed.
- `npm run lint` passed with seven existing warnings in unrelated components.
- `npm test`: 364 tests passed across 34 files, including 42 new Auth/proxy checks.
- `npm run build` passed with dummy-compatible Auth configuration; Auth routes render dynamically.
- `AUTH_E2E=1 npx playwright test --workers=1`: 16 browser tests passed, including
  six live Auth tests and ten existing storefront/checkout/redirect tests.
- Live Auth tests provisioned synthetic confirmed identities only in
  `bigmattsbbq-test`. Admin login, reload, direct handler access, immediate grant
  revocation/restoration, logout, ordinary-user denial, metadata non-escalation,
  direct Data API self-assignment denial, and authenticated password update/re-login
  all passed. All created test identities were removed by suite cleanup.
- Invalid callback and anonymous reset access show recovery help. Unit tests cover
  successful code exchange, invalid/reused credentials, safe return paths, generic
  reset responses, and propagation of Auth cookies through proxy rewrites.
- SQL regression checks passed in the test project: 24 direct anonymous/authenticated
  reads/writes denied; service-role seed access and role cascades passed under rollback.
- Migration `0019_admin_permissions.sql` applied only to the test project. Production
  schema, identities, Auth settings, and deployment configuration were not modified.
- Security advisor's new INFO notices are the expected
  [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  for server-only permission tables. No new performance finding on these tables;
  unrelated existing index advisories remain outside this issue.
- Desktop/mobile login layouts inspected; 390px mobile view has no horizontal
  overflow. Heading/body fonts explicitly use the existing Playfair Display/Nunito
  Sans variables. Active-drop cart and mobile login entry passed browser checks.
- Independent implementation review found no authorization bypass or open redirect.
  Its permission-outage/logout-navigation finding was fixed and regression-tested.
- #23 and #27 remain open. Website permissions do not remediate their existing SCA
  authenticated write exposure or environment grant differences. #44 remains open.

## Required before marking this PR ready

1. **Hosted self-registration verified disabled.** After the dashboard change, public
   Auth settings report `disable_signup: true`. A direct synthetic signup request
   returned `signup_disabled` and created no user. This blocker is resolved.
2. **Actual recovery-email delivery and full PKCE email flow are not yet verified.**
   The user supplied a test mailbox and the provider accepted a recovery request.
   Receipt and completion remain unverified. Hosted SMTP, sender, template,
   callback allowlist, and expiry require verification. Complete delivery → original
   browser callback → password update → new login, plus expired/reused/wrong-browser
   link checks. A successful authenticated password change is not proof of email
   delivery or PKCE callback configuration.
3. Apply production release configuration and provision the intended owner only
   through the reviewed runbook. Production rollout and owner sign-in remain pending.

These gaps are explicit release/acceptance blockers; passing automated checks does
not establish hosted settings or email delivery. Keep the PR in draft until the
required non-production verification is recorded.
