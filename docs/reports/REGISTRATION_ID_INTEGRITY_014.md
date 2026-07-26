# Migration 014 — registration_id integrity

**Branch:** `cursor/registration-id-integrity-3447`  
**Mutation:** `supabase/migrations/014_registration_id_integrity.sql`  
**Dry-run (read-only first):** `docs/reports/sql/014_registration_id_dry_run.sql`  
**Full plan for reviewers:** `docs/reports/REGISTRATION_ID_INTEGRITY_014_PLAN.md`  
**Apply:** manual on production Supabase after Founder review — **not** auto-applied by CI/agent.

## What it does

1. **Backfill from JSON** — restore `registration_id` from `message::jsonb ->> 'registration_id'` when valid `MDZ-REG-*`, row is **real pending**, id missing, and value does not collide.
2. **Generate** — `MDZ-REG-YYYY-NNNNNN` via sequence for remaining **positively eligible** real pending rows only (not “everything except test”).
3. **BEFORE INSERT trigger** — assign only when client omits `registration_id` (client value preserved).
4. **Partial unique index** on non-blank `registration_id` when no duplicates remain.

Does **not** change dashboard logic that hides approve/reject when `registration_id` is blank.

## Operator apply checklist

1. Confirm SQL Editor project = production MawashiDZ (`fpjvjfgwbfehhcvdirpy`).
2. Run **backup** `docs/reports/sql/014_pre_apply_backup.sql` (never overwrites existing snapshot).
3. Run **dry-run** and review bucket counts + samples.
4. Founder approval.
5. Run full `014_registration_id_integrity.sql`.
6. Re-run dry-run → actionable buckets at 0 for real pending.
7. Smoke: لوحة الإدارة → `MDZ-REG-…` + Approve/Reject.

Rollback (operator only): `docs/reports/sql/014_rollback.sql` — see plan.
