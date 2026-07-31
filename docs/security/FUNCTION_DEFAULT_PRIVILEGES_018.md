# Package — Function default privileges (018)

**Status:** reviewable package — Production apply is Owner-only after evidence.  
**Platform status:** **NO GO** (unchanged). This package does not claim Production-Ready.  
**Migration 017:** **FROZEN** — not modified by this package.

## Scope

| In | Out |
|----|-----|
| `ALTER DEFAULT PRIVILEGES` for **ROLE postgres** in `public` | Retroactive ACL rewrite of existing functions |
| Explicit privilege policy + CI for **new/modified** function migrations | E1/E2, RLS, email/outbox, UI, `resolve_login_identifier` redesign |
| Live evidence kit (`018_….verify.sql`) | Treating `supabase_admin` default ACL as package failure |
| Ledger row `018` | Any change to Migration 017 |

## Files

| Path | Role |
|------|------|
| `supabase/migrations/018_function_default_privileges.sql` | Forward-only defaults for `postgres` |
| `supabase/migrations/018_function_default_privileges.verify.sql` | Before/after + probe evidence |
| `scripts/check-function-privileges.mjs` | CI guard |
| `tests/migration-018-function-default-privileges.test.mjs` | Static + fixture tests |
| `tests/fixtures/function-privilege-guard/` | Unsafe (must fail) / safe (must pass) |

## Residual risk (documented, not a package failure)

`supabase_admin` may retain its own `pg_default_acl` function defaults. This migration **reads and reports** that row; it does **not** `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` (permission denied risk / outside runner control).

Acceptance is **not**: “every `pg_default_acl` row lacks anon/authenticated grants.”

Acceptance **is**: `postgres` defaults for `public` functions no longer auto-grant EXECUTE to PUBLIC / anon / authenticated, proven by catalog + post-018 probe.

## Explicit privilege pattern (future migrations)

Immediately after `CREATE [OR REPLACE] FUNCTION`:

```sql
revoke all on function public.name(types) from public;
revoke execute on function public.name(types) from anon;
revoke execute on function public.name(types) from authenticated;
grant execute on function public.name(types) to /* exact caller roles */;
```

New/modified `SECURITY DEFINER` → `set search_path = ''` with schema-qualified refs. Legacy grandfathered.

## Live evidence (Owner)

Run `018_function_default_privileges.verify.sql` **before** and **after** apply; save raw outputs. Probe section must `ROLLBACK`.
