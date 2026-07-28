# Phase 0 Evidence Report

Status: **D4 — ABORT / HARD STOP**  
UTC date: 2026-07-28

## 1. Execution log

| Package | Actor | System | Result |
|---|---|---|---|
| PKG-00 | Prior Cursor Cloud Engineer | Clean clone, CI, public production endpoints | ACCEPTED by Principal Engineer |
| PKG-01-R implementation | Cursor Cloud Agent (GPT-5.6 Sol) | Repository branch `cursor/pkg-01-r-prod-prober-9060` | Complete |
| PKG-01-R unit tests | Cursor Cloud Agent (GPT-5.6 Sol) | Cursor Cloud / Node 22 | Passed |
| PKG-01-R baseline | Cursor Cloud Agent (GPT-5.6 Sol) | Production anonymous PostgREST API | Passed; no visible rows |
| PKG-01-R comparison | Cursor Cloud Agent (GPT-5.6 Sol) | Production anonymous PostgREST API | Passed; baseline matched |
| PKG-02 prerequisite gate | Cursor Cloud Agent (GPT-5.6 Sol) | Supabase owner SQL Editor required | Failed: Operator and backup confirmation unavailable |
| PKG-02 Q1–Q7 | Operator NOT PRESENT | Production PostgreSQL catalog | NOT EXECUTED |

No production mutation, migration, deployment, provider change, dashboard
change, grant, audit remediation, or package update was performed.

## 2. PKG-00

- `main` at acceptance: `d887c2e5e478b36ff49730e8b4ec3d50517e1651`
- Node: `v22.14.0`
- npm: `10.9.7`
- `npm ci`: exit 0
- `npm run test:ci`: exit 0
- `npm run build`: exit 0
- `npm run verify:public`: exit 0
- Clean-clone worktree: clean
- Production version: `1.10.0`
- Production commit: `d887c2e5e478b36ff49730e8b4ec3d50517e1651`
- Production Worker: `mawashidz-live`
- Apex commit equals accepted `main` tip: **YES**

The Principal Engineer accepted PKG-00 in Amendment 1.

`npm ci` reported three high-severity development-only findings in the chain
`wrangler -> miniflare -> sharp -> libvips` (CVE-2026-33327/33328). The Worker
ships no `sharp` runtime and the application does not process image input.
Per order, the findings are recorded and not remediated; Wrangler and the lock
file were not changed.

## 3. PKG-01-R

- Draft PR: <https://github.com/hichemazeroual21-star/mawashidz-site/pull/20>
- Full evidence: `evidence/PKG01_probe.txt`
- Baseline: `docs/runbooks/evidence/prod-db-baseline.json`
- Source-derived volatility map: `docs/runbooks/evidence/function-volatility.json`
- Dedicated prober tests: exit 0
- Full unit suite: exit 0
- Baseline capture: exit 0
- Baseline comparison: exit 0
- Anonymous RLS-visible rows: zero on every reachable table
- `mdz_next_registration_id`: **NOT PROBED (measured by Q1)**

### Expected versus observed

| Object | Expected | Observed | Result |
|---|---|---|---|
| `registrations` | REACHABLE, rows=0 | REACHABLE, rows=0 | CONFIRMED |
| `profiles` | REACHABLE, rows=0 | REACHABLE, rows=0 | CONFIRMED |
| `user_roles` | REACHABLE, rows=0 | REACHABLE, rows=0 | CONFIRMED |
| `contact_messages` | REACHABLE, rows=0 | REACHABLE, rows=0 | CONFIRMED |
| `feedback_tickets` | REACHABLE, rows=0 | REACHABLE, rows=0 | CONFIRMED |
| `notifications` | DENIED | DENIED | CONFIRMED |
| `support_tickets` | DENIED | DENIED | CONFIRMED |
| `support_messages` | DENIED | DENIED | CONFIRMED |
| `email_outbox` | DENIED | DENIED | CONFIRMED |
| `member_id_counters` | DENIED | DENIED | CONFIRMED |
| `mdz_schema_migrations` | DENIED | DENIED | CONFIRMED |
| `admin_audit_log` | ABSENT_TABLE | ABSENT_TABLE | CONFIRMED |
| `mdz_is_platform_admin` | REACHABLE | REACHABLE | CONFIRMED |
| `mdz_is_wilaya_manager` | REACHABLE | REACHABLE | CONFIRMED |
| `mdz_caller_wilaya` | REACHABLE | REACHABLE | CONFIRMED |
| `mdz_assert_admin_caller` | ABSENT_FUNCTION | ABSENT_FUNCTION | CONFIRMED |
| `resolve_login_identifier` | REACHABLE | REACHABLE | CONFIRMED |
| `mdz_role_prefix` | not predicted | REACHABLE | MEASURED |
| `normalize_algerian_phone` | not predicted | UNRESOLVED (PGRST202) | FLAGGED |
| `mdz_msg_registration_id` | not predicted | DENIED | MEASURED |
| `mdz_is_test_registration_email` | not predicted | REACHABLE | MEASURED |
| `mdz_registration_id_missing` | not predicted | UNRESOLVED (PGRST202) | FLAGGED |
| `mdz_is_real_pending_registration` | not predicted | UNRESOLVED (PGRST202) | FLAGGED |

