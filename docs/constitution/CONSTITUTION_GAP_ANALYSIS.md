# MawashiDZ Constitution Gap Analysis

**Version:** 1.0  
**Date:** 2026-07-24  
**Purpose:** Challenge the Constitution and implementation before they become expensive mistakes.  
**Companion:** [MAWASHIDZ_CONSTITUTION.md](./MAWASHIDZ_CONSTITUTION.md)

> Every conclusion is labeled: **Verified Fact**, **Assumption**, **Recommendation**, or **Long-Term Idea**.

---

## Executive summary

MawashiDZ has a **solid Phase 0 foundation**: static site + Supabase Auth, sequential member IDs, registration pipeline, password recovery, and server-enforced registration review (RLS + RPC). Extensive product documentation describes Smart Workspaces, Hub, marketplace, messaging, and notifications — but **most of that vision is not yet in code**.

The greatest risks are not missing features — they are **building features before Founder decisions, field research, and Phase 1 operational stability**.

| Category | Status |
|----------|--------|
| Auth & registration | **Strong** — implemented with security tests |
| Admin / wilaya review | **Partial** — RPC + UI; audit log on branch only |
| Role Smart Workspaces | **Not started** — generic account modal only |
| Marketplace (transactional) | **Not started** — price board is simulated |
| Livestock / animals / QR | **Not started** — marketing copy only |
| Messaging / notifications | **Not started** — contact form inserts only |
| Schema canonicality | **Weak** — dual migration paths, incomplete `setup.sql` |

**Top 3 immediate actions (Recommendation):**
1. Merge migration 008 (audit log) to `main` and complete Track A gates
2. Founder decision session on business model, marketplace policy, and broker role
3. Field research plan for Algerian breeders/brokers/buyers before marketplace schema

---

## Section 1 — What is missing from the Constitution?

### 1.1 Business & domain workflows

| Missing area | Why it matters | Priority | Classification |
|--------------|----------------|----------|----------------|
| **Livestock lifecycle** (birth → sale → death) | Core domain — without it, QR and marketplace have no entity | **Critical** | Recommendation |
| **Ownership transfer workflow** | Legal/trust implications; disputes inevitable | **Critical** | Recommendation + Founder decision |
| **Animal sale completion workflow** | Links marketplace to immutable ownership history | **Critical** | Recommendation |
| **Death / culling workflow** | Affects herd stats, insurance, traceability | **High** | Recommendation |
| **Breeding lifecycle** | High value for breeders; complex data model | **High** | Recommendation |
| **Dispute resolution** | Marketplace cannot launch without escalation path | **Critical** | Founder decision |
| **User reporting & appeals** | Trust and safety for operators and members | **High** | Recommendation |
| **Marketplace moderation policy** | Required before any listing goes live | **Critical** | Founder decision |

### 1.2 Platform operations

| Missing area | Why it matters | Priority | Classification |
|--------------|----------------|----------|----------------|
| **Notification lifecycle** (create → deliver → read → archive) | Unified inbox is constitution-mandated | **High** | Recommendation |
| **Media retention policy** | Storage costs and legal holds | **High** | Recommendation |
| **Password policies** (complexity, rotation) | Security baseline | **Medium** | Recommendation |
| **Session expiration policy** | Document expected Supabase session behavior | **Medium** | Recommendation |
| **Disaster recovery & backup** | National platform requires continuity plan | **Critical** | Recommendation |
| **Incident response** | Outages, data breaches, abuse spikes | **Critical** | Recommendation |
| **Monitoring & alerting** | No visibility into production health today | **Critical** | Verified Fact (missing) |
| **Release management** | Staging, rollback, migration gates | **High** | Recommendation |
| **Developer onboarding** | Constitution references five-year maintainability | **Medium** | Recommendation |
| **Employee onboarding** | Future ops team needs runbooks | **Medium** | Long-Term Idea |

### 1.3 Product & compliance

| Missing area | Why it matters | Priority | Classification |
|--------------|----------------|----------|----------------|
| **Terms of Service** | Legally required before scale | **Critical** | Founder decision + legal |
| **Privacy Policy** | GDPR-style principles; Algerian law | **Critical** | Founder decision + legal |
| **Data retention policy** | Immutable audit vs user deletion rights | **Critical** | Founder decision |
| **Veterinary liability disclaimers** | Health advice liability | **Critical** | Legal review |
| **Accessibility standard** (WCAG target) | Mobile-first Algeria includes disabilities | **Medium** | Recommendation |
| **API documentation** | RPC growth requires discoverability | **High** | Recommendation |
| **AI governance policy** | Before any ML features | **High** | Founder decision |

