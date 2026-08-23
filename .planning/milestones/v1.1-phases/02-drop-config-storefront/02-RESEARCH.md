# Phase 2: Drop Config & Storefront — Research

**Researched:** 2026-04-10
**Domain:** Next.js 16 App Router server data fetching, Supabase queries from RSC/route handlers, conditional rendering, capacity gating
**Confidence:** HIGH (codebase patterns are explicit; Supabase + Next.js patterns are well-established)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Drop State UI**
- **D-01** No active / closed drop → teaser page with branding, "next drop coming soon", and mailing list signup CTA.
- **D-02** Active drop → display drop title (e.g. "April 2026 Drop") and order cutoff date/time. Creates urgency.
- **D-03** A closed drop is functionally identical to no drop — same teaser page.
- **D-04** Drop state is checked **server-side in `page.tsx`** and passed to the client component. No flash of wrong state. Mirrors the existing checkout pattern (`sauceVariationId` passed from server).

**Pickup Option Display**
- **D-05** Pickup options as selectable cards: location name, date, time window. Tappable on mobile. Follows `PackageCard` pattern.
- **D-06** No capacity counts on pickup cards. Only indicate fully-sold-out (disabled card).
- **D-07** Pickup location selected at **checkout**, not on the ordering page. Matches current flow.

