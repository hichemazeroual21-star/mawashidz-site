# Registration Flow Critical Audit

**Date:** 2026-07-19  
**Scope:** `index.html`, `js/registration-flow.mjs`  
**Production:** Fixes on `main`; operator must apply SQL migrations on Supabase.

---

## 1. Root Cause

### Primary: coupled failure handling (fixed)

The registration handler wrapped **auth signup** and **`registrations` insert** in a **single `try/catch`** (`index.html` ~2358–2391 before fix).

| Step | On success | On failure (old behavior) |
|------|------------|-------------------------|
| `auth.signUp()` | `auth.users` + profile trigger | Catch → **failure UI** |
| `supabaseInsert('registrations')` | Founding row saved | Catch → **failure UI** — even if auth already succeeded |

**Result:** Account created in Supabase, but UI showed `تعذر حفظ الطلب` or similar. User retries → auth returns “already registered” or `registrations` returns duplicate phone → **misleading duplicate-phone message**.

### Secondary factors

1. **No in-flight submit guard** — double-click could fire two signups.
2. **Email was already non-blocking** (`void sendRegistrationEmail().catch(...)`) — EmailJS was **not** the cause of false failures in current code.
3. **Historical `تعذر الإرسال`** — existed in older uploads (`208e302`) when only `registrations` insert was attempted; removed in later refactors but partial-success bug remained after auth was added.

### Duplicate phone source

| Source | When |
|--------|------|
| `auth.users` | No phone uniqueness |
| `profiles` | No phone unique constraint (Phase 0) |
| **`registrations`** | **`UNIQUE (phone)`** — primary source |
| Frontend validation | Format only, not duplicate check |
| Generic catch | Mapped 409/`23505` via `duplicateRegistrationMessage()` |

---

## 2. Files and Line Numbers

| File | Lines | Role |
|------|-------|------|
| `index.html` | 2026–2077 | EmailJS (`sendRegistrationEmail`, `sendMemberConfirmationEmail` — unused) |
| `index.html` | 2108 | `signUpAccount()` → `/auth/v1/signup` |
| `index.html` | 2090–2099 | `memberIdAfterSignup()` |
| `index.html` | 2121–2147 | `supabaseInsert()` |
| `index.html` | 2278–2417 | Registration form submit handler |
| `index.html` | 2278 | `registerFormSubmitting` guard |
| `js/registration-flow.mjs` | 85–216 | `runRegistrationPipeline()` — decoupled orchestration |
| `js/registration-flow.mjs` | 39–51 | `duplicateRegistrationMessage()` — accurate 409 mapping |
| `tests/registration-flow.test.mjs` | — | 8 scenario tests |
| `tests/registration-ui-guard.test.mjs` | — | Double-click guard test |

### Execution order (after fix)

```
1. Client validation (name, password, phone, age)
2. registerFormSubmitting = true; disable submit
3. auth.signUp()                    → auth.users + BEFORE/AFTER triggers → profiles
4. memberIdAfterSignup()            → metadata or profile fetch
5. supabaseInsert('registrations')  → founding row (failure → warning, NOT failure UI)
6. sendRegistrationEmail()          → EmailJS admin notify (failure → warning toast)
7. Success UI + member_id display
8. localStorage backup + form reset
9. registerFormSubmitting = false
```

---

## 3. Proposed Fix (implemented)

1. **Decouple success criteria** — success = auth account created.
2. **`registrations` insert failure** after auth → success UI + `registrationWarning`.
3. **Email failure** → success UI + `تم التسجيل بنجاح، لكن تعذر إرسال رسالة التأكيد.`
4. **`registerFormSubmitting`** — block parallel submits / double-click.
5. **No automatic auth retry** — single `signUpAccount` per submit.
6. **Auth duplicate recovery** — if auth exists but founding row missing, attempt `registrations` insert only.
7. **Accurate duplicate mapping** — only on `409` / `23505` with email/phone in constraint text.

---

## 4. Patch Summary

- **Added** `js/registration-flow.mjs` — testable pipeline
- **Added** `tests/registration-flow.test.mjs`, `tests/registration-ui-guard.test.mjs`
- **Modified** `index.html` — submit handler uses pipeline + guard
- **Modified** `package.json` — `test:registration`, `test` scripts

---

## 5. Test Results

```
Registration flow tests: 11 passed, 0 failed
UI guard: 1 passed
Phase 0 DB tests: ALL PASSED
```

Scenarios covered:

| # | Scenario | Result |
|---|----------|--------|
| 1 | Signup success + email success | ✅ |
| 2 | Signup success + email failure | ✅ (warning, still success) |
| 3 | Duplicate phone (registrations after auth) | ✅ (success + warning) |
| 4 | Duplicate email (auth) | ✅ |
| 5 | Auth failure before account | ✅ |
| 6 | Double-click / duplicate auth + reg | ✅ |
| 7 | Network timeout on registrations after auth | ✅ (success + warning) |
| 8 | Existing auth, missing registration row | ✅ (recovery path) |

---

## 6. False-Error Issue: Reproducible & Fixed?

| Question | Answer |
|----------|--------|
| Reproducible on old code? | **Yes** — auth succeeds + `registrations` fails → failure UI |
| Email failure caused false failure? | **No** (already fire-and-forget before fix) |
| Fixed in this patch? | **Yes** — auth success always shows success UI |
| Production deployed? | **Yes** (Workers `mawashidz-live`; DB migrations operator-applied) |

*Last verified: 2026-07-22.*