### 1.4 Technical architecture gaps (implementation vs constitution)

| Missing area | Why it matters | Priority | Classification |
|--------------|----------------|----------|----------------|
| **`user_roles` table creation** | Migrations assume it exists; fresh install breaks | **Critical** | Verified Fact |
| **`registrations.status` in setup.sql** | Dashboard queries fail on fresh install | **Critical** | Verified Fact |
| **Canonical single migration path** | Two paths (001–007 vs 20260718*) cause drift | **Critical** | Verified Fact |
| **Storage buckets + RLS** | Media system impossible without | **High** | Verified Fact (missing) |
| **Animal / listing / order tables** | Marketplace and QR depend on entities | **Critical** | Verified Fact (missing) |
| **CI pipeline** | Tests exist but no GitHub Actions | **High** | Verified Fact (missing) |
| **`docs/database-schema.md` completeness** | Omits half the production schema | **Medium** | Verified Fact |

---

## Section 2 — What requires field research?

Never replace research with assumptions.

### 2.1 Breeders

| Topic | Current knowledge | Missing knowledge | Method | Business impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|-----------------|----------|------------|
| Registration habits | **Assumption:** paper + memory | Digital tool usage | Interviews (n≥20) | Onboarding UX | Critical | Low |
| Vaccination recording | Constitution mandates tracking | Actual workflow | Farm visits | Vet module design | High | Low |
| Animal identification | QR proposed | Ear tags, brands, oral tradition | Observation | QR vs NFC vs manual | High | Low |
| Selling livestock | Brokers often involved | Direct vs broker % | Market observation | Broker role decision | Critical | Low |
| Smartphone/internet | **Assumption:** moderate adoption | OS, screen size, connectivity | Survey by wilaya | Mobile/offline strategy | Critical | Low |
| Payment methods | **Assumption:** cash dominant | Mobile payment adoption | Interviews | Marketplace escrow feasibility | High | Low |
| Price estimation | AI suggested | How breeders price today | Interviews | AI scope | Medium | Low |
| Daily frustrations | Unknown | Time-consuming tasks | Ethnography | Feature prioritization | Critical | Low |

### 2.2 Brokers

| Topic | Current knowledge | Missing knowledge | Method | Impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|--------|----------|------------|
| Commission models | **Assumption:** negotiated orally | Typical % ranges | Broker interviews | Platform fee model | High | Low |
| Fraud patterns | Constitution warns | Documented scams | Market visits | Trust/verification design | Critical | Low |
| Digital tools desired | None verified | Actual willingness | Surveys | Broker role vs breeder extension | High | Low |

### 2.3 Buyers

| Topic | Current knowledge | Missing knowledge | Method | Impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|--------|----------|------------|
| Trust signals | Constitution lists ideas | What buyers actually check | Buyer interviews | Listing fields MVP | Critical | Low |
| Abandonment reasons | Unknown | Drop-off points | Funnel observation | UX simplification | High | Low |
| Transport concerns | Mentioned in draft | How arranged today | Interviews | Transport marketplace timing | Medium | Low |

### 2.4 Veterinarians

| Topic | Current knowledge | Missing knowledge | Method | Impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|--------|----------|------------|
| Record keeping | Digital workspace planned | Paper vs software % | Vet interviews | Workspace MVP scope | High | Low |
| Certificate needs | PDF system planned | Official format requirements | Regulatory review | Certificate templates | High | Low |
| Professional verification | `vet` registration role exists | Valid licensing source | Ministry/regulatory | Verification workflow | Critical | Low |

### 2.5 Markets (physical)

| Topic | Current knowledge | Missing knowledge | Method | Impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|--------|----------|------------|
| Negotiation flow | **Assumption:** in-person haggling | Information exchanged | Market ethnography | Messaging & listing design | Critical | Low |
| Inspection practices | Unknown | Health checks at market | Observation | Vet integration value | High | Low |
| Seasonality | **Assumption:** Eid peaks | Regional calendars | Historical price data | Capacity planning | Medium | Low |

### 2.6 Technology (Algeria)

