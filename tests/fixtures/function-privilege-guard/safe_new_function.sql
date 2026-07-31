-- SAFE fixture: explicit signature privileges + empty search_path.
create or replace function public.mdz_fixture_safe(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = p_id;
end;
$$;

revoke all on function public.mdz_fixture_safe(uuid) from public;
revoke execute on function public.mdz_fixture_safe(uuid) from anon;
revoke execute on function public.mdz_fixture_safe(uuid) from authenticated;
grant execute on function public.mdz_fixture_safe(uuid) to service_role;
