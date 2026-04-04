# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Next.js lint
npm run test         # Run all Vitest tests (single run)
npm run test:watch   # Vitest in watch mode
npx vitest run tests/<filename>.test.ts  # Run a single test file
```

## Architecture

**Big Matt's BBQ** is a Next.js 16 App Router e-commerce sales funnel for frozen BBQ products. There is no database — all catalog, inventory, and payment data flows through the Square API.

### Data Flow

1. **Item browsing**: `useFrozenItems` hook fetches `GET /api/frozen-items`, which calls Square's Catalog + Inventory APIs and returns `FrozenItemDTO[]` with live stock counts via `joinInventoryCounts()` in `lib/normalizers.ts`.
2. **Cart**: `CartContext` (`components/cart/CartContext.tsx`) persists `CartItem[]` to localStorage under `big-matts-bbq-cart`.
3. **Checkout**: `POST /api/checkout` validates the request with Zod, creates/looks up a Square customer, creates a Square order and invoice, and emails the invoice to the buyer.

### Key Library Files

| File | Purpose |
|------|---------|
| `lib/types.ts` | All shared TypeScript interfaces (`FrozenItemDTO`, `CartItem`, `VariationDTO`, etc.) |
| `lib/config.ts` | Pre-configured packages and pickup options (dates/locations live here) |
| `lib/square.ts` | All Square API calls; API version is pinned at the top of this file |
| `lib/cart.ts` | `resolvePackageToCartItems()` maps config packages to variation IDs; `isSauceBumpNeeded()` auto-adds sauce |
| `lib/normalizers.ts` | `joinInventoryCounts()` joins catalog items with Square inventory counts |
| `lib/env.ts` | Validates required environment variables at startup |

### Environment Variables

All required vars are listed in `.env.example`. Key ones:
- `SQUARE_ENV` — `sandbox` or `production`
- `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_FROZEN_CATEGORY_ID`
- `SQUARE_SAUCE_VARIATION_ID` — the variation ID used by the sauce-bump logic

### Tailwind Theme

Custom color palettes `ember` (warm orange-red) and `smoke` (dark browns) are defined in `tailwind.config.ts`. Custom shadows: `soft`, `glow`. Fonts: Playfair Display (`--font-display`) and Source Sans 3 (`--font-body`).

### Tests

Three test files in `tests/` cover inventory join logic, package-to-cart-item mapping, and sauce bump logic. They run in a Node environment via Vitest.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Big Matt's BBQ — Website Refresh & Frozen Drops**

A mobile-first website for Big Matt's BBQ that serves as a sales funnel for limited-run frozen BBQ drops and a catering presence. Customers preorder frozen BBQ products (sold in 0.5 lb bags), select a pickup location, and receive a Square invoice via email. The site also captures mailing list subscribers for drop notifications and provides static catering/about/contact pages.

**Core Value:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

### Constraints

- **Tech stack**: Next.js App Router, TypeScript, Tailwind CSS — already established
- **Payment**: Square invoices (keep existing integration) — no new payment processing
- **Inventory**: Square Inventory API remains source of truth — no migration to Supabase
- **Database**: Supabase (Postgres) for new data models (drops, orders, mailing list, email logs)
- **Email**: Resend for transactional and mailing list emails
- **Hosting**: Vercel (implicit from Next.js stack)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.5 - All source files (`app/`, `components/`, `lib/`)
- TSX - React component files (`components/**/*.tsx`, `app/**/*.tsx`)
- CSS - Global styles (`app/globals.css`)
- JavaScript allowed: `false` (`allowJs: false` in `tsconfig.json`)
## Runtime
- Node.js v24.8.0
- npm 11.12.1
- Lockfile: `package-lock.json` present
## Frameworks
- Next.js ^16.1.6 - Full-stack React framework; App Router with Server Components and API Routes
- React 18.3.1 - UI rendering; used with `react-dom` 18.3.1
- React Strict Mode: enabled (`reactStrictMode: true` in `next.config.js`)
- Tailwind CSS ^3.4.13 - Utility-first CSS
- PostCSS ^8.4.45 with Autoprefixer ^10.4.20 - CSS processing pipeline
- Config: `tailwind.config.ts`, `postcss.config.js`
- Zod ^3.24.2 - Runtime schema validation for API request bodies
- Vitest ^4.0.18 - Unit test runner
- Test environment: `node` (not jsdom)
- Config: `vitest.config.ts`
- TypeScript Compiler - via Next.js bundler (`moduleResolution: bundler`)
- Target: `ES2022`
## Key Dependencies
- `next` ^16.1.6 - Application framework; drives routing, API routes, server rendering
- `zod` ^3.24.2 - Request validation at all API endpoints; central to input safety
- `next/font/google` - Google Fonts loaded at build time (Playfair Display, Source Sans 3)
- Node built-in `crypto.randomUUID()` - Used for idempotency keys and request IDs (no external package needed)
## Configuration
- Configured via `.env.local` (present, not committed)
- Template documented at `.env.example`
- Loaded via `lib/env.ts` which validates and throws on missing required vars
- Required vars: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_FROZEN_CATEGORY_ID`, `SQUARE_SAUCE_VARIATION_ID`
- Optional vars with defaults: `SQUARE_HOST` (defaults to `https://connect.squareup.com`), `SQUARE_ENV` (defaults to `sandbox`)
- `next.config.js` - Minimal config; strict mode enabled
- `tsconfig.json` - Strict TypeScript; ES2022 target; `vitest/globals` types included
- `tailwind.config.ts` - Custom `ember` (orange/red) and `smoke` (dark brown) color palettes; custom shadows and gradients
## API Routes
- `app/api/frozen-items/route.ts` - GET
- `app/api/checkout/route.ts` - POST
- `app/api/dev/set-inventory/route.ts` - POST (sandbox only)
## Platform Requirements
- Node.js 24.x
- npm 11.x
- Square sandbox credentials in `.env.local`
- Node.js-capable hosting (not edge-compatible; runtime explicitly set to `nodejs`)
- Square production credentials
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase, `.tsx` extension — `FrozenItemCard.tsx`, `CheckoutClient.tsx`, `CartContext.tsx`
- Hooks: camelCase with `use` prefix, `.ts` extension — `useFrozenItems.ts`
- Lib modules: camelCase, `.ts` extension — `cart.ts`, `normalizers.ts`, `idempotency.ts`
- API routes: Next.js convention `route.ts` inside named directories — `app/api/checkout/route.ts`
- Config/constants modules: camelCase — `config.ts`, `env.ts`
- Exported utility functions: camelCase verb phrase — `joinInventoryCounts`, `resolvePackageToCartItems`, `formatMoney`, `getSquareEnv`
- React components: PascalCase — `FrozenItemCard`, `CartProvider`, `CheckoutClient`
- Custom hooks: camelCase `use` prefix — `useFrozenItems`, `useCart`
- Private helpers: camelCase, module-scoped (not exported) — `normalizeMatch`, `squareFetch`
- Event handlers: `handle` prefix for form events — `handleSubmit`
- camelCase throughout — `frozenItems`, `variationMap`, `cartDetails`, `estimatedTotalCents`
- Boolean state variables: descriptive `is` prefix — `isReady`, `isLoading`, `isSubmitting`, `isSoldOut`
- Constants/config arrays: SCREAMING_SNAKE_CASE — `PACKAGES`, `PICKUP_OPTIONS`, `STORAGE_KEY`, `SQUARE_VERSION`
- Interfaces: PascalCase with meaningful suffix — `FrozenItemDTO`, `CartItem`, `PackageConfig`, `SquareEnv`
- DTO suffix for data-transfer objects from external APIs — `FrozenItemDTO`, `VariationDTO`
- Props interfaces: PascalCase component name + `Props` — `FrozenItemCardProps`, `CheckoutClientProps`, `PackageCardProps`
- Internal-only interfaces: declared without export — `InventoryCount`, `SquareFetchOptions`, `FrozenItemsState`
- String literal unions preferred over enums — `"sandbox" | "production"`, `"Preston" | "Orem"`
## Code Style
- 2-space indentation (enforced via `.editorconfig`)
- UTF-8 charset
- Final newline required
- Trailing whitespace trimmed
- No dedicated Prettier config file — formatting relies on editor config and TypeScript compiler settings
- No ESLint config file present; `next lint` is available in scripts but no custom rules configured
- TypeScript `strict: true` in `tsconfig.json` — the primary quality enforcement mechanism
- `allowJs: false` — no JavaScript files in source
- TypeScript ES2022 target
- `isolatedModules: true` — each file compiles independently; no const enums
- `esModuleInterop: true`
## Import Organization
- Relative paths used throughout — no path aliases configured (no `@/` or `~` shortcuts)
- Imports from `lib/` referenced with relative `../lib/` or `../../lib/` depending on nesting depth
- `lib/cart.ts` re-exports `CartItem` from `lib/types.ts` via `export type { CartItem }` for convenience
## Error Handling
- All route handlers wrap logic in a single top-level `try/catch`
- `logError` called with message, error object, and `requestId` before returning
- `SquareError` checked with `instanceof` to propagate the correct HTTP status code
- Pattern:
- `error instanceof Error ? error.message : "fallback message"` pattern used consistently
- Error state stored as `string | undefined` — `undefined` means no error
- `fetch` response errors converted to `Error` objects via `throw new Error(payload.error || "fallback")`
- Zod `safeParse` used at API boundaries — never `parse` (which throws)
- Invalid payloads return 400 with `{ error: "...", requestId }`
- `getSquareEnv()` in `lib/env.ts` throws descriptive `Error` when required vars are missing
- Called once at top of each route handler, not cached globally
## Logging
## Comments
- No JSDoc comments anywhere in source
- No inline explanatory comments in production code
- `// @ts-ignore` only appears in generated `.next/` files, never in source
## Function Design
## Module Design
- Named exports used everywhere — no default exports in `lib/` or `components/`
- Exception: Next.js page/layout files use default exports per framework convention
## React Conventions
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Next.js 14 App Router — pages in `app/`, each page delegates immediately to a client component
- API routes (`app/api/`) act as a thin orchestration layer over a single external service (Square)
- All Square API calls are centralized in `lib/square.ts`; routes never call Square directly
- Client state is limited to cart (localStorage-backed Context) and local form/UI state
- No database — Square is the sole source of truth for catalog, inventory, customers, and orders
## Layers
- Purpose: Next.js route entry points; minimal logic, wires server-side env to client components
- Location: `app/`
- Contains: `page.tsx`, `layout.tsx`, `providers.tsx`, route-level page files
- Depends on: Components, `lib/env.ts`
- Used by: Next.js router
- Purpose: Validate requests, orchestrate Square API calls, return normalized JSON
- Location: `app/api/`
- Contains: `route.ts` files for `GET /api/frozen-items`, `POST /api/checkout`, `POST /api/dev/set-inventory`
- Depends on: `lib/square.ts`, `lib/env.ts`, `lib/normalizers.ts`, `lib/idempotency.ts`, `lib/logger.ts`
- Used by: Client components via `fetch()`
- Purpose: All UI rendering and client-side interactivity
- Location: `components/`
- Contains: Page-level composite components, card components, layout elements, cart context, hooks
- Depends on: `lib/cart.ts`, `lib/config.ts`, `lib/format.ts`, `lib/types.ts`
- Used by: `app/` page files
- Purpose: Shared logic, types, utilities, and the Square API client
- Location: `lib/`
- Contains: `square.ts` (API client + mappers), `types.ts`, `config.ts`, `cart.ts`, `normalizers.ts`, `env.ts`, `format.ts`, `idempotency.ts`, `logger.ts`
- Depends on: Node.js runtime, environment variables
- Used by: API routes and components
## Data Flow
- Cart state lives in `CartContext` (`components/cart/CartContext.tsx`), persisted to `localStorage` under key `big-matts-bbq-cart`
- Frozen item catalog is fetched fresh on each page load (no caching, `cache: "no-store"`)
- No global server state; no database
## Key Abstractions
- Purpose: Normalized representation of a Square catalog item with inventory counts
- Definition: `lib/types.ts`
- Created by: `mapCatalogToFrozenItems` + `joinInventoryCounts` in `lib/square.ts` and `lib/normalizers.ts`
- Consumed by: `OrderLanding`, `FrozenItemCard`, `CheckoutClient`, `useFrozenItems`
- Purpose: Minimal cart entry — just `variationId` and `quantity`
- Definition: `lib/types.ts`
- Managed by: `CartContext` with `mergeCartItems` logic in `lib/cart.ts`
- Sent as-is to `POST /api/checkout`
- Purpose: Static configuration for preset bundles; items resolved against live catalog by name-matching
- Definition: `lib/types.ts`
- Data: Hardcoded in `lib/config.ts`
- Resolved to `CartItem[]` by: `resolvePackageToCartItems` in `lib/cart.ts`
- Purpose: Validated set of Square credentials and configuration loaded from environment
- Definition: `lib/env.ts`
- Obtained via: `getSquareEnv()` — throws on missing vars
- Purpose: Typed error wrapping Square API failures, carries HTTP status and response body
- Definition: `lib/square.ts`
- Used by: All API routes to pass Square's status code through to the client
## Entry Points
- Location: `app/page.tsx`
- Triggers: Next.js router on `/`
- Responsibilities: Renders `<OrderLanding />` — delegates entirely to the component
- Location: `app/layout.tsx`
- Triggers: Every page
- Responsibilities: Sets fonts, wraps all pages in `<Providers>` (which wraps in `<CartProvider>`)
- Location: `app/checkout/page.tsx`
- Triggers: Navigation to `/checkout`
- Responsibilities: Server-side reads `sauceVariationId` from env, passes to `<CheckoutClient>`; marked `force-dynamic`
- Location: `app/confirmation/page.tsx`
- Triggers: Redirect after successful checkout
- Responsibilities: Reads `orderId` and `pickupNote` from query params, displays success state
- Location: `app/orders/page.tsx`
- Triggers: Navigation to `/orders`
- Responsibilities: Stub placeholder — "coming soon" UI only
- Location: `app/api/frozen-items/route.ts`
- Triggers: `GET /api/frozen-items`
- Responsibilities: Fetch and merge Square catalog + inventory, return `FrozenItemDTO[]`
- Location: `app/api/checkout/route.ts`
- Triggers: `POST /api/checkout`
- Responsibilities: Validate body, upsert Square customer, create order + invoice, publish invoice
- Location: `app/api/dev/set-inventory/route.ts`
- Triggers: `POST /api/dev/set-inventory`
- Responsibilities: Sandbox-only; directly sets Square inventory counts for testing
## Error Handling
- All API routes wrap logic in `try/catch`; `SquareError` status is passed through, all others return 500
- `logError` in `lib/logger.ts` logs structured error objects to `console.error` with `requestId`
- Every route generates or propagates an `x-request-id` header for tracing
- Client hooks (`useFrozenItems`) catch fetch errors and expose `error: string` to components
- `CheckoutClient` catches submission errors and shows inline error text with a retry button
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
