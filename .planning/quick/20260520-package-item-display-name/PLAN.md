---
slug: package-item-display-name
created: 2026-05-20
status: in-progress
---

# Add displayName to PackageItemConfig for full label override

## Problem

Sauce items in package bundles show redundantly as "1 Sauce Bottle (Bottle)" and "2 Sauce Bottle (Bottles)". The desired output is "1 Sauce Bottle" and "2 Sauce Bottles" — no parentheticals, clean plural form.

## Fix

1. `lib/types.ts` — add `displayName?: string` to PackageItemConfig
2. `lib/config.ts` — set displayName on all three sauce items; remove displayVariationName from them
3. `components/PackageCard.tsx` — when displayName is set, render `{quantity} {displayName}`; otherwise keep existing behavior
