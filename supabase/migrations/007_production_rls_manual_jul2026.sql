-- ============================================================
-- MawashiDZ — توثيق تغييرات RLS اليدوية على الإنتاج (2026-07-21/22)
--
-- ⚠️ على الإنتاج (fpjvjfgwbfehhcvdirpy): تم تطبيق هذا يدوياً في SQL Editor.
--    لا تشغّل هذا الملف على الإنتاج إلا للتحقق — العمليات idempotent.
--
-- السياق (لماذا وُجد هذا الملف):
--   - كانت سياسة legacy "Allow admin read" على public.registrations
--     بشرط USING (true) — فتح قراءة مباشر، بدون exists(user_roles).
--   - public.user_roles كان relrowsecurity = false (جدول مكشوف).
--   - التغييرات اليدوية أُزيلت السياسة الخطيرة ثم قُفل user_roles (002).
--   - قراءة اللوحات تُكمَل بـ 003 (خطوة منفصلة — ليست في هذا الملف).
--
-- ترتيب الإنتاج المتفق عليه: راجع DEPLOYMENT.md → «Production launch gate».
--
-- للبيئات الجديدة / staging: تشغيل آمن (idempotent).
-- ============================================================

-- 1) إزالة سياسة القراءة المفتوحة (كانت qual = true)
drop policy if exists "Allow admin read" on public.registrations;

-- 2) نفس منطق 002_user_roles_rls.sql — self-read للمستخدم المسجّل
drop policy if exists "user_roles: self read" on public.user_roles;
create policy "user_roles: self read"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.user_roles enable row level security;

-- تحقق (عمود واحد — مناسب للهاتف):
-- select c.relname || ' → rls=' || c.relrowsecurity as info
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relname in ('user_roles', 'registrations');
--
-- select policyname from pg_policies
-- where schemaname = 'public' and tablename = 'registrations' and cmd = 'SELECT';
-- (بعد 007 فقط: 0 سياسات SELECT حتى يُشغَّل 003)
