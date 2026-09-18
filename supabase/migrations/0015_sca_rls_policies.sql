-- =============================================================================
-- Big Matt's BBQ — Migration 0015 (retroactive capture)
-- Captures the `sca` schema's Row Level Security policies exactly as they
-- exist live on production today. Same retroactive-capture origin as
-- 0013_sca_schema.sql and 0014_sca_trigger_functions.sql — reconstructed
-- here from the `sca.*`-only subset of `bigmattsbbq-test`'s
-- `clone_rls_policies` migration statements (7 named policies). The
-- `"Public can read active attribution sources"` policy from that same
-- source migration is intentionally excluded — it belongs to
-- 0012_attribution_sources.sql and is already captured there, since it was
-- created inline as part of `create_attribution_sources` on prod.
--
-- These policies allow authenticated chef self-management (auth.uid()-scoped
-- reads/writes), even though the current app only reads this schema via a
-- service-role client (STATE.md: "read-only tracker, no new auth,
-- service-role Supabase reads only"). They pre-exist in prod for a
-- chef-facing write path that isn't part of this repo's current app code —
-- their presence here is a faithful capture, not a new feature.
-- =============================================================================

create policy chef_self_manage
on sca.chef for all
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

create policy competition_authenticated_manage
on sca.competition for all
to authenticated
using (true)
with check (true);

create policy cook_owner_manage
on sca.cook for all
to authenticated
using (exists (select 1 from sca.chef where chef.id = cook.chef_id and chef.auth_user_id = (select auth.uid())))
with check (exists (select 1 from sca.chef where chef.id = cook.chef_id and chef.auth_user_id = (select auth.uid())));

create policy cook_ai_review_owner_manage
on sca.cook_ai_review for all
to authenticated
using (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_ai_review.cook_id and chef.auth_user_id = (select auth.uid())))
with check (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_ai_review.cook_id and chef.auth_user_id = (select auth.uid())));

create policy cook_detail_owner_manage
on sca.cook_detail for all
to authenticated
using (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_detail.cook_id and chef.auth_user_id = (select auth.uid())))
with check (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_detail.cook_id and chef.auth_user_id = (select auth.uid())));

create policy cook_weather_owner_manage
on sca.cook_weather for all
to authenticated
using (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_weather.cook_id and chef.auth_user_id = (select auth.uid())))
with check (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = cook_weather.cook_id and chef.auth_user_id = (select auth.uid())));

create policy score_owner_manage
on sca.score for all
to authenticated
using (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = score.cook_id and chef.auth_user_id = (select auth.uid())))
with check (exists (select 1 from sca.cook join sca.chef on chef.id = cook.chef_id where cook.id = score.cook_id and chef.auth_user_id = (select auth.uid())));
