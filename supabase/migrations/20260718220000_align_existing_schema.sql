-- ============================================================
-- DEPRECATED — superseded by Phase 0 (v1.8.0)
-- Use instead:
--   migrations/20260718233000_phase0_existing_database.sql
--
-- Kept for git history only. Do not run on Production.
-- Original notes (v1.7.1):
--   profiles lacked member_id and related columns; functions missing.
-- ============================================================
-- Legacy body retained below for reference; prefer Phase 0 file.
-- ============================================================

-- ------------------------------------------------------------
-- 1) أرقام العضوية التسلسلية
-- ------------------------------------------------------------
create table if not exists public.member_id_counters (
  prefix text primary key,
  last_value bigint not null default 0
);

alter table public.member_id_counters enable row level security;

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
  role_prefix := case member_role
    when 'breeder'    then 'F'
    when 'vet'        then 'V'
    when 'feed'       then 'S'
    when 'buyer'      then 'U'
    when 'manager'    then 'W'
    when 'ambassador' then 'B'
    when 'partner'    then 'P'
    else 'U'
  end;

  insert into public.member_id_counters as c (prefix, last_value)
  values (role_prefix, 1)
  on conflict (prefix)
  do update set last_value = c.last_value + 1
  returning last_value into next_value;

  return 'MDZ-' || role_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

grant execute on function public.allocate_member_id(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) ترقية profiles — إضافة الأعمدة الناقصة فقط
--    الموجود حاليًا: id, full_name, phone, email, created_at
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
alter table public.profiles add column if not exists status text not null default 'pending';

create unique index if not exists profiles_member_id_idx on public.profiles (member_id);
create index if not exists profiles_phone_idx on public.profiles (phone);

alter table public.profiles enable row level security;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, member_id, registration_id, full_name, first_name, last_name,
    phone, email, role, wilaya, daira, commune, birth_date,
    invite_code, invited_by
  ) values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'member_id', ''),
    nullif(new.raw_user_meta_data ->> 'registration_id', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'wilaya', ''),
    nullif(new.raw_user_meta_data ->> 'daira', ''),
    nullif(new.raw_user_meta_data ->> 'commune', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'invite_code', ''),
    nullif(new.raw_user_meta_data ->> 'invited_by', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3) الدخول بالبريد أو الهاتف أو رقم العضوية MDZ
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
begin
  if clean_value is null or clean_value = '' then
    return null;
  end if;

  select p.email into found_email
  from public.profiles p
  where upper(p.member_id) = upper(clean_value)
     or regexp_replace(p.phone, '[^0-9+]', '', 'g') = regexp_replace(clean_value, '[^0-9+]', '', 'g')
  limit 1;

  return found_email;
end;
$$;

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) registrations — الجدول موجود؛ تأكيد RLS والسياسة فقط
-- ------------------------------------------------------------
alter table public.registrations enable row level security;

drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 5) contact_messages — الجدول موجود؛ تأكيد RLS والسياسة فقط
-- ------------------------------------------------------------
alter table public.contact_messages enable row level security;

drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 6) feedback_tickets — الجدول موجود؛ تأكيد RLS والسياسة فقط
-- ------------------------------------------------------------
alter table public.feedback_tickets enable row level security;

drop policy if exists "feedback: public insert" on public.feedback_tickets;
create policy "feedback: public insert"
  on public.feedback_tickets for insert
  to anon, authenticated
  with check (true);
