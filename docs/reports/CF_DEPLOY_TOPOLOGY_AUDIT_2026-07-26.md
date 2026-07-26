# Cloudflare Production Deployment Hygiene — audit 2026-07-26

**Mode:** read / document only. No Worker deletes, route changes, secret edits, or production migrations.  
**Account (from CF check-run links):** `64fa014be395ee918de3cf81f13ab654`  
**Repo:** `hichemazeroual21-star/mawashidz-site`  
**Agent limits:** no Cloudflare API token (`wrangler whoami` unauthenticated). Dashboard fields marked **FOUNDER UI** are not readable from this environment.

---

## Epistemology (what apex `build-info` proves / does not)

| Claim | Status |
|-------|--------|
| Code from commit `c9d4325…` is what apex currently serves | **Proven** (`/build-info.json`) |
| That commit is on `cursor/registration-id-integrity-3447`, not on `main` | **Proven** (`git merge-base --is-ancestor` → false; `main` tip = `6b5ca83`) |
| Delivery mechanism for that tip | **Proven Git-triggered Workers Builds** (see §2); not proven whether command was `deploy` vs `versions upload` without dashboard |
| Apex proves `www` health | **Does not** — `www` is independent (§4) |
| Apex proves `/api/*` on other hostnames | **Does not** — probe separately |
| Apex proves routes/cron on `mawashidz-site` / `plain-hat-3f18` | **Does not** |

---

## Live tip (apex)

```json
{
  "version": "1.10.0",
  "commit": "c9d4325b90ee23d0dedf412f0cfd269a8753ca85",
  "builtAt": "2026-07-26T14:43:38.598Z",
  "worker": "mawashidz-live"
}
```

| Ref | SHA |
|-----|-----|
| Live | `c9d4325b90ee23d0dedf412f0cfd269a8753ca85` |
| `origin/main` | `6b5ca834f69d86b265eeb205aed0c0a1fd07b2d8` |
| Feature branch tip (same SHA) | `cursor/registration-id-integrity-3447` |

---

## 1) Workers Builds / Git integration (`mawashidz-live`)

### Proven from GitHub Check Runs (app `cloudflare-workers-and-pages`)

Every sampled push on the feature branch triggered:

- `Workers Builds: mawashidz-live`
- `Workers Builds: mawashidz-site`

| Commit | Branch (inferred) | live build started (UTC) | Notes |
|--------|-------------------|--------------------------|--------|
| `152244a` | registration-id-integrity | 2026-07-26T13:22:25Z | |
| `ec62650` | same | 13:26:10Z | |
| `53b9516` | same | 13:57:18Z | |
| `c7a8a7d` | same | 14:07:13Z | |
| **`c9d4325`** | same | **14:43:45Z** | matches live `builtAt` ~14:43:38Z |
| `60e0507` | header-link-contrast | 13:23:28Z | Preview Alias present |
| `6b5ca83` | **main** | 2026-07-25T20:11:33Z | **no** Preview URL in summary |

### `c9d4325` — `mawashidz-live` check-run summary (verbatim fields)

- **Name:** Workers Builds: mawashidz-live  
- **Conclusion:** success  
- **Build ID:** `8facec96-b93b-4cf0-b436-a0dae9cc8e8b`  
- **Dashboard:** https://dash.cloudflare.com/64fa014be395ee918de3cf81f13ab654/workers/services/view/mawashidz-live/production/builds/8facec96-b93b-4cf0-b436-a0dae9cc8e8b  
- **Version ID:** `7a2d3ce2-aa37-4588-930c-69391a0144dc`  
- **Preview URL:** `https://7a2d3ce2-mawashidz-live.hichemazeroual21.workers.dev`  
- **Preview Alias URL:** `https://cursor-registration-id-integrity-3447-mawashidz-live.hichemazeroual21.workers.dev`  

Branch name is **not** in the Check Runs API `head_branch` field (`null`), but the **Preview Alias** encodes `cursor-registration-id-integrity-3447`.

### Production branch / Preview vs Production — what we can and cannot say

