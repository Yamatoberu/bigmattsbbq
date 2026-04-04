# Architecture Patterns: Hybrid Square + Supabase

**Domain:** Frozen BBQ e-commerce — limited-run drop model
**Researched:** 2026-04-03
**Confidence:** HIGH (derived from direct codebase analysis + well-established integration patterns)

---

## Recommended Architecture

### System Boundary Map

```
Browser
  │
  ├─ localStorage ────────────── CartContext (existing)
  │
  └─ fetch() ─────────────────── Next.js App Router
                                        │
                     ┌──────────────────┼──────────────────┐
                     │                  │                  │
               /api/drops        /api/checkout       /api/mailing-list
               /api/frozen-items  (extended)         /api/email-logs (internal)
                     │                  │
                     │        ┌─────────┴──────────┐
                     │        │                    │
                  Supabase   Square              Resend
                  (drops,    (catalog,           (transactional
                  orders,    inventory,          + mailing list
                  mailing    customers,          emails)
                  list,      invoices)
                  email logs)
```

Square remains source of truth for catalog, inventory prices, customer records, and invoices. Supabase owns everything the existing system doesn't: drop configuration, order cross-reference, mailing list, and email audit trail.

---

## Component Boundaries

### Existing Components (unchanged)

| Component | Responsibility | Owned Data |
|-----------|---------------|------------|
| `lib/square.ts` | Square API client — all Square calls flow through here | — |
| `app/api/frozen-items/route.ts` | Fetch catalog + inventory from Square | — |
| `app/api/checkout/route.ts` | Create Square customer, order, invoice | Square order/invoice IDs |
| `CartContext` | Client-side cart state in localStorage | Cart items, quantities |
| `lib/config.ts` | Static packages, hardcoded pickup options (to be replaced) | Pickup options (migrating out) |

### New Components

| Component | Responsibility | Owned Data |
|-----------|---------------|------------|
| `lib/supabase.ts` | Supabase client — all Supabase calls flow through here | — |
| `lib/resend.ts` | Resend client — all email calls flow through here | — |
| `app/api/drops/route.ts` | GET active drop config from Supabase | — |
| `app/api/checkout/route.ts` | Extended — adds Supabase order record + Resend email after Square ops | — |
| `app/api/mailing-list/route.ts` | POST new subscriber to Supabase | — |
| `app/(static)/catering/page.tsx` | Static catering page | — |
| `app/(static)/about/page.tsx` | Static about page | — |
| `app/(static)/contact/page.tsx` | Static contact page | — |

---

## Supabase Data Model

### `drops` table

Replaces `PICKUP_OPTIONS` in `lib/config.ts` and the hardcoded hero copy cutoff date.

```sql
drops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                    -- "Spring 2026 Drop"
  is_active   boolean NOT NULL DEFAULT false,   -- only one active at a time
  order_cutoff_at  timestamptz NOT NULL,        -- gate for checkout availability
  created_at  timestamptz NOT NULL DEFAULT now()
)
```

### `drop_pickup_options` table

One row per pickup window within a drop. Replaces the `PickupOption[]` array.

```sql
drop_pickup_options (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id         uuid NOT NULL REFERENCES drops(id),
  location_label  text NOT NULL,           -- "Cache Valley" | "Utah County"
  pickup_at       timestamptz NOT NULL,    -- exact ISO datetime
  display_label   text NOT NULL            -- "Sat Apr 19, 5:30 PM"
)
```

### `orders` table

Cross-reference between Supabase and Square. Created after Square ops succeed.

```sql
orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id          uuid NOT NULL REFERENCES drops(id),
  square_order_id  text NOT NULL UNIQUE,
  square_invoice_id text NOT NULL,
  customer_email   text NOT NULL,
  customer_name    text NOT NULL,
  pickup_option_id uuid NOT NULL REFERENCES drop_pickup_options(id),
  cart_snapshot    jsonb NOT NULL,          -- [{variationId, quantity, name, priceCents}]
  mailing_list_opt_in boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
)
```

`cart_snapshot` is intentional denormalization — it freezes the order state at the moment of purchase so confirmation emails and future order views are accurate even if the Square catalog changes.

### `mailing_list` table

```sql
mailing_list (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  first_name  text,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL    -- "checkout" | "homepage" | "footer"
)
```

`UNIQUE` on email prevents duplicates. An upsert on conflict is fine (update `source` if re-subscribed elsewhere).

### `email_logs` table

Audit trail for all Resend sends. Written after each send attempt.

```sql
email_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL,             -- "order_confirmation" | "drop_announcement"
  recipient    text NOT NULL,
  resend_id    text,                       -- null if send failed
  status       text NOT NULL,             -- "sent" | "failed"
  error        text,
  order_id     uuid REFERENCES orders(id),
  sent_at      timestamptz NOT NULL DEFAULT now()
)
```

---

## Data Flows

### Drop Load (replaces hardcoded config)

```
Browser mounts OrderLanding
  → GET /api/drops
      → lib/supabase.ts queries drops WHERE is_active = true
      → joins drop_pickup_options
      → returns DropDTO { id, name, orderCutoffAt, pickupOptions[] }
  → Component stores in React state
  → Renders pickup selector + hero cutoff date from live data
```

