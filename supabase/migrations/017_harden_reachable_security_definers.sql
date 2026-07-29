-- ============================================================
-- MawashiDZ — Migration 017: harden reachable SECURITY DEFINER
-- ============================================================
-- Scope (confirmed live evidence 2026-07-29; do NOT invent):
--   A) REVOKE client EXECUTE on required triggers' functions
--      handle_new_user(), mdz_registrations_assign_registration_id()
--   B) REVOKE client EXECUTE on get_wilaya_manager_email(text);
--      lock search_path explicitly. Body rewriting intentionally deferred
--      to keep 017 limited to containment + legacy-trigger removal.
--      Live body (exported) reads public.wilaya_managers / public.wilayas;
--      a later package may recreate with search_path='' + fully-qualified refs.
--   C) Drop legacy contact webhook trigger + process_contact_message()
--      (placeholder YOUR_GOOGLE_APPS_SCRIPT_WEBHOOK_URL). contact_messages
--      INSERT remains; notification delivery is NOT provided by this
--      migration — implement later via email_outbox if required.
--   D) Drop misleading no-op send_welcome_email trigger+function.
--      Real approval mail remains review_registration_status → outbox.
--   E) REVOKE client EXECUTE on admin_set_profile_status(uuid,text)
--      (legacy; app uses review_registration_status).
--   F) REVOKE anon EXECUTE on mdz_is_platform_admin/mdz_is_wilaya_manager/
--      mdz_caller_wilaya (keep authenticated, service_role).
--   G) resolve_login_identifier intentionally UNCHANGED (separate design).
--
-- Evidence anchors (repository):
--   handle_new_user trigger: 20260719110000_secure_allocate_member_id.sql:25,86-88
--   mdz_registrations_assign_registration_id: 014_registration_id_integrity.sql:209-258
--   review_registration_status / outbox: 012_phase1_quality_elevation.sql:247-423
--   admin_set_profile_status(uuid,text) legacy: 007_review_registration_status.sql:157-245
--   auth helpers: 012_phase1_quality_elevation.sql:48-96; 015:52-67
--   contact insert (no process_contact_message in repo): index.html:3548
--
-- Fail-closed: destructive DDL runs only after catalog assertions.
-- Privilege REVOKE is repeat-safe. Exact DROP is not silently IF EXISTS.
--
-- Transaction: single explicit BEGIN/COMMIT. Apply by Owner SQL Editor
-- or migration runner that does not double-wrap transactions.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Prefight helpers (session-local)
-- ------------------------------------------------------------
create or replace function pg_temp.mdz017_assert(p_ok boolean, p_msg text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'migration 017 aborted (drift): %', p_msg
      using errcode = 'P0001';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- A) Required trigger functions — assert then REVOKE client EXECUTE
-- ------------------------------------------------------------

-- A1 handle_new_user: trigger auth.users / on_auth_user_created
do $$
declare
  v_fn oid;
  v_trig oid;
  v_enabled "char";
  v_rel_schema text;
  v_rel_name text;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_get_function_identity_arguments(p.oid) = ''
    and p.prorettype = 'trigger'::regtype
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.handle_new_user() SECURITY DEFINER RETURNS trigger'
  );

  select t.oid, t.tgenabled, ns.nspname, c.relname
    into v_trig, v_enabled, v_rel_schema, v_rel_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  where not t.tgisinternal
    and t.tgname = 'on_auth_user_created'
    and t.tgfoid = v_fn;

  perform pg_temp.mdz017_assert(
    v_trig is not null
      and v_rel_schema = 'auth'
      and v_rel_name = 'users'
      and v_enabled in ('O', 'A'),
    'expected enabled trigger auth.users.on_auth_user_created -> handle_new_user()'
  );
end;
$$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- A2 mdz_registrations_assign_registration_id
do $$
declare
  v_fn oid;
  v_trig oid;
  v_enabled "char";
  v_rel_schema text;
  v_rel_name text;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'mdz_registrations_assign_registration_id'
    and pg_get_function_identity_arguments(p.oid) = ''
    and p.prorettype = 'trigger'::regtype
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.mdz_registrations_assign_registration_id() SECURITY DEFINER RETURNS trigger'
  );

  select t.oid, t.tgenabled, ns.nspname, c.relname
    into v_trig, v_enabled, v_rel_schema, v_rel_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  where not t.tgisinternal
    and t.tgname = 'mdz_registrations_assign_registration_id'
    and t.tgfoid = v_fn;

  perform pg_temp.mdz017_assert(
    v_trig is not null
      and v_rel_schema = 'public'
      and v_rel_name = 'registrations'
      and v_enabled in ('O', 'A'),
    'expected enabled trigger public.registrations.mdz_registrations_assign_registration_id'
  );
