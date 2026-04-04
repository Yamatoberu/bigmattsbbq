-- =============================================================================
-- Big Matt's BBQ — Foundation Migration
-- Creates all five tables, RLS, indexes, RPC functions, and seed data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Tables
-- -----------------------------------------------------------------------------

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

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  drop_id           uuid not null references public.drops(id),
  pickup_option_id  uuid not null references public.drop_pickup_options(id),
  customer_email    text not null,
  customer_name     text not null,
  cart_snapshot     jsonb not null,
  square_order_id   text,
  square_invoice_id text
);

create table public.mailing_list (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  email             text not null unique,
  subscribed        boolean not null default true,
  unsubscribe_token text not null default gen_random_uuid()::text
);

create table public.email_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  recipient   text not null,
  template    text not null,
  status      text not null default 'sent' check (status in ('sent', 'failed')),
  resend_id   text,
  order_id    uuid references public.orders(id)
);

-- -----------------------------------------------------------------------------
-- Section 2: Row Level Security
-- No policies created = anon reads and writes are both denied.
-- Service role key bypasses RLS entirely at the database level (BYPASSRLS).
-- -----------------------------------------------------------------------------

alter table public.drops enable row level security;
alter table public.drop_pickup_options enable row level security;
alter table public.orders enable row level security;
alter table public.mailing_list enable row level security;
alter table public.email_logs enable row level security;

-- -----------------------------------------------------------------------------
-- Section 3: Indexes
-- -----------------------------------------------------------------------------

create index idx_drop_pickup_options_drop_id on public.drop_pickup_options (drop_id);
create index idx_orders_drop_id on public.orders (drop_id);
create index idx_orders_pickup_option_id on public.orders (pickup_option_id);
create index idx_orders_customer_email on public.orders (customer_email);
create index idx_email_logs_order_id on public.email_logs (order_id);
create index idx_email_logs_recipient on public.email_logs (recipient);

-- -----------------------------------------------------------------------------
-- Section 4: RPC Functions
-- -----------------------------------------------------------------------------

-- reserve_pickup_slot: atomically checks and increments capacity at two levels.
-- Returns {ok: true} on success or {ok: false, reason: '...'} on failure.
-- SECURITY DEFINER with fixed search_path prevents search_path injection.
-- v_count is declared as int (not bool) — GET DIAGNOSTICS ROW_COUNT returns int.
create or replace function public.reserve_pickup_slot(
  p_drop_id          uuid,
  p_pickup_option_id uuid,
  p_product_name     text,
  p_quantity         int
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count int;
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

  get diagnostics v_count = row_count;

  if v_count = 0 then
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

  get diagnostics v_count = row_count;

  if v_count = 0 then
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

-- release_pickup_slot: decrements capacity at both levels.
-- Used when downstream Square calls fail after a successful reservation (D-05).
-- Same signature as reserve_pickup_slot, subtracts instead of adding.
create or replace function public.release_pickup_slot(
  p_drop_id          uuid,
  p_pickup_option_id uuid,
  p_product_name     text,
  p_quantity         int
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.drops
  set    reserved_pulled_pork = case when p_product_name = 'pulled_pork'
                                      then reserved_pulled_pork - p_quantity
                                      else reserved_pulled_pork end,
         reserved_brisket     = case when p_product_name = 'brisket'
                                      then reserved_brisket - p_quantity
                                      else reserved_brisket end
  where  id = p_drop_id;

  update public.drop_pickup_options
  set    reserved_pulled_pork = case when p_product_name = 'pulled_pork'
                                      then reserved_pulled_pork - p_quantity
                                      else reserved_pulled_pork end,
         reserved_brisket     = case when p_product_name = 'brisket'
                                      then reserved_brisket - p_quantity
                                      else reserved_brisket end
  where  id = p_pickup_option_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Section 5: Seed Data
-- Global cap 200 vs 3x65=195 per-location: 5-bag buffer is intentional (D-08)
-- -----------------------------------------------------------------------------

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
