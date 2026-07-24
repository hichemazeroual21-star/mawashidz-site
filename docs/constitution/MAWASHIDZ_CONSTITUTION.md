# MawashiDZ Master Constitution

**Version:** 2.0 (Reconstructed)  
**Status:** Draft for Founder review  
**Last updated:** 2026-07-24  
**Supersedes:** Fragmented constitution drafts (v1.0 chat messages)  
**Related:** [Gap Analysis](./CONSTITUTION_GAP_ANALYSIS.md) · [Smart Workspace detail](../product/PRODUCT_CONSTITUTION.md) · [Roadmap](../product/ROADMAP.md)

---

## Preamble

MawashiDZ is **not** a marketplace alone, **not** a website alone, and **not** a mobile app alone. It is a **national digital ecosystem** designed to become Algeria's trusted reference for livestock management and livestock commerce.

This Constitution is the **source of truth** for all product, engineering, security, and operational decisions. Implementation follows the Constitution — never the opposite.

This is a **living document**. When architecture, permissions, business rules, or security posture change, the Constitution must be reviewed and updated.

### Classification of statements

Throughout MawashiDZ documentation, every significant conclusion must be labeled:

| Label | Meaning |
|-------|---------|
| **Verified Fact** | Confirmed by code, documentation, research, or trusted sources |
| **Assumption** | Believed true but not yet verified |
| **Recommendation** | Proposed improvement based on analysis |
| **Long-Term Idea** | Valuable future direction — not for immediate implementation |

---

## Part I — Mission, Vision & Principles

### 1.1 Mission

Build the most **trusted**, **secure**, **scalable**, **maintainable**, and **user-friendly** digital livestock ecosystem in Algeria.

### 1.2 Long-term vision

The architecture must support continuous growth across:

- Livestock marketplace
- Feed marketplace
- Veterinary services
- Equipment marketplace
- Transportation marketplace
- Livestock health records and vaccination tracking
- Herd management
- Membership cards and professional invitations
- QR identity ecosystem
- Analytics, reports, and (when justified) AI assistance
- Mobile applications and offline-aware workflows
- Future government integrations (if legally and technically appropriate)
- Future international expansion (only if justified by research)

*Classification: Vision statement — requires Founder decision on Algeria-only vs expansion (see Gap Analysis §3).*

### 1.3 Core principles

1. **Technology serves people** — people never serve technology.
2. **Research before assumptions** — field validation before major features.
3. **Architecture before implementation** — design for five-year sustainability.
4. **Trust before growth** — monetization must not damage trust.
5. **Security before convenience** — server-side enforcement always.
6. **Quality before quantity** — reject feature creep.
7. **Maintainability before shortcuts** — readable code over clever code.
8. **Reality before opinions** — challenge every idea, including this document.

### 1.4 Design gate

Before any feature is approved, answer:

> **Which responsibility does this serve, and which role benefits?**

If the answer is "none" or "everyone equally without purpose," the feature must be **reconsidered**.

For member-facing surfaces, also apply the Smart Workspace gate from [PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md):

> **Which workspace benefits from it?**

### 1.5 Terminology: Smart Workspace (not Dashboard)

**Recommendation** (approved in PDR-001): Use **Smart Workspace** for role operational homes. Avoid "Dashboard" in new product copy, specs, and code names. Legacy modules (e.g. `mdz-dashboards.mjs`) may retain historical names until refactored.

---

## Part II — Governance & Platform Roles

### 2.1 Design around responsibilities, not pages

The platform is designed around **responsibilities** and **permissions**, not around static pages. Every role exists because it solves a real business need. Every permission exists because it supports a real responsibility — nothing more.

### 2.2 Role hierarchy

| Rank | Platform roles | Scope |
|------|----------------|-------|
| **R4 — Founder / CEO** | `founder`, `super_admin` | Full platform authority |
| **R3 — Platform admin** | `admin` | National operations (subset per policy) |
| **R2 — Wilaya manager** | `wilaya_manager`, `manager`, `wilaya_mgr` | **One wilaya only** (58 wilayas in Algeria — **Verified Fact**) |
| **R1 — Member** | `breeder`, `vet`, `feed`, `buyer`, (+ optional `broker`) | Own commercial and professional data |

