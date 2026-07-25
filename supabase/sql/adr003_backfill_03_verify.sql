-- ============================================================
-- ADR-003 backfill — 03 Verify (READ ONLY) — run AFTER apply, BEFORE migration 014
-- ============================================================

-- يجب أن يكون 0
select count(*)::int as managers_missing_elevation
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  );

-- محاكاة منطق mdz_is_wilaya_manager بعد 014 (user_roles فقط)
select
  p.id,
  p.email,
  p.role as profile_role,
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  ) as would_pass_post_014
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
order by would_pass_post_014 asc, p.email;

-- GATE مجدداً: حسابك
select
  p.email,
  exists (
    select 1 from public.user_roles x
    where x.user_id = p.id
      and x.role in ('admin', 'founder', 'super_admin')
  ) as has_platform_admin,
  coalesce(
    array_agg(distinct ur.role order by ur.role) filter (where ur.role is not null),
    '{}'
  ) as user_roles
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
where lower(coalesce(p.email, '')) = lower('sadbenmoad7@gmail.com')
group by p.id, p.email;

-- آخر دفعات السجل
select batch_id, count(*)::int as n, min(created_at) as first_at, max(created_at) as last_at
from public.mdz_ops_backfill_log
where note like 'ADR-003%'
group by batch_id
order by max(created_at) desc
limit 5;
