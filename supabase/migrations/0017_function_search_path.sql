-- =============================================================================
-- Big Matt's BBQ — Migration 0017
-- Pins `search_path = ''` on the four functions flagged by Supabase's
-- `function_search_path_mutable` advisory (WARN level), reported against both
-- projects after this session's schema-drift capture (migrations 0010-0016).
--
-- The advisory flags functions that do not pin `search_path`, which is the
-- standard Postgres hardening gap: an unpinned `search_path` lets a caller's
-- schema resolution order influence which objects the function body resolves
-- to. A caller with `CREATE` privilege on a schema earlier in their session's
-- `search_path` could otherwise shadow an unqualified table, view, or
-- function reference inside the function body with an object of their own.
--
-- All four functions below already reference every object fully
-- schema-qualified (verified against their definitions in
-- `0010_menu_costing_schema.sql` and `0014_sca_trigger_functions.sql`), so
-- pinning `search_path = ''` is a pure hardening change with no behavioral
-- effect — there is nothing unqualified left for a hijacked search path to
-- redirect.
--
-- This is also the schema change used to demonstrate the `bigmattsbbq-test`
-- -> production promotion pipeline for issue #14's final acceptance
-- criterion — see `docs/supabase-environments.md`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: menu_costing functions (0010_menu_costing_schema.sql)
-- -----------------------------------------------------------------------------

alter function menu_costing.calculate_item_unit_cost(uuid) set search_path = '';
alter function menu_costing.round_price_point(numeric, numeric) set search_path = '';

-- -----------------------------------------------------------------------------
-- Section 2: sca trigger functions (0014_sca_trigger_functions.sql)
-- -----------------------------------------------------------------------------

alter function sca.touch_updated_at() set search_path = '';
alter function sca.default_competition_steak_label() set search_path = '';
