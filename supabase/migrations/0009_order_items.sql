-- =============================================================================
-- Big Matt's BBQ — Migration 0009 (additive)
-- Adds public.order_items, a first-party, server-derived line-item table so
-- operations can answer "what is in this order" from Supabase alone, at the
-- line-item level, without trusting the client or depending on Square order-
-- creation timing (issue #3). Each row is a snapshot of one cart entry's
-- catalog name and price, looked up from Square Catalog at checkout time.
--
-- This migration is purely additive — nothing is dropped, no existing table
-- is altered, and no RLS policy is added. It builds atop public.orders'
-- lifecycle columns added by issue #9 (migration 0008).
--
-- Like 0008, the application code being shipped alongside this migration
-- HARD-DEPENDS on this table existing (the checkout route inserts an
-- order_items row for every submitted cart entry on every checkout). This
-- migration MUST be applied BEFORE that code is deployed — deploying the
-- code first would 500 every checkout. See the <scope_note> in quick task
-- 260907-id0's plan for the full ordering rationale.
--
-- Amounts are stored in cents as a plain integer. There is deliberately no
-- currency column — the storefront is USD-only, matching public.orders.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Table
-- -----------------------------------------------------------------------------

create table if not exists public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  variation_id       text not null,
  item_id            text,
  item_name          text not null,
  variation_name     text not null,
  quantity           integer not null,
  unit_price_cents   integer not null,
  constraint order_items_quantity_check check (quantity > 0)
);

-- -----------------------------------------------------------------------------
-- Section 2: Row Level Security
-- No policies created = anon reads and writes are both denied.
-- Service role key bypasses RLS entirely at the database level (BYPASSRLS).
-- -----------------------------------------------------------------------------

alter table public.order_items enable row level security;

-- -----------------------------------------------------------------------------
-- Section 3: Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_order_items_order_id on public.order_items (order_id);
