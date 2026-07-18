# MawashiDZ Database Schema (Phase 0)

Verified live baseline (2026-07-18, REST probes against `fpjvjfgwbfehhcvdirpy`) **before** Phase 0 apply:

| Table | Live columns |
|-------|----------------|
| `profiles` | `id, full_name, phone, email, created_at` |
| `registrations` | full set + `status` |
| `contact_messages` | full set + `email` |
| `feedback_tickets` | full set |
| `breeders` | legacy: `id, full_name, phone, wilaya, commune, farm_name, created_at` |
| `member_id_counters` | **missing** |
| RPCs | **missing** |

## After Phase 0 (target)

### `public.member_id_counters`
| Column | Type | Notes |
|--------|------|-------|
| prefix | text PK | Single letter role prefix |
| last_value | bigint | Last issued number |
| updated_at | timestamptz | |

RLS enabled, **zero** policies (security definer only).

### `public.profiles` (added columns)
`member_id`, `registration_id`, `first_name`, `last_name`, `role`, `wilaya`, `daira`, `commune`, `birth_date`, `invite_code`, `invited_by`, `status`, `updated_at`

Constraints/indexes:
- `profiles_member_id_format_chk` — `MDZ-[A-Z]-[0-9]{6}` or NULL
- unique partial index on `member_id`
- indexes on `phone`, `lower(email)`, `role`, `wilaya`, `status`

### Functions
| Function | Security | Grants |
|----------|----------|--------|
| `member_role_prefix(text)` | immutable SQL | anon, authenticated |
| `allocate_member_id(text)` | DEFINER | anon, authenticated (PUBLIC revoked) |
| `resolve_login_identifier(text)` | DEFINER | anon, authenticated (PUBLIC revoked) |
| `handle_new_user()` | DEFINER trigger | no PUBLIC execute |
| `protect_profile_sensitive_columns()` | DEFINER trigger | blocks client mutation of member_id/role/status once set |

### Triggers
- `on_auth_user_created` on `auth.users` → `handle_new_user`
- `trg_protect_profile_sensitive` on `profiles` BEFORE UPDATE

### RLS summary
- `profiles`: self SELECT + limited UPDATE
- `registrations` / `contact_messages` / `feedback_tickets`: INSERT only for anon/authenticated
- `breeders`: RLS on, no policies (deny)
- `member_id_counters`: RLS on, no policies (deny)

## Apply
See `supabase/setup.sql` and `docs/reports/phase-0-foundation.md`.
