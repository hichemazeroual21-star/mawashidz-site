# Cloudflare deploy topology audit — 2026-07-26

**Scope:** verify/document only. No Worker deletes. No production migrations.  
**Agent CF API auth:** none (`wrangler whoami` → not authenticated). Dashboard settings below must be confirmed by Founder in UI.

---

## Executive finding

**RC#1 is REOPENED (operational evidence).**

Live production is serving an **unmerged feature-branch commit**, not `main`.

| Probe | Value |
|-------|--------|
| `https://mawashidz.com/build-info.json` | `worker=mawashidz-live`, `commit=c9d4325b90ee23d0dedf412f0cfd269a8753ca85`, `builtAt=2026-07-26T14:43:38.598Z` |
| `origin/main` tip | `6b5ca834f69d86b265eeb205aed0c0a1fd07b2d8` (2026-07-25) |
| Is `c9d4325` ancestor of `main`? | **No** |
| Branch containing `c9d4325` | `cursor/registration-id-integrity-3447` only |
| Feature commit time | `2026-07-26 14:21:37 UTC` |
| Live `builtAt` | `2026-07-26T14:43:38Z` (~22 min after push) |

`mawashidz-live.*.workers.dev/build-info.json` matches **byte-for-byte** the apex domain build-info (same commit + same `builtAt`). That is a **full production promotion** (`wrangler deploy` semantics), not a preview-only `versions upload`.

Policy in `DEPLOYMENT.md` (owner-verified 2026-07-22) required:

| Setting | Required |
|---------|----------|
| Production branch | `main` |
| Production deploy command | `npx wrangler deploy` |
| Non-production / Version command | `npx wrangler versions upload` |

**Current live tip contradicts that split:** a `cursor/*` push replaced production traffic on `mawashidz-live`.

---

## 1) Production Git → Cloudflare Builds binding

### Evidence available without dashboard

| Check | Result |
|-------|--------|
| Intended config (docs) | Production branch = `main` |
| Live artifact vs `main` | **Mismatch** — live ≠ `main` |
| Timing | Feature push → build ~22m later → live tip = feature SHA |
| Preview alias for same branch | `https://cursor-registration-id-integrity-3447-mawashidz-live.hichemazeroual21.workers.dev/build-info.json` identical to production tip |

### Owner must confirm in Cloudflare UI (cannot be read from agent)

Open **Workers & Pages → `mawashidz-live` → Settings → Builds** (or connected Git build config) and screenshot/record:

1. **Production branch** = `main` (if anything else → fix immediately).
2. **Deploy command** (production) = `npx wrangler deploy`.
3. **Non-production / Version command** = `npx wrangler versions upload` (**not** `deploy`).
4. **Build command** = `npm ci && npm run build`.
5. Whether “builds for non-production branches” is enabled (OK only if Version command is `versions upload`).

**Correction if Version command is `deploy`:** set it back to `npx wrangler versions upload`, then redeploy **from `main`** so live tip returns to `6b5ca83` (or newer `main`) until the registration PR is intentionally merged.

---

## 2) Workers inventory (public probes)

Account subdomain observed: `*.hichemazeroual21.workers.dev`.

### A) `mawashidz-live` — **production**

| Item | Evidence |
|------|----------|
| Apex `mawashidz.com` | `build-info.worker = mawashidz-live` |
| `mawashidz-live.hichemazeroual21.workers.dev` | Same build-info as apex |
| `/api/process-email-outbox` POST | `401 {"error":"unauthorized"}` (secret configured; bearer required) |
| Cron (repo config) | `wrangler.jsonc` → `*/2 * * * *` (live schedule must be confirmed in Worker Triggers UI) |
| Custom domain route | **Must be this Worker only** for `mawashidz.com/*` |

### B) `mawashidz-site` — legacy / non-apex

| Item | Evidence |
|------|----------|
| `mawashidz-site.hichemazeroual21.workers.dev/` | HTTP 200, HTML site shell (version markers include `v1.10.0`) |
| `/build-info.json` | **404** (no current build-info artifact) |
| `/api/process-email-outbox` POST | `503 {"error":"email-outbox-secret-required"}` — different code/secret posture than live |
| Serves `mawashidz.com`? | **No evidence** — apex build-info names `mawashidz-live` only |
| Cron | **Unknown without dashboard** — do not delete until Triggers + Domains & Routes show empty |
| Cleanup posture | Safe to disable Builds / leave idle **after** confirming no custom domains, no routes, no crons |

### C) `plain-hat-3f18` — unrelated / stale scaffold?

| Item | Evidence |
|------|----------|
| `plain-hat-3f18.hichemazeroual21.workers.dev/` | HTTP 200, large HTML (~693 KB), not the current modular build-info worker |
| `/build-info.json` | **404** |
| `/api/process-email-outbox` | **404** (no outbox route) |
| Serves `mawashidz.com`? | **No evidence** |
| Cron / routes | **Unknown without dashboard** — do not delete until confirmed empty |

### Preview versions (same Worker name, not separate Workers)

| Preview URL | build-info |
|-------------|------------|
| `cursor-registration-id-integrity-3447-mawashidz-live…` | Same as prod tip `c9d4325` / `14:43Z` (because prod was overwritten) |
| `cursor-auth-flow-diagnostic-3447-mawashidz-live…` | Older preview: `commit=fbec1f9`, `builtAt=2026-07-26T11:32:25Z` |

---

## 3) Deletion rule (unchanged)

**Do not delete** `mawashidz-site` or `plain-hat-3f18` until Founder confirms in Cloudflare for each:

- [ ] Domains & Routes: no `mawashidz.com` / no other production hostnames  
- [ ] Triggers: no cron  
- [ ] No active consumers / no linked Builds promoting traffic  

Document screenshots, then disable Builds → idle observation → delete only with Founder approval.

---

## 4) Immediate recommended actions (Founder — config only)

1. **Re-verify RC#1** Build settings on `mawashidz-live` (table above).  
2. If non-prod command is `wrangler deploy` → change to `versions upload`.  
3. Trigger a **production deploy from `main`** so apex returns to `main` tip (today `6b5ca83`) unless Founder explicitly wants the feature branch live.  
4. Keep `mawashidz.com` route **only** on `mawashidz-live`.  
5. Inventory cron/routes on `mawashidz-site` + `plain-hat-3f18` before any delete.

---

## 5) What this agent could not verify

- Cloudflare dashboard Build branch dropdown / Version command (no API token).  
- Exact Domains & Routes rows for each Worker.  
- Cron schedules currently attached in the CF UI (repo declares cron only for `mawashidz-live`).  
- Whether overwrite was Workers Builds vs manual `wrangler deploy` from a laptop (timing fits Builds after feature push).

---

## Probe commands (re-run anytime)

```bash
curl -sS https://mawashidz.com/build-info.json
curl -sS https://mawashidz-live.hichemazeroual21.workers.dev/build-info.json
git fetch origin main && git rev-parse origin/main
git merge-base --is-ancestor "$(curl -sS https://mawashidz.com/build-info.json | jq -r .commit)" origin/main \
  && echo 'LIVE_ON_MAIN' || echo 'LIVE_NOT_ON_MAIN'
```
