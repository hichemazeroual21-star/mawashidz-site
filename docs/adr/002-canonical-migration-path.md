# ADR 002 — Canonical database migration path

**Status:** Accepted  
**Date:** 2026-07-24  
**Deciders:** Engineering (Constitution amendment track)  
**Tags:** database, migrations, DX  
**Related debt:** TD-001  

## Context

The repository contains:

- Sequential migrations `supabase/migrations/001_*.sql` … `012_*.sql` (and continuing)
- Older timestamped migrations `20260718*` / `20260719*` for member-id foundation
- `supabase/setup.sql` as a fresh-install baseline that is not a full replay of every RPC

Dual paths cause drift risk for fresh installs and unclear “source of truth” for apply order (TD-001).

## Decision

1. **Canonical apply path for existing / production-shaped DBs:** numbered migrations in lexical order under `supabase/migrations/`, including timestamped files in that sort order when present.  
2. **Fresh project path:** `supabase/setup.sql` at the documented version, then **only** numbered migrations **after** the setup watermark (document the watermark in `docs/database-schema.md` / setup header).  
3. **No new timestamped-only migrations** unless required for an already-deployed hotfix; prefer next integer `0NN_*.sql`.  
4. **Do not delete** legacy timestamped files (history / prod compatibility); mark them in docs as “applied via historical path.”  
5. CI continues to use **static SQL shape tests**; live migrate smoke remains an ops gate.

## Consequences

- Clearer onboarding and runbooks.  
- TD-001 moves to **Mitigated** (not fully Closed until a single replay script is proven on a blank project).  
- Future ADRs required before renaming/squashing historical migrations.

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Squash all history into one setup.sql now | Breaks applied production timelines; high risk |
| Timestamp-only going forward | Diverges from Phase 0–1 numbering already in use |
| Ignore dual path | Fresh install failures remain |

## Follow-up

- [ ] Blank-project install drill documented under `docs/runbooks/`  
- [ ] Keep `TECHNICAL_DEBT_REGISTER` TD-001 until blank install Verified
