# Incident / Gate Evidence — Email RPC EXECUTE ACL (2026-07-29)

**Date (UTC):** 2026-07-29
**Incident:** `anon` and `authenticated` held `EXECUTE` on the four email RPC functions — an open
mail-relay ACL surface (`public.mdz_enqueue_email` callable by unauthenticated clients).
**Severity:** **SEV1 / Critical** — privilege leak on the notification/email delivery path
(`docs/runbooks/incident-response.md` severity table; `docs/constitution/STRICT_EVIDENCE_REVIEW_STANDARD.md` §4).
**Containment change:** migration `016_revoke_email_function_execute.sql`
**Branch / PR:** `cursor/migration-016-revoke-email-execute-9060` — PR **#23** (OPEN, **DRAFT**, unmerged)
**Containment commit:** `f114c72af3963f01f48b9d4142a5d59ff2a19047`
**Agent environment for this record:** Cloud Agent with **no** `SUPABASE_*` / `EMAIL_OUTBOX_SECRET` /
`RESEND_API_KEY` / Wrangler credentials. **No SQL was executed and no privilege was changed while
producing this document.** The only production contact was the repository's own anon-probe gates that
run inside `npm run test:ci` (`tests/security-allocate-member-id.test.mjs`,
`tests/security-review-registration.test.mjs`) — they target other functions, expect denial, and
mutate nothing; their results are logged in §7. All production values in §3 and §4 are
**Owner-attested**.

---

## 1. Status

| Track | Status |
|-------|--------|
| Containment — the four email RPCs | **COMPLETE** — migration `016` applied manually in production on 2026-07-29 |
| Containment — root cause (`ALTER DEFAULT PRIVILEGES` in schema `public`) | **NOT STARTED** |
| Incident investigation | **OPEN** |
| Root-cause remediation | **NOT STARTED** |
| Next package | **PKG-02**, followed immediately by the root privilege package |
| PR #23 | **OPEN / DRAFT — unmerged** (migration already applied by hand; the file is not yet on `main`) |

`COMPLETE` here is scoped **exactly** to the four functions listed in §2. It is **not** a statement
about any other function in schema `public`, and it is **not** durable until the root package lands
— see §6.

---

## 2. Change applied

Migration `016` contains exactly four executable statements, all of the form
`revoke execute on function … from anon, authenticated, public;`, on these catalog-verified live
signatures:

| # | Function |
|---|----------|
| 1 | `public.mdz_claim_email_outbox(integer,text)` |
| 2 | `public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)` |
| 3 | `public.mdz_mark_email_outbox(bigint,text,text,text)` |
| 4 | `public.mdz_notify_user(uuid,text,text,text,jsonb,text)` |

`service_role` is **intentionally not revoked** — it is the required runtime caller for the
email-outbox drain. No `GRANT`, DDL, table, RLS or `ALTER DEFAULT PRIVILEGES` statement is part of
this migration, and the revoke is idempotent (revoking an unheld privilege is a no-op).

> Evidence — commit `f114c72`, path `supabase/migrations/016_revoke_email_function_execute.sql`,
> symbols `mdz_claim_email_outbox`, `mdz_enqueue_email`, `mdz_mark_email_outbox`, `mdz_notify_user`.
> Confidence: **Static** (repository text).

---

## 3. Post-change privilege verification (production, Owner-attested)

Measured by the Owner in production after applying `016`:

| Function | `anon_execute` | `authenticated_execute` | `service_role_execute` |
|----------|----------------|-------------------------|------------------------|
| `public.mdz_claim_email_outbox(integer,text)` | **false** | **false** | **true** |
| `public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)` | **false** | **false** | **true** |
| `public.mdz_mark_email_outbox(bigint,text,text,text)` | **false** | **false** | **true** |
| `public.mdz_notify_user(uuid,text,text,text,jsonb,text)` | **false** | **false** | **true** |

- Confidence class: **Live smoke (production) — Owner-attested**. The agent did not measure these
  values and holds no production credentials.
- Not part of the returned set, therefore still unrecorded: the `PUBLIC` grantee result (the migration
  also revokes from `public`) and confirmation that `postgres` retains `EXECUTE`. See §6.
