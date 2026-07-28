-- ============================================================
-- MawashiDZ — Cut profiles.role privilege bridge (manager)
-- After: 014_registration_id_integrity.sql
-- Idempotent.
--
-- MIGRATION LEDGER SCOPE (read before querying mdz_schema_migrations):
--   • Tracking STARTS at 015. This table is not a full project history.
--   • Versions before 015 were NOT rebuilt and NOT historically verified
--     into this ledger (production had no schema_migrations catalog).
--   • Do not treat an empty or 015-only ledger as proof that 001–014
--     were never applied — only that they were never recorded here.
--   • Archived forensic evidence (pre-cut function body, acceptance
--     runbook): see artifacts/security/
--     - 2026-07-28-manager-role-bridge.sql.txt
--     - 2026-07-28-manager-role-bridge-acceptance.sql.txt
--
-- ROLLBACK (no down migration file):
--   Re-apply the archived function definition from
--   artifacts/security/2026-07-28-manager-role-bridge.sql.txt
--   (user_roles OR profiles.role). Then delete or note version 015 in
--   mdz_schema_migrations if you track rollbacks operationally.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Project migration ledger — begins at 015 (not a full history)
-- ------------------------------------------------------------
create table if not exists public.mdz_schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now(),
  notes text
);

comment on table public.mdz_schema_migrations is
  'Forward migration ledger starting at 015. Pre-015 history was not reconstructed; see artifacts/security/ for archived evidence. Not a complete project changelog.';

alter table public.mdz_schema_migrations enable row level security;

revoke all on table public.mdz_schema_migrations from anon, authenticated;
grant select on table public.mdz_schema_migrations to service_role;

-- Do NOT invent history for 001–014: production had no ledger, so
-- claiming they were applied would reintroduce the blindness this
-- table exists to prevent. Record only migrations applied from 015 on.

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
