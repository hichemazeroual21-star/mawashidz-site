# ADR 001: Member ID allocation

## Status

Accepted — updated v1.8.1 (2026-07-19) after external security review

## Context

MawashiDZ assigns every member a permanent ID (`MDZ-F-000001`, `MDZ-V-000001`, …). Early Phase 0 granted `allocate_member_id()` to `anon` so the browser could pre-allocate IDs before signup. External review correctly flagged this as an abuse vector (counter exhaustion, scraping) without rate limiting.

## Decision

1. **Database is the sole allocator** — `allocate_member_id()` is callable only by `service_role` and internal `SECURITY DEFINER` triggers.
2. **`assign_member_id_before_signup()`** — `BEFORE INSERT` on `auth.users` allocates the ID and writes it into `raw_user_meta_data` (available in confirmation emails).
3. **`handle_new_user()`** — `AFTER INSERT` creates `profiles` using the server-assigned `member_id`.
4. **No browser RPC** — the frontend never calls `allocate_member_id()`.
5. **Concurrency safety** — advisory lock + atomic counter row (unchanged).

## Consequences

- Anonymous users cannot exhaust member ID counters.
- Signup still receives `member_id` in user metadata and profile.
- Manual verification requires `service_role` or SQL Editor (not publishable key).

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Keep `anon` + rate limiting later | Review requires protection now; deferred controls are insufficient |
| Client-only allocation | Not concurrency-safe |
| AFTER INSERT only | `member_id` missing from signup email metadata |
