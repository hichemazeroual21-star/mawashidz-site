-- ============================================================
-- MawashiDZ — ترحيل متوافق مع قاعدة بيانات موجودة (v1.7.2)
-- شغّله من: Supabase Dashboard → SQL Editor → Run
--
-- لا يُعيد إنشاء الجداول الموجودة. يضيف الأعمدة/الدوال/المحفّزات/
-- السياسات الناقصة فقط (idempotent).
--
-- تم اكتشاف البنية الحالية عبر REST (2026-07-19):
--   profiles         — كامل (member_id, registration_id موجودان)
--   registrations    — ينقصه member_id, registration_id
--   contact_messages — ينقصه wilaya_name (محفّز قديم يشير إليه)
--   feedback_tickets — كامل
--   member_id_counters — موجود (بدون SELECT عام، وهذا صحيح)
--   allocate_member_id — موجود لكن بدون GRANT EXECUTE لـ anon
-- ============================================================

-- ------------------------------------------------------------
-- 1) عدّادات أرقام العضوية (إن لم تكن موجودة)
-- ------------------------------------------------------------
create table if not exists public.member_id_counters (
  prefix text primary key,
  last_value bigint not null default 0
);

alter table public.member_id_counters enable row level security;
-- لا سياسات عامة: يُعدَّل فقط عبر allocate_member_id (security definer).

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

-- ⚠️ تحذير: هذا GRANT يُلغى في 004_fix_registration_production.sql (سطر 35–36).
-- تشغيل 001 وحده على قاعدة جديدة ثم التوقف يترك allocate_member_id() قابلاً
-- للاستدعاء من anon/authenticated — ثغرة أمنية (Phase 0). أكمل دائمًا حتى 004.
grant execute on function public.allocate_member_id(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) profiles — أعمدة ناقصة فقط (الجدول موجود مسبقًا)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists member_id text;
alter table public.profiles add column if not exists registration_id text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists wilaya text;
alter table public.profiles add column if not exists daira text;
alter table public.profiles add column if not exists commune text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists invite_code text;
alter table public.profiles add column if not exists invited_by text;
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_member_id_key on public.profiles (member_id)
  where member_id is not null;
create index if not exists profiles_member_id_idx on public.profiles (member_id);
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
-- 3) resolve_login_identifier — يعتمد على profiles.member_id
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
-- 4) registrations — أعمدة ناقصة (الجدول موجود ببنية مختلفة)
-- ------------------------------------------------------------
alter table public.registrations add column if not exists member_id text;
alter table public.registrations add column if not exists registration_id text;
alter table public.registrations add column if not exists daira text;

create index if not exists registrations_member_id_idx on public.registrations (member_id);
create index if not exists registrations_registration_id_idx on public.registrations (registration_id);

-- استرجاع القيم المخزّنة سابقًا داخل message (JSON)
update public.registrations r
set
  member_id = coalesce(r.member_id, nullif(r.message::jsonb ->> 'member_id', '')),
  registration_id = coalesce(r.registration_id, nullif(r.message::jsonb ->> 'registration_id', ''))
where r.message is not null
  and r.message ~ '^\s*\{'
  and (r.member_id is null or r.registration_id is null);

alter table public.registrations enable row level security;

drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 5) contact_messages — إصلاح محفّز قديم يشير إلى wilaya_name
-- ------------------------------------------------------------
alter table public.contact_messages add column if not exists wilaya_name text;

create or replace function public.contact_messages_sync_wilaya_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.wilaya_name is null and new.wilaya is not null then
    new.wilaya_name := new.wilaya;
  end if;
  return new;
end;
$$;

drop trigger if exists contact_messages_sync_wilaya_name on public.contact_messages;
create trigger contact_messages_sync_wilaya_name
  before insert or update on public.contact_messages
  for each row execute function public.contact_messages_sync_wilaya_name();

alter table public.contact_messages enable row level security;

drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 6) feedback_tickets — سياسات الإدراج فقط
-- ------------------------------------------------------------
alter table public.feedback_tickets enable row level security;

drop policy if exists "feedback: public insert" on public.feedback_tickets;
create policy "feedback: public insert"
  on public.feedback_tickets for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 7) user_roles — تفعيل RLS (جدول أدوار إدارية داخلية)
-- ------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "user_roles: self read" on public.user_roles;
create policy "user_roles: self read"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

-- لا سياسات كتابة عامة: الإدارة عبر service_role أو SQL Editor فقط.

-- ============================================================
-- بعد التشغيل: تحقق محليًا (اختياري)
--   node supabase/introspect.mjs
--   node supabase/probe-columns.mjs
-- ============================================================
