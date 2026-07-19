-- ============================================================
-- MawashiDZ Phase 0 — Migration for EXISTING databases
-- Version: 1.8.0
--
-- Target (verified via REST API on 2026-07-18, project fpjvjfgwbfehhcvdirpy):
--   profiles:           id, full_name, phone, email, created_at
--                       (member_id and related columns MISSING)
--   registrations:      full set + status
--   contact_messages:   full set + email
--   feedback_tickets:   full set
--   breeders:           legacy table (untouched)
--   member_id_counters: MISSING
--   allocate_member_id / resolve_login_identifier / handle_new_user: MISSING
--
-- Guarantees:
--   - Idempotent (safe to re-run)
--   - No DROP TABLE / no data deletion
--   - No CREATE TABLE IF NOT EXISTS used alone to "update" profiles
--   - Columns added only via ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   - Does NOT modify Production automatically — run manually in SQL Editor
--
-- Rollback: supabase/rollbacks/20260718233000_phase0_existing_database_rollback.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) Extensions helpers (uuid if needed later)
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Sequential member ID counters (new table only)
-- ------------------------------------------------------------
create table if not exists public.member_id_counters (
  prefix text primary key,
  last_value bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint member_id_counters_prefix_chk check (prefix ~ '^[A-Z]$'),
  constraint member_id_counters_last_value_chk check (last_value >= 0)
);

alter table public.member_id_counters enable row level security;

-- No public policies: only security definer functions touch this table.
revoke all on table public.member_id_counters from public;
revoke all on table public.member_id_counters from anon, authenticated;

-- ------------------------------------------------------------
-- 2) Upgrade profiles — ADD missing columns only
-- ------------------------------------------------------------
alter table public.profiles add column if not exists member_id text;
alter table public.profiles add column if not exists registration_id text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists wilaya text;
alter table public.profiles add column if not exists daira text;
alter table public.profiles add column if not exists commune text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists invite_code text;
alter table public.profiles add column if not exists invited_by text;
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists updated_at timestamptz;

-- Backfill status / updated_at without wiping existing values
update public.profiles
set status = coalesce(nullif(status, ''), 'pending')
where status is null or status = '';

update public.profiles
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.profiles
  alter column status set default 'pending';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
      and is_nullable = 'YES'
  ) then
    alter table public.profiles alter column status set not null;
  end if;
end $$;

-- Format check (allows NULL for legacy rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_member_id_format_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_member_id_format_chk
      check (member_id is null or member_id ~ '^MDZ-[A-Z]-[0-9]{6}$');
  end if;
end $$;

create unique index if not exists profiles_member_id_uidx
  on public.profiles (member_id)
  where member_id is not null;

create index if not exists profiles_phone_idx on public.profiles (phone);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_wilaya_idx on public.profiles (wilaya);
create index if not exists profiles_status_idx on public.profiles (status);

alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- 3) Role normalization + prefix (canonical: public.mdz_role_prefix)
--
-- Frontend signup values verified in index.html (2026-07-19):
--   data-role / #roleInput / raw_user_meta_data.role =
--   breeder | vet | feed | buyer | manager | ambassador | partner
-- Aliases below are defense-in-depth only (NOT currently sent by signup).
-- ------------------------------------------------------------
create or replace function public.mdz_normalize_role(member_role text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(member_role, '')))
    -- Canonical frontend signup values (index.html tabs / roleInput)
    when 'breeder'    then 'breeder'
    when 'vet'        then 'vet'
    when 'feed'       then 'feed'
    when 'buyer'      then 'buyer'
    when 'manager'    then 'manager'
    when 'ambassador' then 'ambassador'
    when 'partner'    then 'partner'
    -- Display-only / legacy aliases seen in registrationRoleLabel()
    -- (not sent by current signup; mapped for safety)
    when 'rancher'        then 'breeder'
    when 'veterinarian'   then 'vet'
    when 'feed_trader'    then 'feed'
    when 'feed_seller'    then 'feed'
    when 'wilaya_manager' then 'manager'
    -- Extended platform roles (Phase 2 readiness)
    when 'founder'               then 'founder'
    when 'ceo'                   then 'ceo'
    when 'operations_manager'    then 'operations_manager'
    when 'national_admin'        then 'national_admin'
    when 'deputy_wilaya_manager' then 'deputy_wilaya_manager'
    when 'verification_officer'  then 'verification_officer'
    when 'support_agent'         then 'support_agent'
    when 'technical_admin'       then 'technical_admin'
    when 'printing_officer'      then 'printing_officer'
    when 'delivery_partner'      then 'delivery_partner'
    when 'charity_partner'       then 'charity_partner'
    when 'advisor'               then 'advisor'
    else 'buyer'
  end;
$$;

