-- MawashiDZ — سياسات قراءة لوحات المدير والإدارة (v1.10.0)
-- شغّله بعد 001 و 002. آمن لإعادة التشغيل.

-- مدير الولاية: قراءة طلبات التسجيل في ولايته فقط
drop policy if exists "registrations: manager read wilaya" on public.registrations;
create policy "registrations: manager read wilaya"
  on public.registrations for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.user_id = (select auth.uid())
        and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
        and registrations.wilaya = p.wilaya
    )
  );

-- الإدارة: قراءة كل طلبات التسجيل
drop policy if exists "registrations: admin read" on public.registrations;
create policy "registrations: admin read"
  on public.registrations for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin', 'founder', 'super_admin')
    )
  );
