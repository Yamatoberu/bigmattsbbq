---
slug: fix-package-config-names
status: complete
completed: 2026-05-01
---

# Fix Package Config Name Mismatches

Updated `lib/config.ts` to align with Square catalog item and variation names so `resolvePackageToCartItems` resolves all three packages correctly.

## Changes made

- `variationName` on all Brisket and Pulled Pork entries: `"1/2 lb bag"` → `"Regular"`
- `variationName` on all BBQ Sauce entries: `"Bottle"` → `"Regular"`
- `itemName` on all sauce entries: `"BBQ Sauce"` → `"Sauce Bottle"` (matches "Sauce Bottle - Frozen")
- Added `displayVariationName: "1/2 lb bags"` to Pulled Pork in Family Night (was missing)
- `displayVariationName` preserved for all UI display strings
