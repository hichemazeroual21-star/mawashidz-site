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

-- 2) قيود unique (جزئية — تتجاهل القيم الفارغة)
create unique index if not exists registrations_phone_unique_idx
  on public.registrations (phone)
  where phone is not null and btrim(phone) <> '';

create unique index if not exists registrations_email_unique_idx
  on public.registrations (lower(email))
  where email is not null and btrim(email) <> '';

-- تحقق سريع بعد التشغيل:
-- select phone, count(*) from public.registrations group by phone having count(*) > 1;
-- select lower(email), count(*) from public.registrations group by lower(email) having count(*) > 1;
