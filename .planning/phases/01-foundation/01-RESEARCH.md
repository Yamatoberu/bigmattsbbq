# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Supabase (PostgreSQL schema, RLS, RPC functions, TypeScript client)
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire Supabase data layer before any feature work begins. The work is three distinct concerns: (1) DDL — create five tables with correct column types and foreign keys, (2) security — enable RLS on every table with policies that block direct anon writes, and (3) infrastructure — deploy the `reserve_pickup_slot` RPC function and wire up a typed singleton client in `lib/supabase.ts`.

The project decision (D-09) means `@supabase/supabase-js` is the only package needed. Because all Supabase calls go through Next.js API routes using the service role key, there is no need for `@supabase/ssr` or cookie-based session management. The service role client bypasses RLS at the Postgres level (the `supabase_admin` role has `BYPASSRLS`), so RLS policies only need to block the `anon` role — no explicit "allow service role" policy is required.

The atomic reservation pattern (D-06) is a standard PostgreSQL conditional UPDATE: `UPDATE ... SET reserved_count = reserved_count + N WHERE reserved_count + N <= capacity RETURNING id`. If zero rows are returned, the capacity check failed. This is safe at READ COMMITTED isolation level when the WHERE clause targets a primary key column, because Postgres re-evaluates the condition after acquiring the row write lock.

**Primary recommendation:** Install `@supabase/supabase-js` as a runtime dependency, set up schema via a single migration file executed in the Supabase SQL editor (or via CLI), generate types with `npx supabase gen types typescript --project-id "$PROJECT_REF" > lib/database.types.ts`, and create `lib/supabase.ts` as a server-only singleton following the `lib/square.ts` pattern exactly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Capacity enforced at two levels: global per-product AND per-pickup-location per-product. Strictest wins.
- **D-02:** Capacity tracked per product (pulled pork and brisket independently).
- **D-03:** Capacity unit is bag count (integer). Each 0.5 lb bag = 1 unit.
- **D-04:** `reserve_pickup_slot` fails immediately when capacity is reached. No hold-and-expire pattern.
- **D-05:** If reservation succeeds but downstream Square calls fail, reservation is automatically released (rollback function).
- **D-06:** Atomicity via conditional counter update (`UPDATE ... SET reserved_count = reserved_count + N WHERE reserved_count + N <= capacity`). No explicit row locks.
- **D-07:** Test drop has 3 pickup locations: Cache Valley, Utah County, and Sandy (Salt Lake County).
- **D-08:** Global capacity: 200 bags pulled pork, 200 bags brisket. Per-location capacity: 65 bags of each product per location.
- **D-09:** Supabase client is server-only. All Supabase calls go through API routes. No client-side Supabase SDK.
- **D-10:** Types are auto-generated via `supabase gen types` CLI. Generated types live in a dedicated file, not hand-written in `lib/types.ts`.

### Claude's Discretion

- Column naming conventions, index strategy, and RLS policy specifics
- Migration file organization (single migration vs per-table)
- Generated types file location and import pattern
- Release/rollback function naming and signature

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Supabase schema created with tables for drops, drop_pickup_options, orders, mailing_list, and email_logs | DDL patterns, column types, foreign key constraints documented below |
| DATA-02 | Row-level security enabled on all Supabase tables from initial creation | RLS enable + deny-all-anon policy pattern documented below |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.101.1 | Supabase client — typed queries, RPC calls | Official JS client; works in Node.js server contexts without cookie handling |
| supabase (CLI, devDep) | 2.84.10 | `gen types` CLI for TypeScript generation | Official CLI; required for D-10 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (CLI, devDep) | 2.84.10 | `supabase gen types` command | Run after schema changes to regenerate `lib/database.types.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js | @supabase/ssr | SSR package is for auth cookie sessions; unnecessary overhead for server-only service role pattern |
| Single migration file | Per-table migration files | Per-table files add complexity with no benefit for a single schema deployment — single file is simpler to inspect and replay |

**Installation:**
```bash
npm install @supabase/supabase-js
npm install --save-dev supabase
```

**Version verification (confirmed 2026-04-04):**
- `@supabase/supabase-js`: 2.101.1
- `supabase` (CLI): 2.84.10

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── supabase.ts          # Typed singleton client (server-only)
├── database.types.ts    # Auto-generated — DO NOT EDIT BY HAND
├── env.ts               # Extended with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
└── types.ts             # Existing shared DTOs (unchanged)

supabase/
└── migrations/
    └── 0001_foundation.sql  # Single migration: all DDL + RLS + functions + seed
```

