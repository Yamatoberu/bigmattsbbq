-- =============================================================================
-- Big Matt's BBQ — Migration 0006 (expand)
-- Adds an explicit pickup date window (pickup_start_date / pickup_end_date) to
-- drop_pickup_options, backfilled from the existing pickup_date column, plus a
-- dormant orders.assigned_pickup_date column for issue #7 (issue #6).
--
-- This migration is purely additive — it must be safe to apply while the
-- currently deployed code still selects and relies on pickup_at, which this
-- migration does not touch. The companion contract migration
-- 0007_drop_pickup_at.sql removes pickup_at only after the code that stopped
-- reading it has been deployed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Add the window columns (nullable — table has live rows)
-- -----------------------------------------------------------------------------

alter table public.drop_pickup_options
  add column if not exists pickup_start_date date;

alter table public.drop_pickup_options
  add column if not exists pickup_end_date date;

-- -----------------------------------------------------------------------------
-- Section 2: Backfill from pickup_date (every existing row is single-day)
-- -----------------------------------------------------------------------------

update public.drop_pickup_options
set pickup_start_date = pickup_date,
    pickup_end_date = pickup_date
where pickup_start_date is null
   or pickup_end_date is null;

-- -----------------------------------------------------------------------------
-- Section 3: Promote both columns to not null now that every row is backfilled
-- -----------------------------------------------------------------------------

alter table public.drop_pickup_options
  alter column pickup_start_date set not null;

alter table public.drop_pickup_options
  alter column pickup_end_date set not null;

-- -----------------------------------------------------------------------------
-- Section 4: Ordering check constraint (idempotent — drop then add)
-- -----------------------------------------------------------------------------

alter table public.drop_pickup_options
  drop constraint if exists drop_pickup_options_pickup_window_check;

alter table public.drop_pickup_options
  add constraint drop_pickup_options_pickup_window_check
  check (pickup_end_date >= pickup_start_date);

-- -----------------------------------------------------------------------------
-- Section 5: Dormant orders.assigned_pickup_date (issue #7 — no code reads or
-- writes this column yet)
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists assigned_pickup_date date;