**Verified Fact:** Current implementation stores membership type in `profiles.role` and operational elevation in `user_roles.role`. These are **two separate systems** and must not be conflated.

**Assumption:** The title "CEO" in strategic documents maps to the **Founder** role (`founder` / `super_admin`) in implementation. A separate `ceo` role is **not recommended** — it duplicates Founder authority.

### 2.3 Founder / CEO

The Founder permanently owns the platform. The Founder is not simply another administrator.

**Capabilities include:**
- Global platform supervision and configuration
- Permission and employee management
- Platform roadmap and feature approval
- Architecture and security review
- Emergency controls and audit oversight
- Financial and business analytics (future)
- System health and deployment monitoring

**Recommendation:** Support one Founder identity linked to multiple verified login emails when justified. Never duplicate founder accounts.

### 2.4 Platform administrators

Administrators manage platform operations. They must **not** automatically receive every permission. Permissions are assigned individually, including:

- Registration approval
- Marketplace moderation
- Content moderation
- Veterinary verification
- Reports and support
- User verification
- Announcements

### 2.5 Wilaya managers

Each Wilaya Manager is responsible **only** for their assigned wilaya.

**May:**
- Approve/reject registrations and request documents
- Review reports and moderate local listings
- View wilaya statistics and support local users

**Must never:**
- View another wilaya's data
- Modify global settings or permissions
- Access Founder-only configuration
- Change Auth, RLS, or audit policies
- Delete audit logs or permanently delete users

**Verified Fact:** Wilaya fencing is enforced server-side via RLS (`003_dashboard_rls.sql`) and RPC checks (`007_review_registration_status.sql`).

### 2.6 Member roles

#### Breeder (heart of the platform)

Manages animals, herds, vaccinations, treatments, medical history, weights, breeding, feed consumption, marketplace listings, messages, notifications, documents, membership, QR cards, and statistics.

#### Broker

**Assumption:** Brokers are significant in Algeria's livestock trade but are **not yet** in the schema or UI.

**Recommendation:** Do **not** create a separate broker role until field research confirms distinct workflows from breeders. Initially, extend breeder capabilities (multiple listings, client notes) rather than a new role.

#### Buyer

Requires simplicity: search, filter, compare, favorites, trusted sellers, messaging, notifications, purchase history, QR verification, and veterinary records (when available).

#### Veterinarian

Professional tools only. **Must never** modify ownership, prices, or commercial listing fields.

**Verified Fact:** Registration role is `vet` in current schema.

#### Feed seller

Product catalog, orders, inventory — see Smart Workspace detail in [PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md) §3.

### 2.7 Support employees

Support staff receive only permissions required for assigned tasks. No employee receives administrator permissions by default.

### 2.8 Permission philosophy

- **Least privilege** everywhere.
- **Frontend restrictions are not security** — all authorization via RLS + RPC.
- Every permission must answer: *Why does this role need this permission?*

### 2.9 Privacy rules (non-negotiable)

| Rule | Meaning |
|------|---------|
| **No upward leakage** | R1 never sees R2+ internal queues, audit detail, or cross-user suspension reasons |
| **Wilaya fence** | R2 sees only their wilaya |
| **Professional boundaries** | Vets never modify commercial/ownership data |
| **Admin surface** | Provider toggles, national alerts, role grants — R3/R4 only |
| **Search & notifications** | Filtered by rank + RLS — no search bypass |

---

## Part III — Data Governance

### 3.1 Immutable data policy

Never permanently delete:

- Audit logs, security logs
- Registration and approval history
- Permission and role change history
- Vaccination and veterinary history
- Livestock ownership history
- Critical financial references
- Important system notifications and events

For every dataset, classify as: **Immutable**, **Versioned**, **Archived**, or **Soft Deleted** — with documented rationale.

**Verified Fact:** `admin_audit_log` is designed in migration 008 (branch only — not yet on `main`).

