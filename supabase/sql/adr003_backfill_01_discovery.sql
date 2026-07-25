-- ============================================================
-- ADR-003 backfill — 01 Discovery (READ ONLY)
-- Run in Supabase SQL Editor. No writes.
-- ============================================================

-- ---------------------------------------------------------------------------
-- GATE: هل حساب Founder/Admin الحالي يملك elevation منصة في user_roles؟
-- بدّل البريد إن لم يكن حساب الإنتاج.
-- ---------------------------------------------------------------------------
select
  p.id,
  p.email,
  p.full_name,
  p.role as profile_role,
  p.status,
  coalesce(
    array_agg(distinct ur.role order by ur.role) filter (where ur.role is not null),
    '{}'
  ) as user_roles,
  exists (
    select 1 from public.user_roles x
    where x.user_id = p.id
      and x.role in ('admin', 'founder', 'super_admin')
  ) as has_platform_admin
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
where lower(coalesce(p.email, '')) = lower('sadbenmoad7@gmail.com')
group by p.id, p.email, p.full_name, p.role, p.status;

-- أي صف منصة على الإطلاق؟ (حارس قفل جماعي)
select count(*)::int as platform_admin_rows
from public.user_roles
where role in ('admin', 'founder', 'super_admin');

-- ---------------------------------------------------------------------------
-- §1 عدد من لديهم profiles.role إداري ولاية
-- ---------------------------------------------------------------------------
select lower(btrim(role)) as profile_role, count(*)::int as n
from public.profiles
where lower(btrim(coalesce(role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
group by 1
order by n desc;

select count(*)::int as managers_by_profile_role_total
from public.profiles
where lower(btrim(coalesce(role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr');

-- ---------------------------------------------------------------------------
-- §2 من هم؟
-- ---------------------------------------------------------------------------
select
  p.id,
  p.email,
  p.full_name,
  p.member_id,
  p.wilaya,
  p.status,
  p.role as profile_role,
  p.created_at
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
order by p.created_at nulls last, p.email;

-- ---------------------------------------------------------------------------
-- §3 elevation ولاية / منصة الحالي في user_roles
-- ---------------------------------------------------------------------------
select ur.role, count(*)::int as n
from public.user_roles ur
where ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr', 'admin', 'founder', 'super_admin')
group by 1
order by n desc;

-- ---------------------------------------------------------------------------
-- §4 معاينة من سيُدرَجون في الـ backfill (لا كتابة)
-- شرط: profiles.role ولاية AND لا يوجد elevation ولاية مسبقاً
-- ---------------------------------------------------------------------------
select
  p.id,
  p.email,
  p.full_name,
  p.wilaya,
  p.role as profile_role,
  'wilaya_manager'::text as role_to_grant,
  exists (
    select 1 from public.user_roles x
    where x.user_id = p.id
      and x.role in ('admin', 'founder', 'super_admin')
  ) as already_platform_admin
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  )
order by p.email;

select count(*)::int as backfill_candidate_count
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  );