**Sold-Out Behavior**
- **D-08** Sold-out products → greyed/muted card, "Sold Out" badge, add-to-cart disabled. Card stays visible.
- **D-09** Sold-out scope is **global per-product capacity**, not per-location (because customer hasn't picked a location yet).
- **D-10** Server-side checkout validation rejects orders when the drop is not active or has no global capacity remaining.

**Data Migration**
- **D-11** `PACKAGES` stays hardcoded in `lib/config.ts`.
- **D-12** **Delete `PICKUP_OPTIONS` from `lib/config.ts` entirely.** Clean break, no dead code.
- **D-13** New `/api/drop` endpoint serves drop state + pickup options from Supabase. Separate from `/api/frozen-items`.

### Claude's Discretion
- Live update mechanism for sold-out detection (polling interval, approach, frequency)
- Exact layout and spacing of pickup option cards
- Loading skeleton design for drop data fetch
- Error handling when Supabase drop query fails
- `PickupOption` type definition shape in `lib/types.ts`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Effect on plan |
|-----------|--------|----------------|
| Square stays source of truth for catalog/inventory | CLAUDE.md / PROJECT.md | Sold-out signal in Phase 2 reads from **Supabase drop reservations**, not Square. Square's `remaining` continues to drive *per-variation* sell-down inside an active drop. |
| Supabase = source of truth for drops/orders | CLAUDE.md | All drop config from `drops` + `drop_pickup_options` tables only. |
| Validate API request bodies with `zod.safeParse` | CLAUDE.md | New `/api/drop` route uses `safeParse`; checkout schema gets new `dropId` field validated the same way. |
| Server-side validation in routes; never trust client | CLAUDE.md | Even though `page.tsx` reads drop state server-side, `/api/checkout` MUST re-check `drops.status === 'active'` from the DB on every POST. |
| No JSDoc / inline comments in source | CLAUDE.md | Plans should not specify documentation comments in `.ts`/`.tsx`. |
| Named exports throughout `lib/` and `components/` | CLAUDE.md | New `lib/drops.ts`, new types, new components — all named exports. |
| Relative imports — no path aliases | CLAUDE.md | Use `../lib/...` not `@/lib/...`. |
| Vitest, node environment (not jsdom) | CLAUDE.md | Component rendering can't be unit-tested. Pure-function logic only. |
| GSD workflow enforced before edits | CLAUDE.md | Plans must run through `/gsd:execute-phase`. |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DATA-03** | Drops are managed in Supabase with configurable products, capacity, and pickup options per drop | Existing schema (`drops`, `drop_pickup_options`) covers this. Phase 2 reads from it; no admin UI. |
| **DATA-04** | Each drop has a state (upcoming/active/closed) that controls ordering availability | `drops.status` column already exists with `check (status in ('upcoming', 'active', 'closed'))`. Phase 2 wires server-side gating to this. |
| **DATA-05** | Drop pickup options stored in Supabase, replace hardcoded config | `drop_pickup_options` exists. Phase 2 deletes `PICKUP_OPTIONS` from `lib/config.ts` (D-12). |
| **ORD-04** | Checkout validates drop is active before accepting orders | New precheck added at top of `app/api/checkout/route.ts` POST handler. Returns 409 with explicit message. |
| **ORD-05** | Products display sold-out indicators in real-time when capacity reached | Polling + server-recompute in `/api/drop` (Discretion area; recommendation below). |

---

## Summary

- Phase 2 is a **data-source switch + conditional render**: replace `PICKUP_OPTIONS`/hardcoded cutoff strings with a live Supabase read, gate the storefront on `drops.status`, and add a server-side drop check to `/api/checkout`. There is no new business logic — Phase 1 already shipped the schema, RLS, and singleton Supabase client.
- The cleanest pattern given D-04 ("checked server-side in `page.tsx`") and Next 16 App Router conventions is: **fetch the active drop directly inside a Server Component** (`app/page.tsx`, `app/checkout/page.tsx`) using `getSupabaseClient()`, then pass a `DropDTO | null` to the existing client components. The new `/api/drop` route (D-13) becomes the **client polling endpoint** for sold-out reactivity (success criterion 3) but is NOT used for the initial render — that's RSC-direct. This avoids a needless network hop and FOUC.
- Sold-out reactivity (criterion 3 — "without requiring a page reload") is satisfied with **simple client polling of `/api/drop` every 30s** while the page is visible. Supabase Realtime is overkill for an MVP storefront with < 200 concurrent slots; polling is simpler, free of WebSocket lifecycle bugs, and the existing `useFrozenItems` pattern already establishes the convention. Polling aligns with the cart's localStorage model — purely client-side state with periodic server reconciliation.
- The `drops` schema has **one gap**: no `order_cutoff_at` column, but D-02 and the UI spec both require an "order cutoff date/time" string. This phase needs a small additive migration (`alter table drops add column order_cutoff_at timestamptz`) — straightforward and non-breaking.
- The server-side checkout gate (ORD-04, D-10) cannot rely on `reserve_pickup_slot` returning an "inactive drop" error — the existing RPC only checks per-product capacity, not status. Phase 2 must add an explicit `select status, capacity, reserved from drops where id = $1` precheck before any Square call. This is a small, isolated change to `app/api/checkout/route.ts`.

**Primary recommendation:** Add `order_cutoff_at` column → write `lib/drops.ts` (server-only fetcher) → wire `app/page.tsx` and `app/checkout/page.tsx` as RSC fetchers → conditionally render `OrderLanding` vs new `TeaserPage` based on `drop.status` → introduce `useActiveDrop` client hook polling `/api/drop` every 30s for sold-out reactivity → add explicit drop-status precheck in `/api/checkout` POST handler → delete `PICKUP_OPTIONS` and update all 2 consumers (`CheckoutClient`, `Footer`).

---

## Standard Stack

### Already in tree (no install needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.101.1 | Postgres client + RPC | Phase 1 singleton in `lib/supabase.ts` already configured |
| `zod` | ^3.24.2 | Request validation | Already used in `/api/checkout`; new `/api/drop` follows same pattern |
| `next` | ^16.1.6 | App Router server fetch + route handlers | RSCs can call `getSupabaseClient()` directly server-side |
| `react` | 18.3.1 | UI | — |
| `vitest` | ^4.0.18 | Tests (node env) | Pure functions only; no jsdom |

### Nothing to install
Phase 2 needs **zero new dependencies**. All capabilities exist.

### Alternatives Considered
| Instead of | Could Use | Why we don't |
|------------|-----------|--------------|
| Polling `/api/drop` every 30s | Supabase Realtime channel | Adds WebSocket lifecycle complexity, requires anon-key reads which conflict with the "service role only" Phase 1 pattern, overkill for a drop with < 200 slots and ≤ a few hundred concurrent visitors |
| Polling | Server-Sent Events route | More wiring, no benefit at this scale |
| Polling | Optimistic decrement only | Doesn't satisfy criterion 3 — other shoppers' purchases wouldn't show up |
| RSC direct DB read | TanStack Query / SWR | Adds a dependency for one hook; manual `useEffect` polling is what `useFrozenItems` already uses |
| New `/api/drop` route | Inline fetch in `app/page.tsx` only | Need a client poll target anyway (D-13 explicitly mandates the route) |

---

## Architecture Patterns

### Server-side initial fetch (D-04)

```tsx
// app/page.tsx
import { OrderLanding } from "../components/OrderLanding";
import { TeaserPage } from "../components/TeaserPage";
import { fetchActiveDrop } from "../lib/drops";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const drop = await fetchActiveDrop();
  if (!drop || drop.status !== "active") {
    return <TeaserPage />;
  }
  return <OrderLanding initialDrop={drop} />;
}
```

`force-dynamic` is mandatory — without it Next 16 will static-render the page at build time and cache the drop forever. Mirrors `app/checkout/page.tsx` which already uses it.

### New server-only data layer

```ts
// lib/drops.ts (NEW)
import { getSupabaseClient } from "./supabase";
import type { DropDTO } from "./types";

export async function fetchActiveDrop(): Promise<DropDTO | null> {
  const supabase = getSupabaseClient();

  const { data: drop, error } = await supabase
    .from("drops")
    .select("id, title, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!drop) return null;

  const { data: pickupRows, error: pickupErr } = await supabase
    .from("drop_pickup_options")
    .select("id, location_label, pickup_date, pickup_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket")
    .eq("drop_id", drop.id)
    .order("pickup_at", { ascending: true });

  if (pickupErr) throw pickupErr;

  return {
    id: drop.id,
    title: drop.title,
    status: drop.status as DropDTO["status"],
    orderCutoffAt: drop.order_cutoff_at,
    capacity: {
      pulledPork: { total: drop.capacity_pulled_pork, reserved: drop.reserved_pulled_pork },
      brisket:    { total: drop.capacity_brisket,     reserved: drop.reserved_brisket }
    },
    soldOut: {
      pulledPork: drop.reserved_pulled_pork >= drop.capacity_pulled_pork,
      brisket:    drop.reserved_brisket     >= drop.capacity_brisket
    },
    pickupOptions: pickupRows.map((row) => ({
      id: row.id,
      locationLabel: row.location_label,
      pickupDateLabel: formatPickupDate(row.pickup_date),
      pickupAtISO: row.pickup_at,
      isSoldOut:
        row.reserved_pulled_pork >= row.capacity_pulled_pork &&
        row.reserved_brisket     >= row.capacity_brisket
    }))
  };
}
```

> **Source:** Pattern verified against `app/api/test-seed/route.ts` lines 11–43, which already does this exact `.from(...).select(...)` shape against the Phase 1 schema.

### Recommended new files

```
app/
├── page.tsx                    # MODIFY: async RSC, fetchActiveDrop, branch to TeaserPage
├── checkout/page.tsx           # MODIFY: also fetch drop, redirect to "/" if inactive
└── api/
    └── drop/
        └── route.ts            # NEW: GET — returns DropDTO (used by polling hook)

components/
├── OrderLanding.tsx            # MODIFY: accept initialDrop prop, show DropHeader, render sold-out
├── TeaserPage.tsx              # NEW: D-01 teaser layout
├── DropHeader.tsx              # NEW: title + cutoff banner (replaces hardcoded line at OrderLanding.tsx:76)
├── PickupOptionCard.tsx        # NEW: selectable card; used by CheckoutClient
├── CheckoutClient.tsx          # MODIFY: receive pickupOptions from server, drop PICKUP_OPTIONS import, send dropId + pickupOptionId
├── Footer.tsx                  # MODIFY: drop PICKUP_OPTIONS import; show generic copy
└── hooks/
    └── useActiveDrop.ts        # NEW: client poll of /api/drop every 30s

lib/
├── drops.ts                    # NEW: fetchActiveDrop(), formatters, type-safe queries
├── types.ts                    # MODIFY: add DropDTO, PickupOptionDTO; remove PickupOption literal-union locationLabel constraint
└── config.ts                   # MODIFY: delete PICKUP_OPTIONS export

supabase/migrations/
└── 0002_drop_cutoff.sql        # NEW: alter table drops add column order_cutoff_at timestamptz; update seed

tests/
├── drops.test.ts               # NEW: unit test for sold-out predicate, formatPickupDate
└── checkoutDropGate.test.ts    # NEW (optional): unit test for the precheck logic if extracted
```

### Pattern: client polling hook (mirrors useFrozenItems)

```ts
// components/hooks/useActiveDrop.ts
"use client";

import { useEffect, useState } from "react";
import type { DropDTO } from "../../lib/types";

const POLL_MS = 30_000;

export function useActiveDrop(initial: DropDTO | null) {
  const [drop, setDrop] = useState<DropDTO | null>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/drop", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as DropDTO | null;
        if (!cancelled) setDrop(next);
      } catch {
        // swallow — keep last good drop
      }
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return drop;
}
```

### Pattern: server-side checkout drop gate (ORD-04)

```ts
// app/api/checkout/route.ts — additions at top of try block
const checkoutSchema = z.object({
  dropId: z.string().uuid(),               // NEW field
  pickupOptionId: z.string().uuid(),        // NEW field — replaces locationLabel enum
  customer: z.object({ /* unchanged */ }),
  cart: z.array(cartSchema).min(1)
});

// ... after parsed.success check:
const supabase = getSupabaseClient();
const { data: drop, error: dropErr } = await supabase
  .from("drops")
  .select("id, status, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket")
  .eq("id", parsed.data.dropId)
  .maybeSingle();

if (dropErr || !drop) {
  return NextResponse.json(
    { error: "Drop not found.", requestId },
    { status: 404 }
  );
}

if (drop.status !== "active") {
  return NextResponse.json(
    { error: "This drop has closed. Orders are no longer being accepted.", requestId },
    { status: 409 }
  );
}

const globallySoldOut =
  drop.reserved_pulled_pork >= drop.capacity_pulled_pork &&
  drop.reserved_brisket     >= drop.capacity_brisket;

if (globallySoldOut) {
  return NextResponse.json(
    { error: "This drop has sold out. No more orders can be taken.", requestId },
    { status: 409 }
  );
}
```

> Phase 3 will add the atomic per-product `reserve_pickup_slot` call that handles race conditions. Phase 2's gate is the soft preflight — it catches the obvious cases (drop closed, drop fully empty) without solving the concurrent-overselling problem. That separation matches the roadmap.

### Pattern: TeaserPage layout

Reuses existing `.hero-panel`, `.hero-content`, `.button-primary`, `.glass-card` utility classes. The mailing list input is a static stub for Phase 2 — Phase 4 wires the backend. UI-SPEC dictates the copy and structure.

### Anti-patterns to avoid

- **Don't** call the new `/api/drop` route from `app/page.tsx`. RSC + direct Supabase is one round-trip; routing through fetch adds latency, an extra serialization, and risks cache misconfiguration.
- **Don't** enable client-side caching on `/api/drop`. Use `cache: "no-store"` on every poll.
- **Don't** make the polling hook a `setInterval` that fires when the tab is hidden — wastes resources and money. Use `visibilitychange` to pause/resume.
- **Don't** use Supabase anon key from the browser. RLS Phase 1 deliberately denies all anon reads. The polling endpoint goes through `/api/drop` which uses the service-role server singleton. Keep the boundary intact.
- **Don't** rely on `reserve_pickup_slot` to reject inactive drops — it doesn't check status, only per-product capacity. Add the explicit precheck.
- **Don't** keep the `locationLabel: z.enum(["Preston", "Orem"])` constraint in the checkout schema. Pickup locations now come from `drop_pickup_options` and the schema should accept `pickupOptionId: z.string().uuid()` instead. The hardcoded enum directly contradicts D-12.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Drop status state machine | Custom enum + transition validator | DB `check` constraint already enforces `('upcoming', 'active', 'closed')` | Postgres rejects invalid status writes; no app code needed |
| Real-time sold-out push | Custom WebSocket / SSE wiring | 30s polling of `/api/drop` | MVP scale (< 200 slots, < few hundred concurrent users) doesn't justify it |
| Date formatting | Custom date helper | `Intl.DateTimeFormat` (built-in) | Zero deps, locale-correct, already in V8 |
| `formatPickupDate("2026-05-10")` | Manual string slicing | `new Date(...).toLocaleDateString("en-US", { month: "short", day: "numeric" })` | Same |
| Drop fetch caching | Custom in-memory cache | `force-dynamic` + Next request memoization (per-request only) | Drop status is a real-time concern; caching is the bug, not the feature |
| Type definitions for DB rows | Hand-typed interfaces | `Tables<"drops">` from `lib/database.types.ts` already generated | Already shipped in Phase 1 |

**Key insight:** Phase 2 is almost entirely *deletion and rewiring*. The only "new code" of substance is `lib/drops.ts` (≈ 60 lines), `TeaserPage.tsx`, `PickupOptionCard.tsx`, and the polling hook. Everything else is small surgical edits.

---

## Runtime State Inventory

This phase **deletes** `PICKUP_OPTIONS` and changes the checkout payload shape. Inventory of the existing references:

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | None — `PICKUP_OPTIONS` is a code-only constant. No customer records reference its label values. (Verified: `orders.cart_snapshot` is JSONB and pickup is denormalized.) | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets / env vars | None new — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already required from Phase 1 | None |
| Build artifacts / installed packages | None | None |
| **Code consumers of `PICKUP_OPTIONS`** | 2 files: `components/CheckoutClient.tsx` (line 7 import; lines 104, 199 usage), `components/Footer.tsx` (line 1 import; line 4 usage) | Both must be updated in the same wave that deletes the export |
| **Code consumers of the `PickupOption` type** | `lib/types.ts` (definition), `lib/config.ts` (re-export usage), `components/CheckoutClient.tsx`, `app/api/checkout/route.ts` (Zod schema mirrors the literal-union `locationLabel`) | Type definition expanded to `PickupOptionDTO` with `id: string`; checkout route schema updated to use `pickupOptionId` |
| **Hardcoded copy referencing pickup data** | `components/OrderLanding.tsx` line 76: `"Limited supply. Orders close March 10, 2026."` | Replaced by `<DropHeader>` reading from `drop.title` + `drop.orderCutoffAt` |
| **Test files referencing pickup data** | None — the three existing tests cover `joinInventoryCounts`, package mapping, and sauce bump. None import `PICKUP_OPTIONS`. | None |

**Migration order matters:** delete `PICKUP_OPTIONS` only after both consumers are updated, or `npx tsc --noEmit` will fail. Recommend the planner sequence as: (1) add new types & `lib/drops.ts`, (2) update `CheckoutClient` and `Footer` to use new shapes, (3) finally delete `PICKUP_OPTIONS`.

---

## Common Pitfalls

### Pitfall 1: Schema gap — no `order_cutoff_at` column
**What goes wrong:** D-02 and the UI spec say "show order cutoff date/time," but the existing `drops` table has no such column. Building the UI without adding the column either silently shows nothing or invents a default.
**How to avoid:** Ship a one-line additive migration `0002_drop_cutoff.sql` as the first task in Wave 1: `alter table public.drops add column order_cutoff_at timestamptz;`. Update the seed row in `0001_foundation.sql`'s notes (don't edit 0001 — write the update into 0002). Regenerate `lib/database.types.ts` (`npx supabase gen types typescript --local` or equivalent — Phase 1 plan 01-02 documents the procedure).
**Warning sign:** If the planner can write `lib/drops.ts` without referencing `order_cutoff_at`, they've missed it.