### 3.2 Audit policy

Every important action records: **who**, **when**, **what changed**, **previous value**, **new value**, **reason** (when applicable). Audit logs must not be editable.

### 3.3 Employee management

Employees have one identity, may have multiple verified emails if justified, and receive role-based permissions only.

---

## Part IV — User Experience & Smart Workspaces

### 4.1 Experience strategy

Every role must immediately feel that MawashiDZ was designed for them. Each Smart Workspace answers: **What is this user trying to accomplish today?**

Display only relevant information. Remove distractions. Prioritize daily tasks and **actions before content**.

### 4.2 Universal workspace structure

Every Smart Workspace combines **five pillars** (detail in [PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md)):

1. **Daily insights** (Hub cards, local context, trends)
2. **Operational management** (listings, orders, requests, cases)
3. **Quick actions** (create, approve, message, publish)
4. **Statistics & performance**
5. **Notifications & workflow**

### 4.3 Role workspace summaries

| Role | Primary focus |
|------|---------------|
| **Breeder** | Reminders, vaccinations, listings, messages, market prices, QR, trusted breeder progress |
| **Broker** | Negotiations, client history, sales performance (future — extend breeder first) |
| **Buyer** | Discovery, saved searches, favorites, comparison, trusted sellers |
| **Veterinarian** | Appointments, cases, vaccination schedules, certificates |
| **Wilaya manager** | Urgent tasks, wilaya queue, reports, local moderation |
| **Founder / admin** | Platform health, security, registrations, marketplace stats, audit, roadmap |

**Verified Fact:** Today only a **generic account modal** plus admin/manager registration queues exist (`js/mdz-dashboards.mjs`). Role-specific Smart Workspaces are **not implemented** — planned Phase 2 per [ROADMAP.md](../product/ROADMAP.md).

### 4.4 Smart Hub

The Smart Hub is a modular card framework inside each workspace — not a separate product. Every future vertical (equipment, transport, insurance, etc.) registers as a **Card Provider**, not a new top-level paradigm.

**Architecture rule:** No Card may execute SQL directly. Flow: Card → Provider → Service → RPC → Database (RLS).

See [PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md) and PDR-002 for full Hub specification.

### 4.5 UX principles

- Card-first, mobile-first, RTL-safe
- One primary objective per screen
- Guided empty states — never blank grids
- Consistent MawashiDZ visual language
- No deep navigation or hidden functionality
- No decorative dashboards or unnecessary animations

---

## Part V — Platform Systems

### 5.1 Messaging

Messaging is a core professional communication channel.

**Phase 1 (Recommendation):** Support & Messages Center — typed tickets, wilaya-scoped threads, staff internal notes. See [SUPPORT_AND_MESSAGES_CENTER.md](../product/SUPPORT_AND_MESSAGES_CENTER.md).

**Phase 2+:** Member-to-member messaging linked to listings and animals.

**Long-Term Ideas** (require Founder decision + research before build):
- Voice messages, video sharing, location sharing
- Group conversations
- End-to-end encryption (vs encrypted transport/storage — evaluate cost/benefit)

**Verified Fact:** Only `contact_messages` and `feedback_tickets` public inserts exist today. No ticket threads, no member messaging.

### 5.2 Notifications

Unified notification center (server-backed inbox, RLS per recipient):

- Registration outcomes, messages, marketplace events
- Vaccination and medical reminders
- Price alerts, listing expiration
- Wilaya/local announcements (rank-scoped)
- User-customizable preferences

**Phasing:** Track D in Phase 1 ([MEMBER_OPERATIONS.md](../product/MEMBER_OPERATIONS.md) §5) before Hub deep-links.

**Long-Term Ideas:** Push, SMS, WhatsApp — only after core inbox is stable.

**Verified Fact:** Only EmailJS operator alert on registration exists. No notification center.

### 5.3 QR ecosystem

QR codes are a core identity system for:

- Livestock, members, veterinarians, listings, membership cards, certificates, invitations, documents, farms

**Requirements:**
- Offline identification where technically feasible
- Online retrieval of verified records when connected
- Security against forgery and tampering