| Question | Answer from evidence |
|----------|----------------------|
| Does Git integration fire on `cursor/*`? | **Yes** (repeated successful builds) |
| Does CF emit Preview Alias for those builds? | **Yes** (feature commits list Preview URL + Alias; `main` tip build summary does **not**) |
| Did that feature version become what apex serves? | **Yes** — apex, `mawashidz-live.*.workers.dev`, preview URL, and preview alias all return the **same** `build-info` for `c9d4325` / `14:43:38Z` |
| Is Production branch setting = `main` only? | **FOUNDER UI** — cannot read Build settings without CF login |
| Is non-prod command `versions upload` or `deploy`? | **FOUNDER UI** — operational outcome (apex tip = feature SHA) means **production traffic was updated** by/after the feature-branch build; that violates the intended hygiene in `DEPLOYMENT.md` whether by wrong Version command or later promotion |

**Policy target (docs, not re-verified in UI):** Production branch `main` + prod `npx wrangler deploy` + non-prod `npx wrangler versions upload`.

---

## 2) Deployment history for `c9d4325`

| Question | Evidence |
|----------|----------|
| Git-triggered or manual Wrangler from agent? | **Git-triggered Cloudflare Workers Builds** — Check Run at 14:43:45Z on SHA `c9d4325`; agent has no CF/Wrangler auth |
| Manual laptop deploy? | **Not required to explain tip** — CF build timestamp aligns with `builtAt`; cannot exclude an additional manual promote without dashboard Deployments log |
| Branch recorded | Preview Alias → `cursor-registration-id-integrity-3447` |
| Also built | `Workers Builds: mawashidz-site` on same SHA (14:43:17Z), Build `91e50564-031b-4950-8c5f-f43d0b3dfc01`, Version `1f5b664b-3a4e-44fa-abfe-9ad5714f3566` (**no** Preview URL in that summary) |

---

## 3) Workers inventory — Domains / Routes / Triggers / Bindings

### Legend

- **Probed:** public HTTP/DNS/GitHub Check Runs  
- **FOUNDER UI:** must confirm in Cloudflare dashboard (Domains & Routes, Triggers, Bindings, Builds)

### A) `mawashidz-live`

| Surface | Probed evidence | FOUNDER UI still needed |
|---------|-----------------|-------------------------|
| Apex `mawashidz.com` | Serves this Worker (`build-info.worker`) | Confirm Custom Domain / route row |
| `mawashidz.com/api/*` | GET outbox → `405 method-not-allowed` (Worker script alive) | Confirm no conflicting Route |
| `www.mawashidz.com` | **522** (not served successfully — §4) | Confirm whether www Custom Domain exists |
| `*.workers.dev` | `mawashidz-live.hichemazeroual21.workers.dev` = same tip as apex | |
| Cron | Repo `wrangler.jsonc`: `*/2 * * * *` | Confirm Triggers → Cron in UI (schedule may differ if dashboard overridden) |
| Queues | None in `wrangler.jsonc` | Confirm no Queue consumers/producers added in UI |
| Service bindings | None in `wrangler.jsonc` | Confirm Bindings tab |
| Assets binding | `ASSETS` → `./public` in `wrangler.jsonc` | |
| Git Builds | Connected (Check Runs on main + feature) | Production branch + deploy/version commands |

### B) `mawashidz-site`

| Surface | Probed evidence | FOUNDER UI still needed |
|---------|-----------------|-------------------------|
| Apex / www | No evidence it serves them (apex names `mawashidz-live`) | Confirm **zero** custom domains/routes for production hosts |
| `mawashidz-site.hichemazeroual21.workers.dev` | HTTP 200 HTML; `/build-info.json` **404** | |
| `/api/process-email-outbox` | `503 {"error":"email-outbox-secret-required"}` — different secret posture / older gate than live’s `401 unauthorized` | |
| Cron | Unknown | **Must confirm empty before any delete** |
| Queues / service bindings | Unknown | Confirm empty |
| Git Builds | **Connected** — builds on `main` and on every sampled `cursor/*` push | Consider disabling Builds or pinning to unused branch after hygiene fix |