This eliminates the hardcoded `PICKUP_OPTIONS` in `lib/config.ts` and the expired hero copy string. The cutoff date becomes a real gate: if `now > orderCutoffAt`, checkout is hidden.

### Checkout (extended — the critical flow)

The checkout API route becomes the integration seam. Square ops happen first; Supabase/Resend ops follow. If Square fails, nothing else runs. If Supabase/Resend fail after Square succeeds, those are logged but do not fail the checkout response to the customer (Square invoice email is the fallback).

```
Client POSTs /api/checkout with: customer, pickup, cart, mailingListOptIn, dropId

API route:
  1. Validate payload with Zod (add dropId, mailingListOptIn fields)
  2. Resolve drop + pickup option from Supabase (validate dropId is active, cutoff not passed)
  3. Square ops (existing):
     a. Upsert Square customer by email
     b. Create Square order
     c. Create Square invoice
     d. Publish Square invoice → triggers Square email
  4. Supabase ops (new, after Square succeeds):
     a. Insert orders row with square_order_id, square_invoice_id, cart_snapshot
     b. If mailingListOptIn: upsert mailing_list row
  5. Resend ops (new, after Supabase write):
     a. Send confirmation email via lib/resend.ts
     b. Write to email_logs regardless of send result
  6. Return { orderId, invoiceId, pickupNote } (same shape as existing)
```

**Failure handling:**
- Step 2 fails (drop inactive/expired): return 400 before any Square ops
- Step 3 fails: return error as today — no Supabase or Resend ops run
- Step 4 fails: log error, but return 200 — Square invoice email is the fallback; order was placed
- Step 5 fails: log to email_logs with status "failed", return 200 — Square invoice covers the customer

This means Square invoice email is the safety net for confirmation. Resend confirmation is a layer on top, not a dependency.

### Mailing List Signup (standalone — homepage/footer)

```
User submits email on homepage or footer
  → POST /api/mailing-list { email, firstName?, source }
      → Zod validation
      → lib/supabase.ts upserts mailing_list row (on conflict do nothing or update source)
      → lib/resend.ts sends welcome email (optional for MVP)
      → Write email_logs row
  → Returns { success: true }
```

This route is deliberately separate from checkout. Checkout handles its own opt-in internally.

### Confirmation Page (minor change)

The confirmation page currently reads Square `orderId` and `pickupNote` from URL query params. No structural change needed. The Supabase order record is written server-side during checkout — the confirmation page does not need to query it for MVP. A future admin view can query it directly.

---

## New Library Modules

### `lib/supabase.ts`

Mirrors the pattern of `lib/square.ts`: a single client with typed query functions. No raw Supabase queries outside this file.

```typescript
// Exports:
getActiveDropWithPickupOptions(): Promise<DropWithPickups>
insertOrder(data: InsertOrderParams): Promise<string>  // returns order UUID
upsertMailingListSubscriber(data: SubscriberParams): Promise<void>
insertEmailLog(data: EmailLogParams): Promise<void>
```

Uses `@supabase/supabase-js` server client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Service role key (not anon key) is correct here — all calls are server-side in API routes, never in client components. No RLS needed for API routes using the service role.

### `lib/resend.ts`

Thin wrapper around the Resend SDK.

```typescript
// Exports:
sendOrderConfirmation(params: OrderConfirmationParams): Promise<{ id: string } | null>
sendMailingListWelcome(params: WelcomeEmailParams): Promise<{ id: string } | null>
```

Both functions catch their own errors, log them, and return null on failure so callers can write to `email_logs` without try/catch at the call site.

### `lib/env.ts` (extended)

Add `getSupabaseEnv()` and `getResendEnv()` alongside `getSquareEnv()`. Same pattern: validate required vars at call time, throw on missing.

New env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS` (e.g. `orders@bigmattsbbq.com`)

### `lib/types.ts` (extended)

New types to add:
- `DropDTO` — what the client receives from `/api/drops`
- `DropPickupOption` — normalized pickup option from Supabase
- `InsertOrderParams` — what the checkout route passes to `lib/supabase.ts`
- `CartSnapshotItem` — the denormalized item stored in `orders.cart_snapshot`

---

## New API Routes

### `GET /api/drops`

Returns the active drop config. Called by `OrderLanding` on mount, same pattern as `GET /api/frozen-items`.

**Response:**
```json
{
  "id": "uuid",
  "name": "Spring 2026 Drop",
  "orderCutoffAt": "2026-04-10T23:59:00-06:00",
  "pickupOptions": [
    {
      "id": "uuid",
      "locationLabel": "Cache Valley",
      "pickupAt": "2026-04-19T17:30:00-06:00",
      "displayLabel": "Sat Apr 19, 5:30 PM"
    }
  ]
}
```

Returns `{ active: false }` when no active drop exists — `OrderLanding` renders a "no active drop" state instead of the checkout flow.

### `POST /api/mailing-list`

**Request:**
```json
{ "email": "...", "firstName": "...", "source": "homepage" }
```

**Response:** `{ "success": true }` or `{ "error": "..." }` with 400/500.

---

## Routing / Page Structure

New static pages added to App Router:

```
app/
  catering/page.tsx      — static, server component
  about/page.tsx         — static, server component
  contact/page.tsx       — static, server component
