# Architecture Review — 2026-07-25

**Reviewer:** Engineering (per [ALGERMA Engineering Constitution v1.0](./constitution/ENGINEERING_CONSTITUTION.md))
**Baseline commit:** `d845298` (post Phase 1 foundation merge, PR #16)
**Scope:** Full repository — frontend, edge/worker, database, tests, CI, docs
**Method:** Repository read-through, migration inventory, test/CI inspection, cross-check against [TECHNICAL_DEBT_REGISTER.md](./constitution/TECHNICAL_DEBT_REGISTER.md) and [ROADMAP.md](./constitution/ROADMAP.md)

---

## 1. Verdict

The project is in **good architectural health for its phase**. The security posture (server-side RLS + SECURITY DEFINER RPCs, audit log, insert guards), documentation discipline (frozen constitution, decision log, debt register, runbooks), and test/CI gates are stronger than typical for a project at this stage. No Critical findings.

The dominant risks are **maintainability debt in the frontend monolith** (High), **dual database migration paths** (High), and **missing edge rate limiting** (High). All are already known and registered; this review confirms them, adds four new findings (F-04, F-07, F-08, F-09), and sequences remediation against the roadmap.

**Recommendation:** proceed with Phase 1 completion, then Phase 2 (Livestock Identity MVP). Do not begin a frontend rewrite; continue incremental module extraction per Architectural Principle 18 ("no big-bang rewrites").

## 2. Current architecture (verified state)

- **Frontend:** single `index.html` (~593 KB: ~400 KB inline CSS incl. ~361 KB base64 images, ~640 lines markup, ~1,430 lines inline JS with ~100 functions), served as static asset. Progressive extraction underway: 5 ES modules in `js/` (registration, recovery, member ops, dashboards, pagination) loaded via dynamic `import()`. i18n: 4 languages (`ar`, `en`, `fr`, `de`) via `assets/i18n.js` + `assets/i18n-content.js`.
- **Edge:** Cloudflare Worker `mawashidz-live` (`worker.mjs`, 82 lines) serves `public/` assets and 3 API routes (`/api/livestock-news`, `/api/livestock-prices`, `/api/process-email-outbox`). Handlers live in `netlify/functions/` and are shared: the Worker imports them; Netlify (optional fallback) routes them via `netlify.toml`.
- **Database:** Supabase. 12 tables, 31 functions/RPCs, 14 named RLS policies. Privileged mutations (review, roles, member-id allocation) go through SECURITY DEFINER RPCs with audit logging (`admin_audit_log`). Registration inserts are guarded (length validation + 5/hour/phone rate limit, migration 009).
- **Delivery:** `npm run build` syncs root → `public/` (never hand-edited); CI (`.github/workflows/ci.yml`, Node 22) gates PRs with unit + security + migration static tests; deploy via Wrangler with safe-mode gate script.

## 3. Findings

Severity per Engineering Constitution: Critical / High / Medium / Low.

### F-01 — Monolithic `index.html` (High, maintainability + performance) — known, TD-004

~593 KB single file; every UI change risks unrelated regressions, and first-paint payload includes ~361 KB of base64-embedded images that defeat HTTP caching and image pipeline optimizations.

**Why High:** this is the single largest drag on developer velocity and rendering performance, and it grows with every phase.
**Recommendation:** continue incremental extraction (already proven with the 5 `js/` modules). Next lowest-risk steps, in order: (1) move base64 images to `assets/` files with cache headers; (2) extract the 7 inline `<style>` blocks into versioned CSS files; (3) extract remaining inline JS into modules per feature. Each step is independently shippable and testable with the existing Puppeteer layout suite. **No SPA rewrite** — that would violate Architectural Principle 18.

### F-02 — Dual migration paths (High, data integrity) — known, TD-001

Two incompatible paths exist: numbered `001`–`011` (existing production DB) and timestamped `20260718*`/`20260719*` (Phase 0 from `main`). README warns not to run both, but the safeguard is documentation only; a fresh operator can still corrupt GRANT/REVOKE state.

**Why High:** database provisioning mistakes are expensive and hard to detect; risk grows as migrations accumulate on both paths.
**Recommendation:** consolidate to one canonical path before Phase 2 adds animal/ownership tables (which will otherwise need to exist in both paths, doubling the drift surface). This is a structural change — **requires Founder approval**; a concrete consolidation ADR should be the next engineering deliverable.

### F-03 — No edge rate limiting (High, security) — known, TD-012

Worker API routes and the public verification-adjacent surfaces have no request-level rate limiting; the only guard is the DB-level registration insert limit. Constitution §12 and Architectural Principle 8 require public endpoints to assume abuse. This gap becomes Critical when Phase 2 QR verification endpoints ship (Constitution §6 mandates rate-limited verification).

**Recommendation:** configure Cloudflare WAF/rate-limiting rules on `/api/*` now (ops task, no code change), and treat per-route limits as a Must exit criterion for Phase 2.

### F-04 — Market engine logic duplicated client/server (Medium, single source of truth) — NEW

`assets/market-engine.js` (96 lines) is a self-declared identical copy of `netlify/functions/market-core.mjs` (110 lines): product/wilaya/hash/tick logic exists twice. Divergence would silently show different prices in fallback vs API mode. Violates "never duplicate business logic."

**Recommendation:** generate the client copy from `market-core.mjs` at build time via `scripts/sync-worker-public.mjs`, or import the shared module in the client. Small, contained fix; propose in a dedicated PR.

### F-05 — Contact/feedback inbox unreadable by admins via RLS (Medium, product gap) — known, TD-013

`contact_messages` and `feedback_tickets` accept public inserts but have no admin SELECT policy — a blind inbox. Already targeted at Phase 1.

**Recommendation:** add admin/manager read policies in the next Phase 1 migration, following the pattern in migration 010.

### F-06 — Role alias sprawl (Medium, authz correctness) — known, TD-009

`wilaya_manager` has live aliases `manager` and `wilaya_mgr`. Every authorization check must remember all three; one missed alias is a privilege bug. Already targeted at Phase 1.

**Recommendation:** normalize to one canonical value with a migration that rewrites existing rows and a temporary CHECK constraint rejecting the aliases.

### F-07 — CI gate does not run E2E/layout suites (Medium, delivery) — NEW

`.github/workflows/ci.yml` runs `test:unit` + security + migration checks but not `test:e2e`/`test:layout` (Puppeteer). Architectural Principle 17 says "CI green required: `npm test` on PR", but CI runs a subset — UI regressions can merge green.

**Recommendation:** add a CI job with a pinned browser to run the Puppeteer suites on PRs (or explicitly amend Principle 17 to name `test:ci` as the merge gate and rely on pre-deploy `npm test`). Either way, close the gap between the stated invariant and the actual gate.

### F-08 — `/api/process-email-outbox` missing from Netlify redirects (Low, platform parity) — NEW

`netlify.toml` routes news and prices but not the email outbox processor, so the documented Netlify fallback is incomplete for Phase 1 email delivery.

**Recommendation:** add the redirect, or document in `docs/runbooks/email-outbox.md` that outbox processing is Worker-only.

### F-09 — Version drift and broken README promise (Low, DX) — NEW, partially fixed in this PR

(a) UI/i18n declare `1.10.0` while `CHANGELOG.md` is at `1.11.0` — cache-bust strings and the visible version label lag. (b) README documented `npm run test:db`, but the script was absent from `package.json`.

**Fixed in this PR:** (b) — `test:db` now maps to `supabase/tests/run-phase0-tests.mjs` (requires local `npm i -D embedded-postgres pg`; kept out of `devDependencies` deliberately so CI installs stay lean for a suite CI does not run). (a) is left for the next UI release PR since bumping touches `index.html`, both i18n files, and the `public/` sync.

### Non-findings (verified acceptable)

- **Supabase publishable key + EmailJS public IDs in client code:** expected by design (Constitution §12: "publishable anon key is expected — RLS must hold"), and RLS enforcement is verified by live security tests (`test:security`, `security-review-registration`).
- **`public/` committed to git:** intentional deploy artifact with sync verification (`verify:public`) and asset-validation tests guarding drift.
- **Synthetic prices engine:** deterministic fallback, no upstream dependency — acceptable until real market data exists (roadmap Phase 7).

## 4. Quality-gate assessment (ALGERMA checklist)

| Gate | State | Notes |
|------|-------|-------|
| No obvious bugs | Pass | No logic bugs found in worker/modules/migrations read |
| No duplicated logic | **Fail** | F-04 market engine |
| No dead code | Pass | One removed-function comment noted; no dead paths found |
| No unnecessary complexity | Pass | Worker and modules are lean |
| Proper naming | Partial | F-06 role aliases |
| Proper abstractions | Partial | F-01 monolith; extraction pattern is correct |
| Proper architecture | Pass for phase | Static-first + RPC/RLS matches Constitution §14 |
| Secure | Partial | F-03 edge rate limits; RLS/RPC posture otherwise strong |
| Accessible / Responsive / Consistent UI | Pass (tested) | Puppeteer layout suites cover 4 languages, multiple widths |
| Proper error handling | Pass | Worker try/catch → 503; outbox auth gates tested |
| Logging where appropriate | Pass | `admin_audit_log` for privileged mutations; Worker observability on |
| Tests updated | Pass | 17 test files; migrations have static review tests |

## 5. Approval requests (structural — awaiting Founder decision)

Per the Engineering Constitution, these are proposed, not executed:

1. **Migration path consolidation (F-02):** approve drafting an ADR that declares the numbered path canonical, converts the timestamped Phase 0 files into a documented "already applied on main" record, and defines the fresh-install story. Rollback: docs-only until the ADR is approved.
2. **Frontend extraction sequence (F-01):** approve the three-step order (base64 images → CSS files → JS modules) as standing direction for UI PRs. Each step is reversible per-commit.
3. **CI gate scope (F-07):** choose between (a) Puppeteer suites in CI or (b) amending Architectural Principle 17 to name `test:ci` as the merge gate.

## 6. Register updates proposed

- Add F-04 (market engine duplication), F-07 (CI gate subset), F-08 (Netlify outbox route) to `TECHNICAL_DEBT_REGISTER.md` on acceptance of this review.
- TD-004, TD-001, TD-012, TD-013, TD-009 confirmed still Open; no register status changes.
