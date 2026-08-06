# PII Hold 02 — execution evidence

**Decision:** `MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02`

**Execution record created:** `2026-08-06T15:46:07Z`

**Authorized by:** Hichem, direct current-user Founder lock

**Status:** `CONSUMED_PARTIAL_BLOCKED — CLOUDFLARE CANONICAL/WORKERS.DEV HELD; NETLIFY PRODUCTION/MAIN + HISTORICAL DEPLOYS EXPOSED; PROVIDER CLOSURE BLOCKED`

## Exact authorization consumed

> أنا هشام — أعتمد القرار MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02

This authorization is consumed for this execution. It is not a reusable approval for reopening registration, deleting data, changing legal scope, or any unrelated production change.

## Verified pre-change baseline

Checked at `2026-08-06T15:46:07Z` without submitting personal data:

- Repository: `hichemazeroual21-star/mawashidz-site`
- Production branch: `main`
- Baseline commit: `debd091a633df9681415ac0bac69b5f94b685949`
- Production URL: `https://mawashidz.com`
- Production Worker: `mawashidz-live`
- Live `build-info.json` matched the baseline commit and reported version `1.12.0`
- Live `index.html` SHA-256: `d91d59b3c79c4e68d6383c44179f3233322f0fc69394e8ec7be53c55ae82bf7d`
- Live `js/registration-flow.mjs` SHA-256: `ed2149efd4b28fcb2e89a6e1bac4d2e21fc8eb4d0e387e45fc842fc0f6c147c2`
- Live page loaded the EmailJS browser library, contained a configured send call, exposed registration/contact surfaces and embedded the production Supabase project URL.
- Read-only Supabase Auth settings returned `disable_signup=false` and email signup enabled.

No signup, form submission, EmailJS send, row write, deletion, data export or credential disclosure was performed while collecting this baseline.

## Implemented code-level containment

PR [#41](https://github.com/hichemazeroual21-star/mawashidz-site/pull/41) merged the Worker hold. PR [#42](https://github.com/hichemazeroual21-star/mawashidz-site/pull/42) added a fail-closed Netlify deployment configuration. The deployed Worker now:

- serves a self-contained `503` holding page with no forms or scripts;
- uses `no-store`, `noindex`, CSP `connect-src 'none'`, `script-src 'none'` and `form-action 'none'`;
- blocks all application APIs before auth, database, email, news or price handlers;
- blocks the scheduled email outbox;
- blocks the old static application bundle through the production Worker;
- allows only `build-info.json` so the exact deployed commit remains observable.

The merged Netlify configuration is intended to publish only an inert allow-listed hold artifact, exclude application Functions, and configure an Edge Function to return `503` for all paths. It is verified only on the successful Preview 42 and its atomic deploy, where representative live `GET`, `POST` and `HEAD` probes passed. The production deployment for merged main commit `07fc306424be94692c57a286c9c76e813cf2d952` failed/skipped and did not replace the exposed production/main aliases.

## Explicit exclusions and unresolved provider blockers

This code deploy does **not** prove full containment. The following remain blocked until authenticated provider access and raw verification evidence exist:

- Supabase Auth server-side signup disablement;
- database RLS, grants, RPC, function and Storage write audit/lockdown;
- existing-user session and cached-client negative tests;
- EmailJS provider-side suspension and activity verification;
- inventory and access quarantine of existing data across Auth, tables, Storage, logs, backups and recipient mailboxes;
- initial and 24-hour no-new-mutation observation.
- route inventory and negative probes for the bare domain, `www`, any `workers.dev` production/preview URL, and any legacy Worker/custom-domain alias; unknown aliases must remain `UNKNOWN`, not assumed closed.

Existing records must remain in place and access-restricted. Do not delete, export, copy or move personal data under this decision.

## Deployment and live verification evidence

Cloudflare and Netlify live routes were verified independently at `2026-08-06T16:26:51Z`–`2026-08-06T16:28:13Z`, without submitting personal data:

- Merged main commit and Cloudflare live commit: `07fc306424be94692c57a286c9c76e813cf2d952`.
- `https://mawashidz.com/build-info.json`: HTTP `200`, exact production commit above, Worker `mawashidz-live`, built at `2026-08-06T16:23:48.797Z`.
- Exact live verifier: `VERIFY_GIT_COMMIT=07fc306424be94692c57a286c9c76e813cf2d952 npm run verify:pii-hold` — **PASS**.
- Canonical root, old static/source paths, login, recovery and email-outbox routes: HTTP `503`, exact decision header, `no-store`, no forms, inputs, scripts, EmailJS or Supabase markers.
- `mawashidz-live.hichemazeroual21.workers.dev` and `mawashidz-site.hichemazeroual21.workers.dev`: HTTP `503` with the exact hold header and no application markers.
- `www.mawashidz.com`: Cloudflare `522` with no application body observed. This is not counted as a controlled hold.
- Netlify Preview 42 and atomic deploy `6a74b427d8f1ab000875489e`: HTTP `503` across root, static/source, API and Function paths; no form, input, script, EmailJS or Supabase markers.

## Confirmed residual exposure and provider blockers

The following Netlify deployments remained publicly readable at the same checkpoint:

- `mawashidz.netlify.app` and `main--mawashidz.netlify.app`: HTTP `200`, three forms and thirteen form fields, no hold header.
- `deploy-preview-41--mawashidz.netlify.app`: HTTP `200`, five forms and sixty-two form fields, EmailJS and Supabase markers, no hold header.
- Historical atomic production deploy `6a559f2c60cc6500080adc35--mawashidz.netlify.app`: HTTP `200`, three forms and thirteen form fields.
- Historical atomic Preview-41 deploy `6a74ae613b3f390008ad85a8--mawashidz.netlify.app`: HTTP `200`, five forms and sixty-two form fields, EmailJS and Supabase markers.

Netlify production metadata was rechecked at `2026-08-06T16:35:26Z`. Deploy `6a74b4b3b33d4800086eff47` targets the exact merged main commit and reports `state=error`, `skipped=true`, `summary.status=unavailable` and `published_at=null`. The production/main aliases still served the prior artifact; therefore no publication of this deploy was observed. The authenticated build log and project-wide access controls are unavailable in the current execution channel. A successful new production deploy would not by itself retire historical atomic or preview URLs.

- Supabase signup state at `2026-08-06T16:35:35Z`: **VERIFIED OPEN** — read-only Auth settings returned HTTP `200`, `disable_signup=false`, email signup enabled. Cached or direct clients can bypass the Worker.
- Supabase signup disablement/remediation: **BLOCKED — AUTHENTICATED PROVIDER ACCESS REQUIRED**.
- Supabase RLS, grants, RPCs, Storage, sessions and existing-data access inventory: **BLOCKED — AUTHENTICATED PROVIDER ACCESS REQUIRED**.
- EmailJS provider state: **UNKNOWN**. Suspension, activity verification, send history and recipient-mailbox audit are **BLOCKED — AUTHENTICATED PROVIDER ACCESS REQUIRED**.
- Netlify production retry, project-wide access protection and historical deploy restriction: **BLOCKED — AUTHENTICATED PROVIDER ACCESS REQUIRED**.
- Initial and 24-hour no-new-mutation observation: **PENDING**.

No signup, form submission, provider email send, row write, deletion, export, copy or data relocation was performed during verification.

Until every provider-side item passes, the parent decision remains `PARTIAL`, never `CLOSED`, `SECURE` or `COMPLIANT`.
