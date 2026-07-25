# MawashiDZ — Database schema (Phase 0)

**Last updated:** 2026-07-24  
**Aligns with:** Constitution v3.0 · migrations `001`–`009` · `setup.sql` v1.10.0

## Overview

Phase 0 stabilizes member identity, profile auto-creation, login resolution, operator review, audit logging, and hardened public inserts.

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
| `role` | `text` | Membership type: breeder, vet, feed, buyer, manager, ambassador, partner (`broker` reserved by Constitution) |
| `wilaya`, `daira`, `commune` | `text` | |
| `birth_date` | `date` | |
| `invite_code`, `invited_by` | `text` | |
| `status` | `text` | Default `pending` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS:** authenticated users can `SELECT` own row only.  
**Trigger:** `protect_profile_sensitive_columns` blocks client updates to `status`, `member_id`, `role`, `registration_id` unless admin RPC bypass flag is set.

### `public.user_roles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` PK | Identity |
| `user_id` | `uuid` | FK → `auth.users` |
| `role` | `text` | Platform elevation: admin, founder, super_admin, wilaya_manager, manager, wilaya_mgr |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS:** self `SELECT` only. Mutations via `admin_grant_user_role` / `admin_revoke_user_role` (or service_role).

### `public.registrations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` PK | |
| `full_name`, `phone` | `text` | Required |
| `email`, `whatsapp`, `wilaya`, `daira` | `text` | |
| `user_type`, `role` | `text` | Registration membership type |
| `message` | `text` | May contain legacy JSON blob |
| `member_id`, `registration_id` | `text` | |
| `status` | `text` | Default `pending` — required by dashboards + review RPC |
| `is_verified`, privacy/terms flags | `boolean` | |
| `created_at` | `timestamptz` | |

**RLS:** public `INSERT` with length/required-field `WITH CHECK` (migration 009).  
**Trigger:** `mdz_registrations_insert_guard` — max 5 inserts/hour per normalized phone; default status `pending`.  
**SELECT:** manager (wilaya) / admin via migration 003 policies.

### `public.contact_messages` / `public.feedback_tickets`

Public insert with length checks (migrations `009` / restored by `015`). Default `status = 'new'`.  
**SELECT:** platform admin only via `mdz_is_platform_admin()` (migration `016` — closes TD-013 blind inbox). No anon SELECT.

### `public.admin_audit_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` PK | |
| `created_at` | `timestamptz` | |
| `actor_id` | `uuid` | |
| `action`, `target_type`, `target_label` | `text` | |
| `target_id` | `uuid` | nullable |
| `payload` | `jsonb` | |

**RLS:** admin/founder/super_admin `SELECT` only. No direct client writes — SECURITY DEFINER helpers insert.

### `public.notifications` / `public.support_tickets` / `public.email_outbox`

Phase 1 (migrations 010–011). See [PHASE1_EXECUTION_PLAN.md](./product/PHASE1_EXECUTION_PLAN.md).

| Table | Access |
|-------|--------|
| `notifications` | Recipient SELECT; write via `mdz_notify_user` / mark-read RPCs |
| `support_tickets` / `support_messages` | Member own + admin + wilaya fence; write via ticket RPCs |
| `support_internal_notes` | Staff SELECT only |
| `email_outbox` | Admin SELECT; claim/mark via service_role |

## Functions (RPC)

| Function | Grants | Purpose |
|----------|--------|---------|
| `allocate_member_id(text)` | **service_role only** | Next sequential ID |
| `resolve_login_identifier(text)` | anon, authenticated, service_role | Map email / phone / member_id → email |
| `normalize_algerian_phone(text)` | anon, authenticated, service_role | Normalize Algerian mobile |
| `sync_member_id_counters_from_profiles()` | service_role | Rebuild counters |
| `admin_set_profile_status(...)` | authenticated, service_role | Status change + audit (008 extends with reason) |
| `review_registration_status(...)` | authenticated, service_role | Approve/reject by registration_id |
| `admin_grant_user_role` / `admin_revoke_user_role` | authenticated | Elevation management + audit |
| `admin_list_audit_log(int)` | authenticated | Recent audit rows for admins |
| `mdz_assert_admin_caller()` | authenticated | Shared admin gate |
| `list_my_notifications` / `mark_notification_read` / `mark_all_notifications_read` | authenticated | Inbox |
| `create_support_ticket` / `reply_support_ticket` / `set_support_ticket_status` / `add_support_internal_note` | authenticated | Support Center |
| `mdz_claim_email_outbox` / `mdz_mark_email_outbox` | service_role | Email worker |

## Triggers

1. `on_auth_user_assign_member_id` → BEFORE INSERT `auth.users`  
2. `on_auth_user_created` → AFTER INSERT `auth.users` → `profiles`  
3. `protect_profile_sensitive_columns` → BEFORE UPDATE `profiles`  
4. `mdz_registrations_insert_guard` → BEFORE INSERT `registrations`

## Migration paths

### Existing Supabase project (recommended)

```text
001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011
```

### New Supabase project

1. `supabase/setup.sql`  
2. Then `003`–`009` (dashboard RLS, unique indexes already partly in setup; still run for RPC/audit parity)

### Timestamped Phase 0 path

Do **not** mix with numbered path without review (`20260718*` / `20260719*`).

## Data classification (Constitution §10)

| Table / events | Class |
|----------------|-------|
| `admin_audit_log` | Immutable ledger |
| Registration/approval history | Soft-delete operational → treat status history as auditable |
| `profiles` PII | Soft-delete / anonymize per FD-06 |
| Contact/feedback | Soft-delete operational |
