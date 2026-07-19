# Production Deployment Checklist

**Release:** Phase 0 Final  
**Migration:** `supabase/migrations/20260720_phase0_final.sql`  
**Supabase project:** `fpjvjfgwbfehhcvdirpy`

> **Do not execute on production without final ChatGPT / owner approval.**

---

## Pre-deployment

- [ ] Confirm target environment (staging vs production)
- [ ] Confirm maintenance window communicated (if needed)
- [ ] Verify latest commit SHA and test report (`docs/PHASE0_TEST_REPORT.md`)
- [ ] Ensure `service_role` key is available only on server-side (never in client code)

---

## Step-by-step deployment

### 1. Backup database

- [ ] Create Supabase manual backup (Dashboard → Database → Backups)
- [ ] Export critical tables if additional safety copy needed:
  - `auth.users`
  - `public.profiles`
  - `public.member_id_counters`
- [ ] Record backup timestamp and restore point ID

### 2. Run migration

- [ ] Open Supabase SQL Editor
- [ ] Paste full contents of `supabase/migrations/20260720_phase0_final.sql`
- [ ] Execute (idempotent — safe to re-run if interrupted)
- [ ] Confirm no errors in output

> **Note:** `\ir` includes do not work in SQL Editor. Use the full migration file contents.

### 3. Verify functions

Run in SQL Editor:

```sql
select proname, prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'allocate_member_id', 'handle_new_user', 'assign_member_id_before_signup',
    'normalize_public_signup_role', 'normalize_algerian_phone',
    'resolve_login_identifier', 'safe_metadata_date'
  )
order by proname;
```

- [ ] All 7 functions exist
- [ ] SECURITY DEFINER functions show `prosecdef = true`

### 4. Verify triggers

```sql
select tgname, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;
```

- [ ] Exactly one BEFORE trigger: `on_auth_user_assign_member_id`
- [ ] Exactly one AFTER trigger: `on_auth_user_created`
- [ ] No duplicate or legacy triggers

### 5. Verify grants

```sql
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'allocate_member_id'
  and privilege_type = 'EXECUTE';
```

- [ ] `service_role` has EXECUTE
- [ ] `anon` and `authenticated` do **not** have EXECUTE

```sql
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'resolve_login_identifier'
  and privilege_type = 'EXECUTE';
```

- [ ] `anon`, `authenticated`, `service_role` have EXECUTE

### 6. Verify RLS

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'registrations', 'contact_messages', 'feedback_tickets', 'member_id_counters');
```

- [ ] RLS enabled on all listed tables

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

- [ ] `profiles`: self-read for `authenticated` only
- [ ] Public tables: INSERT-only policies for `anon`/`authenticated`
- [ ] `member_id_counters`: no client policies

### 7. Verify signup

- [ ] Register new test user via production site
- [ ] Confirm `auth.users.raw_user_meta_data` contains server-assigned `member_id`
- [ ] Confirm `profiles.role` matches whitelisted role (or `buyer` if spoofed)
- [ ] Confirm `profiles.status = 'pending'`
- [ ] Attempt spoofed `member_id` in metadata → must be overwritten

### 8. Verify profile creation

- [ ] New signup creates exactly one `profiles` row
- [ ] `profiles.id` matches `auth.users.id`
- [ ] Phone normalized to `+213…` format when valid Algerian mobile

### 9. Verify member_id

- [ ] Format: `MDZ-{F|V|S|U}-{6 digits}`
- [ ] Unique across all profiles
- [ ] `member_id_counters` synced (no gaps causing collisions on next signup)

```sql
select prefix, last_value from public.member_id_counters order by prefix;
```

### 10. Verify login

- [ ] Login with email + password works
- [ ] Login with Algerian phone number resolves to correct email
- [ ] Login with `member_id` resolves to correct email
- [ ] `resolve_login_identifier` returns NULL for unknown identifiers

### 11. Verify Netlify

- [ ] Latest `index.html` deployed (no client-side `allocate_member_id` RPC)
- [ ] Build/deploy succeeded without errors
- [ ] Site loads over HTTPS
- [ ] Registration and login forms functional

### 12. Verify Cloudflare

- [ ] DNS records point to Netlify
- [ ] SSL/TLS mode: Full (strict) recommended
- [ ] No caching of authenticated API responses
- [ ] WAF / bot protection rules active (if configured)

### 13. Verify Email

- [ ] Supabase Auth email templates configured
- [ ] Confirmation emails deliver (check spam folder)
- [ ] Password reset emails deliver
- [ ] Sender domain / SPF / DKIM configured (if custom domain)

### 14. Verify rollback plan

- [ ] Backup restore procedure documented and tested on staging
- [ ] Previous migration state identified (pre-Phase-0-Final)
- [ ] Rollback steps:
  1. Restore database from backup
  2. Revert Netlify deploy to previous commit
  3. Verify site functions on previous schema
- [ ] Rollback owner assigned and reachable

---

## Post-deployment

- [ ] Run smoke tests on production (signup, login, contact form)
- [ ] Monitor Supabase logs for trigger errors (24h)
- [ ] Record deployed commit SHA
- [ ] Archive test report and this checklist (completed)

---

## Automated verification (local / CI)

```bash
npm install
npm run test:db
```

Generates `docs/PHASE0_TEST_REPORT.md` with security and concurrency results.

---

*Phase 0 Final — production baseline. Awaiting final approval before deployment.*
