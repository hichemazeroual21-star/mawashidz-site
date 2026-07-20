-- ============================================================
-- MawashiDZ — إصلاح فشل التسجيل على الإنتاج (2026-07-20)
-- حادثة: حساب يُنشأ لكن registrations لا يُدرَج + member_id فارغ
--
-- الأسباب المكتشفة:
--   1) أعمدة member_id / registration_id / daira غير موجودة → PGRST204
--   2) GRANT EXECUTE على allocate_member_id مفقود → 42501
--
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- 1) أعمدة registrations الناقصة (من 001 — قد لا تكون مُشغّلة على الإنتاج)
alter table public.registrations add column if not exists member_id text;
alter table public.registrations add column if not exists registration_id text;
alter table public.registrations add column if not exists daira text;

create index if not exists registrations_member_id_idx on public.registrations (member_id);
create index if not exists registrations_registration_id_idx on public.registrations (registration_id);

-- استرجاع من message JSON للصفوف القديمة
update public.registrations r
set
  member_id = coalesce(r.member_id, nullif(r.message::jsonb ->> 'member_id', '')),
  registration_id = coalesce(r.registration_id, nullif(r.message::jsonb ->> 'registration_id', '')),
  daira = coalesce(r.daira, nullif(r.message::jsonb ->> 'daira', ''))
where r.message is not null
  and r.message ~ '^\s*\{'
  and (r.member_id is null or r.registration_id is null or r.daira is null);

-- 2) صلاحية تخصيص رقم العضوية من الواجهة
grant execute on function public.allocate_member_id(text) to anon, authenticated;

-- 3) سياسة إدراج الطلبات (anon + authenticated)
alter table public.registrations enable row level security;

drop policy if exists "registrations: public insert" on public.registrations;
create policy "registrations: public insert"
  on public.registrations for insert
  to anon, authenticated
  with check (true);

-- 4) إصلاح Kamel Zas يدوياً (عدّل الإيميل إن لزم):
-- update public.profiles set member_id = 'MDZ-V-XXXXXX', registration_id = 'MDZ-REG-2026-059060', status = 'pending'
-- where email ilike '%kamel%' and member_id is null;
