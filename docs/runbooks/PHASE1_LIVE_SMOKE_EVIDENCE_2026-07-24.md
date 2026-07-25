# Phase 1 Live Smoke — Evidence Report

**Date (UTC):** 2026-07-24  
**Branch tip reviewed:** `0561f93` (`cursor/phase1-p0-gate-fixes-4b6e`)  
**Agent environment:** Cloud Agent — **no** `SUPABASE_*` / `EMAIL_OUTBOX_SECRET` / `RESEND_API_KEY` / Wrangler credentials in process env  
**Authority:** Board Build Prompt — smoke only; no product code changes; no Phase 2  

---

## Verdict

| Gate | Result |
|------|--------|
| Code/UI P0–P1 on branch | Closed in prior commits (static/unit) — **not re-tested as product change here** |
| Live Smoke (Must) | **BLOCKED / INCOMPLETE** in this agent run |
| **Phase 1 Verified** | **No** |

**Do not declare Phase 1 production-complete.** Remaining work is **operator live smoke** after deploy of this branch (or merged main) with secrets and migrations applied.

---

## Environment reachability

| Check | Command / observation | Result |
|-------|----------------------|--------|
| Secrets in agent | `SUPABASE_URL`, `SERVICE_ROLE`, `EMAIL_OUTBOX_SECRET`, `RESEND_API_KEY`, CF tokens | **UNSET** — authenticated RPC/cron/Resend smoke impossible here |
| `wrangler whoami` | CLI | **Unavailable / not authenticated** |
| `supabase` CLI | — | **Absent** |
| Egress | Public HTTPS to `mawashidz.com` | Allowed |

---

## Public probes (no secrets) — `https://mawashidz.com`

Executed 2026-07-24T19:09:45Z from the agent.

| # | Scenario | Command (summary) | HTTP / body | Result |
|---|----------|-------------------|-------------|--------|
| P1 | Site up | `GET /` | **200** | **PASS** |
| P2 | Build info | `GET /build-info.json` | **200** — `version=1.10.0`, `commit=d845298b2b8fde373246e622f2b5606820d42dba`, `worker=mawashidz-live`, `builtAt=2026-07-24T14:37:04.116Z` | **PASS** (prod is live) |
| P3 | Tip vs prod | Compare to local `0561f93` | Prod commit **`d845298` ≠ `0561f93`** | **FAIL for “this branch smoke on prod”** — branch not deployed |
| P4 | Outbox wrong path | `POST /api/email-outbox` | **404** | **PASS** (wrong path not registered) |
| P5 | Outbox canonical, no bearer | `POST /api/process-email-outbox` `{}` | **401** `{"error":"unauthorized"}` | **PASS (partial)** — endpoint exists; rejects missing bearer. (**Not** a full EMAIL-003 proof: does not prove secret ≠ service-role; does prove secret is likely configured — unset secret would return **503** `email-outbox-secret-required` per current Worker code on branch; **prod Worker code revision unknown relative to branch**) |
| P6 | Prices API | `GET /api/livestock-prices` | **200** JSON tick | **PASS** (unrelated health) |

### Interpretation of P3

Production currently serves merge tip **`d845298`** (Phase 1 foundation merge era), **not** `0561f93` (email 013 + UI remediation + runbook/CI).  

Therefore:

- Migration **013**, UI remediation, and runbook path fixes are **Not Verified on production**.  
- Full Phase 1 Must smoke against production **requires deploy** of this branch (or main after merge) **after** migrations 010→013, then re-run the checklist below.

---

## Authenticated / ops Must scenarios — status

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| S1 | Confirm migrations `010→011→012→013` on target DB | **BLOCKED** | No Supabase URL/service role in agent |
| S2 | `EMAIL_OUTBOX_SECRET` set and ≠ service role | **BLOCKED** (agent); **PARTIAL hint** on prod (401 not 503) | Cannot read Worker secrets |
| S3 | Deploy Worker with branch tip | **NOT DONE** | Prod commit ≠ branch tip |
| S4 | Set `RESEND_API_KEY` when ready | **BLOCKED** | Key unset in agent; unknown on prod |
| S5 | approve → notification + outbox/email | **BLOCKED** | Needs auth member/admin JWT + DB |
| S6 | reject + reason dialog → notification + outbox | **BLOCKED** | Same |
| S7 | ticket create/reply → staff queue | **BLOCKED** | Same |
| S8 | badge + Open `#admin-dash` / support / request | **BLOCKED** | Needs browser session on deployed build |
| S9 | ≥8 cron cycles without Resend do not exhaust attempts | **BLOCKED** | Needs controlled secret omit + DB inspect |
| S10 | Provider success + mark path / no blind resend | **BLOCKED** | Needs Resend + outbox row IDs |

---

## Operator checklist (to complete Phase 1 Verified)

Run on **staging-equivalent or production** only after:

1. Apply SQL migrations in order: `010` → `011` → `012` → `013`.  
2. Deploy Worker + static assets from tip containing `0561f93` (or later).  
3. Set **distinct** `EMAIL_OUTBOX_SECRET` ≠ service-role; then `RESEND_API_KEY` when delivering mail.

