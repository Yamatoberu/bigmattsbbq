---
quick_id: 260506-t9u
slug: expand-stock-tracking-to-all-6-menu-item
status: complete
date: 2026-05-07
---

# Quick Task 260506-t9u: Expand stock tracking to all 6 menu items independently

## What was done

Expanded per-item capacity tracking from 2 products (pulled_pork, brisket) to all 6 menu items: pulled pork, brisket, sauce, family night, backyard host, and freezer filler.

## Commits

- `93f9018` feat(260506-t9u-01): expand per-item capacity to all 6 products — migration, types, drops.ts
- `3dc6349` feat(260506-t9u-01): wire all 6 product names through checkout, CheckoutClient, and OrderLanding

## Changes delivered

**Task 1 — DB + DTO layer:**
- `supabase/migrations/0004_per_item_capacity.sql` — 8 `ALTER TABLE` columns on both `drops` and `drop_pickup_options` (capacity/reserved pairs for sauce, family_night, backyard_host, freezer_filler); `CREATE OR REPLACE` both `reserve_pickup_slot` and `release_pickup_slot` RPC functions to handle all 6 product names atomically
- `lib/types.ts` — `DropDTO.capacity` and `DropDTO.soldOut` expanded to all 6 items
- `lib/drops.ts` — SELECT strings, DTO mapping, `pickupOption.isSoldOut`, `checkDropReady` globallySoldOut, and `DropReadinessRow` interface all expanded
- `lib/database.types.ts` — compile-time types updated to match migration
- Tests updated: `checkoutDropGate.test.ts`, `checkoutReservation.test.ts`, `drops.test.ts` — new test for sauce/package capacity round-trip

**Task 2 — Checkout + UI wiring:**
- `app/api/checkout/route.ts` — `cartSchema.productName` union extended to all 6; drop/pickup SELECT strings updated; `pickupSoldOut` predicate ANDs all 6 products
- `components/CheckoutClient.tsx` — `productNameMap` now maps sauce variations and all 3 package `bundleVariationId`s to their product names
- `components/OrderLanding.tsx` — package cards consult `drop.soldOut.{familyNight,backyardHost,freezerFiller}` keyed by `pkg.id`; individual item cards check `drop.soldOut.sauce`
- `lib/cart.ts` — `aggregateByProduct` parameter union widened to match

## Test results

77/77 tests pass.

## Next step

Apply the migration to Supabase: `supabase/migrations/0004_per_item_capacity.sql`
