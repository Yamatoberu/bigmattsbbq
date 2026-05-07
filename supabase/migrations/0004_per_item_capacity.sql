-- =============================================================================
-- Big Matt's BBQ — Migration 0004
-- Expands per-item capacity tracking from 2 items (pulled pork, brisket)
-- to all 6 items: pulled pork, brisket, sauce, family night, backyard host,
-- freezer filler — at both the drop level and per-location pickup level.
-- Also replaces both RPC functions to handle all 6 product names.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Extend drops table with 4 new capacity/reserved column pairs
-- -----------------------------------------------------------------------------

alter table public.drops
  add column capacity_sauce         int not null default 0,
  add column reserved_sauce         int not null default 0,
  add column capacity_family_night  int not null default 0,
  add column reserved_family_night  int not null default 0,
  add column capacity_backyard_host int not null default 0,
  add column reserved_backyard_host int not null default 0,
  add column capacity_freezer_filler int not null default 0,
  add column reserved_freezer_filler int not null default 0;

-- -----------------------------------------------------------------------------
-- Section 2: Extend drop_pickup_options table with the same 8 columns
-- -----------------------------------------------------------------------------

alter table public.drop_pickup_options
  add column capacity_sauce         int not null default 0,
  add column reserved_sauce         int not null default 0,
  add column capacity_family_night  int not null default 0,
  add column reserved_family_night  int not null default 0,
  add column capacity_backyard_host int not null default 0,
  add column reserved_backyard_host int not null default 0,
  add column capacity_freezer_filler int not null default 0,
  add column reserved_freezer_filler int not null default 0;

-- -----------------------------------------------------------------------------
-- Section 3: Replace reserve_pickup_slot to handle all 6 product names
-- -----------------------------------------------------------------------------

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
  set    reserved_pulled_pork    = case when p_product_name = 'pulled_pork'
                                         then reserved_pulled_pork + p_quantity
                                         else reserved_pulled_pork end,
         reserved_brisket        = case when p_product_name = 'brisket'
                                         then reserved_brisket + p_quantity
                                         else reserved_brisket end,
         reserved_sauce          = case when p_product_name = 'sauce'
                                         then reserved_sauce + p_quantity
                                         else reserved_sauce end,
         reserved_family_night   = case when p_product_name = 'family_night'
                                         then reserved_family_night + p_quantity
                                         else reserved_family_night end,
         reserved_backyard_host  = case when p_product_name = 'backyard_host'
                                         then reserved_backyard_host + p_quantity
                                         else reserved_backyard_host end,
         reserved_freezer_filler = case when p_product_name = 'freezer_filler'
                                         then reserved_freezer_filler + p_quantity
                                         else reserved_freezer_filler end
  where  id = p_drop_id
    and  (p_product_name = 'pulled_pork'    and reserved_pulled_pork + p_quantity <= capacity_pulled_pork
       or p_product_name = 'brisket'        and reserved_brisket + p_quantity <= capacity_brisket
       or p_product_name = 'sauce'          and reserved_sauce + p_quantity <= capacity_sauce
       or p_product_name = 'family_night'   and reserved_family_night + p_quantity <= capacity_family_night
       or p_product_name = 'backyard_host'  and reserved_backyard_host + p_quantity <= capacity_backyard_host
       or p_product_name = 'freezer_filler' and reserved_freezer_filler + p_quantity <= capacity_freezer_filler);

  get diagnostics v_count = row_count;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'global_capacity_exceeded');
  end if;

  -- Check and increment per-location capacity atomically
  update public.drop_pickup_options
  set    reserved_pulled_pork    = case when p_product_name = 'pulled_pork'
                                         then reserved_pulled_pork + p_quantity
                                         else reserved_pulled_pork end,
         reserved_brisket        = case when p_product_name = 'brisket'
                                         then reserved_brisket + p_quantity
                                         else reserved_brisket end,
         reserved_sauce          = case when p_product_name = 'sauce'
                                         then reserved_sauce + p_quantity
                                         else reserved_sauce end,
         reserved_family_night   = case when p_product_name = 'family_night'
                                         then reserved_family_night + p_quantity
                                         else reserved_family_night end,
         reserved_backyard_host  = case when p_product_name = 'backyard_host'
                                         then reserved_backyard_host + p_quantity
                                         else reserved_backyard_host end,
         reserved_freezer_filler = case when p_product_name = 'freezer_filler'
                                         then reserved_freezer_filler + p_quantity
                                         else reserved_freezer_filler end
  where  id = p_pickup_option_id
    and  (p_product_name = 'pulled_pork'    and reserved_pulled_pork + p_quantity <= capacity_pulled_pork
       or p_product_name = 'brisket'        and reserved_brisket + p_quantity <= capacity_brisket
       or p_product_name = 'sauce'          and reserved_sauce + p_quantity <= capacity_sauce
       or p_product_name = 'family_night'   and reserved_family_night + p_quantity <= capacity_family_night
       or p_product_name = 'backyard_host'  and reserved_backyard_host + p_quantity <= capacity_backyard_host
       or p_product_name = 'freezer_filler' and reserved_freezer_filler + p_quantity <= capacity_freezer_filler);

  get diagnostics v_count = row_count;

  if v_count = 0 then
    -- Roll back the global increment
    update public.drops
    set    reserved_pulled_pork    = case when p_product_name = 'pulled_pork'
                                           then reserved_pulled_pork - p_quantity
                                           else reserved_pulled_pork end,
           reserved_brisket        = case when p_product_name = 'brisket'
                                           then reserved_brisket - p_quantity
                                           else reserved_brisket end,
           reserved_sauce          = case when p_product_name = 'sauce'
                                           then reserved_sauce - p_quantity
                                           else reserved_sauce end,
           reserved_family_night   = case when p_product_name = 'family_night'
                                           then reserved_family_night - p_quantity
                                           else reserved_family_night end,
           reserved_backyard_host  = case when p_product_name = 'backyard_host'
                                           then reserved_backyard_host - p_quantity
                                           else reserved_backyard_host end,
           reserved_freezer_filler = case when p_product_name = 'freezer_filler'
                                           then reserved_freezer_filler - p_quantity
                                           else reserved_freezer_filler end
    where  id = p_drop_id;

    return jsonb_build_object('ok', false, 'reason', 'location_capacity_exceeded');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Section 4: Replace release_pickup_slot to handle all 6 product names
