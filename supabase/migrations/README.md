# Supabase migrations — MawashiDZ

**Last verified:** 2026-07-22

## Canonical naming

This repo has two conventions:

| Convention | Examples | Status |
|------------|----------|--------|
| **Numeric** | `001` … `008` | **Canonical** — use for all new migrations |
| **Dated** | `20260718220000_*` | Legacy Phase 0 only — do not add new dated files |

The decision is binding from `007_manual_rls_fixes.sql` (file header). Any new dated-style migration must be renamed to numeric before merge, or that note must be updated to reverse the policy.

## Recommended order (existing production DB)

1. `001_compatible_existing_db.sql` — or align via `004` if already partially applied  
2. `002_user_roles_rls.sql`  
3. `004_fix_registration_production.sql` — registration insert + triggers  
4. `005_admin_approve_profile.sql` — if using admin approve RPC  
5. `006_registrations_unique.sql` — dedupe + unique indexes  
6. `007_manual_rls_fixes.sql` — drop legacy open read; lock `user_roles` (idempotent; prod may already have this)  
7. `003_dashboard_rls.sql` — dashboard **SELECT** policies (after founder + `user_roles`)  
8. `008_consolidate_insert_policies.sql` — one INSERT policy (when ready)

Do **not** run the dated `20260718*` path on the same database without reviewing overlap with `001`–`008`.

## Phase 0 dated path (greenfield / separate DB only)

- `20260718220000_align_existing_schema.sql`  
- `20260719000000_phase0_member_id_foundation.sql`  
- `20260719110000_secure_allocate_member_id.sql`  

See item **10** analysis in launch docs / agent handoff before merging paths.