```

No `(static)` route group is needed unless the project wants a shared layout for those pages. A simple flat structure is easier and sufficient for MVP. These pages have no data dependencies.

Navigation is added to `app/layout.tsx` — currently the layout wraps in `<Providers>` only, with no nav. A `<SiteNav>` component is added to the layout so it appears on every page.

---

## Anti-Patterns to Avoid

### Splitting Square inventory enforcement with Supabase capacity

**What it looks like:** Tracking remaining capacity in a Supabase `drop_capacity` column and decrementing it on order placement.

**Why it breaks:** Creates a dual-source problem. Square is the inventory truth. Any discrepancy between a Supabase capacity counter and Square inventory counts causes silent overselling or false sold-outs. The existing codebase already notes that inventory is not decremented on checkout (see CONCERNS.md) — the fix for that is Square-side (decrement Square inventory), not a parallel Supabase counter.

**Instead:** Keep Square as the single inventory source of truth. Use `drop_pickup_options` for scheduling only, not capacity enforcement.

### Calling Supabase or Resend from client components

**What it looks like:** A React component imports `lib/supabase.ts` or the Resend SDK directly and makes calls.

**Why it breaks:** The service role key gets bundled into client JavaScript, exposing full Supabase access to the browser. All Supabase and Resend calls must stay in API routes.

**Instead:** The pattern is already established — `OrderLanding` and `CheckoutClient` call `/api/` routes via `fetch()`. Follow the same pattern for all new data operations.

### Making Supabase ops block the checkout response

**What it looks like:** `await supabase.insertOrder(...)` is awaited before returning 200 to the client, and the checkout throws a 500 if that insert fails.

**Why it breaks:** The customer's order succeeded in Square. If a Supabase write hiccups (network timeout, cold start), the customer sees "Checkout failed" even though their Square invoice email is on the way. This erodes trust in a payment flow.

**Instead:** Log Supabase and Resend failures. Return success to the client if Square ops completed.

---

## Suggested Build Order

Dependencies drive this order — each layer requires what's before it.

**1. Environment and lib stubs**
Add `getSupabaseEnv()`, `getResendEnv()` to `lib/env.ts`. Create `lib/supabase.ts` and `lib/resend.ts` stubs with typed interfaces. New `lib/types.ts` additions.
- No external dependencies. Can be verified with TypeScript compiler only.

**2. Supabase schema**
Create the four tables in Supabase (drops, drop_pickup_options, orders, mailing_list, email_logs). Seed one test drop with two pickup options.
- Required before any API route can query drop data or write orders.

**3. `GET /api/drops` route**
Wire `lib/supabase.ts` query for active drop. Update `OrderLanding` to call this route instead of reading `lib/config.ts`. Add "no active drop" UI state.
- This replaces the hardcoded `PICKUP_OPTIONS`. Must work before checkout can reference `dropId`.

**4. Static pages + navigation**
Catering, About, Contact pages. `<SiteNav>` added to layout. Mailing list section on homepage and footer.
- No data dependencies. Can be built in parallel with step 3.

**5. `POST /api/mailing-list` route**
New standalone route. Standalone from checkout, so can be built and tested independently.
- Requires Supabase schema (step 2).

**6. Extended checkout route**
Add `dropId` and `mailingListOptIn` to the checkout Zod schema. Add Supabase order insert and mailing list upsert after existing Square ops. Add Resend confirmation email.
- Requires drops route (step 3) and mailing list route (step 5) to be working. The checkout route calls the same Supabase functions.
- `lib/resend.ts` must be complete before this step.

**7. Confirmation email template**
Resend email template for order confirmation (HTML). Wired into the extended checkout route.
- Can be designed/templated in parallel with step 6, integrated at the end.

---

## Scalability Notes

This is a low-volume system (limited-run drops, not continuous commerce). The architecture does not need to handle concurrent load spikes beyond what Vercel + Supabase + Resend handle by default. No caching layer, queue, or background worker is needed for MVP.

The one genuine atomicity concern — two customers ordering the last unit simultaneously — is a Square inventory problem, not a Supabase one. The existing codebase already identifies this as a missing critical feature (CONCERNS.md). The fix is to call Square's inventory decrement endpoint (`/v2/inventory/changes/batch-create`) during checkout and handle the conflict response if inventory hits zero. This is a Square-side change in the checkout route, not a new architectural layer.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Component boundaries | HIGH | Derived directly from codebase analysis |
| Supabase data model | HIGH | Standard Postgres patterns, no exotic features |
| Checkout extension strategy | HIGH | Existing route structure makes the seam obvious |
| Resend integration pattern | HIGH | Standard SDK wrapping, same pattern as Square client |
| Build order | HIGH | Dependency graph is unambiguous |
| Inventory atomicity | MEDIUM | The right fix (Square-side) is identified; implementation detail TBD |

---

*Architecture analysis: 2026-04-03*
