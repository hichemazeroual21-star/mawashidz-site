# Production Drift Report

Generated 2026-07-19 during production-recovery-v1.9.0 integration.

## Artifact sizes (index.html)

| Source | Bytes | Version |
|--------|------:|---------|
| live_recovered (pre-integration) | 555849 | v1.9.0 |
| current branch | 556371 | v1.9.0 |
| origin/main | 541006 | v1.7.1 |
| 5d2a0ac | 541006 | v1.7.1 |
| c62bb40 fix | 539342 | v1.7.1 |

## Feature presence matrix

| Feature | Live v1.9.0 | main/5d2a0ac | c62bb40 fix | Integrated branch |
|---------|:-----------:|:------------:|:-----------:|:-----------------:|
| v1.9.0 version string | ✓ | — | — | ✓ |
| updateAuthChrome | ✓ | — | — | ✓ |
| ensureFreshSession | ✓ | — | — | ✓ |
| refreshSession | ✓ | — | — | ✓ |
| is-success modal | ✓ | — | — | ✓ |
| openAccountAfterSignup | ✓ | — | — | ✓ |
| Phase 1 auth UI block | ✓ | — | — | ✓ |
| runRegistrationPipeline | — | — | ✓ | ✓ |
| registerFormSubmitting | — | — | ✓ | ✓ |
| registration-flow.mjs | — | — | ✓ | ✓ |
| old coupled handler | — | ✓ | — | — |

## Files changed vs origin/main

```
docs/PRODUCTION_RECOVERY_MANIFEST.md |  54 ++++
 index.html                           | 557 ++++++++++++++++++++++++++++++-----
 2 files changed, 536 insertions(+), 75 deletions(-)
```

## Live v1.9.0-only features (not in origin/main)

- Declared version v1.9.0 (main is v1.7.1 @ 5d2a0ac)
- Phase 1 Auth UI stylesheet block (`mdz-v19-phase1-auth-ui`) with premium success card contrast
- `updateAuthChrome()` — header/drawer login/register/account visibility sync
- `ensureFreshSession()` + `refreshSession()` — silent token refresh before account actions
- Enhanced login form states (`login-state is-ok/is-error`) and Arabic `authErrorArabic()`
- Signup `redirect_to` with `#auth-callback` and `handleAuthRedirect()` flow
- Success modal `is-success` mode hiding form fields after signup
- `openAccountAfterSignup` button when session active post-signup
- Richer `openAccount()` profile view (status pill, registration_id, relogin)
- Non-enumerating forgot-password messaging
- Algerian phone normalization in `resolveLoginEmail()`

## Features in origin/main but absent from live v1.9.0

- None significant — live v1.9.0 is a superset of main frontend behavior
- Phase 0 DB migration files exist on main but are backend-only (not in static HTML)

## Registration fix (c62bb40) vs live v1.9.0

- Fix branch targeted v1.7.1 index.html and replaced v1.9.0 success UI with `buildSuccessConfirmHtml`
- This integration keeps live v1.9.0 UI and adds only the decoupled pipeline + generic conflict messages
- `js/registration-flow.mjs` was not deployed to production (404 on live site before this PR)

## Uncommitted / unknown production edits

- Live v1.9.0 (555,849 bytes) does **not** match any remote branch or `5d2a0ac` (541,006 bytes)
- Diff vs main: +482 / −75 lines in index.html — indicates manual or alternate deploy path
- `assets/algeria_cities.json` SHA-256 matches repo (no drift)
- Recovery branch preserves exact live bytes in commit `db7b6eb` before integration

## Secrets / environment-specific values

- Supabase publishable key and project URL (expected client-side)
- EmailJS public service/template IDs (expected client-side)
- No service_role or private API keys found
- Do not commit `.env` or Supabase service keys — none present in recovered artifact
