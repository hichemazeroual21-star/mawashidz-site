# DB-DRIFT-AUDIT-01 — production audit subsystem absent

**Observed:** 2026-08-02  
**Scope:** read-only catalog inventory supplied by the Owner  
**Decision:** repair forward with migration 020; do not replay migration 008

## Proven production state

- `public.admin_audit_log`: absent.
- `public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)`: absent.
- `public.admin_list_audit_log(integer)`: absent.
- `public.mdz_assert_admin_caller()`: absent.
- `public.user_roles`: present with RLS enabled.
- `public.mdz_schema_migrations`: present with RLS enabled.
- `public.review_registration_status(text,text,text)`: present, SECURITY DEFINER, and its body references the missing audit writer.
- `public.set_support_ticket_status(bigint,text)`: present, SECURITY DEFINER, and its body references the missing audit writer.
- `public.admin_set_profile_status(uuid,text)`: the older two-argument function is present; it does not reference the audit writer.
- The role-management RPCs from migration 008 are absent.

## Impact

The privileged review and ticket-status functions catch `undefined_function`, so the business mutation succeeds while the forensic audit event is silently discarded. Repository documentation marked TD-008 and TD-019 closed, but production evidence reopens both.

## Repair boundary

Migration 020 restores only the shared audit table, admin-read RLS policy, internal writer, admin reader, explicit ACLs, post-conditions, and migration-ledger record. It deliberately does not replay 008 and does not recreate role-management RPCs, replace the older `admin_set_profile_status` overload, alter business rows, or change the support RPC ACL surface.

## Deployment hold

The migration is repository-only until separately reviewed and explicitly applied by the Owner. Preserve the raw output of `020_restore_admin_audit.verify.sql` after application, then perform one authorized operator action and confirm exactly one matching audit row.
