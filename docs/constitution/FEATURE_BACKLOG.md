# MawashiDZ — Feature Backlog
**Canonical path:** `docs/constitution/FEATURE_BACKLOG.md`
**Last reviewed:** 2026-07-24

---

> Every feature must pass the validation checklist before being added to "Build".
> This document is reviewed before every major product release.

---

## Feature Validation Checklist

Before implementing any feature, answer these questions:

- Does it solve a real, documented problem?
- Who benefits, and how frequently?
- Can the same result be achieved with a simpler solution?
- Does it introduce unnecessary complexity?
- Does it increase maintenance cost beyond its value?
- Does it introduce security risks?
- Will users discover it without training?
- Can it be maintained for five years?

If most answers are unfavorable, the feature should not be implemented.

---

## MUST BUILD — Phase 1 (Now In Progress)

### B-001: Registration Review + Admin Operations
**Track A in roadmap.** RPCs for status change, audit log, admin and manager review queues.
- Validation: Directly enables the platform to operate. Without this, no one can be approved.
- Status: In progress

### B-002: Password Recovery
**Track B.** Email-based reset with strength rules and clear UX.
- Validation: Basic user expectation. Without it, locked-out users must contact support.
- Status: In progress

### B-003: Email Notifications
**Track C.** Transactional emails via Supabase Auth + Resend/Brevo.
- Validation: Users need to know when their registration is approved or rejected.
- Status: Not started

### B-004: Notification Inbox
**Track D.** Server-backed notification table with RLS per recipient.
- Validation: Required for all future operational communications.
- Status: Not started

### B-005: Support Ticket System
**Track E.** Typed requests, queue management, internal notes, audit.
- Validation: Platform cannot scale support without structured ticketing.
- Status: Not started

---

## MUST BUILD — Phase 2

### B-006: Animal / Livestock Data Model
Database tables for animals, herds, ownership. CRUD with full RLS.
- Validation: Without this, MawashiDZ cannot manage livestock — its core purpose.
- Priority: Highest Phase 2 item

### B-007: Supabase Storage Integration
Photo and document upload with RLS policies, compression, type validation.
- Validation: Listings and profiles require photos. No photos = no marketplace.

### B-008: Marketplace Listings (Basic)
Create, review, publish, search listings linked to animals.
- Validation: Core marketplace function.
- Requires: B-006, B-007

### B-009: Breeder Smart Workspace + Smart Hub P0–P1
Hub engine, top-4 cards, Today in your wilaya, offline cache.
- Validation: Creates daily return habits; differentiates from basic classified sites.

### B-010: Fix Market Price Attribution
Remove MADR attribution from simulated prices. Label as "indicative estimates."
- Validation: Legal and reputational risk mitigation. One-hour fix.
- Priority: **Immediate — before any public launch**

---

## MUST BUILD — Phase 3

### B-011: Veterinarian Profile and Credential Verification
Professional profile table, credential upload, admin verification flow, verified badge.
- Validation: Core to veterinary use case and health record trust.

### B-012: Animal Health Records and Vaccinations
Vaccination tracking, medical records, visit notes linked to animals.
- Validation: Differentiates MawashiDZ from basic classified sites.

### B-013: QR Identity System
QR generation for members, animals, and health certificates with cryptographic signing.
- Validation: Trust mechanism that is unique and differentiating.

### B-014: Membership Card (PDF)
Printable card with QR, member ID, role, wilaya, verification status.
- Validation: Physical credibility for members; trust signal at markets.

### B-015: Buyer Smart Workspace

### B-016: Veterinarian Smart Workspace

---

## DEFER — Phase 4+

### D-001: Feed Seller Marketplace
Product catalog, inventory, order management.
- Defer until: Livestock marketplace is proven and active.

### D-002: Broker / Ambassador Tools
Enhanced listing management, client tracking, commission tracking (future).
- Defer until: Founder defines role purpose (see FD-002).

### D-003: AI Assistant Card
Hub card for price suggestions, reminders, and recommendations.
- Defer until: 2+ years of real transaction data exists.

### D-004: Advanced Breeder Analytics
Herd performance, seasonal trends, profitability estimates.
- Defer until: Basic livestock management is established and used.

### D-005: Breeding Records
Parentage, birth history, lineage tracking.
- Defer until: Single animal management is proven.

### D-006: Equipment Marketplace
Farm tools, equipment rental and sale.
- Defer until: Core livestock marketplace proves model.

### D-007: Transportation Booking
Logistics for livestock delivery.
- Defer until: Marketplace has active listings and requires transport support.

### D-008: Native Mobile Application (iOS/Android)
- Defer until: PWA proves insufficient for user needs (check at Year 3).

### D-009: Government Data Integration
API connections to MADR or other government systems.
- Defer until: APIs become available and legally sanctioned.

### D-010: International Expansion
MENA region presence.
- Defer until: National Algeria coverage achieved (Year 4+).

---

## REJECT — Do Not Build

### X-001: In-Platform Payment Processing
**Reason:** Algerian fintech regulation is complex. Payment processing requires licensed financial entity. Cost and regulatory risk far exceeds benefit at current scale. Off-platform payment (cash, bank transfer) is the norm in the target market.

### X-002: Auction System
**Reason:** Complex fraud surface. Significantly increases moderation burden. Not validated by any field research. Would require dedicated legal framework.

### X-003: Social Feed / Public Posts
**Reason:** MawashiDZ is a business platform, not a social network. A social feed increases moderation burden without clear commercial value. It dilutes the brand.

### X-004: Follow / Subscribe Between Members
**Reason:** No business need identified. Creates social network expectations the platform should not encourage.

### X-005: Open-Ended Member-to-Member Chat
**Reason:** Without linking to a business transaction, this becomes a general messaging app. Moderation cost is unbounded. Creates harassment and spam vectors.

### X-006: Cryptocurrency Payments
**Reason:** No demonstrated user demand. Regulatory risk in Algeria. Technical complexity. Trust risk with conservative user base.

### X-007: Blockchain Animal Registry
**Reason:** A trusted PostgreSQL database with RLS achieves the same result with less complexity, lower cost, and better performance. Blockchain adds no measurable benefit here.

### X-008: AI Medical Diagnosis
**Reason:** Legal liability. Replaces professional veterinary judgment. Could cause harm to animals and financial harm to buyers who rely on incorrect AI advice.

### X-009: Live Video Streaming
**Reason:** Bandwidth assumptions wrong for rural Algerian users. High infrastructure and CDN cost. Not validated as needed. Short recorded video (max 30 seconds) is sufficient for livestock demonstration.

### X-010: Gamification / Points / Badges (Phase 1)
**Reason:** Premature. Adds complexity to core flows. May feel inappropriate to the professional agricultural audience. Revisit only after user research confirms appetite.

### X-011: User-Generated Articles / Blog
**Reason:** Content moderation burden is high. Platform focus is commerce and management. Educational content should be curated and editorially controlled, not user-generated.

### X-012: Real-Time Price Trading / Futures
**Reason:** Not a trading platform. This is a commercial registry and marketplace. Financial instrument features require licensed financial entity and regulatory approval.

### X-013: Geolocation Tracking of Animals
**Reason:** Requires GPS hardware investment from breeders. Insufficient user demand validated. Privacy concerns. Could be a Long-Term Idea for large commercial farms only.

---

*This backlog is reviewed and updated before every major product release.*
