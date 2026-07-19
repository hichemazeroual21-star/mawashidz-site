-- ============================================================
-- Rollback for Phase 0 existing-database migration
-- Version: 1.8.0
--
-- SAFETY POLICY:
--   - Does NOT drop columns (preserves data)
--   - Does NOT delete rows
--   - Removes triggers/functions/policies introduced by Phase 0
--   - member_id_counters table is LEFT IN PLACE (contains allocation state)
--
-- Only run this on a non-production database unless you have an
-- explicit owner-approved rollback window.
-- ============================================================

begin;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists trg_protect_profile_sensitive on public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.protect_profile_sensitive_columns();
drop function if exists public.allocate_member_id(text);
drop function if exists public.resolve_login_identifier(text);
drop function if exists public.member_role_prefix(text);
drop function if exists public.mdz_role_prefix(text);
drop function if exists public.mdz_normalize_role(text);

drop policy if exists "profiles: self read" on public.profiles;
drop policy if exists "profiles: self update limited" on public.profiles;

-- Columns, indexes, and member_id_counters intentionally retained.
-- To fully remove counters (destructive): 
--   drop table if exists public.member_id_counters;

commit;
