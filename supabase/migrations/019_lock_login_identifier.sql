-- MawashiDZ — 019 Lock login identifier resolver behind the Worker
-- Apply only after /api/auth/login and /api/auth/recover are deployed.
-- The browser must never receive the resolved email address.

begin;

do $$
begin
  if to_regprocedure('public.resolve_login_identifier(text)') is null then
    raise exception '019 abort: public.resolve_login_identifier(text) is missing';
  end if;
end;
$$;

revoke all on function public.resolve_login_identifier(text) from public;
revoke execute on function public.resolve_login_identifier(text) from anon;
revoke execute on function public.resolve_login_identifier(text) from authenticated;
grant execute on function public.resolve_login_identifier(text) to service_role;

do $$
begin
  if has_function_privilege('public', 'public.resolve_login_identifier(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.resolve_login_identifier(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.resolve_login_identifier(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.resolve_login_identifier(text)', 'EXECUTE')
  then
    raise exception '019 abort: resolver privilege post-condition failed';
  end if;

  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      ('019', 'lock_login_identifier',
       'Resolver callable only by service_role; browser cut over to rate-limited Worker auth endpoints.')
    on conflict (version) do update set
      name = excluded.name,
      notes = excluded.notes;
  end if;
end;
$$;

commit;
