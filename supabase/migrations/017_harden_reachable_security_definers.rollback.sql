-- ============================================================
-- MawashiDZ — Migration 017 ROLLBACK (manual Owner apply)
-- ============================================================
-- WARNING: Destructive objects dropped in 017 cannot be restored to the
-- exact pre-change bodies without a pre-apply pg_get_functiondef backup.
--
-- Before applying 017, Operator SHOULD save:
--   select pg_get_functiondef('public.process_contact_message()'::regprocedure);
--   select pg_get_functiondef('public.send_welcome_email()'::regprocedure);
--   select pg_get_functiondef('public.get_wilaya_manager_email(text)'::regprocedure);
--
-- This rollback restores PRIVILEGES and documents how to restore dropped
-- objects from that backup. It does NOT reintroduce the Google Apps Script
-- webhook or the misleading welcome NOTICE trigger unless Operator pastes
-- the saved definitions below.
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

-- Dropped functions/triggers: paste saved definitions, then:
--   create trigger on_contact_message_insert ...
--   create trigger on_registration_created ...
-- Intentionally omitted here so rollback cannot silently recreate a
-- placeholder webhook or a fake welcome mailer.

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
