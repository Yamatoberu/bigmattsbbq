-- =============================================================================
-- Big Matt's BBQ — Local dev / e2e seed data
-- Synthetic, non-PII data only. Loaded by `supabase db reset` per
-- supabase/config.toml's [db.seed] sql_paths.
--
-- Seeds exactly one active drop so Playwright's checkoutFlow suite has a
-- genuinely active drop to check out against — e2e/support/stubs.ts's
-- hasActiveDrop() requires GET /api/drop to return a body whose `status`
-- field is literally "active" (not "upcoming"), which lib/drops.ts's
-- fetchActiveDrop() derives directly from this row's `status` column.
--
-- order_cutoff_at is left null so this seed drop can never appear closed to
-- checkDropReady() regardless of when `supabase db reset` is run.
--
-- Deliberately does NOT insert into public.orders, public.mailing_list, or
-- public.email_logs — the checkout suite only needs an active drop to exist,
-- not any pre-existing order/customer data. public.attribution_sources is
-- already seeded by migration 0012_attribution_sources.sql and is not
-- duplicated here.
-- =============================================================================

do $$
declare
  v_drop_id uuid;
begin
  insert into public.drops (title, status, order_cutoff_at)
  values ('E2E Test Drop', 'active', null)
  returning id into v_drop_id;

  insert into public.drop_pickup_options
    (drop_id, location_label, pickup_date, pickup_start_date, pickup_end_date)
  values
    (v_drop_id, 'Cache Valley (Test)', '2099-01-10', '2099-01-10', '2099-01-10'),
    (v_drop_id, 'Utah County (Test)',  '2099-01-10', '2099-01-10', '2099-01-10'),
    (v_drop_id, 'Sandy (Test)',        '2099-01-10', '2099-01-10', '2099-01-10');
end;
$$;
