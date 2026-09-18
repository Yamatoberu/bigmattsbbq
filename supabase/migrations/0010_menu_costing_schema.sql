-- =============================================================================
-- Big Matt's BBQ — Migration 0010 (retroactive capture)
-- Captures the `menu_costing` schema exactly as it exists live on production
-- today. This schema was applied directly to production via the Supabase
-- CLI/dashboard on 2026-07-24 (tracked on prod as Supabase migration version
-- 20260724212041, name `menu_costing_schema`), predating this repo's own
-- migration tracking for it. It is being captured now (issue #14) so the repo
-- becomes the true source of truth for everything live in this Supabase
-- project.
--
-- `menu_costing` is unrelated to the bigmattsbbq storefront/SCA app — it
-- backs a separate costing tool that happens to share this Supabase project
-- (confirmed via repo-wide grep: zero hits against menu_costing anywhere in
-- application code).
--
-- The content below is copied verbatim, byte-for-byte, from production's own
-- `supabase_migrations.schema_migrations.statements` column for this version.
-- Do not reformat, regenerate, or "improve" it here — this file's job is to
-- faithfully record what is actually live, including its own inline comments
-- below written by whoever originally authored this schema on prod.
--
-- RLS note: production's live `menu_costing` tables genuinely have Row Level
-- Security disabled on all 12 tables (confirmed via Supabase advisors/
-- list_tables at capture time). This migration does not enable RLS on any of
-- them, matching what is actually live. A separate, still-open decision with
-- the user covers whether/how to remediate that — it is intentionally not
-- bundled into this capture migration.
-- =============================================================================

-- Starter schema for costing and pricing.
-- Add authentication-aware RLS policies before exposing these tables through the Supabase Data API.
create extension if not exists pgcrypto;

-- Keep this project isolated from public so the business domain is obvious
-- and the API surface can be exposed intentionally later.
create schema if not exists menu_costing;

-- A production item is any buildable or sellable thing in the business.
-- This includes internal prep items like subrecipes as well as sellable
-- menu items, bundles, and direct-sale standalone items.
create type menu_costing.production_item_kind as enum (
  'subrecipe',
  'recipe',
  'menu_item',
  'combo',
  'standalone_item'
);

-- Components can come from raw inventory or from another production item.
-- This is what allows nested recipes such as sauce -> sandwich -> bundle.
create type menu_costing.component_source_kind as enum (
  'ingredient',
  'production_item'
);

-- One business can own many vendors, ingredients, product lines, and items.
create table if not exists menu_costing.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Suppliers or purchase sources for ingredients and packaging.
create table if not exists menu_costing.vendors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- Light taxonomy for reporting and filtering inventory.
create table if not exists menu_costing.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

-- Canonical inventory records. This is where "what the thing is" lives.
-- Purchasable variants and changing costs are stored separately.
create table if not exists menu_costing.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  category_id uuid references menu_costing.ingredient_categories(id) on delete set null,
  name text not null,
  default_uom text not null,
  is_packaging boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- Purchasable versions of an ingredient, including case size and source.
-- Example: brisket from Supplier A vs brisket from Supplier B.
create table if not exists menu_costing.ingredient_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  ingredient_id uuid not null references menu_costing.ingredients(id) on delete cascade,
  vendor_id uuid references menu_costing.vendors(id) on delete set null,
  sku text,
  source_name text,
  purchase_uom text not null,
  purchase_size numeric(12,4) not null check (purchase_size > 0),
  latest_pack_cost numeric(12,4),
  latest_yield_pct numeric(7,4) not null default 1.0 check (latest_yield_pct > 0 and latest_yield_pct <= 1.0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enforce a single default purchasing source per ingredient so costing
-- functions know which source to use when no override is provided.
create unique index if not exists ingredient_sources_primary_unique
  on menu_costing.ingredient_sources (business_id, ingredient_id)
  where is_primary;

-- Time-based cost history. This is the table that lets pricing move with
-- vendor changes instead of overwriting old numbers.
create table if not exists menu_costing.ingredient_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  ingredient_source_id uuid not null references menu_costing.ingredient_sources(id) on delete cascade,
  effective_at timestamptz not null default now(),
  pack_cost numeric(12,4) not null check (pack_cost >= 0),
  purchase_size numeric(12,4) not null check (purchase_size > 0),
  yield_pct numeric(7,4) not null default 1.0 check (yield_pct > 0 and yield_pct <= 1.0),
  notes text
);

-- Optimizes "latest cost for this source" lookups used by the costing view.
create index if not exists ingredient_cost_snapshots_lookup_idx
  on menu_costing.ingredient_cost_snapshots (ingredient_source_id, effective_at desc);

-- Top-level product catalogs. For this project the obvious starting values
-- are vending and frozen.
create table if not exists menu_costing.product_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, code),
  unique (business_id, name)
);

