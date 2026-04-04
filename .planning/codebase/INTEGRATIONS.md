# External Integrations

**Analysis Date:** 2026-04-03

## APIs & External Services

**Point-of-Sale / Commerce:**
- Square - Catalog, inventory, customer management, orders, and invoicing
  - SDK/Client: Raw `fetch` via custom wrapper in `lib/square.ts` (no Square SDK package installed)
  - API Version: `2024-12-18` (set via `Square-Version` header)
  - Auth: Bearer token via `SQUARE_ACCESS_TOKEN` env var
  - Base URL: `SQUARE_HOST` env var (`https://connect.squareupsandbox.com` for sandbox, `https://connect.squareup.com` for production)

**Square Endpoints Used:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/v2/catalog/search-catalog-items` | POST | Fetch frozen food items by category |
| `/v2/inventory/counts/batch-retrieve` | POST | Get stock counts for item variations |
| `/v2/inventory/changes/batch-create` | POST | Set inventory counts (dev/sandbox only) |
| `/v2/customers/search` | POST | Look up customer by email |
| `/v2/customers` | POST | Create new customer record |
| `/v2/orders` | POST | Create a pickup order |
| `/v2/invoices` | POST | Create an invoice for the order |
| `/v2/invoices/{id}/publish` | POST | Publish and email invoice to customer |

**Google Fonts:**
- Fonts: Playfair Display, Source Sans 3
- Loaded via `next/font/google` at build/request time
- No API key required
- Configured in `app/layout.tsx`

## Data Storage

**Databases:**
- None - No local database. All data (catalog, inventory, customers, orders) lives in Square.

**File Storage:**
- Local filesystem only (`public/` directory for static assets)

**Caching:**
- None - No explicit caching layer. Each request hits Square APIs directly.

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system. The app is a public-facing ordering form.
- Square customer records are created/looked up by email at checkout time.

**API Authentication:**
- Square: Bearer token (`Authorization: Bearer <SQUARE_ACCESS_TOKEN>`)
- Idempotency keys generated per-request using `crypto.randomUUID()` via `lib/idempotency.ts`
- Request tracing via `x-request-id` header (read from incoming request or generated with `crypto.randomUUID()`)

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service (no Sentry, Datadog, etc.)

**Logs:**
- `console.error` via `lib/logger.ts` (`logError` function)
- Structured output includes: `requestId`, `message`, `error.name`, `error.message`, `error.stack`

## CI/CD & Deployment

**Hosting:**
- Not detected in codebase (no Vercel config, Dockerfile, etc.)

**CI Pipeline:**
- Not detected (no `.github/workflows`, no CI config files)

## Environment Configuration

**Required env vars:**
- `SQUARE_ACCESS_TOKEN` - Square API bearer token
- `SQUARE_LOCATION_ID` - Square location ID for orders and inventory
- `SQUARE_FROZEN_CATEGORY_ID` - Square catalog category ID for frozen items
- `SQUARE_SAUCE_VARIATION_ID` - Square variation ID for BBQ sauce (used for cart upsell logic)

**Optional env vars with defaults:**
- `SQUARE_HOST` - API base URL; defaults to `https://connect.squareup.com`
- `SQUARE_ENV` - `sandbox` or `production`; defaults to `sandbox`

**Secrets location:**
- `.env.local` (gitignored)
- Template: `.env.example` (committed)
- Validation: `lib/env.ts` throws at startup if required vars are missing

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints implemented

**Outgoing:**
- Square invoice publish triggers an email from Square to the customer (Square-managed delivery)
- No app-initiated outgoing webhooks

## Square Integration Architecture

The Square integration is implemented entirely through a hand-rolled client in `lib/square.ts` rather than the official Square Node SDK. All API calls share a single `squareFetch<T>` function that handles:
- Auth header injection
- API version header
- Optional idempotency key via `X-Request-Id`
- JSON serialization/deserialization
- Error wrapping via `SquareError` class (preserves HTTP status and raw body)

The checkout flow sequence is:
1. Search for existing customer by email (`/v2/customers/search`)
2. Create customer if not found (`/v2/customers`)
3. Create pickup order (`/v2/orders`)
4. Create invoice linked to order (`/v2/invoices`)
5. Publish invoice (triggers Square to email payment link to customer) (`/v2/invoices/{id}/publish`)

---

*Integration audit: 2026-04-03*
