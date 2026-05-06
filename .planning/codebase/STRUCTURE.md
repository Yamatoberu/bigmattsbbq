# Codebase Structure

**Analysis Date:** 2026-04-03

## Directory Layout

```
BigMattsBbq/
├── app/                        # Next.js App Router — pages and API routes
│   ├── layout.tsx              # Root layout: fonts, Providers wrapper
│   ├── page.tsx                # Home route → renders OrderLanding
│   ├── providers.tsx           # Client boundary: wraps CartProvider
│   ├── globals.css             # Global styles, Tailwind base, custom CSS
│   ├── api/
│   │   ├── frozen-items/
│   │   │   └── route.ts        # GET /api/frozen-items
│   │   ├── checkout/
│   │   │   └── route.ts        # POST /api/checkout
│   │   └── dev/
│   │       └── set-inventory/
│   │           └── route.ts    # POST /api/dev/set-inventory (sandbox only)
│   ├── checkout/
│   │   └── page.tsx            # /checkout page
│   ├── confirmation/
│   │   └── page.tsx            # /confirmation page (post-order)
│   └── orders/
│       └── page.tsx            # /orders page (stub, coming soon)
├── components/                 # All React components
│   ├── cart/
│   │   └── CartContext.tsx     # CartProvider + useCart hook
│   ├── hooks/
│   │   └── useFrozenItems.ts   # Data-fetching hook for /api/frozen-items
│   ├── OrderLanding.tsx        # Home page composite component
│   ├── CheckoutClient.tsx      # Checkout page client component
│   ├── CartSummary.tsx         # Cart count + total + CTA bar
│   ├── NavBar.tsx              # Sticky top nav with cart badge
│   ├── FrozenItemCard.tsx      # Individual item card (build your own)
│   ├── PackageCard.tsx         # Preset bundle card
│   ├── SectionHeader.tsx       # Eyebrow + title + subtitle block
│   ├── Testimonials.tsx        # Social proof section
│   ├── Faq.tsx                 # FAQ accordion section
│   ├── CateringSection.tsx     # Catering info section
│   └── Footer.tsx              # Page footer
├── lib/                        # Shared logic and utilities
│   ├── types.ts                # All shared TypeScript interfaces/types
│   ├── config.ts               # Static data: PACKAGES, PICKUP_OPTIONS
│   ├── env.ts                  # getSquareEnv() — reads + validates env vars
│   ├── square.ts               # Square API client + catalog/inventory mappers
│   ├── normalizers.ts          # joinInventoryCounts — merges inventory into items
│   ├── cart.ts                 # mergeCartItems, resolvePackageToCartItems, isSauceBumpNeeded
│   ├── format.ts               # formatMoney — Intl.NumberFormat helper
│   ├── idempotency.ts          # newIdempotencyKey — crypto.randomUUID wrapper
│   └── logger.ts               # logError — structured console.error
├── tests/                      # Unit tests (Vitest)
│   ├── inventoryJoin.test.ts
│   ├── packageMapping.test.ts
│   └── sauceBump.test.ts
├── public/                     # Static assets
│   ├── logo.png
│   └── smoke.png
├── .planning/                  # GSD planning documents
│   └── codebase/
├── next.config.js              # Next.js config (reactStrictMode only)
├── tailwind.config.ts          # Tailwind config with custom design tokens
├── postcss.config.js           # PostCSS config
├── tsconfig.json               # TypeScript config (strict, ES2022)
├── vitest.config.ts            # Vitest config
├── package.json
└── CLAUDE.md                   # Project context for Claude
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Page components (thin wrappers), root layout, global CSS, API route handlers
- Key files: `layout.tsx`, `page.tsx`, `providers.tsx`, `globals.css`

**`app/api/`:**
- Purpose: Backend API endpoints — all server-side Square API orchestration
- Contains: `route.ts` files only, one per endpoint
- Key files: `app/api/frozen-items/route.ts`, `app/api/checkout/route.ts`

**`components/`:**
- Purpose: All React UI components, both client and server
- Contains: Composite page components, UI primitives, cart context, data-fetching hooks
- Key files: `OrderLanding.tsx`, `CheckoutClient.tsx`, `cart/CartContext.tsx`

**`components/cart/`:**
- Purpose: Cart state management
- Contains: `CartContext.tsx` — provider + `useCart` hook + localStorage persistence

**`components/hooks/`:**
- Purpose: Custom data-fetching hooks
- Contains: `useFrozenItems.ts` — fetches and manages `FrozenItemDTO[]` state

**`lib/`:**
- Purpose: Pure logic, utilities, types, and the Square API client
- Contains: Shared TypeScript — no React, no Next.js imports (except `lib/env.ts` reads `process.env`)
- Key files: `square.ts`, `types.ts`, `config.ts`, `cart.ts`

**`tests/`:**
- Purpose: Unit tests for pure lib functions
- Contains: Vitest test files covering `joinInventoryCounts`, `resolvePackageToCartItems`, `isSauceBumpNeeded`

**`public/`:**
- Purpose: Static files served at root URL
- Contains: `logo.png`, `smoke.png`
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout, font loading, CartProvider setup
- `app/page.tsx`: Home route
- `app/checkout/page.tsx`: Checkout page, reads `sauceVariationId` from env
- `app/confirmation/page.tsx`: Post-order success page

**Configuration:**
- `lib/config.ts`: Hardcoded package definitions (`PACKAGES`) and pickup options (`PICKUP_OPTIONS`)
- `lib/env.ts`: Square environment variable reading and validation
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind custom tokens (colors, spacing, utilities)

**Core Logic:**
- `lib/square.ts`: All Square API calls — `searchCatalogItems`, `batchRetrieveInventoryCounts`, `createOrder`, `createInvoice`, `publishInvoice`, `searchCustomerByEmail`, `createCustomer`, `batchSetInventoryCounts`; also `mapCatalogToFrozenItems`, `extractVariationIds`
- `lib/cart.ts`: `mergeCartItems`, `resolvePackageToCartItems`, `isSauceBumpNeeded`
- `lib/normalizers.ts`: `joinInventoryCounts`
- `lib/types.ts`: All shared interfaces — `FrozenItemDTO`, `VariationDTO`, `CartItem`, `PackageConfig`, `CheckoutRequestBody`, `CheckoutResponseBody`, `PickupOption`

**Testing:**
- `tests/inventoryJoin.test.ts`: Tests for `joinInventoryCounts`
- `tests/packageMapping.test.ts`: Tests for `resolvePackageToCartItems`
- `tests/sauceBump.test.ts`: Tests for `isSauceBumpNeeded`
- `vitest.config.ts`: Test runner configuration

## Naming Conventions

**Files:**
- React components: PascalCase, `.tsx` — e.g., `OrderLanding.tsx`, `CheckoutClient.tsx`
- Hooks: camelCase with `use` prefix, `.ts` — e.g., `useFrozenItems.ts`
- Lib utilities: camelCase, `.ts` — e.g., `cart.ts`, `normalizers.ts`
- API routes: always named `route.ts`, directory name defines the path
- Test files: camelCase, `.test.ts` suffix — e.g., `sauceBump.test.ts`

**Directories:**
- App routes: camelCase matching URL segment — e.g., `checkout/`, `frozen-items/`
- Component subdirectories: camelCase by concern — `cart/`, `hooks/`

## Where to Add New Code

**New Page Route:**
- Add directory under `app/` matching the URL: `app/new-page/`
- Page file: `app/new-page/page.tsx`
- If client-heavy, create a client component in `components/` and render it from the page

**New API Endpoint:**
- Add directory under `app/api/`: `app/api/new-endpoint/`
- Route file: `app/api/new-endpoint/route.ts`
- Import Square helpers from `lib/square.ts`, env from `lib/env.ts`
- Use Zod for request validation inline in the route file

**New UI Component:**
- Add to `components/` as a PascalCase `.tsx` file
- If it needs cart access: import `useCart` from `components/cart/CartContext`
- If it fetches `/api/frozen-items`: use `useFrozenItems` from `components/hooks/useFrozenItems.ts`

**New Data-Fetching Hook:**
- Add to `components/hooks/` as `useXxx.ts`

**New Shared Type:**
- Add interface/type to `lib/types.ts`

**New Square API Operation:**
- Add function to `lib/square.ts` using the internal `squareFetch` helper

**New Utility Function:**
- If cart-related: add to `lib/cart.ts`
- If formatting: add to `lib/format.ts`
- Otherwise: add to the most relevant existing `lib/` file or create a new one

**New Static Config:**
- Add to `lib/config.ts` if it's product/business data (packages, pickup options, etc.)

**New Unit Test:**
- Add to `tests/` as `camelCaseName.test.ts`
- Tests cover pure `lib/` functions only; no component rendering tests currently

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD commands
- Committed: Yes

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-03*
