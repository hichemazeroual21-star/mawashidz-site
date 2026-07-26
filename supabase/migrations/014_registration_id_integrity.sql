-- ============================================================
-- MawashiDZ — registration_id integrity (backfill + server default)
--
-- Problem: some pending registrations have NULL/blank registration_id,
-- so admin/manager dashboards hide approve/reject (client gate is correct).
--
-- This migration (idempotent, safe to re-run):
--   1) Backfill from message::jsonb ->> 'registration_id' when valid (004 pattern)
--   2) Generate MDZ-REG-YYYY-NNNNNN for remaining real pending rows
--      (excludes test/probe/e2e/example.com/.local emails)
--   3) BEFORE INSERT trigger assigns registration_id when the client omits it
--
-- Does NOT change review UI hide-when-missing logic.
-- Does NOT auto-apply on production — Founder runs manually after review.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: next registration_id (server-side)
-- ------------------------------------------------------------
create sequence if not exists public.mdz_registration_id_seq;

create or replace function public.mdz_next_registration_id(p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y text;
  n bigint;
begin
  y := to_char(coalesce(p_at, now()) at time zone 'utc', 'YYYY');
  n := nextval('public.mdz_registration_id_seq');
  return 'MDZ-REG-' || y || '-' || lpad(n::text, 6, '0');
end;
$$;

revoke all on function public.mdz_next_registration_id(timestamptz) from public;
revoke all on function public.mdz_next_registration_id(timestamptz) from anon, authenticated;
grant execute on function public.mdz_next_registration_id(timestamptz) to service_role;

-- Seed sequence above any existing numeric suffixes (idempotent floor)
do $$
declare
  max_n bigint;
  cur bigint;
begin
  select coalesce(max((regexp_match(registration_id, '^MDZ-REG-[0-9]{4}-([0-9]+)$'))[1]::bigint), 0)
    into max_n
  from public.registrations
  where registration_id ~ '^MDZ-REG-[0-9]{4}-[0-9]+$';

  cur := greatest(max_n, 0);
  perform setval(
    'public.mdz_registration_id_seq',
    cur,
    true  -- next nextval() returns cur+1
  );
end;
$$;

-- ------------------------------------------------------------
-- Test-row predicate (email-based exclusions from brief)
-- ------------------------------------------------------------
create or replace function public.mdz_is_test_registration_email(p_email text)
returns boolean
language sql
immutable
as $$
  select
    p_email is not null
    and btrim(p_email) <> ''
    and lower(p_email) ~ '(example\.com|\.local\b|probe|e2e)';
$$;

revoke all on function public.mdz_is_test_registration_email(text) from public;
grant execute on function public.mdz_is_test_registration_email(text) to service_role;

-- ------------------------------------------------------------
-- 1) Backfill from message JSON (same idea as migration 004)
-- ------------------------------------------------------------
update public.registrations r
set registration_id = nullif(btrim(r.message::jsonb ->> 'registration_id'), '')
where nullif(btrim(coalesce(r.registration_id, '')), '') is null
  and r.message is not null
  and r.message ~ '^\s*\{'
  and nullif(btrim(coalesce(r.message::jsonb ->> 'registration_id', '')), '') is not null
  and nullif(btrim(coalesce(r.message::jsonb ->> 'registration_id', '')), '') ~ '^MDZ-REG-'
  and not public.mdz_is_test_registration_email(r.email);

-- ------------------------------------------------------------
-- 2) Generate for remaining real pending rows still missing an id
-- ------------------------------------------------------------
do $$
declare
  rec record;
  candidate text;
  attempts int;
begin
  for rec in
    select r.id, r.created_at
    from public.registrations r
    where nullif(btrim(coalesce(r.registration_id, '')), '') is null
      and lower(coalesce(r.status, 'pending')) in ('pending', 'new', '')
      and not public.mdz_is_test_registration_email(r.email)
    order by r.id
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;
      candidate := public.mdz_next_registration_id(rec.created_at);
      exit when not exists (
        select 1 from public.registrations x
        where x.registration_id = candidate
      );
      exit when attempts >= 20; -- safety
    end loop;

    update public.registrations
    set registration_id = candidate
    where id = rec.id
      and nullif(btrim(coalesce(registration_id, '')), '') is null;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3) BEFORE INSERT: assign when client omits registration_id
-- ------------------------------------------------------------
create or replace function public.mdz_registrations_assign_registration_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_msg text;
  candidate text;
  attempts int := 0;
begin
  if nullif(btrim(coalesce(new.registration_id, '')), '') is not null then
    return new;
  end if;

  -- Prefer client-embedded id in message JSON when present
  if new.message is not null and new.message ~ '^\s*\{' then
    begin
      from_msg := nullif(btrim(coalesce(new.message::jsonb ->> 'registration_id', '')), '');
    exception when others then
      from_msg := null;
    end;
    if from_msg is not null and from_msg ~ '^MDZ-REG-' then
      new.registration_id := from_msg;
      return new;
    end if;
  end if;

  loop
    attempts := attempts + 1;
    candidate := public.mdz_next_registration_id(coalesce(new.created_at, now()));
    exit when not exists (
      select 1 from public.registrations x where x.registration_id = candidate
    );
    exit when attempts >= 20;
  end loop;

  new.registration_id := candidate;
  return new;
end;
$$;

drop trigger if exists mdz_registrations_assign_registration_id on public.registrations;
create trigger mdz_registrations_assign_registration_id
  before insert on public.registrations
  for each row execute function public.mdz_registrations_assign_registration_id();

revoke all on function public.mdz_registrations_assign_registration_id() from public;

-- Unique when set (non-blank) — skip create if conflicting duplicates remain
do $$
begin
  if not exists (
    select 1
    from public.registrations
    where nullif(btrim(registration_id), '') is not null
    group by registration_id
    having count(*) > 1
  ) then
    create unique index if not exists registrations_registration_id_uidx
      on public.registrations (registration_id)
      where registration_id is not null and btrim(registration_id) <> '';
  end if;
end;
$$;
