-- =============================================================================
-- Big Matt's BBQ — Migration 0007 (contract)
-- Drops drop_pickup_options.pickup_at, completing the window-column migration
-- started by 0006_pickup_windows.sql (issue #6).
--
-- PREREQUISITE — DO NOT APPLY OUT OF ORDER:
-- This migration must not be applied until 0006_pickup_windows.sql has been
-- applied AND the application code that stopped selecting pickup_at has been
-- deployed. Applying this before the code deploy will 500 every request that
-- still selects pickup_at (GET /api/drop, POST /api/checkout). See the
-- <scope_note> in quick task 260904-uyl's plan for the full ordering
-- rationale — it differs from quick task 260904-twn's single-step pattern
-- because this change both adds and removes column reads in the same deploy.
-- =============================================================================

alter table public.drop_pickup_options
  drop column if exists pickup_at;
