# Plan — Migration 014 registration_id integrity (review before apply)

**Branch:** `cursor/registration-id-integrity-3447`  
**Mutation SQL:** `supabase/migrations/014_registration_id_integrity.sql`  
**Dry-run:** `docs/reports/sql/014_registration_id_dry_run.sql`  
**Pre-apply backup (operator):** `docs/reports/sql/014_pre_apply_backup.sql`  
**Rollback (operator):** `docs/reports/sql/014_rollback.sql`  
**Apply:** Founder only, after line-by-line review. Agent will **not** apply to production.

Backup / rollback live under `docs/reports/sql/` only — **never** under `supabase/migrations/`.

---

## 1. Intent

Unlock admin/manager Approve/Reject for real pending rows that currently have blank/NULL `registration_id`, without rewriting rows that already have a valid id, and without inventing ids for test rows.

Root-cause prevention: server `BEFORE INSERT` trigger assigns an id only when the client omits it.

---

## 2. Test-data definition (explicit)

A row is a **test registration email** when `email` matches (case-insensitive):

| Marker | Example |
|--------|---------|
| `example.com` | `user@example.com` |
| `.local` | `a@mdz.local` |
| `probe` | `probe+1@…` / `…probe…` |
| `e2e` | `e2e-runner@…` |

A row is **eligible for mutation** only by **positive inclusion**:

```
status ∈ {pending, new}   -- blank/NULL status treated as pending
AND email non-blank
AND NOT test-email markers above
AND registration_id missing (NULL or blank/whitespace)
```

Anything else with a missing id is **left untouched** (including unknown future test patterns, approved/rejected history, blank emails).

---

## 3. Execution order (human)

| Step | Action | Writes? |
|------|--------|---------|
| **0** | Confirm SQL Editor project = production MawashiDZ (`fpjvjfgwbfehhcvdirpy`) | no |
| **0b** | Run **backup** `014_pre_apply_backup.sql` (creates `registrations_regid_backup_014` if absent; never overwrites) | yes (snapshot table only) |
| 1 | Run **dry-run** `014_registration_id_dry_run.sql` | helper DDL + selects |
| 2 | Review summary buckets + sample rows + duplicate list | no |
| 3 | Founder approval | no |
| 4 | Run full `014_registration_id_integrity.sql` | yes |
| 5 | Re-run dry-run: `recover_from_message` + `will_generate` → 0 | no |
| 6 | Smoke: لوحة الإدارة → `MDZ-REG-…` + Approve/Reject visible | no |

### Rollback procedure (only if needed after apply)

1. Confirm still on production project `fpjvjfgwbfehhcvdirpy`.
2. Run `docs/reports/sql/014_rollback.sql`.
3. It restores `registration_id` to NULL **only** when:
   - row is in `registrations_regid_backup_014` with previous id NULL/blank
   - status is still `pending` / `new`
   - current id is not referenced by `profiles`, `support_tickets`, review columns (`reviewed_at` / `reviewed_by`), or `admin_audit_log`
4. Then drops trigger, helpers, unique index, and sequence.
5. Backup table is **kept** for audit.
6. Re-run dry-run and inspect leftover `backup_rows_still_with_id` (rows skipped as unsafe).

---

## 4. Dry-run buckets (what you must see)

| Bucket | Meaning | Mutated by 014? |
|--------|---------|-----------------|
| `recover_from_message` | Real pending, missing id, valid free `MDZ-REG-*` in `message` JSON | yes → restore |
| `will_generate` | Real pending, missing id, no usable message id | yes → generate |
| `excluded_as_test` | Missing id + test email markers | **no** |
| `recover_blocked_collision` | Message id exists on another row | generate path if still real pending |
| `missing_not_eligible` | Missing id but not real-pending | **no** |
| `already_has_id` | Non-blank `registration_id` | **no** |

---

## 5. Guarantees to verify in SQL review

1. **Positive inclusion** — mutations gated by `mdz_is_real_pending_registration(status, email)`, not “all rows except test”.
2. **Missing-id guard on every UPDATE** — `mdz_registration_id_missing(registration_id)` (NULL **or** blank).
3. **Idempotent** — re-run yields 0 further changes for already-filled rows.
4. **No overwrite of good ids** — rows with non-blank `registration_id` never enter UPDATE sets.
5. **Uniqueness** — generator/`NOT EXISTS` loop; `raise exception` after 20 collisions; partial unique index `registrations_registration_id_uidx` when no pre-existing dupes.
6. **Trigger does not clobber client** — early `return new` when `NEW.registration_id` is present/non-blank.
7. **Safe JSON extract** — `mdz_msg_registration_id(text)` returns NULL on malformed JSON (no abort).
8. **Sequence seed safe at zero** — `setval(..., greatest(max_n, 1), max_n > 0)` (empty DB does not throw).
9. **No DELETE / DROP TABLE** on `registrations` in the mutation migration.
10. **Backup never overwrites** — `CREATE TABLE IF NOT EXISTS registrations_regid_backup_014 AS …`.

---

## 6. Out of scope

- Dashboard hide-Approve-when-missing-`registration_id` (correct; unchanged).
- Orphan account `sadbenmoad7` registration row (ops / natural re-register).
- Auto-apply from CI/agent.
- Merge / deploy by agent.
