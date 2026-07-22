# MawashiDZ — Production deployment

## ⚠️ CRITICAL — Cloudflare Workers Builds (`mawashidz-live`)

**Wrong settings here caused production to serve code from random branches** (e.g. `cursor/…` overwriting `main`).

Open: **Workers & Pages → `mawashidz-live` → Settings → Build**

| Setting | Correct value | Why |
|---------|---------------|-----|
| **Production branch** | `main` | Only `main` may promote to 100% traffic |
| **Deploy command** | `npx wrangler deploy` | Production deploy (main only) |
| **Version command** | `npx wrangler versions upload` | **NOT** `npx wrangler deploy` — preview branches must upload a version without going live |
| **Builds for non-production branches** | **Disabled** (recommended) | Or keep enabled **only if** Version command is `versions upload` |

### What went wrong

With **Version command = `npx wrangler deploy`**, every push on **any** branch deployed directly to production. Build history showed the same commit built from `main` and `cursor/…` — **last deploy wins**, with no review.

### Fix checklist (do once in dashboard)

1. Set **Version command** → `npx wrangler versions upload`
2. Keep **Deploy command** → `npx wrangler deploy`
3. Set **Builds for non-production branches** → **Disabled** (safest) until you need preview URLs
4. **Version History** → confirm **Active** version is from `main` after next `main` push
5. Optionally **disable** Workers Builds on **`mawashidz-site`** (legacy worker — not production)

---

## Which Worker serves `mawashidz.com`?

| Worker | Role in repo | Custom domain |
|--------|----------------|---------------|
| **`mawashidz-live`** | **Canonical** — `wrangler.jsonc` → `"name": "mawashidz-live"` (commits `5904373`, `e6ead0c`) | **Production** — dashboard shows **+ 1 other route** (= `mawashidz.com`) |
| **`mawashidz-site`** | Legacy / duplicate — older `wrangler.jsonc` name; branch `update_worker_name_to_mawashidz-site` | **Not production** — only `mawashidz-site.hichemazeroual21.workers.dev` (no custom domain) |

### Why this matters

CI builds **both** workers on every push (`Workers Builds: mawashidz-live` and `Workers Builds: mawashidz-site`). A green “Deployment successful” on the **wrong** worker does **not** update `mawashidz.com` if the custom domain is bound to the other worker. This explains past drift (e.g. build green while the site stayed on an older artifact).

### How to verify (required before every deploy)

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Open **`mawashidz-live`** → **Settings** → **Domains & Routes**.
   - If `mawashidz.com` (and optionally `www.mawashidz.com`) is listed → **this is the production worker**.
3. Repeat for **`mawashidz-site`**.
   - If the domain is only here, either migrate the custom domain to `mawashidz-live` or align `wrangler.jsonc` with the bound worker — do not deploy blindly.

> **Agent note (2026-07-21):** No `CLOUDFLARE_API_TOKEN` in this environment — domain binding could not be queried via API. The table above reflects repo intent (`mawashidz-live`); dashboard confirmation is mandatory.

### Deploy command (after merge + `npm run sync:worker`)

```bash
npm run sync:worker          # copy index.html, js/, assets/ → public/
npx wrangler deploy          # uses wrangler.jsonc → mawashidz-live
```

Post-deploy smoke check:

```bash
curl -sL https://mawashidz.com/assets/i18n.js | grep MDZ_APP_VERSION
# Expect: const MDZ_APP_VERSION = '1.10.0'; (or current release)
```

### Artifact layout

- Source of truth: repo root (`index.html`, `js/`, `assets/`)
- Worker bundle: `public/` (generated — never edit by hand)
- Config: `wrangler.jsonc` (`assets.directory` = `./public`)

### Netlify

Netlify still runs deploy previews and header/redirect checks. **Production HTML for mawashidz.com is served by Cloudflare Workers**, not Netlify Pages.

---

## Founder / admin role (`user_roles`)

Registration does **not** create `founder` or `admin`. Assign manually after signup.

`user_roles.role` is **plain text** (not a Postgres enum). Valid values used in code:

- Admin dashboard: `founder`, `admin`, `super_admin`
- Wilaya manager: `wilaya_manager`, `manager`, `wilaya_mgr`

Check before insert:

