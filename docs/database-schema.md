# MawashiDZ — Database schema (Phase 0)

## Overview

Phase 0 stabilizes member identity, profile auto-creation, and login resolution.

## Tables

### `public.member_id_counters`

| Column | Type | Notes |
|--------|------|-------|
| `prefix` | `text` PK | Role letter: F, V, S, U, W, B, P |
| `last_value` | `bigint` | Last issued sequence (≥ 0) |

**Access:** RLS enabled, no policies. Direct access revoked from `anon` and `authenticated`.

### `public.profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | FK → `auth.users(id)` |
| `member_id` | `text` | Unique when set. Format `MDZ-X-000001` |
| `registration_id` | `text` | Client-generated tracking ID |
| `full_name`, `first_name`, `last_name` | `text` | |
| `phone` | `text` | Stored as `+2135/6/7XXXXXXXX` |
| `email` | `text` | |
| `role` | `text` | breeder, vet, feed, buyer, manager, ambassador, partner |
| `wilaya`, `daira`, `commune` | `text` | |
| `birth_date` | `date` | |
| `invite_code`, `invited_by` | `text` | |
| `status` | `text` | Default `pending` |
| `created_at` | `timestamptz` | |

**RLS:** authenticated users can `SELECT` own row only.

## Functions (RPC)

| Function | Grants | Purpose |
|----------|--------|---------|
| `allocate_member_id(text)` | **service_role only** | Next sequential ID (trigger-internal) |
| `resolve_login_identifier(text)` | anon, authenticated, service_role | Map email / phone / member_id → email |
| `normalize_algerian_phone(text)` | anon, authenticated, service_role | Normalize Algerian mobile |
| `sync_member_id_counters_from_profiles()` | service_role | Rebuild counters from existing IDs |
| `assign_member_id_before_signup()` | trigger only | BEFORE INSERT on `auth.users` |
| `handle_new_user()` | trigger only | AFTER INSERT on `auth.users` |

### Final `allocate_member_id` grants

```sql
revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;
```

## Triggers

1. `on_auth_user_assign_member_id` → `assign_member_id_before_signup()` **BEFORE INSERT** on `auth.users`
2. `on_auth_user_created` → `handle_new_user()` **AFTER INSERT** on `auth.users`

## Signup flow

```
Client signUp(metadata with role, no member_id)
  → BEFORE INSERT: assign_member_id_before_signup() sets metadata.member_id
  → AFTER INSERT: handle_new_user() creates profiles row
  → Client reads member_id from user.user_metadata or profile
```

## Migration paths

### Existing Supabase project

1. `supabase/migrations/20260718220000_align_existing_schema.sql`
2. `supabase/migrations/20260719000000_phase0_member_id_foundation.sql`
3. `supabase/migrations/20260719110000_secure_allocate_member_id.sql`

### New Supabase project

- `supabase/setup.sql` (includes secure grants and both triggers)

## Verification (SQL Editor — service role)

```sql
select public.allocate_member_id('breeder');  -- works in SQL Editor only
```

Publishable key RPC call must return `permission denied`.

## Automated tests

```bash
npm run test:db
```

Includes anon permission denial and before-insert trigger coverage.
