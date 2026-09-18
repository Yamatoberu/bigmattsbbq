-- =============================================================================
-- Big Matt's BBQ — Migration 0011 (retroactive capture)
-- Adds `menu_costing.vendors.shorthand`, its comment, and a one-time seed
-- update for the 'Restaurant Depot' vendor row. This was applied directly to
-- production on 2026-07-24 (tracked on prod as Supabase migration version
-- 20260724213129, name `add_vendor_shorthand`), predating this repo's own
-- migration tracking for it — captured now (issue #14) alongside 0010, its
-- parent schema's own retroactive capture.
--
-- Same origin note as 0010: `menu_costing` is unrelated to the bigmattsbbq
-- storefront/SCA app.
--
-- The content below is copied verbatim, byte-for-byte, from production's own
-- `supabase_migrations.schema_migrations.statements` column for this version.
-- =============================================================================

alter table menu_costing.vendors
  add column if not exists shorthand text;

comment on column menu_costing.vendors.shorthand is
  'Short vendor code or abbreviation used in operational notes, such as RD for Restaurant Depot.';

update menu_costing.vendors
set shorthand = 'RD'
where name = 'Restaurant Depot'
  and shorthand is distinct from 'RD';
