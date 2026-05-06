---
slug: fix-package-config-names
created: 2026-05-01
status: in-progress
---

# Fix Package Config Name Mismatches

Update `lib/config.ts` so `resolvePackageToCartItems` can match Square catalog items correctly.

## Changes

1. All `variationName: "1/2 lb bag"` → `"Regular"` (keep `displayVariationName` for UI)
2. All `variationName: "Bottle"` → `"Regular"` (keep `displayVariationName` for UI)
3. All `itemName: "BBQ Sauce"` → `"Sauce Bottle"` (matches "Sauce Bottle - Frozen" in Square)
4. Add `displayVariationName: "1/2 lb bags"` to Pulled Pork in Family Night (was missing)

## Files

- `lib/config.ts`
