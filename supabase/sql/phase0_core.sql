-- ============================================================
-- MawashiDZ — Phase 0 core database primitives (v1.8.2)
-- Included by setup.sql and migrations. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- Public signup role whitelist (server-side only)
-- Allowed: buyer, breeder, vet, feed
-- All other values (admin, manager, partner, …) → buyer
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

-- ------------------------------------------------------------
-- Safe optional date parse for signup metadata
-- ------------------------------------------------------------
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
-- Role prefix helper (immutable, safe for indexes)
-- ------------------------------------------------------------
create or replace function public.mdz_role_prefix(member_role text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(trim(coalesce($1, '')))
    when 'breeder'    then 'F'
    when 'vet'        then 'V'
    when 'feed'       then 'S'
    when 'buyer'      then 'U'
    when 'manager'    then 'W'
    when 'ambassador' then 'B'
    when 'partner'    then 'P'
    else 'U'
  end;
$$;

revoke all on function public.mdz_role_prefix(text) from public;
grant execute on function public.mdz_role_prefix(text) to authenticated, service_role;

-- ------------------------------------------------------------
-- Algerian mobile normalization (+2135/6/7XXXXXXXX)
-- ------------------------------------------------------------
create or replace function public.normalize_algerian_phone(phone_input text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text;
begin
  if phone_input is null or trim(phone_input) = '' then
    return null;
  end if;

  digits := regexp_replace(phone_input, '[^0-9]', '', 'g');

  if digits ~ '^213[567]\d{8}$' then
    return '+' || digits;
  elsif digits ~ '^0[567]\d{8}$' then
    return '+213' || substring(digits from 2);
  elsif digits ~ '^[567]\d{8}$' then
    return '+213' || digits;
  end if;

  return null;
end;
$$;

revoke all on function public.normalize_algerian_phone(text) from public;
grant execute on function public.normalize_algerian_phone(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Sequential member ID allocation (concurrency-safe)
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

revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;

-- ------------------------------------------------------------
-- Assign member_id before auth.users insert (overwrites client values)
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
-- Sync counters from existing sequential member IDs
-- ------------------------------------------------------------
create or replace function public.sync_member_id_counters_from_profiles()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_id_counters (prefix, last_value)
  select
    substring(p.member_id from 5 for 1) as prefix,
    max(substring(p.member_id from 7)::bigint) as last_value
  from public.profiles p
  where p.member_id ~ '^MDZ-[A-Z]-[0-9]{6}$'
  group by 1
  on conflict (prefix) do update
  set last_value = greatest(public.member_id_counters.last_value, excluded.last_value);
end;
$$;

revoke all on function public.sync_member_id_counters_from_profiles() from public;
grant execute on function public.sync_member_id_counters_from_profiles() to service_role;

-- ------------------------------------------------------------
-- Resolve login identifier (email / phone / member_id)
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
  clean_value text := trim(lookup_value);
  clean_phone text;
begin
  if clean_value is null or clean_value = '' then
    return null;
  end if;

  if clean_value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return lower(clean_value);
  end if;

  clean_phone := public.normalize_algerian_phone(clean_value);

  select p.email into found_email
  from public.profiles p
  where upper(p.member_id) = upper(clean_value)
     or (clean_phone is not null and public.normalize_algerian_phone(p.phone) = clean_phone)
  order by p.created_at asc nulls last
  limit 1;

  return found_email;
end;
$$;

revoke all on function public.resolve_login_identifier(text) from public;
grant execute on function public.resolve_login_identifier(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Auto-create profile on auth.users insert
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
    new.id,
    assigned_member_id,
    nullif(trim(new.raw_user_meta_data ->> 'registration_id'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    public.normalize_algerian_phone(new.raw_user_meta_data ->> 'phone'),
    new.email,
    user_role,
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
