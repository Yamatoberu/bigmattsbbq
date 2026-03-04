# Big Matt's BBQ – Frozen-Forward Website

Mobile-first sales funnel for frozen BBQ drops, built with Next.js App Router and Square APIs.

## Setup

1. Install dependencies:

```bash
npm install
```

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
- `SQUARE_LOCATION_ID`: Square location for pickup and inventory
- `SQUARE_FROZEN_CATEGORY_ID`: Catalog category containing frozen items
- `SQUARE_SAUCE_VARIATION_ID`: Variation ID for house sauce (used for bump)

## Square version header

All Square API requests use `Square-Version: 2024-12-18`. Update in `lib/square.ts` if needed.

## How to get Square IDs

1. In the Square Dashboard, open **Items > Item Library**.
2. Locate your frozen category and copy its Category ID.
3. Open the sauce item, choose the correct variation, and copy its Variation ID.
4. Grab your Location ID from **Account & Settings > Business > Locations**.

You can also fetch catalog data via the Square Catalog API if you prefer CLI tools.

## API routes

- `GET /api/frozen-items`
  - Returns frozen menu items with inventory counts.
- `POST /api/checkout`
  - Creates customer, order, and invoice, then publishes the invoice.
- `POST /api/dev/set-inventory` (sandbox only)
  - Updates physical counts for testing.

## Tests

```bash
npm run test
```

Tests cover:
- inventory count joins
- sauce bump logic
- package mapping

## Notes

- Packages are configured in `lib/config.ts` and map to catalog items/variations by name.
- No database is used in v1.
- All Square secrets remain server-side in `/app/api/*` routes.