| Topic | Current knowledge | Missing knowledge | Method | Impact | Priority | Confidence |
|-------|-------------------|-------------------|--------|--------|----------|------------|
| Internet quality | Draft cites variability | Per-wilaya metrics | Survey + MNO data | Offline strategy | Critical | Low |
| Common devices | Unknown | Android versions, screen sizes | Analytics when live | UI breakpoints | High | Low |
| Language preference | AR/EN/FR/DE in i18n | Primary vs secondary | User survey | Default locale | Medium | Medium |
| Upload speeds | Unknown | Photo upload tolerance | Field test | Media compression policy | High | Low |

---

## Section 3 — What requires Founder decisions?

Implementation must pause on these until documented.

| Decision | Reason | Business impact | Technical impact | Urgency | Options | Founder approval |
|----------|--------|-----------------|------------------|---------|---------|------------------|
| **Long-term mission & 5-year success definition** | Guides all prioritization | Strategic | Roadmap scope | Critical | Document in `VISION.md` | **Yes** |
| **Algeria-only vs international** | Schema, legal, i18n | Market size | Architecture | High | DZ-only / MENA later / export model | **Yes** |
| **Business model** (free vs premium vs ads) | Revenue vs trust | Sustainability | Billing infrastructure | Critical | Free / freemium / B2B / hybrid | **Yes** |
| **Broker role** | Schema and workspace fork | Marketplace dynamics | Role model | High | Separate role / breeder extension / defer | **Yes** |
| **Marketplace policy** | Legal and moderation | Trust | Schema + workflows | Critical | Verification levels, prohibited items | **Yes** |
| **Registration simplicity vs verification** | Adoption vs fraud | Growth | Onboarding flow | High | Simple / manual review / hybrid (current) | **Yes** |
| **Anonymous browsing** | Discovery vs spam | Conversion | RLS design | Medium | Allow prices public / require login | **Yes** |
| **Messaging gating** | Trust vs friction | Engagement | Ticket vs open DM | High | Tickets only / verified DM / phased | **Yes** |
| **Data retention & deletion** | Legal + immutable audit | Compliance | DB policies | Critical | Retention periods per data class | **Yes** |
| **AI policy** | Liability | Product differentiation | ML infrastructure | High | Allowed use cases, explainability rules | **Yes** |
| **QR security model** | Forgery risk | Identity trust | Crypto/signing design | High | Signed URLs / static ID / holographic card | **Yes** |
| **Payment integration** | Marketplace completion | Revenue | PCI, partners | High | Cash-only record / escrow / mobile money | **Yes** |
| **Brand identity finalization** | Consistency | Marketing | Design system | Medium | Logo, palette, voice (Founder owns) | **Yes** |

**Recommendation:** Create `/docs/constitution/VISION.md` and `/docs/constitution/FOUNDER_DECISIONS.md` after Founder session.

---

## Section 4 — What should NOT be implemented?

### 4.1 Reject (Won't Implement without new evidence)

| Feature | Reason | Classification |
|---------|--------|----------------|
| **Blockchain / cryptocurrency** | No verified business problem; high complexity | Recommendation |
| **Microservices** | Current scale is single static app + Supabase | Recommendation |
| **End-to-end encrypted messaging (v1)** | Operational complexity; legal discovery issues | Recommendation |
| **Voice/video messaging (v1)** | Text/tickets must work first | Recommendation |
| **AI price estimation (v1)** | No transaction data; liability | Recommendation |
| **Separate CEO role in database** | Duplicates Founder | Recommendation |
| **Decorative analytics dashboards** | Vanity metrics violate constitution | Recommendation |
| **National government API integration** | No legal framework verified | Long-Term Idea |
| **WhatsApp integration** | Policy, cost, Meta dependency | Long-Term Idea |

### 4.2 Postpone

| Feature | Prerequisite | Classification |
|---------|--------------|----------------|
| **Transactional marketplace** | Phase 1 complete + Founder marketplace policy | Recommendation |
| **Broker workspace** | Field research on broker workflows | Recommendation |
| **Animal QR verification** | `animals` table + ownership model | Recommendation |
| **Offline writable sync** | Conflict resolution design + mobile app | Long-Term Idea |
| **Feed/equipment marketplaces** | Livestock marketplace proof | Long-Term Idea |
| **Hub P0** | Phase 1 gates (ROADMAP.md) | Verified Fact (gated) |

