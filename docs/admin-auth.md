# Website authentication and administrator access

Issue #45 adds shared email/password login, password recovery, and an administrator
landing page. Supabase Auth owns identities and sessions; current database grants
own application permissions. Google, public onboarding, invitations, role-management
UI, and business admin tools are intentionally deferred.

## Configuration and deployment order

Use the environments in [supabase-environments.md](supabase-environments.md). Local
and browser checks target `bigmattsbbq-test` (`ujpviiulhibzztbricxu`), never production.
`supabase/config.toml` is a local configuration reference: editing it does **not**
change hosted Auth settings. There is no local Docker stack in this project.

1. Apply `0019_admin_permissions.sql` to test, verify the SQL checks below, then
   promote the identical migration to production when releasing the reviewed change.
2. In the target project's Authentication settings, disable **Allow new users to
   sign up** and anonymous sign-ins. Keep email/password enabled. Check existing
   external provisioning before changing production. Admin API/manual provisioning
   remains the supported way to create the initial identity. No automatic first-user
   promotion exists.
3. Configure Supabase Auth custom SMTP, a verified sender, and the password recovery
   template. Existing application Resend configuration does not configure Auth SMTP.
   For Resend SMTP use the provider's current documented SMTP settings and a scoped
   sending credential in Supabase's hosted settings, never a committed file.
   Keep the template's `{{ .ConfirmationURL }}` link: this implements the provider's
   PKCE email verification flow. Explain that the link must open in the browser
   that requested it. Disable link tracking; test mail-scanner behavior. Set the
   recovery expiry deliberately (recommended one hour), minimum password length
   at least 12, and review provider email/verification/login rate limits. The app
   accepts new passwords of 12–128 characters; provider policy may be stricter.
4. Set the Site URL and exact allowed redirect URL for each environment:

   | Environment | Site URL / `AUTH_SITE_URL` | Allowed recovery redirect |
   |---|---|---|
   | Test/local | `http://localhost:3000` | `http://localhost:3000/auth/callback` |
   | Production | `https://bigmattsbbq.com` | `https://bigmattsbbq.com/auth/callback` |

   Use explicit origins for any additional approved test deployment; no production
   wildcard redirect URLs. Auth endpoints operate on the configured main website
   origin. SCA-host login/admin/callback paths redirect there rather than rewriting
   to `/sca`. The API rejects other origins.
5. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `AUTH_SITE_URL` for the same environment, then
   deploy the application. The legacy anon-key name is retained consistently;
   the browser never receives the service-role key. CI uses dummy values and does
   not call live Auth during builds/unit tests.
6. Provision/assign the owner as below, verify the complete flow with test identities
   first, then verify the intended owner. Record actual email delivery and completion.
   Do not declare recovery ready based only on mocked responses or generated links.

## Initial administrator and revocation

Use Supabase Authentication's privileged user management to find the intended
owner's existing confirmed identity. Create a confirmed email/password identity
manually only when none exists. Transfer a temporary password privately or use
verified recovery to establish it; never put passwords in SQL, commits, or comments.
Do not reuse a newsletter subscription as an identity. An existing `sca.chef` link
may help identify an existing user, but granting website access does not assign
chef ownership or change SCA permissions.

Copy the verified Auth user UUID and execute through the privileged SQL editor:

```sql
-- Replace the placeholder with the intended user's verified UUID.
insert into public.user_roles (user_id, role_id)
values ('OWNER_AUTH_USER_UUID'::uuid, 'administrator')
on conflict do nothing;
```

Sign in at `/login`, then confirm `/admin`. Grant removal is:

```sql
delete from public.user_roles
where user_id = 'OWNER_AUTH_USER_UUID'::uuid and role_id = 'administrator';
```

The next protected request reads current grants and denies access immediately.
This does not erase content already displayed in an open browser. Navigation
refreshes access on route changes and window focus; it is not an authorization
boundary. A failed permission lookup denies protected operations and hides Admin,
while keeping Log out available for an authenticated user.

All three permission tables have RLS and revoke client access. Administrators
cannot edit them directly via the browser/Data API. Only privileged operational
provisioning manages grants; metadata such as `full_name` is display-only.
The intentional no-policy advisor notices reflect default-deny access.

## Session and recovery behavior

- Browser and request-scoped server Auth clients are separate from the privileged
  singleton in `lib/supabase.ts`. That singleton is server-only and never signs in.
