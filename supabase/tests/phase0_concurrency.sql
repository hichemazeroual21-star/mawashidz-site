-- Concurrent member_id allocation stress test (100 parallel workers)
-- Invoked by run_phase0_tests.sh via GNU parallel / background psql.

create temporary table if not exists _alloc_results (
  id text primary key
) on commit preserve rows;

-- Single-session burst using dblink-like approach is heavy; instead we rely on
-- the shell harness. This file validates post-conditions after the shell burst.

do $$
declare
  v_total int;
  v_unique int;
  v_bad int;
begin
  select count(*), count(distinct member_id)
    into v_total, v_unique
  from public.profiles
  where member_id is not null;

  select count(*) into v_bad
  from public.profiles
  where member_id is not null
    and member_id !~ '^MDZ-[A-Z]-[0-9]{6}$';

  if v_bad > 0 then
    raise exception 'invalid member_id format rows: %', v_bad;
  end if;

  -- Uniqueness across profiles
  if v_total <> v_unique then
    raise exception 'member_id collisions in profiles: total=% unique=%', v_total, v_unique;
  end if;

  raise notice 'PHASE0_CONCURRENCY_POSTCHECK_OK total_profiles_with_ids=%', v_total;
end $$;
