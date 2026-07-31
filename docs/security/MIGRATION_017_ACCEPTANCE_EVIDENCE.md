# Migration 017 — Final Acceptance Evidence

**Decision:** COMPLETE AND ACCEPTED  
**Recorded (UTC):** 2026-07-31  
**Applied migration:** PR #26 head `4ddcc93f7f26f1a96ce000f61827567624aad5bc`  
(`to_regprocedure` OID resolver — not the pre-fix `identity_args` false-drift build)

## Linked artifacts

| Artifact | Path |
|---|---|
| Migration | `supabase/migrations/017_harden_reachable_security_definers.sql` |
| Verification | `supabase/migrations/017_harden_reachable_security_definers.verify.sql` |
| Partial manual rollback | `supabase/migrations/017_harden_reachable_security_definers.partial-manual-rollback.sql` |
| Remediation design | `docs/security/MIGRATION_017_REMEDIATION.md` |
| Login design (out of band) | `docs/security/RESOLVE_LOGIN_IDENTIFIER_DESIGN.md` |
| Pre-apply capture archive | `/opt/cursor/artifacts/migration-017-pre-apply-capture/` |
| Resolver fix diff | `/opt/cursor/artifacts/017_regprocedure_resolver.diff` |
| Apply kit (PR #26) | `/opt/cursor/artifacts/migration-017-apply-pr26-go/` |

## Post-apply verification (committee / operator)

| Gate | Result |
|---|---|
| Retained functions | **PASS** |
| Privilege matrix | **PASS** |
| Required triggers | **PASS** |
| Legacy functions/triggers removed | **PASS** |
| `get_wilaya_manager_email` `search_path` lock | **PASS** — `observed_search_path = ""` |

## Standing freeze (Migration 017)

Do **not** perform any additional `ALTER`, `REVOKE`, `GRANT`, `DROP`, or rollback related to Migration 017.

Any future database work is a **new, separate task** (new migration number / separate PR).

## Notes

- Production apply used the PR #26 resolver migration after the Section B false-drift abort of the prior identity_args build (full single-transaction rollback; Production was unchanged by that aborted attempt).
- Owner paste for verify (`captured_owners` = `postgres`) came from the Go/No-Go pre-apply capture; PR #25 (repo paste onto `main`) may still be open separately and does not reopen 017 scope.