```sql
-- If empty: role is text, not enum — safe to use strings below
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'user_roles' and column_name = 'role';

select user_id, role from public.user_roles;

-- Example: grant founder to your account (replace UUID from Auth → Users)
-- insert into public.user_roles (user_id, role)
-- values ('YOUR-UUID', 'founder');
```

---

## Production launch gate (before invitations)

Use **state**, not a fixed commit SHA. New merges after `localStorage` fallback removal stay valid; pinning a hash goes stale.

### Step 0 — Active deployment (`mawashidz-live`)

The active deployment must be:

1. **Sourced from branch `main`** (not `cursor/*`)
2. **Status = success**
3. **Newer than** the commit that removed dashboard `localStorage` fallback on failed live fetch

**Evidence (required):** version ID + source branch + build timestamp (Cloudflare Version History screenshot or export). “Latest deploy from main” alone is not enough — confirm success.

**Reference commit (fallback removal on `main`, not a deploy pin):** `5f79cf8` — `fix(dashboard): remove localStorage fallback on registration load failure`.

#### Step 0 evidence log

| Check | How | Result |
|-------|-----|--------|
| (c) Post-fallback artifact | `curl -sL https://mawashidz.com/js/mdz-dashboards.mjs` — no `localStorage` / `mdz_registrations`; byte-match `public/js/mdz-dashboards.mjs` on `main` | **PASS** (2026-07-22 agent) |
| (a) Source branch `main` | Cloudflare → `mawashidz-live` → Builds / Version History → **Active** row | **Pending** — needs dashboard screenshot |
| (b) Status success | Same Active row | **Pending** — needs dashboard screenshot |
| Version ID + timestamp | Same Active row | **Pending** — paste when captured |

Until (a)(b) are confirmed on Cloudflare, treat Step 0 as **partial**: artifact matches post-`5f79cf8` `main`; governance not closed.

### Verification scripts

| Command | Purpose |
|---------|---------|
| `npm run verify:public` | `public/` byte-sync vs `index.html`, `js/`, `assets/` (also in `npm test`) |
| `npm run verify:prod` | SHA256 of key files on https://mawashidz.com vs local checkout |
| `npm run verify:rls` | Postgres policy counts (needs `DATABASE_URL`; skips with warning if unset) |

Production worker is **`mawashidz-live`** only. **`mawashidz-site`** is legacy — does not serve `mawashidz.com` (see table above).

---

### Migration naming (canonical)

**Numeric `001`–`007+` is canonical.** Dated files (`20260718*`) are legacy Phase 0 only. Decision is written in `supabase/migrations/007_manual_rls_fixes.sql` header — update that note if the policy ever changes.

### Full order

| Step | Action |
|------|--------|
| 0 | Active deployment verified per above |
| 1 | Assign `founder` (or `admin` / `super_admin`) in `user_roles` |
| 2 | Logout / login |
| 3 | Admin button visible |
| 4 | Apply `supabase/migrations/003_dashboard_rls.sql` |
| 5 | Exactly **two** `SELECT` policies on `public.registrations` |
| 6 | Admin dashboard opens; source = live Supabase (not fallback / not `dashLoadFailed`) |
| 7 | Drop **three** redundant `INSERT` policies, one statement at a time; keep one public insert policy |
| 8 | One real production registration — `INSERT` still works |
| 9 | Repo contains `007_manual_rls_fixes.sql` (documents manual prod changes; **do not re-run on prod** if already applied) |
| 10 | Start invitations |

### Success criteria (YES/NO + evidence)

- Active deployment from `main`, successful, post-fallback-removal
- Admin button visible
- `user_roles` loaded for session (network: `user_roles?select=role` → 200)
- `registrations` `SELECT` policies: **exactly 2**
- Dashboard source: **LIVE** (Supabase)
- Registration `INSERT` after INSERT cleanup: **PASS**

SQL or screenshot for each step — no assumptions.

Manual RLS work on production is recorded in `supabase/migrations/007_manual_rls_fixes.sql` so it does not live only in chat history (same class of drift as undocumented `Allow admin read`).

---

### Pre-launch security backlog

- **`registrations: public insert` with `check (true)` for `anon`:** anyone can POST rows via REST (UI rate-limit bypass). Tighten `WITH CHECK` and/or server rate limits before public launch. Unique indexes limit duplicate email/phone but not volume spam.
