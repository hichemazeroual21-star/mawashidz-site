-- ============================================================
-- MawashiDZ — Migration 017 PARTIAL MANUAL ROLLBACK
-- ============================================================
-- LABEL: PARTIAL MANUAL ROLLBACK only.
--
-- This is NOT a complete restoration.
-- Full restoration of dropped objects REQUIRES pre-apply capture
-- (mandatory Go/No-Go gate — see below). Populate this file from
-- that captured production state before relying on any restore path.
--
-- This script restores client-facing EXECUTE grants that 017 revoked
-- and may reset search_path on get_wilaya_manager_email.
-- It does NOT automatically recreate:
--   - public.process_contact_message()
--   - public.contact_messages.on_contact_message_insert
--   - public.send_welcome_email()
--   - public.registrations.on_registration_created
--
-- ============================================================
-- MANDATORY PRE-APPLY CAPTURE (Go / No-Go gate)
-- Save BEFORE production apply:
--   - pg_get_functiondef(...)
--   - pg_get_triggerdef(...)
--   - proacl, proconfig, owner, SECURITY DEFINER (prosecdef)
-- ============================================================
--
-- -- Functions (definitions + ACL metadata):
-- -- Resolve by OID via to_regprocedure('public.name(types)') — do NOT
-- -- match pg_get_function_identity_arguments against types-only strings
-- -- (that API retains parameter names, e.g. 'p_wilaya_name text').
-- select
--   format(
--     'public.%s(%s)',
--     p.proname,
--     pg_get_function_identity_arguments(p.oid)
--   ) as function_signature,
--   p.oid::regprocedure::text as live_regprocedure_text,
--   pg_get_userbyid(p.proowner) as owner_name,
--   p.prosecdef as is_security_definer,
--   p.proconfig,
--   p.proacl,
--   pg_get_functiondef(p.oid) as function_def
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.oid in (
--     to_regprocedure('public.process_contact_message()'),
--     to_regprocedure('public.send_welcome_email()'),
--     to_regprocedure('public.get_wilaya_manager_email(text)'),
--     to_regprocedure('public.handle_new_user()'),
--     to_regprocedure('public.mdz_registrations_assign_registration_id()'),
--     to_regprocedure('public.admin_set_profile_status(uuid, text)'),
--     to_regprocedure('public.mdz_is_platform_admin()'),
--     to_regprocedure('public.mdz_is_wilaya_manager()'),
--     to_regprocedure('public.mdz_caller_wilaya()'),
--     to_regprocedure('public.resolve_login_identifier(text)')
--   );
--
-- Paste each captured owner_name into captured_owners in
-- 017_harden_reachable_security_definers.verify.sql using the
-- function_signature key (public.name(args)) before post-apply
-- acceptance. 017 does not change ownership; mismatch = FAIL.
--
-- -- Triggers:
-- select
--   ns.nspname as table_schema,
--   c.relname as table_name,
--   t.tgname,
--   t.tgenabled,
--   p.oid::regprocedure::text as function_sig,
--   pg_get_triggerdef(t.oid) as trigger_def
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace ns on ns.oid = c.relnamespace
-- join pg_proc p on p.oid = t.tgfoid
-- where not t.tgisinternal
--   and t.tgname in (
--     'on_contact_message_insert',
--     'on_registration_created',
--     'on_auth_user_created',
--     'mdz_registrations_assign_registration_id'
--   );
--
-- Without those saved definitions, dropped functions/triggers cannot be
-- restored exactly. Do not reintroduce the Google Apps Script placeholder
-- webhook or the misleading welcome NOTICE trigger unless that is an
-- explicit Owner decision with the saved definitions pasted below.
-- ============================================================

begin;

-- Restore client EXECUTE on required trigger functions (pre-017 posture).
-- Triggers themselves were never dropped for these two.
grant execute on function public.handle_new_user() to public, anon, authenticated;
grant execute on function public.mdz_registrations_assign_registration_id()
  to public, anon, authenticated;

-- get_wilaya_manager_email: restore client EXECUTE only if intentionally
-- reverting containment (NOT recommended).
grant execute on function public.get_wilaya_manager_email(text) to public, anon, authenticated;
-- 017 set search_path = ''. Reset only using captured prior proconfig:
-- alter function public.get_wilaya_manager_email(text) reset search_path;
-- OR restore exact captured SET from pre-apply capture.

-- admin_set_profile_status(uuid,text): restore authenticated EXECUTE
grant execute on function public.admin_set_profile_status(uuid, text)
  to public, anon, authenticated;

-- Auth helpers: restore PUBLIC/anon EXECUTE (pre-017 posture)
grant execute on function public.mdz_is_platform_admin() to public, anon;
grant execute on function public.mdz_is_wilaya_manager() to public, anon;
grant execute on function public.mdz_caller_wilaya() to public, anon;

-- Dropped functions/triggers: NOT restored by this script.
-- Paste saved CREATE FUNCTION / CREATE TRIGGER statements here only under
-- explicit Owner instruction, populated from the pre-apply capture.

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