**Verified Fact:** Only a static marketing site QR exists. No generation, verification, or `qr_codes` table.

**Recommendation:** Implement QR in Phase 2 alongside first animal profiles — not before livestock entities exist in schema.

### 5.4 Membership cards

Every verified member may receive a professional membership card with unique member ID, QR, verification status, role, wilaya, and membership date. Printable and downloadable as PDF.

**Verified Fact:** Member IDs (`MDZ-F-000001` format) are allocated server-side. PDF/card generation is **not implemented**.

### 5.5 PDF system

Generate professional PDFs for membership cards, invitations, livestock reports, medical/vaccination reports, certificates, and marketplace reports. Include QR where appropriate.

**Status:** Not implemented.

### 5.6 Invitation system

Role-specific invitation templates (vet, breeder, broker, buyer, employee, partner) maintaining MawashiDZ visual identity.

**Verified Fact:** Registration form collects `invite_code` / `invited_by` but full invitation workflow is not built.

### 5.7 Media system

Support images, videos, documents with compression, optimization, secure storage, metadata, and preview generation.

**Verified Fact:** No Supabase storage buckets or upload pipeline in repository.

**Recommendation:** Define watermark policy, upload limits, and retention before enabling uploads.

### 5.8 Brand system

One visual identity: colors, typography, spacing, icons, components, PDF templates, email templates, notification design. Consistency is mandatory.

### 5.9 User education

Role-specific educational content (breeding, buying guides, fraud prevention, moderation guidelines). Content must be manageable and updatable — not hardcoded marketing copy.

### 5.10 Localization

**Verified Fact:** i18n exists for AR/EN/FR/DE (`assets/i18n.js`, `assets/i18n-content.js`).

**Recommendation:** Arabic-first for Algeria; maintain RTL safety as non-negotiable.

---

## Part VI — Livestock & Veterinary Domain

### 6.1 Livestock lifecycle (required workflows)

The Constitution must govern complete animal lifecycles. These workflows are **missing from v1.0 draft implementation** and require schema + RPC design:

| Workflow | Priority | Notes |
|----------|----------|-------|
| Animal registration | Critical | Foundation for QR, health, marketplace |
| Ownership transfer | Critical | Legal and trust implications — Founder + legal review |
| Sale completion | Critical | Links marketplace to ownership history |
| Death / culling record | High | Immutable event; affects herd stats |
| Breeding lifecycle | High | Mating, gestation, offspring linkage |
| Vaccination & treatment | High | Vet-authored; immutable history |
| Weight tracking | Medium | Breeder-operational |

### 6.2 Marketplace

**Verified Fact:** Public livestock exchange board (simulated prices) and news RSS are implemented. **Transactional marketplace** (listings, orders, purchase requests) is not.

**Marketplace policy** (Founder decisions required):
- Allowed/prohibited listings
- Verification requirements
- Broker participation
- Pricing transparency
- Moderation and dispute escalation

### 6.3 Veterinary workflows

Veterinarians document visits, vaccinations, and certificates within permission boundaries. Medical liability disclaimers require **professional legal review** — not engineering judgment alone.

### 6.4 Algerian ecosystem context

**Assumption:** Algeria's livestock trade involves breeders, brokers (smaâ), weekly markets, seasonal demand, cash-heavy transactions, and variable internet quality.

**Recommendation:** All major marketplace and payment features require **field research** before implementation (see Gap Analysis §2).

---

## Part VII — Security & Performance

### 7.1 Security philosophy

Security is a design principle, not a feature.

Assume: attackers exist, permissions will be abused, users and employees make mistakes.

**Enforce server-side:** Auth, authorization, RLS, RPC, storage, uploads, rate limiting, session management, account recovery, secrets management.

**Review regularly:** SQL injection, XSS, CSRF, privilege escalation, QR forgery, fake listings, fake veterinarians, account takeover.

**Verified Fact:** Core RLS and RPC patterns are sound for Phase 0 registration review. Gaps: open INSERT on `registrations`/`contact_messages`, no rate limiting at edge, publishable key in client bundle (expected for Supabase anon pattern).

