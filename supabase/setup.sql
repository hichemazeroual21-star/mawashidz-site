-- ============================================================
-- MawashiDZ — ملف إعداد قاعدة بيانات Supabase (v1.7.1)
-- شغّل هذا الملف كاملًا من: Supabase Dashboard → SQL Editor → Run
-- الملف آمن لإعادة التشغيل (idempotent) ولا يحذف بيانات موجودة.
-- ============================================================

-- ------------------------------------------------------------
-- 1) أرقام العضوية التسلسلية الدائمة: MDZ-F-000001 ...
--    F=موال، V=بيطري، S=تاجر أعلاف، U=مشتري، W=مدير ولاية،
--    B=سفير، P=شريك
-- ------------------------------------------------------------
create table if not exists public.member_id_counters (
  prefix text primary key,
  last_value bigint not null default 0
);

alter table public.member_id_counters enable row level security;
-- لا سياسات عامة: الجدول يُعدَّل فقط عبر الدالة أدناه (security definer).

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
-- 2) جدول الملفات الشخصية (يُنشأ تلقائيًا عند كل تسجيل Auth)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  member_id text unique,
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

create index if not exists profiles_member_id_idx on public.profiles (member_id);
create index if not exists profiles_phone_idx on public.profiles (phone);

alter table public.profiles enable row level security;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- إنشاء الملف الشخصي تلقائيًا من بيانات التسجيل (user_metadata)
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
-- 4) طلبات التسجيل (النسخة الكاملة للمراجعة الإدارية)
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
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

-- ------------------------------------------------------------
-- 5) رسائل التواصل وبلاغات الملاحظات
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
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

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
create policy "feedback: public insert"
  on public.feedback_tickets for insert
  to anon, authenticated
  with check (true);

-- ============================================================
-- خطوات يدوية متبقية داخل لوحة Supabase (لا يمكن تنفيذها بـ SQL):
--
-- أ) Auth → Emails → Confirm signup: استبدل القالب بقالب عربي، مثال:
--
--    Subject: أكد بريدك لتفعيل حسابك في MawashiDZ
--
--    <h2>مرحبًا {{ .Data.first_name }}،</h2>
--    <p>يسعدنا انضمامك إلى MawashiDZ بصفة: <b>{{ .Data.role_label }}</b>.</p>
--    <p>رقم عضويتك: <b>{{ .Data.member_id }}</b><br>
--       رقم متابعة الطلب: <b>{{ .Data.registration_id }}</b></p>
--    <p><a href="{{ .ConfirmationURL }}">اضغط هنا لتأكيد بريدك وتفعيل الدخول</a></p>
--    <p>احتفظ برقم الطلب للمتابعة. فريق MawashiDZ</p>
--
-- ب) Auth → URL Configuration: أضف https://mawashidz.com ضمن Redirect URLs
--    (مطلوب لرابط استرجاع كلمة المرور).
-- ============================================================