### Smoke commands (fill results)

```bash
ORIGIN=https://mawashidz.com   # or staging
# 1) Confirm deploy tip
curl -sS "$ORIGIN/build-info.json"
# expect commit == deployed SHA

# 2) Authz of outbox
curl -sS -X POST "$ORIGIN/api/process-email-outbox" \
  -H "Authorization: Bearer $EMAIL_OUTBOX_SECRET"
# expect 200 with processed/results when rows exist; or 200 processed:0

curl -sS -X POST "$ORIGIN/api/process-email-outbox" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
# expect 401

# 3) Human E2E (record registration_id, notification id, ticket_code, outbox id):
# - admin/manager approve pending registration → member notification + email_outbox sent/requeued
# - reject with reason dialog → review_reason visible; no window.prompt
# - member creates ticket + replies → appears in ops Support queue
# - Open on #admin-dash notification → admin dashboard
# - Open support/request deep links → correct tabs
```

Record for each: **PASS/FAIL**, timestamp UTC, actor user id (hashed ok), entity IDs, HTTP status, outbox `status` / `attempts` / `provider_message_id`, screenshot or log link.

### Awaiting-Resend attempt policy (S9)

Temporarily omit `RESEND_API_KEY` (staging preferred): drain ≥8 times; confirm row stays claimable (`attempts` not exhausted while `awaiting_resend_api_key`); then restore key and confirm send.

---

## Static / local (already done — not live smoke)

| Check | Result |
|-------|--------|
| `npm run test:ci` on branch | Pass (prior agent runs) |
| `npm run verify:public` | Pass |
| UI-001…012 + EMAIL-001…004 unit/static | Pass on `abd9b78` / `0561f93` |

These **do not** substitute for this report’s live Must table.

---

## Remaining Not Verified (explicit)

1. Migrations **010–013** applied on staging/prod  
2. Worker + site serving commit **≥ `0561f93`**  
3. Distinct live `EMAIL_OUTBOX_SECRET` proven (service-role bearer rejected **and** secret bearer succeeds)  
4. Live Resend delivery (or documented awaiting-key behaviour on staging)  
5. E2E approve/reject → notify + email  
6. E2E ticket → staff queue  
7. Live deep-link Open (`#admin-dash`, support, request) + badge  
8. Live WCAG / device ops density  
9. Break-glass drill; FD-01/02 Decided; ADR-003 — out of scope, still Not Verified  

---

## Phase / product gates

- **Phase 1 Verified:** **No**  
- **Phase 2:** **Forbidden** until Phase 1 Verified  
- **MDZ-PI-\*:** backlog only — not executed  
- **Product code changed in this smoke pass:** **None**

---

## Sign-off

| Role | Status |
|------|--------|
| Build Agent (this run) | Public probes recorded; authenticated Must **BLOCKED** (no secrets); Phase 1 **not** Verified |
| Founder / Ops | Must complete operator checklist and return Evidence to Review Board |

---

## Recheck addendum — 2026-07-24T19:21:33Z

| Check | Result |
|-------|--------|
| Agent tip | `eb45b64` (+ CE working tree) |
| Secrets in agent | Still **UNSET** |
| Prod `/build-info.json` | Still `commit=d845298…` / `builtAt=2026-07-24T14:37:04.116Z` — branch **not** deployed |
| `POST /api/process-email-outbox` no bearer | **401** `unauthorized` (unchanged) |
| `POST /api/email-outbox` | **404** (unchanged) |
| Authenticated Must S1–S10 | Still **BLOCKED** |
| **Live Smoke** | **FAIL / BLOCKED** (explicit) |
| Phase 1 Verified | Still **No** |

Excellence polish (**MDZ-CE-001/002**) is Phase-1-safe chrome/table work that **does not depend** on live providers (Board scope B). It **does not** change this smoke verdict or authorize a Zero Known Defects production claim.

---

## Recheck addendum — 2026-07-25T08:40:00Z (Board Order 0–4)

**Executor:** Cloud Agent (Board review cycle)  
**Branch tip:** `e22f08d` (`cursor/phase1-p0-gate-fixes-4b6e`) — **12 commits ahead of `main` (`d845298`)**  
**Build Prompt issued:** **None** (operator path only)

### Agent constraints (Order 0)

| Constraint | Status |
|------------|--------|
| No new product / CE / MDZ-PI / Phase 2 | **Honoured** — no code changes this run |
| No authenticated smoke without secrets | **Honoured** |
| Secrets in agent env | **UNSET** (`SUPABASE_*`, `EMAIL_OUTBOX_SECRET`, `RESEND_API_KEY`, Wrangler) |

### Static gates on `e22f08d` (Order 4 — parallel, no prod secrets)

| Check | Command | Result |
|-------|---------|--------|
| CI | `npm run test:ci` | **PASS** (2026-07-25) |
| Public sync | `npm run verify:public` | **PASS** |
| Migrations 010–013 present in repo | `ls supabase/migrations/01{0,1,2,3}_*.sql` | **PASS** |

