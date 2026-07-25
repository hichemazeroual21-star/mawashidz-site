# Strict Evidence-Based Review Standard

**Version:** 1.0  
**Status:** Canonical for independent architecture / product / security audits  
**Commit at adoption:** use the audited branch tip (example: `0107e62`)  
**Authority:** Subordinate to Constitution v3.0; used by review agents and humans  

This document is the **strict review prompt** plus **mandatory evidence rules**.  
External references are unnecessary to judge this prompt; the text itself is the direct evidence.

---

## 0. Deep Analysis protocol (mandatory)

1. Do **not** stop at the first analysis.
2. Use **multi-phase** Deep Analysis; challenge your own conclusions before the final answer.
3. If confidence is **below 95%**, keep searching the repository until the claim is evidence-backed — or downgrade the claim.
4. No assumptions presented as facts.
5. Cite evidence using the citation format in §3 (not line numbers alone).
6. Before any recommendation, answer:
   - Does this preserve what was already built?
   - What could it break?
   - What independent alternatives exist?
   - Why is this better than those alternatives?
7. Search for alternatives independently and evaluate them.

---

## 1. Scope boundary (already part of the strong prompt — do not “reinvent”)

- Review **confirmed** weaknesses only.
- **Do not create work merely to raise a score.**
- Prefer preserving working architecture when a change is cosmetic.
- Phase gates and Constitution NON-GOALS still bind.

---

## 2. Stop condition (already part of the strong prompt — do not “reinvent”)

If no **confirmed** issue remains within scope:

> State that clearly and **stop**.

Do not invent findings, polish theater, or score-chasing refactors.

---

## 3. Citation format (stable evidence, not brittle line-only)

`exact file/path/line` alone is fragile (lines drift). Prefer:

| Field | Required | Example |
|-------|----------|---------|
| **commit** | Yes | `0107e62d949e11917dbd242da56d7a1f9d2a4761` |
| **path** | Yes | `supabase/migrations/012_phase1_quality_elevation.sql` |
| **symbol / SQL / export** | Yes when applicable | `mdz_claim_email_outbox`, `openReasonDialog`, `CREATE POLICY "support_tickets: member read own"` |
| **line range** | Optional if still stable | approx. L174–L209 |

**Example citation**

> Email lease claim sets `status = 'processing'` — commit `0107e62`, `supabase/migrations/012_phase1_quality_elevation.sql`, symbol `mdz_claim_email_outbox`, ~L203.

---

## 4. Severity model (mandatory)

Every finding must declare **severity**. Definitions are technical, not rhetorical.

| Severity | Meaning (any one is enough) |
|----------|-----------------------------|
| **Critical** | Privilege leak / escalation; data loss or silent duplication; or breakage of a core production path (auth, membership review, notification/email delivery, support ticket path) |
| **High** | Likely user-trust or security defect under normal ops; incomplete audit of privileged mutations; unsafe defaults that become Critical when secrets/misconfig appear |
| **Medium** | Real defect or debt with bounded blast radius; UX that blocks operator completeness; doc/claim mismatch |
| **Low** | Polish, naming, non-blocking DX, non-user-facing inconsistency |

If severity is unclear, gather more evidence — do not default to Critical.

---

## 5. Confidence model (mandatory)

Every claim must declare **confidence** and **evidence class**:

| Confidence / class | What it means | What it does **not** prove |
|--------------------|---------------|----------------------------|
| **Static** | Source/SQL/config exists in the repo at a cited commit | Live RLS enforcement, provider sends, cron firing, secret presence |
| **Local test** | `npm`/unit/static tests passed with recorded command | Production behavior; DB policies against a real project |
| **Integration** | Tested against a real local/staging DB or Worker harness | Production identity, DNS, provider quotas, Cloudflare cron schedule |
| **Live smoke** | Documented exercise on **production** or **equivalent staging** | Future regressions after later deploys |

### Hard rule — Verified