### 4.3 Feature validation failures in draft v1.0

| Draft idea | Issue | Verdict |
|------------|-------|---------|
| Full messaging platform day one | No ticket foundation; support overload | **Simplify** → tickets first |
| 58 auto-assigned wilaya managers | Managers are appointed, not geographic auto-assign | **Clarify** → one manager per wilaya is target |
| Membership card expiration | No business rule defined | **Defer** until business model decided |
| PDF for all document types at once | High effort | **Phased** → membership card first |

---

## Section 5 — Risk analysis

### 5.1 Technical risks

| Risk | Probability | Impact | Detection | Mitigation | Recovery | Classification |
|------|-------------|--------|-----------|------------|----------|----------------|
| **Dual migration path drift** | High | High | Fresh install test | Single canonical migration | Rebuild from baseline | Verified Fact |
| **`user_roles` missing on fresh DB** | High | Critical | CI migration test | Add CREATE TABLE to setup | Manual SQL fix | Verified Fact |
| **Open INSERT spam** on registrations/contact | Medium | Medium | Row count alerts | Rate limit + CAPTCHA + RPC | Purge + tighten RLS | Verified Fact |
| **Storage growth** (future media) | Medium | High | Bucket metrics | Limits, compression, lifecycle | Archive cold storage | Recommendation |
| **Slow queries** at scale | Medium | Medium | pg_stat_statements | Index review, pagination | Query optimization | Recommendation |
| **Vendor lock-in** (Supabase) | Low | High | Architecture review | Portable SQL, export backups | Migration plan | Assumption |
| **Offline sync conflicts** | Low (deferred) | High | Sync logs | Last-write-wins forbidden; design CRDTs | Manual reconciliation | Long-Term Idea |

### 5.2 Business risks

| Risk | Likelihood | Impact | Mitigation | Classification |
|------|------------|--------|------------|----------------|
| **Low adoption** | Medium | Critical | Field research, simple onboarding | Assumption |
| **Marketplace inactivity** | High (if launched early) | High | Seed supply (breeders) before buyers | Recommendation |
| **User distrust** (fake listings/vets) | Medium | Critical | Verification + moderation policy | Recommendation |
| **Seasonal demand spikes** | Medium | Medium | Capacity planning for Eid | Assumption |
| **Revenue uncertainty** | High | Medium | Founder business model decision | Assumption |

### 5.3 Security risks

| Risk | Mitigation | Classification |
|------|------------|----------------|
| **Unauthorized access** | RLS + RPC (implemented for core tables) | Verified Fact |
| **Privilege escalation** | `user_roles` server checks; no client-only gates | Verified Fact |
| **Fake veterinarians** | Professional verification workflow (not built) | Recommendation |
| **Fake listings** | Moderation queue (not built) | Recommendation |
| **QR forgery** | Signed tokens, server verification (not built) | Recommendation |
| **Account takeover** | Supabase Auth + recovery hardening | Partial — Verified Fact |
| **Malicious uploads** | MIME validation, virus scan, size limits (not built) | Recommendation |
| **Publishable key exposure** | Expected Supabase pattern; RLS must hold | Verified Fact |

### 5.4 Operational risks

| Risk | Mitigation | Classification |
|------|------------|----------------|
| **No CI/CD** | Add GitHub Actions running `npm test` | Verified Fact |
| **Backup failures** | Document Supabase backup + restore drill | Recommendation |
| **Deployment errors** | `deploy:prod` gate exists | Verified Fact |
| **Support overload** | Ticket system before open messaging | Recommendation |
| **Third-party outage** (Supabase, Cloudflare) | Status page, comms template | Recommendation |

### 5.5 Year 1 / 3 / 5 risk focus

| Horizon | Top risks | Immediate mitigation |
|---------|-----------|---------------------|
| **Year 1 (launch)** | Low adoption, incomplete ops tooling, legal gaps | Field research, Phase 1 completion, legal review |
| **Year 3 (growth)** | Schema debt, moderation scale, hiring | Canonical migrations, audit log, runbooks |
| **Year 5 (national)** | Infrastructure scale, governance, DR | Architecture review, multi-region plan, Founder succession |

---

## Section 6 — Repository analysis (implementation reality)

### 6.1 What exists today (**Verified Fact**)

