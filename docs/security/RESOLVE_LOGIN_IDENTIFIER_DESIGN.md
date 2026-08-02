# Login identifier boundary — Worker cutover + migration 019

**Repository status:** implemented by the Worker/client cutover and `019_lock_login_identifier.sql`; live closure still requires deploy + migration evidence.
**Pre-019 live posture:** SECURITY DEFINER; anon/authenticated executable; returns `profiles.email` for member_id or phone lookup.
**Repo definition:** `supabase/migrations/20260719000000_phase0_member_id_foundation.sql:168–198`  
**Browser caller:** `index.html:2439` / `public/index.html:2439` (publishable key).

## Enumeration risk

Predictable `MDZ-?-######` member IDs allow bulk probing of the oracle. Successful probes return email addresses; failures leak existence patterns depending on client handling of null/empty responses.

## Predictable identifiers

Member IDs follow a structured, sequential-style format. Combined with anon EXECUTE, this enables systematic enumeration without authentication.

## Phone-to-email disclosure

Normalized Algerian phone numbers map directly to account email via the same RPC. An attacker with a phone list can harvest emails for existing accounts.

## Implemented replacement architecture

1. `/api/auth/login` accepts identifier + password, resolves server-side, performs the GoTrue password grant, and never echoes the resolved email.
2. `/api/auth/recover` returns the same `202 {ok:true}` for found and missing identifiers.
3. Both endpoints consume Cloudflare limits keyed by identifier SHA-256 and connecting IP before any Supabase lookup. Missing bindings fail closed with 503.
4. The browser calls only these Worker endpoints.
5. Migration 019 revokes resolver EXECUTE from `public`, `anon`, and `authenticated`, retaining only `service_role`.

## Migration compatibility

| Phase | Login | RPC grants |
|---|---|---|
| Pre-deploy | Existing RPC | anon/authenticated (known exposure) |
| Worker deploy | Client uses Worker | temporarily unchanged |
| Migration 019 | Worker-only | service_role only |
| Verified | Worker probe returns 429; SQL verify returns `OK` | closed |

017 must not break member login. Any grant/body change to this RPC belongs in a dedicated follow-up with client cutover.

## Rate limiting

The Worker enforces 5 attempts/60 seconds per identifier hash and 30/60 seconds per IP. The SQL cutover is mandatory because a public PostgREST grant would bypass those limits.

## Ordering invariant

Deploy the Worker/client first, then apply 019. Applying 019 first would break member-ID/phone login on the old client. Closure requires evidence from both layers on the same deployed release.
