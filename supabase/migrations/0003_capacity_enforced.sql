-- =============================================================================
-- Big Matt's BBQ — Migration 0003
-- Adds capacity_enforced flag to drops so a drop can opt out of capacity gates
-- =============================================================================

alter table public.drops
  add column capacity_enforced boolean not null default true;
