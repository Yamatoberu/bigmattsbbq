# Technology Stack — Milestone 2 Additions

**Project:** Big Matt's BBQ — Supabase + Resend Integration
**Researched:** 2026-04-03
**Confidence note:** WebSearch and WebFetch were unavailable for this research session. Findings are based on training data through August 2025 and direct package.json inspection of the existing codebase. Supabase JS v2 and Resend v4 were stable, mature packages by that date. Treat version numbers as MEDIUM confidence — verify exact latest patch versions before installing.

---

## Existing Stack (Do Not Change)

| Technology | Version | Role |
|------------|---------|------|
| Next.js | ^16.1.6 | Framework — App Router, Server Components, API Routes |
| React | 18.3.1 | UI rendering |
| TypeScript | ^5.5.4 | All source files, strict mode |
| Tailwind CSS | ^3.4.13 | Styling, custom `ember`/`smoke` palettes |
| Zod | ^3.24.2 | Request validation at API boundaries |
| Vitest | ^4.0.18 | Unit test runner |

The new stack additions attach to this without replacing anything.

---

## New Dependencies to Add

### Supabase

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `@supabase/supabase-js` | `^2.44.0` | Supabase client — database queries, realtime, RLS | MEDIUM |
| `@supabase/ssr` | `^0.5.0` | SSR-safe client factory for Next.js App Router (server components + API routes) | MEDIUM |

**Why `@supabase/ssr` instead of just `@supabase/supabase-js`:**
Next.js App Router splits execution between Server Components, Route Handlers, and the browser. A single client instance breaks because cookies (for auth/session) are not accessible in all contexts the same way. `@supabase/ssr` provides `createServerClient` (for Server Components and Route Handlers — reads cookies via Next.js `cookies()`) and `createBrowserClient` (for Client Components). For this project, which has no user auth, the main benefit is getting a correctly configured server-side client for API routes without cookie handling overhead. Use `createClient` from `@supabase/supabase-js` only for server-side scripts and migrations — not in the application itself.

**Do not use `@supabase/auth-helpers-nextjs`** — it is deprecated and replaced by `@supabase/ssr`.

**Do not use the Supabase Realtime subscription API** for this project. Inventory source of truth is Square, not Supabase. Realtime adds connection overhead with no benefit here.

### Resend

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `resend` | `^4.0.0` | Resend Node.js SDK — send transactional and broadcast emails | MEDIUM |
| `react-email` | `^3.0.0` | Email template component system — renders React to HTML for Resend | MEDIUM |
| `@react-email/components` | `^0.0.22` | Pre-built accessible email components (Html, Body, Container, Button, etc.) | MEDIUM |

**Why `react-email` + `@react-email/components`:**
Resend is built by the same team as react-email. The workflow is: write email templates as React components, call `render()` from `@react-email/render` to produce HTML, pass that HTML string to `resend.emails.send()`. This gives typed, reusable, locally-previewable email templates that match the existing TypeScript/React codebase. The alternative is raw HTML strings — harder to maintain, no type safety, error-prone.

**Do not use `nodemailer`** — it requires an SMTP server. Resend's HTTP API via its SDK is simpler, more reliable, and fits the serverless Vercel environment.

**Do not use `@sendgrid/mail`** — Resend is simpler for this scale, already decided in PRD.

---

## No Additional Packages Needed

| Need | Solution | Why No Package |
|------|---------|----------------|
| Supabase schema migrations | Supabase CLI (dev tooling, not a dependency) | CLI handles migrations, not bundled into the app |
| Database type generation | `supabase gen types typescript` CLI command | Generates a `database.types.ts` file; no runtime package needed |
| Email styling | Tailwind-like inline styles via `@react-email/components` | react-email components handle inline CSS; full Tailwind not needed in email context |
| Atomic order reservation | Supabase Postgres function + RPC call | Built into `@supabase/supabase-js` — call with `supabase.rpc()` |

---

## Pattern: Supabase Client Instantiation

The existing project uses a `lib/env.ts` pattern to validate and expose environment variables. Follow the same pattern for Supabase:

