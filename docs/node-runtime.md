# Node runtime alignment — issue 31

## Selected toolchain

- Development and CI: Node 24.22.1 (`.nvmrc`).
- npm: 11.21.1 (`packageManager` in both manifests; selected explicitly in CI and Vercel).
- Deployment: Node 24.x (`engines.node`); Vercel manages minor/patch updates.
- Node types: 24.19.2, with the corresponding undici-types 7.24.6 lockfile update.

Versions were resolved from the npm registry on October 21, 2026. No application
runtime dependencies were upgraded. The Square MCP lockfile changed only to record
its engine declarations.

## Local verification

Verified from clean root and Square MCP installs using an isolated Node 24.22.1 /
npm 11.21.1 toolchain, without changing the machine's default Node installation:

- `npm ci` in both packages: passed.
- `npm run lint`: passed, seven existing warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed using the existing test-project configuration.
- `npm test`: 364 tests across 34 files passed.
- Square MCP `npm test`: 11 tests passed (requires local socket access).
- `AUTH_SITE_URL=http://localhost:3000 AUTH_E2E=1 npm run test:e2e -- --workers=1`:
  16 tests passed, zero skips. Live Auth used only the synthetic test project;
  checkout provider writes were stubbed by the existing browser suite.
- Workflow YAML parsing and `git diff --check`: passed.

Install output includes existing dependency deprecation notices and an npm notice
about the unrs-resolver postinstall approval; the required lint/build/tests passed.

## Deployment verification

The connected Vercel project `bigmattsbbq` already reported `nodeVersion: 24.x`.
No production project settings were changed. The repository now declares this
major explicitly. The Vercel build command prints the selected Node/npm versions;
preview build evidence is recorded in the PR after push when available.

See the root README for setup, coordinated pin updates, and rollback instructions.
