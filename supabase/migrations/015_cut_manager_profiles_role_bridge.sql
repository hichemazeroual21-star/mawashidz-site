-- ============================================================
-- MawashiDZ — Cut profiles.role privilege bridge (manager)
-- After: 014_registration_id_integrity.sql
-- Evidence archive (NOT a migration):
--   artifacts/security/2026-07-28-manager-role-bridge.sql.txt
-- Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Project migration ledger (production had none)
-- ------------------------------------------------------------
create table if not exists public.mdz_schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now(),
  notes text
);

alter table public.mdz_schema_migrations enable row level security;

revoke all on table public.mdz_schema_migrations from anon, authenticated;
grant select on table public.mdz_schema_migrations to service_role;

-- Do NOT invent history for 001–014: production had no ledger, so
-- claiming they were applied would reintroduce the blindness this
-- table exists to prevent. Record only migrations applied from here.

-- ------------------------------------------------------------
-- 1) Privilege source of truth: user_roles only
--    Removes OR exists(... profiles.role ...) bridge.
--    review_registration_status + support ticket RPCs/policies
--    already call this helper (live verified) — one cut closes them.
-- ------------------------------------------------------------
create or replace function public.mdz_is_wilaya_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  );
$$;

revoke all on function public.mdz_is_wilaya_manager() from public;
grant execute on function public.mdz_is_wilaya_manager() to authenticated, service_role;

insert into public.mdz_schema_migrations (version, name, notes) values
  (
    '015',
    '015_cut_manager_profiles_role_bridge.sql',
    'mdz_is_wilaya_manager: user_roles only; profiles.role bridge removed'
  )
on conflict (version) do update
set name = excluded.name,
    notes = excluded.notes,
    applied_at = now();
