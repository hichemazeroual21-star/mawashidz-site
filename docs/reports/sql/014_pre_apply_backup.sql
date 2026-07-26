-- ============================================================
-- Operator-only PRE-APPLY backup for migration 014
-- Location: docs/reports/sql/ (NOT supabase/migrations/)
--
-- Snapshots registrations that currently lack registration_id.
-- NEVER overwrites an existing snapshot (CREATE TABLE IF NOT EXISTS).
-- ============================================================

do $$
begin
  if to_regclass('public.registrations_regid_backup_014') is not null then
    raise notice
      '014_pre_apply_backup: public.registrations_regid_backup_014 already exists — leaving snapshot untouched';
  end if;
end;
$$;

create table if not exists public.registrations_regid_backup_014 as
select
    id,
    registration_id as previous_registration_id,
    now() as backed_up_at
from public.registrations
where nullif(btrim(coalesce(registration_id,'')),'') is null;

-- Evidence for operator (row count of snapshot; 0 if table pre-existed empty or no missing ids)
select
  count(*) as backup_row_count,
  min(backed_up_at) as backed_up_at
from public.registrations_regid_backup_014;
