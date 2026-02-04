-- Supabase schema for Big Matt's BBQ
create extension if not exists pgcrypto;

-- Sequence for order numbers
create sequence if not exists order_number_seq start 1000;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  bag_size_lb numeric(4,2) not null default 0.50,
  created_at timestamptz not null default now()
);

create table if not exists drops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','live','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  hero_copy text,
  created_at timestamptz not null default now()
);

create table if not exists pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists drop_pickups (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references drops(id) on delete cascade,
  pickup_location_id uuid not null references pickup_locations(id) on delete restrict,
  start_time timestamptz,
  end_time timestamptz,
  instructions text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists drop_inventory (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references drops(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  bags_available integer not null,
  bags_reserved integer not null default 0,
  bags_sold integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (drop_id, product_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references drops(id) on delete restrict,
  pickup_id uuid not null references drop_pickups(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  order_number text not null unique,
  status text not null default 'reserved',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  qty_bags integer not null check (qty_bags > 0),
  created_at timestamptz not null default now()
);

create table if not exists mailing_list_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'site',
  subscribed_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  email_type text not null,
  to_email text not null,
  status text not null,
  message text,
  created_at timestamptz not null default now()
);

-- View for remaining inventory (bags + derived pounds)
create or replace view v_drop_inventory_remaining as
select
  di.drop_id,
  di.product_id,
  di.enabled,
  greatest(di.bags_available - di.bags_reserved - di.bags_sold, 0) as bags_remaining,
  (greatest(di.bags_available - di.bags_reserved - di.bags_sold, 0) * coalesce(p.bag_size_lb, 0.5)) as pounds_remaining,
  p.name as product_name,
  p.bag_size_lb,
  p.description
from drop_inventory di
join products p on p.id = di.product_id;

-- Function: place_preorder
create or replace function place_preorder(
  p_drop_id uuid,
  p_pickup_id uuid,
  p_items jsonb,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_opt_in boolean default false
) returns jsonb
language plpgsql
security definer
as $$
declare
  _drop drops;
  _pickup drop_pickups;
  _customer_id uuid;
  _order_id uuid;
  _order_number text;
  _item record;
  _remaining integer;
  _items_count integer;
begin
  select * into _drop from drops where id = p_drop_id for update;
  if not found or _drop.status <> 'live' then
    raise exception 'Drop is not live' using errcode = 'P0001';
  end if;

  select * into _pickup from drop_pickups where id = p_pickup_id and drop_id = p_drop_id and enabled is true for update;
  if not found then
    raise exception 'Pickup option is not available for this drop' using errcode = 'P0001';
  end if;

  if p_items is null then
    raise exception 'Items are required' using errcode = 'P0001';
  end if;

  _items_count := jsonb_array_length(p_items);
  if coalesce(_items_count, 0) = 0 then
    raise exception 'At least one item is required' using errcode = 'P0001';
  end if;

  -- Validate inventory per item
  for _item in select * from jsonb_to_recordset(p_items) as (product_id uuid, qty integer) loop
    if _item.qty is null or _item.qty <= 0 then
      raise exception 'Quantity must be greater than zero' using errcode = 'P0001';
    end if;

    select greatest(di.bags_available - di.bags_reserved - di.bags_sold, 0)
    into _remaining
    from drop_inventory di
    where di.drop_id = p_drop_id and di.product_id = _item.product_id and di.enabled is true
    for update;

    if _remaining is null then
      raise exception 'Product % is not available for this drop', _item.product_id using errcode = 'P0001';
    end if;
    if _item.qty > _remaining then
      raise exception 'Not enough inventory for product %', _item.product_id using errcode = 'P0001';
    end if;
  end loop;

  -- Upsert customer
  insert into customers (full_name, email, phone)
  values (p_full_name, lower(p_email), p_phone)
  on conflict (email) do update set
    full_name = excluded.full_name,
    phone = excluded.phone
  returning id into _customer_id;

  -- Generate order number
  _order_number := concat('BM-', to_char(now(), 'YYMMDD'), '-', lpad(nextval('order_number_seq')::text, 4, '0'));

  insert into orders (drop_id, pickup_id, customer_id, order_number, status)
  values (p_drop_id, p_pickup_id, _customer_id, _order_number, 'reserved')
  returning id into _order_id;

  -- Insert items and reserve inventory
  for _item in select * from jsonb_to_recordset(p_items) as (product_id uuid, qty integer) loop
    insert into order_items (order_id, product_id, qty_bags)
    values (_order_id, _item.product_id, _item.qty);

    update drop_inventory
    set bags_reserved = bags_reserved + _item.qty
    where drop_id = p_drop_id and product_id = _item.product_id;
  end loop;

  if p_opt_in then
    insert into mailing_list_subscribers (email, source)
    values (lower(p_email), 'preorder')
    on conflict (email) do nothing;
  end if;

  return jsonb_build_object('order_id', _order_id, 'order_number', _order_number);
end;
$$;

-- Indexes
create index if not exists idx_drop_inventory_drop on drop_inventory(drop_id);
create index if not exists idx_drop_inventory_product on drop_inventory(product_id);
create index if not exists idx_drop_pickups_drop on drop_pickups(drop_id);
create index if not exists idx_orders_drop on orders(drop_id);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_number on orders(order_number);

-- Seeds
insert into products (name, description, bag_size_lb)
values
  ('Frozen Brisket', 'Post-oak smoked, sliced, ready to reheat', 0.50),
  ('Frozen Pulled Pork', 'Peach wood smoke, lightly sauced', 0.50)
on conflict (name) do nothing;

insert into pickup_locations (name, address)
values
  ('Cache Valley', 'Cache Valley, UT'),
  ('Utah County', 'Utah County, UT')
on conflict (name) do nothing;