A claim may be labeled **Verified** only after **documented live smoke** on production or equivalent staging.

Until then, use:

- **Implemented (static)**  
- **Tested (local)**  
- **Integration-tested**  
- **Requires live smoke**  

**Explicit limit:** Static code evidence does **not** prove:

- RLS behavior against a live Supabase project  
- Email provider delivery (e.g. Resend)  
- Cloudflare cron execution in the deployed Worker  
- Secret configuration correctness  

---

## 6. Cost model — Small / Medium / Large (not calendar time)

| Size | Technical definition |
|------|----------------------|
| **Small** | Localized change: ≤ ~2 files or one focused SQL function/policy; no schema contract break; low blast radius |
| **Medium** | Cross-cutting but contained: several modules + migration or UI surface; needs targeted tests; rollback path clear |
| **Large** | Architectural or multi-subsystem change: new product shell, schema redesign, auth model change, or anything that risks Phase exit criteria |

Do **not** estimate days/weeks. Size is about invasiveness and risk surface.

---

## 7. Test evidence log (mandatory when tests are cited)

For every test-backed claim, record:

1. **Command** (exact)  
2. **Scenario** (what path was exercised)  
3. **Result** (pass/fail + relevant assertion)  
4. **What it does not prove**

### Example (Phase 1 elevation — local only)

| Field | Value |
|-------|-------|
| Command | `npm run test:ci` / `npm run test:migration-review` |
| Scenario | Static SQL shape for lease + policy-before-drop; email requeue mock without Resend |
| Result | Pass at commit `0107e62` |
| Does not prove | Live RLS, live cron, Resend delivery, migrations applied on Supabase |

---

## 8. Finding template

```text
### [SEVERITY] Title
- Confidence: Static | Local test | Integration | Live smoke
- Verified?: No — Requires live smoke  (or Yes — with smoke log link)
- Evidence:
  - commit:
  - path:
  - symbol/SQL:
  - line range (optional):
- Impact: user / security / ops / data
- Preserve check: what stays intact if we fix / if we don't
- Break risk: what could regress
- Alternatives considered:
  - A) …
  - B) …
  - Why chosen is better:
- Cost: Small | Medium | Large
- Recommendation: fix now / defer with TD-ID / no action (stop)
```

---

## 9. Review output contract

1. Verdict first (GO / STOP / STOP-with-conditions).  
2. Confirmed findings only (with §8 template).  
3. Explicit **non-findings** / stop statement if empty.  
4. Scores only with justification tied to evidence class — never inflate.  
5. Phase gates: do not unlock a later phase on Static/Local evidence alone when the Constitution requires production ops.

---

## 10. Prompt score (meta)

Independent evaluation of this standard’s precursor text:

| Score | Note |
|-------|------|
| **9.1 / 10** | Strong, usable as strict review |
| Not 9.8 | Missing severity/confidence/cost precision and stable citations before this v1.0 |

Evaluation error to avoid: claiming “missing scope/stop” when those rules already exist (§1–§2).

---

## 11. Application note — Phase 1 elevation (illustrative)

At commit `0107e62` on `cursor/phase1-member-ops-foundation-4b6e`:

| Claim | Evidence class | Verified? |
|-------|----------------|-----------|
| Email claim uses `processing` lease | Static (+ local string/mock tests) | **No** — requires live smoke after migration 012 + Worker deploy |
| Cron `*/2 * * * *` configured | Static (`wrangler.jsonc` triggers) | **No** — requires live Worker schedule observation |
| Probeable uuid helpers removed | Static (012 drop after policy rewrite) | **No** for live DB until migration applied |
| `openReasonDialog` preferred over `prompt` | Static + local module presence | **No** for operator UX until staging smoke |
| Overall “production-ready 9.7” | — | **Forbidden** until live smoke log exists |

If no further **confirmed Critical/High** issues are found beyond “requires live smoke,” say so and **stop** inventing work.
