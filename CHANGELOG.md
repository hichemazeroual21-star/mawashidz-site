# Changelog

## [1.8.3] — 2026-07-19 — Phase 0 production-safety blockers closed

### Fixed / hardened
- Confirmed `jwt_role` uses valid multi-line `coalesce(nullif(...), '')` (reject broken one-liner)
- Legacy backfill order locked: sync counters → allocate NULL/blank → re-sync counters (§5/5b/5c)
- Second migration run proven to consume **zero** additional member IDs
- Legacy NULL role normalized and stored as `buyer` during backfill

## [1.8.2] — 2026-07-19 — Phase 0 syntax clarity + legacy member_id backfill

### Fixed
- `protect_profile_sensitive_columns` `jwt_role` declaration rewritten with explicit multi-line `coalesce(..., '')` (blocking paste clarity)

### Added
- Idempotent legacy `member_id` backfill (§5b) after counter sync for NULL/blank profiles
- Clarified: Phase 0 **does** assign member IDs to legacy profiles (required for MDZ login / account display)

## [1.8.1] — 2026-07-19 — Phase 0 role/security hardening (pre-Production)

### Verified
- Signup `raw_user_meta_data.role` wire values are exactly:
  `breeder | vet | feed | buyer | manager | ambassador | partner`
  (not `veterinarian` / `feed_seller` / `wilaya_manager`)

### Security
- `handle_new_user` ignores client `member_id` and client `status`
- Always allocates `member_id` server-side; new profiles always `pending`
- `allocate_member_id` revoked from `anon` / `authenticated` (stops counter exhaustion)
- Canonical `public.mdz_role_prefix()` + `mdz_normalize_role()` with defense-in-depth aliases
- Documented open/resolved risks in `SECURITY.md`

## [1.8.0] — 2026-07-18 — Phase 0 Database Foundation

### Added
- Idempotent migration for **existing** databases: `supabase/migrations/20260718233000_phase0_existing_database.sql`
- Separate bootstrap migration for **fresh** databases: `supabase/migrations/20260718233001_phase0_fresh_database.sql`
- Rollback scripts under `supabase/rollbacks/`
- Local test harness: `supabase/tests/run_phase0_tests.sh` (includes 100-way concurrency)
- Docs: ADR 0001, database schema, roadmap, Phase 0 report

### Fixed
- Missing `profiles.member_id` and related columns (via `ADD COLUMN IF NOT EXISTS`, not table recreate)
- Missing `allocate_member_id`, `resolve_login_identifier`, `handle_new_user`
- Race-safe sequential member IDs under concurrent allocation

### Security
- Revoke PUBLIC execute on sensitive functions
- RLS on `member_id_counters` with zero policies
- Immutable `member_id` / `role` / `status` once set

### Changed
- `supabase/setup.sql` is now a Phase 0 router
- Legacy migration `20260718220000_align_existing_schema.sql` marked deprecated

## [1.7.x] — prior
- Site structure fixes, Netlify news function, initial Supabase setup attempt
