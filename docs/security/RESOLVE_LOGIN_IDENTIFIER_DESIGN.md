# Design note — `resolve_login_identifier(text)` (out of scope for migration 017)

**Status:** intentionally **unchanged** by `017_harden_reachable_security_definers.sql`.  
**Live posture:** SECURITY DEFINER; anon/authenticated executable; returns `profiles.email` for member_id or phone lookup.  
**Repo definition:** `supabase/migrations/20260719000000_phase0_member_id_foundation.sql:168–198`  
**Browser caller:** `index.html:2439` / `public/index.html:2439` (publishable key).

## Risks (confirmed by repo + live grant posture)

1. **Enumeration:** predictable `MDZ-?-######` member IDs allow bulk probing.
2. **Phone-to-email disclosure:** normalized Algerian phones map to account email.
3. **No authorization / no rate limit** inside the function body.
4. **Anon EXECUTE** makes the oracle internet-reachable via PostgREST.

## Constraints

- Current login UX depends on resolving member_id/phone → email before GoTrue password grant.
- Breaking this RPC without a replacement **breaks member login**.

## Replacement architecture (future package — not 017)

1. **Stop returning raw email to the browser.** Prefer one of:
   - Worker/Edge endpoint that accepts identifier + password and performs server-side resolve + `/auth/v1/token` (or `signInWithPassword`) without echoing email; or
   - Challenge token: resolve server-side, return opaque `login_challenge_id` bound to email in a short-TTL server table.
2. **Rate-limit** by IP + identifier hash (Worker KV / DB).
3. **Constant-time / uniform responses** on miss (no “user exists” oracle via status differentiation beyond what GoTrue already leaks).
4. **Migrate client** (`index.html` login path) to the new endpoint; keep RPC temporarily behind service_role only during dual-run.
5. **Then** `REVOKE EXECUTE … FROM anon, authenticated` on `resolve_login_identifier`.

## Compatibility plan

| Phase | Login | RPC grants |
|---|---|---|
| Now (post-017) | Existing RPC | unchanged |
| Dual-run | Client feature-flag to Worker | RPC still anon |
| Cutover | Worker-only | Revoke anon/authenticated |
| Cleanup | — | Optional DROP or service-only retain |

## Explicitly not in 017

No `REVOKE`, no `CREATE OR REPLACE`, no client login edits.