### Public probes — `https://mawashidz.com` (2026-07-25T08:40:00Z)

| # | Scenario | HTTP / body | Result |
|---|----------|-------------|--------|
| P1 | `GET /` | **200** | **PASS** |
| P2 | `GET /build-info.json` | **200** — `commit=d845298…`, `builtAt=2026-07-24T14:37:04.116Z` | **PASS** (site live) |
| P3 | Tip vs prod | Prod **`d845298` ≠ branch `e22f08d`** | **FAIL** — branch **not deployed** |
| P4 | `POST /api/email-outbox` | **404** | **PASS** |
| P5 | `POST /api/process-email-outbox` (no bearer) | **401** `unauthorized` | **PASS (partial)** — endpoint exists; cannot prove secret ≠ service-role without secrets |
| P6 | `GET /api/livestock-prices` | **200** | **PASS** |

### Operator Must table (S1–S10) — unchanged BLOCKED

| # | Step | Status | Notes |
|---|------|--------|-------|
| S1 | Migrations `010→011→012→013` on target DB | **BLOCKED** (agent) | Operator must apply + verify SQL below |
| S2 | `EMAIL_OUTBOX_SECRET` ≠ service role | **BLOCKED** (agent) | Set on Worker; prove 401 with service-role bearer |
| S3 | Deploy tip **≥ `e22f08d`** | **NOT DONE** | Prod still `d845298` |
| S4 | `RESEND_API_KEY` | **BLOCKED** (agent) | Set when ready for delivery |
| S5–S10 | E2E approve/reject/ticket/deep-link/cron | **BLOCKED** (agent) | Requires JWT + deployed tip + S1–S4 |

### Post-migration SQL verification (Operator — run in Supabase SQL Editor after S1)

```sql
-- 010: Phase 1 tables
select to_regclass('public.notifications') is not null as has_notifications,
       to_regclass('public.support_tickets') is not null as has_tickets,
       to_regclass('public.email_outbox') is not null as has_outbox;

-- 011: review notify hooks (function exists)
select proname from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname like 'review_registration%';

-- 012: review_reason + 2-arg privilege helpers + processing lease
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'registrations' and column_name = 'review_reason';
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'email_outbox' and column_name = 'locked_at';
select count(*) filter (where proname = 'mdz_is_platform_admin' and pronargs = 0) as admin_helper_0arg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';

-- 013: provider_message_id + 2-arg claim only (1-arg dropped)
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'email_outbox' and column_name = 'provider_message_id';
select proname, pronargs from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname = 'mdz_claim_email_outbox';
-- expect exactly one row: mdz_claim_email_outbox, pronargs = 2
```

**Acceptance:** all `has_*` true; `review_reason` + `locked_at` + `provider_message_id` columns exist; `mdz_claim_email_outbox` has **pronargs = 2** only.

### Operator curl block (copy-paste after S2–S3)

```bash
export ORIGIN=https://mawashidz.com
export EMAIL_OUTBOX_SECRET='…'          # distinct from service role
export SUPABASE_SERVICE_ROLE_KEY='…'    # for negative test only — never use as outbox bearer

# Deploy tip
curl -sS "$ORIGIN/build-info.json" | jq -r '.commit'
# expect full SHA of deployed tip (≥ e22f08d)

# Secret bearer — expect 200 (processed ≥0)
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$ORIGIN/api/process-email-outbox" \
  -H "Authorization: Bearer $EMAIL_OUTBOX_SECRET" \
  -H "Content-Type: application/json" -d '{"limit":5}'

# Service-role bearer — expect 401
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$ORIGIN/api/process-email-outbox" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{}'

# Unset secret simulation — only on staging: Worker returns 503 email-outbox-secret-required
```

### Verdict (this recheck)

| Gate | Result |
|------|--------|
| Code ready on branch (`e22f08d`) | **YES** — CI + verify:public green |
| Migrations 010–013 in repo | **YES** |
| Applied on prod DB | **UNKNOWN** (operator) |
| Deployed to prod | **NO** (`d845298` still live) |
| Live Smoke Must | **FAIL / BLOCKED** |
| **Phase 1 Verified** | **NO** |

### Board actions required (Order 1 sequence)

1. Apply `010→011→012→013` on target DB → run SQL verification above  
2. Merge/deploy `cursor/phase1-p0-gate-fixes-4b6e` (or `main` after merge) **≥ `e22f08d`**  
3. Set `EMAIL_OUTBOX_SECRET` (≠ service role) on Worker  
4. Set `RESEND_API_KEY` when delivery ready  
5. Execute human E2E checklist (S5–S8) — record PASS/FAIL + entity IDs + UTC  
6. Return stamped evidence → Board declares Verified or issues single Fix-Forward Build Prompt

**Phase 2 / MDZ-PI / product polish:** **FORBIDDEN** until step 6 = all Must PASS.
