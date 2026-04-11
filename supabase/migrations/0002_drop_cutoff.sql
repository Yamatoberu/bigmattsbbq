-- =============================================================================
-- Big Matt's BBQ — Migration 0002
-- Adds order_cutoff_at to drops and activates the seed drop for Phase 2 dev
-- =============================================================================

alter table public.drops
  add column order_cutoff_at timestamptz;

update public.drops
set    order_cutoff_at = '2026-05-08 23:59:59-06',
       status          = 'active'
where  title = 'Test Drop - April 2026';
