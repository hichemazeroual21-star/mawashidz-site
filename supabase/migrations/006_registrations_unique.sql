-- ============================================================
-- MawashiDZ — منع تكرار صفوف registrations على الإنتاج (2026-07-21)
--
-- الحادثة: إعادة إرسال نموذج التسجيل بنفس البريد/الهاتف كانت تُنشئ
-- صفًا جديدًا في registrations كل مرة (ورسالة إدارية جديدة عبر EmailJS)
-- لأن جدول الإنتاج القديم بلا قيود unique.
--
-- الحل:
--   1) حذف الصفوف المكررة (نُبقي الأقدم لكل هاتف/بريد)
--   2) فهارس unique جزئية على phone و lower(email)
--      — لا تُنشأ إن وُجد فهرس unique مكافئ باسم آخر (مثل الإنتاج:
--        registrations_phone_unique / registrations_email_unique_ci)
--
-- بعد التشغيل: إعادة الإرسال المكررة تعيد 409 → واجهة الموقع تعرض
-- رسالة "حساب أو طلب سابق" بدون إنشاء صف جديد.
--
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- 1) إزالة التكرارات — نحتفظ بأقدم صف (أصغر id)
delete from public.registrations a
using public.registrations b
where a.phone is not null
  and btrim(a.phone) <> ''
  and a.phone = b.phone
  and a.id > b.id;

delete from public.registrations a
using public.registrations b
where a.email is not null
  and btrim(a.email) <> ''
  and lower(a.email) = lower(b.email)
  and a.id > b.id;

-- 2) قيود unique (جزئية) — تُنشأ فقط إن لم يوجد فهرس unique مكافئ
do $$
begin
  if not exists (
    select 1
    from pg_index ix
    join pg_class tbl on tbl.oid = ix.indrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    join pg_attribute att on att.attrelid = tbl.oid
      and att.attnum = any(ix.indkey)
      and att.attnum > 0
    where ns.nspname = 'public'
      and tbl.relname = 'registrations'
      and ix.indisunique
      and att.attname = 'phone'
      and array_length(ix.indkey, 1) = 1
  ) then
    create unique index registrations_phone_unique_idx
      on public.registrations (phone)
      where phone is not null and btrim(phone) <> '';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'registrations'
      and indexdef ilike '%unique%'
      and (
        indexdef ilike '%(email)%'
        or indexdef ilike '%lower(email)%'
        or indexdef ilike '%lower((email)%'
      )
  ) then
    create unique index registrations_email_unique_idx
      on public.registrations (lower(email))
      where email is not null and btrim(email) <> '';
  end if;
end $$;

-- تحقق سريع بعد التشغيل:
-- select phone, count(*) from public.registrations
--   where phone is not null and btrim(phone) <> ''
--   group by phone having count(*) > 1;
-- select lower(email), count(*) from public.registrations
--   where email is not null and btrim(email) <> ''
--   group by lower(email) having count(*) > 1;
-- select indexname, indexdef from pg_indexes
--   where tablename = 'registrations' and schemaname = 'public';
