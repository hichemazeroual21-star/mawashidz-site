-- ============================================================
-- MawashiDZ — 018 verify / live evidence (Owner SQL Editor)
-- Run BEFORE apply (baseline) and AFTER apply (acceptance).
-- Preserve raw outputs. Migration 017 must remain untouched.
--
-- Acceptance (under package control):
--   • postgres default ACL for functions in public does NOT grant
--     EXECUTE to PUBLIC, anon, or authenticated.
--   • Probe function created AFTER 018 does not inherit EXECUTE for
--     PUBLIC / anon / authenticated.
--   • Ledger row version = '018' present when mdz_schema_migrations exists.
--
-- NOT acceptance:
--   "Every row in pg_default_acl has no anon/authenticated grants"
--   — supabase_admin residual may remain unchanged.
-- ============================================================

-- ------------------------------------------------------------
-- E1) Function owners (public)
-- ------------------------------------------------------------
select
  n.nspname,
  p.proname,
  pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- ------------------------------------------------------------
-- E2) Default ACL rows (functions)
-- ------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as owner,
  n.nspname as schema_name,
  d.defaclobjtype,
  d.defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclobjtype = 'f'
order by owner, schema_name;

-- ------------------------------------------------------------
-- E3) Expanded default ACL (aclexplode) — supporting evidence
-- ------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as owner,
  coalesce(n.nspname, '<global>') as schema_name,
  coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
  a.privilege_type,
  a.is_grantable
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(coalesce(d.defaclacl, '{}'::aclitem[]))
  as a(grantor, grantee, privilege_type, is_grantable)
where d.defaclobjtype = 'f'
  and a.privilege_type = 'EXECUTE'
order by owner, schema_name, grantee;

-- ------------------------------------------------------------
-- E4) Package control check — postgres/public defaults
-- ------------------------------------------------------------
with postgres_public_fn as (
  select d.defaclacl
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  where d.defaclobjtype = 'f'
    and n.nspname = 'public'
    and pg_get_userbyid(d.defaclrole) = 'postgres'
  limit 1
),
exploded as (
  select
    coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
    a.privilege_type
  from postgres_public_fn p
  cross join lateral aclexplode(coalesce(p.defaclacl, '{}'::aclitem[]))
    as a(grantor, grantee, privilege_type, is_grantable)
  where a.privilege_type = 'EXECUTE'
)
select
  case
    when not exists (
      select 1 from exploded e
      where e.grantee in ('PUBLIC', 'anon', 'authenticated')
    )
    then 'OK'
    else 'FAIL postgres default still grants EXECUTE to PUBLIC/anon/authenticated'
  end as check_result,
  (select count(*) from exploded) as execute_grant_rows;

-- ------------------------------------------------------------
-- E5) Residual — supabase_admin (informational; not FAIL)
-- ------------------------------------------------------------
select
  'RESIDUAL' as kind,
  pg_get_userbyid(d.defaclrole) as owner,
  coalesce(n.nspname, '<global>') as schema_name,
  d.defaclacl,
  'Document only — outside 018 control; do not treat as package failure' as note
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclobjtype = 'f'
  and pg_get_userbyid(d.defaclrole) = 'supabase_admin';

-- ------------------------------------------------------------
-- E6) Ledger
-- ------------------------------------------------------------
select version, name, applied_at, notes
from public.mdz_schema_migrations
where version in ('015', '017', '018')
order by version;

-- ------------------------------------------------------------
-- E7) Transaction-scoped probe (AFTER 018 apply)
--     Proves a newly created function does not auto-grant EXECUTE
--     to PUBLIC / anon / authenticated. Rolled back — no leftover.
-- ------------------------------------------------------------
begin;

create function public.mdz018_probe_default_privs()
returns text
language sql
stable
as $$ select 'probe'::text $$;

select
  'probe' as kind,
  has_function_privilege('public', 'public.mdz018_probe_default_privs()', 'EXECUTE')
    as public_execute,
  has_function_privilege('anon', 'public.mdz018_probe_default_privs()', 'EXECUTE')
    as anon_execute,
  has_function_privilege('authenticated', 'public.mdz018_probe_default_privs()', 'EXECUTE')
    as authenticated_execute,
  case
    when not has_function_privilege('public', 'public.mdz018_probe_default_privs()', 'EXECUTE')
     and not has_function_privilege('anon', 'public.mdz018_probe_default_privs()', 'EXECUTE')
     and not has_function_privilege(
           'authenticated',
           'public.mdz018_probe_default_privs()',
           'EXECUTE'
         )
    then 'OK'
    else 'FAIL probe inherited client EXECUTE — defaults not effective for creator role'
  end as check_result;

-- Supporting aclexplode on the probe itself
select
  coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
  a.privilege_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner)))
  as a(grantor, grantee, privilege_type, is_grantable)
where n.nspname = 'public'
  and p.proname = 'mdz018_probe_default_privs'
  and a.privilege_type = 'EXECUTE'
order by 1;

rollback;
-- Probe removed by rollback.

-- ============================================================
-- Expected AFTER 018 (creator = postgres):
--   E4 check_result = OK
--   E7 check_result = OK (all three execute flags false)
--   E5 may still show supabase_admin residual (informational)
--   E6 includes version 018
-- ============================================================