### Pitfall 2: Server-side render caching the drop forever
**What goes wrong:** Without `export const dynamic = "force-dynamic"`, Next 16 will static-render `app/page.tsx` at build time. The active drop snapshot becomes frozen in the build. Customers see "no active drop" forever even after one is set, because there's no cache invalidation.
**How to avoid:** Add `export const dynamic = "force-dynamic"` to both `app/page.tsx` and `app/checkout/page.tsx`. The latter already has it.
**Warning sign:** First deploy after enabling shows correct state, but flipping a drop's status in Supabase doesn't reflect on the storefront.

### Pitfall 3: RLS denial mistaken for "no active drop"
**What goes wrong:** If `lib/drops.ts` is imported from a Client Component (or accidentally bundled to the client), the request runs without the service-role key and Phase 1's RLS blocks the read silently. The result is `{ data: null, error: <RLS denied> }` which would render as "no active drop" instead of an error.
**How to avoid:** Add `import "server-only"` at the top of `lib/drops.ts`. Throw on Supabase errors loudly — never coerce to `null`. Distinguish "no active drop" (data === null, no error) from "fetch failed" (error truthy → render error banner).
**Warning sign:** Teaser page shows up when you know the drop is active. Check server logs for an `error` from Supabase.

### Pitfall 4: Polling hot loop in background tabs
**What goes wrong:** A bare `setInterval(tick, 30_000)` continues to fire while the tab is hidden, burning serverless invocations and Supabase RPS for nothing. With Vercel's pricing model this becomes real money for a low-traffic site.
**How to avoid:** Use `document.addEventListener("visibilitychange", ...)` to pause/resume. Optionally re-tick immediately on visibility-restore so users see fresh state when they return.
**Warning sign:** Vercel function invocation count grows much faster than session count.

