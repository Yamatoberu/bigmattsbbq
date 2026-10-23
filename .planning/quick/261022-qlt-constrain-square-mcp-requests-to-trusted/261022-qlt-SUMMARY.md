# Issue 24: Square MCP trusted origins

Implementation commit: `3c708a1`.

The standalone MCP package now requires explicit sandbox/production configuration,
derives the matching official origin, and rejects non-exact host overrides at
startup. Runtime validation rejects unsafe rooted paths and invalid arguments
before fetch. The parsed destination origin is checked before authorization
headers are constructed. Fetch uses `redirect: "error"` for every request.
Production connections now advertise the production server name.

All four supported methods, JSON forwarding, encoded resource identifiers, query
strings, provider errors, and network-error handling remain covered. Regression
tests count intercepted calls to prove rejected inputs never reach fetch. Native
fetch probes between two ephemeral loopback servers verify that both redirect
responses are received with synthetic credentials and neither target is visited.
The preload prevents loading developer `.env.local` settings or credentials.

Verification on Node 24.22.1 / npm 11.21.1:

- MCP package `npm test`: 19 tests passed, including malformed configuration and
  explicit/derived hosts in both environments.
- Root `npm test`: 34 files / 364 tests passed.
- Root `npm run lint`: passed, seven existing warnings outside the changed package.
- Root `npm run build`: passed with synthetic CI configuration.
- `git diff --check`: passed. Branch rebased on latest origin/master; no changes.

Node 24 subprocess creation was blocked in the filesystem sandbox; MCP tests
and the build passed when rerun with the permitted sandbox escalation. No live
Square requests, real credential probes, or deployment changes were performed.

Before restarting every MCP installation, explicitly configure `SQUARE_ENV` and
remove `SQUARE_HOST` or use its exact matching origin. The package README records
both configurations and limitations. Credential/environment compatibility cannot
be inferred from token contents; live permissions and endpoint availability were
not tested. Application environment remediation remains in #22, and API version
alignment remains in #33. SEC-04 awaits review, merge, and installation restart.
