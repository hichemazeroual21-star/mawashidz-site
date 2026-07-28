# Operator Session 1 — PKG-02 and production captures

Authority: CSO-04 Parts 5–8  
Status: **NOT EXECUTED — D5 BLOCKED**  
Target duration: one 90-minute sitting  
Production mutation: **NONE**

This runbook is the Owner's single-session script. The Engineer supplies the
queries and records outputs verbatim but never requests or receives Supabase,
Cloudflare, Resend, GitHub, or Netlify credentials.

## 0. Mandatory prerequisites

Do not start Q1 until both required confirmations are filled.

| Prerequisite | Confirmed | Value |
|---|---|---|
| Supabase SQL Editor session has Owner access | ☐ | Operator: __________ |
| Backup/PITR restore point exists | ☐ | Restore-point date: __________ UTC |
| Selected project ref is exactly `fpjvjfgwbfehhcvdirpy` | ☐ | Observed ref: __________ |
| Every SQL statement below is a `SELECT` | ☐ | Checked by: __________ |

- Missing Owner session or unconfirmed backup/PITR: **D5 — stop and reschedule**.
- Wrong project, impossible backup, or Owner unable/refusing Q1: **D4 — abort**.
- Do not call any function to test Q1. In particular,
  `mdz_enqueue_email` sends real production email.
- Do not paste credentials into this document, a terminal, chat, or evidence.
- Do not omit, round, redact, or summarize query rows. Store the output
  verbatim in the named evidence artifacts.

## 1. Session metadata

| Field | Value |
|---|---|
| Operator name | |
| Recording Engineer | |
| UTC start | |
| UTC end | |
| Supabase project ref | |
| Backup/PITR restore-point date | |
| Q1 incident declared | YES / NO / NOT RUN |

## 2. Q1 — run first and in isolation

> **SECURITY INCIDENT GATE:** Export Q1 before anything can change. If
> `mdz_enqueue_email` or `mdz_claim_email_outbox` has
> `anon_can_execute = true`, stop immediately, notify the Owner, preserve the
> Q1 CSV plus Supabase and Resend logs, and invoke D3. Do not remediate.

**BAD:** Either mail function is anon-executable; an anon-executable VOLATILE
SECURITY DEFINER function can write state; or an anonymous write function has
no repository provenance.

```sql
-- BAD: mdz_enqueue_email or mdz_claim_email_outbox has anon_can_execute=true.
select
  p.oid::regprocedure                                       as signature,
  p.prosecdef                                               as is_security_definer,
  case p.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE'
                     when 'v' then 'VOLATILE' end           as volatility,
  pg_get_function_arguments(p.oid)                          as declared_arguments,
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role_can_execute,
  coalesce(p.proacl::text, '(NULL acl = default privileges = anon CAN execute)') as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by anon_can_execute desc, volatility, p.proname;
```

Export the complete result from Supabase SQL Editor as:

`evidence/G0_function_acl.csv`

Do not proceed until the CSV is saved.

| Q1 summary | Result |
|---|---|
| CSV saved | ☐ |
| Total functions returned | |
| `anon_can_execute = true` count | |
| VOLATILE + SECURITY DEFINER + anon count | |
| `mdz_enqueue_email` anon-executable | TRUE / FALSE |
| `mdz_claim_email_outbox` anon-executable | TRUE / FALSE |
| Incident gate | CLEAR / D3 |
| Owner authorizes continuation to Q2–Q7 | YES / NO |

## 3. Q2–Q7 — contiguous ordered SQL block

Only continue if Q1 is exported and the Owner has cleared the incident gate.
Copy this block without inserting, deleting, or reordering statements.