### Pitfall 5: Checkout payload shape break
**What goes wrong:** The Phase 2 checkout schema must change `pickup: PickupOption` (literal union for locationLabel) → `pickupOptionId: string`. If the client and server are deployed out-of-sync (or the type rename is incomplete), checkout breaks for everyone.
**How to avoid:** Update `lib/types.ts` (`CheckoutRequestBody`), `app/api/checkout/route.ts` Zod schema, and `components/CheckoutClient.tsx` `handleSubmit` body in a single commit. Run `npx tsc --noEmit` before merging the wave. Add at least one unit test for the new request shape.
**Warning sign:** TypeScript compiles but the API returns `400 Invalid checkout payload` at runtime.

### Pitfall 6: Deleting `PICKUP_OPTIONS` first
**What goes wrong:** If the planner sequences deletion before consumer updates, the build breaks at every intermediate commit and the verifier is confused.
**How to avoid:** See the migration order in the Runtime State Inventory section. Delete is the last step.

### Pitfall 7: `.next/` cache poisoning after schema changes
**What goes wrong:** Phase 1's lessons-learned note (`STATE.md`) explicitly says: "Cleared stale `.next/` cache before TypeScript check — `tsconfig` includes `.next/types/**` which had phantom errors from pages not yet created in future phases." Phase 2 will hit the same trap when adding `app/api/drop/`.
**How to avoid:** Plans should include `rm -rf .next` before any pre-commit `npx tsc --noEmit`.