- Proxy refreshes incoming Auth cookies on page requests and preserves downstream
  headers, cookies, and private cache controls through SCA rewrites. APIs are excluded
  from the proxy and use their own response-aware Auth clients. Protected operations
  verify identity with `getUser()` and read grants independently of the proxy.
- Cookies are host-only, SameSite=Lax, and Secure over HTTPS. Auth and refresh
  responses use private/no-store. Auth mutations require an exact configured Origin;
  logout is POST-only. Login return URLs are restricted to local `/admin` paths.
- Access-token expiry alone does not log out a user with a valid refresh token.
  Refresh keeps that session valid. A missing/invalid session redirects admin pages
  to login; APIs return 401. A valid user without permission gets an access-denied
  page or API 403. Permission-store failures fail closed (503).
- Logout revokes the current refresh session and removes its cookies, followed by
  a full navigation to discard cached page state. Supabase access JWTs already copied
  elsewhere can remain usable until expiry. We do **not** promise immediate global
  token revocation. Application permission revocation is immediate on subsequent
  protected requests because it is not stored solely in JWT claims.
- Recovery requests always show the same account-neutral response, including provider
  throttling/failure. SMTP failures therefore require an operational delivery check;
  do not treat the UI message as proof an email was sent. Provider rate limits apply;
  server-mediated Auth calls may share the server's IP allowance.
- PKCE requires the original browser's verifier cookie. The provider email link
  redirects to `/auth/callback?code=...` (and possibly `sb_flow_id`), which exchanges
  the single-use code and navigates to `/reset-password` without credentials in the
  destination URL. Missing, invalid, expired, and reused credentials show recovery
  help and a new-request link. Starting another recovery may supersede an older flow.
- A verified signed-in user can also visit `/reset-password` to change their own
  password. The update handler always verifies the current identity; an ordinary
  anonymous visit cannot update a password. After a successful update, global sign-out
  revokes refresh sessions and the user logs in again. Previously issued access JWTs
  have the same expiry caveat above. If sign-out fails after the password changed,
  the UI reports that partial result and asks the user to log out.
- Recovery callback request logging is suppressed in Next.js development; callbacks
  use `Referrer-Policy: no-referrer`. Exclude callback query strings from production
  access-log drains and analytics, and disable browser traces/screenshots during
  credential tests. Infrastructure logging must be checked separately at deployment.

## Authorization boundaries and related issues

`requirePermission(client, 'admin.access')` guards `/admin` and the read-only
`GET /api/admin/access`. Reuse it inside each new protected page, API, or action
before privileged reads/writes; layouts and hidden navigation are insufficient.

`POST /api/admin/broadcast` retains **BROADCAST_SECRET** authentication. A website
session never grants broadcast access. The `/api/admin` prefix is not a universal
session gate. Public storefront, checkout, subscriptions, and SCA reads remain
anonymous. Issues #23/#27 own broader SCA/database authorization, including the
existing `competition_authenticated_manage` policy. Do not provision production
non-admin users for testing or assume website permissions constrain those grants.
Issue #44's monitor should expect anonymous `/admin` requests to redirect to login;
it must not bypass authorization. Google can later issue identities through a
separate callback/login adapter, with deliberate account linking. The UUID-based
permission guard requires no provider-specific changes.

## Verification

```bash
npm run lint
npm run build
npm test
# Start with AUTH_SITE_URL=http://localhost:3000; use test-project .env.local.
AUTH_SITE_URL=http://localhost:3000 npm run dev
AUTH_E2E=1 npm run test:e2e -- e2e/auth.spec.ts --workers=1
npm run test:e2e -- --grep-invert 'auth.spec'
```

The Auth suite pins the test-project URL, provisions unique synthetic users, grants
one administrator, checks revocation and direct self-escalation, and deletes only
those users afterward. Passwords are randomly generated; traces/videos/screenshots
are disabled. It skips unless explicitly enabled. Ordinary CI runs lint/build/unit
tests, **not** Playwright. Coordinate #34 before adding shared browser CI.
Run `supabase/tests/admin_permissions.sql` in a privileged test-project connection;
its assertions run in a transaction and roll back. Check security/performance
advisors after migration.

Separately verify on a dedicated test mailbox: request reset, confirm delivery,
open in the initiating browser, update password, log in with the new password,
reject old password, reject reused/expired link, and verify wrong-browser recovery
help. Verify direct provider signup is rejected after disabling hosted signup.
Keep evidence free of addresses, passwords, tokens, and recovery links.

See [issue 45 verification](admin-auth-verification.md) for observed results and
outstanding hosted configuration checks.
