# ADR 001: Member ID allocation

## Status

Accepted — Phase 0 (2026-07-18)

## Context

MawashiDZ assigns every member a permanent ID (`MDZ-F-000001`, `MDZ-V-000001`, …). The first site version allocated IDs in the browser with random suffixes when the database RPC was unavailable. That caused:

- Duplicate IDs under concurrency
- IDs issued before signup validation completed
- No sync between legacy rows and counters

Production Supabase (verified 2026-07-18) still lacks `member_id`, `allocate_member_id()`, and related functions.

## Decision

1. **Database is the source of truth** for sequential member IDs via `allocate_member_id(role)`.
2. **Concurrency safety** uses `INSERT … ON CONFLICT DO UPDATE` on `member_id_counters` plus `pg_advisory_xact_lock` per role prefix.
3. **`handle_new_user()`** creates profiles automatically and allocates an ID when metadata does not include a valid unused sequential ID.
4. **Client pre-allocation** remains supported for signup UX/email templates, but the trigger backstops missing or conflicting IDs.
5. **Grants**: `member_id_counters` has no direct table access for `anon`/`authenticated`. RPCs are `SECURITY DEFINER` with explicit grants only.
6. **Phone normalization** is centralized in `normalize_algerian_phone()` and applied on insert/update.

## Consequences

- Migrations must be run manually on Supabase (not auto-deployed to production).
- Re-running Phase 0 migration is safe and idempotent.
- Automated tests (`npm run test:db`) validate fresh + legacy paths and 40 parallel allocations.
- Rate limiting for anonymous `allocate_member_id` calls is deferred to Phase 1 (Edge/Worker layer).

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| UUID-only member IDs | Not human-friendly for Algerian field users / support |
| Client-only sequential counters | Not safe under concurrency |
| Single global counter | Loses role prefix semantics required by product |
