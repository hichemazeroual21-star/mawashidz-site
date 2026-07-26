# Plan — Migration 014 registration_id integrity (review before apply)

**Branch:** `cursor/registration-id-integrity-3447`  
**Mutation SQL:** `supabase/migrations/014_registration_id_integrity.sql`  
**Dry-run (read-only):** `docs/reports/sql/014_registration_id_dry_run.sql`  
**Apply:** Founder only, after line-by-line review. Agent will **not** apply to production.

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
| 0 | Confirm SQL Editor project = production MawashiDZ (`fpjvjfgwbfehhcvdirpy`) | no |
| 1 | Run **dry-run** `014_registration_id_dry_run.sql` | **no** |
| 2 | Review summary buckets + sample rows + duplicate list | no |
| 3 | Founder approval | no |
| 4 | Run full `014_registration_id_integrity.sql` | yes |
| 5 | Re-run dry-run: `recover_from_message` + `will_generate` → 0 | no |
| 6 | Smoke: لوحة الإدارة → `MDZ-REG-…` + Approve/Reject visible | no |

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
7. **No DELETE / DROP TABLE** on `registrations`.

---

## 6. Out of scope

- Dashboard hide-Approve-when-missing-`registration_id` (correct; unchanged).
- Orphan account `sadbenmoad7` registration row (ops / natural re-register).
- Auto-apply from CI/agent.
