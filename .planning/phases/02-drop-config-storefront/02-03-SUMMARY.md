---
plan: 02-03
phase: 02-drop-config-storefront
status: complete
completed: 2026-04-11
commits:
  - bdc3205
  - 0709305
key-files:
  created:
    - tests/checkoutDropGate.test.ts
  modified:
    - lib/drops.ts
    - app/api/checkout/route.ts
---

## What Was Built

Added server-side drop validation to `/api/checkout` and locked the behavior with unit tests.

**lib/drops.ts additions:**
- `DropReadinessRow` interface — column subset the precheck reads from Supabase
- `DropReadiness` discriminated union — `{ ok: true } | { ok: false; status: number; error: string }`
- `checkDropReady(drop)` pure synchronous helper — three rejection paths: null (404), non-active status (409 closed), both products at capacity (409 sold-out)

**app/api/checkout/route.ts changes:**
- Zod schema replaced: old `pickup: { locationLabel: z.enum([...]) }` → new `{ dropId: z.string().uuid(), pickupOptionId: z.string().uuid() }`
- Precheck order: drops SELECT → `checkDropReady` → drop_pickup_options SELECT — all three before any Square API calls
- `pickupNote` and `pickup_at` now sourced from `pickupRow` (Supabase) instead of request body

**tests/checkoutDropGate.test.ts:**
- 6 tests, pure function import with `vi.mock("server-only", () => ({}))` at module level
- Covers: happy path, closed, upcoming (same 409 closed copy), both-products-sold-out, null, partial-sold-out (→ ok)

## Precheck Operation Order

1. Parse and validate request body with new Zod schema
2. `supabase.from("drops").select(...).eq("id", dropId).maybeSingle()` — look up drop row
3. `checkDropReady(dropRow)` — gate on status and global capacity
4. `supabase.from("drop_pickup_options").select(...).eq("id", pickupOptionId).eq("drop_id", dropId).maybeSingle()` — look up pickup row for `location_label` + `pickup_at`
5. Square API calls (unchanged)

## Deviations

None. Implementation matches plan specification verbatim.

## Note for Plan 02-05

`components/CheckoutClient.tsx` was deliberately NOT modified. It still sends the old payload shape `{ pickup: { locationLabel, pickupDateLabel, pickupAtISO }, customer, cart }`, which will now 400 against the updated route. Plan 02-05 must update `CheckoutClient` to send `{ dropId, pickupOptionId, customer, cart }` to restore end-to-end checkout.

## Verification

- `npm run test` → 24/24 pass (6 test files)
- `rm -rf .next && npx tsc --noEmit` → exit 0
- `grep -q 'locationLabel: z.enum' app/api/checkout/route.ts` → no matches (old enum removed)
- `grep -q 'checkDropReady' app/api/checkout/route.ts` → found