### Pattern 1: Service Role Singleton (server-only)

**What:** A module-level singleton that wraps `createClient` with service role credentials and auth session management disabled.
**When to use:** All Supabase calls in this project — API routes only, never browser.

```typescript
// lib/supabase.ts
// Source: https://github.com/orgs/supabase/discussions/30739
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  client = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return client;
}
```

This mirrors `lib/square.ts` exactly: named export function, no default export, throws on missing env vars.

### Pattern 2: Table DDL with RLS

**What:** All five tables created in one migration; RLS enabled immediately on creation with a deny-all policy for anon.
**When to use:** Initial schema setup.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- 1. Create table
create table public.drops (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  status      text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed'))
);

-- 2. Enable RLS immediately
alter table public.drops enable row level security;

-- 3. No policies created = anon reads and writes are both denied
-- The service role key bypasses RLS entirely at the database level (BYPASSRLS)
-- so no explicit service role policy is needed.
```

**Key insight:** Enabling RLS with zero policies = deny all for `anon` role. Service role bypasses RLS unconditionally — do NOT write policies that mention `service_role`.

### Pattern 3: Atomic Reservation RPC

**What:** PostgreSQL function using conditional UPDATE to atomically check + increment capacity.
**When to use:** Every order placement — called before any Square API calls.

```sql
-- Source: verified against PostgreSQL atomicity docs + Supabase RPC docs
create or replace function public.reserve_pickup_slot(
  p_drop_id          uuid,
  p_pickup_option_id uuid,
  p_product_name     text,   -- 'pulled_pork' | 'brisket'
  p_quantity         int
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_global_ok  bool;
  v_local_ok   bool;
begin
  -- Check and increment global capacity atomically
  update public.drops
  set    reserved_pulled_pork = case when p_product_name = 'pulled_pork'
                                      then reserved_pulled_pork + p_quantity
                                      else reserved_pulled_pork end,
         reserved_brisket     = case when p_product_name = 'brisket'
                                      then reserved_brisket + p_quantity
                                      else reserved_brisket end
  where  id = p_drop_id
    and  (p_product_name = 'pulled_pork' and reserved_pulled_pork + p_quantity <= capacity_pulled_pork
       or p_product_name = 'brisket'    and reserved_brisket + p_quantity <= capacity_brisket);

  get diagnostics v_global_ok = row_count;  -- 1 if updated, 0 if capacity exceeded

  if not v_global_ok then
    return jsonb_build_object('ok', false, 'reason', 'global_capacity_exceeded');
  end if;

  -- Check and increment per-location capacity atomically
  update public.drop_pickup_options
  set    reserved_pulled_pork = case when p_product_name = 'pulled_pork'
                                      then reserved_pulled_pork + p_quantity
                                      else reserved_pulled_pork end,
         reserved_brisket     = case when p_product_name = 'brisket'
                                      then reserved_brisket + p_quantity
                                      else reserved_brisket end
  where  id = p_pickup_option_id
    and  (p_product_name = 'pulled_pork' and reserved_pulled_pork + p_quantity <= capacity_pulled_pork
       or p_product_name = 'brisket'    and reserved_brisket + p_quantity <= capacity_brisket);

  get diagnostics v_local_ok = row_count;

  if not v_local_ok then
    -- Roll back the global increment
    update public.drops
    set    reserved_pulled_pork = case when p_product_name = 'pulled_pork'
                                        then reserved_pulled_pork - p_quantity
                                        else reserved_pulled_pork end,
           reserved_brisket     = case when p_product_name = 'brisket'
                                        then reserved_brisket - p_quantity
                                        else reserved_brisket end
    where  id = p_drop_id;

    return jsonb_build_object('ok', false, 'reason', 'location_capacity_exceeded');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
```

**Note on D-05 (rollback on Square failure):** This function handles the "strictest wins" local check. A separate `release_pickup_slot` function with the same signature but subtracting instead of adding handles the Square failure rollback.

### Pattern 4: Typed Client Usage in API Routes

```typescript
// Source: https://supabase.com/docs/reference/javascript/typescript-support
import { getSupabaseClient } from "../../lib/supabase";

// In an API route handler:
const supabase = getSupabaseClient();
const { data, error } = await supabase.rpc("reserve_pickup_slot", {
  p_drop_id: dropId,
  p_pickup_option_id: pickupOptionId,
  p_product_name: productName,
  p_quantity: quantity
});
```

### Pattern 5: Generating Types

```bash
# After schema is deployed to remote Supabase project:
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > lib/database.types.ts
```

The `--project-id` value comes from the Supabase dashboard URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`.

### Anti-Patterns to Avoid

- **Installing @supabase/ssr:** Not needed — that package is for cookie-based auth sessions. The service role pattern uses plain `@supabase/supabase-js`.
- **Hand-writing database types in lib/types.ts:** D-10 requires generated types. Never put Supabase row types in `lib/types.ts`.
- **Writing RLS policies for service_role:** The service role bypasses RLS unconditionally. Writing such policies is dead code and misleading.
- **Calling `getSupabaseClient()` in client components:** D-09 requires server-only. The singleton pattern with `let client` at module scope is fine in Next.js API routes because Node.js is single-process per deployment.
- **Using `SECURITY INVOKER` for `reserve_pickup_slot`:** With SECURITY INVOKER the function runs as `anon` (the caller) and will be blocked by RLS on the underlying tables. Use `SECURITY DEFINER` with `set search_path = ''` and fully-qualified table names (`public.drops`).

## Schema Design

### Table Definitions

The five required tables with recommended columns:

```sql
-- drops: one record per limited-run event
create table public.drops (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  title                 text not null,
  status                text not null default 'upcoming'
                          check (status in ('upcoming', 'active', 'closed')),
  capacity_pulled_pork  int not null default 0,
  capacity_brisket      int not null default 0,
  reserved_pulled_pork  int not null default 0,
  reserved_brisket      int not null default 0
);

-- drop_pickup_options: per-location capacity rows for a drop
create table public.drop_pickup_options (
  id                    uuid primary key default gen_random_uuid(),
  drop_id               uuid not null references public.drops(id) on delete cascade,
  location_label        text not null,
  pickup_date           date not null,
  pickup_at             timestamptz not null,
  capacity_pulled_pork  int not null default 0,
  capacity_brisket      int not null default 0,
  reserved_pulled_pork  int not null default 0,
  reserved_brisket      int not null default 0
);

-- orders: one record per successful reservation
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  drop_id         uuid not null references public.drops(id),
  pickup_option_id uuid not null references public.drop_pickup_options(id),
  customer_email  text not null,
  customer_name   text not null,
  cart_snapshot   jsonb not null,
  square_order_id text,
  square_invoice_id text
);

-- mailing_list: email subscribers
create table public.mailing_list (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null unique,
  subscribed    boolean not null default true,
  unsubscribe_token text not null default gen_random_uuid()::text
);

-- email_logs: audit trail for all sent emails
create table public.email_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  recipient    text not null,
  template     text not null,
  status       text not null default 'sent' check (status in ('sent', 'failed')),
  resend_id    text,
  order_id     uuid references public.orders(id)
);
```

### Recommended Indexes

```sql
create index on public.drop_pickup_options (drop_id);
create index on public.orders (drop_id);
create index on public.orders (pickup_option_id);
create index on public.orders (customer_email);
create index on public.email_logs (order_id);
create index on public.email_logs (recipient);
```

### Seed Data (per D-07, D-08)

```sql
do $$
declare
  v_drop_id uuid;
begin
  insert into public.drops (title, status, capacity_pulled_pork, capacity_brisket)
  values ('Test Drop - April 2026', 'upcoming', 200, 200)
  returning id into v_drop_id;

  insert into public.drop_pickup_options
    (drop_id, location_label, pickup_date, pickup_at, capacity_pulled_pork, capacity_brisket)
  values
    (v_drop_id, 'Cache Valley',  '2026-05-10', '2026-05-10 11:00:00-06', 65, 65),
    (v_drop_id, 'Utah County',   '2026-05-10', '2026-05-10 14:00:00-06', 65, 65),
    (v_drop_id, 'Sandy',         '2026-05-10', '2026-05-10 17:00:00-06', 65, 65);
end;
$$;
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript DB types | Hand-write interfaces in lib/types.ts | `supabase gen types typescript` CLI | Generated types stay in sync with schema; hand-written types drift |
| Atomic slot reservation | Custom locking logic with SELECT then UPDATE | PostgreSQL conditional UPDATE (WHERE count + N <= cap) | Single-statement conditional update is atomic at READ COMMITTED; no explicit lock needed |
| Service role auth | Custom JWT signing or header manipulation | `createClient(url, serviceRoleKey, { auth: { persistSession: false } })` | Service role key is a JWT that Supabase recognizes as BYPASSRLS role |
| Cookie session management | Manual cookie parsing/setting | Nothing — not needed (server-only client per D-09) | @supabase/ssr is for browser session hydration; irrelevant for API routes |

**Key insight:** The `reserve_pickup_slot` function's atomicity guarantee comes from PostgreSQL's row-level write locks, not application-level logic. The WHERE clause is re-evaluated after the lock is acquired — no `SELECT ... FOR UPDATE` needed.

## Common Pitfalls

### Pitfall 1: SECURITY INVOKER Blocks RPC Calls

**What goes wrong:** `reserve_pickup_slot` is created with the default `SECURITY INVOKER`. When called via the service role client, it runs as the `supabase_admin` role (not anon), but if called with the anon key in a test it runs as `anon` and RLS blocks the UPDATE.
**Why it happens:** PostgreSQL functions inherit the caller's role by default.
**How to avoid:** Always use `SECURITY DEFINER set search_path = ''` for functions that need to touch tables with RLS. Use fully-qualified table names (`public.drops` not just `drops`) inside the function body.
**Warning signs:** Error message `"new row violates row-level security policy"` when calling via RPC.

### Pitfall 2: Forgetting `set search_path = ''` on SECURITY DEFINER

**What goes wrong:** A malicious user could create a `public` schema object that shadows a built-in, causing the function to operate on the wrong table.
**Why it happens:** SECURITY DEFINER runs with elevated permissions; without a fixed search_path it uses the caller's search_path.
**How to avoid:** Always pair `security definer` with `set search_path = ''` and use schema-qualified names everywhere inside the function.
**Warning signs:** Supabase linter will flag `SECURITY DEFINER` functions without `set search_path`.

### Pitfall 3: RLS Enabled but No Policies = Total Lockout for Anon

**What goes wrong:** Developer tests a SELECT from the browser console and gets an empty array with no error, even though records exist.
**Why it happens:** With RLS enabled and no policies, PostgreSQL returns zero rows for `anon` (not an error — just empty). This is intentional behavior.
**How to avoid:** Understand that this is the desired behavior for Phase 1. All reads/writes go through API routes using the service role. If you need to verify seed data exists, query from a Next.js API route (not from the browser or Supabase Studio table editor with anon key).
**Warning signs:** Empty `data` array with no `error` object when querying via anon key.

### Pitfall 4: Service Role Key Exposed to Client

**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` is prefixed with `NEXT_PUBLIC_` or referenced in a client component, exposing it to the browser.
**Why it happens:** Next.js exposes all `NEXT_PUBLIC_*` env vars to the browser bundle.
**How to avoid:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must NOT have the `NEXT_PUBLIC_` prefix. The `lib/supabase.ts` module must only be imported from API routes or server components.
**Warning signs:** Next.js build warning about server-only module being imported in a client component; service role key appearing in browser network tab.

### Pitfall 5: Off-by-One in Capacity Buffer (3 × 65 = 195, not 200)

**What goes wrong:** The 5-bag global buffer (200 global vs 3 × 65 = 195 per-location) is intentional but could confuse future developers who think the global cap is unreachable.
**Why it happens:** Business decision — the global cap acts as a safety net, not the primary throttle.
**How to avoid:** Document in the migration file as a comment. Both checks run and the strictest wins — if all 3 locations sell out (195 bags), the global cap (200) is never reached.
**Warning signs:** No warning — this is by design. Document it.

### Pitfall 6: `GET DIAGNOSTICS` Bool vs Int

**What goes wrong:** `GET DIAGNOSTICS var = ROW_COUNT` returns an integer, not a boolean. Using `int` for `v_global_ok` vs `bool` requires a comparison.
**Why it happens:** PL/pgSQL `ROW_COUNT` is always an integer (rows affected). Assigning to a `bool` variable will fail at runtime.
**How to avoid:** Declare the variable as `int` and check `if v_global_ok = 0 then` not `if not v_global_ok`.
**Warning signs:** Runtime PL/pgSQL type error on the DIAGNOSTICS assignment.

## Code Examples

### lib/supabase.ts (complete)

```typescript
// Source: https://github.com/orgs/supabase/discussions/30739
// Server-only singleton. Import only from API routes.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  _client = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return _client;
}
```

### Enabling RLS (minimal, correct pattern)

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Run once per table. No policies needed — absence = deny all anon.
alter table public.drops enable row level security;
alter table public.drop_pickup_options enable row level security;
alter table public.orders enable row level security;
alter table public.mailing_list enable row level security;
alter table public.email_logs enable row level security;
```

### Verify Seed Data from API Route

```typescript
// app/api/test-seed/route.ts — smoke test only, delete after verification
import { getSupabaseClient } from "../../lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("drops")
    .select("id, title, status, capacity_pulled_pork, capacity_brisket");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drops: data });
}
```

### env.ts Extension

```typescript
// Add to lib/env.ts — new getSupabaseEnv() function following getSquareEnv() pattern
export interface SupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { url, serviceRoleKey };
}
```

Note: `lib/supabase.ts` can read directly from `process.env` (as shown above) OR call `getSupabaseEnv()` — either is consistent with project patterns. Reading directly is simpler since there is no env interface needed by callers.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr (or plain supabase-js for service role) | ~2023 | auth-helpers is deprecated; for server-only service role, use supabase-js directly |
| `supabase gen types typescript` (old flag) | `supabase gen types typescript --project-id` | CLI v1.8.1+ | `--project-ref` flag renamed to `--project-id` |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Not relevant here since we use service role, not user auth.
- `supabase gen types --db-url` with direct DB password: Works but requires DB password in shell. Prefer `--project-id` with CLI login.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, type gen | ✓ | 24.8.0 | — |
| npm | package install | ✓ | 11.12.1 | — |
| Supabase project (remote) | Schema deployment, type gen | Unknown — requires human setup | — | Cannot be automated; human must create project in dashboard |
| Supabase CLI (`npx supabase`) | `gen types` command | ✓ (installed as devDep via npm) | 2.84.10 | — |
| SUPABASE_URL env var | lib/supabase.ts | Not yet set | — | Add to .env.local after project creation |
| SUPABASE_SERVICE_ROLE_KEY env var | lib/supabase.ts | Not yet set | — | Add to .env.local after project creation |

**Missing dependencies with no fallback:**
- Supabase project must be created in the Supabase dashboard before any schema or type generation can run. This is a human action — the plan must include a step that prompts the developer to create a project and add credentials.

**Missing dependencies with fallback:**
- None — once the project exists, everything else is automated.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/supabase.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Five tables exist and are queryable | smoke (API route) | Manual — hit `GET /api/test-seed` after deployment | ❌ Wave 0 |
| DATA-01 | `lib/supabase.ts` exports `getSupabaseClient` with correct type | unit | `npx vitest run tests/supabase.test.ts` | ❌ Wave 0 |
| DATA-02 | Direct anon write to any table is rejected | smoke (manual) | Manual — described in verification checklist | ❌ manual-only |
| DATA-02 | RLS enabled flag visible in Supabase Studio | smoke (manual) | Manual — visual check in Studio | ❌ manual-only |

**Note on manual-only tests:** RLS enforcement cannot be unit-tested without a live Supabase instance. The plan should include a manual verification checklist step.

### Wave 0 Gaps

- [ ] `tests/supabase.test.ts` — unit tests for `getSupabaseClient()`: (a) throws when env vars missing, (b) returns a SupabaseClient instance when vars present (mock env), (c) returns the same singleton on repeated calls
- [ ] No framework config gaps — Vitest is already configured in `vitest.config.ts`

## Open Questions

1. **Supabase project already exists or needs creation?**
   - What we know: The project requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` which are not in `.env.example`.
   - What's unclear: Whether the developer has already created a Supabase project or needs to do so.
   - Recommendation: Plan Wave 0 as "set up Supabase project" — human action before any code tasks can run. All subsequent tasks depend on this.