The three PGRST202 results mean the function is absent from the exposed
signature set or the supplied argument names do not match. No empty-body retry
or alternate argument guess was made.

## 4. PKG-02 Q1–Q7

Verbatim prescribed SQL and execution status for every group are recorded in
`evidence/G0_OUTPUT.md`.

- Operator name: NOT PRESENT
- Operator timestamps: NOT EXECUTED
- Confirmed target project reference: NOT PROVIDED
- Backup/PITR restore-point date: NOT PROVIDED
- Q1 output: NOT EXECUTED
- Q2 output: NOT EXECUTED
- Q3 output: NOT EXECUTED
- Q4 output: NOT EXECUTED
- Q5 output: NOT EXECUTED
- Q6 output: NOT EXECUTED
- Q7 output: NOT EXECUTED
- `evidence/G0_function_acl.csv`: NOT CREATED because no query output exists

No Supabase/PostgreSQL credential is present in the Engineer environment. The
order requires the Operator to execute the catalog `SELECT`s in an owner SQL
Editor session and forbids the Engineer from requesting a service-role key.
Substituting anonymous API inference for catalog output would violate the
measurement order.

## 5. Gate answers

| Question | Measured answer |
|---|---|
| Is the mail relay open? | UNRESOLVED — Q1 not executed |
| Is the inline `profiles.role` bridge live? | UNRESOLVED — Q2 not executed |
| Does `admin_audit_log` exist? | UNRESOLVED at catalog level; anonymous schema-cache probe returned ABSENT_TABLE |
| `profiles` rows with a manager label but no `user_roles` row? | UNRESOLVED — Q4 not executed |
| Number of VOLATILE SECURITY DEFINER functions with `anon_can_execute = true` | UNRESOLVED — Q1 not executed |

No D3 conclusion can be drawn without Q1. In particular, anonymous execution of
`mdz_enqueue_email`, `mdz_claim_email_outbox`, and all VOLATILE SECURITY
DEFINER functions remains unmeasured.

## 6. Prediction ledger

| Prediction | Status | Evidence |
|---|---|---|
| Apex commit equals accepted `main` tip | CONFIRMED | PKG-00 |
| Worker is `mawashidz-live` | CONFIRMED | PKG-00 |
| Original revised PKG-01 signature | CONFIRMED | PKG-01-R |
| All reachable-table anonymous row counts are zero | CONFIRMED | PKG-01-R |
| Six added immutable probe classifications | UNRESOLVED as predictions | No expected classifications were issued; three PGRST202 results are flagged |
| Planning figure: 41 anonymous-executable functions | UNRESOLVED | Real count requires Q1 |
| Q1 anonymous-executable set | UNRESOLVED | Q1 not executed |
| Q2 four booleans | UNRESOLVED | Q2 not executed |
| Q3 catalog objects and migration ledger | UNRESOLVED | Q3 not executed |
| Q5 exactly three policy helpers | UNRESOLVED | Q5 not executed |
| Q6 RLS enabled on every returned table | UNRESOLVED | Q6 not executed |
| Q7 rollback baselines | UNRESOLVED | Q7 not executed |

## 7. Decision

**D4 — abort.**

Trigger:

> Operator cannot run Q1 in this execution context.

The mandatory Operator/owner SQL Editor channel and backup/PITR confirmation
were not available. Q1 was therefore not run, Q2–Q7 were not attempted, and the
Phase 0 gate cannot select D1, D2, or D3 from measured catalog truth.

## 8. Delta

D2/D3 delta analysis is not applicable because neither decision was reached.
The execution delta is operational: PKG-01-R completed, but PKG-02 prerequisites
were not established. No remaining package is authorized.

## 9. Replanning answers

1. **Did measurement contradict the plan?** PKG-01-R did not contradict the
   original revised signature. Three new probes are legitimately unresolved.
   PKG-02 produced no measurements.
2. **Do remaining packages address the highest-severity risk?** UNRESOLVED.
   Anonymous state-changing function exposure must be measured by Q1 first.
3. **Did a package become unnecessary or a new one necessary?** No package
   conclusion is justified. An Operator-executed PKG-02 evidence pass remains
   necessary.
4. **Is the schedule still credible?** UNRESOLVED until the Operator confirms
   the target project and backup/PITR, then returns verbatim Q1–Q7 output.

## 10. Sign-off

- Engineer: Cursor Cloud Agent (GPT-5.6 Sol), 2026-07-28 UTC
- Operator: NOT PRESENT / NOT SIGNED
- Principal Engineer: pending review
- Production mutation performed: **NO**
- Authorization consumed: PKG-01-R complete; PKG-02 stopped at prerequisite
- Next action: **HARD STOP; no PKG-03 through PKG-31**
