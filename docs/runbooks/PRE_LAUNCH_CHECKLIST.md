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

**Merge gate:** apply `014`–`016` on production after merge; **run ADR-003 backfill plan first** — [ADR003_USER_ROLES_BACKFILL.md](./ADR003_USER_ROLES_BACKFILL.md) (GATE Founder `has_platform_admin`, then wilaya backfill, then `014`).

---

## Deferred (document only — do not block authz merge)

| ID | Item | Severity | Notes |
|----|------|----------|-------|
| **PL-LAYOUT-001** | `npm run test:layout` fails on viewports **≤620px**: checks `action buttons below menu row` and `login & register grouped` report **missing** | Medium (UX / mobile chrome) | Reproduced on `origin/main` and authz branch (**169/203**). Fix attempted on `cursor/mobile-layout-620-3447` — **not merged yet**. Does not block authz/RLS P0. |
| **PL-ADMIN-001** | Admin dashboard: some pending registrations show **no registration id** (`—`) and **no approve/reject buttons** (example: Akram Douzane), while others have id + actions (example: Kamel Zas / `MDZ-REG-2026-059060`) | High (ops / review integrity) | **Do not fix in this turn.** Investigate tomorrow: why some accounts are created without a complete `registrations` row — auth.users ↔ registrations/profiles link failure? Missing `registration_id` on profile? Pipeline partial success after auth? |
| **PL-CRON-001** | Resend domain **Verified**, but `email_outbox` rows stay `status=pending` / `last_error=NULL` for 15+ minutes despite cron `*/2` | High (email delivery) | **Diagnosed from code — no fix this turn.** See diagnosis below. |

### PL-CRON-001 — code diagnosis (2026-07-26)

| Question | Finding (repo evidence) |
|----------|-------------------------|
| 1. Does `scheduled()` call `processEmailOutbox`? | **Yes.** `worker.mjs` `scheduled` → `runEmailOutbox(env)` → builds `POST` + `Authorization: Bearer ${EMAIL_OUTBOX_SECRET}` → `processEmailOutbox(req, env)`. |
| 2. Claim conditions (`013`) | Claim picks only `status='pending'` **AND** `attempts < 8` **AND** `provider_message_id is null`. Fresh pending rows with null provider id and attempts&lt;8 **are eligible**. |
| 3. Cron gate before claim? | **Yes — hard skip.** `runEmailOutbox`: if `EMAIL_OUTBOX_SECRET` unset → log `email outbox cron skipped` and return **503** without calling claim. Same secret required inside `processEmailOutbox` (bearer must match; must ≠ service role). Missing `SUPABASE_URL` / service role → 503 before/at claim; rows stay untouched. |

**Most likely cause matching `pending` + `last_error=NULL` for 15+ min:** rows are **never claimed**. That pattern fits cron skip (secret) / claim never succeeding / cron not running on the Worker that owns the schedule — **not** a Resend domain failure (a failed send after claim would set `last_error` via `mdz_mark_email_outbox`). Secondary: `attempts >= 8` while still `pending` would also never be claimed (check `attempts` on those rows).

**Operator checks (no secrets in chat):** Worker logs for `email outbox cron skipped` / `claim outbox failed` / `email outbox cron <status>`; SQL: `select id, status, attempts, provider_message_id, last_error, locked_at from email_outbox where status='pending'`.

---

## Other known blockers (outside this PR)

| Item | Notes |
|------|-------|
| Resend domain verification | **Closed ops-side** (Verified) — delivery still blocked until outbox drain works; see PL-CRON-001 |
| Phase 1 live smoke | Not Verified until operator checklist + `status=sent` evidence |
| Remaining layout failures | See PL-LAYOUT-001 |
| Incomplete admin review rows | See PL-ADMIN-001 |
| Outbox cron not draining | See PL-CRON-001 |
