# Auth flow diagnostic — 26 Jul 2026

**Branch:** `cursor/auth-flow-diagnostic-3447`  
**Scope:** Frontend instrumentation only (`index.html` / `public/index.html`). No DB, migrations, deploy, or Arabic message removal.

## Why this exists

On production, حسابي often shows the generic Arabic string `تعذر إتمام العملية الآن` (`authErrGeneric`) while Logout is visible. Login can flash `تم الدخول بنجاح` without a working account/admin chrome. Root causes were masked because:

1. `authErrorArabic()` maps most failures to `authErrGeneric` for the UI (kept as-is).
2. `fetchMyRoles()` returned `[]` on HTTP failure with no console signal.
3. `updateAuthChrome()` ran from `saveSession()` **before** roles loaded, and was not always re-run after roles resolved / after login completed.

## What was added

| Piece | Behavior |
|-------|----------|
| `mdzAuthDiagRecord(step, error, extra)` | `console.error('[mdz-auth-diag]', step, { error, status, code, message, supabase })` and stores `mdzAuthLastError` |
| `mdzAuthLastRolesRaw` | Last `user_roles` fetch payload (`ok`, `status`, `rows`/`roles` or error) |
| `#mdzAuthDiagPanel` | On-screen panel when `user_roles` includes `founder` **or** URL has `?debug=1` |
| `updateAuthChrome()` re-run | After successful login (post-`openAccount`), after every successful `fetchMyRoles` in account/manager/admin/boot paths |

Arabic UI strings are unchanged: catches still call `authErrorArabic(e)` / existing `t(...)` keys for the user-facing notice.

## Instrumented steps (console)

Filter browser console by `[mdz-auth-diag]`.

| Step name | When it logs |
|-----------|----------------|
| `getSession.parse` | `localStorage` JSON parse failure |
| `userIdFromAccessToken` | JWT payload parse failure |
| `ensureFreshSession.refresh` | Refresh-token grant failed (session cleared) |
| `fetchMyProfile` | Missing user id, 401/403, or non-OK profiles REST |
| `fetchMyRoles` | Non-OK `user_roles` REST **or** network throw (still returns `[]` to preserve prior control flow) |
| `openAccount` / `fetchMyProfile` / `fetchMyRoles` / `import.mdz-dashboards` / `renderAccountDashboard` | Inner account modal failure; `step` is the last step entered |
| `openAccount` + `no_session` | Account open with no access token after refresh |
| `loginForm` | Identifier resolve or password grant failure |
| `handleAuthRedirect.exchangeAuthCode` | PKCE code exchange failure |
| `resetPasswordForm` | Post-recovery password update failure |
| `openManagerDashboard` / `openAdminDashboard` / `refreshAdminDashboard` | Dashboard gate or load failures |

Each log includes:

- **step** — string above  
- **error** — thrown object  
- **status** — HTTP / Supabase status when attached (`e.status`)  
- **code** — `e.code` or body `error` / `error_code` / `code` / `http_<status>`  
- **supabase** — response body when captured as `extra.body`

## On-screen panel fields

Visible only if `founder` is in in-memory `mdzUserRoles` **or** `?debug=1`:

1. **getSession()** — `has session: yes/no` and `user id`  
2. **fetchMyRoles() raw** — JSON of last fetch (`ok`, `status`, `rows`, `roles`)  
3. **last real error code** — `code | status=… | step=… | message`

Collapsed by default as a floating **`diag ▸`** toggle on the **bottom-right** (not under the yellow feedback FAB). Panel `z-index:115` sits above feedback/dock and **below** modals (`1300`). While `?debug=1` / founder diag is active, the feedback FAB is hidden. × **only collapses** — there is **no** localStorage/sessionStorage dismiss. Auto-hides while a text input/textarea/select is focused. On account open failure with `?debug=1`, the Arabic notice also shows a `diag: code | status | step` line and the panel auto-expands.

## How to reproduce on production (after this build is deployed by Founder)

1. Open `https://mawashidz.com/?debug=1` on the phone (panel appears even before founder role loads).  
2. Log in with the account that shows the bug.  
3. Tap **حسابي**.  
4. Read the panel: session yes/no + user id, roles raw, last error code.  
5. Optional: remote console / WebView inspect — filter `[mdz-auth-diag]`.  
6. Without `?debug=1`, panel appears only after roles resolve and include `founder`.

### Interpretation cheat-sheet

| Panel / console | Likely meaning |
|-----------------|----------------|
| `profile_missing` | Auth user exists; no `profiles` row for that id |
| `fetchMyProfile` + 401/403 | Session/JWT rejected by REST RLS or expired token |
| `fetchMyRoles` + non-OK + `roles: []` | RLS/policy or REST error — explains missing لوحة الإدارة even if SQL shows a `user_roles` row for another user id |
| `has session: yes`, roles include `founder`, admin button still hidden | Chrome not refreshed (this patch re-runs `updateAuthChrome`; if still broken after deploy, screenshot panel) |
| Login success Arabic + empty form | Separate UX race; watch whether `openAccount` step fails immediately after login |

## Non-goals / acceptance

- [x] No DB or migration changes  
- [x] No removal of Arabic user-facing messages  
- [x] No deploy from this agent  
- [x] Console surfaces real error + step + status/code  
- [x] Founder / `?debug=1` panel shows the three values  
- [x] `updateAuthChrome` after login and after roles resolve  

Remove `#mdzAuthDiagPanel` and `mdzAuthDiag*` helpers once production triage is complete.
