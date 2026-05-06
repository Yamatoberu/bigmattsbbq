# Coding Conventions

**Analysis Date:** 2026-04-03

## Naming Patterns

**Files:**
- React components: PascalCase, `.tsx` extension — `FrozenItemCard.tsx`, `CheckoutClient.tsx`, `CartContext.tsx`
- Hooks: camelCase with `use` prefix, `.ts` extension — `useFrozenItems.ts`
- Lib modules: camelCase, `.ts` extension — `cart.ts`, `normalizers.ts`, `idempotency.ts`
- API routes: Next.js convention `route.ts` inside named directories — `app/api/checkout/route.ts`
- Config/constants modules: camelCase — `config.ts`, `env.ts`

**Functions:**
- Exported utility functions: camelCase verb phrase — `joinInventoryCounts`, `resolvePackageToCartItems`, `formatMoney`, `getSquareEnv`
- React components: PascalCase — `FrozenItemCard`, `CartProvider`, `CheckoutClient`
- Custom hooks: camelCase `use` prefix — `useFrozenItems`, `useCart`
- Private helpers: camelCase, module-scoped (not exported) — `normalizeMatch`, `squareFetch`
- Event handlers: `handle` prefix for form events — `handleSubmit`

**Variables:**
- camelCase throughout — `frozenItems`, `variationMap`, `cartDetails`, `estimatedTotalCents`
- Boolean state variables: descriptive `is` prefix — `isReady`, `isLoading`, `isSubmitting`, `isSoldOut`
- Constants/config arrays: SCREAMING_SNAKE_CASE — `PACKAGES`, `PICKUP_OPTIONS`, `STORAGE_KEY`, `SQUARE_VERSION`

**Types and Interfaces:**
- Interfaces: PascalCase with meaningful suffix — `FrozenItemDTO`, `CartItem`, `PackageConfig`, `SquareEnv`
- DTO suffix for data-transfer objects from external APIs — `FrozenItemDTO`, `VariationDTO`
- Props interfaces: PascalCase component name + `Props` — `FrozenItemCardProps`, `CheckoutClientProps`, `PackageCardProps`
- Internal-only interfaces: declared without export — `InventoryCount`, `SquareFetchOptions`, `FrozenItemsState`

**Enums / Union Types:**
- String literal unions preferred over enums — `"sandbox" | "production"`, `"Preston" | "Orem"`

## Code Style

**Formatting:**
- 2-space indentation (enforced via `.editorconfig`)
- UTF-8 charset
- Final newline required
- Trailing whitespace trimmed
- No dedicated Prettier config file — formatting relies on editor config and TypeScript compiler settings

**Linting:**
- No ESLint config file present; `next lint` is available in scripts but no custom rules configured
- TypeScript `strict: true` in `tsconfig.json` — the primary quality enforcement mechanism
- `allowJs: false` — no JavaScript files in source

**Language:**
- TypeScript ES2022 target
- `isolatedModules: true` — each file compiles independently; no const enums
- `esModuleInterop: true`

## Import Organization

**Order (observed pattern):**
1. Framework/library imports (`next/server`, `react`, `zod`)
2. Internal lib imports (`../../lib/cart`, `../../../lib/env`)
3. Internal component imports (`./cart/CartContext`, `./hooks/useFrozenItems`)

**Path Style:**
- Relative paths used throughout — no path aliases configured (no `@/` or `~` shortcuts)
- Imports from `lib/` referenced with relative `../lib/` or `../../lib/` depending on nesting depth

**Re-exports:**
- `lib/cart.ts` re-exports `CartItem` from `lib/types.ts` via `export type { CartItem }` for convenience

## Error Handling

**API Routes (server-side):**
- All route handlers wrap logic in a single top-level `try/catch`
- `logError` called with message, error object, and `requestId` before returning
- `SquareError` checked with `instanceof` to propagate the correct HTTP status code
- Pattern:
  ```typescript
  } catch (error) {
    logError("Checkout failed", error, requestId);
    const status = error instanceof SquareError ? error.status : 500;
    return NextResponse.json({ error: "...", requestId }, { status });
  }
  ```

**Client-side (hooks/components):**
- `error instanceof Error ? error.message : "fallback message"` pattern used consistently
- Error state stored as `string | undefined` — `undefined` means no error
- `fetch` response errors converted to `Error` objects via `throw new Error(payload.error || "fallback")`

**Validation:**
- Zod `safeParse` used at API boundaries — never `parse` (which throws)
- Invalid payloads return 400 with `{ error: "...", requestId }`

**Environment variables:**
- `getSquareEnv()` in `lib/env.ts` throws descriptive `Error` when required vars are missing
- Called once at top of each route handler, not cached globally

## Logging

**Function:** `logError` in `lib/logger.ts`

**Pattern:**
```typescript
logError("Checkout failed", error, requestId);
// outputs: { requestId, message, name, message, stack } via console.error
```

**Usage:** Called only in route handlers on caught errors. No info-level logging.

## Comments

**Usage:** Minimal — code is written to be self-documenting through naming
- No JSDoc comments anywhere in source
- No inline explanatory comments in production code
- `// @ts-ignore` only appears in generated `.next/` files, never in source

## Function Design

**Parameters:** Complex functions use a single params object (not positional args) for readability:
```typescript
export async function searchCatalogItems(params: {
  host: string;
  accessToken: string;
  categoryId: string;
  requestId?: string;
})
```

**Return Types:** Inferred except where explicit typing adds clarity (e.g. typed generic on `squareFetch<T>`)

**Async:** `async/await` throughout — no `.then()` chains

**Functional style in lib:** Pure functions preferred; no classes except `SquareError` (extends `Error`)

## Module Design

**Exports:**
- Named exports used everywhere — no default exports in `lib/` or `components/`
- Exception: Next.js page/layout files use default exports per framework convention

**Class usage:** Single custom class `SquareError extends Error` in `lib/square.ts` — used as a typed error carrier

**Barrel files:** Not used — no `index.ts` re-export files

## React Conventions

**Client components:** Declared with `"use client"` directive at top of file — `CartContext.tsx`, `OrderLanding.tsx`, `CheckoutClient.tsx`, `useFrozenItems.ts`

**Server components:** No directive needed — `app/page.tsx`, `app/layout.tsx`, `FrozenItemCard.tsx`, `PackageCard.tsx` are server components by default

**State grouping:** Related form fields grouped into single state object:
```typescript
const [formState, setFormState] = useState({ firstName: "", lastName: "", email: "", phone: "" });
```

**`useMemo` usage:** Used for expensive derivations from props/state (variation maps, sauce ID sets, cart details)

**`useCallback`:** Used when the callback is a dependency of `useEffect` — `useFrozenItems.ts`

**Void operator:** `void load()` used to explicitly discard a Promise in `useEffect` without `async` effect body

---

*Convention analysis: 2026-04-03*