-- -----------------------------------------------------------------------------

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
  set    reserved_pulled_pork    = case when p_product_name = 'pulled_pork'
                                         then reserved_pulled_pork - p_quantity
                                         else reserved_pulled_pork end,
         reserved_brisket        = case when p_product_name = 'brisket'
                                         then reserved_brisket - p_quantity
                                         else reserved_brisket end,
         reserved_sauce          = case when p_product_name = 'sauce'
                                         then reserved_sauce - p_quantity
                                         else reserved_sauce end,
         reserved_family_night   = case when p_product_name = 'family_night'
                                         then reserved_family_night - p_quantity
                                         else reserved_family_night end,
         reserved_backyard_host  = case when p_product_name = 'backyard_host'
                                         then reserved_backyard_host - p_quantity
                                         else reserved_backyard_host end,
         reserved_freezer_filler = case when p_product_name = 'freezer_filler'
                                         then reserved_freezer_filler - p_quantity
                                         else reserved_freezer_filler end
  where  id = p_drop_id;

  update public.drop_pickup_options
  set    reserved_pulled_pork    = case when p_product_name = 'pulled_pork'
                                         then reserved_pulled_pork - p_quantity
                                         else reserved_pulled_pork end,
         reserved_brisket        = case when p_product_name = 'brisket'
                                         then reserved_brisket - p_quantity
                                         else reserved_brisket end,
         reserved_sauce          = case when p_product_name = 'sauce'
                                         then reserved_sauce - p_quantity
                                         else reserved_sauce end,
         reserved_family_night   = case when p_product_name = 'family_night'
                                         then reserved_family_night - p_quantity
                                         else reserved_family_night end,
         reserved_backyard_host  = case when p_product_name = 'backyard_host'
                                         then reserved_backyard_host - p_quantity
                                         else reserved_backyard_host end,
         reserved_freezer_filler = case when p_product_name = 'freezer_filler'
                                         then reserved_freezer_filler - p_quantity
                                         else reserved_freezer_filler end
  where  id = p_pickup_option_id;

  return jsonb_build_object('ok', true);
end;
$$;
