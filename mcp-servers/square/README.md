# Square MCP maintenance

Use the repository's Node version (`nvm use` from the repository root) and npm
11.21.1 before installing or testing this package. See the root README for setup.

This package has its own lockfile. Installing or auditing the repository root
does not install or audit this dependency tree.

```sh
cd mcp-servers/square
npm ci
npm test
npm audit
```

The tests launch the actual server and SDK client over stdio with synthetic
credentials. A test-only preload blocks `.env.local` reads and intercepts fetch;
no Square requests are sent. Redirect probes use native fetch only between
temporary loopback HTTP servers, and assert that no redirected request occurs.
Configuration tests supply synthetic `.env.local` contents through the preload
to exercise fallback, process-environment precedence, and stale host rejection.
POST redirect tests cover 307 and 308 on both origins, checking that the initial
request contains the dummy credential and body while neither target is visited.
Coverage includes initialization, tool discovery, all four supported
HTTP methods, response forwarding, provider errors, non-JSON errors, network
failures, unknown tools, and missing credentials. GitHub CI runs these tests in
a separate Node 24 job. The root application's tests remain separate.

## Trusted destination configuration (#24 / SEC-04)

`SQUARE_ENV` is mandatory and must be exactly `sandbox` or `production`.
The server derives its trusted HTTPS origin from that setting:

| SQUARE_ENV | Derived origin / optional SQUARE_HOST |
| --- | --- |
| sandbox | https://connect.squareupsandbox.com |
| production | https://connect.squareup.com |

Set `SQUARE_ACCESS_TOKEN` to the credential for the selected environment.
`SQUARE_HOST` can be omitted; if supplied, it must equal the corresponding
origin exactly. Custom hosts, proxies, ports (including explicit `:443`), trailing
slashes, userinfo, paths, queries, and fragments are rejected at startup. Missing
or invalid environment settings and mismatched hosts also prevent startup.
Diagnostics never include the supplied token or rejected setting values.

Example sandbox process configuration:

```sh
SQUARE_ENV=sandbox SQUARE_ACCESS_TOKEN='<sandbox-token>' node mcp-servers/square/server.mjs
```

For production, set `SQUARE_ENV=production` and use a production token. The MCP
server name and tool description reflect the selected environment. Existing
process environment values take precedence over the repository's `.env.local`;
that file remains a fallback, so remove or update stale `SQUARE_HOST` values too.

`square_request` retains GET, POST, PUT, and DELETE. Paths must start with `/v2/`;
query strings and encoded resource identifiers remain supported, for example
`/v2/catalog/object/a%2Fb?cursor=a%2Bb%3D`. Absolute and protocol-relative URLs,
backslashes, fragments, whitespace/control characters, malformed escapes, and
traversal segments are rejected before fetch. The parsed destination must match
the configured origin before credentials are attached. All redirects are rejected,
including redirects within that origin; callers must provide the final API path.

Runtime validation also rejects unsupported methods, unknown arguments, non-object
bodies, GET bodies, and invalid request IDs. Optional request IDs must contain
1–128 visible ASCII characters. Invalid calls fail without making an HTTP request;
the stdio server remains available for subsequent calls.

Before restarting an existing installation, explicitly set `SQUARE_ENV` and either
remove `SQUARE_HOST` or set its matching origin above. Apply this to every local
or automated MCP client configuration, then restart the MCP process. No dependency
or database changes are needed. Tests cover both origins, invalid configuration,
runtime validation, encoded IDs/queries, and real redirect handling with dummy
credentials. They do not verify live Square credentials, permissions, or endpoint
availability. Tokens are not inspected to infer which environment they belong to.

These environment rules are also the intended contract for application remediation
in [#22](https://github.com/Yamatoberu/bigmattsbbq/issues/22); this change only
enforces them in the standalone MCP package. The API version remains unchanged
and is tracked separately in #33.

## Dependency refresh for #28

The SDK moves from 1.29.0 to 1.30.0, with a declared minimum of `^1.30.0`.
Compatible transitive updates resolve all seven affected packages found in the
baseline audit; no forced upgrades or dependency overrides were used.

| Package | Previous | Patched lockfile |
| --- | --- | --- |
| @hono/node-server | 1.19.14 | 2.1.1 |
| body-parser | 2.2.2 | 2.3.0 |
| express-rate-limit | 8.4.1 | 8.7.0 |
| fast-uri | 3.1.0 | 3.1.8 |
| hono | 4.12.16 | 4.13.8 |
| ip-address | 10.1.0 | 10.7.2 |
| qs | 6.15.1 | 6.16.0 |

Both root and nested audits reported zero vulnerabilities after the refresh
(2026-09-20 UTC). This is an advisory snapshot, not a guarantee about future
reports. No reported dependency advisory was deferred or suppressed.

The SDK explicitly permits the Hono adapter's 2.x line. That adapter requires
Node >=20; use the repository's CI runtime (Node 24). Local compatibility was
also checked on Node 22.23.2. The wrapper continues to use stdio, with no HTTP
listener. HTTP-middleware advisory matches do not establish that this wrapper
was exploitable. For example, the [Hono dot-notation advisory](https://github.com/honojs/hono/security/advisories/GHSA-g6gw-c38x-mqfc)
requires an opt-in parser that this wrapper does not configure.

## Dependency refresh deployment and limitations

Run `npm ci` in this directory and restart the MCP process to load the patched
dependencies. No new credentials, environment settings, database migration, or
web application behavior changes are required. To roll back, revert the package
manifest and lockfile together, reinstall, and restart; doing so restores the
previous dependency advisories.

Tests verify SDK compatibility with mocked HTTP responses, not live Square
behavior or every SDK-internal advisory path. The separate request-origin and
environment remediation for [#24](https://github.com/Yamatoberu/bigmattsbbq/issues/24)
is documented above and enforced in the server's runtime policy.
Square API version alignment remains in [#33](https://github.com/Yamatoberu/bigmattsbbq/issues/33).
