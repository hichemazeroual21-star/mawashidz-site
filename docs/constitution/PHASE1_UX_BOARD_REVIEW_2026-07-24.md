# Phase 1 UX Board Review — 2026-07-24

**Decision:** APPROVED WITH CONDITIONS  
**Estimated UX score:** **6.1 / 10**  
**Authority:** Independent review (UI/ops trust). Subordinate to Constitution v3.0 / ROADMAP.  
**Related code gate:** `94fc6ff` on `cursor/phase1-p0-gate-fixes-4b6e` (P0/P1 email + notif deep-link + prompt removal + constitution leftovers)

---

## Verdict

Phase 1 ops UI is above a raw prototype, below world-class SaaS ops (Stripe/Linear-class). Trust is still limited by **modal-as-app**, **error≡empty** on support surfaces, **raw status/priority enums** in operator/review rows, **dual visual systems**, and incomplete **a11y**.

**No Build Prompt in this cycle.** Future Improvements below are **not** current Issues and must not be started now. Remaining Phase 1 UX conditions wait for a **single** subsequent Build Prompt from the Board.

**Phase 2 remains blocked** until Phase 1 Must + live smoke + UX conditions the Board chooses to gate.

---

## Reconciliation with `94fc6ff` (stale vs current)

| Claim in weakness list | Status after P0 gate | Evidence |
|------------------------|----------------------|----------|
| `window.prompt` reject fallback | **Closed in code** (`94fc6ff` + UI remediation) | `js/mdz-dashboards.mjs` |
| `#admin-dash` Open broken | **Closed in code** | `resolveNotificationDeepLink` → admin |
| Support fetch error≡empty | **Closed in code** (MDZ-UI-001) | error + retry panels |
| Raw registration status / priority enums | **Closed in code** (MDZ-UI-004/005) | i18n chips |
| Bell EN aria / dialog focus | **Closed in code** (MDZ-UI-006/007) | i18n aria + Tab trap |
| Ops density / support skeleton / auth chrome DS / demo chip / tab comment | **Closed in code** (MDZ-UI-008–012) | shell densify within modals |
| Modal-as-app full workspace replacement | **Still deferred** (Future / PI-008) | Not this cycle |

Do **not** re-open EMAIL/NOTIF/prompt Issues as Open without new evidence against `94fc6ff`+.

---

## Remaining Phase 1 UX conditions (backlog only — not this cycle)

These are the **conditions** implied by the board’s Current Weaknesses that are still true in the tree and are **not** listed under Future Improvements as post-phase opportunities. They are candidates for the **next** Build Prompt; Owner=Developer when issued.

| ID (proposed) | Severity | Problem | Cost |
|---------------|----------|---------|------|
| MDZ-P1-UX-002 | High | Support member + operator: fetch failure rendered as empty list | Medium |
| MDZ-P1-UX-003 | Medium | Review queue / ops priority show raw enums (`pending`, `normal`) to humans | Small–Medium |
| MDZ-P1-UX-004 | Medium | Notif bell `aria-label` stuck English; reason dialog lacks proven focus trap | Small–Medium |
| MDZ-P1-UX-005 | Medium | Support list lacks skeleton while notifications have one | Small |
| MDZ-P1-UX-006 | Medium | Dual chrome: marketing `.btn`/`system-ui` vs product `.mdz-btn`/IBM Plex on account/ops | Medium |
| TD-021 | Medium–High | Modal-hosted shell (account + dash) — full workspace replacement is **Future #1** after Animals→Marketplace→Hub gate; light shell may be Board-scoped later | Large |

**Out of scope for any Phase 1 UX prompt unless Board explicitly includes:** Hub cards, animals UI, marketplace, command palette, SLA/assignment, HTML email, notification preferences, emoji dock replacement, visual CI.

---

## Competitive gap (pattern benchmark)

| Criterion | World-class | MawashiDZ now | Gap |
|-----------|-------------|----------------|-----|
| Container | Stable workspace page | Modal overlay | Large |
| Ops queue | Persistent master/detail | Table bolted under review stats | Large |
| Status language | Unified human labels | Partial raw enums | Medium–Large |
| Failure UX | Retryable error | Collapsed into empty | Large |
| A11y basics | Focus trap + localized labels | Partial | Medium |
| Visual system | One source | Brochure + admin coexist | Medium |

Local Algerian competitor measurement: **Needs Field Research** — not claimed Verified.

---

## Score justification (6.1)

**Plus:** Design tokens exist; account tabs clearer; reason dialog; skeletons/empty on some surfaces; ticket status i18n helpers.

**Minus:** Modal-as-app; error≡empty; raw enums; dual visual identity; a11y incomplete; operator queue not a first-class command surface. (Prompt + `#admin-dash` no longer counted as open code defects.)

Inflating to ≈8+ without fixing remaining conditions and live QA would be dishonest.

---

## Future Improvements (explicitly deferred — Not current Issues)

1. Replace modal shell with Smart Workspace after constitutional gate (Animals → Marketplace → Hub).  
2. Operator command palette / shortcuts.  
3. SLA timers, assignment UI, full ops priority sorting.  
4. Multilingual HTML email templates.  
5. Member notification preferences / later channels (no WhatsApp/SMS Years 1–2 unless Constitution amended).  
6. Broader motion after IA stabilizes.  
7. Automated design QA (contrast, RTL, 320px) in visual CI.  
8. Disciplined icon system; replace emoji dock.  
9. Real member/animal interactive card after Phase 2 — do not expand current demo passport.

---

## Next Phase Analysis

Phase 1 is **not** Verified complete: live smoke still required; remaining UX conditions above still open; FD-01/02 still Proposed. **No Phase 2 Build Prompt.**

## Next Phase Build Prompt

Omitted — decision is APPROVE WITH CONDITIONS without a new execution prompt in this message; Future list must not be treated as a Build Prompt.
