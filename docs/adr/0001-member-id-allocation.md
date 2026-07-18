# ADR 0001 — Sequential member_id allocation

## Status
Accepted (Phase 0 — 2026-07-18)

## Context
Registration previously fell back to a client-side random `MDZ-{ROLE}-{DATE}-{RAND}` when the database RPC was missing. Live Supabase (project `fpjvjfgwbfehhcvdirpy`) was verified on 2026-07-18 to still lack:

- `member_id_counters`
- `allocate_member_id()`
- `resolve_login_identifier()`
- `profiles.member_id` and related columns

A prior migration (`20260718220000`) was merged to git but **never applied** to Production.

## Decision
1. Allocate IDs as `MDZ-{PREFIX}-{000001}` via `member_id_counters` + `INSERT … ON CONFLICT DO UPDATE`.
2. Add `pg_advisory_xact_lock` per prefix for burst concurrency.
3. Keep a unique partial index on `profiles.member_id`.
4. Make `handle_new_user` authoritative: accept a client-provided sequential ID only if format-valid and unused; otherwise allocate server-side.
5. Sync counters from any pre-existing sequential IDs before serving new ones.
6. Ship **two** migration paths: existing DB vs fresh DB.
7. Never apply Production migrations from CI/agent automation.

## Consequences
- Concurrent registration cannot mint duplicate sequential IDs (verified with 100 parallel allocators).
- Client spoofing of arbitrary member IDs is rejected when colliding or malformed.
- `allocate_member_id` remains executable by `anon` for current registration UX (Phase 1 TODO: move allocation fully server-side / rate-limit).
- Owner must manually run the Phase 0 SQL in Supabase SQL Editor.

## Rollback
See `supabase/rollbacks/20260718233000_phase0_existing_database_rollback.sql` (keeps columns/data).
