# MawashiDZ

Arabic-first (RTL) livestock-sector web platform for Algeria. Single product (not a monorepo). The UI is one large static `index.html` plus vanilla JS ES modules (`js/`, `assets/`). Backend is hosted Supabase (Postgres + Auth), with optional Netlify Functions (`/api/livestock-news`, `/api/livestock-prices`) and Cloudflare Workers static hosting for production.

## Cursor Cloud specific instructions

- Node 22 and Google Chrome are preinstalled; `npm install` (the update script) is all that is needed to install dependencies.
- There is no `npm run dev` script. This is a static site. To run it in development mode, serve the generated `./public` directory with the Cloudflare Worker: `npm run build` then `npx wrangler dev --ip 0.0.0.0 --port 8788`. `wrangler dev` serves only the static assets (no `main` worker script is configured). Alternatively any static file server on the repo root works.
- The frontend has built-in client-side fallbacks: if the Netlify `/api/*` functions are absent, live prices come from `assets/market-engine.js` and news from an inline fallback list. So the live livestock market ("بورصة المواشي") and news work fully even without Netlify Functions running. `netlify dev` is only needed to exercise the real serverless functions and is not installed by default.
- Supabase URL and publishable (anon) key are hardcoded in `index.html` and point at the real remote project. Do NOT submit the registration form during testing against a running instance — it writes to production. Demonstrate registration by only opening the modal, and rely on `npm run test:e2e` (which mocks Supabase) for the full submit flow.
- Tests: `npm test` runs unit + E2E + Puppeteer layout tests (443 checks; requires Chrome — auto-detected at `/usr/local/bin/google-chrome`). `npm run test:unit` is browser-free.
- `npm run test:security` and `npm run test:db` need external resources: `test:security` hits the live Supabase project, and `test:db` imports `embedded-postgres`/`pg` which are NOT in `package.json` (would need separate install). Neither is part of `npm test`.
- Lint: there is no linter configured in this repo (no ESLint/Prettier config, no `lint` script). Use `npm test` as the primary correctness gate.
