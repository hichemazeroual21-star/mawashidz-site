# Draft Master Constitution — Clean Reconstruction

**Version:** 1.0-reconstructed  
**Date:** 2026-07-24  
**Purpose:** Provenance. This is a cleaned merge of the fragmented draft messages **before** critical improvement.  
**Authoritative improved document:** [MASTER_CONSTITUTION.md](./MASTER_CONSTITUTION.md)

Duplicates removed. Overlaps merged. Wording lightly cleaned. Unique ideas preserved.

---

## A. Meta instructions (draft intent)

Act as CTO / architect / product / security / livestock analyst — not as a coding assistant for the constitution phase.  
Understand project + Algerian livestock ecosystem before recommending implementation.  
Challenge assumptions. Distinguish Verified Facts / Assumptions / Recommendations / Long-Term Ideas.  
Constitution is source of truth; implementation follows it.

---

## B. Identity & goal

MawashiDZ is a complete digital ecosystem aiming to become the national digital reference for livestock management and commerce in Algeria — not merely a marketplace, website, or app.

**Main goal:** Most trusted, secure, scalable, maintainable, user-friendly digital livestock ecosystem in Algeria.

**Principles:** Technology serves people · Research before assumptions · Architecture before implementation · Trust before growth · Security before convenience · Quality before quantity · Maintainability before shortcuts · Reality before opinions · Long-term sustainability before short-term speed.

---

## C. Long-term vision inventory (draft wishlist)

Livestock marketplace · Feed marketplace · Veterinary services · Equipment marketplace · Transportation marketplace · Health records · Vaccination tracking · Herd management · Membership cards · Professional invitations · QR ecosystem · Analytics · Reports · AI assistance · Mobile apps · Offline services · Possible government integrations · Possible international expansion.

Architecture must allow growth without rebuild.

---

## D. Roles & governance (draft)

Roles: CEO · Platform Administrator · Wilaya Manager (58) · Support Employee · Veterinarian · Breeder · Broker · Buyer.  
Add roles only if justified.

**CEO:** Global supervision, config, permissions, employees, roadmap, security, emergency, audit, future finance, health, feature approval; one identity possibly multi-email; never duplicate founder accounts.

**Admins:** Assigned permissions individually (approvals, moderation, vet verification, support, announcements, etc.).

**Wilaya managers:** Only their wilaya — approve/reject, documents, reports, local stats, local support, local listings. Never other wilaya, global settings, CEO data, employees outside wilaya, permissions, sensitive config. Server-side enforcement.

**Breeders:** Animals, herds, vaccinations, treatments, history, weights, breeding, feed, listings, messages, notifications, reports, documents, membership, QR, stats, reminders, education.

**Brokers:** Initially inherit breeder; may add multi-listing, negotiation, verification, clients, analytics — **evaluate if dedicated role needed**.

**Buyers:** Search, filter, compare, favorites, trusted sellers, messaging, notifications, purchase history, QR verify, details, vet records when available.

**Veterinarians:** Medical records, vaccinations, certificates, reports, visits, profile, badge, service requests, QR verify.

**Support:** Task-scoped permissions only.

**Permission philosophy:** Least privilege; backend validation; frontend not security.

**Immutable data:** Audit/security/registration/approval/permission/role/vaccination/vet/ownership/financial refs/important notifications/system events — classify Immutable / Versioned / Archived / Soft-deleted.

**Audit:** Who, when, where, what, previous, new, reason; non-editable.

**Employees:** Future internal staff with one identity; role-based permissions.

---

## E. UX strategy (draft)

Role-specific experiences. Dashboards answer “what today?”

Draft listed rich dashboards for breeder/broker/buyer/vet/CEO (reminders, AI, commissions, infrastructure monitoring, etc.).

Messaging as professional platform: private chats, share listings/animals/media/docs/cards/QR, typing, receipts, search, archive, mute, block, report, pins, system messages, possible groups; review storage/privacy/E2EE.

Notifications: intelligent events + preferences; future push/email/SMS/WhatsApp.

QR for livestock, members, vets, listings, cards, certificates, invitations, documents, farms, orgs; offline identify when feasible; online full verify; security review.

Membership cards: ID, QR, status, role, wilaya, dates; printable + PDF.

PDF system: cards, invitations, reports, certificates, receipts/invoices future.

Invitations role-specific with brand identity.

Media: images/videos/docs, compression, watermark, secure storage, limits.

Brand system consistency mandatory.

Education per role.

---

## F. Technical strategy (draft)

**Database:** Entities not pages; clear responsibility; relationships; scale; audit; performance; security; avoid duplication; normalize; denormalize only justified.

**Security:** Design principle; assume abuse; validate server-side; cover AuthZ, RLS, RPC, storage, uploads, API, rate limits, sessions, recovery, escalation, injection/XSS/CSRF, secrets, logging, monitoring, backup/recovery.

**Performance:** Indexes, queries, RPC, cache, pagination, lazy load, media optimization, jobs, CDN — measure don’t guess.

**Offline:** Weak connectivity workflows; sync + conflict rules; never compromise integrity.

**AI:** Only measurable value; price suggestions, reminders, recommendations, listing quality, duplicates, fraud, data quality, vet assist, knowledge — not marketing theater.

**API:** Versioning, docs, AuthZ, consistency, rate limits, errors, logging, future mobile/partners.

**Mobile:** Primary platform assumptions — simple, offline-aware, fast, low bandwidth, accessible, battery-aware.

**Testing:** Unit, integration, security, performance, a11y, mobile, regression, UAT.

**Documentation tree:** constitution, architecture, database, security, api, ui, ux, branding, business, testing, roadmap, features, decisions, risks, glossary.

**Business:** Memberships, verified accounts, analytics, subscriptions, vet services, marketplace services, ads, enterprise — never damage trust.

**Five-year roadmap:** Must/Should/Could/Future + versions 1–5 with value/deps/complexity/risks.

**Decision log & risk register & feature backlog & glossary:** Required living artifacts.

---

## G. Gap analysis instructions (draft)

Document missing areas with priority Critical/High/Medium/Low.  
Field research for breeders, brokers, buyers, vets, markets, technology.  
Founder-only decisions: vision, business model, brand, legal, marketplace policy, strategic UX, security policy, AI policy, roadmap priorities.  
Feature validation checklist; avoid creep, premature optimization, UI complexity, over-engineering.  
Risk analysis technical/business/security/operational across Year 1/3/5.  
Final report: reject / postpone / research / founder / risks / next actions / confidence / tags.

---

## H. Notes on duplicates in source draft

Source messages duplicated Section 4 (What should not be implemented) and Section 5 (Risk analysis) and final output blocks. Reconstruction keeps each once.

Section numbering in source was inconsistent (Section 3 Founder decisions appeared after Section 4/5 fragments). Reconstruction orders: Missing → Research → Founder → Reject → Risks.

---

## I. Disposition

| Draft element | Disposition in v2 Master Constitution |
|---------------|----------------------------------------|
| Ecosystem vision | Kept, tempered by honesty about current stage |
| Role model | Kept with broker caution |
| Rich chat | Rejected/postponed — tickets win |
| Dashboard language | Replaced by Smart Workspace (existing Founder doc) |
| All marketplaces peer | Sequenced |
| AI/QR/PDF/cards | Kept as governed long-term capabilities |
| Challenge assumptions | Kept as process law |
