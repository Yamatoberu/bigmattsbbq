# Big Matt's BBQ – Frozen-Forward Website

Mobile-first sales funnel for frozen BBQ drops, built with Next.js App Router and Square APIs.

## Setup

1. Select the pinned Node.js and npm versions, then install dependencies:

```bash
nvm install
nvm use
npm install --global npm@11.21.1
node --version
npm --version
npm ci
```

Node.js 24.22.1 is pinned in `.nvmrc` for development and CI. Both packages declare
Node.js 24.x and npm 11.x; `packageManager` pins npm 11.21.1. Use the same
toolchain when running commands in `mcp-servers/square`. Other Node version
managers can select the version recorded in `.nvmrc`.

2. Create a `.env.local` file (see `.env.example`):

```bash
SQUARE_ENV=sandbox
SQUARE_HOST=https://connect.squareupsandbox.com
SQUARE_ACCESS_TOKEN=YOUR_TOKEN
SQUARE_LOCATION_ID=YOUR_LOCATION_ID
SQUARE_FROZEN_CATEGORY_ID=YOUR_CATEGORY_ID
SQUARE_SAUCE_VARIATION_ID=YOUR_SAUCE_VARIATION_ID
```

3. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Required env vars

- `SQUARE_ENV`: `sandbox` or `production`
- `SQUARE_HOST`: `https://connect.squareup.com` or sandbox host
- `SQUARE_ACCESS_TOKEN`: Square access token
- `SQUARE_LOCATION_ID`: Square location used for orders and invoices at checkout
- `SQUARE_FROZEN_CATEGORY_ID`: Catalog category containing frozen items
- `SQUARE_SAUCE_VARIATION_ID`: Variation ID for house sauce (used for bump)
- `SCA_HOSTNAME` (optional): hostname that routes to the SCA Tracker, defaults to `sca.bigmattsbbq.com`

## Square version header

All Square API requests use the `SQUARE_VERSION` constant pinned at the top of `lib/square.ts` — that file is the single source of truth for the pinned value. `scripts/check-order-attribution.mjs` keeps a hand-synced copy (`.mjs` scripts in this repo don't import from `lib/`); update both together when bumping.

## How to get Square IDs

1. In the Square Dashboard, open **Items > Item Library**.
2. Locate your frozen category and copy its Category ID.
3. Open the sauce item, choose the correct variation, and copy its Variation ID.
4. Grab your Location ID from **Account & Settings > Business > Locations**.

You can also fetch catalog data via the Square Catalog API if you prefer CLI tools.

## API routes

- `GET /api/frozen-items`
  - Returns frozen menu items and prices from the Square Catalog.
- `POST /api/checkout`
  - Creates customer, order, and invoice, then publishes the invoice.

## SCA Tracker

The SCA Tracker lives under `app/sca` and is served at `/sca` — the canonical URL. Host-based
routing exists in `proxy.ts` at the repo root (Next.js 16 renamed `middleware.ts` to `proxy.ts`)
and would rewrite an `sca.*` host into `/sca`, but no such subdomain is bound and none is
planned — `/sca` is the intended access route.

## Checkout Attribution

The "How did you hear about us?" checkout question is documented in
[`docs/checkout-attribution.md`](docs/checkout-attribution.md) — key naming,
extensibility path, and the Square Seller Dashboard visibility caveat.

## Tests

```bash
npm run test
```

Tests cover:
- frozen-items menu route (catalog only)
- sauce bump logic
- package mapping

## Notes

- Packages are configured in `lib/config.ts` and map to catalog items/variations by name.
- No database is used in v1.
- All Square secrets remain server-side in `/app/api/*` routes.

## Runtime deployment and rollback

Vercel uses the root `engines.node` setting (`24.x`), including its managed minor
and patch updates. Local development and GitHub Actions use `.nvmrc`. The npm
version is pinned in both package manifests; CI installs that pin explicitly.
`vercel.json` selects the same npm version for install/build, runs `npm ci`, and
prints toolchain versions in the build log.
When updating npm, update both manifests and the Vercel install/build commands together.
Build logs must confirm the selected Node/npm versions; the `packageManager` field
alone does not install npm. Project settings should also remain on Node 24.x.

Validate changes with clean `npm ci` installs in the root and Square MCP directory,
then root lint, TypeScript checks, production build, unit tests, MCP tests, and
Playwright against the synthetic test environment. Never use production fixtures.

For rollback, revert the runtime configuration, manifests, both lockfiles, workflow
changes, and documentation together. Reinstall using the previous toolchain and
redeploy the reverted commit. If Vercel project settings were changed separately,
restore the recorded previous value too; reverting source does not change an
already-running deployment.
