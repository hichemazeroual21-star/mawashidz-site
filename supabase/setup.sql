-- ============================================================
-- MawashiDZ — Fresh database setup (v1.8.0)
-- For NEW Supabase projects only.
-- Idempotent · safe to re-run · does not drop existing data.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Member ID counters
-- ------------------------------------------------------------
create table if not exists public.member_id_counters (
  prefix text primary key,
  last_value bigint not null default 0,
  constraint member_id_counters_last_value_nonneg check (last_value >= 0)
);

alter table public.member_id_counters enable row level security;
revoke all on table public.member_id_counters from public;
revoke all on table public.member_id_counters from anon, authenticated;

-- ------------------------------------------------------------
-- 2) Profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  member_id text,
  registration_id text,
  full_name text,
  first_name text,
  last_name text,
  phone text,
  email text,
  role text,
  wilaya text,
  daira text,
  commune text,
  birth_date date,
  invite_code text,
  invited_by text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

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

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles add column status text not null default 'pending';
  else
    alter table public.profiles alter column status set default 'pending';
    update public.profiles set status = 'pending' where status is null;
    alter table public.profiles alter column status set not null;
  end if;
end $$;

-- Core functions (same as phase0_core.sql)
create or replace function public.mdz_role_prefix(member_role text)
returns text language sql immutable set search_path = public as $$
  select case lower(trim(coalesce($1, '')))
    when 'breeder' then 'F' when 'vet' then 'V' when 'feed' then 'S'
    when 'buyer' then 'U' when 'manager' then 'W' when 'ambassador' then 'B'
    when 'partner' then 'P' else 'U' end;
$$;
revoke all on function public.mdz_role_prefix(text) from public;
grant execute on function public.mdz_role_prefix(text) to authenticated, service_role;

create or replace function public.normalize_algerian_phone(phone_input text)
returns text language plpgsql immutable set search_path = public as $$
declare digits text;
begin
  if phone_input is null or trim(phone_input) = '' then return null; end if;
  digits := regexp_replace(phone_input, '[^0-9]', '', 'g');
  if digits ~ '^213[567]\d{8}$' then return '+' || digits;
  elsif digits ~ '^0[567]\d{8}$' then return '+213' || substring(digits from 2);
  elsif digits ~ '^[567]\d{8}$' then return '+213' || digits;
  end if;
  return null;
end; $$;
revoke all on function public.normalize_algerian_phone(text) from public;
grant execute on function public.normalize_algerian_phone(text) to anon, authenticated, service_role;

create or replace function public.allocate_member_id(member_role text)
returns text language plpgsql security definer set search_path = public as $$
declare role_prefix text; next_value bigint;
begin
  role_prefix := public.mdz_role_prefix(member_role);
  perform pg_advisory_xact_lock(hashtext('mdz_member_id_' || role_prefix));
  insert into public.member_id_counters as c (prefix, last_value) values (role_prefix, 1)
  on conflict (prefix) do update set last_value = c.last_value + 1 returning last_value into next_value;
  return 'MDZ-' || role_prefix || '-' || lpad(next_value::text, 6, '0');
end; $$;
revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;

create or replace function public.assign_member_id_before_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_role text; assigned_member_id text;
begin
  user_role := nullif(trim(new.raw_user_meta_data ->> 'role'), '');
  assigned_member_id := public.allocate_member_id(coalesce(user_role, 'buyer'));
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('member_id', assigned_member_id);
  return new;
end; $$;

create or replace function public.sync_member_id_counters_from_profiles()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_id_counters (prefix, last_value)
  select substring(p.member_id from 5 for 1), max(substring(p.member_id from 7)::bigint)
  from public.profiles p where p.member_id ~ '^MDZ-[A-Z]-[0-9]{6}$' group by 1
  on conflict (prefix) do update set last_value = greatest(public.member_id_counters.last_value, excluded.last_value);
end; $$;
revoke all on function public.sync_member_id_counters_from_profiles() from public;
grant execute on function public.sync_member_id_counters_from_profiles() to service_role;

create or replace function public.resolve_login_identifier(lookup_value text)
returns text language plpgsql security definer set search_path = public stable as $$
declare found_email text; clean_value text := trim(lookup_value); clean_phone text;
begin
  if clean_value is null or clean_value = '' then return null; end if;
  if clean_value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return lower(clean_value); end if;
  clean_phone := public.normalize_algerian_phone(clean_value);
  select p.email into found_email from public.profiles p
  where upper(p.member_id) = upper(clean_value)
     or (clean_phone is not null and public.normalize_algerian_phone(p.phone) = clean_phone)
  order by p.created_at asc nulls last limit 1;
  return found_email;
end; $$;
revoke all on function public.resolve_login_identifier(text) from public;
grant execute on function public.resolve_login_identifier(text) to anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_role text; assigned_member_id text;
begin
  user_role := nullif(trim(new.raw_user_meta_data ->> 'role'), '');
  assigned_member_id := nullif(trim(new.raw_user_meta_data ->> 'member_id'), '');
  if assigned_member_id is null or assigned_member_id !~ '^MDZ-[A-Z]-[0-9]{6}$' then
    assigned_member_id := public.allocate_member_id(coalesce(user_role, 'buyer'));
  end if;
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
    nullif(trim(new.raw_user_meta_data ->> 'birth_date'), '')::date,
    nullif(trim(new.raw_user_meta_data ->> 'invite_code'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'invited_by'), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'status'), ''), 'pending')
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
    status = coalesce(public.profiles.status, excluded.status);
  return new;
end; $$;

drop index if exists public.profiles_member_id_idx;
create unique index if not exists profiles_member_id_unique_idx
  on public.profiles (member_id) where member_id is not null and btrim(member_id) <> '';
create index if not exists profiles_phone_idx on public.profiles (phone);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop trigger if exists on_auth_user_assign_member_id on auth.users;
create trigger on_auth_user_assign_member_id before insert on auth.users
  for each row execute function public.assign_member_id_before_signup();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3) Registrations
-- ------------------------------------------------------------
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  full_name text not null,
  phone text not null,
  email text,
  whatsapp text,
  wilaya text,
  user_type text,
  role text,
  message text,
  is_verified boolean not null default false,
  privacy_accepted boolean not null default false,
  founding_terms_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (email),
  unique (phone)
);

alter table public.registrations enable row level security;
drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert" on public.registrations for insert
  to anon, authenticated with check (true);

-- ------------------------------------------------------------
-- 4) Contact + feedback
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  ticket_id text unique,
  full_name text,
  phone text,
  wilaya text,
  daira text,
  commune text,
  request_type text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert" on public.contact_messages for insert
  to anon, authenticated with check (true);

create table if not exists public.feedback_tickets (
  id bigint generated always as identity primary key,
  ticket_id text unique,
  report_type text,
  full_name text,
  contact text,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.feedback_tickets enable row level security;
drop policy if exists "feedback: public insert" on public.feedback_tickets;
create policy "feedback: public insert" on public.feedback_tickets for insert
  to anon, authenticated with check (true);

-- ============================================================
-- Manual steps (Supabase Dashboard):
-- Auth → Emails → Confirm signup (Arabic template with member_id)
-- Auth → URL Configuration → Redirect URLs (https://mawashidz.com)
-- ============================================================
