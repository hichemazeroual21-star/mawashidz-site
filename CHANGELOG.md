# Changelog

## [1.9.0] — 2026-07-19 — Phase 1 Auth UI / UX

### Added
- Complete login flow: email / Algerian phone / member_id via `resolve_login_identifier`
- Header + mobile drawer auth states: تسجيل الآن / تسجيل الدخول ↔ حسابي / تسجيل الخروج
- Dashboard (حسابي): الاسم، رقم العضوية، رقم الطلب، الصفة، الحالة، البريد، الهاتف
- Email confirmation redirect handling + session restore / refresh
- Arabic Supabase email template guide: `docs/auth-email-templates-ar.md`

### Fixed
- Registration success screen contrast (white-on-light caused by CSS override)
- `member_id` no longer generated in JavaScript; read from Supabase profile only
- Clearer Arabic auth error messages and login loading state

### Changed
- Site version badge → **v1.9.0**

## Prior
- v1.7.1 header/mobile polish and registration UX on `main`
