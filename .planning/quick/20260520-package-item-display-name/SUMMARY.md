---
slug: package-item-display-name
status: complete
completed: 2026-05-20
---

Added `displayName?: string` to `PackageItemConfig` in `lib/types.ts`. Updated `PackageCard.tsx` to render `{quantity} {displayName}` when present, bypassing the itemName+(displayVariationName) format. Set `displayName` on all three sauce items in `lib/config.ts` — "Sauce Bottle" (Family Night) and "Sauce Bottles" (Backyard Host, Freezer Filler). All 84 tests pass. Committed as `eca119b`.