```sql
-- Q2 — WHICH review_registration_status BODY IS LIVE?
-- BAD: has_inline_profiles_role_bridge=true; or unexpected body indicators.
select
  p.oid::regprocedure as signature,
  (pg_get_functiondef(p.oid) ilike '%public.profiles p%'
   and pg_get_functiondef(p.oid) ilike '%role%')              as has_inline_profiles_role_bridge,
  (pg_get_functiondef(p.oid) ilike '%mdz_is_wilaya_manager%')  as uses_helper,
  (pg_get_functiondef(p.oid) ilike '%mdz_audit_admin_action%') as calls_audit,
  (pg_get_functiondef(p.oid) ilike '%undefined_function%')     as swallows_audit_error
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'review_registration_status';

-- Q3a — APPLIED-MIGRATION LEDGER (EVIDENCE, NOT COMPLETE HISTORY)
-- BAD: query errors, unexpected versions, or rows contradict live catalog objects.
select version, name, applied_at, notes
from public.mdz_schema_migrations
order by version;

-- Q3b — LIVE OBJECT PRESENCE
-- BAD: unexpected object presence/absence, especially admin_audit_log or audit helpers.
select
  to_regclass('public.admin_audit_log')  as t_admin_audit_log,
  to_regclass('public.user_roles')       as t_user_roles,
  to_regclass('public.email_outbox')     as t_email_outbox,
  to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') as f_audit,
  to_regprocedure('public.mdz_assert_admin_caller()')                              as f_assert,
  to_regprocedure('public.mdz_next_registration_id(timestamptz)')                  as f_regid;

-- Q4a — PROFILE ROLE-LABEL DISTRIBUTION
-- BAD: an unexpected privileged label or unexplained distribution.
select coalesce(lower(role),'(null)') as profile_role, count(*)
from public.profiles
group by 1
order by 2 desc;

-- Q4b — ROLE-ASSIGNMENT DISTRIBUTION
-- BAD: an unexpected privileged role or unexplained distribution.
select coalesce(lower(role),'(null)') as elevation_role, count(*)
from public.user_roles
group by 1
order by 2 desc;

-- Q4c — MANAGER LABEL WITHOUT ANY user_roles ROW
-- BAD: any non-zero result requires explicit blast-radius review.
select count(*) as manager_label_without_elevation
from public.profiles p
where lower(coalesce(p.role,'')) in ('manager','wilaya_manager','wilaya_mgr')
  and not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p.id
  );

-- Q5a — COMPLETE PUBLIC RLS POLICY DEFINITIONS
-- BAD: unexpected permissive roles/commands or policy expressions.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- Q5b — FUNCTIONS REFERENCED INSIDE RLS POLICIES
-- BAD: any helper beyond mdz_is_platform_admin, mdz_is_wilaya_manager, and mdz_caller_wilaya.
select distinct tablename, policyname,
       regexp_matches(
         coalesce(qual,'')||' '||coalesce(with_check,''),
         '(mdz_[a-z_]+|normalize_algerian_phone|resolve_login_identifier)\s*\(',
         'g'
       ) as fn_in_policy
from pg_policies
where schemaname='public';

-- Q6a — TABLE GRANTS TO BROWSER ROLES
-- BAD: unexpected broad anon/authenticated privileges.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated')
order by table_name, grantee;

-- Q6b — RLS ENABLEMENT
-- BAD: rls_enabled=false on any returned table.
select relname,
       relrowsecurity as rls_enabled,
       relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind='r'
order by relname;

-- Q7a — EMAIL OUTBOX STATUS BASELINE
-- BAD: query omitted/errors; later rollback triggers would be unenforceable.
select status, count(*)
from public.email_outbox
group by 1
order by 2 desc;

-- Q7b — REGISTRATION STATUS BASELINE
-- BAD: query omitted/errors; later rollback triggers would be unenforceable.
select status, count(*)
from public.registrations
group by 1
order by 2 desc;

-- Q7c — MEMBER COUNT BASELINE
-- BAD: query omitted/errors; later rollback triggers would be unenforceable.
select count(*) as members
from public.profiles;

-- Q7d — MISSING REGISTRATION-ID BASELINE
-- BAD: query omitted/errors; later rollback triggers would be unenforceable.
select count(*) as registrations_missing_regid
from public.registrations
where registration_id is null
   or btrim(registration_id)='';

-- Q7e — 30-DAY REGISTRATION VOLUME BASELINE
-- BAD: query omitted/errors; later rollback triggers would be unenforceable.
select date_trunc('day', created_at) as day,
       count(*) as registrations
from public.registrations
where created_at > now() - interval '30 days'
group by 1
order by 1 desc;
```

Paste every result verbatim into the session evidence. Do not replace query
output with expected values.

## 4. Dashboard capture checklist

Capture screenshots or exports where available. Record observed values, not
defaults or repository expectations.

### 4.1 Cloudflare build settings — `mawashidz-live`

| Setting | Expected cross-check | Observed | Evidence path | OK |
|---|---|---|---|---|
| Production branch | `main` | | | ☐ |
| Build command | `npm ci && npm run build` | | | ☐ |
| Production deploy command | `npx wrangler deploy` | | | ☐ |
| Non-production VERSION COMMAND | `npx wrangler versions upload` | | | ☐ |

