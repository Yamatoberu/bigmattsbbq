---
slug: fix-pickup-issoldout
created: 2026-05-20
status: in-progress
---

# Fix pickup option isSoldOut when capacity_enforced is false

## Problem

In `lib/drops.ts`, `isSoldOut` for pickup options is computed before `capacityEnforced` is defined, and does not check the flag. With all capacity columns defaulting to `0`, `0 >= 0` evaluates to `true` for every field, so all pickup options show as sold out on drops where `capacity_enforced = false`.

## Fix

1. Move `const capacityEnforced = drop.capacity_enforced !== false` to before the pickupOptions mapping.
2. Gate `isSoldOut` on `capacityEnforced`: `isSoldOut: capacityEnforced && (row.reserved_pulled_pork >= row.capacity_pulled_pork && ...)`

## File

`lib/drops.ts` — lines 46–84
