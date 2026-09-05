-- =============================================================================
-- Big Matt's BBQ — Migration 0008 (additive)
-- Adds order_status, payment_status, and total_amount_cents to public.orders
-- so a first-party Supabase row can track a checkout's lifecycle independent
-- of Square (issue #9).
--
-- This migration is purely additive — nothing is dropped and no RLS policy is
-- added. Unlike 0007_drop_pickup_at.sql's contract ordering, the application
-- code being shipped alongside this migration HARD-DEPENDS on these columns
-- existing (the checkout route inserts order_status/payment_status on every
-- request). This migration MUST be applied BEFORE that code is deployed —
-- deploying the code first would 500 every checkout. See the <scope_note> in
-- quick task 260904-w6s's plan for the full ordering rationale.
--
-- Amounts are stored in cents as a plain integer. There is deliberately no
-- currency column — the storefront is USD-only, and this is documented here
-- rather than modeled as a column.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: Add the new columns
-- -----------------------------------------------------------------------------

alter table public.orders
  add column if not exists order_status text not null default 'pending';

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid';

alter table public.orders
  add column if not exists total_amount_cents integer;

-- -----------------------------------------------------------------------------
-- Section 2: Check constraints (idempotent — drop then add)
-- -----------------------------------------------------------------------------

alter table public.orders
  drop constraint if exists orders_order_status_check;

alter table public.orders
  add constraint orders_order_status_check
  check (order_status in ('pending', 'invoiced', 'failed'));

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'paid'));

-- -----------------------------------------------------------------------------
-- Section 3: Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_orders_square_order_id on public.orders (square_order_id);
