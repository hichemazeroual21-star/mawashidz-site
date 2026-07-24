# MawashiDZ Constitution Gap Analysis

**Version:** 1.0  
**Date:** 2026-07-24  
**Purpose:** Challenge the Constitution before expensive mistakes.  
**Companion:** [MASTER_CONSTITUTION.md](./MASTER_CONSTITUTION.md), [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md)

Every conclusion is tagged: **Verified Fact** · **Assumption** · **Recommendation** · **Long-Term Idea**

---

# SECTION 1 — What is missing from the Constitution?

| Missing area | Why it matters | Priority | Tag |
|--------------|----------------|----------|-----|
| Founder-ratified mission / 5-year success metrics | Without this, roadmap debates never resolve | Critical | Recommendation |
| Business model decisions | Affects schema (subscriptions), UX, trust | Critical | Recommendation |
| Legal pack (ToS, Privacy, liability, veterinary disclaimer) | Commerce + health claims create legal exposure | Critical | Recommendation |
| Livestock lifecycle workflows (birth, sale, death, transfer) | Core domain for “ecosystem” claim | High | Recommendation |
| Ownership transfer protocol | Fraud and disputes center here | High | Recommendation |
| Marketplace moderation + dispute + appeals | Trust collapses without process | High | Recommendation |
| User reporting / abuse pipeline | Required before member-to-member messaging | High | Recommendation |
| Notification lifecycle + retention | Storage + privacy + spam control | High | Recommendation |
| Media retention / watermark / moderation | Upload abuse and storage cost | High | Recommendation |
| Password / session policy specifics | Security operations need numbers | High | Recommendation |
| Backup / DR / incident response | National ambition requires continuity | High | Recommendation |
| Data retention schedule | Legal + storage + audit | High | Recommendation |
| API versioning policy | Mobile/partners later need stability | Medium | Recommendation |
| Accessibility standard (WCAG target) | Inclusion + quality | Medium | Recommendation |
| Analytics ethics / event taxonomy | Prevent vanity metrics | Medium | Recommendation |
| Employee onboarding / permission grant runbook | Wilaya manager scale (58) | Medium | Recommendation |
| Developer onboarding + migration canon | Current dual paths confuse | Critical | Verified Fact + Recommendation |
| Release / monitoring strategy | Deploy already multi-target (CF/Netlify) | High | Recommendation |
| Offline conflict resolution rules | Integrity risk | Medium | Recommendation |
| AI governance detail | Draft mentions AI; needs red lines | Medium | Recommendation |
| Payment / escrow policy | Draft implies commerce; payments undefined | High | Recommendation |
| Relationship to state platforms (e.g. Adhahi.dz) | Avoid legal/brand collision | High | Recommendation |
| Broker role final decision | Draft ambiguous; markets use intermediaries | High | Recommendation |
| Ambassador/Partner role definitions | Present in code prefixes; unclear product | Medium | Verified Fact + Recommendation |
| Seasonal (Aid) product mode | Dominant Algerian demand spike | High | Verified Fact (market seasonality) + Recommendation |
| Honest data labeling policy | Synthetic prices currently risk trust | Critical | Verified Fact + Recommendation |

---

# SECTION 2 — What requires field research?

See full agenda: [FIELD_RESEARCH_AGENDA.md](./FIELD_RESEARCH_AGENDA.md).

**Recommendation:** Do not implement full herd ERP, broker CRM, commission tracking, or payments before completing Critical research topics.

Topics that **must not** be decided from ChatGPT assumptions alone:

- How breeders actually identify animals today  
- Whether listings-first or animals-first matches mental models  
- Trust signals buyers need before travel/purchase  
- Whether brokers will use a platform or bypass it  
- Vet certificate formats and legal expectations  
- Connectivity reality by wilaya / rural zone  
- Cash vs electronic payment willingness  

---

# SECTION 3 — What requires Founder decisions?

See table: [FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md).

**Recommendation:** Pause implementation of marketplace MVP, monetization UI, AI decision aids, and national advertising until Critical Founder decisions are written under `/docs/constitution/` or PDRs.

---

# SECTION 4 — What should not be implemented?

See: [FEATURE_DISCIPLINE.md](./FEATURE_DISCIPLINE.md).

### Headline rejections (Recommendation)