- Re-verification queries are archived, **unexecuted**, in
  `artifacts/security/2026-07-29-email-rpc-execute-verification.sql.txt`.

---

## 4. Live approval-path smoke (production, Owner-attested)

A **real** membership registration approval was executed in production after containment:

| Field | Value |
|-------|-------|
| `registration_id` | `MDZ-REG-2026-961120` |
| `reviewed_at` | `2026-07-29 07:50:43.269166+00` |
| `email_outbox.id` | `6` (row created at the same timestamp) |
| `recipient_email` | `ain***@gmail.com` — **redacted**; this repository is public. The full address exists only in the `email_outbox` row and the recipient's mailbox |
| `template_key` | `registration_approved` |
| `status` | `sent` |
| `last_error` | `NULL` |
| Delivery | Approval email **received successfully** from `noreply@mawashidz.com` |
| Delivery timestamp | Mail header `2026-07-29 09:52` local (UTC+2) = **07:52 UTC**, ≈ 69 s after `reviewed_at` — consistent with the `*/2 * * * *` Worker cron drain (`wrangler.jsonc` triggers) |

**Conclusion: containment succeeded and no regression was observed in the tested approval-email
path.** Enqueue → drain → provider delivery all completed after the four revokes were in force.

---

## 5. Why no regression occurred (mechanism — Static, agent-verified)

The revokes cannot break the approval path because no `anon`/`authenticated` client ever calls the
four functions directly:

- `public.review_registration_status(...)` is declared **`SECURITY DEFINER`**
  (commit `f114c72`, `supabase/migrations/012_phase1_quality_elevation.sql`, symbol
  `review_registration_status`, ~L247 definition / ~L254 `security definer`) and invokes
  `perform public.mdz_notify_user(...)` and `perform public.mdz_enqueue_email(...)` **inside** the
  definer context (~L388 / ~L398; the same pattern exists in
  `supabase/migrations/011_review_notify_email_hooks.sql`, ~L181 / ~L199). The reviewing
  administrator therefore needs `EXECUTE` on `review_registration_status` only — never on the
  revoked functions.
- The drain runs as `service_role`, which retains `EXECUTE`:
  `netlify/functions/email-outbox.mjs` calls `mdz_claim_email_outbox` and `mdz_mark_email_outbox`
  with `SUPABASE_SERVICE_ROLE_KEY` (~L120, ~L139+), reached from `worker.mjs` `scheduled()`.
- A repository sweep of `js/`, `index.html` and `public/` finds **no** browser-side caller of any of
  the four functions.

Confidence class: **Static** (repository text at commit `f114c72`). This mechanism explains the
production result in §4; it does not replace it.

---

## 6. What this evidence does NOT prove — open gaps

Per `docs/constitution/STRICT_EVIDENCE_REVIEW_STANDARD.md` §5 and §7:

1. **No behavioural negative probe for the four functions yet.** §3 is catalog/ACL evidence. There is
   still no recorded production observation of an `anon` or `authenticated` REST/RPC call to
   `mdz_enqueue_email` being rejected (expected `42501 insufficient_privilege`, surfaced as HTTP
   401/403/404 by PostgREST). Containment is inferred from privilege state plus the unchanged happy
   path, not from a denied call.
   The repository already ships this probe pattern for other functions —
   `tests/security-review-registration.test.mjs` and `tests/security-allocate-member-id.test.mjs`
   perform live anon RPC probes against the production project inside `npm run test:ci`, and both
   passed post-containment on this documentation commit (`review_registration_status` → **HTTP
   401**, see §7). Extending the same pattern to the four email RPCs is the
   → **first item of PKG-02.**
2. **`PUBLIC` and `postgres` grantees unrecorded** for the four functions (see §3).
3. **Root cause untouched, so containment is fragile.** Supabase ships
   `alter default privileges in schema public grant all on functions to anon, authenticated`.
   Because that default is unchanged: (a) other functions in schema `public` may still hold
   `anon`/`authenticated` `EXECUTE`; and (b) any newly created function — or a `drop` + `create` of
   one of these four — silently re-inherits the grant and re-opens the surface. A plain
   `create or replace` preserves the current ACL, but a recreate does not.
