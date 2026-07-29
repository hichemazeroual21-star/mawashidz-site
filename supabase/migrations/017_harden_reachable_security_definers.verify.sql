-- ============================================================
-- MawashiDZ — Migration 017 VERIFICATION (read-only)
-- Run after 017 apply in Supabase SQL Editor.
-- Expect every check_result = 'OK' (zero FAIL rows across result sets).
--
-- PUBLIC EXECUTE is measured via aclexplode (grantee = 0), NOT
-- has_function_privilege('public', ...), which is unreliable for the
-- PUBLIC pseudo-role.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Privilege checks on retained / expected-present functions
-- ------------------------------------------------------------
select
  p.oid::regprocedure::text as full_signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
  exists (
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a(grantor, grantee, privilege_type, is_grantable)
    where a.grantee = 0
      and a.privilege_type = 'EXECUTE'
  ) as public_execute,
  case
    when p.proname in (
      'handle_new_user',
      'mdz_registrations_assign_registration_id',
      'get_wilaya_manager_email',
      'admin_set_profile_status'
    )
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    then 'FAIL anon still executable'
    when p.proname in (
      'handle_new_user',
      'mdz_registrations_assign_registration_id',
      'get_wilaya_manager_email',
      'admin_set_profile_status'
    )
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    then 'FAIL authenticated still executable'
    when p.proname in (
      'handle_new_user',
      'mdz_registrations_assign_registration_id',
      'get_wilaya_manager_email',
      'admin_set_profile_status'
    )
    and exists (
      select 1
      from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a(grantor, grantee, privilege_type, is_grantable)
      where a.grantee = 0
        and a.privilege_type = 'EXECUTE'
    )
    then 'FAIL PUBLIC still has EXECUTE'
    when p.proname in ('mdz_is_platform_admin', 'mdz_is_wilaya_manager', 'mdz_caller_wilaya')
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    then 'FAIL helper still anon-executable'
    when p.proname in ('mdz_is_platform_admin', 'mdz_is_wilaya_manager', 'mdz_caller_wilaya')
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
    then 'FAIL helper missing authenticated'
    when p.proname = 'resolve_login_identifier'
    and not has_function_privilege('anon', p.oid, 'EXECUTE')
    then 'FAIL resolve_login_identifier anon EXECUTE changed (017 must leave it unchanged)'
    else 'OK'
  end as check_result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    (p.proname = 'handle_new_user' and pg_get_function_identity_arguments(p.oid) = '')
    or (p.proname = 'mdz_registrations_assign_registration_id' and pg_get_function_identity_arguments(p.oid) = '')
    or (p.proname = 'get_wilaya_manager_email' and pg_get_function_identity_arguments(p.oid) = 'text')
    or (p.proname = 'admin_set_profile_status' and pg_get_function_identity_arguments(p.oid) = 'uuid, text')
    or (p.proname = 'mdz_is_platform_admin' and pg_get_function_identity_arguments(p.oid) = '')
    or (p.proname = 'mdz_is_wilaya_manager' and pg_get_function_identity_arguments(p.oid) = '')
    or (p.proname = 'mdz_caller_wilaya' and pg_get_function_identity_arguments(p.oid) = '')
    or (p.proname = 'resolve_login_identifier' and pg_get_function_identity_arguments(p.oid) = 'text')
    or (p.proname = 'review_registration_status' and pg_get_function_identity_arguments(p.oid) = 'text, text, text')
  )
order by 1;

-- ------------------------------------------------------------
-- 2) Dropped functions/triggers — explicit OK / FAIL
-- ------------------------------------------------------------
select
  'dropped_process_contact_message' as check_name,
  to_regprocedure('public.process_contact_message()') as process_contact_message,
  to_regprocedure('public.send_welcome_email()') as send_welcome_email,
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace ns on ns.oid = c.relnamespace
    where not t.tgisinternal
      and ns.nspname = 'public' and c.relname = 'contact_messages'
      and t.tgname = 'on_contact_message_insert'
  ) as on_contact_message_insert_exists,
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace ns on ns.oid = c.relnamespace
    where not t.tgisinternal
      and ns.nspname = 'public' and c.relname = 'registrations'
      and t.tgname = 'on_registration_created'
  ) as on_registration_created_exists,
  case
    when to_regprocedure('public.process_contact_message()') is not null
      then 'FAIL process_contact_message() still present'
    when to_regprocedure('public.send_welcome_email()') is not null
      then 'FAIL send_welcome_email() still present'
    when exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where not t.tgisinternal
        and ns.nspname = 'public' and c.relname = 'contact_messages'
        and t.tgname = 'on_contact_message_insert'
    )
      then 'FAIL on_contact_message_insert still present'
    when exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where not t.tgisinternal
        and ns.nspname = 'public' and c.relname = 'registrations'
        and t.tgname = 'on_registration_created'
    )
      then 'FAIL on_registration_created still present'
    else 'OK'
  end as check_result;

-- ------------------------------------------------------------
-- 3) Required triggers — explicit OK / FAIL per expected binding
-- ------------------------------------------------------------
select
  expected.tgname,
  expected.table_schema,
  expected.table_name,
  expected.function_sig,
  hit.tgenabled as observed_tgenabled,
  hit.observed_function_sig,
  case
    when hit.tg_oid is null
      then 'FAIL required trigger absent'
    when hit.observed_function_sig is distinct from expected.function_sig
      then 'FAIL trigger bound to wrong function signature'
    when hit.tgenabled not in ('O', 'A')
      then 'FAIL trigger disabled'
    else 'OK'
  end as check_result
from (
  values
    ('on_auth_user_created', 'auth', 'users', 'handle_new_user()'),
    (
      'mdz_registrations_assign_registration_id',
      'public',
      'registrations',
      'mdz_registrations_assign_registration_id()'
    )
) as expected(tgname, table_schema, table_name, function_sig)
left join lateral (
  select
    t.oid as tg_oid,
    t.tgenabled,
    p.oid::regprocedure::text as observed_function_sig
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal
    and t.tgname = expected.tgname
    and ns.nspname = expected.table_schema
    and c.relname = expected.table_name
) hit on true
order by expected.tgname;

-- ------------------------------------------------------------
-- 4) resolve_login_identifier unchanged (017 design)
-- ------------------------------------------------------------
select
  'resolve_login_identifier_unchanged' as check_name,
  has_function_privilege(
    'anon',
    'public.resolve_login_identifier(text)'::regprocedure,
    'EXECUTE'
  ) as anon_execute,
  case
    when not has_function_privilege(
      'anon',
      'public.resolve_login_identifier(text)'::regprocedure,
      'EXECUTE'
    )
    then 'FAIL resolve_login_identifier anon EXECUTE changed'
    else 'OK'
  end as check_result;
