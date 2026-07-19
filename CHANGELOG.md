# Changelog

All notable changes to MawashiDZ are documented here.

## [Phase 0 Final] — 2026-07-20 — Production baseline freeze

### Added

- Canonical migration `supabase/migrations/20260720_phase0_final.sql` (idempotent, merges all Phase 0 logic)
- `docs/PHASE0_DATABASE_ARCHITECTURE.md` — full database architecture reference
- `docs/PRODUCTION_CHECKLIST.md` — step-by-step deployment checklist
- `docs/PRODUCTION_READINESS_REPORT.md` — security audit and readiness summary
- `docs/PHASE0_TEST_REPORT.md` — auto-generated test report (`npm run test:db`)
- Automated security audit in test suite (grants, triggers, search_path, duplicates)

### Changed

- Archived superseded migrations to `supabase/migrations/archive/`
- Test harness now targets final migration only (fresh + legacy upgrade paths)
- `supabase/setup.sql` points to final migration

### Frozen scope

No new features. No RBAC. No QR. No verification workflow. No dashboards. Phase 1+.

## [1.8.2] — 2026-07-19 — Signup metadata hardening

### Changed

- `status` hardcoded to `'pending'` — never read from client metadata
- `normalize_public_signup_role()` whitelist: buyer, breeder, vet, feed; all others → buyer
- `safe_metadata_date()` prevents invalid birth_date from aborting signup
- ON CONFLICT keeps existing `status` (no client overwrite)
- `allocate_member_id()` normalizes role before prefix selection
- BEFORE INSERT overwrites client `member_id`, `role`, and `status` in metadata

### Added

- Security tests for spoofed member_id, status, roles, NULL metadata, invalid dates
- `authenticated` permission denial test for `allocate_member_id()`

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
