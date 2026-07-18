-- ============================================================
-- MawashiDZ — ترحيل توافقي مع قاعدة Supabase الحالية (v1.7.2)
-- شغّل هذا الملف كاملًا من: Supabase Dashboard → SQL Editor → Run
--
-- مهم: لا يعيد إنشاء الجداول الموجودة ولا يحذف بيانات.
-- يضيف فقط الأعمدة / الدوال / المحفّزات / السياسات الناقصة.
--
-- هيكل profiles المكتشَف حاليًا قبل هذا الترحيل:
--   id, full_name, phone, email, created_at
--   (بدون member_id — سبب ERROR 42703 في الإعداد السابق)
--
-- جداول موجودة مسبقًا وتُترك كما هي (لا تُمس):
--   breeders, farmers, sheep, user_roles, veterinarians, visits
--   registrations, contact_messages, feedback_tickets
-- ============================================================

-- ------------------------------------------------------------
-- 0) مساعد داخلي: إضافة عمود فقط إن كان غائبًا
-- ------------------------------------------------------------
create or replace function public._mdz_add_column_if_missing(
  p_table regclass,
  p_column text,
  p_type text,
  p_default text default null,
  p_not_null boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from pg_attribute a
    where a.attrelid = p_table
      and a.attname = p_column
      and a.attnum > 0
      and not a.attisdropped
  ) then
    return;
  end if;

  execute format(
    'alter table %s add column %I %s%s%s',
    p_table,
    p_column,
    p_type,
    case when p_default is not null then ' default ' || p_default else '' end,
    case when p_not_null then ' not null' else '' end
  );
end;
$$;

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

do $$
begin
  grant execute on function public.allocate_member_id(text) to anon, authenticated;
exception
  when undefined_object then null; -- أدوار Supabase غير موجودة خارج المنصة
end;
$$;

-- ------------------------------------------------------------
-- 2) الملفات الشخصية — ترقية الجدول الموجود دون إعادة إنشائه
--    موجود حاليًا: id, full_name, phone, email, created_at
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

-- أعمدة ناقصة على النسخة الحالية من profiles
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'member_id', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'registration_id', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'first_name', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'last_name', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'role', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'wilaya', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'daira', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'commune', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'birth_date', 'date');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'invite_code', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'invited_by', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'status', 'text', '''pending''', true);
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'full_name', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'phone', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'email', 'text');
select public._mdz_add_column_if_missing('public.profiles'::regclass, 'created_at', 'timestamptz', 'now()', true);

-- ضمان القيمة الافتراضية لـ status حتى لو كان العمود موجودًا مسبقًا بلا default
alter table public.profiles alter column status set default 'pending';
update public.profiles set status = 'pending' where status is null;

do $$
begin
  alter table public.profiles alter column status set not null;
exception
  when others then null;
end;
$$;

-- فهرس/قيد فريد لرقم العضوية (آمن إن وُجد مسبقًا؛ NULL مسموح متعددًا)
create unique index if not exists profiles_member_id_idx on public.profiles (member_id);
create index if not exists profiles_phone_idx on public.profiles (phone);

alter table public.profiles enable row level security;

do $$
begin
  drop policy if exists "profiles: self read" on public.profiles;
  create policy "profiles: self read"
    on public.profiles for select
    to authenticated
    using (id = (select auth.uid()));
exception
  when undefined_object then null;
end;
$$;

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
     or regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g')
        = regexp_replace(clean_value, '[^0-9+]', '', 'g')
  limit 1;

  return found_email;
end;
$$;

do $$
begin
  grant execute on function public.resolve_login_identifier(text) to anon, authenticated;
exception
  when undefined_object then null;
end;
$$;

-- ------------------------------------------------------------
-- 4) طلبات التسجيل — الجدول موجود؛ نضيف فقط ما ينقص
--    موجود حاليًا: id, full_name, phone, email, whatsapp, wilaya,
--    user_type, role, message, is_verified, privacy_accepted,
--    founding_terms_accepted, created_at, status, commune
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
  created_at timestamptz not null default now()
);

select public._mdz_add_column_if_missing('public.registrations'::regclass, 'full_name', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'phone', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'email', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'whatsapp', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'wilaya', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'user_type', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'role', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'message', 'text');
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'is_verified', 'boolean', 'false', true);
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'privacy_accepted', 'boolean', 'false', true);
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'founding_terms_accepted', 'boolean', 'false', true);
select public._mdz_add_column_if_missing('public.registrations'::regclass, 'created_at', 'timestamptz', 'now()', true);

-- فهارس فريدة اختيارية (تتجاهل التعارض إن وُجدت مسبقًا أو وُجدت بيانات مكررة)
do $$
begin
  create unique index if not exists registrations_email_uidx
    on public.registrations (email)
    where email is not null;
exception
  when others then null;
end;
$$;

do $$
begin
  create unique index if not exists registrations_phone_uidx
    on public.registrations (phone)
    where phone is not null;
exception
  when others then null;
end;
$$;

alter table public.registrations enable row level security;

do $$
begin
  drop policy if exists "registrations: public insert" on public.registrations;
  create policy "registrations: public insert"
    on public.registrations for insert
    to anon, authenticated
    with check (true);
exception
  when undefined_object then null;
end;
$$;

-- ------------------------------------------------------------
-- 5) رسائل التواصل وبلاغات الملاحظات — موجودة؛ نكمّل الناقص فقط
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  ticket_id text,
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

select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'ticket_id', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'full_name', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'phone', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'wilaya', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'daira', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'commune', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'request_type', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'message', 'text');
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'status', 'text', '''new''', true);
select public._mdz_add_column_if_missing('public.contact_messages'::regclass, 'created_at', 'timestamptz', 'now()', true);

do $$
begin
  create unique index if not exists contact_messages_ticket_id_uidx
    on public.contact_messages (ticket_id)
    where ticket_id is not null;
exception
  when others then null;
end;
$$;

alter table public.contact_messages enable row level security;

do $$
begin
  drop policy if exists "contact: public insert" on public.contact_messages;
  create policy "contact: public insert"
    on public.contact_messages for insert
    to anon, authenticated
    with check (true);
exception
  when undefined_object then null;
end;
$$;

create table if not exists public.feedback_tickets (
  id bigint generated always as identity primary key,
  ticket_id text,
  report_type text,
  full_name text,
  contact text,
  details text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'ticket_id', 'text');
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'report_type', 'text');
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'full_name', 'text');
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'contact', 'text');
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'details', 'text');
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'status', 'text', '''new''', true);
select public._mdz_add_column_if_missing('public.feedback_tickets'::regclass, 'created_at', 'timestamptz', 'now()', true);

do $$
begin
  create unique index if not exists feedback_tickets_ticket_id_uidx
    on public.feedback_tickets (ticket_id)
    where ticket_id is not null;
exception
  when others then null;
end;
$$;

alter table public.feedback_tickets enable row level security;

do $$
begin
  drop policy if exists "feedback: public insert" on public.feedback_tickets;
  create policy "feedback: public insert"
    on public.feedback_tickets for insert
    to anon, authenticated
    with check (true);
exception
  when undefined_object then null;
end;
$$;

-- تنظيف المساعد الداخلي (لا حاجة لتعرضه عبر API)
drop function if exists public._mdz_add_column_if_missing(regclass, text, text, text, boolean);

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
