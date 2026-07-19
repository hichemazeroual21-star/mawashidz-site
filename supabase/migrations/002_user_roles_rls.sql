-- ============================================================
-- MawashiDZ — تفعيل RLS على public.user_roles (v1.7.3)
-- شغّله من: Supabase Dashboard → SQL Editor → Run
-- آمن لإعادة التشغيل (idempotent).
--
-- يصلح تحذير Supabase: "RLS Disabled in Public — public.user_roles"
-- ============================================================

alter table public.user_roles enable row level security;

-- المستخدم المسجّل يرى أدواره الخاصة فقط (مثل founder).
drop policy if exists "user_roles: self read" on public.user_roles;
create policy "user_roles: self read"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

-- لا سياسات INSERT/UPDATE/DELETE للعموم:
-- إدارة الأدوار تتم عبر service_role أو SQL Editor فقط.
