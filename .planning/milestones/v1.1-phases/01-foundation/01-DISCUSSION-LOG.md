# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-foundation
**Areas discussed:** Capacity model, Reservation behavior, Seed data shape, Supabase client pattern

---

## Capacity Model

| Option | Description | Selected |
|--------|-------------|----------|
| Per-pickup-location | Each pickup option has its own capacity. Lets you control logistics per location independently. | |
| Global per drop | One capacity number for the entire drop, shared across all pickup locations. | |
| Both levels | Global drop cap AND per-location caps. Most flexible but adds complexity. | ✓ |

**User's choice:** Both levels
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strictest wins | Reservation fails if EITHER cap is reached. Global cap is a hard ceiling; location caps are independent sub-limits. | ✓ |
| Location cap primary | Location caps are the real enforcement. Global cap is advisory/informational only. | |
| You decide | Claude picks the best approach. | |

**User's choice:** Strictest wins
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Number of orders | Each order counts as 1 against capacity regardless of cart size. | |
| Product units | Capacity tracks total weight/units across all orders. | ✓ |
| You decide | Claude picks based on dual Square + Supabase model. | |

**User's choice:** Product units
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Bag count | Capacity = number of bags. Simple integer math, matches how products are sold. | ✓ |
| Weight in pounds | Capacity = total pounds. More intuitive for planning but introduces decimal math. | |
| You decide | Claude picks the best unit. | |

**User's choice:** Bag count
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per product | Each product has its own capacity at both global and location level. | ✓ |
| Combined total | One bag count regardless of product type. | |

**User's choice:** Yes, per product
**Notes:** Pulled pork and brisket tracked and sell out independently.

---

## Reservation Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate error | RPC returns error/false. Checkout stops before calling Square. Customer sees "sold out" message. | ✓ |
| Hold-and-expire | Reserve a slot temporarily (e.g., 10 min hold). Slot releases if customer abandons. | |
| You decide | Claude picks based on checkout flow design. | |

**User's choice:** Immediate error
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-release | If Square order/invoice creation fails, call a release function to give the slot back. | ✓ |
| Keep reservation | Once reserved, stays reserved even if Square fails. Requires manual cleanup. | |
| You decide | Claude picks the best rollback strategy. | |

**User's choice:** Auto-release
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Counter with conditional update | `UPDATE ... SET reserved_count = reserved_count + N WHERE reserved_count + N <= capacity`. Single atomic statement. | ✓ |
| SELECT FOR UPDATE | Lock the row, check capacity, increment, commit. Explicit locking. | |
| You decide | Claude picks the concurrency approach. | |

**User's choice:** Counter with conditional update
**Notes:** None

---

## Seed Data Shape

| Option | Description | Selected |
|--------|-------------|----------|
| 2 locations | Cache Valley and Utah County. Matches the real setup. | |
| 1 location | Minimal seed — just enough to prove the schema works. | |
| 3+ locations | More variety for testing edge cases. | ✓ |

**User's choice:** 3 locations — Cache Valley, Utah County, and Sandy (Salt Lake County)
**Notes:** Sandy is a real planned new drop location, not fictional.

---

| Option | Description | Selected |
|--------|-------------|----------|
| 50 bags per location | Realistic for small-batch BBQ drop. 150 bags global cap. | |
| Small (10 per location) | Low numbers to quickly test sold-out scenarios. | |
| You decide | Claude picks reasonable test numbers. | |

**User's choice:** Custom — 200 bags global cap per product (pulled pork + brisket), 65 bags per location per product
**Notes:** These reflect actual business expectations. 3 × 65 = 195 < 200 provides a 5-bag global buffer.

---

## Supabase Client Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Server-only | All Supabase calls go through API routes. Keeps service key server-side. Matches existing architecture. | ✓ |
| Shared (server + client) | Anon key on client for reads, service key on server for writes. | |
| You decide | Claude picks based on existing architecture. | |

**User's choice:** Server-only
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated | Run `supabase gen types` to generate Database type from schema. Standard Supabase practice. | ✓ |
| Hand-written | Define types manually in lib/types.ts. Full control but can drift. | |
| You decide | Claude picks best approach for type safety. | |

**User's choice:** Auto-generated
**Notes:** None

---

## Claude's Discretion

- Column naming conventions, index strategy, and RLS policy specifics
- Migration file organization
- Generated types file location and import pattern
- Release/rollback function naming and signature

## Deferred Ideas

None — discussion stayed within phase scope
