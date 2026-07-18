-- ============================================================
-- Rollback for Phase 0 fresh-database migration
--
-- WARNING: Destructive for empty sandboxes only.
-- Do NOT run against Production or any database with real users.
--
-- Steps:
--   1) Run 20260718233000_phase0_existing_database_rollback.sql
--   2) Optionally uncomment DROP TABLE statements below
-- ============================================================

begin;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists trg_protect_profile_sensitive on public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.protect_profile_sensitive_columns();
drop function if exists public.allocate_member_id(text);
drop function if exists public.resolve_login_identifier(text);
drop function if exists public.member_role_prefix(text);

drop policy if exists "profiles: self read" on public.profiles;
drop policy if exists "profiles: self update limited" on public.profiles;

-- Uncomment only on disposable sandboxes:
-- drop table if exists public.feedback_tickets;
-- drop table if exists public.contact_messages;
-- drop table if exists public.registrations;
-- drop table if exists public.profiles;
-- drop table if exists public.member_id_counters;

commit;
