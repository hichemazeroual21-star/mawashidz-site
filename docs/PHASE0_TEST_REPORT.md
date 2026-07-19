# Phase 0 Test Report

**Generated:** 2026-07-19T12:03:42.468Z UTC
**Migration:** `migrations/20260720_phase0_final.sql`
**Status:** ✅ ALL PASSED

## Summary

| Category | Count |
|----------|-------|
| Passed | 12 |
| Security | 16 |
| Concurrency | 2 |
| Coverage | 3 |
| Failed | 0 |

## Passed Tests

- ✅ Sequential member_id allocation
- ✅ Parallel member_id allocation (40 workers)
- ✅ assign_member_id_before_signup() BEFORE INSERT trigger
- ✅ handle_new_user() AFTER INSERT trigger
- ✅ One signup → one profile
- ✅ NULL metadata signup defaults (buyer, pending)
- ✅ safe_metadata_date() rejects invalid input
- ✅ Fresh install path — idempotent re-run
- ✅ Legacy upgrade — member_id backfill + phone normalization
- ✅ resolve_login_identifier() — phone and member_id
- ✅ Parallel member_id allocation (40 workers)
- ✅ Legacy upgrade path — idempotent re-run

## Security Tests

- 🔒 No anon EXECUTE on allocate_member_id()
- 🔒 No authenticated EXECUTE on allocate_member_id()
- 🔒 Client-controlled member_id overwritten
- 🔒 Client-controlled status ignored — always pending
- 🔒 Privileged role (admin) downgraded to buyer
- 🔒 Unknown role downgraded to buyer
- 🔒 Role whitelist — valid roles get correct prefix
- 🔒 No anonymous/authenticated EXECUTE on allocate_member_id()
- 🔒 Exactly one trigger per signup purpose
- 🔒 SECURITY DEFINER allocate_member_id() has search_path=public
- 🔒 SECURITY DEFINER sync_member_id_counters_from_profiles() has search_path=public
- 🔒 SECURITY DEFINER resolve_login_identifier() has search_path=public
- 🔒 SECURITY DEFINER assign_member_id_before_signup() has search_path=public
- 🔒 SECURITY DEFINER handle_new_user() has search_path=public
- 🔒 No duplicate core function definitions
- 🔒 Client-controlled status ignored — always pending

## Concurrency Tests

- ⚡ 40 parallel allocate_member_id() calls — no duplicates
- ⚡ 40 parallel allocate_member_id() calls — no duplicates

## Coverage

- 📋 allocate_member_id() format + uniqueness
- 📋 All 7 canonical Phase 0 functions present
- 📋 Login identifier resolution

## Test Paths

1. **Fresh install** — empty database + `20260720_phase0_final.sql`
2. **Legacy upgrade** — pre-Phase-0 schema stub + `20260720_phase0_final.sql`
3. **Idempotent re-run** — final migration executed twice

## Environment

- Embedded PostgreSQL (embedded-postgres)
- Node.js test runner: `npm run test:db`

---
*Phase 0 Final — production baseline. Do not deploy without owner approval.*
