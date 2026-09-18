-- =============================================================================
-- Big Matt's BBQ — Migration 0014 (retroactive capture)
-- Captures the `sca` schema's trigger functions and triggers exactly as they
-- exist live on production today. Same retroactive-capture origin as
-- 0013_sca_schema.sql — the `sca` schema was never tracked by Supabase's own
-- migration system on production, and is reconstructed here from
-- `bigmattsbbq-test`'s `clone_sca_trigger_functions` migration statements.
--
-- Split into its own file because it depends on the tables created in
-- 0013_sca_schema.sql.
-- =============================================================================

create function sca.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function sca.default_competition_steak_label()
returns trigger
language plpgsql
as $$
begin
  if new.competition_id is not null and (new.steak_label is null or btrim(new.steak_label) = '') then
    new.steak_label := 'A';
  end if;
  return new;
end;
$$;

create trigger chef_set_updated_at before update on sca.chef for each row execute function sca.touch_updated_at();
create trigger competition_set_updated_at before update on sca.competition for each row execute function sca.touch_updated_at();
create trigger cook_set_updated_at before update on sca.cook for each row execute function sca.touch_updated_at();
create trigger cook_detail_set_updated_at before update on sca.cook_detail for each row execute function sca.touch_updated_at();
create trigger score_set_updated_at before update on sca.score for each row execute function sca.touch_updated_at();
create trigger cook_default_competition_steak_label before insert or update on sca.cook for each row execute function sca.default_competition_steak_label();