| Feature | Verdict | Why |
|---------|---------|-----|
| Social chat / voice/video messaging Year 1 | **Do not implement** | Conflicts with Support & Messages PRD; huge moderation cost |
| Dedicated Broker role Year 1 | **Postpone** | Extend breeder first; research intermediaries |
| Blockchain / crypto livestock registry | **Do not implement** | No verified necessity; complexity theater |
| Microservices now | **Do not implement** | Premature; SPA + Supabase not at that scale problem |
| AI medical diagnosis | **Do not implement** | Liability + trust destruction |
| Five marketplaces in parallel | **Do not implement** | Focus livestock listings MVP |
| Decorative CEO financial dashboards before revenue | **Postpone** | No revenue model ratified |
| E2EE messaging as default | **Postpone / likely reject for ops channels** | Breaks audit/moderation |
| Replacing “ticket” model with WhatsApp-style UX | **Do not implement** | Explicit PRD non-goal |

### Contradictions inside the draft Constitution

| Conflict | Resolution (Recommendation) |
|----------|-----------------------------|
| Rich chat feature list vs Support & Messages “never Chat” | **Tickets win** |
| “Dashboard” language vs PRODUCT_CONSTITUTION Smart Workspace | **Smart Workspace wins** |
| Broker as full role vs “evaluate if needed” | **Evaluate via research; default no new role** |
| National ecosystem vision vs current schema reality | **Vision OK; shipping claims must match code** |
| CEO multi-email identity vs simple auth | **Long-Term Idea**; not Year 1 |
| Feed/equipment/transport/insurance all listed as peer goals | **Sequence**; livestock commerce first |

---

# SECTION 5 — Risk analysis (summary)

Full register: [RISK_REGISTER.md](./RISK_REGISTER.md).

### Critical risks (Year 1)

| Risk | Type | Tag |
|------|------|-----|
| Privilege self-grant via signup metadata | Security | Verified Fact |
| Trust damage from “live” synthetic prices | Business / Reputation | Verified Fact |
| Over-promising livestock passport features not built | Business | Verified Fact |
| Marketplace cold start (no listings/liquidity) | Business | Assumption |
| Missing audit log while claiming admin maturity | Security / Ops | Verified Fact |
| Wilaya manager program without training/runbooks | Operational | Assumption |
| Scope creep into Hub/AI before Member Ops done | Technical / Product | Verified Fact (ROADMAP gates exist — enforce them) |

---

# FINAL OUTPUT — Actionable report

## Features that should NOT be implemented

Social chat stack · Blockchain · Crypto · Microservices split · AI diagnosis · Parallel multi-vertical marketplaces · Unlinked DMs · Hard-delete of tickets/messages · Client-side privilege grants disguised as UX.

**Tag:** Recommendation (based on Verified Fact of current stage + PRD non-goals)

## Features that should be postponed

Broker CRM · Commission tracking · Voice/video messages · Group chat · WhatsApp as primary store · Offline write sync · Government integrations · International expansion · Premium analytics · Membership card printing · Full herd ERP · Transport/insurance marketplaces.

**Tag:** Recommendation / Long-Term Idea

## Features requiring research

Animal identification practices · Listing vs animal-first model · Broker digitization willingness · Buyer trust checklist · Vet documentation norms · Connectivity · Payment norms · Aid seasonal UX.

**Tag:** Recommendation

## Features requiring Founder approval

Mission · Monetization · Brand · Legal · Marketplace policy · Verification strictness · AI in decisions · Advertising · Algeria-only vs expand · Relationship to state digital livestock initiatives.

**Tag:** Recommendation

## Critical technical risks

Signup privilege path · Dual role authority · Missing audit migration · Schema path drift · Monolith maintainability · Storage growth when media arrives.

## Critical business risks

Cold start · Trust mismatch · Seasonal dependency · Competition from informal WhatsApp networks · Confusion with state platforms.

## Critical security risks

Privilege escalation · Fake vets/listings (future) · Spam registrations · Account takeover · QR forgery (future) · Enumeration via login RPC.

## Critical operational risks

58 wilaya managers without playbooks · Support overload · Deploy config drift (already historically painful per recovery docs) · Backup/DR undefined in constitution.

## Recommended next actions (priority order)

1. **Founder ratifies** Master Constitution v2.0 + Critical decisions table.  
2. **Security hotfix plan** for signup role/status + manager fallback (engineering).  
3. **Ship audit logging** (missing 008 or equivalent).  
4. **Complete Member Ops** acceptance criteria before Hub P0.  
5. **Relabel price board** as reference index.  
6. **Commission field research** (breeders/buyers/vets/markets).  
7. **Design livestock listing MVP** only after marketplace policy decisions.  
8. **Review Constitution** before each major release.

## Confidence

| Cluster | Confidence |
|---------|------------|
| Repo gaps | High |
| Security privilege issues | High |
| Market academic patterns | Medium-High |
| Exact user adoption behavior | Low |
| Five-year business model fitness | Low until Founder decides |

---

**Review cadence:** Before every major product release.
