# Pre-launch checklist — MawashiDZ

**Status:** Living operator list (not a product roadmap)  
**Rule:** No public launch until every **High** item is closed with evidence (دستور العمليات §20).  
**Related:** [TECHNICAL_DEBT_REGISTER.md](../constitution/TECHNICAL_DEBT_REGISTER.md) · branch `cursor/prelaunch-p0-authz-rls-3447`

---

## High risk (authz / RLS / inbox)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Signup privilege escalation (`role`/`status` from metadata + `profiles.role` bridge) | **Done on branch** | Migration `014` + client gates; `test:ci` incl. `migration-014` + `auth-surface-guard` |
| 2 | INSERT policies reverted to `WITH CHECK (true)` after `009` | **Done on branch** | Migration `015`; `migration-015-insert-hardening.test.mjs` |
| 3 | Contact/feedback blind inbox (TD-013) | **Done on branch** | Migration `016` admin SELECT + admin inbox UI; `migration-016` + `admin-inbox` tests |

**Merge gate:** apply `014`–`016` on production after merge; backfill `user_roles` for live wilaya managers before `014` goes live.

---

## Deferred (document only — do not block authz merge)

| ID | Item | Severity | Notes |
|----|------|----------|-------|
| **PL-LAYOUT-001** | `npm run test:layout` fails on viewports **≤620px**: checks `action buttons below menu row` and `login & register grouped` report **missing** | Medium (UX / mobile chrome) | Reproduced on `origin/main` and authz branch (**169/203**). Fix attempted on `cursor/mobile-layout-620-3447` — **not merged yet**. Does not block authz/RLS P0. |
| **PL-ADMIN-001** | Admin dashboard: some pending registrations show **no registration id** (`—`) and **no approve/reject buttons** (example: Akram Douzane), while others have id + actions (example: Kamel Zas / `MDZ-REG-2026-059060`) | High (ops / review integrity) | **Do not fix in this turn.** Investigate tomorrow: why some accounts are created without a complete `registrations` row — auth.users ↔ registrations/profiles link failure? Missing `registration_id` on profile? Pipeline partial success after auth? |

---

## Other known blockers (outside this PR)

| Item | Notes |
|------|-------|
| Resend domain verification | Email outbox drain may return HTTP 200 while rows stay non-`sent` until `mawashidz.com` verified |
| Phase 1 live smoke | Not Verified until operator checklist + `status=sent` evidence |
| Remaining layout failures | See PL-LAYOUT-001 |
| Incomplete admin review rows | See PL-ADMIN-001 |
