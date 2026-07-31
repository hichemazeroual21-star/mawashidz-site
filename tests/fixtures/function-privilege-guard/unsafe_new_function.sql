-- UNSAFE fixture: deliberately violates privilege + search_path policy.
-- Used by tests/migration-018-function-default-privileges.test.mjs
create or replace function public.mdz_fixture_unsafe(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  null;
end;
$$;
-- missing REVOKE ALL FROM PUBLIC
-- missing REVOKE EXECUTE FROM anon
grant execute on function public.mdz_fixture_unsafe(uuid) to authenticated;
