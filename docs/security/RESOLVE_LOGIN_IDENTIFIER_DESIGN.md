# Design note — `resolve_login_identifier(text)` (out of scope for migration 017)

**Status:** intentionally **unchanged** by `017_harden_reachable_security_definers.sql`.  
**Live posture:** SECURITY DEFINER; anon/authenticated executable; returns `profiles.email` for member_id or phone lookup.  
**Repo definition:** `supabase/migrations/20260719000000_phase0_member_id_foundation.sql:168–198`  
**Browser caller:** `index.html:2439` / `public/index.html:2439` (publishable key).

## Enumeration risk

Predictable `MDZ-?-######` member IDs allow bulk probing of the oracle. Successful probes return email addresses; failures leak existence patterns depending on client handling of null/empty responses.

## Predictable identifiers

Member IDs follow a structured, sequential-style format. Combined with anon EXECUTE, this enables systematic enumeration without authentication.

## Phone-to-email disclosure

Normalized Algerian phone numbers map directly to account email via the same RPC. An attacker with a phone list can harvest emails for existing accounts.

## Replacement login architecture (future package — not 017)

1. **Stop returning raw email to the browser.** Prefer one of:
   - Worker/Edge endpoint that accepts identifier + password and performs server-side resolve + GoTrue token grant without echoing email; or
   - Challenge token: resolve server-side, return opaque `login_challenge_id` bound to email in a short-TTL server table.
2. **Rate-limit** by IP + identifier hash (Worker KV / DB); fail closed on limit exceed with uniform responses.
3. **Constant-time / uniform responses** on miss (minimize user-existence oracle beyond what GoTrue already leaks).
4. **Migrate client** (`index.html` login path) to the new endpoint; keep RPC temporarily behind `service_role` only during dual-run.
5. **Then** `REVOKE EXECUTE … FROM public, anon, authenticated` on `resolve_login_identifier`.

## Migration compatibility

| Phase | Login | RPC grants |
|---|---|---|
| Now (post-017) | Existing RPC | **unchanged** by 017 |
| Dual-run | Client feature-flag to Worker | RPC still anon |
| Cutover | Worker-only | Revoke anon/authenticated/public |
| Cleanup | — | Optional DROP or service-only retain |

017 must not break member login. Any grant/body change to this RPC belongs in a dedicated follow-up with client cutover.

## Rate limiting

No rate limit exists inside the function body today. Replacement architecture **must** enforce IP + identifier-hash limits at the Worker/Edge boundary before resolve. DB-side throttling alone is insufficient while anon PostgREST EXECUTE remains.

## Explicitly not in 017

No `REVOKE`, no `CREATE OR REPLACE`, no client login edits, no search_path change for this function.
