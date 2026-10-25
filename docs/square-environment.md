# Square environment configuration

The website and `npm run check:attribution -- <orderId>` require `SQUARE_ENV`
to be exactly `sandbox` or `production`. There is no default. They derive the
corresponding origin:

| SQUARE_ENV | Derived origin / optional SQUARE_HOST |
| --- | --- |
| sandbox | https://connect.squareupsandbox.com |
| production | https://connect.squareup.com |

Omit `SQUARE_HOST`, or set it to the exact origin above. An empty value, trailing
slash, path, query, fragment, credentials, alternate port, custom proxy, or
mismatched environment is rejected. Invalid settings fail before checkout
accesses the database or calls Square. Existing payload validation may still
return a client error before configuration is checked. Catalog requests and the
attribution script also reject invalid settings before contacting Square.

Square requests reject all redirects, including redirects to the same origin.
No redirected GET or write is followed automatically. A failed or redirected
write can still have reached its initial destination; this change does not add
checkout reconciliation or durable retries (tracked in #4).

`SQUARE_ACCESS_TOKEN` must belong to the selected environment. The website also
requires `SQUARE_LOCATION_ID`, `SQUARE_FROZEN_CATEGORY_ID`, and
`SQUARE_SAUCE_VARIATION_ID` from that environment. The validator cannot establish
token or resource ownership offline. The attribution script requires only the
environment, optional host, and access token. Its npm command loads `.env.local`
as a fallback; existing process variables take precedence.

## Removed diagnostics

`/api/test-seed` is deleted in every environment. It was a temporary read-only
connectivity diagnostic using a privileged database client, not a seeding API.
`/api/dev/set-inventory` was already deleted in #38. Neither endpoint should be
used by monitoring or manual setup. The existing guarded `npm run test:db`
workflow supplies test-database connectivity checks without a public debug API.
Square sandbox selection alone never establishes database environment safety.

## Before rollout

1. Inspect effective `SQUARE_ENV` and `SQUARE_HOST` for Production, Preview,
   Development, and any branch overrides. Set an explicit environment; remove
   the host override or match the table exactly. Do not print credentials or
   copy production secrets into local or CI configuration.
2. Confirm the token and resource IDs belong to that environment. Keep previews
   and local work on sandbox credentials. The MCP installation already has this
   origin policy from #24; its process configuration is separate from the site.
3. Validate lint/build/tests with synthetic configuration. An invalid runtime
   configuration deliberately makes checkout/catalog unavailable; a successful
   build alone does not establish deployment configuration correctness.
4. After deploying the reviewed change, verify `/api/test-seed` and
   `/api/dev/set-inventory` return 404, and perform read-only catalog checks.
   Do not submit a production checkout to test this fix. Verify successful
   payment behavior separately in sandbox.

Configuration updates apply to new Vercel deployments. No deployed environment
values are changed by this PR. Record inspection and deployment evidence in the
PR before rollout; if values cannot be inspected, explicitly retain that as an
unverified rollout requirement. Rolling back code reintroduces the old defaults
and diagnostic route; prefer correcting configuration and redeploying.

## Verification for #22 (2026-10-25)

Vercel project inspection found `SQUARE_ENV` and `SQUARE_HOST` entries each scoped
to Production and Preview, with no branch-specific overrides returned. Both are
sensitive and Vercel returned `decrypted: false` without a value, including on
individual reads. Development entries were absent from this listing. Effective
values and credential/resource ownership therefore remain unverified; the owner
must confirm compatibility before production rollout. No values were changed.

An isolated production build with synthetic configuration passed. With an invalid
Square environment and outbound fetch blocked, HTTP probes returned 404 for both
removed diagnostic paths and controlled 500 JSON errors for catalog and valid
checkout requests. Unit tests separately assert zero database-client creation
and zero provider requests for rejected configuration. These checks do not
establish deployed configuration correctness or live payment behavior.
