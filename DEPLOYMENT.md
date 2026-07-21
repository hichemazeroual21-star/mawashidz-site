# MawashiDZ — Production deployment

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
