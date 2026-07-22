# Production database baseline — MawashiDZ

**Baseline date:** 2026-07-22  
**Project:** `fpjvjfgwbfehhcvdirpy` (`https://fpjvjfgwbfehhcvdirpy.supabase.co`)

This document records **observed production state** and **what we can and cannot prove** about how it got there. It does not invent a migration timeline.

---

## How we tried to find the source of `REVOKE` on `allocate_member_id`

| Evidence type | Result |
|---------------|--------|
| **1. Supabase migration history table** | Not available in this repo. Must be checked in Dashboard (Database → Migrations) or `supabase_migrations.schema_migrations` if you have SQL access. **Not verified here.** |
| **2. Commit / PR that ran it** | Git shows **repo** changes only, not execution on production. Relevant commits: `35a5912` (revoke + triggers in `004_fix_registration_production.sql`), `c714618` (revoke in dated Phase 0 files). **No commit proves** which script was pasted into SQL Editor on prod. |
| **3. SQL Editor history** | Not available to agents. **Owner-only.** |

**Conclusion:** We **cannot** attribute the live revoke to a single file (`001`, `004`, `20260719*`, `20260719110000`, or a one-off manual `REVOKE`) from repository evidence alone.

---

## Verified production behavior (not file provenance)

| Check | Method | Result (as of baseline date) |
|-------|--------|------------------------------|
| `allocate_member_id` blocked for `anon` | `npm run test:security` (live REST) | **PASS** — HTTP 401, permission denied |
| Open read policy `Allow admin read` (`qual = true`) | Operator SQL screenshots | **Removed** manually (~2026-07-21) |
| `user_roles` RLS + `user_roles: self read` | Operator SQL screenshots | **Applied** manually (~2026-07-21) |
| `registrations` SELECT policies for dashboards | Operator workflow | **Pending** `003` at time of baseline; SELECT count was 0 after dropping legacy policy |
| Four duplicate INSERT policies on `registrations` | Operator SQL screenshots | **Present** until `008` is applied |

---

## Objects with unknown or partial provenance

Treat these as **“exists on prod; origin not fully documented”**:

- Exact SQL file (or manual statement) that first **revoked** `EXECUTE` on `public.allocate_member_id(text)` from `anon` / `authenticated`
- Legacy policy names (`Allow admin read`, multiple `Allow public insert*`) — likely manual or pre-repo dashboard work
- Whether any **dated** migration file (`20260718*`, `20260719*`) was ever run **in full** on this database

**`001_compatible_existing_db.sql` is not the source of the current revoke posture:** that file includes `GRANT EXECUTE … TO anon, authenticated` and documents that **004** is expected to revoke it. Production today matches **revoked**, not **001-only**.

---

## Qualified rule: dated migrations vs production

| Old wording | Problem |
|-------------|---------|
| “Dated = archive, **never applied on prod**” | **Too strong.** Live DB shows Phase-0-style security (revoke on `allocate_member_id`) without proof that zero dated SQL ever ran. |

**Use instead:**

1. **Forward-looking:** New changes use the **numeric** chain (`001`–`008+`) and `supabase/migrations/README.md`. Do not add new `20260718*` files.
2. **On this production DB:** Do **not** re-run the full dated stack blindly — overlap with numeric migrations and unknown partial history risks duplicate triggers/policies.
3. **Dated files in git** remain **reference / greenfield / audit** copies of Phase 0 design, not a claim that prod never received any of their statements (revoke, triggers, etc. may match prod without us knowing which file applied them).
4. **When provenance matters:** Query Supabase migration history or record the exact SQL Editor run in this file (append a row to the table below).

### Operator log (fill when you have proof)

| Date | Who | What ran | Evidence |
|------|-----|----------|----------|
| | | | |

---

## Re-answer: does “dated = archive” still hold?

**Partially.**

- **As a repo policy for new work:** Yes — dated naming is **legacy**; numeric is **canonical** (see `007_manual_rls_fixes.sql` header).
- **As a statement about production history:** **No** — we only know **current state** (e.g. revoke works). Some production objects may match dated **or** numeric **or** manual SQL; that is **not** reconstructed here.

**Engineering baseline:** Document and verify **state** (`test:security`, `verify:rls` when `DATABASE_URL` is set), not a guessed narrative. Update this file when migration history or SQL Editor logs settle provenance.
