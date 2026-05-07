---
slug: fix-bundle-variation-ids-and-orderitems
date: 2026-05-07
status: complete
---

# Fix Bundle Checkout — Variation IDs + orderItems Expansion

## Problem
Two connected bugs cause Square orders to show individual components instead of bundles:

1. `bundleVariationId` values in `lib/config.ts` reference stale Square variation IDs that don't match the current frozen catalog items.
2. `CheckoutClient.tsx` `handleSubmit` explicitly expands bundle cart items into their components via `orderItems`, which the route then uses instead of the bundle variation ID.

## Changes

### 1. `lib/config.ts` — Update bundleVariationId values
Replace stale variation IDs with current ones from the frozen items endpoint:
- `backyard-host`: `QQU57H5MIGIRGVE3EHYSZ4RI` → `TXDOELPK4D7CUBWJBNLVD3TB`
- `family-night`: `5L524HBPRLRTXIOHFEV2DHDP` → `MTETMYPIXMPTKTFJFSB5RNPN`
- `freezer-filler`: `5FOWGVGSQCXTRAXOSTB6GXVI` → `NKLG3CMIWO5GLE4IQHUP4ZDV`

### 2. `components/CheckoutClient.tsx` — Remove orderItems expansion
Delete the `orderItems` flatMap that resolves bundles to components. Remove `orderItems` from the fetch body. The route already falls back to `cart` when `orderItems` is absent, and `cart` holds the correct bundle variation IDs.