| Area | Implementation | Key files |
|------|----------------|-----------|
| **Static site + i18n** | AR/EN/FR/DE | `index.html`, `assets/i18n*.js` |
| **Registration** | Multi-role, server member ID | `js/registration-flow.mjs`, `supabase/setup.sql` |
| **Login** | Email/phone/member ID | `resolve_login_identifier` RPC |
| **Password recovery** | Anti-enumeration, hash callback | `js/password-recovery.mjs` |
| **Registration review** | Admin + wilaya manager queues | `js/mdz-dashboards.mjs`, migration `007` |
| **Profile protection** | Trigger blocks client status changes | migration `005` |
| **Livestock prices** | Simulated national board | `netlify/functions/prices.mjs`, `assets/market-engine.js` |
| **Livestock news** | RSS aggregation | `netlify/functions/news.mjs` |
| **Security tests** | RPC permission tests | `tests/security-*.test.mjs` |
| **Product library** | Constitution v1.4, PRDs, PDRs | `docs/product/` |

### 6.2 What is documented but not built (**Verified Fact**)

| Area | Documented in | Code state |
|------|---------------|------------|
| Smart Workspaces (5 pillars) | PRODUCT_CONSTITUTION | Generic account modal only |
| Smart Hub / Card Providers | PDR-002, constitution P0–P7 | No `mdz-hub-core`, no `hub_cards` |
| Notification center | MEMBER_OPERATIONS §5 | EmailJS operator alert only |
| Support & Messages Center | SUPPORT_AND_MESSAGES_CENTER | `contact_messages` insert only |
| Admin audit log | Migration 008 (branch) | Not on `main` |
| Marketplace listings/orders | Constitution, roadmap Phase 3+ | Marketing `#market` section only |
| Animals / herds / health | Constitution Part VI | No tables |
| QR identity | Constitution §5.3 | Static site QR image only |
| Storage / media uploads | Constitution §5.7 | No buckets |
| Event bus | PDR-003 | Not implemented |

### 6.3 Architecture strengths (**Verified Fact**)

1. **Server-side authorization** for sensitive operations (RLS + SECURITY DEFINER RPCs)
2. **Member ID allocation** locked to service_role / triggers — tested
3. **Wilaya fencing** in registration review RPC
4. **Anti-enumeration** patterns in registration and password recovery
5. **Comprehensive test suite** for Phase 0 flows
6. **Clear product documentation hierarchy** with design gates

### 6.4 Architecture weaknesses (**Verified Fact** + **Recommendation**)

| Weakness | Severity | Recommendation |
|----------|----------|----------------|
| Monolithic `index.html` (~3600 lines) | Medium | Extract modules incrementally; avoid big-bang rewrite |
| No `user_roles` in setup.sql | Critical | Add CREATE TABLE + seed docs |
| Incomplete `setup.sql` vs production | Critical | Merge 002–007 into canonical baseline |
| `registrations.status` missing from setup | Critical | Add column to setup.sql |
| Rejection reasons not shown to members | Medium | Surface `review_reason` in account workspace |
| No CI workflow | High | Add GitHub Actions |
| `docs/database-schema.md` outdated | Medium | Expand or auto-generate from migrations |
| Migration 008 not merged | High | Merge audit log branch |
| Open public INSERT policies | Medium | Rate limits + validation RPC |
| Broker role in constitution but not schema | Low | Founder decision before any code |

### 6.5 Contradictions between draft constitution and codebase

| Draft says | Codebase reality | Resolution |
|------------|------------------|------------|
| CEO dashboard | `founder` role, shared admin UI | Rename strategically to Founder; build dedicated surface later |
| 58 Wilaya Managers | Managers manually assigned via `user_roles` | Correct — not automatic |
| Broker inherits breeder | No broker exists | Defer until research |
| Messaging with voice/video | Contact form only | Reject for v1 |
| QR for all entities | Static marketing QR | Phased with animal schema |
| "Dashboard" for all roles | PDR-001 says Smart Workspace | Use Smart Workspace term |
| Immutable vaccination history | No vaccination tables | Schema work required |

---

## Section 7 — Improved Constitution recommendations

### 7.1 Structural improvements (**Recommendation**)

1. **Adopt two-tier constitution model** (implemented in this PR):
   - `MAWASHIDZ_CONSTITUTION.md` — strategic master
   - `PRODUCT_CONSTITUTION.md` — Smart Workspace/Hub mechanics