### C) `plain-hat-3f18`

| Surface | Probed evidence | FOUNDER UI still needed |
|---------|-----------------|-------------------------|
| Apex / www | No evidence | Confirm no domains/routes |
| `plain-hat-3f18.hichemazeroual21.workers.dev` | HTTP 200 large HTML (~693KB); `/build-info.json` 404; outbox API **404** | |
| Git Builds for this repo | **No** `Workers Builds: plain-hat-*` check runs on sampled commits | Likely not linked to this Git repo (or different project name) |
| Cron / queues / bindings | Unknown | **Must confirm empty before any delete** |

### Deletion rule

**Do not delete** `mawashidz-site` or `plain-hat-3f18` until Domains & Routes + Triggers (cron) + Queue consumers + Service bindings are confirmed empty in UI.

---

## 4) `www.mawashidz.com` → HTTP 522

### Probes

| URL | Result |
|-----|--------|
| `https://www.mawashidz.com/` | **522** `error code: 522` |
| `https://www.mawashidz.com/build-info.json` | **522** |
| `https://www.mawashidz.com/api/process-email-outbox` | **522** |
| `http://www.mawashidz.com/` | **522** |
| `https://mawashidz.com/…` | **200** / Worker responses |

### DNS / TLS

| Item | Evidence |
|------|----------|
| Apex A | `104.21.77.95`, `172.67.206.117` (Cloudflare proxy) |
| www A | **Same** Cloudflare anycast addresses (proxied) |
| Zone NS | `aiden.ns.cloudflare.com`, `harlee.ns.cloudflare.com` |
| Certificate SAN | `mawashidz.com` + `*.mawashidz.com` (covers www) on both hostnames |

### Interpretation (documented, not a config change)

Cloudflare edge **terminates TLS** for `www` (cert OK) and is **proxying** the hostname, but returns **522** (connection to origin failed / no workable origin). For a Worker-only site this usually means:

- DNS `www` is orange-clouded, **but**
- **no Worker Custom Domain / Route** is attached for `www.mawashidz.com` (or it points at a dead origin),

while apex **is** attached to `mawashidz-live`.

**FOUNDER UI checklist for www:**

1. DNS → `www` record type (CNAME/`A` flattened) + proxy status.  
2. `mawashidz-live` → Domains & Routes → is `www.mawashidz.com` listed?  
3. If missing: add www as Custom Domain on `mawashidz-live` (or redirect www→apex at DNS/Rules).  
4. Confirm no accidental www route on `mawashidz-site` / external origin.

---

## 5) Constraints honored

- No Worker deleted or modified  
- No route/DNS/trigger changes applied by agent  
- No production migration  
- No merge/deploy from this audit  

---

## Founder actions (config only — after UI confirm)

1. Open Builds for `mawashidz-live` + `mawashidz-site`; record Production branch + Deploy vs Version commands (screenshot).  
2. If non-prod uses `wrangler deploy` → set `npx wrangler versions upload`.  
3. Redeploy from **`main`** if production must not stay on `c9d4325`.  
4. Fix **www** (Custom Domain on `mawashidz-live` or redirect).  
5. Inventory cron/routes on `mawashidz-site` + `plain-hat-3f18` before cleanup.  

---

## Re-probe commands

```bash
curl -sS https://mawashidz.com/build-info.json
curl -sS -o /dev/null -w '%{http_code}\n' https://www.mawashidz.com/build-info.json
git fetch origin main
git merge-base --is-ancestor "$(curl -sS https://mawashidz.com/build-info.json | jq -r .commit)" origin/main \
  && echo LIVE_ON_MAIN || echo LIVE_NOT_ON_MAIN
gh api repos/hichemazeroual21-star/mawashidz-site/commits/$(curl -sS https://mawashidz.com/build-info.json | jq -r .commit)/check-runs \
  --jq '.check_runs[] | select(.app.slug=="cloudflare-workers-and-pages") | {name,started_at,summary:.output.summary}'
```
