# Package — Function default privileges (018)

**Status:** revision after verification failure — **not approved until new raw E7 evidence**.  
**Platform status:** **NO GO** (unchanged).  
**Migration 017:** **FROZEN** — not modified.

## Root cause of failed verify

PostgreSQL rule: **`ALTER DEFAULT PRIVILEGES … IN SCHEMA … REVOKE` cannot remove hardwired PUBLIC EXECUTE** on functions. Per-schema defaults only *add* privileges (or undo a matching per-schema GRANT).

The first 018 build used `IN SCHEMA public REVOKE`, which was a **no-op**. Catalog checks that treated “no `pg_default_acl` row” as OK were a **false positive**. New functions kept `proacl IS NULL` → `acldefault` shows PUBLIC EXECUTE → `anon`/`authenticated` inherit via PUBLIC.

**Correct form (now in migration):**

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- (also anon, authenticated; GLOBAL — no IN SCHEMA)
```

Plus the same GLOBAL revoke for the **current session role** (no `FOR ROLE`), so SQL Editor apply contexts that are not `postgres` still stop PUBLIC inheritance on new creates.

## Scope

| In | Out |
|----|-----|
| GLOBAL default REVOKE for `postgres` + current session | Retroactive ACL rewrite of existing functions |
| Explicit privilege policy + CI for new/modified migrations | `FOR ROLE supabase_admin` as hard dependency |
| Verify with primary `has_function_privilege` E7 | Treating residual other-role defaults as package failure |
| Ledger `018` | Any change to Migration 017 |

## Files

| Path | Role |
|------|------|
| `supabase/migrations/018_function_default_privileges.sql` | Corrected GLOBAL defaults + in-migration probe |
| `supabase/migrations/018_function_default_privileges.verify.sql` | E4 global check + **E7b primary** privilege rows |
| `scripts/check-function-privileges.mjs` | CI guard |
| `tests/…` + fixtures | Unsafe fails / safe passes |

## Residual risk

`supabase_admin` (or other creators) may retain their own defaults. Documented only — not a package failure. Explicit post-CREATE `REVOKE`/`GRANT` remains mandatory.

## Re-apply note

If the no-op 018 already ran on Production: re-apply this corrected migration (idempotent GLOBAL REVOKEs + fail-closed probe). Then capture **raw E7b** (`public_execute` / `anon_execute` / `authenticated_execute` / `check_result`).