-- Unified table for everything that can be built, portioned, or sold.
-- Yield fields describe how many usable portions/units the item produces.
create table if not exists menu_costing.production_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  kind menu_costing.production_item_kind not null,
  name text not null,
  yield_quantity numeric(12,4) not null default 1 check (yield_quantity > 0),
  yield_uom text not null default 'each',
  is_sellable boolean not null default false,
  instructions text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

-- Lets the same production item belong to one or more product lines.
-- This matters when a shared recipe feeds both vending and frozen offerings.
create table if not exists menu_costing.production_item_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  production_item_id uuid not null references menu_costing.production_items(id) on delete cascade,
  product_line_id uuid not null references menu_costing.product_lines(id) on delete cascade,
  unique (production_item_id, product_line_id)
);

-- Bill of materials for each production item.
-- A row here says "this parent item uses X quantity of this ingredient or
-- child production item."
create table if not exists menu_costing.production_item_components (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  parent_item_id uuid not null references menu_costing.production_items(id) on delete cascade,
  sort_order integer not null default 0,
  source_kind menu_costing.component_source_kind not null,
  ingredient_id uuid references menu_costing.ingredients(id) on delete cascade,
  component_item_id uuid references menu_costing.production_items(id) on delete cascade,
  quantity numeric(12,4) not null check (quantity >= 0),
  quantity_uom text not null,
  notes text,
  check (
    (source_kind = 'ingredient' and ingredient_id is not null and component_item_id is null)
    or
    (source_kind = 'production_item' and component_item_id is not null and ingredient_id is null)
  ),
  check (parent_item_id <> component_item_id)
);

-- Optimizes ordered expansion of recipe or item components.
create index if not exists production_item_components_parent_idx
  on menu_costing.production_item_components (parent_item_id, sort_order);

-- Pricing rules are intentionally separated from recipe math.
-- That lets vending and frozen have different targets, taxes, fees, and
-- rounding strategies without duplicating items.
create table if not exists menu_costing.pricing_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  product_line_id uuid references menu_costing.product_lines(id) on delete cascade,
  name text not null,
  target_food_cost_pct numeric(7,4) not null check (target_food_cost_pct > 0 and target_food_cost_pct < 1),
  sales_tax_pct numeric(7,4) not null default 0 check (sales_tax_pct >= 0 and sales_tax_pct < 1),
  card_fee_fixed numeric(12,4) not null default 0 check (card_fee_fixed >= 0),
  card_fee_pct numeric(7,4) not null default 0 check (card_fee_pct >= 0 and card_fee_pct < 1),
  rounding_increment numeric(12,2) not null default 0.50 check (rounding_increment > 0),
  created_at timestamptz not null default now(),
  unique (business_id, product_line_id, name)
);