create or replace function public.mdz_role_prefix(member_role text)
returns text
language sql
immutable
as $$
  select case public.mdz_normalize_role(member_role)
    when 'breeder'               then 'F'
    when 'vet'                   then 'V'
    when 'feed'                  then 'S'
    when 'buyer'                 then 'U'
    when 'manager'               then 'W'
    when 'ambassador'            then 'B'
    when 'partner'               then 'P'
    when 'founder'               then 'A'
    when 'ceo'                   then 'A'
    when 'operations_manager'    then 'A'
    when 'national_admin'        then 'A'
    when 'deputy_wilaya_manager' then 'W'
    when 'verification_officer'  then 'R'
    when 'support_agent'         then 'T'
    when 'technical_admin'       then 'A'
    when 'printing_officer'      then 'R'
    when 'delivery_partner'      then 'P'
    when 'charity_partner'       then 'P'
    when 'advisor'               then 'P'
    else 'U'
  end;
$$;

-- Backward-compatible alias
create or replace function public.member_role_prefix(member_role text)
returns text
language sql
immutable
as $$
  select public.mdz_role_prefix(member_role);
$$;

revoke all on function public.mdz_normalize_role(text) from public;
revoke all on function public.mdz_role_prefix(text) from public;
revoke all on function public.member_role_prefix(text) from public;
grant execute on function public.mdz_normalize_role(text) to anon, authenticated;
grant execute on function public.mdz_role_prefix(text) to anon, authenticated;
grant execute on function public.member_role_prefix(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) allocate_member_id — concurrency-safe sequential IDs
--    Uses INSERT ... ON CONFLICT row lock (serializes per prefix).
--    Extra advisory xact lock as belt-and-suspenders under burst load.
--    NOT granted to anon/authenticated — only security definer callers
--    (handle_new_user) may allocate. Prevents anonymous counter exhaustion.
-- ------------------------------------------------------------
create or replace function public.allocate_member_id(member_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  role_prefix text;
  next_value bigint;
begin
  role_prefix := public.mdz_role_prefix(member_role);

  -- Serialize concurrent allocators for the same prefix inside this transaction
  perform pg_advisory_xact_lock(hashtextextended('mdz_member_id:' || role_prefix, 0));

  insert into public.member_id_counters as c (prefix, last_value, updated_at)
  values (role_prefix, 1, now())
  on conflict (prefix)
  do update set
    last_value = c.last_value + 1,
    updated_at = now()
  returning last_value into next_value;

  return 'MDZ-' || role_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;

-- ------------------------------------------------------------
-- 5) Sync counters from any pre-existing sequential member_ids
-- ------------------------------------------------------------
insert into public.member_id_counters (prefix, last_value, updated_at)
select
  substring(p.member_id from 5 for 1) as prefix,
  max(substring(p.member_id from 7)::bigint) as last_value,
  now()
from public.profiles p
where p.member_id ~ '^MDZ-[A-Z]-[0-9]{6}$'
group by substring(p.member_id from 5 for 1)
on conflict (prefix) do update
set
  last_value = greatest(public.member_id_counters.last_value, excluded.last_value),
  updated_at = now();

