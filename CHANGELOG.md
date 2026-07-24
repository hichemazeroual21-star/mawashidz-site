# Changelog

All notable changes to MawashiDZ are documented here.

## [1.10.0] — 2026-07-24 — Phase 0 foundation hardening

### Added

- `supabase/migrations/008_admin_audit_and_roles.sql` — `user_roles` create-if-missing, `admin_audit_log`, grant/revoke role RPCs
- `supabase/migrations/009_schema_baseline_hardening.sql` — `registrations.status`, hardened insert policies, phone rate guard
- GitHub Actions CI (`.github/workflows/ci.yml`) running `test:ci`
- Runbooks: backup-restore, incident-response
- Static migration reviews for 008/009

### Changed

- `supabase/setup.sql` v1.10.0 — `user_roles`, registration status columns, profile protection trigger, insert guards
- `docs/database-schema.md` expanded to match production baseline
- Technical debt register updated (TD-003/006/007/008/011 closed or mitigated)

## [1.8.1] — 2026-07-19 — Security: server-side member_id only

### Changed

- `allocate_member_id()` EXECUTE restricted to `service_role` (revoked from `anon`, `authenticated`)
- Added `assign_member_id_before_signup()` BEFORE INSERT trigger on `auth.users`
- `index.html`: removed client RPC allocation; reads `member_id` after signup
- ADR 001, database schema, PR review report updated

### Added

- `supabase/migrations/20260719110000_secure_allocate_member_id.sql`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/PR_REVIEW_REPORT.md`
- Automated test: `anon` cannot execute `allocate_member_id()`

### Security

```sql
revoke all on function public.allocate_member_id(text) from public;
revoke all on function public.allocate_member_id(text) from anon, authenticated;
grant execute on function public.allocate_member_id(text) to service_role;
```

## [1.8.0] — 2026-07-18 — Phase 0: Database foundation

### Added

- `supabase/migrations/20260719000000_phase0_member_id_foundation.sql` — hardened member_id system for existing databases
- `supabase/sql/phase0_core.sql` — canonical function definitions
- `supabase/tests/run-phase0-tests.mjs` — automated DB tests (fresh + legacy + concurrency)
- `docs/adr/001-member-id-allocation.md` — architecture decision record
- `docs/database-schema.md` — schema reference and rollback notes

### Changed

- `supabase/setup.sql` — v1.8.0 fresh-install path with advisory locks, phone normalization, partial unique index
- `supabase/migrations/20260718220000_align_existing_schema.sql` — documents required Phase 0 follow-up
- `README.md` — updated Supabase setup instructions

### Security

- Revoked direct access to `member_id_counters` from `anon` / `authenticated`
- Revoked `PUBLIC` execute on sensitive functions; explicit grants only
- `resolve_login_identifier` no longer leaks whether email exists (returns null only)

### Verified

- Production API probe (read-only): `member_id` column and RPCs absent — migration not yet applied
- Local tests: `npm run test:db` — all passed (sequential, 40 parallel, legacy backfill, idempotent re-run)

## [1.7.1] — Prior

- Initial Supabase setup, align_existing migration, sequential MDZ ID client integration
