# PR Review Report — Phase 0 + Security Hardening

## 1. Executive Summary

Phase 0 database foundation for sequential `member_id` allocation, plus a security fix removing anonymous RPC access to `allocate_member_id()`. Member IDs are now assigned exclusively server-side via `BEFORE INSERT` / `AFTER INSERT` triggers on `auth.users`. Frontend no longer calls allocation RPC.

## 2. Database Changes

- `member_id_counters` table + partial unique index on `profiles.member_id`
- Functions: `mdz_role_prefix`, `normalize_algerian_phone`, `allocate_member_id`, `resolve_login_identifier`, `sync_member_id_counters_from_profiles`, `assign_member_id_before_signup`, `handle_new_user`
- Migrations:
  - `20260718220000_align_existing_schema.sql`
  - `20260719000000_phase0_member_id_foundation.sql`
  - `20260719110000_secure_allocate_member_id.sql` (security patch for already-deployed DBs)
- `supabase/setup.sql` for fresh projects

## 3. Security Changes

**`allocate_member_id(text)` — final grants:**

```sql
revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;
```

- `member_id_counters`: no direct `anon`/`authenticated` table access
- `resolve_login_identifier`: remains on `anon` (required for login-by-phone/member_id)
- All allocation paths: `SECURITY DEFINER` triggers only

## 4. Frontend Changes

- Removed `allocateMemberId()` RPC and random-ID fallback from `index.html`
- Registration reads `member_id` from `authResult.user.user_metadata` or profile after signup
- Success UI shows assigned ID or fallback message if not yet available

## 5. Deployment Notes

**Existing production (run in order, after backup):**

1. `20260718220000_align_existing_schema.sql`
2. `20260719000000_phase0_member_id_foundation.sql`
3. `20260719110000_secure_allocate_member_id.sql`

**New project:** `supabase/setup.sql` only.

**Verify:** publishable key RPC to `allocate_member_id` must return `permission denied`.

## 6. Tests Performed

```bash
npm run test:db
```

- Fresh install (`setup.sql`) ✓
- Legacy upgrade path ✓
- 40 parallel allocations (postgres superuser) ✓
- `anon` cannot execute `allocate_member_id()` ✓
- `assign_member_id_before_signup` assigns metadata ✓
- `handle_new_user` creates profile ✓
- Idempotent re-run ✓

## 7. Remaining Risks

- Migrations not yet applied on production (manual owner action required)
- Confirmation email template must reference `{{ .Data.member_id }}` (manual Supabase Dashboard step)
- `resolve_login_identifier` on `anon` is intentional for login — monitor for abuse in Phase 1

## 8. Questions for Reviewer

1. Is `BEFORE INSERT` metadata injection acceptable for confirmation email `member_id`?
2. Approve `resolve_login_identifier` remaining on `anon` for login flow?

---

Awaiting ChatGPT review. Do not merge until review is approved.
