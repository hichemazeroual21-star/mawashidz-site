# MawashiDZ — Production deployment (single source of truth)

**Last updated:** 2026-07-22  
**Production URL:** https://mawashidz.com  
**Production Worker:** `mawashidz-live` only (`wrangler.jsonc` → `"name": "mawashidz-live"`)

---

## Prerequisite gate (owner — before any production deploy)

> **Root risk (RC#1):** If **Version command** = `npx wrangler deploy`, every push to **any** branch can replace live traffic. That is how production regressed to the **v1.9.0 monolith** while `main` carries **v1.10.0**.

### RC#1 — Cloudflare branch commands (configuration)

**Status: closed (owner verified 2026-07-22)** on `mawashidz-live` → Settings → Build:

| Setting | Required value | Verified |
|---------|----------------|----------|
| Production branch | `main` | yes |
| Production deploy command | `npx wrangler deploy` | yes |
| Non-production branch deploy command / **Version command** | `npx wrangler versions upload` | yes |
| Builds for non-production branches | Enabled is **OK** when non-prod command is `versions upload` (uploads preview only; does not take production traffic) | yes |

`wrangler deploy` promotes the build to **100% traffic** on the production branch. `wrangler versions upload` creates a **preview version** only. That split is what stops `cursor/…` branches from overwriting `main` on production.

**RC#1 does not by itself prove** the **active** production version was built from current `main`. That is **RC#1 operational closure** (below).

### RC#1 operational closure (after next `main` deploy)

1. Merge this repo’s deploy pipeline PR to `main` (build + `build-info.json` + `verify:prod`).
2. Cloudflare **Build command** must be **`npm ci && npm run build`** (not `None` — otherwise `public/build-info.json` is never generated).
3. Push/merge to `main` → Cloudflare runs build + `npx wrangler deploy`.
4. Confirm **Active deployment** is from `main` and run:

```bash
curl -sL https://mawashidz.com/build-info.json
npm run verify:prod   # on a checkout at the same commit as main
```

Expect **HTTP 200** on `build-info.json` with `commit` matching `git rev-parse HEAD` on `main`.

**Do not run `npm run deploy:prod` or promote a build until RC#1 configuration is verified** (done) **and** Build command includes `npm run build` when using Workers Builds.

For break-glass deploy only:

```bash
export MAWASHIDZ_CF_SAFE_MODE=confirmed
```

Agents: do not `wrangler deploy` from feature branches; non-prod branches must only `versions upload`.

---

## Deployment strategy (one path only)

### Canonical: **A) Git → `main` → Cloudflare Workers Builds**

| Step | What happens |
|------|----------------|
| 1 | Merge PR to `main` |
| 2 | Cloudflare builds with `npm ci && npm run build` |
| 3 | Production branch deploy runs `npx wrangler deploy` → `mawashidz-live` |
| 4 | Verify: `npm run verify:prod` (commit on `main`) |

**Unsupported for routine releases:** manual `npx wrangler deploy` without going through `main` + Builds.

### Break-glass only: `npm run deploy:prod`

Runs: gate → `npm test` → `npm run build` → `wrangler deploy` → `verify:prod`.  
Requires `MAWASHIDZ_CF_SAFE_MODE=confirmed`. Document why break-glass was used.

**Do not** document a second “normal” manual path. Netlify is **not** production HTML for `mawashidz.com`.

---

## Source of truth (no competing copies)

| Layer | Location | Notes |
|-------|----------|--------|
| **App source** | Repo root: `index.html`, `js/`, `assets/` | Edit here only |
| **Version label** | `assets/i18n.js` → `MDZ_APP_VERSION` | Single version string |
| **Worker bundle** | `public/` | **Generated** — never hand-edit |
| **Build** | `npm run build` | `sync-worker-public.mjs` + `build-info.json` + `_headers` |
| **Runtime** | Cloudflare Worker `mawashidz-live` | Serves `./public` via assets + `worker.mjs` for `/api/*` |

`public/` must match root after every build (`npm run verify:public`).

---

## Why production showed v1.9.0 (diagnosis)

| Finding | Evidence |
|---------|----------|
| **Current `main` is not v1.9.0** | `MDZ_APP_VERSION = '1.10.0'` in `assets/i18n.js`; modular `js/mdz-dashboards.mjs` |
| **v1.9.0 in repo** | Only in **docs** / recovery artifacts (`docs/PRODUCTION_RECOVERY_MANIFEST.md`, drift reports) — **not** in deployable root HTML |
| **Live site matched old monolith** | Footer `v1.9.0`, `Phase 1 Auth UI` inline CSS, `/assets/i18n.js` **404**, `/js/mdz-dashboards.mjs` **404** |
| **Root cause** | Cloudflare **last deploy wins** with **Version command = `wrangler deploy` on all branches**, serving an **older Worker asset bundle**, not current `main` |

This is **not** explained by browser cache alone: missing JS paths prove the **deployed artifact** is old.

---

## Cloudflare dashboard checklist

| Setting | Value |
|---------|--------|
| Worker | `mawashidz-live` |
| Custom domain | `mawashidz.com` (verify under Domains & Routes) |
| Production branch | `main` |
| **Build command** | **`npm ci && npm run build`** (required — generates `public/build-info.json`; **not** `None`) |
| Deploy command | `npx wrangler deploy` |
| Version command / non-production deploy | `npx wrangler versions upload` |
| Legacy worker `mawashidz-site` | Disable builds or ignore — **not** production domain |

---

## Commands

```bash
# Local artifact (same as CI build step)
npm run build

# After owner gate + merge to main (CI deploys), or break-glass:
export MAWASHIDZ_CF_SAFE_MODE=confirmed   # owner confirmed dashboard
npm run deploy:prod                        # emergency only; runs test → build → deploy → verify

# Verification (no deploy)
npm test
npm run verify:public
npm run verify:prod                        # fails until production serves latest build-info + v1.10+

# After deploy: API routes (Worker script — not static assets)
curl -sI https://mawashidz.com/api/livestock-prices   # expect 200
curl -sL https://mawashidz.com/api/livestock-prices | head -c 200
curl -sI https://mawashidz.com/api/livestock-news     # expect 200
```

`build-info.json` (in `public/` after build):

```json
{
  "version": "1.10.0",
  "commit": "<git sha>",
  "builtAt": "<iso8601>",
  "worker": "mawashidz-live"
}
```

---

## Cache policy

`deploy/_headers` → copied to `public/_headers` on build:

- `index.html`, `build-info.json` → `no-cache, must-revalidate`
- `/assets/*`, `/js/*` → short cache + `must-revalidate`

Stale HTML without redeploy is a **deploy** problem; headers reduce CDN stickiness after a correct deploy.

---

## Post-deploy verification

```bash
curl -sL https://mawashidz.com/build-info.json
curl -sL https://mawashidz.com/assets/i18n.js | grep MDZ_APP_VERSION
# Expect 1.10.0+ and commit matching main
npm run verify:prod
```

---

## Founder / admin (`user_roles`)

Registration does not create `founder`. Assign in Supabase SQL Editor after signup. See SQL in previous revisions of this doc under `user_roles`.

---

## Related docs

- `supabase/PRODUCTION_DB_BASELINE.md` — database state (separate from frontend deploy)
- Launch gate / RLS steps — after production serves **v1.10+** from `main`

---

## Pre-launch security backlog

- Open `registrations` INSERT policies — tighten before public launch (see Supabase migrations).
