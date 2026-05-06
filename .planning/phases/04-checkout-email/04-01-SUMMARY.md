---
phase: 04-checkout-email
plan: "01"
subsystem: checkout
tags: [idempotency, square, tdd, deterministic-keys]
dependency_graph:
  requires: []
  provides: [deterministic-idempotency-keys, priceCents-cart-schema]
  affects: [app/api/checkout/route.ts, app/api/dev/set-inventory/route.ts]
tech_stack:
  added: []
  patterns: [SHA-256 deterministic hashing via Node.js crypto built-in, purpose-suffixed idempotency keys]
key_files:
  created:
    - tests/idempotency.test.ts
  modified:
    - lib/idempotency.ts
    - app/api/checkout/route.ts
    - app/api/dev/set-inventory/route.ts
    - tests/checkoutReservation.test.ts
decisions:
  - "Deterministic idempotency key: SHA-256 of sorted inputs joined by | pipe, sliced to 45 chars (Square max)"
  - "Input set: customer email + dropId + pickupOptionId + sorted cart fingerprint (variationId:quantity) + purpose suffix"
  - "Purpose suffixes: customer / order / invoice / publish — four unique keys from same logical order"
  - "Dev sandbox endpoint (set-inventory) uses crypto.randomUUID() as single input — non-retryable dev tool, uniqueness preferred over determinism"
metrics:
  duration_seconds: 209
  completed_date: "2026-04-18"
  tasks_completed: 2
  files_modified: 5
---

# Phase 4 Plan 1: Deterministic Idempotency Keys Summary

**One-liner:** SHA-256 deterministic idempotency keys derived from order data — customer email + dropId + pickupOptionId + cart fingerprint + purpose suffix, sliced to 45 chars.

## What Was Built

Replaced `crypto.randomUUID()` in `lib/idempotency.ts` with a deterministic SHA-256 hash function. The new `newIdempotencyKey(inputs: string[])` signature sorts its inputs before hashing, making keys order-independent. All four Square API call sites in the checkout route now derive unique, stable keys from the same logical order data by appending purpose suffixes (`"customer"`, `"order"`, `"invoice"`, `"publish"`).

Added `priceCents: z.number().int().nonnegative().optional()` to `cartSchema` to support Plan 02's order save requirement (D-05: unit price in cart_snapshot JSONB).

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Replace lib/idempotency.ts with SHA-256 hash + 6 unit tests (TDD) | e5474eb |
| 2 | Wire deterministic inputs at all 4 Square call sites; extend cartSchema | a3e058b |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zero-arg newIdempotencyKey() call in sandbox dev route**
- **Found during:** Task 2 TypeScript compile check
- **Issue:** `app/api/dev/set-inventory/route.ts` line 47 still used zero-arg `newIdempotencyKey()` after signature change — TypeScript error TS2554
- **Fix:** Updated to `newIdempotencyKey([crypto.randomUUID()])` — dev/sandbox endpoint benefits from uniqueness over determinism
- **Files modified:** `app/api/dev/set-inventory/route.ts`
- **Commit:** a3e058b

**2. [Rule 2 - Type Safety] Fixed pre-existing TS2352 unsafe type assertion in test**
- **Found during:** Task 2 TypeScript compile check
- **Issue:** `tests/checkoutReservation.test.ts` line 211 cast `ReadableStream | null` directly to `{ error: string }` — fails strict TypeScript
- **Fix:** Added `unknown` intermediary cast: `response.body as unknown as { error: string }`
- **Files modified:** `tests/checkoutReservation.test.ts`
- **Commit:** a3e058b

## Verification Results

- `npx vitest run tests/idempotency.test.ts` — 6/6 tests pass
- `npm run test` — 44/44 tests pass (up from 38 before plan — 6 new idempotency tests added)
- `npx tsc --noEmit` — 0 errors

## Known Stubs

None. `priceCents` is `.optional()` in cartSchema — intentional; Plan 02 will wire the client to send it.

## Self-Check: PASSED

- `lib/idempotency.ts` contains `import { createHash } from "crypto"` — FOUND
- `lib/idempotency.ts` contains `export function newIdempotencyKey(inputs: string[]): string` — FOUND
- `lib/idempotency.ts` contains `.slice(0, 45)` — FOUND
- `lib/idempotency.ts` does NOT contain `randomUUID` — CONFIRMED (0 occurrences)
- `tests/idempotency.test.ts` contains 6 `it(` blocks — FOUND
- `app/api/checkout/route.ts` contains `const cartFingerprint` — FOUND
- `app/api/checkout/route.ts` contains `const idempotencyBase` — FOUND
- All 4 purpose-suffixed call sites present — CONFIRMED
- No zero-arg `newIdempotencyKey()` in route.ts — CONFIRMED
- Commit e5474eb exists — FOUND
- Commit a3e058b exists — FOUND