end;
$$;

revoke execute on function public.mdz_registrations_assign_registration_id()
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- B) get_wilaya_manager_email(text) — REVOKE client EXECUTE; lock path
-- ------------------------------------------------------------
do $$
declare
  v_fn oid;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_wilaya_manager_email'
    and pg_get_function_identity_arguments(p.oid) = 'text'
    and p.prorettype = 'text'::regtype
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.get_wilaya_manager_email(text) SECURITY DEFINER RETURNS text'
  );
end;
$$;

-- Body rewriting intentionally deferred (017 = containment only).
-- Live exported body (Operator):
--   SELECT wm.email
--   FROM public.wilaya_managers wm
--   JOIN public.wilayas w ON wm.wilaya_id = w.id
--   WHERE w.name = p_wilaya_name
--   LIMIT 1;
-- Explicit search_path=public locks ambient search without changing that SELECT.
alter function public.get_wilaya_manager_email(text)
  set search_path = public;

revoke execute on function public.get_wilaya_manager_email(text)
  from public, anon, authenticated;

grant execute on function public.get_wilaya_manager_email(text)
  to service_role;

comment on function public.get_wilaya_manager_email(text) is
  'LEGACY: returns manager email from wilaya_managers; client EXECUTE revoked in 017. Not for browser RPC. Body rewrite to search_path='''' deferred (containment-only package).';

-- ------------------------------------------------------------
-- C) process_contact_message — assert, drop trigger, drop function
-- ------------------------------------------------------------
-- Notification delivery is NOT implemented here. contact_messages INSERT
-- continues via RLS policies. Supported mail path remains email_outbox
-- (012/013 Worker + Resend), not this placeholder webhook.
do $$
declare
  v_fn oid;
  v_trig oid;
  v_enabled "char";
  v_rel_schema text;
  v_rel_name text;
  v_def text;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'process_contact_message'
    and pg_get_function_identity_arguments(p.oid) = ''
    and p.prorettype = 'trigger'::regtype
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.process_contact_message() SECURITY DEFINER RETURNS trigger'
  );

  v_def := pg_get_functiondef(v_fn);
  perform pg_temp.mdz017_assert(
    v_def ilike '%YOUR_GOOGLE_APPS_SCRIPT_WEBHOOK_URL%',
    'expected process_contact_message body to contain placeholder YOUR_GOOGLE_APPS_SCRIPT_WEBHOOK_URL'
  );

  select t.oid, t.tgenabled, ns.nspname, c.relname
    into v_trig, v_enabled, v_rel_schema, v_rel_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  where not t.tgisinternal
    and t.tgname = 'on_contact_message_insert'
    and t.tgfoid = v_fn;

  perform pg_temp.mdz017_assert(
    v_trig is not null
      and v_rel_schema = 'public'
      and v_rel_name = 'contact_messages'
      and v_enabled in ('O', 'A'),
    'expected enabled trigger public.contact_messages.on_contact_message_insert -> process_contact_message()'
  );
end;
$$;

-- Locks: DROP TRIGGER takes AccessExclusiveLock on public.contact_messages (short).
drop trigger on_contact_message_insert on public.contact_messages;

-- Locks: DROP FUNCTION AccessExclusiveLock on the function OID.
drop function public.process_contact_message();

-- ------------------------------------------------------------
-- D) send_welcome_email — assert, drop trigger, drop function
-- ------------------------------------------------------------
do $$
declare
  v_fn oid;
  v_trig oid;
  v_enabled "char";
  v_rel_schema text;
  v_rel_name text;
  v_def text;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'send_welcome_email'
    and pg_get_function_identity_arguments(p.oid) = ''
    and p.prorettype = 'trigger'::regtype
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.send_welcome_email() SECURITY DEFINER RETURNS trigger'
  );

  v_def := pg_get_functiondef(v_fn);
  perform pg_temp.mdz017_assert(
    v_def ilike '%raise%notice%' or v_def ilike '%RAISE NOTICE%',
    'expected send_welcome_email body to be NOTICE no-op (confirmed live)'
  );
  perform pg_temp.mdz017_assert(
    v_def not ilike '%mdz_enqueue_email%'
      and v_def not ilike '%resend%'
      and v_def not ilike '%http_request%',
    'send_welcome_email unexpectedly appears to send mail — abort'
  );

  select t.oid, t.tgenabled, ns.nspname, c.relname
    into v_trig, v_enabled, v_rel_schema, v_rel_name
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  where not t.tgisinternal
    and t.tgname = 'on_registration_created'
    and t.tgfoid = v_fn;

  perform pg_temp.mdz017_assert(
    v_trig is not null
      and v_rel_schema = 'public'
      and v_rel_name = 'registrations'
      and v_enabled in ('O', 'A'),
    'expected enabled trigger public.registrations.on_registration_created -> send_welcome_email()'
  );
end;
$$;

-- Locks: AccessExclusiveLock on public.registrations during DROP TRIGGER (short).
drop trigger on_registration_created on public.registrations;
drop function public.send_welcome_email();

-- ------------------------------------------------------------
-- E) admin_set_profile_status(uuid,text) — REVOKE client EXECUTE; keep
-- ------------------------------------------------------------
do $$
declare
  v_fn oid;
  v_def text;
begin
  select p.oid into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'admin_set_profile_status'
    and pg_get_function_identity_arguments(p.oid) = 'uuid, text'
    and p.prosecdef;

  perform pg_temp.mdz017_assert(
    v_fn is not null,
    'expected public.admin_set_profile_status(uuid, text) SECURITY DEFINER'
  );

  v_def := pg_get_functiondef(v_fn);
  perform pg_temp.mdz017_assert(
    v_def ilike '%profiles%role%'
      or v_def ilike '%wilaya_manager%'
      or v_def ilike '%user_roles%',
    'admin_set_profile_status(uuid,text) body missing expected role checks — abort'
  );
end;
$$;

revoke execute on function public.admin_set_profile_status(uuid, text)
  from public, anon, authenticated;

grant execute on function public.admin_set_profile_status(uuid, text)
  to service_role;

comment on function public.admin_set_profile_status(uuid, text) is
  'LEGACY (017): externally revoked. Application path is review_registration_status(text,text,text). Contains historical profiles.role manager bridge. Do not re-grant to authenticated.';

-- ------------------------------------------------------------
-- F) Auth helpers — REVOKE anon only
-- ------------------------------------------------------------
do $$
begin
  perform pg_temp.mdz017_assert(
    to_regprocedure('public.mdz_is_platform_admin()') is not null,
    'missing public.mdz_is_platform_admin()'
  );
  perform pg_temp.mdz017_assert(
    to_regprocedure('public.mdz_is_wilaya_manager()') is not null,
    'missing public.mdz_is_wilaya_manager()'
  );
  perform pg_temp.mdz017_assert(
    to_regprocedure('public.mdz_caller_wilaya()') is not null,
    'missing public.mdz_caller_wilaya()'
  );
end;
$$;

revoke execute on function public.mdz_is_platform_admin() from anon;
revoke execute on function public.mdz_is_wilaya_manager() from anon;
revoke execute on function public.mdz_caller_wilaya() from anon;

grant execute on function public.mdz_is_platform_admin() to authenticated, service_role;
grant execute on function public.mdz_is_wilaya_manager() to authenticated, service_role;
grant execute on function public.mdz_caller_wilaya() to authenticated, service_role;

-- ------------------------------------------------------------
-- G) resolve_login_identifier — intentionally unchanged
-- ------------------------------------------------------------
-- See docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md

-- ------------------------------------------------------------
-- Ledger (idempotent upsert; table may exist from 014/015)
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      (
        '017',
        '017_harden_reachable_security_definers.sql',
        'Revoke client EXECUTE on triggers/helpers/legacy admin; drop contact webhook + welcome no-op'
      )
    on conflict (version) do update
    set name = excluded.name,
        notes = excluded.notes,
        applied_at = now();
  end if;
end;
$$;

commit;

-- ============================================================
-- Lock / safety notes (documentation in-file):
-- * BEGIN/COMMIT: transaction-safe for all statements used here.
-- * REVOKE/GRANT: short AccessShare-level catalog updates; repeat-safe.
-- * ALTER FUNCTION SET search_path: locks function; brief.
-- * DROP TRIGGER on contact_messages / registrations: AccessExclusiveLock
--   on those tables until drop completes; concurrent INSERTs may wait
--   briefly (typically milliseconds–seconds).
-- * DROP FUNCTION: AccessExclusiveLock on function; not concurrent-callable.
-- * No CONCURRENTLY indexes; no VACUUM; no NOT VALID constraints.
-- * Not repeat-safe for DROP TRIGGER/FUNCTION: second apply fails closed
--   at preflight assertions (expected — prevents silent drift).
-- ============================================================
