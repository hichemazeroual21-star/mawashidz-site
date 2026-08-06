# PII Hold 02 — execution evidence

**Decision:** `MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02`  
**Execution record created:** `2026-08-06T15:46:07Z`  
**Authorized by:** Hichem, direct current-user Founder lock  
**Status:** `PARTIAL — CODE HOLD IN PROGRESS / PROVIDER CONTROLS BLOCKED`

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

## Candidate code-level containment scope

Once merged and observed live on the exact production commit, the candidate Worker change is intended to:

- serves a self-contained `503` holding page with no forms or scripts;
- uses `no-store`, `noindex`, CSP `connect-src 'none'`, `script-src 'none'` and `form-action 'none'`;
- blocks all application APIs before auth, database, email, news or price handlers;
- blocks the scheduled email outbox;
- blocks the old static application bundle through the production Worker;
- allows only `build-info.json` so the exact deployed commit remains observable.

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

## Deployment and closure evidence

To be filled only from raw post-deploy observations:

- Deployment commit: `PENDING`
- Production `build-info.json`: `PENDING`
- Hold regression tests: `PENDING`
- Live no-form/no-script page probe: `PENDING`
- Live API fail-closed probe: `PENDING`
- Supabase provider setting: `BLOCKED — SIGN-IN REQUIRED`
- EmailJS provider setting: `BLOCKED — NO AUTHENTICATED CHANNEL`
- Database/data quarantine audit: `BLOCKED — NO AUTHENTICATED CHANNEL`

Until every provider-side item passes, the parent decision remains `PARTIAL`, never `CLOSED`, `SECURE` or `COMPLIANT`.
