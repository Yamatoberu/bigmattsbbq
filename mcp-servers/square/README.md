# Square MCP maintenance

This package has its own lockfile. Installing or auditing the repository root
does not install or audit this dependency tree.

```sh
cd mcp-servers/square
npm ci
npm test
npm audit
```

The tests launch the actual server and SDK client over stdio with synthetic
credentials. A test-only preload replaces fetch completely; no Square requests
are sent. Coverage includes initialization, tool discovery, all four supported
HTTP methods, response forwarding, provider errors, non-JSON errors, network
failures, unknown tools, and missing credentials. GitHub CI runs these tests in
a separate Node 24 job. The root application's tests remain separate.

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

## Deployment and limitations

Run `npm ci` in this directory and restart the MCP process to load the patched
dependencies. No new credentials, environment settings, database migration, or
web application behavior changes are required. To roll back, revert the package
manifest and lockfile together, reinstall, and restart; doing so restores the
previous dependency advisories.

Tests verify SDK compatibility with mocked HTTP responses, not live Square
behavior or every SDK-internal advisory path. The separate request-origin and
environment validation flaw remains tracked in [#24](https://github.com/Yamatoberu/bigmattsbbq/issues/24).
The mock's destination check protects tests only; it is not a production fix.
Square API version alignment remains in [#33](https://github.com/Yamatoberu/bigmattsbbq/issues/33).
