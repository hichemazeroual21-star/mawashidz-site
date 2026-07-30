# Migration 017 — Reachable SECURITY DEFINER remediation

**Status:** reviewable package only — **do not apply to production** until Owner Go gates pass.  
**Branch:** `cursor/migration-017-definer-trigger-harden-9060`  
**Files:**

| Artifact | Path |
|---|---|
| Migration | `supabase/migrations/017_harden_reachable_security_definers.sql` |
| Partial manual rollback | `supabase/migrations/017_harden_reachable_security_definers.partial-manual-rollback.sql` |
| Verification | `supabase/migrations/017_harden_reachable_security_definers.verify.sql` |
| Login design (out of band) | `docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md` |

**No** `017_….rollback.sql` stub — only the partial-manual-rollback file exists.

## Properties

| Property | Value |
|---|---|
| Transaction-safe | **Yes** — single `BEGIN`/`COMMIT` |
| Repeat-safe | **Partial** — `REVOKE`/`GRANT`/`COMMENT`/`ALTER … SET search_path` repeat-safe; **DROP TRIGGER/FUNCTION fail-closed on re-apply** via preflight assertions (no silent `DROP IF EXISTS`) |
| Fail-closed on drift | **Yes** — catalog assertions abort before destructive DDL |
| Data changes | **None** |

## Confirmed facts (live evidence)

1. External roles cannot `CREATE` in schema `public` (`anon`/`authenticated`/`service_role` = false).
2. Active triggers (pre-017): `auth.users.on_auth_user_created→handle_new_user`; `registrations.mdz_registrations_assign_registration_id`; `contact_messages.on_contact_message_insert→process_contact_message`; `registrations.on_registration_created→send_welcome_email`.
3. Live bodies: wilaya email SELECT (fully-qualified `public.*`); contact webhook placeholder; welcome NOTICE no-op; legacy `admin_set_profile_status(uuid,text)` with profiles.role bridge; `resolve_login_identifier` required for login (unchanged in 017).

## Objects dropped

| Object | Reason |
|---|---|
| Trigger `public.contact_messages.on_contact_message_insert` | Placeholder webhook; not replaced with HTTP |
| Function `public.process_contact_message()` | Same |
| Trigger `public.registrations.on_registration_created` | Misleading NOTICE no-op |
| Function `public.send_welcome_email()` | Same |

**Contact inserts into `public.contact_messages` are preserved.** Contact notification delivery is **intentionally deferred** to the supported `email_outbox` architecture. **Do not imply contact notifications currently work** after 017.

## Objects retained

| Function | 017 action |
|---|---|
| `handle_new_user()` | REVOKE `public,anon,authenticated`; trigger kept; body unchanged |
| `mdz_registrations_assign_registration_id()` | REVOKE `public,anon,authenticated`; trigger kept; body unchanged |
| `get_wilaya_manager_email(text)` | REVOKE clients; GRANT `service_role`; `search_path=''` (behaviour-preserving); body unchanged |
| `admin_set_profile_status(uuid,text)` | REVOKE clients; GRANT `service_role`; legacy COMMENT; body unchanged |
| `mdz_is_platform_admin()` / `mdz_is_wilaya_manager()` / `mdz_caller_wilaya()` | REVOKE `public,anon`; GRANT `authenticated,service_role`; bodies unchanged |
| `resolve_login_identifier(text)` | **Unchanged** (design note only) |
| `review_registration_status(...)` | **Unmodified** |

## Privilege changes (expected ACL matrix after 017)

Effective privilege verification uses `has_function_privilege(role, fn, 'EXECUTE')` for `public`, `anon`, and `authenticated` (and `service_role` where 017 asserts it). `aclexplode` is supporting evidence only — not a substitute for `has_function_privilege`.

| Function | public | anon | authenticated | service_role |
|---|---|---|---|---|
| `handle_new_user()` | **false** | **false** | **false** | *(owner / prior)* |
| `mdz_registrations_assign_registration_id()` | **false** | **false** | **false** | *(owner / prior)* |
| `get_wilaya_manager_email(text)` | **false** | **false** | **false** | **true** |
| `admin_set_profile_status(uuid,text)` | **false** | **false** | **false** | **true** |
| `mdz_is_platform_admin()` | **false** | **false** | **true** | **true** |
| `mdz_is_wilaya_manager()` | **false** | **false** | **true** | **true** |
| `mdz_caller_wilaya()` | **false** | **false** | **true** | **true** |
| `resolve_login_identifier(text)` | *(unchanged)* | **true** | **true** | **true** |
| `process_contact_message()` | **absent** | **absent** | **absent** | **absent** |
| `send_welcome_email()` | **absent** | **absent** | **absent** | **absent** |

`aclexplode` is supporting documentation only (verify section 2).

### Owner verification (no hardcoded role)

Migration 017 does **not** change function ownership. Post-apply verify compares each retained function’s live owner to the `owner_name` recorded in the mandatory Go/No-Go pre-apply capture. Paste into `captured_owners` in `017_….verify.sql` keyed by full canonical `function_signature` (`public.name(args)`), independently of the `target_functions` set (`LEFT JOIN` only). Any missing / empty / placeholder / unmatched signature → `FAIL captured owner missing …`. Any live owner mismatch → `FAIL owner changed unexpectedly`. Do not hardcode `postgres` or any other role name as the expected owner.