### Pitfall 8: Reserve_pickup_slot doesn't check drop status
**What goes wrong:** Trusting the existing RPC to handle "drop closed" rejection. It doesn't — it only checks `reserved + qty <= capacity`. A closed-but-empty drop would still let orders through.
**How to avoid:** The Phase 2 explicit `select status` precheck catches this. Phase 3 will tighten the RPC if needed. Document the limitation in the plan so Phase 3 doesn't assume the RPC is sufficient.

---

## Code Examples

### `DropDTO` and `PickupOptionDTO` shape (recommended)

```ts
// lib/types.ts — additions

export type DropStatus = "upcoming" | "active" | "closed";

export interface CapacitySlot {
  total: number;
  reserved: number;
}

export interface PickupOptionDTO {
  id: string;                    // UUID from drop_pickup_options.id
  locationLabel: string;          // No more literal union — comes from DB
  pickupDateLabel: string;        // formatted display string ("May 10")
  pickupAtISO: string;            // raw timestamptz, sent to Square
  isSoldOut: boolean;             // derived: both products fully reserved
}

export interface DropDTO {
  id: string;
  title: string;                  // "April 2026 Drop"
  status: DropStatus;
  orderCutoffAt: string | null;   // ISO timestamp; null until cutoff configured
  capacity: {
    pulledPork: CapacitySlot;
    brisket: CapacitySlot;
  };
  soldOut: {
    pulledPork: boolean;
    brisket: boolean;
  };
  pickupOptions: PickupOptionDTO[];
}

// MODIFY existing CheckoutRequestBody:
export interface CheckoutRequestBody {
  dropId: string;                 // NEW
  pickupOptionId: string;         // NEW — replaces nested PickupOption
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  cart: CartItem[];
}

// REMOVE: PickupOption interface (no consumers after CheckoutClient/Footer/checkout-route updates)
```

### Mapping product variations to sold-out state in `OrderLanding`

The card-level sold-out treatment in `FrozenItemCard` already handles per-variation `remaining`. Phase 2 layers a *global* sold-out gate from `drop.soldOut`:

```tsx
// Inside OrderLanding (modified)
const drop = useActiveDrop(initialDrop);

// Determine which Square items map to which capacity bucket.
// Cheapest path: name match (already used by sauce-bump logic at CheckoutClient.tsx:58).
function bucketForItemName(name: string): "pulledPork" | "brisket" | null {
  const n = name.toLowerCase();
  if (n.includes("brisket")) return "brisket";
  if (n.includes("pulled pork") || n.includes("pulledpork")) return "pulledPork";
  return null;
}

// In the FrozenItemCard render loop:
{frozenItems.map((item) => {
  const bucket = bucketForItemName(item.name);
  const dropSoldOut = bucket ? drop?.soldOut[bucket] ?? false : false;
  return (
    <FrozenItemCard
      key={item.itemId}
      item={item}
      forceSoldOut={dropSoldOut}
      onAdd={(variationId) => addItem({ variationId, quantity: 1 })}
    />
  );
})}
```

`FrozenItemCard` receives a new optional `forceSoldOut?: boolean` prop. The button-disabled condition becomes `isSoldOut || forceSoldOut`, and the card wrapper applies `opacity-60` when `forceSoldOut` is true.

### `/api/drop` route handler (D-13)

```ts
// app/api/drop/route.ts (NEW)
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { fetchActiveDrop } from "../../../lib/drops";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();
  try {
    const drop = await fetchActiveDrop();
    return NextResponse.json(drop, { headers: { "x-request-id": requestId } });
  } catch (error) {
    logError("Failed to load active drop", error, requestId);
    return NextResponse.json(
      { error: "Unable to load drop info right now.", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
```

### Migration `0002_drop_cutoff.sql`

