-- ============================================================
-- MawashiDZ — 018 verify / live evidence (Owner SQL Editor)
-- Run BEFORE re-apply/fix and AFTER corrected 018 apply.
-- Preserve raw outputs. Migration 017 must remain untouched.
--
-- ROOT CAUSE (false prior acceptance):
--   ALTER DEFAULT PRIVILEGES … IN SCHEMA public REVOKE EXECUTE …
--   does NOT remove hardwired PUBLIC EXECUTE (PG: per-schema defaults
--   only add privileges). Correct form is GLOBAL (no IN SCHEMA).
--
-- Acceptance (under package control):
--   • GLOBAL postgres default ACL (defaclnamespace = 0) exists and does
--     NOT grant EXECUTE to PUBLIC, anon, or authenticated.
--   • Probe created AFTER corrected 018: has_function_privilege for
--     public/anon/authenticated = false (primary E7).
--   • Ledger row version = '018' present when mdz_schema_migrations exists.
--
-- NOT acceptance:
--   "Every row in pg_default_acl has no anon/authenticated grants"
--   — other roles (e.g. supabase_admin) may remain residual.
-- ============================================================

-- ------------------------------------------------------------
-- E0) Execution context
-- ------------------------------------------------------------
select
  current_database() as database,
  session_user,
  current_user,
  current_setting('role', true) as role_setting;

-- ------------------------------------------------------------
-- E1) Function owners (public) — sample / full as needed
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
-- E2) Default ACL rows (functions) — include GLOBAL vs schema
-- ------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as owner,
  case
    when d.defaclnamespace = 0 then '<global>'
    else coalesce(n.nspname, d.defaclnamespace::text)
  end as schema_name,
  d.defaclnamespace,
  d.defaclobjtype,
  d.defaclacl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclobjtype = 'f'
order by owner, schema_name;

-- ------------------------------------------------------------
-- E3) Expanded default ACL (aclexplode) — supporting only
-- ------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as owner,
  case
    when d.defaclnamespace = 0 then '<global>'
    else coalesce(n.nspname, d.defaclnamespace::text)
  end as schema_name,
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
-- E4) Package control — postgres GLOBAL defaults (defaclnamespace=0)
--     Missing global row => FAIL (hardwired PUBLIC EXECUTE remains).
-- ------------------------------------------------------------
with postgres_global_fn as (
  select d.defaclacl
  from pg_default_acl d
  where d.defaclobjtype = 'f'
    and d.defaclnamespace = 0
    and pg_get_userbyid(d.defaclrole) = 'postgres'
),
exploded as (
  select
    coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
    a.privilege_type
  from postgres_global_fn p
  cross join lateral aclexplode(coalesce(p.defaclacl, '{}'::aclitem[]))
    as a(grantor, grantee, privilege_type, is_grantable)
  where a.privilege_type = 'EXECUTE'
)
select
  (select count(*) from postgres_global_fn) as postgres_global_rows,
  (select defaclacl::text from postgres_global_fn limit 1) as postgres_global_acl,
  case
    when not exists (select 1 from postgres_global_fn) then
      'FAIL no GLOBAL postgres function default ACL — hardwired PUBLIC EXECUTE still applies'
    when exists (
      select 1 from exploded e
      where e.grantee in ('PUBLIC', 'anon', 'authenticated')
    ) then
      'FAIL postgres GLOBAL default still grants EXECUTE to PUBLIC/anon/authenticated'
    else 'OK'
  end as check_result,
  (select count(*) from exploded) as execute_grant_rows;

-- ------------------------------------------------------------
-- E5) Residual — supabase_admin (informational; not FAIL)
-- ------------------------------------------------------------
select
  'RESIDUAL' as kind,
  pg_get_userbyid(d.defaclrole) as owner,
  case
    when d.defaclnamespace = 0 then '<global>'
    else coalesce(n.nspname, d.defaclnamespace::text)
  end as schema_name,
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
-- E7) PRIMARY probe acceptance (has_function_privilege)
--     Transaction-scoped; ROLLBACK removes probe.
--     Return these rows in raw evidence (not only aclexplode).
-- ------------------------------------------------------------
begin;

create function public.mdz018_probe_default_privs()
returns text
language sql
stable
as $$ select 'probe'::text $$;

-- E7a context + ACL storage shape
select
  'E7a_context' as section,
  session_user,
  current_user,
  pg_get_userbyid(p.proowner) as owner,
  (p.proacl is null) as proacl_is_null,
  p.proacl::text as proacl_text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.oid = 'public.mdz018_probe_default_privs()'::regprocedure;

-- E7b PRIMARY check_result (required raw evidence)
select
  'E7b_primary' as section,
  has_function_privilege(
    'public', 'public.mdz018_probe_default_privs()', 'EXECUTE'
  ) as public_execute,
  has_function_privilege(
    'anon', 'public.mdz018_probe_default_privs()', 'EXECUTE'
  ) as anon_execute,
  has_function_privilege(
    'authenticated', 'public.mdz018_probe_default_privs()', 'EXECUTE'
  ) as authenticated_execute,
  case
    when not has_function_privilege(
           'public', 'public.mdz018_probe_default_privs()', 'EXECUTE'
         )
     and not has_function_privilege(
           'anon', 'public.mdz018_probe_default_privs()', 'EXECUTE'
         )
     and not has_function_privilege(
           'authenticated',
           'public.mdz018_probe_default_privs()',
           'EXECUTE'
         )
    then 'OK'
    else 'FAIL probe inherited client EXECUTE — GLOBAL defaults not effective for this creator role'
  end as check_result;

-- E7c supporting aclexplode — DO NOT use alone when proacl IS NULL
--     (acldefault always shows PUBLIC EXECUTE for null proacl)
select
  'E7c_supporting_aclexplode' as section,
  coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
  a.privilege_type,
  (p.proacl is null) as proacl_was_null_so_acldefault_used
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner)))
  as a(grantor, grantee, privilege_type, is_grantable)
where n.nspname = 'public'
  and p.oid = 'public.mdz018_probe_default_privs()'::regprocedure
  and a.privilege_type = 'EXECUTE'
order by 2;

rollback;
-- Probe removed by rollback.

-- ============================================================
-- Expected AFTER corrected GLOBAL 018 (creator role covered):
--   E4 check_result = OK (postgres_global_rows >= 1)
--   E7b check_result = OK; all three *_execute = false
--   E7a proacl_is_null = false (typically {owner=X/owner})
--   E5 may still show supabase_admin residual (informational)
-- ============================================================