-- Optional manual sell price for a given item/profile combination.
-- This is what allows the system to compare "recommended price" vs
-- "actual chosen price" and calculate realized food cost.
create table if not exists menu_costing.menu_item_pricing (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references menu_costing.businesses(id) on delete cascade,
  item_id uuid not null references menu_costing.production_items(id) on delete cascade,
  pricing_profile_id uuid not null references menu_costing.pricing_profiles(id) on delete cascade,
  manual_price numeric(12,2),
  effective_at timestamptz not null default now(),
  notes text,
  unique (item_id, pricing_profile_id)
);

-- Resolves the current unit cost for each ingredient source by taking the
-- most recent snapshot when available and falling back to the source row.
-- unit_cost replicates the workbook's basic math:
--   pack cost / purchase size / yield
create or replace view menu_costing.current_ingredient_unit_costs
with (security_invoker = true) as
with latest_snapshot as (
  select distinct on (ics.ingredient_source_id)
    ics.ingredient_source_id,
    ics.pack_cost,
    ics.purchase_size,
    ics.yield_pct,
    ics.effective_at
  from menu_costing.ingredient_cost_snapshots ics
  order by ics.ingredient_source_id, ics.effective_at desc
)
select
  src.id as ingredient_source_id,
  src.business_id,
  src.ingredient_id,
  coalesce(ls.pack_cost, src.latest_pack_cost, 0) as pack_cost,
  coalesce(ls.purchase_size, src.purchase_size) as purchase_size,
  coalesce(ls.yield_pct, src.latest_yield_pct, 1.0) as yield_pct,
  case
    when coalesce(ls.purchase_size, src.purchase_size) = 0 then 0
    else coalesce(ls.pack_cost, src.latest_pack_cost, 0)
      / coalesce(ls.purchase_size, src.purchase_size)
      / nullif(coalesce(ls.yield_pct, src.latest_yield_pct, 1.0), 0)
  end as unit_cost,
  src.purchase_uom,
  src.is_primary
from menu_costing.ingredient_sources src
left join latest_snapshot ls on ls.ingredient_source_id = src.id;

-- Recursively rolls a production item up to a cost per yielded unit.
-- Raw ingredients pull from current_ingredient_unit_costs.
-- Nested production items call back into this function so recipes can be
-- built from subrecipes, recipes, or other sellable components.
create or replace function menu_costing.calculate_item_unit_cost(p_item_id uuid)
returns numeric
language plpgsql
stable
as $$
declare
  v_total_cost numeric := 0;
  v_yield_quantity numeric := 1;
begin
  select yield_quantity
  into v_yield_quantity
  from menu_costing.production_items
  where id = p_item_id;

  if v_yield_quantity is null then
    return 0;
  end if;

  select coalesce(sum(component_cost), 0)
  into v_total_cost
  from (
    select
      case
        when pic.source_kind = 'ingredient' then
          pic.quantity * coalesce(ciuc.unit_cost, 0)
        else
          pic.quantity * menu_costing.calculate_item_unit_cost(pic.component_item_id)
      end as component_cost
    from menu_costing.production_item_components pic
    left join menu_costing.current_ingredient_unit_costs ciuc
      on ciuc.ingredient_id = pic.ingredient_id
     and ciuc.is_primary = true
    where pic.parent_item_id = p_item_id
  ) component_rollup;

  return round(v_total_cost / v_yield_quantity, 4);
end;
$$;

