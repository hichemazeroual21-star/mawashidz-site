-- MawashiDZ — 019 live verification (preserve the raw row as evidence)
select
  has_function_privilege('public', 'public.resolve_login_identifier(text)', 'EXECUTE') as public_execute,
  has_function_privilege('anon', 'public.resolve_login_identifier(text)', 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', 'public.resolve_login_identifier(text)', 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', 'public.resolve_login_identifier(text)', 'EXECUTE') as service_role_execute,
  case
    when not has_function_privilege('public', 'public.resolve_login_identifier(text)', 'EXECUTE')
     and not has_function_privilege('anon', 'public.resolve_login_identifier(text)', 'EXECUTE')
     and not has_function_privilege('authenticated', 'public.resolve_login_identifier(text)', 'EXECUTE')
     and has_function_privilege('service_role', 'public.resolve_login_identifier(text)', 'EXECUTE')
    then 'OK'
    else 'FAIL'
  end as check_result;

select version, name, applied_at, notes
from public.mdz_schema_migrations
where version = '019';
