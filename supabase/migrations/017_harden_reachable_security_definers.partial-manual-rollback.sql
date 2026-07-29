-- ============================================================
-- MawashiDZ — Migration 017 PARTIAL MANUAL ROLLBACK
-- ============================================================
-- LABEL: PARTIAL MANUAL ROLLBACK / privilege rollback ONLY.
--
-- This script restores client-facing EXECUTE grants that 017 revoked.
-- It does NOT automatically recreate:
--   - public.process_contact_message()
--   - public.contact_messages.on_contact_message_insert
--   - public.send_welcome_email()
--   - public.registrations.on_registration_created
--
-- HARD PRE-APPLY REQUIREMENT (Owner):
-- If full restoration capability is required after 017, save BEFORE apply:
--
--   select pg_get_functiondef('public.process_contact_message()'::regprocedure);
--   select pg_get_functiondef('public.send_welcome_email()'::regprocedure);
--   select pg_get_functiondef('public.get_wilaya_manager_email(text)'::regprocedure);
--
--   select tgname, tgtype, tgenabled, pg_get_triggerdef(oid)
--   from pg_trigger
--   where not tgisinternal
--     and tgname in ('on_contact_message_insert', 'on_registration_created');
--
-- Without those saved definitions, dropped functions/triggers cannot be
-- restored exactly. Do not reintroduce the Google Apps Script placeholder
-- webhook or the misleading welcome NOTICE trigger unless that is an
-- explicit Owner decision with the saved definitions pasted below.
-- ============================================================

begin;

-- Restore client EXECUTE on required trigger functions (pre-017 posture).
-- Triggers themselves were never dropped for these two.
grant execute on function public.handle_new_user() to anon, authenticated;
grant execute on function public.mdz_registrations_assign_registration_id() to anon, authenticated;

-- get_wilaya_manager_email: restore client EXECUTE only if intentionally
-- reverting containment (NOT recommended).
grant execute on function public.get_wilaya_manager_email(text) to anon, authenticated;
-- search_path remains whatever 017 set (public). Reset only if known prior config:
-- alter function public.get_wilaya_manager_email(text) reset search_path;

-- admin_set_profile_status(uuid,text): restore authenticated EXECUTE
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;

-- Auth helpers: restore anon EXECUTE (pre-017 F2 posture)
grant execute on function public.mdz_is_platform_admin() to anon;
grant execute on function public.mdz_is_wilaya_manager() to anon;
grant execute on function public.mdz_caller_wilaya() to anon;

-- Dropped functions/triggers: NOT restored by this script.
-- Paste saved CREATE FUNCTION / CREATE TRIGGER statements here only under
-- explicit Owner instruction.

comment on function public.admin_set_profile_status(uuid, text) is null;
comment on function public.get_wilaya_manager_email(text) is null;

do $$
begin
  if to_regclass('public.mdz_schema_migrations') is not null then
    delete from public.mdz_schema_migrations where version = '017';
  end if;
end;
$$;

commit;
