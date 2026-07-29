-- ============================================================
-- MawashiDZ — Migration 017 VERIFICATION (read-only)
-- Run after 017 apply. Expect zero "FAIL" rows.
-- ============================================================

-- 1) Privilege matrix sample
select
  p.oid::regprocedure::text as full_signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  case
    when p.proname in (
      'handle_new_user',
      'mdz_registrations_assign_registration_id',
      'get_wilaya_manager_email',
      'admin_set_profile_status',
      'process_contact_message',
      'send_welcome_email'
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
    when p.proname in ('mdz_is_platform_admin', 'mdz_is_wilaya_manager', 'mdz_caller_wilaya')
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    then 'FAIL helper still anon-executable'
    when p.proname in ('mdz_is_platform_admin', 'mdz_is_wilaya_manager', 'mdz_caller_wilaya')
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
    then 'FAIL helper missing authenticated'
    else 'OK'
  end as check_result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user',
    'mdz_registrations_assign_registration_id',
    'get_wilaya_manager_email',
    'admin_set_profile_status',
    'mdz_is_platform_admin',
    'mdz_is_wilaya_manager',
    'mdz_caller_wilaya',
    'resolve_login_identifier',
    'review_registration_status',
    'process_contact_message',
    'send_welcome_email'
  )
order by 1;

-- 2) Dropped objects must be absent
select
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
  ) as on_registration_created_exists;

-- 3) Required triggers still present
select t.tgname, ns.nspname as table_schema, c.relname as table_name,
       p.oid::regprocedure as function_sig, t.tgenabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace ns on ns.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and t.tgname in ('on_auth_user_created', 'mdz_registrations_assign_registration_id')
order by 1;

-- 4) resolve_login_identifier unchanged (still executable by anon — by design in 017)
select
  has_function_privilege(
    'anon',
    'public.resolve_login_identifier(text)'::regprocedure,
    'EXECUTE'
  ) as resolve_login_anon_execute_expected_true;
