-- ============================================================
-- MawashiDZ — إصلاح فشل التسجيل على الإنتاج (2026-07-20)
-- حادثة: حساب يُنشأ لكن registrations لا يُدرَج + member_id فارغ
--
-- الأسباب:
--   1) أعمدة member_id / registration_id / daira غير موجودة → PGRST204
--   2) الواجهة كانت تستدعي allocate_member_id() — ممنوع أمنياً (Phase 0)
--
-- الحل الآمن:
--   - تخصيص member_id داخل handle_new_user (SECURITY DEFINER) فقط
--   - REVOKE EXECUTE من anon/authenticated — لا استدعاء من المتصفح
--
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- 1) أعمدة registrations الناقصة
alter table public.registrations add column if not exists member_id text;
alter table public.registrations add column if not exists registration_id text;
alter table public.registrations add column if not exists daira text;

create index if not exists registrations_member_id_idx on public.registrations (member_id);
create index if not exists registrations_registration_id_idx on public.registrations (registration_id);

update public.registrations r
set
  member_id = coalesce(r.member_id, nullif(r.message::jsonb ->> 'member_id', '')),
  registration_id = coalesce(r.registration_id, nullif(r.message::jsonb ->> 'registration_id', '')),
  daira = coalesce(r.daira, nullif(r.message::jsonb ->> 'daira', ''))
where r.message is not null
  and r.message ~ '^\s*\{'
  and (r.member_id is null or r.registration_id is null or r.daira is null);

-- 2) أمن: allocate_member_id للسيرفر فقط — يمنع استنزاف العداد من anon
revoke execute on function public.allocate_member_id(text) from anon, authenticated;
revoke execute on function public.allocate_member_id(text) from public;

-- 3) تخصيص member_id عند إنشاء الحساب (بدون RPC من الواجهة)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allocated_member_id text;
  user_role text;
begin
  user_role := nullif(new.raw_user_meta_data ->> 'role', '');
  allocated_member_id := coalesce(
    nullif(new.raw_user_meta_data ->> 'member_id', ''),
    public.allocate_member_id(coalesce(user_role, 'buyer'))
  );

  insert into public.profiles (
    id, member_id, registration_id, full_name, first_name, last_name,
    phone, email, role, wilaya, daira, commune, birth_date,
    invite_code, invited_by
  ) values (
    new.id,
    allocated_member_id,
    nullif(new.raw_user_meta_data ->> 'registration_id', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    user_role,
    nullif(new.raw_user_meta_data ->> 'wilaya', ''),
    nullif(new.raw_user_meta_data ->> 'daira', ''),
    nullif(new.raw_user_meta_data ->> 'commune', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'invite_code', ''),
    nullif(new.raw_user_meta_data ->> 'invited_by', '')
  )
  on conflict (id) do update set
    member_id = coalesce(public.profiles.member_id, excluded.member_id),
    registration_id = coalesce(public.profiles.registration_id, excluded.registration_id);

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('member_id', allocated_member_id)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) سياسة إدراج الطلبات (anon + authenticated)
alter table public.registrations enable row level security;

drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

-- 5) إصلاح Kamel Zas يدوياً (عدّل الإيميل إن لزم):
-- update public.profiles set member_id = 'MDZ-V-XXXXXX', registration_id = 'MDZ-REG-2026-059060', status = 'pending'
-- where email ilike '%kamel%' and member_id is null;
