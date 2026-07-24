-- ============================================================
-- MawashiDZ — إصلاح contact_messages.wilaya_name (إنتاج)
--
-- الخطأ الحي (مُثبت عبر REST insert):
--   code 42703: record "new" has no field "wilaya_name"
--
-- السبب: محفّز قديم يقرأ/يكتب NEW.wilaya_name بينما العمود غير موجود.
-- الأثر: نموذج «تواصل معنا» يفشل بالكامل (toast فشل + لا صف في القاعدة).
--
-- الحل: إضافة العمود + استبدال المحفّز بنسخة آمنة متزامنة مع wilaya.
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

alter table public.contact_messages
  add column if not exists wilaya_name text;

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
  for each row
  execute function public.contact_messages_sync_wilaya_name();

-- تأكيد سياسة الإدراج العامة (نموذج التواصل من الواجهة)
alter table public.contact_messages enable row level security;

drop policy if exists "contact: public insert" on public.contact_messages;
create policy "contact: public insert"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);