### 4.2 Cloudflare Worker inventory

| Worker | Domains/routes | Cron | Queues | Bindings | Evidence path |
|---|---|---|---|---|---|
| `mawashidz-site` | | | | | |
| `plain-hat-3f18` | | | | | |

Record whether either Worker can receive the apex, `www`, or any production
route. Do not delete, rename, detach, or deploy anything.

### 4.3 Supabase API logs — previous 30 days

Use the UTC interval from session start minus 30 days through session start.
Filter `rpc/resolve_login_identifier`, export the complete source-IP/count
aggregation, and record any dashboard retention gap.

| Date range | Complete source-IP/count export | Retention gap | High-volume single source | Evidence path |
|---|---|---|---|---|
| | | | YES / NO / UNRESOLVED | |

A high-volume single source is a D3 trigger. Preserve logs before any action.

### 4.4 Resend — previous 30 days

| Metric | Observed | Evidence path |
|---|---|---|
| Sent volume | | |
| Bounce count/rate | | |
| Complaint count/rate | | |
| Reputation/status | | |

Abnormal volume or a reputation drop is a D3 trigger.

### 4.5 Backup/PITR

| Item | Observed | Evidence path |
|---|---|---|
| Backup/PITR exists | YES / NO | |
| Earliest restore point (UTC) | | |
| Restore point covering this session | YES / NO | |

### 4.6 GitHub branch protection

The API returns 403 for this check. Read it in the GitHub UI.

| `main` setting | Observed | Evidence path |
|---|---|---|
| Branch protection/ruleset enabled | | |
| Pull request required | | |
| Required status checks enforced | | |
| Admin bypass allowed | | |

### 4.7 Netlify project `mawashidz`

| Item | Observed | Evidence path |
|---|---|---|
| Owning account/team | | |
| Custom domains | | |
| Deploy previews enabled | | |

Do not change the account, domains, or preview settings.

## 5. Production schema baseline — read-only

F5 proves repository migrations cannot recreate every live function definition.
The Owner captures the complete public schema from an authenticated local
terminal. The Engineer does not receive database credentials.

Before using the Supabase CLI, the Owner confirms its linked project ref is
exactly `fpjvjfgwbfehhcvdirpy`.

```bash
supabase db dump --linked --schema public -f evidence/PRODUCTION_SCHEMA_BASELINE.sql
```

Alternatively, use an Owner-controlled connection profile already verified to
target `fpjvjfgwbfehhcvdirpy`; do not paste its URI into evidence:

```bash
pg_dump --schema-only --schema=public --file=evidence/PRODUCTION_SCHEMA_BASELINE.sql
```

| Artifact | Created | Path | UTC |
|---|---|---|---|
| Production public schema | ☐ | `evidence/PRODUCTION_SCHEMA_BASELINE.sql` | |

## 6. Live results table

| Step | UTC | PASS / FAIL / BLOCKED | Evidence / verbatim-result location | Notes |
|---|---|---|---|---|
| Prerequisites | | | | |
| Q1 + CSV export | | | `evidence/G0_function_acl.csv` | |
| Q2 | | | | |
| Q3 | | | | |
| Q4 | | | | |
| Q5 | | | | |
| Q6 | | | | |
| Q7 | | | | |
| Cloudflare build settings | | | | |
| Worker inventory | | | | |
| Supabase API logs | | | | |
| Resend metrics | | | | |
| Backup/PITR | | | | |
| GitHub branch protection | | | | |
| Netlify inventory | | | | |
| Production schema dump | | | `evidence/PRODUCTION_SCHEMA_BASELINE.sql` | |

## 7. Gate answers

| Question | Measured answer |
|---|---|
| Is the mail relay open? | |
| Is the inline `profiles.role` bridge live? | |
| Does `admin_audit_log` exist? | |
| `profiles` rows with a manager label but no `user_roles` row | |
| True anonymous-executable function count | |
| Measured floor for comparison | 8 |
| Discredited planning figure (not evidence) | 41 |

## 8. Sign-off

| Role | Name | UTC date | Signature/status |
|---|---|---|---|
| Owner/Operator | | | |
| Recording Engineer | | | |
| Principal Engineer | | | |

After the session, update `docs/runbooks/evidence/PHASE_0_GATE.md`, apply the
D1–D5 matrix, and stop all work. Do not prepare or remediate later packages.