-- Standardizes the final customer-facing price point.
-- Example: round 8.81 up to the next 0.50 or 1.00 increment.
create or replace function menu_costing.round_price_point(
  p_amount numeric,
  p_increment numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_amount is null or p_increment is null or p_increment <= 0 then null
    else ceil(p_amount / p_increment) * p_increment
  end;
$$;

-- Main reporting view for the app or an agent.
-- This mirrors the workbook flow:
--   menu item cost
--   -> target food cost price
--   -> tax-inclusive price
--   -> tax + card-fee all-in price
--   -> rounded suggested price point
-- It also calculates actual food cost when a manual price is present.
create or replace view menu_costing.menu_item_price_recommendations
with (security_invoker = true) as
select
  mip.item_id,
  pi.business_id,
  pi.name as item_name,
  pi.kind,
  pl.code as product_line_code,
  pl.name as product_line_name,
  pp.name as pricing_profile_name,
  menu_costing.calculate_item_unit_cost(pi.id) as menu_item_cost,
  round(menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct, 2) as recommended_base_price,
  round(
    (menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct) * (1 + pp.sales_tax_pct),
    2
  ) as recommended_price_with_tax,
  round(
    ((menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct) * (1 + pp.sales_tax_pct))
      + pp.card_fee_fixed
      + (((menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct) * (1 + pp.sales_tax_pct)) * pp.card_fee_pct),
    2
  ) as recommended_all_in_price,
  menu_costing.round_price_point(
    (
      ((menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct) * (1 + pp.sales_tax_pct))
      + pp.card_fee_fixed
      + (((menu_costing.calculate_item_unit_cost(pi.id) / pp.target_food_cost_pct) * (1 + pp.sales_tax_pct)) * pp.card_fee_pct)
    ),
    pp.rounding_increment
  ) as suggested_price_point,
  mip.manual_price,
  case
    when mip.manual_price is null then null
    else round(
      menu_costing.calculate_item_unit_cost(pi.id)
      / nullif(
        mip.manual_price
        - (mip.manual_price - (mip.manual_price / (1 + pp.sales_tax_pct)))
        - (pp.card_fee_fixed + (mip.manual_price * pp.card_fee_pct)),
        0
      ),
      4
    )
  end as actual_food_cost_pct
from menu_costing.menu_item_pricing mip
join menu_costing.production_items pi on pi.id = mip.item_id
join menu_costing.pricing_profiles pp on pp.id = mip.pricing_profile_id
left join menu_costing.product_lines pl on pl.id = pp.product_line_id
where pi.is_sellable = true;

comment on schema menu_costing is
  'Core costing tables. Add this schema to Supabase Exposed schemas only if you intend to query it directly via the Data API.';

comment on table menu_costing.businesses is
  'Top-level owner record for all costing data in this schema.';

comment on table menu_costing.vendors is
  'Suppliers and purchase sources used by ingredients or packaging items.';

comment on table menu_costing.ingredient_categories is
  'Simple reporting categories for ingredients such as bread, meat, condiment, or packaging.';

comment on table menu_costing.ingredients is
  'Raw ingredients and packaging items from the Master Inventory tab.';

comment on table menu_costing.ingredient_sources is
  'Purchasable versions of ingredients, including source, SKU, case size, and current default cost context.';

comment on table menu_costing.ingredient_cost_snapshots is
  'Historical cost records used to keep pricing responsive to vendor cost changes over time.';

comment on table menu_costing.product_lines is
  'Business-level product lines such as vending and frozen.';

comment on table menu_costing.production_items is
  'Sub recipes, recipes, final menu items, combos, and standalone sellable items.';

comment on table menu_costing.production_item_lines is
  'Join table that assigns production items to one or more product lines.';

comment on table menu_costing.production_item_components is
  'Recipe and bundle component rows that define how an item is built from ingredients or other items.';

comment on table menu_costing.pricing_profiles is
  'Line-level or business-level pricing rules for target food cost, tax, card fees, and price rounding.';

comment on table menu_costing.menu_item_pricing is
  'Optional manually chosen selling prices used to compare recommendations against actual prices.';

comment on view menu_costing.current_ingredient_unit_costs is
  'Resolved current unit cost per ingredient source using the latest available cost snapshot.';

comment on function menu_costing.calculate_item_unit_cost(uuid) is
  'Recursively calculates the per-yield-unit cost of a production item from ingredient and child-item components.';

comment on function menu_costing.round_price_point(numeric, numeric) is
  'Rounds a computed price up to the next configured menu increment.';

comment on view menu_costing.menu_item_price_recommendations is
  'Replicates the spreadsheet pricing chain: unit cost -> target food cost price -> tax -> card fees -> rounded price point.';