```sql
-- Add order cutoff timestamp to drops
alter table public.drops
  add column order_cutoff_at timestamptz;

-- Backfill the existing seed drop with a sensible cutoff
update public.drops
set    order_cutoff_at = '2026-05-08 23:59:59-06'
where  title = 'Test Drop - April 2026';

-- Mark the seed drop active so Phase 2 has something to render against
update public.drops
set    status = 'active'
where  title = 'Test Drop - April 2026';
```

> The "mark active" piece is debatable — a planner may prefer leaving status `'upcoming'` and using a separate dev seed. Note the choice in the plan.

---

## State of the Art

| Old approach | Current approach | When changed |
|--------------|------------------|--------------|
| Hardcoded `PICKUP_OPTIONS` literal in `lib/config.ts` | Live read from `drop_pickup_options` Supabase table | Phase 2 (this phase) |
| Hardcoded "Orders close March 10, 2026." in `OrderLanding.tsx:76` | `<DropHeader>` reading `drop.title` + `drop.orderCutoffAt` | Phase 2 |
| `pickup: PickupOption` (literal-union locationLabel) in checkout payload | `pickupOptionId: string` (UUID FK to `drop_pickup_options`) | Phase 2 |
| `getRouter().route` and `pages/` directory | App Router `app/` directory + RSC | Already done — Next 16 |
| Client-only fetching in `useFrozenItems` | Hybrid: server fetch in RSC + client polling for live updates | Phase 2 introduces this hybrid pattern for drop data |

**Deprecated / outdated:**
- The `PickupOption` literal-union `"Preston" | "Orem"` is dead code after this phase. Locations come from the DB; locations could change per drop.
- The `Footer` "Pick Up: 3/14 in Utah County" line is also dead — it references `PICKUP_OPTIONS[0]` which is being deleted. UI-SPEC doesn't mandate footer copy here, so the planner has discretion: either remove the entire dated banner from Footer or replace with generic "Catch the next drop. Sign up for alerts." copy.

---

## Open Questions

1. **Should `checkout/page.tsx` redirect or render TeaserPage when no active drop?**
   - What we know: `app/checkout/page.tsx` currently always renders `CheckoutClient`. With no drop, the cart can still hold items but submission would fail.
   - What's unclear: Whether to (a) redirect to `/` when drop inactive, (b) render an inline "drop closed" banner inside CheckoutClient, or (c) show TeaserPage on `/checkout` too.
   - **Recommendation:** Server-side redirect to `/` via `redirect("/")` from `next/navigation`. The home page handles the teaser case canonically. Cart contents persist in localStorage so the customer doesn't lose data when a future drop opens.

2. **Footer copy after `PICKUP_OPTIONS` removal**
   - What we know: Footer currently shows "Pick Up: {date} in Utah County" from `PICKUP_OPTIONS[0]`.
   - What's unclear: Replace with the active drop's first pickup option, with generic copy, or remove the banner entirely.
   - **Recommendation:** Remove the dated banner. The drop header inside `OrderLanding` already communicates pickup info. Footer becomes purely contact + copyright. UI-SPEC doesn't require footer pickup display.

3. **Should the "pickup option sold out" UI be live in Phase 2?**
   - What we know: UI-SPEC defines a `[sold-out state]` for pickup option cards (gold ring → grey badge). D-06 says "indicate when fully sold out". The data exists (`drop_pickup_options` per-product reservations).
   - What's unclear: Phase 2 sold-out logic only acts on global capacity (D-09); the per-pickup-option sold-out only matters at checkout selection. The customer doesn't pick a location until checkout, so this is purely for the CheckoutClient pickup picker.
   - **Recommendation:** Yes — derive `pickupOption.isSoldOut` in `lib/drops.ts` (already shown above), pass to `PickupOptionCard`, render the disabled state. Cost: ~5 lines. Without it, the customer could choose a sold-out pickup and only learn at submission.

4. **Sold-out polling frequency: 30s vs other**
   - What we know: This is in Claude's Discretion.
   - What's unclear: 30s feels right for an MVP. 10s would be tighter but 3x the cost. 60s risks stale UI on a busy drop.
   - **Recommendation:** 30s. Document as a constant `POLL_MS` in the hook so future tuning is one-line.

5. **Should `lib/drops.ts` use `place_preorder` RPC?**
   - What we know: `database.types.ts` shows a `place_preorder` function with signature `(p_drop_id: number, ...)`. But the schema has `drop_id uuid` — these signatures conflict, and there's no migration creating this RPC.
   - What's unclear: Is `place_preorder` real or a stale generated artifact? `migrations/0001_foundation.sql` only declares `reserve_pickup_slot` and `release_pickup_slot`.
   - **Recommendation:** Ignore `place_preorder`. Treat it as stale generated types. Phase 2 doesn't need it. Flag for cleanup in Phase 3 or the planner's open questions.

---

## Environment Availability

Phase 2 has no new external dependencies.

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (cloud) | All drop reads | ✓ (Phase 1) | n/a | — |
| `@supabase/supabase-js` | `lib/drops.ts`, `/api/drop` | ✓ | ^2.101.1 | — |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars | Server fetch | ✓ (Phase 1) | n/a | — |
| Square API | Existing `/api/frozen-items` and `/api/checkout` | ✓ | 2024-12-18 | — |
| `npx supabase` CLI | Regenerate `database.types.ts` after migration 0002 | ✓ (devDep `supabase ^2.84.10`) | 2.84.10 | — |
| Internet during dev | Live Supabase reads | ✓ | n/a | — |

