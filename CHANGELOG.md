# Changelog

All notable changes to MawashiDZ are documented here.

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
