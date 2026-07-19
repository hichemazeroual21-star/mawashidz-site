-- ============================================================
-- MawashiDZ — Secure member_id allocation (v1.8.2)
-- For databases that already ran Phase 0 with anon/authenticated grants.
-- Idempotent · safe to re-run · no data deletion.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Centralized signup metadata hardening helpers
-- ------------------------------------------------------------
create or replace function public.normalize_public_signup_role(member_role text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(trim(coalesce($1, '')))
    when 'buyer' then 'buyer'
    when 'breeder' then 'breeder'
    when 'vet' then 'vet'
    when 'feed' then 'feed'
    else 'buyer'
  end;
$$;

revoke all on function public.normalize_public_signup_role(text) from public;

create or replace function public.safe_metadata_date(date_input text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  clean text := nullif(trim(coalesce(date_input, '')), '');
begin
  if clean is null or clean !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return clean::date;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.safe_metadata_date(text) from public;

-- ------------------------------------------------------------
-- 2) allocate_member_id — whitelist role before prefix selection
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
  normalized_role text;
begin
  normalized_role := public.normalize_public_signup_role(member_role);
  role_prefix := public.mdz_role_prefix(normalized_role);
  perform pg_advisory_xact_lock(hashtext('mdz_member_id_' || role_prefix));
  insert into public.member_id_counters as c (prefix, last_value)
  values (role_prefix, 1)
  on conflict (prefix)
  do update set last_value = c.last_value + 1
  returning last_value into next_value;
  return 'MDZ-' || role_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

-- ------------------------------------------------------------
-- 3) BEFORE INSERT — overwrite client member_id / role / status
-- ------------------------------------------------------------
create or replace function public.assign_member_id_before_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text;
  assigned_member_id text;
begin
  normalized_role := public.normalize_public_signup_role(new.raw_user_meta_data ->> 'role');
  assigned_member_id := public.allocate_member_id(normalized_role);
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'member_id', assigned_member_id,
      'role', normalized_role,
      'status', 'pending'
    );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4) AFTER INSERT — create profile with server-only status
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  assigned_member_id text;
  assigned_birth_date date;
begin
  user_role := public.normalize_public_signup_role(new.raw_user_meta_data ->> 'role');
  assigned_member_id := nullif(trim(new.raw_user_meta_data ->> 'member_id'), '');
  if assigned_member_id is null or assigned_member_id !~ '^MDZ-[A-Z]-[0-9]{6}$' then
    assigned_member_id := public.allocate_member_id(user_role);
  end if;
  assigned_birth_date := public.safe_metadata_date(new.raw_user_meta_data ->> 'birth_date');
  insert into public.profiles (
    id, member_id, registration_id, full_name, first_name, last_name,
    phone, email, role, wilaya, daira, commune, birth_date,
    invite_code, invited_by, status
  ) values (
    new.id, assigned_member_id,
    nullif(trim(new.raw_user_meta_data ->> 'registration_id'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    public.normalize_algerian_phone(new.raw_user_meta_data ->> 'phone'),
    new.email, user_role,
    nullif(trim(new.raw_user_meta_data ->> 'wilaya'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'daira'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'commune'), ''),
    assigned_birth_date,
    nullif(trim(new.raw_user_meta_data ->> 'invite_code'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'invited_by'), ''),
    'pending'
  )
  on conflict (id) do update set
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
    status = public.profiles.status;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5) Triggers
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_assign_member_id on auth.users;
create trigger on_auth_user_assign_member_id
  before insert on auth.users
  for each row execute function public.assign_member_id_before_signup();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6) EXECUTE permissions — allocate_member_id is server-only
-- ------------------------------------------------------------
revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;

revoke all on function public.assign_member_id_before_signup() from public;
revoke all on function public.handle_new_user() from public;
