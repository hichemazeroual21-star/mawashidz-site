# 08 — RED TEAM
## Project Omega | Phase 8

**Target:** WATHIQ (merged: Dossier + Signal + Recover)

---

## Attack Summary

| Vector | Attack | Severity |
|--------|--------|----------|
| **Economics** | 3,000 DZD/dossier × low frequency = lifestyle business not VC | HIGH |
| **Psychology** | Users blame Wathiq when visa rejected anyway (34%) | HIGH |
| **Law** | "Immigration advice" without license; Capago ToS on scraping | HIGH |
| **Technology** | GPT commoditizes checklist in 12 months | MEDIUM |
| **Competition** | Agencies give "free" dossier help; Facebook groups share templates | HIGH |
| **Timing** | Capago stabilizes; alert value decays | MEDIUM |
| **Politics** | France tightens visas — product seen as circumvention | MEDIUM |
| **Execution** | 2 founders cannot maintain rule updates per embassy | HIGH |
| **Distribution** | No trust in unknown app; cousin > algorithm | HIGH |
| **Culture** | Paying for "paperwork help" feels like weakness | MEDIUM |
| **Fraud** | Users upload fake docs; platform liability | MEDIUM |
| **AI** | Hallucinated rule = user deported/refused | CRITICAL |
| **Cyber** | Passport data breach ends company | CRITICAL |

---

## Kill Shots

1. **Causation:** Cannot prove dossier review reduces rejection (M010 flagged).
2. **WTP:** Black market pays for *slots*, not *checklists* (M005 #32).
3. **Frequency:** 1 visa / 1-2 years per user — CAC nightmare.
4. **OpenAI:** Free multimodal "check my visa dossier" in ChatGPT.
5. **Agency channel:** Agencies sabotage — you expose their errors.

---

## Red Team Verdict

**WATHIQ survives red team ONLY as:**
- Narrow SKU (France Schengen v1)
- **Never** approval probability
- **No** passport storage
- **Human-in-loop** on every paid review Month 1–12
- Recover module funds ops via success fees

**If human-in-loop cannot scale → company becomes content/media, not tech.**

See `17_RISK_REGISTER.md`.