2. **Add `VISION.md`** after Founder session
3. **Add `FOUNDER_DECISIONS.md`** with decision log template
4. **Expand `GLOSSARY.md`** with: broker, ownership transfer, QR identity, immutable record
5. **Merge PRODUCT_CONSTITUTION into v2.1** once Founder approves master constitution (avoid dual maintenance long-term)

### 7.2 Simplifications (**Recommendation**)

| Over-engineered draft idea | Simpler alternative |
|----------------------------|---------------------|
| Separate broker role day one | Breeder + "professional seller" flag |
| Full chat platform | Ticket system → listing-linked threads |
| PDF for all document types | Membership card PDF first |
| 6 separate member dashboards | One workspace shell + role templates |
| E2E encryption debate now | TLS + encrypted storage; revisit at scale |
| AI across all domains | Single assistant card slot (P7) when data exists |

### 7.3 Critical additions for v2.1 (**Recommendation**)

- Livestock entity model (animals, herds, ownership_events)
- Marketplace state machine (draft → review → active → sold → archived)
- Dispute and report workflows
- Data classification matrix (immutable vs deletable)
- Operational runbooks (deploy, incident, backup)
- Accessibility target (WCAG 2.1 AA aspiration)

---

## Section 8 — Priority order & next actions

### 8.1 Immediate (before new features)

| # | Action | Owner | Classification |
|---|--------|-------|----------------|
| 1 | Founder decision session (§3 table) | Founder | Recommendation |
| 2 | Merge migration 008 + complete Track A | Engineering | Recommendation |
| 3 | Fix canonical `setup.sql` (user_roles, registrations.status, 002–007) | Engineering | Recommendation |
| 4 | Add CI workflow (`npm test`) | Engineering | Recommendation |
| 5 | Update `database-schema.md` | Engineering | Recommendation |
| 6 | Commission field research (§2) | Founder + Product | Recommendation |

### 8.2 Phase 1 completion (per ROADMAP)

| Track | Action |
|-------|--------|
| A | Admin operations + audit log in production |
| B | Verify password recovery in production |
| C | Operational email provider (Resend/Brevo) |
| D | Notification center MVP |
| E.1–E.3 | Ticket model + admin/wilaya messaging |

### 8.3 Phase 2 (after gates)

| Step | Action |
|------|--------|
| P0 | `hub_cards` + `hub_engagement_events` migration |
| P1 | `mdz-hub-core` + breeder-first workspace |
| Domain | `animals` table + ownership model (new — not in current roadmap) |

**Recommendation:** Add explicit **Phase 2.5 — Livestock Identity** between Hub P1 and marketplace: animals schema, QR generation, basic breeder animal management. Current roadmap jumps from Hub to marketplace without animal entities.

---

## Section 9 — Final report summary

### Features that should NOT be implemented (now)

Blockchain, cryptocurrency, microservices, E2E messaging v1, voice/video v1, AI pricing v1, decorative dashboards, duplicate broker role without research.

### Features that should be postponed

Transactional marketplace, broker workspace, animal QR, offline writable sync, government APIs, Hub P0 (until Phase 1 gates).

### Features requiring research

All §2 topics — especially breeder selling habits, buyer trust signals, broker necessity, vet verification source, per-wilaya connectivity.

### Features requiring Founder approval

Business model, marketplace policy, AI policy, data retention, QR security, payment model, Algeria vs international scope.

### Critical risks

| Type | Top risk |
|------|----------|
| Technical | Incomplete canonical schema / migration drift |
| Business | Building marketplace before supply-side research |
| Security | Fake listings/vets without verification workflow |
| Operational | No CI, no incident/backup runbooks |

### Confidence levels

| Area | Confidence |
|------|------------|
| Phase 0 auth/registration implementation | **High** |
| RLS/RPC security for review flows | **High** |
| Algerian user behavior assumptions | **Low** — research required |
| Broker role necessity | **Low** |
| Five-year marketplace monetization | **Low** — Founder decision required |
| Smart Workspace architecture (Hub) | **Medium** — well-documented, unproven in code |

---

## Review cadence

**Recommendation:** Review this gap analysis before every major product release and after every constitution amendment.

---

## Document history

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-07-24 | Initial gap analysis: reconstructed constitution v2.0 + full repository review |
