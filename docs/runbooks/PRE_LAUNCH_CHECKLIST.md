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
| **PL-AUTH-001** | Logged-in chrome (Logout / حسابي) but **حسابي** shows `تعذر إتمام العملية الآن` + Login; login modal can still show **تم الدخول بنجاح**; no **لوحة الإدارة** for reported Founder email(s) while `alkhuta3@gmail.com` registered as breeder+admin | High (account open / authz UX) | **Diagnosed from code — ops SQL needed.** See diagnosis below. Note: `saadbenmoad7@gmail.com` (member report) vs `sadbenmoad7@gmail.com` (Cursor owner) may be **two different** accounts. Registration role tabs are membership labels only (ADR-003 A). |

### PL-AUTH-001 — code diagnosis (2026-07-26)

**What the Founder sees (screenshots + report):** Session looks active (Logout visible), but حسابي opens the account modal with generic error + «دخول», or the login form still shows «تم الدخول بنجاح». No admin panel entry. Second email `alkhuta3@gmail.com` was registered as موال + إداري.

**How the UI actually decides (repo):**

| Surface | Gate |
|---------|------|
| Logout / حسابي in header & drawer | `isAuthenticated()` = localStorage has `access_token` only |
| Account dashboard body | `openAccount()` → `fetchMyProfile` **must** return a `profiles` row; then `fetchMyRoles` |
| **لوحة الإدارة** buttons | `dashRoleFlag('admin')` / `hasAdminAccess` → `user_roles` ∈ `{admin, founder, super_admin}` only |
| Registration «إداري / مدير ولاية» tabs | **Membership label** (`profiles.role`) for member_id / UX — **does not** grant admin panel |

**Why «تم الدخول بنجاح» can appear while login fields are still open:** Login submit sets `loginState` to success, saves session, closes login, then `await openAccount()`. If profile load fails, account modal shows error + «دخول». Clicking that reopens `openLogin()` **without clearing** `loginState` → stale success text next to empty fields, while Logout remains (session still stored). (UX clear of `loginState` on `openLogin` is a small client fix on this branch; does not restore missing profile/roles.)

**Why account modal shows `تعذر إتمام العملية الآن`:** `openAccount` catch runs `authErrorArabic()`. When profile is missing it throws `t('authErrProfileMissing')`, but that Arabic string does not match session/network patterns → falls through to **`authErrGeneric`**. So the generic message often means **no `profiles` row for this auth user** (or profile fetch 4xx mapped poorly), not “no admin role”.

**Why no لوحة الإدارة on `saadbenmoad7`:** Admin chrome is hidden unless `mdzUserRoles` already contains platform elevation. Choosing «إداري» at signup never inserts `user_roles`. Expectation: that account has **no** (or unread) `user_roles` admin/founder row. `alkhuta3` only has admin power if someone granted `user_roles` for **that** user id — registration as admin alone is insufficient.

**Operator SQL (Supabase SQL Editor — no secrets; do not paste results with tokens into chat):**

```sql
select
  p.id,
  p.email,
  p.role as profile_role,
  p.status as profile_status,
  p.member_id,
  p.registration_id,
  coalesce(array_agg(distinct ur.role) filter (where ur.role is not null), '{}') as user_roles,
  exists (
    select 1 from public.user_roles x
    where x.user_id = p.id and x.role in ('admin', 'founder', 'super_admin')
  ) as has_platform_admin,
  (select count(*) from auth.users au where au.id = p.id) as auth_user_exists
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
where lower(p.email) in (
  lower('saadbenmoad7@gmail.com'),
  lower('sadbenmoad7@gmail.com'),
  lower('alkhuta3@gmail.com')
)
group by p.id, p.email, p.role, p.status, p.member_id, p.registration_id
order by p.email;

-- Orphan auth users (login works, profile missing → PL-AUTH-001 account failure)
select id, email, created_at, email_confirmed_at
from auth.users
where lower(email) in (
  lower('saadbenmoad7@gmail.com'),
  lower('sadbenmoad7@gmail.com'),
  lower('alkhuta3@gmail.com')
)
and not exists (select 1 from public.profiles p where p.id = auth.users.id);
```

| Finding | Action (Founder only — not auto-applied) |
|---------|------------------------------------------|
| Auth user, **no** `profiles` row | Explains حسابي error; repair profile/registration link (ops), then retest حسابي |
| Profile exists, `has_platform_admin=false` on intended Founder email | Explains missing لوحة الإدارة; grant `founder`/`admin` in `user_roles` for **one** chosen Founder account only |
| `alkhuta3` has elevation, `saad…` / `sad…` do not (or reverse) | Dual/triple Gmail accounts — pick one Founder for GATE / ops; do not expect all to be admin |
| Both/all lack elevation | Registration «إداري» was membership only — grant elevation manually |
| `saadbenmoad7` vs `sadbenmoad7` both exist | Treat as **separate** accounts until proven otherwise |

**Related:** ADR-003 GATE must use the real Founder production `user_id` — see [ADR003_USER_ROLES_BACKFILL.md](./ADR003_USER_ROLES_BACKFILL.md). Do **not** apply migration `014` until GATE `has_platform_admin=true` on that account.

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
| Account open / dual-email admin confusion | See PL-AUTH-001 |
