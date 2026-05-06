# Architecture

**Analysis Date:** 2026-04-03

## Pattern Overview

**Overall:** Next.js App Router with a thin server/client split

**Key Characteristics:**
- Next.js 14 App Router — pages in `app/`, each page delegates immediately to a client component
- API routes (`app/api/`) act as a thin orchestration layer over a single external service (Square)
- All Square API calls are centralized in `lib/square.ts`; routes never call Square directly
- Client state is limited to cart (localStorage-backed Context) and local form/UI state
- No database — Square is the sole source of truth for catalog, inventory, customers, and orders

## Layers

**Page Layer:**
- Purpose: Next.js route entry points; minimal logic, wires server-side env to client components
- Location: `app/`
- Contains: `page.tsx`, `layout.tsx`, `providers.tsx`, route-level page files
- Depends on: Components, `lib/env.ts`
- Used by: Next.js router

**API Route Layer:**
- Purpose: Validate requests, orchestrate Square API calls, return normalized JSON
- Location: `app/api/`
- Contains: `route.ts` files for `GET /api/frozen-items`, `POST /api/checkout`, `POST /api/dev/set-inventory`
- Depends on: `lib/square.ts`, `lib/env.ts`, `lib/normalizers.ts`, `lib/idempotency.ts`, `lib/logger.ts`
- Used by: Client components via `fetch()`

**Component Layer:**
- Purpose: All UI rendering and client-side interactivity
- Location: `components/`
- Contains: Page-level composite components, card components, layout elements, cart context, hooks
- Depends on: `lib/cart.ts`, `lib/config.ts`, `lib/format.ts`, `lib/types.ts`
- Used by: `app/` page files

**Library Layer:**
- Purpose: Shared logic, types, utilities, and the Square API client
- Location: `lib/`
- Contains: `square.ts` (API client + mappers), `types.ts`, `config.ts`, `cart.ts`, `normalizers.ts`, `env.ts`, `format.ts`, `idempotency.ts`, `logger.ts`
- Depends on: Node.js runtime, environment variables
- Used by: API routes and components

## Data Flow

**Menu Load (client-initiated):**

1. `useFrozenItems` hook (`components/hooks/useFrozenItems.ts`) calls `GET /api/frozen-items` on mount
2. `app/api/frozen-items/route.ts` calls `searchCatalogItems` → `mapCatalogToFrozenItems` → `batchRetrieveInventoryCounts` → `joinInventoryCounts` in `lib/`
3. Returns `FrozenItemDTO[]` with inventory counts merged
4. Hook stores results in local React state; components re-render

**Checkout Submission:**

1. `CheckoutClient` (`components/CheckoutClient.tsx`) collects form data + cart items + pickup selection
2. Calls `POST /api/checkout` with `CheckoutRequestBody`
3. `app/api/checkout/route.ts` validates with Zod, then:
   - Searches Square for existing customer by email; creates if not found
   - Creates Square order with line items and pickup fulfillment
   - Creates Square invoice with email delivery
   - Publishes the invoice (triggers email to customer)
4. Returns `{ orderId, invoiceId, pickupNote }`
5. Client clears cart and redirects to `/confirmation?orderId=...&pickupNote=...`

**State Management:**
- Cart state lives in `CartContext` (`components/cart/CartContext.tsx`), persisted to `localStorage` under key `big-matts-bbq-cart`
- Frozen item catalog is fetched fresh on each page load (no caching, `cache: "no-store"`)
- No global server state; no database

## Key Abstractions

**FrozenItemDTO:**
- Purpose: Normalized representation of a Square catalog item with inventory counts
- Definition: `lib/types.ts`
- Created by: `mapCatalogToFrozenItems` + `joinInventoryCounts` in `lib/square.ts` and `lib/normalizers.ts`
- Consumed by: `OrderLanding`, `FrozenItemCard`, `CheckoutClient`, `useFrozenItems`

**CartItem:**
- Purpose: Minimal cart entry — just `variationId` and `quantity`
- Definition: `lib/types.ts`
- Managed by: `CartContext` with `mergeCartItems` logic in `lib/cart.ts`
- Sent as-is to `POST /api/checkout`

**PackageConfig:**
- Purpose: Static configuration for preset bundles; items resolved against live catalog by name-matching
- Definition: `lib/types.ts`
- Data: Hardcoded in `lib/config.ts`
- Resolved to `CartItem[]` by: `resolvePackageToCartItems` in `lib/cart.ts`

**SquareEnv:**
- Purpose: Validated set of Square credentials and configuration loaded from environment
- Definition: `lib/env.ts`
- Obtained via: `getSquareEnv()` — throws on missing vars

**SquareError:**
- Purpose: Typed error wrapping Square API failures, carries HTTP status and response body
- Definition: `lib/square.ts`
- Used by: All API routes to pass Square's status code through to the client

## Entry Points

**Root Page:**
- Location: `app/page.tsx`
- Triggers: Next.js router on `/`
- Responsibilities: Renders `<OrderLanding />` — delegates entirely to the component

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every page
- Responsibilities: Sets fonts, wraps all pages in `<Providers>` (which wraps in `<CartProvider>`)

**Checkout Page:**
- Location: `app/checkout/page.tsx`
- Triggers: Navigation to `/checkout`
- Responsibilities: Server-side reads `sauceVariationId` from env, passes to `<CheckoutClient>`; marked `force-dynamic`

**Confirmation Page:**
- Location: `app/confirmation/page.tsx`
- Triggers: Redirect after successful checkout
- Responsibilities: Reads `orderId` and `pickupNote` from query params, displays success state

**Orders Page:**
- Location: `app/orders/page.tsx`
- Triggers: Navigation to `/orders`
- Responsibilities: Stub placeholder — "coming soon" UI only

**Frozen Items API:**
- Location: `app/api/frozen-items/route.ts`
- Triggers: `GET /api/frozen-items`
- Responsibilities: Fetch and merge Square catalog + inventory, return `FrozenItemDTO[]`

**Checkout API:**
- Location: `app/api/checkout/route.ts`
- Triggers: `POST /api/checkout`
- Responsibilities: Validate body, upsert Square customer, create order + invoice, publish invoice

**Dev Inventory API:**
- Location: `app/api/dev/set-inventory/route.ts`
- Triggers: `POST /api/dev/set-inventory`
- Responsibilities: Sandbox-only; directly sets Square inventory counts for testing

## Error Handling

**Strategy:** Catch-and-return at API route boundaries; client shows inline error messages with retry

**Patterns:**
- All API routes wrap logic in `try/catch`; `SquareError` status is passed through, all others return 500
- `logError` in `lib/logger.ts` logs structured error objects to `console.error` with `requestId`
- Every route generates or propagates an `x-request-id` header for tracing
- Client hooks (`useFrozenItems`) catch fetch errors and expose `error: string` to components
- `CheckoutClient` catches submission errors and shows inline error text with a retry button

## Cross-Cutting Concerns

**Logging:** `logError` in `lib/logger.ts` — structured `console.error` with `requestId`, message, and error details. Server-side only.

**Validation:** Zod schemas defined inline in API route files (`app/api/checkout/route.ts`, `app/api/dev/set-inventory/route.ts`). No shared schema registry.

**Authentication:** None for customer-facing routes. Dev inventory endpoint is guarded by `env.environment !== "sandbox"` check only — no auth token.

**Idempotency:** `newIdempotencyKey()` in `lib/idempotency.ts` generates a fresh UUID per Square mutation call. Each checkout creates three separate idempotency keys (customer create, order create, invoice create).

---

*Architecture analysis: 2026-04-03*
