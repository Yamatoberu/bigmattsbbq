---
phase: 260507-bcm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/CheckoutClient.tsx
autonomous: true
requirements:
  - QUICK-260507-bcm-01
must_haves:
  truths:
    - "Bundle line items in the checkout Order Summary display the correct per-unit price (sum of resolved variation prices), not $0.00"
    - "Bundle line items in the checkout Order Summary continue to display the bundle name (no regression of prior fix)"
    - "Estimated total in checkout reflects bundle price * quantity (not just non-bundle items)"
    - "Existing single-variation cart items continue to render their name and price unchanged"
  artifacts:
    - path: "components/CheckoutClient.tsx"
      provides: "bundleVariationIdToInfo map (name + priceCents + currency) used as fallback in cartDetails"
      contains: "bundleVariationIdToInfo"
  key_links:
    - from: "components/CheckoutClient.tsx (cartDetails)"
      to: "bundleVariationIdToInfo map"
      via: "Map.get(item.variationId) fallback for name and priceCents/currency"
      pattern: "bundleVariationIdToInfo\\.get"
    - from: "components/CheckoutClient.tsx (bundleVariationIdToInfo useMemo)"
      to: "lib/cart.ts resolvePackageToCartItems"
      via: "import + call per package to resolve variation IDs, then sum priceCents from variationMap"
      pattern: "resolvePackageToCartItems\\("
---

<objective>
Fix the checkout Order Summary so bundle line items display their actual price (sum of underlying variation prices) instead of $0.00. The bundle name fix landed previously (quick task 260506-u3i); price still falls back to 0 because `variationMap` only contains frozen-category catalog variations and bundle variation IDs are outside that category.

Purpose: Customers reviewing their cart at checkout see correct pricing for bundles, restoring trust and accurate totals.
Output: Updated `components/CheckoutClient.tsx` with a `bundleVariationIdToInfo` map (name + priceCents + currency) computed from `resolvePackageToCartItems` + `variationMap`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/CheckoutClient.tsx
@lib/cart.ts
@lib/config.ts
@lib/types.ts

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from codebase. -->

From lib/cart.ts:
```typescript
export function resolvePackageToCartItems(
  packageConfig: PackageConfig,
  items: FrozenItemDTO[]
): CartItem[]
// Returns CartItem[] = [{ variationId, quantity }, ...] with the underlying
// frozen-category variation IDs that compose the bundle.
```

From lib/types.ts:
```typescript
export interface PackageConfig {
  id: string;
  name: string;
  // ...
  bundleVariationId?: string;   // The Square variation ID representing the bundle SKU
  items: PackageItemConfig[];   // Underlying items resolved by name/variationId
}
```

Existing variationMap shape in CheckoutClient.tsx (line 36-48):
```typescript
const variationMap: Map<string, { name: string; priceCents: number; currency: string }>
// Built from frozenItems (frozen-category catalog only).
// Bundle variation IDs are NOT keys in this map.
```

Existing (to be replaced) bundleVariationIdToName (line 50-58):
```typescript
const bundleVariationIdToName: Map<string, string>
```

