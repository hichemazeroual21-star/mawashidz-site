-- MawashiDZ — 020 live verification (read-only; preserve raw output)
select
  to_regclass('public.admin_audit_log') is not null as audit_table_exists,
  coalesce((
    select c.relrowsecurity
    from pg_catalog.pg_class c
    where c.oid = to_regclass('public.admin_audit_log')
  ), false) as audit_rls_enabled,
  exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_log'
      and policyname = 'admin_audit: admin read'
  ) as admin_read_policy_exists,
  to_regprocedure('public.mdz_assert_admin_caller()') is not null as admin_assert_exists,
  to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') is not null as audit_writer_exists,
  to_regprocedure('public.admin_list_audit_log(integer)') is not null as audit_reader_exists,
  not has_table_privilege('anon', 'public.admin_audit_log', 'SELECT') as anon_table_blocked,
  has_table_privilege('authenticated', 'public.admin_audit_log', 'SELECT') as authenticated_table_select,
  not has_function_privilege('anon', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE') as anon_writer_blocked,
  not has_function_privilege('authenticated', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE') as authenticated_writer_blocked,
  not has_function_privilege('service_role', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE') as service_writer_blocked,
  not has_function_privilege('anon', 'public.admin_list_audit_log(integer)', 'EXECUTE') as anon_reader_blocked,
  has_function_privilege('authenticated', 'public.admin_list_audit_log(integer)', 'EXECUTE') as authenticated_reader_allowed,
  case
    when to_regclass('public.admin_audit_log') is not null
     and coalesce((select c.relrowsecurity from pg_catalog.pg_class c where c.oid = to_regclass('public.admin_audit_log')), false)
     and exists (
       select 1 from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename = 'admin_audit_log'
         and policyname = 'admin_audit: admin read'
     )
     and to_regprocedure('public.mdz_assert_admin_caller()') is not null
     and to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') is not null
     and to_regprocedure('public.admin_list_audit_log(integer)') is not null
     and not has_table_privilege('anon', 'public.admin_audit_log', 'SELECT')
     and not has_function_privilege('anon', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     and not has_function_privilege('authenticated', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     and not has_function_privilege('service_role', 'public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)', 'EXECUTE')
     and not has_function_privilege('anon', 'public.admin_list_audit_log(integer)', 'EXECUTE')
     and has_function_privilege('authenticated', 'public.admin_list_audit_log(integer)', 'EXECUTE')
    then 'OK'
    else 'FAIL'
  end as check_result;

select version, name, applied_at, notes
from public.mdz_schema_migrations
where version = '020';
