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

## Hosted Auth and emailed recovery — verified

- Hosted test signup reports `disable_signup: true`. A direct synthetic signup
  request returned `signup_disabled` and created no user.
- The user confirmed receipt of the reset email and provided its original `.eml`
  locally. The actual email points to the test project's verification endpoint
  and redirects to `http://localhost:3000/auth/callback`.
- A fresh request through `/forgot-password`, with the requesting browser's saved
  state, completed the actual emailed PKCE callback and displayed the reset form.
  Password update succeeded, the new password logged in, and the user without an
  admin grant was correctly denied `/admin`. Logout completed successfully.
- Reusing the actual email link returned the provider's `otp_expired` error and
  displayed a fresh-reset request link rather than the password form.
- The first attempt using manually reconstructed browser cookies failed safely;
  the fresh real-browser request succeeded. The first failure's cause was not
  established; the verified flow uses the application's actual browser request.
- The temporary recovery-test identity and generated credential files were removed.
  No recovery links, passwords, or session values are included in repository evidence.

## Verification limits and release steps

Invalid/expired callback parameters and rejected code exchanges have automated
coverage. The live reused-link check exercises the provider's expired/invalid-link
response. We did not wait for a fresh link to age past the provider's configured
expiry or perform an independent valid-link/wrong-browser experiment; do not claim
those were separately observed. The runbook documents the PKCE same-browser
requirement and recovery-help behavior.

Actual delivery and the test callback destination are verified. Hosted SMTP internals,
password policy, exact expiry/rate-limit values, and production callback configuration
were not inspected through the connected tools. Review these during deployment using
`docs/admin-auth.md`. Production migration promotion and owner provisioning remain
release operations after review, not actions performed by this branch.

Application implementation and non-production recovery verification are complete;
the PR can move out of draft for Yamatoberu's review. Production remains unchanged.
