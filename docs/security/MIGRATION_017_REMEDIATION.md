# Migration 017 — Reachable SECURITY DEFINER remediation

**Status:** reviewable package only — **do not apply to production** until Owner approval.  
**Branch:** `cursor/migration-017-definer-trigger-harden-9060`  
**Files:**

| Artifact | Path |
|---|---|
| Migration | `supabase/migrations/017_harden_reachable_security_definers.sql` |
| Rollback | `supabase/migrations/017_harden_reachable_security_definers.rollback.sql` |
| Verification | `supabase/migrations/017_harden_reachable_security_definers.verify.sql` |
| Login design (out of band) | `docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md` |

## Properties

| Property | Value |
|---|---|
| Transaction-safe | **Yes** — single `BEGIN`/`COMMIT`; all statements are transactional |
| Repeat-safe | **Partial** — `REVOKE`/`GRANT`/`COMMENT`/`ALTER … SET search_path` are repeat-safe; **DROP TRIGGER/FUNCTION are fail-closed on re-apply** via preflight assertions |
| Fail-closed on drift | **Yes** — assertions raise and abort before destructive DDL |

## Lock / concurrency impact

| Statement class | Lock | Duration | Concurrent effect |
|---|---|---|---|
| `REVOKE` / `GRANT` / `COMMENT` | Catalog / function | Brief | Negligible |
| `ALTER FUNCTION … SET search_path` | Function | Brief | Calls wait briefly |
| `DROP TRIGGER` on `contact_messages` | **AccessExclusiveLock** on table | Short | Concurrent contact INSERTs **wait** |
| `DROP TRIGGER` on `registrations` | **AccessExclusiveLock** on table | Short | Concurrent registration INSERTs **wait** |
| `DROP FUNCTION` | Function | Brief | Direct calls fail once dropped |
| Nothing here is non-transaction-safe | — | — | No `CONCURRENTLY`, no `VACUUM FULL` |

## Objects

### Dropped
- Trigger `public.contact_messages.on_contact_message_insert`
- Function `public.process_contact_message()`
- Trigger `public.registrations.on_registration_created`
- Function `public.send_welcome_email()`

### Retained (privilege-changed and/or commented)
- `public.handle_new_user()` — REVOKE `public,anon,authenticated`
- `public.mdz_registrations_assign_registration_id()` — REVOKE `public,anon,authenticated`
- `public.get_wilaya_manager_email(text)` — REVOKE clients; `GRANT service_role`; `search_path=public`
- `public.admin_set_profile_status(uuid,text)` — REVOKE clients; `GRANT service_role`; legacy comment
- `public.mdz_is_platform_admin()` / `mdz_is_wilaya_manager()` / `mdz_caller_wilaya()` — REVOKE **anon** only

### Intentionally unchanged
- `public.resolve_login_identifier(text)` (see design note)
- `public.review_registration_status(text,text,text)`
- Email outbox functions / Worker drain path
- Notification RPCs (`list_my_notifications`, etc.)
- Support ticket RPCs
- `contact_messages` table + INSERT RLS policies
- Signup trigger attachment `auth.users.on_auth_user_created` (kept; only EXECUTE revoked from clients)

## Expected privilege matrix after 017

| Function | anon | authenticated | service_role | public |
|---|---|---|---|---|
| `handle_new_user()` | false | false | *(unchanged / owner)* | false |
| `mdz_registrations_assign_registration_id()` | false | false | *(unchanged / owner)* | false |
| `get_wilaya_manager_email(text)` | false | false | **true** | false |
| `admin_set_profile_status(uuid,text)` | false | false | **true** | false |
| `mdz_is_platform_admin()` | false | **true** | **true** | false* |
| `mdz_is_wilaya_manager()` | false | **true** | **true** | false* |
| `mdz_caller_wilaya()` | false | **true** | **true** | false* |
| `resolve_login_identifier(text)` | **true** (unchanged) | **true** | **true** | — |
| `process_contact_message()` | **absent** | **absent** | **absent** | — |
| `send_welcome_email()` | **absent** | **absent** | **absent** | — |

\*Effective `public` EXECUTE should be false after explicit revoke from `public` role on helpers where previously granted; verify with `017_….verify.sql`.

## Impact analysis

| Flow | Impact |
|---|---|
| **Signup** | **OK** — `on_auth_user_created` → `handle_new_user` retained; client EXECUTE revoked (triggers do not need it) |
| **Registration creation / registration_id** | **OK** — `mdz_registrations_assign_registration_id` trigger retained |
| **Contact form** | **OK** — table INSERT unchanged (`index.html:3548`); legacy webhook trigger removed; **no notification email is claimed or provided** |
| **Approval / rejection** | **OK** — `review_registration_status` untouched; outbox untouched |
| **Notifications** | **OK** — notification RPCs untouched |
| **Member login** | **OK** — `resolve_login_identifier` untouched |
| **Welcome-on-insert** | **Removed misleading NOTICE only** — never sent real mail |
| **Legacy admin_set_profile_status from browser** | **Blocked** (EXECUTE revoked from authenticated) |

## Repository evidence for decisions

| Decision | Evidence |
|---|---|
| Keep `handle_new_user` trigger | `20260719110000_secure_allocate_member_id.sql:25,86-88` |
| Keep reg-id trigger | `014_registration_id_integrity.sql:209-258` |
| Approval mail via outbox not welcome trigger | `012_phase1_quality_elevation.sql:388-405` |
| Contact UI uses table insert not RPC | `index.html:3548` |
| Legacy admin status RPC | `007_review_registration_status.sql:157-245`; app uses `js/mdz-dashboards.mjs:346` → `review_registration_status` |
| Auth helpers | `012_phase1_quality_elevation.sql:48-96`; `015_cut_manager_profiles_role_bridge.sql:52-67` |
| Login RPC | `20260719000000_phase0_member_id_foundation.sql:168-198`; `index.html:2439` |

## Note on `get_wilaya_manager_email` body

Confirmed live: returns manager email, no authorization, externally executable.  
**017 does not invent a replacement SELECT.** It revokes client EXECUTE and sets `search_path = public`. A follow-up may recreate with `search_path = ''` and fully-qualified names **after** Operator exports `pg_get_functiondef`.

## Pre-apply checklist (Owner)

1. Save `pg_get_functiondef` for `process_contact_message()`, `send_welcome_email()`, `get_wilaya_manager_email(text)`.
2. Confirm backup/PITR restore point.
3. Apply `017_harden_reachable_security_definers.sql` in one session.
4. Run `017_….verify.sql`.
5. Smoke: signup, registration insert, contact insert, admin review, login.