**Missing dependencies:** None. Phase 2 is fully unblocked from an environment standpoint.

---

## Validation Architecture

`workflow.nyquist_validation: true` per `.planning/config.json`. Validation section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18, node environment |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/<file>.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|--------------|
| **DATA-03** | Active drop config + pickup options resolve from Supabase to a `DropDTO` shape | unit (with mocked Supabase client) | `npx vitest run tests/drops.test.ts` | ❌ Wave 0 |
| **DATA-04** | `fetchActiveDrop` returns `null` when no row has `status='active'`; returns the drop when one does | unit | `npx vitest run tests/drops.test.ts` | ❌ Wave 0 |
| **DATA-04** | `app/page.tsx` renders TeaserPage when `drop.status !== 'active'`; renders OrderLanding otherwise | manual smoke (no jsdom in this project) | `npm run dev` then visit `/` with seed in each state | n/a — manual |
| **DATA-05** | `PICKUP_OPTIONS` no longer exists in `lib/config.ts`; consumers compile | static check | `! grep -r 'PICKUP_OPTIONS' components/ lib/ app/ tests/` then `npx tsc --noEmit` | n/a — grep + tsc |
| **DATA-05** | Pickup options rendered in CheckoutClient match the seed in `drop_pickup_options` | manual smoke | `npm run dev` → `/checkout` → visual check | n/a — manual |
| **ORD-04** | Checkout POST returns 409 with "drop has closed" when `drops.status='closed'` | integration (mocked Supabase) OR direct curl against running dev server | `npx vitest run tests/checkoutDropGate.test.ts` (if extracted) **or** `curl -X POST localhost:3000/api/checkout -d '{...}'` | ❌ Wave 0 |
| **ORD-04** | Checkout POST returns 409 with "sold out" when both products fully reserved | integration | same as above | ❌ Wave 0 |
| **ORD-04** | Checkout POST returns 200 when drop is active and capacity remains | integration | same as above | ❌ Wave 0 |
| **ORD-05** | `useActiveDrop` polling hook fetches `/api/drop` every 30s and updates state | unit (fake timers) | `npx vitest run tests/useActiveDrop.test.ts` — *only if hook is decomposed into a pure helper; otherwise manual* | ❌ Wave 0 (optional) |
| **ORD-05** | A product whose bucket is `soldOut: true` in the polled response renders disabled in `FrozenItemCard` | manual smoke | `npm run dev` → flip seed `reserved_pulled_pork = capacity_pulled_pork` in Supabase Studio → wait 30s → observe card greys out without reload | n/a — manual |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/drops.test.ts` (or whichever file the task touches) + `rm -rf .next && npx tsc --noEmit`
- **Per wave merge:** `npm run test` + `npm run lint` + `rm -rf .next && npx tsc --noEmit`
- **Phase gate:** Full suite green + manual smoke checklist below before `/gsd:verify-work`

### Manual Smoke Checklist (phase gate)

Things automated tests cannot prove because Vitest is node-only and the project has no E2E framework:

- [ ] Visit `/` with `drops.status = 'active'` → see OrderLanding with drop title + cutoff banner
- [ ] Set `drops.status = 'closed'` → reload `/` → see TeaserPage with "Notify Me" CTA
- [ ] Set `drops.status = 'upcoming'` → reload `/` → see TeaserPage (D-03)
- [ ] On active drop, set both `reserved_pulled_pork = capacity_pulled_pork` and `reserved_brisket = capacity_brisket` → wait 30s on `/` (do not reload) → all FrozenItemCards turn grey (ORD-05 reactivity)
- [ ] On `/checkout` with seed having one pickup option fully sold out → that card shows grey "Sold Out" badge and is unselectable
- [ ] Submit a checkout while drop is `closed` → 409 response, inline error: "This drop has closed."
- [ ] Submit a valid checkout → completes Square invoice flow (regression check)
- [ ] DevTools network tab on `/`: confirm `/api/drop` is fetched every 30s, paused when tab hidden

### Wave 0 Gaps

- [ ] `tests/drops.test.ts` — covers DATA-03, DATA-04. Mocks `getSupabaseClient` to return canned drop+pickup data. Verifies `DropDTO` shape, sold-out derivation, null on no active drop.
- [ ] `tests/checkoutDropGate.test.ts` — covers ORD-04. Either extract the precheck into a pure `checkDropReady(drop)` helper for unit-testability, or write an integration test that mocks `getSupabaseClient` and runs the route handler directly.
- [ ] `supabase/migrations/0002_drop_cutoff.sql` — adds `order_cutoff_at` column. Required before `lib/drops.ts` can compile against regenerated `database.types.ts`.
- [ ] `lib/database.types.ts` regenerated after migration 0002.
- [ ] No new framework install needed.

---

## Recommended Approach

### Build order (suggested wave decomposition)

**Wave 0 — Test scaffolding**
1. Write `tests/drops.test.ts` skeleton with mocked Supabase client (red).
2. Write `tests/checkoutDropGate.test.ts` skeleton (red).

**Wave 1 — Schema + types**
1. Create `supabase/migrations/0002_drop_cutoff.sql` (add `order_cutoff_at`, set seed drop active with cutoff).
2. Apply migration in dev Supabase project.
3. Regenerate `lib/database.types.ts`.
4. Add `DropDTO`, `PickupOptionDTO`, `DropStatus`, `CapacitySlot` to `lib/types.ts`.
5. Update `CheckoutRequestBody` interface.

**Wave 2 — Server data layer**
1. Create `lib/drops.ts` with `import "server-only"`, `fetchActiveDrop()`, helper formatters.
2. Create `app/api/drop/route.ts`.
3. Make `tests/drops.test.ts` green.

**Wave 3 — Server-side gating in checkout route**
1. Update `app/api/checkout/route.ts`: change schema (`dropId`, `pickupOptionId`), add precheck on `drops.status` and global sold-out, return 409 with copy from UI-SPEC.
2. Make `tests/checkoutDropGate.test.ts` green.

**Wave 4 — Storefront wiring**
1. Modify `app/page.tsx` to async RSC; fetch drop; branch to TeaserPage or OrderLanding.
2. Create `components/TeaserPage.tsx` per UI-SPEC (mailing list input is a static stub for Phase 2).
3. Create `components/DropHeader.tsx`; modify `OrderLanding.tsx` to render it (replaces line 76); pass `initialDrop` prop.
4. Create `components/hooks/useActiveDrop.ts`; wire into OrderLanding.
5. Add `forceSoldOut?: boolean` prop to `FrozenItemCard.tsx`; implement `bucketForItemName` matcher in OrderLanding.
6. Loading skeleton (UI-SPEC) — replace plain "Loading frozen menu..." text.

**Wave 5 — Checkout client**
1. Modify `app/checkout/page.tsx`: also fetch drop; if not active, `redirect("/")`. Pass `pickupOptions` and `dropId` to `CheckoutClient`.
2. Create `components/PickupOptionCard.tsx` per UI-SPEC.
3. Modify `CheckoutClient.tsx`: drop `PICKUP_OPTIONS` import, accept `pickupOptions` and `dropId` props, render `PickupOptionCard` grid, send new payload shape, handle 409 response inline.

**Wave 6 — Cleanup**
1. Update `components/Footer.tsx`: drop `PICKUP_OPTIONS` import; remove dated banner or replace with generic copy.
2. Delete `PICKUP_OPTIONS` export from `lib/config.ts`.
3. Delete obsolete `PickupOption` interface from `lib/types.ts`.
4. `rm -rf .next && npx tsc --noEmit && npm run test && npm run lint` — full green.
5. Manual smoke checklist.

### What to delete

- `PICKUP_OPTIONS` constant in `lib/config.ts`
- `PickupOption` interface in `lib/types.ts` (after `CheckoutClient`/`Footer`/checkout-route migrations)
- Hardcoded "Orders close March 10, 2026." line in `OrderLanding.tsx:76`
- `locationLabel: z.enum(["Preston", "Orem"])` Zod constraint in `app/api/checkout/route.ts`
- The Footer's dated pickup banner (D-12 implied — recommend, not strictly required)

---

## Sources

### Primary (HIGH confidence)
- **`.planning/phases/02-drop-config-storefront/02-CONTEXT.md`** — Locked decisions D-01 through D-13
- **`.planning/phases/02-drop-config-storefront/02-UI-SPEC.md`** — Visual contracts, copy, interaction states
- **`.planning/REQUIREMENTS.md`** — DATA-03, DATA-04, DATA-05, ORD-04, ORD-05 definitions
- **`.planning/STATE.md`** — Phase 1 lessons (`.next/` cache, `int` vs `bool` for ROW_COUNT)
- **`./CLAUDE.md`** — Project conventions, error handling, naming, named exports
- **`supabase/migrations/0001_foundation.sql`** — Live schema; confirms `drops.status` check constraint, `reserve_pickup_slot` signature, **absence** of `order_cutoff_at`
- **`lib/database.types.ts`** — Generated row/insert/update shapes for `drops` and `drop_pickup_options`
- **`lib/supabase.ts`** — Server-only singleton pattern, reads `process.env` directly
- **`app/api/test-seed/route.ts`** — Existing pattern for `.from(...).select(...)` against the schema
- **`app/api/checkout/route.ts`** — Current checkout flow, Zod schema, error handling pattern
- **`components/OrderLanding.tsx`** — Current hardcoded line at line 76; integration target
- **`components/CheckoutClient.tsx`** — `PICKUP_OPTIONS` consumer #1
- **`components/Footer.tsx`** — `PICKUP_OPTIONS` consumer #2
- **`components/hooks/useFrozenItems.ts`** — Hook pattern to mirror for `useActiveDrop`
- **`.planning/config.json`** — Confirms `nyquist_validation: true`, `commit_docs: true`

### Secondary (MEDIUM confidence)
- Next.js App Router server-component data fetching conventions (`force-dynamic`, `cache: "no-store"`) — well-established for Next 14+, valid for Next 16
- `@supabase/supabase-js` v2 query patterns (already in use in `app/api/test-seed/route.ts`)

### Tertiary (LOW confidence — none)
None — every recommendation is grounded in existing files or locked decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all libraries already in `package.json`
- Architecture: HIGH — patterns directly mirror existing `useFrozenItems`, `app/checkout/page.tsx`, `app/api/test-seed/route.ts`
- Pitfalls: HIGH — most are concrete from Phase 1's documented lessons or schema inspection
- Schema gap (`order_cutoff_at` missing): HIGH — verified by reading the migration file and grepping for `cutoff`

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — schema is stable, no fast-moving deps in scope)