**`lib/supabase.ts`** (server-side, for API routes):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Use in Route Handlers (app/api/**) only
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role for API routes that bypass RLS
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}
```

**Critical: service role key vs anon key.** API routes in this project are server-side only (no user auth). Use `SUPABASE_SERVICE_ROLE_KEY` in Route Handlers so Supabase RLS is bypassed — the app controls access, not Supabase auth. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser exposure but not needed unless a Client Component queries Supabase directly (which this project should avoid — keep all Supabase access server-side).

---

## Pattern: Resend Client Instantiation

**`lib/resend.ts`**:
```typescript
import { Resend } from "resend";

// Singleton — instantiate once, reuse across API routes
export const resend = new Resend(process.env.RESEND_API_KEY);
```

Email templates live in `emails/` at the project root (react-email convention):
- `emails/OrderConfirmation.tsx`
- `emails/DropAnnouncement.tsx`

Templates are Server-only files — they import `@react-email/components` and export a React component. They are never imported in Client Components.

---

## Environment Variables to Add

Extend the existing `lib/env.ts` validation pattern with:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Project URL from Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon (public) key — safe to expose
SUPABASE_SERVICE_ROLE_KEY=          # Service role key — server-only, never expose

# Resend
RESEND_API_KEY=                     # From Resend dashboard
RESEND_FROM_ADDRESS=                # e.g. orders@bigmattsbbq.com
```

The `NEXT_PUBLIC_` prefix causes Next.js to bundle those values into the client bundle. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` should carry that prefix. The service role key and Resend key must NOT have the `NEXT_PUBLIC_` prefix.

---

## Supabase Schema Design

### Core Tables

**`drops`** — Each limited-run sale event. One row per drop.

```sql
create table drops (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                      -- "Spring Drop #3"
  status        text not null default 'draft'       -- draft | active | closed | sold_out
                check (status in ('draft','active','closed','sold_out')),
  opens_at      timestamptz not null,
  closes_at     timestamptz not null,
  created_at    timestamptz not null default now()
);
```

**`drop_pickup_options`** — Pickup windows per drop. Replaces `PICKUP_OPTIONS` in `lib/config.ts`.

```sql
create table drop_pickup_options (
  id              uuid primary key default gen_random_uuid(),
  drop_id         uuid not null references drops(id) on delete cascade,
  location_label  text not null,               -- "Cache Valley" | "Utah County"
  pickup_at       timestamptz not null,
  date_label      text not null,               -- "Apr 18" — display string
  capacity        integer not null default 0,  -- max orders for this pickup slot
  reserved        integer not null default 0   -- counter incremented atomically on order
);
```

**`orders`** — One row per placed order. Links to Square for invoice tracking.

```sql
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  drop_id             uuid not null references drops(id),
  pickup_option_id    uuid not null references drop_pickup_options(id),
  square_order_id     text,                        -- populated after Square order created
  square_invoice_id   text,                        -- populated after Square invoice created
  customer_email      text not null,
  customer_first_name text not null,
  customer_last_name  text not null,
  customer_phone      text,
  subscribed_to_list  boolean not null default false,
  cart_snapshot       jsonb not null,              -- [{variationId, quantity, name, priceCents}]
  status              text not null default 'pending'
                      check (status in ('pending','confirmed','cancelled')),
  created_at          timestamptz not null default now()
);
```

**Why `cart_snapshot` as JSONB:** The cart at order time is a point-in-time record. Square is the inventory source of truth; Supabase shouldn't try to normalize the catalog. Store what the customer ordered as JSON and use it for confirmation emails and order history.

**`mailing_list`** — Standalone signups from the home page and footer.

```sql
create table mailing_list (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  first_name   text,
  source       text not null default 'footer'   -- 'footer' | 'checkout'
               check (source in ('footer','checkout')),
  subscribed   boolean not null default true,
  created_at   timestamptz not null default now()
);
```

**Why `source` column:** Tracks whether signups came from the footer widget or during checkout opt-in. Useful for analytics and future segmentation without schema changes.

**`email_logs`** — Audit trail for all outbound emails via Resend.

```sql
create table email_logs (
  id           uuid primary key default gen_random_uuid(),
  recipient    text not null,
  template     text not null,                   -- 'order_confirmation' | 'drop_announcement'
  resend_id    text,                            -- ID returned by Resend API
  status       text not null default 'sent'
               check (status in ('sent','failed')),
  error        text,                            -- populated on failure
  order_id     uuid references orders(id),     -- null for mailing list emails
  sent_at      timestamptz not null default now()
);
```

### Atomic Capacity Enforcement

The critical requirement is preventing overselling — the same problem Square's idempotency keys solve for inventory. Supabase does this with a Postgres function called via RPC:

```sql
create or replace function reserve_pickup_slot(p_option_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_capacity  integer;
  v_reserved  integer;
begin
  -- Row-level lock prevents concurrent reservation of the same slot
  select capacity, reserved
    into v_capacity, v_reserved
    from drop_pickup_options
   where id = p_option_id
     for update;

  if v_reserved >= v_capacity then
    return false;  -- slot full
  end if;

  update drop_pickup_options
     set reserved = reserved + 1
   where id = p_option_id;

  return true;  -- reservation succeeded
end;
$$;
```

Called in the checkout API route:
```typescript
const { data: reserved } = await supabase.rpc("reserve_pickup_slot", {
  p_option_id: pickupOptionId,
});
if (!reserved) {
  return NextResponse.json({ error: "That pickup slot is now full." }, { status: 409 });
}
```

**Why a Postgres function instead of application-level check-then-update:** A read-then-write in application code has a race condition window. Two concurrent checkout requests can both read `reserved < capacity`, both proceed, and both increment — overselling by one. The `FOR UPDATE` row lock in the Postgres function serializes concurrent reservations. This is the correct pattern for capacity enforcement without a queue.

### Indexes

```sql
-- Fast lookup of active/upcoming drops
create index drops_status_opens_at on drops(status, opens_at);

-- Fast pickup options lookup per drop
create index drop_pickup_options_drop_id on drop_pickup_options(drop_id);

-- Order history by email (customer support lookups)
create index orders_customer_email on orders(customer_email);

-- Order lookup by drop
create index orders_drop_id on orders(drop_id);

-- Email uniqueness already enforced, but also index for exists-check perf
create index mailing_list_email on mailing_list(email);
```

### Row Level Security (RLS)

For this project, RLS should be enabled on all tables but all policies should restrict to the service role only. There is no user auth in the app — all Supabase access is from server-side Route Handlers using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. Enabling RLS with restrictive policies ensures that if the anon key is ever accidentally used server-side, it cannot read or write data.

```sql
alter table drops enable row level security;
alter table drop_pickup_options enable row level security;
alter table orders enable row level security;
alter table mailing_list enable row level security;
alter table email_logs enable row level security;
-- No policies = no access for anon/authenticated roles.
-- Service role bypasses RLS automatically.
```

---

## Dev Tooling (Not App Dependencies)

| Tool | Purpose | Install |
|------|---------|---------|
| Supabase CLI | Local dev DB, migrations, type gen | `brew install supabase/tap/supabase` |
| `supabase start` | Runs local Postgres + Studio via Docker | CLI command |
| `supabase gen types typescript` | Generates `lib/database.types.ts` from schema | CLI command |
| `supabase db push` | Pushes local migrations to remote project | CLI command |

The Supabase CLI uses Docker locally. The generated `database.types.ts` file gives full TypeScript types for all tables and RPCs — pass it as the generic to `createServerClient<Database>()` for end-to-end type safety on all Supabase queries.

**Recommended local workflow:**
1. Write migration SQL in `supabase/migrations/`
2. `supabase db reset` to apply locally
3. `supabase gen types typescript --local > lib/database.types.ts`
4. Develop and test against local DB
5. `supabase db push` to apply to remote project

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Database | Supabase (Postgres) | PlanetScale (MySQL) | Already decided in PRD; Postgres functions needed for atomic reservation |
| Database | Supabase (Postgres) | Prisma ORM | Prisma adds a separate query engine, cold-start overhead on Vercel, and migration complexity. Supabase's auto-generated types + raw SQL is simpler for this scale. |
| Email SDK | Resend | Postmark | Already decided in PRD; Resend + react-email is one ecosystem |
| Email templates | react-email | MJML | MJML requires a compilation step and doesn't integrate with the React codebase. react-email templates are just TSX files. |
| Email templates | react-email | Raw HTML strings | No type safety, hard to maintain, impossible to test. |
| Supabase client (SSR) | `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Deprecated. `@supabase/ssr` is its replacement. |
| Capacity enforcement | Postgres RPC + `FOR UPDATE` | Application-level check-then-update | Race condition — two concurrent checkouts can both pass the check and both reserve, overselling the slot. |

---

## Installation

```bash
# Production dependencies
npm install @supabase/supabase-js @supabase/ssr resend react-email @react-email/components

# No new dev dependencies needed (Supabase CLI is installed via brew, not npm)
```

---

## Sources

- Training data through August 2025 — Supabase JS v2, `@supabase/ssr`, Resend v4 all stable by that date — MEDIUM confidence on exact patch versions
- `@supabase/auth-helpers-nextjs` deprecation in favor of `@supabase/ssr` documented in Supabase changelog (late 2023, confirmed stable pattern by 2025) — HIGH confidence
- Postgres `FOR UPDATE` row-locking for atomic reservation — standard Postgres pattern, not library-version-dependent — HIGH confidence
- react-email as Resend's recommended template system — same team, documented as primary integration — HIGH confidence
- Service role key bypasses RLS in Supabase — core Supabase architecture, documented behavior — HIGH confidence
