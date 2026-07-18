# MawashiDZ — Database schema (Phase 0)

## Overview

Phase 0 stabilizes member identity, profile auto-creation, and login resolution. QR, RBAC, audit, and workflow tables are planned for later phases.

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

**Indexes:** partial unique on `member_id`, index on `phone`, index on `lower(email)`.

**RLS:** authenticated users can `SELECT` own row only.

### `public.registrations`, `contact_messages`, `feedback_tickets`

Unchanged from v1.7. Public insert only (Phase 0). Admin read policies come in Phase 2.

## Functions (RPC)

| Function | Grants | Purpose |
|----------|--------|---------|
| `allocate_member_id(text)` | anon, authenticated, service_role | Next sequential ID for role |
| `resolve_login_identifier(text)` | anon, authenticated, service_role | Map email / phone / member_id → email |
| `normalize_algerian_phone(text)` | anon, authenticated, service_role | Normalize Algerian mobile |
| `sync_member_id_counters_from_profiles()` | service_role | Rebuild counters from existing IDs |
| `handle_new_user()` | trigger only | Auto-create profile on signup |

## Triggers

- `on_auth_user_created` → `handle_new_user()` on `auth.users` AFTER INSERT

## Migration paths

### Existing Supabase project

1. `supabase/migrations/20260718220000_align_existing_schema.sql`
2. `supabase/migrations/20260719000000_phase0_member_id_foundation.sql`

### New Supabase project

- `supabase/setup.sql` (single file)

## Phase 0 rollback

Rollback is manual. Do **not** drop production data.

1. Drop trigger: `drop trigger if exists on_auth_user_created on auth.users;`
2. Restore previous function bodies from git tag `v1.7.1` if needed.
3. Columns added by Phase 0 can remain (non-destructive). Do not drop `member_id` if profiles contain values.
4. To undo counter table only (empty project): `drop table if exists public.member_id_counters cascade;`

## Verification checklist (manual on Supabase)

After running migrations in SQL Editor:

```sql
select public.allocate_member_id('breeder');
select public.resolve_login_identifier('MDZ-F-000001');
select column_name from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='member_id';
```

Expected: function returns values; `member_id` column exists.

## Automated tests

```bash
npm run test:db
```

Covers fresh install, legacy upgrade, 40 parallel allocations, phone/member_id login resolution, and idempotent re-runs.