### 7.2 Performance strategy

Measure — do not guess. Index appropriately, paginate, lazy-load Hub cards (top 4 only), optimize images/video, use background jobs when needed.

**Verified Fact:** Hub performance patterns are specified but Hub is not implemented.

### 7.3 Offline strategy

Support weak connectivity for: QR identity, membership cards, cached Hub content, previously synchronized records.

**Requirements:** Show "last updated" timestamps; never empty workspace if cache exists; conflict resolution must preserve data integrity.

---

## Part VIII — Engineering Standards

### 8.1 Database philosophy

Design tables around **business entities**, not pages. Every table needs clear responsibility, relationships, scalability, auditability, performance, and security.

**Verified Fact:** Phase 0 schema covers `profiles`, `registrations`, `member_id_counters`, `contact_messages`, `feedback_tickets`. `user_roles` is assumed pre-existing but **not created in `setup.sql`**.

**Recommendation:** Consolidate to one canonical migration path. Merge `setup.sql` with migrations 002–007 before any fresh install.

### 8.2 API strategy

Versioned, documented APIs with consistent auth, authorization, rate limits, error handling, and logging. Design for future mobile and partner integrations.

### 8.3 Mobile strategy

Assume mobile becomes primary: simple navigation, offline awareness, fast loading, minimal bandwidth, accessibility, battery efficiency.

**Assumption:** Most Algerian users will access via smartphone — requires field research confirmation.

### 8.4 Testing strategy

Unit, integration, security, performance, accessibility, mobile, regression, and user acceptance testing.

**Verified Fact:** Node test suite exists (`tests/`). No CI workflow in `.github/`.

### 8.5 Documentation strategy

```
/docs
  /constitution     ← this library
  /product          ← PRDs, PDRs, roadmap
  /architecture
  /database
  /security
  /api
  /decisions
  /risks
  /glossary
```

### 8.6 Deployment & operations

**Verified Fact:** Production deploys via Cloudflare Worker (`worker.mjs`). `DEPLOYMENT.md` is canonical.

**Missing (Recommendation — Critical/High):**
- Monitoring and alerting strategy
- Incident response procedures
- Backup and disaster recovery documentation
- Release management and staging gates
- API documentation for RPCs

### 8.7 AI strategy

AI must solve measurable problems — never marketing decoration.

**Founder approval required** before AI features affecting user decisions: price estimation, medical suggestions, recommendations, auto-moderation, fraud detection.

**Long-Term Idea:** AI assistant as Hub Card Provider (P7 in product roadmap).

---

## Part IX — Business & Roadmap

### 9.1 Business model (Founder decision required)

Options requiring explicit Founder approval:
- Free platform vs premium memberships
- Veterinarian/broker/enterprise subscriptions
- Advertising (and which types are acceptable)
- Revenue must never outweigh user trust

### 9.2 Five-year roadmap structure

Classify all work as: **Must Have**, **Should Have**, **Could Have**, **Won't Implement** (with explanation).

**Verified Fact:** Current engineering roadmap:

```text
Phase 1 — Member Operations & Communication (in progress)
    ↓
Phase 2 — Smart Workspace & Hub
    ↓
Phase 3+ — Marketplace modules
    ↓
Phase 7 — AI assistant slot
```

**Recommendation:** Do not start marketplace transactions before Phase 1 gates complete and breeder workspace MVP exists.

### 9.3 Decision log & risk register

Maintain permanent decision log and risk register. Review before every major release.

See [CONSTITUTION_GAP_ANALYSIS.md](./CONSTITUTION_GAP_ANALYSIS.md) for initial risk register.

### 9.4 Feature validation checklist

Before implementing any feature:

1. Does it solve a real problem?
2. Who benefits and how often?
3. Can a simpler solution achieve the same result?
4. Does it add unnecessary complexity, maintenance, or security risk?
5. Can it scale and be understood by new developers?
6. Will users discover it?
7. Would removing it make the platform worse?

If most answers are "no" — **do not implement**.

