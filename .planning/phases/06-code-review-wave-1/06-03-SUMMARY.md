---
phase: 06-code-review-wave-1
plan: "03"
subsystem: checkout-and-confirmation
tags: [dead-code, nextjs-15-async-searchparams, type-safety, code-review]
dependency_graph:
  requires: []
  provides:
    - clean-sauceVariationIds-memo
    - async-confirmation-page
  affects:
    - components/CheckoutClient.tsx
    - app/confirmation/page.tsx
tech_stack:
  added: []
  patterns:
    - "Promise<searchParams> async server component (Next.js 15+)"
    - "Set seeding via [value].filter(Boolean) one-liner"
key_files:
  modified:
    - components/CheckoutClient.tsx
    - app/confirmation/page.tsx
decisions:
  - "Keep normalizeMatch helper in CheckoutClient (Issue 9 dedup is Wave 2 scope)"
  - "Inline props type in ConfirmationPage rather than keep the ConfirmationPageProps interface"
  - "Do not touch <main> nesting in confirmation page (Issue 3 is Wave 2 scope)"
metrics:
  duration: "84s"
  completed: "2026-05-06"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 06 Plan 03: Dead Code Removal and Async SearchParams Summary

Remove the dead `itemId`-vs-`variationId` comparison in CheckoutClient and convert the confirmation page from a sync to an async server component per Next.js 15+ conventions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove dead item-id-vs-variation-id branch in sauceVariationIds memo | 0eedfa9 | components/CheckoutClient.tsx |
| 2 | Convert confirmation page to async server component awaiting searchParams | e601c1b | app/confirmation/page.tsx |

## What Was Built

**Task 1 — CheckoutClient dead branch removal (Issue 5, High):**

The `sauceVariationIds` `useMemo` block had an `if (item.itemId === sauceVariationId)` branch comparing a Square *item* (catalog object) ID against a *variation* (SKU) ID. These live in different Square namespaces and are never equal — this branch was permanently dead code. It was removed. The Set initialization was also collapsed from a two-line `const ids = new Set(); if (sauceVariationId) { ids.add(sauceVariationId); }` pattern to a one-liner: `new Set<string>([sauceVariationId].filter(Boolean))`. The functional name-based union (`normalizeMatch(item.name).includes("sauce")`) and the dependency array `[frozenItems, sauceVariationId]` are unchanged.

**Task 2 — ConfirmationPage async conversion (Issue 8, Medium):**

The confirmation page was reading `searchParams.pickupNote` and `searchParams.orderId` synchronously — deprecated in Next.js 15+ where `searchParams` is a `Promise`. The page was converted to an `async` function with `searchParams` typed as `Promise<{ orderId?: string; pickupNote?: string }>`. The `await searchParams` destructures with defaults (`orderId = ""`, `pickupNote = "Pickup scheduled"`) in one line, replacing the previous two `||`-defaulting lines. The `ConfirmationPageProps` interface was deleted; the props type is inlined into the function signature. All JSX is byte-for-byte identical.

## Verification

- `grep -c "item.itemId === sauceVariationId" components/CheckoutClient.tsx` → 0
- `grep -c 'normalizeMatch(item.name).includes("sauce")' components/CheckoutClient.tsx` → 1
- `grep -c "export default async function ConfirmationPage" app/confirmation/page.tsx` → 1
- `grep -c "await searchParams" app/confirmation/page.tsx` → 1
- `grep -c "interface ConfirmationPageProps" app/confirmation/page.tsx` → 0
- `npm run build` exits 0, no `searchParams should be awaited` warning
- `npm run test` → 61/61 tests passing (12 test files)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes were introduced. Threat mitigations T-06-12 and T-06-14 are satisfied:
- `orderId` / `pickupNote` continue to render as React text children (JSX auto-escapes)
- `sauceVariationIds` surface is now tighter — only env-provided variation id + name-matched variations

## Self-Check: PASSED

- `components/CheckoutClient.tsx` exists and modified: FOUND
- `app/confirmation/page.tsx` exists and modified: FOUND
- Task 1 commit 0eedfa9: FOUND
- Task 2 commit e601c1b: FOUND
- `npm run test` 61/61 passing: PASSED
- `npm run build` exits 0, no deprecation warning: PASSED