4. **Migration-ledger gap.** `015_cut_manager_profiles_role_bridge.sql` inserts a row into
   `public.mdz_schema_migrations`; `016` does **not**. After the manual apply, the ledger therefore
   contains no `016` row, so the database carries no self-evidence that containment was applied.
   Fixing this would require changing executable SQL or running SQL, both out of scope for this
   documentation package → handed to the next package.
5. **Repository ↔ production drift is live.** Production has `016` applied while `main` does not yet
   contain the file (PR #23 is an unmerged draft). Intended resolution: merge PR #23 after review,
   which is a no-op against the database because the revoke is idempotent. Until then this drift
   belongs in `docs/PRODUCTION_DRIFT_REPORT.md` at its next refresh.
6. **Single-path smoke.** Only the `registration_approved` template was exercised. Reject/suspend
   notifications, ticket-reply mail and the `mdz_notify_user` in-app path were not re-tested after
   containment.
7. **All production values in §3–§4 are Owner-attested**; the agent measured nothing and executed
   no SQL.

---

## 7. Test evidence log

| Field | Value |
|-------|-------|
| Command (Owner, production) | Manual apply of `016` in the Supabase SQL editor, then privilege verification and one real registration approval |
| Scenario | Revoke `EXECUTE` from `anon`/`authenticated`/`public` on four email RPCs → verify privileges → approve `MDZ-REG-2026-961120` → observe `email_outbox` row `6` and inbox delivery |
| Result | **PASS** — privileges as in §3; outbox row `status = sent`, `last_error = NULL`; email received from `noreply@mawashidz.com` |
| Does not prove | Items 1–6 of §6 (no denied-call probe, `PUBLIC`/`postgres` grantees, root default privileges, ledger row, drift closure, other templates) |
| Command (agent, repository) | `npm run test:ci` |
| Scenario | Full static/unit gate set on this documentation commit, including the two live anon RPC probes shipped in the repository (`tests/security-allocate-member-id.test.mjs`, `tests/security-review-registration.test.mjs`) |
| Result | **PASS** (exit 0) — `✓ allocate_member_id blocked for anon (Phase 0 security posture)`; `✓ review_registration_status blocked for anon/unprivileged (HTTP 401)` |
| Does not prove | Containment of the four email RPCs — neither probe targets them (§6.1). Confirms only that this documentation package changed no product/SQL behaviour and that two unrelated anon paths remain denied |
| Command (agent, repository) | `npm run verify:public` |
| Scenario | `index.html` ↔ `public/index.html` sync, cache-bust and asset checksums |
| Result | **PASS** (exit 0) — `verify-public-sync: OK — index aligned, cache-bust v=1.10.0, js/assets checksums match` |
| Does not prove | Anything about production database privileges or mail delivery |

---

## 8. Next actions

1. **PKG-02** — full evidence pass. Start with the negative probe from §6.1 — modelled on the
   existing `tests/security-review-registration.test.mjs` anon-probe gate — and record the
   **verbatim** `has_function_privilege` / `aclexplode` output for all four functions across
   `anon`, `authenticated`, `service_role`, `postgres` and `PUBLIC`
   (queries A and B in `artifacts/security/2026-07-29-email-rpc-execute-verification.sql.txt`).
2. **Root privilege package** — correct
   `alter default privileges in schema public … to anon, authenticated` behind a reviewed allowlist,
   and sweep every existing function in `public` for inherited `EXECUTE`.
   *Reviewer note:* because of §6.3, this package is what makes containment durable; today's state
   holds only as long as no function in `public` is created or recreated.
3. **Migration ledger** — give `016` a ledger row (new migration or an operator-run insert recorded
   as ops evidence), so the database itself proves containment was applied (§6.4).
4. **PR #23** — keep **unmerged** until review approves; merging is the drift closure in §6.5 and is
   a database no-op.

---

## 9. Sign-off

| Role | Status |
|------|--------|
| Owner / Operator | Applied `016` in production 2026-07-29; attested privilege results, approval, outbox row and inbox delivery |
| Documentation agent (this record) | Documentation only — no SQL edited, no SQL executed, PR #23 not merged; verified the no-regression mechanism statically (§5) |
| Review Board | Pending — PR #23 review, then PKG-02 |
