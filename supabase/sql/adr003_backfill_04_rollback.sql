-- ============================================================
-- ADR-003 backfill — 04 Rollback (WRITES)
-- Deletes ONLY user_roles rows created by a known batch_id.
-- Does NOT remove admin/founder/super_admin.
-- ============================================================

-- 1) اعرض الدفعات
select batch_id, count(*)::int as n, min(created_at), max(created_at)
from public.mdz_ops_backfill_log
where note like 'ADR-003%'
group by batch_id
order by max(created_at) desc;

-- 2) عيّن الدفعة ثم نفّذ (استبدل BATCH_ID)
-- begin;
--
-- delete from public.user_roles ur
-- using public.mdz_ops_backfill_log l
-- where l.batch_id = 'BATCH_ID'
--   and l.user_id = ur.user_id
--   and l.role_granted = ur.role
--   and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
--   and ur.role not in ('admin', 'founder', 'super_admin');
--
-- -- اختياري: الإبقاء على السجل للتدقيق أو وسمه
-- update public.mdz_ops_backfill_log
-- set note = coalesce(note, '') || ' | ROLLED_BACK'
-- where batch_id = 'BATCH_ID';
--
-- commit;

-- ---------------------------------------------------------------------------
-- اختياري: إن طُبّق 014 وتحتاج إعادة جسر profiles.role مؤقتاً
-- (انسخ من 012 — لا تشغّل إلا بقرار واعٍ)
-- ---------------------------------------------------------------------------
-- create or replace function public.mdz_is_wilaya_manager()
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path = public
-- as $$
--   select exists (
--     select 1 from public.user_roles ur
--     where ur.user_id = (select auth.uid())
--       and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
--   )
--   or exists (
--     select 1 from public.profiles p
--     where p.id = (select auth.uid())
--       and lower(coalesce(p.role, '')) in ('manager', 'wilaya_manager', 'wilaya_mgr')
--   );
-- $$;