2. **Migration deployment method: SQL editor vs CLI?**
   - What we know: The Supabase CLI can run migrations with `supabase db push`. The SQL editor is simpler for a one-time deploy. D-10 uses the CLI for type gen.
   - What's unclear: Whether the developer wants full local CLI setup (`supabase init`, `supabase link`) or prefers pasting SQL into Supabase Studio.
   - Recommendation: Use the Supabase Studio SQL editor for Phase 1 simplicity. Store the SQL in `supabase/migrations/0001_foundation.sql` for version control, but execute it manually. Full CLI local dev setup is out of scope for Phase 1.

3. **`reserve_pickup_slot` signature: single product per call or both products in one call?**
   - What we know: D-02 says products are tracked independently. D-01 says both global and per-location caps are checked.
   - What's unclear: Whether a checkout with both pulled pork and brisket makes two RPC calls or one.
   - Recommendation: Design for one call per product — simpler function, easier to rollback, cleaner error messages. Phase 3 (checkout integration) will call it once per distinct product in the cart.

## Sources

### Primary (HIGH confidence)
- `@supabase/supabase-js` npm registry — version 2.101.1 confirmed 2026-04-04
- `supabase` CLI npm registry — version 2.84.10 confirmed 2026-04-04
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS enable/policy patterns
- https://supabase.com/docs/guides/database/functions — SECURITY DEFINER + RPC call pattern
- https://supabase.com/docs/guides/api/rest/generating-types — `gen types` CLI command
- https://supabase.com/docs/reference/javascript/typescript-support — typed createClient pattern

### Secondary (MEDIUM confidence)
- https://github.com/orgs/supabase/discussions/30739 — service role createClient pattern with auth options disabled (community discussion, confirmed consistent with official docs)
- PostgreSQL documentation on conditional UPDATE atomicity — confirmed via multiple sources that WHERE clause re-evaluation after row lock acquisition is atomic at READ COMMITTED

### Tertiary (LOW confidence)
- None — all claims are verified against official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from npm registry 2026-04-04
- Architecture: HIGH — patterns verified against official Supabase docs
- Pitfalls: HIGH — most sourced from official docs; SECURITY DEFINER/search_path from official Supabase function guide
- Schema design: MEDIUM — column names are Claude's discretion per CONTEXT.md; the shape is reasonable but not from an official reference

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (Supabase is fast-moving; re-check SDK version before implementation if > 30 days)
