# Phase 0 Evidence Report

Status: **D5 — BLOCKED / STAND BY**
UTC date: 2026-07-28

## 1. Execution log

| Package | Actor | System | Result |
|---|---|---|---|
| PKG-00 | Prior Cursor Cloud Engineer | Clean clone, CI, public production endpoints | ACCEPTED by Principal Engineer |
| PKG-01-R implementation | Cursor Cloud Agent (GPT-5.6 Sol) | Repository branch `cursor/pkg-01-r-prod-prober-9060` | Complete |
| PKG-01-R unit tests | Cursor Cloud Agent (GPT-5.6 Sol) | Cursor Cloud / Node 22 | Passed |
| PKG-01-R baseline | Cursor Cloud Agent (GPT-5.6 Sol) | Production anonymous PostgREST API | Passed; no visible rows |
| PKG-01-R comparison | Cursor Cloud Agent (GPT-5.6 Sol) | Production anonymous PostgREST API | Passed; baseline matched |
| PKG-02 prerequisite gate | Cursor Cloud Agent (GPT-5.6 Sol) | Supabase owner SQL Editor required | BLOCKED: Operator session not scheduled and backup/PITR not confirmed |
| PKG-02 Q1–Q7 | Operator NOT YET SCHEDULED | Production PostgreSQL catalog | NOT EXECUTED |

No production mutation, migration, deployment, provider change, dashboard
change, grant, audit remediation, or package update was performed.

Amendment 2 accepted PKG-01-R and reclassified the prerequisite state from D4
to D5. D4 was not established: the Operator has not refused or been found
unable to run Q1, and backup/PITR has not been confirmed impossible.

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
- Amendment 2 baseline correction: Principal-supplied read-only probe evidence
- Anonymous RLS-visible rows: zero on every reachable table
- `mdz_next_registration_id`: **NOT INVOKED BY ENGINEER; DENIED per Principal measurement; catalog row requires Q1**
- Confirmed anonymous-reachable floor: **8 functions**

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
| `mdz_role_prefix` | not predicted | REACHABLE | CONFIRMED; extends F2 |
| `normalize_algerian_phone` | not predicted | F5 SIGNATURE DIVERGENCE | CONFIRMED |
| `mdz_msg_registration_id` | not predicted | DENIED | MEASURED |
| `mdz_is_test_registration_email` | not predicted | REACHABLE | CONFIRMED; extends F2 |
| `mdz_registration_id_missing` | not predicted | REACHABLE with `p_id` | CORRECTED / CONFIRMED |
| `mdz_is_real_pending_registration` | not predicted | REACHABLE with `p_status,p_email` | CORRECTED / CONFIRMED |

The original PKG-01-R run correctly reported three PGRST202 responses without
guessing alternate arguments. Amendment 2 resolves two as errors in the issued
order: migration 014 declares `mdz_registration_id_missing(p_id text)` and
`mdz_is_real_pending_registration(p_status text, p_email text)`. The Principal's
corrected read-only probes returned HTTP 200 and `false` for both.

### Confirmed anonymous function floor

The measured floor is **8**, not the planning figure of 41:

1. `mdz_is_platform_admin`
2. `mdz_is_wilaya_manager`
3. `mdz_caller_wilaya`
4. `resolve_login_identifier`
5. `mdz_role_prefix`
6. `mdz_is_test_registration_email`
7. `mdz_registration_id_missing`
8. `mdz_is_real_pending_registration`

Four functions are confirmed denied:

1. `mdz_msg_registration_id`
2. `mdz_next_registration_id`
3. `allocate_member_id`
4. `review_registration_status`

This is a measured floor, not the true catalog count. Only PKG-02 Q1 can
enumerate all anonymous-executable functions and establish `prosecdef`.

### Finding F5 — production/repository signature divergence

Severity: **LOW security impact; HIGH recovery significance**.

The Principal's read-only probes returned PGRST202 for all six candidate
parameter names: `phone_input`, `phone`, `p_phone`, `phone_text`, `input`, and
`raw_phone`. `resolve_login_identifier` nevertheless returns HTTP 200 while
calling `normalize_algerian_phone` internally, proving the function exists.
Production therefore has no PostgREST-callable named parameter for this
function. Repository definitions in `supabase/setup.sql`,
`supabase/sql/phase0_core.sql`, and
`supabase/migrations/20260719000000_phase0_member_id_foundation.sql` all declare
`phone_input text`; no repository definition found produces the measured
production signature.

