# PKG-02 production catalog evidence

Status: **NOT EXECUTED — D4 prerequisite stop**

- UTC date: 2026-07-28
- Engineer: Cursor Cloud Agent (GPT-5.6 Sol)
- Operator: NOT PRESENT
- Target project required: `fpjvjfgwbfehhcvdirpy`
- Operator confirmation of selected project: NOT PROVIDED
- Backup/PITR restore-point confirmation and date: NOT PROVIDED
- Supabase owner SQL Editor session: NOT AVAILABLE TO THIS EXECUTION
- Production statements executed: NONE
- `G0_function_acl.csv`: NOT CREATED; no catalog rows were obtained

The Engineer environment contains no Supabase/Postgres database credential. The
order requires an Operator with Supabase owner access to inspect and execute each
`SELECT` in SQL Editor, and forbids requesting or using a service-role key.
Consequently Q1 could not be run safely in this execution context. No later
query group was attempted.

## Q1 — function ACL and volatility

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select
  p.oid::regprocedure                                       as signature,
  p.prosecdef                                               as is_security_definer,
  case p.provolatile when 'i' then 'IMMUTABLE'
                     when 's' then 'STABLE'
                     when 'v' then 'VOLATILE' end           as volatility,
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role_can_execute,
  coalesce(p.proacl::text, '(NULL acl = default privileges = anon CAN execute)') as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by anon_can_execute desc, volatility, p.proname;
```

- Number of functions with `anon_can_execute = true`: UNRESOLVED
- Number of VOLATILE SECURITY DEFINER functions with `anon_can_execute = true`: UNRESOLVED
- VOLATILE SECURITY DEFINER signatures reachable by anon: UNRESOLVED
- `mdz_enqueue_email` anon execution: UNRESOLVED
- `mdz_claim_email_outbox` anon execution: UNRESOLVED
- `mdz_next_registration_id` privilege and catalog volatility: UNRESOLVED / NOT PROBED

## Q2 — live `review_registration_status` body

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select
  p.oid::regprocedure as signature,
  (pg_get_functiondef(p.oid) ilike '%public.profiles p%'
   and pg_get_functiondef(p.oid) ilike '%role%')              as has_inline_profiles_role_bridge,
  (pg_get_functiondef(p.oid) ilike '%mdz_is_wilaya_manager%')  as uses_helper,
  (pg_get_functiondef(p.oid) ilike '%mdz_audit_admin_action%') as calls_audit,
  (pg_get_functiondef(p.oid) ilike '%undefined_function%')     as swallows_audit_error
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'review_registration_status';
```

- `has_inline_profiles_role_bridge`: UNRESOLVED
- `uses_helper`: UNRESOLVED
- `calls_audit`: UNRESOLVED
- `swallows_audit_error`: UNRESOLVED

## Q3 — applied migration ground truth

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select version, name, applied_at, notes
from public.mdz_schema_migrations
order by version;
```

```sql
select
  to_regclass('public.admin_audit_log')  as t_admin_audit_log,
  to_regclass('public.user_roles')       as t_user_roles,
  to_regclass('public.email_outbox')     as t_email_outbox,
  to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') as f_audit,
  to_regprocedure('public.mdz_assert_admin_caller()')                              as f_assert,
  to_regprocedure('public.mdz_next_registration_id(timestamptz)')                  as f_regid;
```

## Q4 — manager-label blast radius

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select coalesce(lower(role),'(null)') as profile_role, count(*)
from public.profiles
group by 1
order by 2 desc;
```

```sql
select coalesce(lower(role),'(null)') as elevation_role, count(*)
from public.user_roles
group by 1
order by 2 desc;
```

```sql
select count(*) as manager_label_without_elevation
from public.profiles p
where lower(coalesce(p.role,'')) in ('manager','wilaya_manager','wilaya_mgr')
  and not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.id
  );
```

## Q5 — functions referenced by RLS policies

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;
```

```sql
select distinct tablename, policyname,
       regexp_matches(
         coalesce(qual,'')||' '||coalesce(with_check,''),
         '(mdz_[a-z_]+|normalize_algerian_phone|resolve_login_identifier)\s*\(',
         'g'
       ) as fn_in_policy
from pg_policies
where schemaname='public';
```

Predicted list:

1. `mdz_is_platform_admin`
2. `mdz_is_wilaya_manager`
3. `mdz_caller_wilaya`

Actual list: UNRESOLVED

## Q6 — grants and RLS

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated')
order by table_name, grantee;
```

```sql
select relname,
       relrowsecurity as rls_enabled,
       relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind='r'
order by relname;
```

## Q7 — rollback baselines

Timestamp: NOT EXECUTED  
Operator: NOT PRESENT  
Output: UNRESOLVED

```sql
select status, count(*)
from public.email_outbox
group by 1
order by 2 desc;
```

```sql
select status, count(*)
from public.registrations
group by 1
order by 2 desc;
```

```sql
select count(*) as members
from public.profiles;
```

```sql
select count(*) as registrations_missing_regid
from public.registrations
where registration_id is null
   or btrim(registration_id)='';
```

```sql
select date_trunc('day', created_at) as day,
       count(*) as registrations
from public.registrations
where created_at > now() - interval '30 days'
group by 1
order by 1 desc;
```
