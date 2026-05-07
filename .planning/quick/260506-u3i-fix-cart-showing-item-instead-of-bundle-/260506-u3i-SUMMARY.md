---
phase: 260506-u3i
plan: "01"
subsystem: checkout
tags: [cart, display, bundle, useMemo]
dependency_graph:
  requires: []
  provides: [bundle-name-display-in-checkout-summary]
  affects: [components/CheckoutClient.tsx]
tech_stack:
  added: []
  patterns: [useMemo-lookup-map]
key_files:
  created: []
  modified:
    - components/CheckoutClient.tsx
decisions:
  - "Derive bundleVariationIdToName from PACKAGES at memo time (empty dep array) — PACKAGES is module-level constant so it never changes"
  - "Keep priceCents at 0 for bundle-only cart entries — server invoice is the source of truth for pricing"
metrics:
  duration: "~5 min"
  completed: "2026-05-06"
---

# Phase 260506-u3i Plan 01: Fix Cart Showing Item Instead of Bundle — Summary

## One-liner

Added a `bundleVariationIdToName` `useMemo` in `CheckoutClient.tsx` so bundle cart entries (Family Night, Backyard Host, Freezer Filler) display their package name instead of the placeholder "Item".

## What Changed

### Before

When a customer selected a bundle package and navigated to `/checkout`, the Order Summary showed:

```
Item
$0.00 each
```

This happened because bundle cart items carry a `bundleVariationId` (e.g. `5L524HBPRLRTXIOHFEV2DHDP`) that does not exist in the Square frozen-items catalog response, so `variationMap.get(item.variationId)` returned `undefined`, and the fallback was the literal string `"Item"`.

### After

```
Family Night
$0.00 each
```

Bundle variation IDs are now resolved to their display names via a new `bundleVariationIdToName` map built from `PACKAGES`. The resolution chain is:

```
info?.name ?? bundleName ?? "Item"
```

- `info?.name` — Square catalog variation name (e.g. "Brisket · Regular"); wins for individual items
- `bundleName` — package name from `PACKAGES` (e.g. "Family Night"); wins for bundle items
- `"Item"` — final fallback (should never be reached in practice)

Single-item cart entries continue to display their existing `"{ItemName} · {VariationName}"` label unchanged.

## Deviations from Plan

None — plan executed exactly as written. Only `components/CheckoutClient.tsx` was modified.

## Self-Check: PASSED

- `components/CheckoutClient.tsx` modified: confirmed
- `bundleVariationIdToName` useMemo present: confirmed
- `info?.name ?? bundleName ?? "Item"` fallback chain: confirmed
- `npm run build` passed (TypeScript clean, all 15 routes compiled)
- `npm run test` passed (77/77 tests)
- No other files modified: confirmed (git status showed only CheckoutClient.tsx)
- Commit `f0a17c2` exists: confirmed

## Known Stubs

None — no stub patterns introduced. The `$0.00 each` display for bundles is intentional and pre-existing behavior (server-generated Square invoice is the source of truth for pricing).

## Commits

| Task | Description | Hash |
|------|-------------|------|
| 1 | Bundle name fallback in checkout order summary | f0a17c2 |