Phase 1 hazard: PostgreSQL `CREATE OR REPLACE FUNCTION` cannot rename an input
parameter and raises `cannot change name of input parameter`; replay may fail or
introduce an unintended overload. Before re-creating any production function,
diff its full `pg_proc` signature against repository source.

### Finding F2 extension and migration-grant inconsistency

`mdz_role_prefix` and `mdz_is_test_registration_email` returning HTTP 200 are
new confirmations of anonymous reachability and extend F2. Repository source
declares both IMMUTABLE but does not declare either SECURITY DEFINER; production
`prosecdef` remains a Q1 catalog measurement.

Migration 014 denies `mdz_msg_registration_id` in production while its sibling
predicates are anonymous-reachable. The source explicitly revokes
`mdz_msg_registration_id` from `anon, authenticated`, but for the siblings only
revokes `PUBLIC`, allowing pre-existing direct role grants to survive
`CREATE OR REPLACE FUNCTION`. Revoke coverage must be assessed per function,
not modeled as a per-migration property.

## 4. PKG-02 Q1–Q7

Verbatim prescribed SQL and execution status for every group are recorded in
`evidence/G0_OUTPUT.md`.

- Operator name: NOT YET SCHEDULED
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
| Confirmed anonymous-executable function floor | 8; true count requires Q1 |

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
| Six added immutable probe classifications | PARTIALLY CONFIRMED | Five classified: four REACHABLE, one DENIED; `normalize_algerian_phone` is F5 |
| Planning figure: 41 anonymous-executable functions | REFUTED as an evidence-backed count | Measured floor is 8; true count requires Q1 |
| Q1 anonymous-executable set | UNRESOLVED | Q1 not executed |
| Q2 four booleans | UNRESOLVED | Q2 not executed |
| Q3 catalog objects and migration ledger | UNRESOLVED | Q3 not executed |
| Q5 exactly three policy helpers | UNRESOLVED | Q5 not executed |
| Q6 RLS enabled on every returned table | UNRESOLVED | Q6 not executed |
| Q7 rollback baselines | UNRESOLVED | Q7 not executed |

## 7. Decision

**D5 — blocked; stand by.**

Trigger:

> Operator session not yet scheduled; backup/PITR not yet confirmed.

The mandatory Operator/owner SQL Editor session has not yet been scheduled and
backup/PITR has not yet been confirmed. Q1 was therefore not run, Q2–Q7 were
not attempted, and the Phase 0 gate cannot select D1, D2, or D3 from measured
catalog truth. This is not D4: impossibility, refusal, inability, and wrong
project have not been established.

## 8. Delta

D2/D3 delta analysis is not applicable because neither decision was reached.
The execution delta is operational: PKG-01-R completed, but PKG-02 prerequisites
are pending scheduling/confirmation. No remaining package is authorized.

## 9. Replanning answers

1. **Did measurement contradict the plan?** Yes. Two issued parameter names
   were wrong, the planning figure of 41 is not measured truth, and F5 proves a
   production function signature that repository source cannot generate.
   PKG-02 produced no catalog measurements.
2. **Do remaining packages address the highest-severity risk?** UNRESOLVED.
   Anonymous state-changing function exposure must be measured by Q1 first.
3. **Did a package become unnecessary or a new one necessary?** No package
   conclusion is justified. An Operator-executed PKG-02 evidence pass remains
   necessary.
4. **Is the schedule still credible?** BLOCKED until the Owner schedules the
   Operator session and confirms backup/PITR, then the Operator returns verbatim
   Q1–Q7 output.

## 10. Sign-off

- Engineer: Cursor Cloud Agent (GPT-5.6 Sol), 2026-07-28 UTC
- Operator: NOT YET SCHEDULED / NOT SIGNED
- Principal Engineer: pending review
- Production mutation performed: **NO**
- Authorization consumed: PKG-01-R accepted; evidence amended; PKG-02 blocked
- Next action: **STAND BY for Owner confirmation; no PKG-03 through PKG-31**
