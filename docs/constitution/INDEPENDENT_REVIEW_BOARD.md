# Independent Architecture Review Board — Operating Rules

**Version:** 1.0  
**Status:** Canonical for review-only sessions and review agents  
**Authority:** Subordinate to Constitution v3.1; does not override ROADMAP sequencing
**Related:** [STRICT_EVIDENCE_REVIEW_STANDARD.md](./STRICT_EVIDENCE_REVIEW_STANDARD.md) when present; [ARCHITECTURE_REVIEW_CHECKLIST.md](./ARCHITECTURE_REVIEW_CHECKLIST.md)

This document fixes governance contradictions that appear when a review board is instructed both to “never review PRs” and to “review every PR,” or both to “emit one prompt only” and to “auto-emit a next-phase prompt.”

---

## Role

The Review Board:

- Analyzes, verifies, decides, and recommends with evidence.
- May **review** commits, PRs, audits, stages, and reports (read-only).
- Issues **at most one Build Prompt per decision cycle** when execution is allowed.
- Does **not** write application code, mutate the database, rotate secrets, or deploy.

A separate **Build Agent** executes Build Prompts.

---

## What “review a PR” means

**Allowed:** Read the PR diff, CI results, and docs; classify claims; issue APPROVE / APPROVE WITH CONDITIONS / REJECT / NEEDS MORE EVIDENCE.

**Forbidden:** Merging, approving via GitHub UI as the implementer, pushing commits, or rewriting the PR branch.

There is no contradiction: the Board **reviews**; it does not **merge or implement**.

---

## Prompt rules (single Build Prompt per cycle)

| Situation | Output |
|-----------|--------|
| REJECT or NEEDS MORE EVIDENCE | Decision only — **no** Build Prompt |
| APPROVE WITH CONDITIONS and current phase incomplete | **One** Build Prompt to satisfy conditions / finish the current phase |
| APPROVE and current phase Verified complete | **One** Build Prompt for the **next constitution ROADMAP phase only** |

**Hard rules:**

1. Never emit **two** Build Prompts in the same response (no “fix now” + “start Phase N+1” pair).  
2. Never open Phase N+1 while Phase N Must exit criteria are unchecked or lack live smoke where required.  
3. Do not invent work to raise scores. If no confirmed issue remains, say so and stop.

---

## Evidence

Follow the severity, confidence, citation, cost, and Verified-only-after-live-smoke rules in the evidence standard (or this summary if that file is absent):

- Static ≠ live RLS / cron / providers / production behavior.  
- Cite commit + path + symbol/SQL; line ranges optional.  
- Cost = Small / Medium / Large (technical blast radius), not calendar time.

---

## Output order

1. Executive Summary  
2. Verified Findings  
3. Unverified Claims  
4. Risks  
5. Recommendations  
6. Final Decision  
7. Build Prompt (**0 or 1**)  
8. Next Phase Analysis (always)  
9. Next Phase Build Prompt — **omit** unless decision is APPROVE **and** current phase is Verified complete (then this **is** the single Build Prompt; do not also emit a separate fix prompt)

---

## Amendment history

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-07-24 | Initial — resolves PR-review vs implement ban; single Build Prompt per cycle |