-- ------------------------------------------------------------
-- 6) resolve_login_identifier — email lookup by MDZ / phone
--    Returns email or NULL. Does not reveal whether phone vs MDZ matched.
-- ------------------------------------------------------------
create or replace function public.resolve_login_identifier(lookup_value text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  found_email text;
  clean_value text := trim(coalesce(lookup_value, ''));
  phone_digits text;
begin
  if clean_value = '' then
    return null;
  end if;

  -- Email passthrough (normalized)
  if position('@' in clean_value) > 0 then
    return lower(clean_value);
  end if;

  phone_digits := regexp_replace(clean_value, '[^0-9]', '', 'g');
  -- Normalize Algerian local forms: 05xxxxxxxx / 5xxxxxxxx / 2135xxxxxxxx → +2135...
  if phone_digits ~ '^0[567][0-9]{8}$' then
    phone_digits := '213' || substring(phone_digits from 2);
  elsif phone_digits ~ '^[567][0-9]{8}$' then
    phone_digits := '213' || phone_digits;
  end if;

  select p.email into found_email
  from public.profiles p
  where p.email is not null
    and (
      upper(p.member_id) = upper(clean_value)
      or regexp_replace(p.phone, '[^0-9]', '', 'g') = phone_digits
      or regexp_replace(p.phone, '[^0-9]', '', 'g') = '0' || substring(phone_digits from 4)
      or p.phone = clean_value
    )
  order by p.created_at asc nulls last
  limit 1;

  return found_email;
end;
$$;

revoke all on function public.resolve_login_identifier(text) from public;
grant execute on function public.resolve_login_identifier(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 7) handle_new_user — auto-create profile + authoritative member_id
--    HARDENING:
--      - Never trust client-provided member_id
--      - Never trust client-provided status (always 'pending')
--      - Always allocate member_id server-side from normalized role
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_member_id text;
  v_registration_id text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_wilaya text;
  v_daira text;
  v_commune text;
  v_birth_date date;
  v_invite_code text;
  v_invited_by text;
begin
  -- Normalize role; unknown values collapse to buyer (safe default).
  -- Client may send aliases; we store the canonical role only.
  v_role := public.mdz_normalize_role(new.raw_user_meta_data ->> 'role');

  -- INTENTIONALLY IGNORED from client metadata:
  --   member_id, status (and any elevation attempt)
  v_registration_id := nullif(trim(coalesce(new.raw_user_meta_data ->> 'registration_id', '')), '');
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_first_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  v_wilaya := nullif(trim(coalesce(new.raw_user_meta_data ->> 'wilaya', '')), '');
  v_daira := nullif(trim(coalesce(new.raw_user_meta_data ->> 'daira', '')), '');
  v_commune := nullif(trim(coalesce(new.raw_user_meta_data ->> 'commune', '')), '');
  v_invite_code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');
  v_invited_by := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invited_by', '')), '');

  begin
    v_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth_date := null;
  end;

  -- Server-side allocation only (client member_id discarded).
  v_member_id := public.allocate_member_id(v_role);

  insert into public.profiles (
    id, member_id, registration_id, full_name, first_name, last_name,
    phone, email, role, wilaya, daira, commune, birth_date,
    invite_code, invited_by, status, updated_at
  ) values (
    new.id,
    v_member_id,
    v_registration_id,
    v_full_name,
    v_first_name,
    v_last_name,
    v_phone,
    new.email,
    v_role,
    v_wilaya,
    v_daira,
    v_commune,
    v_birth_date,
    v_invite_code,
    v_invited_by,
    'pending',
    now()
  )
  on conflict (id) do update set
    -- Preserve existing non-null fields; fill gaps only
    member_id = coalesce(public.profiles.member_id, excluded.member_id),
    registration_id = coalesce(public.profiles.registration_id, excluded.registration_id),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    email = coalesce(public.profiles.email, excluded.email),
    role = coalesce(public.profiles.role, excluded.role),
    wilaya = coalesce(public.profiles.wilaya, excluded.wilaya),
    daira = coalesce(public.profiles.daira, excluded.daira),
    commune = coalesce(public.profiles.commune, excluded.commune),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    invite_code = coalesce(public.profiles.invite_code, excluded.invite_code),
    invited_by = coalesce(public.profiles.invited_by, excluded.invited_by),
    -- status is never taken from client; keep existing or pending
    status = coalesce(public.profiles.status, 'pending'),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 8) RLS policies — least privilege for public tables
-- ------------------------------------------------------------
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: self update limited" on public.profiles;
create policy "profiles: self update limited"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    -- member_id / role / status are not client-writable via this policy path;
    -- updates that change them are rejected by trigger below.
  );

create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '');
begin
  if tg_op = 'UPDATE' then
    -- service_role (Supabase dashboard / admin RPCs) may update status/role.
    -- member_id remains immutable even for service_role once assigned.
    if old.member_id is not null and new.member_id is distinct from old.member_id then
      raise exception 'member_id is immutable';
    end if;

    if jwt_role is distinct from 'service_role' then
      if old.role is not null and new.role is distinct from old.role then
        raise exception 'role cannot be changed from client';
      end if;
      if old.status is not null and new.status is distinct from old.status then
        raise exception 'status cannot be changed from client';
      end if;
    end if;

    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_sensitive_columns() from public;

drop trigger if exists trg_protect_profile_sensitive on public.profiles;
create trigger trg_protect_profile_sensitive
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_columns();

-- registrations / contact / feedback: public insert only (no select/update/delete for anon)
alter table public.registrations enable row level security;
drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

alter table public.contact_messages enable row level security;
drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

alter table public.feedback_tickets enable row level security;
drop policy if exists "feedback: public insert" on public.feedback_tickets;
create policy "feedback: public insert"
  on public.feedback_tickets for insert
  to anon, authenticated
  with check (true);

-- Legacy breeders: lock down if present (no public access)
do $$
begin
  if to_regclass('public.breeders') is not null then
    execute 'alter table public.breeders enable row level security';
    -- No policies → deny all for anon/authenticated via RLS
  end if;
end $$;

-- Table grants: remove broad PUBLIC access; keep insert where intended
revoke all on table public.profiles from public;
grant select, update on table public.profiles to authenticated;

revoke all on table public.registrations from public;
grant insert on table public.registrations to anon, authenticated;

revoke all on table public.contact_messages from public;
grant insert on table public.contact_messages to anon, authenticated;

revoke all on table public.feedback_tickets from public;
grant insert on table public.feedback_tickets to anon, authenticated;

commit;

-- ============================================================
-- Manual Supabase Dashboard steps (cannot be done via SQL):
-- 1) Auth → Emails → Confirm signup (Arabic template; see README)
-- 2) Auth → URL Configuration → Redirect URLs: https://mawashidz.com/**
-- 3) After running this file once, re-run it to confirm idempotency
-- ============================================================