cartDetails consumer (line 106-115):
```typescript
const cartDetails = items.map((item) => {
  const info = variationMap.get(item.variationId);
  const bundleName = bundleVariationIdToName.get(item.variationId);
  return {
    ...item,
    name: info?.name ?? bundleName ?? "Item",
    priceCents: info?.priceCents ?? 0,    // <-- bug: bundles fall through to 0
    currency: info?.currency ?? "USD"
  };
});
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace bundleVariationIdToName with bundleVariationIdToInfo (name + priceCents + currency)</name>
  <files>components/CheckoutClient.tsx</files>
  <action>
1. Update the import on line 8 from:
   `import { isSauceBumpNeeded } from "../lib/cart";`
   to:
   `import { isSauceBumpNeeded, resolvePackageToCartItems } from "../lib/cart";`

2. Replace the `bundleVariationIdToName` useMemo block (lines 50-58) with a new `bundleVariationIdToInfo` useMemo that depends on `[frozenItems, variationMap]`. For each `pkg` in `PACKAGES` where `pkg.bundleVariationId` is set:
   - Call `resolvePackageToCartItems(pkg, frozenItems)` to get the underlying `CartItem[]`.
   - For each resolved cart item, look up its variation in `variationMap`. If found, accumulate `info.priceCents * resolvedItem.quantity` into a running `priceCents` total, and capture `info.currency` from the first found variation (default to "USD" if none resolved).
   - Store an entry: `map.set(pkg.bundleVariationId, { name: pkg.name, priceCents, currency })`.
   - If `frozenItems` is empty (still loading) or no variations resolve, still set the entry with whatever was computed (priceCents may be 0 transiently while items load — that's fine; the memo recomputes when `frozenItems` populates).

   Resulting type: `Map<string, { name: string; priceCents: number; currency: string }>`.

3. Update `cartDetails` (lines 106-115) to use the new map. Replace the bundle lookup so:
   - `name: info?.name ?? bundleInfo?.name ?? "Item"`
   - `priceCents: info?.priceCents ?? bundleInfo?.priceCents ?? 0`
   - `currency: info?.currency ?? bundleInfo?.currency ?? "USD"`
   Where `bundleInfo = bundleVariationIdToInfo.get(item.variationId)`.

4. Do not modify `productNameMap`, `sauceVariationIds`, `sauceAddVariationId`, or any other logic. Do not change the cart payload sent to `/api/checkout` (server-side pricing is authoritative; this fix is display-only).

Why this approach: Bundle variation IDs are outside the frozen category, so `variationMap` cannot include them. Computing bundle price from the resolved underlying variations keeps a single source of truth (the live frozen catalog) and naturally tracks price changes without hardcoding bundle prices in `lib/config.ts`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run test</automated>
  </verify>
  <done>
- `components/CheckoutClient.tsx` imports `resolvePackageToCartItems` from `../lib/cart`.
- `bundleVariationIdToInfo` useMemo exists and replaces `bundleVariationIdToName`.
- `cartDetails` uses `bundleVariationIdToInfo` as the fallback for both `name` and `priceCents`/`currency`.
- `npx tsc --noEmit` passes (no type errors).
- `npm run test` passes (all 3 existing test files still green).
- No other files modified.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification in dev server</name>
  <what-built>
Bundle price now computed dynamically in `CheckoutClient`'s Order Summary by summing the prices of the underlying variations resolved via `resolvePackageToCartItems`.
  </what-built>
  <how-to-verify>
1. Run `npm run dev` and open `http://localhost:3000`.
2. From the landing page, add one of the bundle packages (Family Night, Backyard Host, or Freezer Filler) to the cart.
3. Navigate to `/checkout`.
4. In the "Order Summary" card, confirm the bundle row shows:
   - The bundle name (e.g., "Family Night") — not "Item".
   - A non-zero "$X.XX each" price below the name.
   - The "Estimated total" at the bottom matches `bundle price * quantity` (plus any other items).
5. Increment/decrement quantity with the +/- buttons and confirm the estimated total updates correctly.
6. Add a non-bundle frozen item (e.g., Pulled Pork 0.5 lb) alongside the bundle and confirm both rows show correct names and prices, and the total sums them.
  </how-to-verify>
  <resume-signal>Type "approved" if bundle price displays correctly, or describe what you see (price still $0, wrong total, regression on non-bundle items, etc.).</resume-signal>
</task>

</tasks>

<verification>
- Type check: `npx tsc --noEmit` exits 0.
- Test suite: `npm run test` passes all 3 existing test files (no new tests required — this is a display-layer fix in a client component; logic touched is React state derivation, not lib code).
- Manual: Bundle row in checkout Order Summary shows non-zero price; estimated total includes bundle.
- No regression: Non-bundle items still render correct name + price; bundle name (from prior 260506-u3i fix) still shows.
</verification>

<success_criteria>
- Adding a bundle to the cart and visiting `/checkout` shows the bundle's correct per-unit price (sum of underlying variation prices) instead of $0.00.
- Estimated total reflects bundle price * quantity.
- All existing tests pass; no TypeScript errors.
- No changes to API payload or server behavior — fix is display-only in the client component.
</success_criteria>

<output>
After completion, create `.planning/quick/260507-bcm-fix-bundle-price-showing-zero-in-checkou/260507-bcm-SUMMARY.md`
</output>
