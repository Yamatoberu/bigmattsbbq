-- =============================================================================
-- Big Matt's BBQ — Migration 0005
-- Removes per-drop and per-pickup-option capacity enforcement and the
-- reservation system (issue #13). Drops both reservation RPC functions and
-- every capacity/reserved column on drops and drop_pickup_options.
--
-- Order matters: the two RPC function bodies are plpgsql and are not
-- dependency-tracked by Postgres, so they are dropped first — dropping the
-- columns first would silently leave functions that fail at call time.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Drop both reservation RPC functions
-- -----------------------------------------------------------------------------

drop function if exists public.reserve_pickup_slot(uuid, uuid, text, integer);
drop function if exists public.release_pickup_slot(uuid, uuid, text, integer);

-- -----------------------------------------------------------------------------
-- Section 2: Drop capacity/reserved columns from drops (plus capacity_enforced)
-- -----------------------------------------------------------------------------

alter table public.drops
  drop column if exists capacity_pulled_pork,
  drop column if exists capacity_brisket,
  drop column if exists capacity_sauce,
  drop column if exists capacity_family_night,
  drop column if exists capacity_backyard_host,
  drop column if exists capacity_freezer_filler,
  drop column if exists reserved_pulled_pork,
  drop column if exists reserved_brisket,
  drop column if exists reserved_sauce,
  drop column if exists reserved_family_night,
  drop column if exists reserved_backyard_host,
  drop column if exists reserved_freezer_filler,
  drop column if exists capacity_enforced;

-- -----------------------------------------------------------------------------
-- Section 3: Drop the same twelve capacity/reserved columns from
-- drop_pickup_options (this table has no capacity_enforced)
-- -----------------------------------------------------------------------------

alter table public.drop_pickup_options
  drop column if exists capacity_pulled_pork,
  drop column if exists capacity_brisket,
  drop column if exists capacity_sauce,
  drop column if exists capacity_family_night,
  drop column if exists capacity_backyard_host,
  drop column if exists capacity_freezer_filler,
  drop column if exists reserved_pulled_pork,
  drop column if exists reserved_brisket,
  drop column if exists reserved_sauce,
  drop column if exists reserved_family_night,
  drop column if exists reserved_backyard_host,
  drop column if exists reserved_freezer_filler;