## Expected search_path matrix (retained SECURITY DEFINER in 017 scope)

| Function | Current (repo / typical live) | Fully-qualified refs? | 017 changes search_path? | Hardening deferred? |
|---|---|---|---|---|
| `handle_new_user()` | `public` (repo create) | Partial / trigger body | **No** | **Yes** — defer full DEFINER harden |
| `mdz_registrations_assign_registration_id()` | `public` (014) | Uses `public.` in places | **No** | **Yes** |
| `get_wilaya_manager_email(text)` | often unset / ambient | **Yes** — live body uses `public.wilaya_managers` / `public.wilayas` | **Yes → `''`** | Body rewrite deferred; path lock only |
| `admin_set_profile_status(uuid,text)` | `public` (007) | Mixed | **No** | **Yes** |
| `mdz_is_platform_admin()` | `public` (012/015) | Mixed | **No** | **Yes** |
| `mdz_is_wilaya_manager()` | `public` | Mixed | **No** | **Yes** |
| `mdz_caller_wilaya()` | `public` | Mixed | **No** | **Yes** |
| `resolve_login_identifier(text)` | `public` (phase0) | Mixed | **No** (out of scope) | Separate design |

017 is **not** expanded into a full SECURITY DEFINER hardening migration. Only `get_wilaya_manager_email` gets `search_path` changed because the reviewed live body proves `search_path=''` is behaviour-preserving. Migration asserts the body still contains `public.wilaya_managers` and `public.wilayas` before applying that SET.

## Impact analysis

| Flow | Impact |
|---|---|
| **Signup** | **OK** — `on_auth_user_created` → `handle_new_user` retained; client EXECUTE revoked (triggers do not need it) |
| **Registration / registration_id** | **OK** — assign trigger retained |
| **Contact form** | **OK** — table INSERT unchanged; webhook removed; **no claim that contact notifications work** |
| **Approval / rejection** | **OK** — `review_registration_status` + outbox untouched |
| **Welcome-on-insert** | **Removed NOTICE no-op only** — never real mail |
| **Legacy admin_set_profile_status from browser** | **Blocked** |
| **Auth helpers from anon** | **Blocked** (PUBLIC+anon revoked) |
| **Member login** | **OK** — `resolve_login_identifier` untouched |
| **Wilaya manager email via client RPC** | **Blocked** |

## Repository evidence

| Decision | Evidence |
|---|---|
| Keep `handle_new_user` trigger | `20260719110000_secure_allocate_member_id.sql:25,86-88` |
| Keep reg-id trigger | `014_registration_id_integrity.sql:209-258` |
| Approval mail via outbox not welcome trigger | `012_phase1_quality_elevation.sql:388-405` |
| Contact UI uses table insert not RPC | `index.html:3548` |
| Legacy admin status RPC | `007_review_registration_status.sql:157-245`; app → `review_registration_status` (`js/mdz-dashboards.mjs`) |
| Auth helpers | `012_phase1_quality_elevation.sql:48-96`; `015_cut_manager_profiles_role_bridge.sql:52-67` |
| Login RPC | `20260719000000_phase0_member_id_foundation.sql:168-198`; `index.html:2439` |

## Pre-production capture (mandatory Go / No-Go)

Before production apply, capture and retain raw output of:

- `pg_get_functiondef` for all 017-touched functions (especially drop targets + wilaya email)
- `pg_get_triggerdef` for drop targets + retained required triggers
- `proacl`, `proconfig`, owner, `prosecdef`

Populate / annotate `017_….partial-manual-rollback.sql` from that capture. Paste captured `owner_name` values into `captured_owners` in `017_….verify.sql` before post-apply acceptance. **Without capture → No-Go** (no full restore capability; owner verification cannot pass).

Capture SQL is embedded in the partial-manual-rollback header.

## Repository visibility

This repository is currently **public**. Security design notes (for example `RESOLVE_LOGIN_IDENTIFIER_DESIGN.md`) describe deferred vulnerabilities. **Recommended:** make the repository private before production if possible. Deleting documents in later commits does **not** remove them from Git history.

## Execution gates (before production)

1. Run `017_….verify.sql` against **Production** and save raw output (pre-state baseline; expect FAIL on post-017 absence/privilege rows).
2. Capture all required definitions (Go/No-Go).
3. Confirm preconditions (signatures, triggers, wilaya body fully-qualified refs, no CREATE grants for external roles).
4. Apply `017_harden_reachable_security_definers.sql` (Owner only — **this package does not apply**).
5. Paste captured `owner_name` values into `captured_owners` in `017_….verify.sql`, then run verification again; **every `check_result` = OK**; preserve raw outputs.

Acceptance requires: expected pre-state, expected post-state, all final verification = OK, raw outputs preserved.

## Rollback label

`017_….partial-manual-rollback.sql` is **partial manual rollback only** — not a complete restoration. Full restoration requires pre-apply capture.