### 9.5 Features to reject or postpone

**Reject without research:**
- Blockchain/cryptocurrency integration
- Microservices before scale requires them
- Decorative dashboards and duplicate workflows
- Excessive notifications and large registration forms
- AI without data and governance

**Postpone until prerequisites exist:**
- Broker role (until research confirms need)
- Voice/video messaging (until text messaging stable)
- National government integration (until legal framework clear)
- Offline sync of writable data (until conflict model designed)

---

## Part X — Legal & Compliance (Founder + legal counsel)

Professional legal review required before finalizing:

- Terms of Service, Privacy Policy, Cookie Policy
- Data retention periods
- Marketplace and veterinary liability disclaimers
- Fraud policies and dispute handling
- Livestock ownership verification standards

**Recommendation:** Engineering must not publish legal text without counsel approval.

---

## Part XI — Contradictions Resolved

| Topic | Draft v1.0 | Existing product docs | Resolution |
|-------|------------|----------------------|------------|
| CEO vs Founder | "CEO" used throughout | `founder`, `super_admin` roles | Use **Founder** in implementation; CEO = strategic title for same authority |
| Dashboard vs Smart Workspace | "Dashboard" for all roles | PDR-001 rejects "Dashboard" | **Smart Workspace** is canonical term |
| Broker role | Full broker role and dashboard | Not in schema | **Defer** separate role; extend breeder until research confirms |
| 58 Wilaya managers | Explicit count | Wilaya fence in RLS | **Confirmed** — one manager per wilaya is operational target, not automatic assignment |
| Messaging scope | Full chat platform day one | Phased ticket system (Track E) | **Phase 1 tickets first**, member messaging after marketplace hooks |
| E2E encryption | Listed as consideration | Not in product PRDs | **Long-Term Idea** — encrypted transport + storage sufficient for v1 |
| Constitution authority | New master draft | PRODUCT_CONSTITUTION v1.4 approved | Master constitution governs vision/governance; product constitution governs Hub/workspace mechanics until merged in v2.1 |

---

## Part XII — Related Documents

| Document | Path |
|----------|------|
| Gap Analysis & Risk Register | [CONSTITUTION_GAP_ANALYSIS.md](./CONSTITUTION_GAP_ANALYSIS.md) |
| Smart Workspace & Hub detail | [../product/PRODUCT_CONSTITUTION.md](../product/PRODUCT_CONSTITUTION.md) |
| Phase 1 PRDs | [../product/MEMBER_OPERATIONS.md](../product/MEMBER_OPERATIONS.md) |
| Support & Messages | [../product/SUPPORT_AND_MESSAGES_CENTER.md](../product/SUPPORT_AND_MESSAGES_CENTER.md) |
| Roadmap | [../product/ROADMAP.md](../product/ROADMAP.md) |
| PDRs | [../product/PRODUCT_DECISIONS/](../product/PRODUCT_DECISIONS/) |
| Glossary | [../product/GLOSSARY.md](../product/GLOSSARY.md) |
| Database schema | [../database-schema.md](../database-schema.md) |
| ADR: Member ID | [../adr/001-member-id-allocation.md](../adr/001-member-id-allocation.md) |

---

## Version history

| Version | Date | Summary |
|---------|------|---------|
| **2.0** | 2026-07-24 | Reconstructed master constitution from fragmented drafts + merged with PRODUCT_CONSTITUTION v1.4 |
| **1.0** | (chat draft) | Initial strategic draft — superseded by v2.0 structure |
| **1.4** | 2026-07-23 | PRODUCT_CONSTITUTION (Smart Workspace) — remains active for Hub detail |

---

## Founder approval

This v2.0 reconstruction requires Founder review and approval before it supersedes prior strategic drafts as the single highest authority.

**Recommended next actions:**
1. Approve or amend this master constitution
2. Resolve Founder decision table in Gap Analysis §3
3. Commission field research plan (Gap Analysis §2)
4. Complete Phase 1 Track A (admin operations + audit migration 008)
5. Schedule legal review for marketplace and veterinary disclaimers
