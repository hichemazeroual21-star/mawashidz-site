# MawashiDZ Master Constitution
**Version 2.0 — Living Document**
**Canonical path:** `docs/constitution/CONSTITUTION.md`
**Effective date:** 2026-07-24
**Status:** Approved — supersedes draft Constitution v1.0

---

> **This document is the highest authority of MawashiDZ.**
> Every product decision, architecture choice, and implementation detail must be reconcilable with this Constitution.
> When a conflict exists between this document and any other document, this Constitution takes precedence unless explicitly superseded by a newer approved revision signed by the Founder.
>
> **This is a living document.** It must be reviewed and updated whenever architecture, business model, security policy, or legal environment changes materially.

---

## Table of Contents

1. [What is MawashiDZ?](#1-what-is-mawashidz)
2. [Verified Facts: Current Technical State](#2-verified-facts-current-technical-state)
3. [Platform Roles and Governance](#3-platform-roles-and-governance)
4. [Database Architecture](#4-database-architecture)
5. [Authentication and Authorization](#5-authentication-and-authorization)
6. [Smart Workspace Architecture](#6-smart-workspace-architecture)
7. [Marketplace Architecture](#7-marketplace-architecture)
8. [Messaging and Support](#8-messaging-and-support)
9. [Notification System](#9-notification-system)
10. [QR Ecosystem](#10-qr-ecosystem)
11. [Livestock Management](#11-livestock-management)
12. [Veterinary Workflows](#12-veterinary-workflows)
13. [Media and Storage](#13-media-and-storage)
14. [Security Architecture](#14-security-architecture)
15. [Performance Strategy](#15-performance-strategy)
16. [Offline Strategy](#16-offline-strategy)
17. [Localization and Accessibility](#17-localization-and-accessibility)
18. [AI Strategy](#18-ai-strategy)
19. [Business Strategy](#19-business-strategy)
20. [Gap Analysis](#20-gap-analysis)
21. [Risk Register](#21-risk-register)
22. [Feature Backlog: Build, Defer, Reject](#22-feature-backlog-build-defer-reject)
23. [Founder Decisions Required](#23-founder-decisions-required)
24. [Five-Year Roadmap](#24-five-year-roadmap)
25. [Testing Standards](#25-testing-standards)
26. [Documentation and Decision Records](#26-documentation-and-decision-records)
27. [Glossary](#27-glossary)

---

## Classification Legend

Throughout this document, every statement belongs to one of these categories:

| Symbol | Category | Meaning |
|--------|----------|---------|
| ✅ | **VERIFIED FACT** | Confirmed by code, documentation, or trusted source |
| ⚠️ | **ASSUMPTION** | Believed to be true but not yet verified by field research |
| 💡 | **RECOMMENDATION** | Suggested improvement based on technical or product analysis |
| 🔮 | **LONG-TERM IDEA** | Should not be implemented immediately; revisit in future |
| 🚩 | **RISK** | Identified risk requiring mitigation |
| ❌ | **REJECTION** | Should not be implemented; reason provided |

---

## 1. What is MawashiDZ?

### 1.1 Mission Statement

MawashiDZ is Algeria's national digital ecosystem for livestock management and livestock commerce.

It is not simply a marketplace. It is not simply a website. It is a trusted, structured platform that connects:

- **Breeders** — who raise, manage, and sell livestock
- **Veterinarians** — who provide professional health services
- **Feed sellers** — who supply nutrition and farming inputs
- **Buyers** — who purchase livestock for consumption or rearing
- **Wilaya managers** — who supervise regional platform activity
- **Administrators and the Founder** — who govern the platform nationally

### 1.2 Core Values (Non-Negotiable)

These values must never be compromised regardless of commercial pressure:

1. **Trust first** — every feature must increase user trust, never erode it
2. **Security before convenience** — never prioritize speed of use over safety
3. **Simplicity over complexity** — if a simpler solution exists, use it
4. **Research before assumptions** — validate with users before building
5. **Transparency** — users should always know where they stand
6. **Algerian context** — design for Algerian users, connectivity, and culture
7. **Maintainability** — every decision must be sustainable for five years

### 1.3 Definition of Success

The platform has succeeded when:

- A breeder in any Algerian wilaya can register, list livestock, and complete a sale without needing offline assistance
- A buyer can verify an animal's health history before purchasing
- A veterinarian can maintain digital records and be discoverable by farmers in their region
- A wilaya manager can review and approve registrations with confidence
- The Founder can observe platform health, security, and growth from a single operational workspace

---

## 2. Verified Facts: Current Technical State

> This section documents what the codebase **actually contains** as of the analysis date (2026-07-24). It does not document aspirations.

### 2.1 Technology Stack

✅ **Frontend:** Single Page Application (SPA) — vanilla HTML, CSS, JavaScript (no frontend framework)
✅ **Backend:** Supabase (PostgreSQL + PostgREST + Auth + Row Level Security)
✅ **Serverless functions:** Netlify Functions (Node.js ESM)
✅ **Deployment:** GitHub Pages (static) + Netlify (functions)
✅ **Version:** v1.9.0 / v1.10.0 in active development
✅ **Languages supported:** Arabic (AR), English (EN), French (FR), German (DE)
✅ **RTL/LTR:** Arabic is RTL; other languages are LTR
✅ **Algeria geography data:** 58 wilayas, 548 dairas, 1541 communes (from official source)

### 2.2 Database Tables (Existing)

✅ `public.profiles` — member identity and status
✅ `public.registrations` — pre-auth registration form submissions
✅ `public.user_roles` — role assignments per user
✅ `public.member_id_counters` — sequential ID allocation
✅ `public.contact_messages` — contact and support form submissions
✅ `public.feedback_tickets` — feedback and reporting

### 2.3 Database Tables (Not Yet Implemented)

🚩 **Missing:** `livestock` / `animals` — no animal data model exists
🚩 **Missing:** `herds` — no herd management
🚩 **Missing:** `vaccinations` — no vaccination records
🚩 **Missing:** `medical_records` — no veterinary records
🚩 **Missing:** `listings` / `marketplace_listings` — no marketplace
🚩 **Missing:** `messages` / `tickets` — no messaging tables
🚩 **Missing:** `notifications` — no notification inbox
🚩 **Missing:** `qr_codes` / `qr_objects` — no QR system
🚩 **Missing:** `hub_cards`, `hub_engagement_events` — Hub not yet built
🚩 **Missing:** `admin_audit_log` — referenced in code, migration 008 not yet visible in repo

### 2.4 Member ID System

✅ Format: `MDZ-[prefix]-[000001]` (six-digit zero-padded)
✅ Prefixes: F (breeder), V (vet), S (feed seller), U (buyer), W (manager), B (ambassador), P (partner)
✅ Allocated exclusively by `service_role` via BEFORE INSERT trigger
✅ Advisory locking for concurrency safety
✅ Login supports: email, Algerian phone number, or member ID

### 2.5 Member Roles (In Code)

✅ `breeder` (F) — livestock owner and seller
✅ `vet` (V) — veterinarian
✅ `feed` (S) — feed seller (صاحب أعلاف)
✅ `buyer` (U) — livestock buyer
✅ `manager` (W) — wilaya manager
✅ `ambassador` (B) — platform ambassador
✅ `partner` (P) — business partner

⚠️ **Assumption:** the `ambassador` and `partner` roles are placeholders with no defined permissions or workflows. Their scope has not been documented anywhere in the codebase.

### 2.6 Market Price Engine

✅ The current market price display is **algorithmically simulated** using hash functions and base prices
⚠️ **Critical:** Prices are attributed to `وزارة الفلاحة` (Ministry of Agriculture) but are **not real data from that source**
🚩 **Risk:** Displaying simulated data attributed to a government source is legally and reputationally dangerous
💡 **Recommendation:** Either clearly label prices as "estimated reference" or establish a verified data feed. Remove the `madr.gov.dz` attribution until data is genuinely sourced from there.

### 2.7 Code Duplication

✅ `assets/market-engine.js` and `netlify/functions/market-core.mjs` contain **identical logic** with different variable name prefixes
💡 **Recommendation:** Extract to a single shared module. This is maintenance debt.

### 2.8 Current Registration Flow

✅ Anonymous users can submit a registration form (anon insert to `registrations` table)
✅ Registration creates both an auth user AND a profile row via database triggers
✅ Member ID is assigned server-side before signup completes
✅ Duplicate detection for email, phone, and member conflicts
✅ Submission guarded against double-click
✅ Arabic error messages for Algerian phone normalization edge cases

### 2.9 RLS Coverage

✅ `profiles` — RLS enabled; authenticated users read own row only
✅ `registrations` — RLS enabled; anon/authenticated can insert; managers read wilaya-scoped; admins read all
✅ `user_roles` — RLS enabled; authenticated users read own roles only
✅ `member_id_counters` — RLS enabled; no public policies; locked to service_role
✅ `contact_messages`, `feedback_tickets` — RLS enabled; public insert only

🚩 **Gap:** There are no UPDATE or DELETE policies defined on most tables. All mutations must go through RPCs or the Supabase Dashboard (service_role). This is intentional but must be explicitly documented.

---

## 3. Platform Roles and Governance

### 3.1 Role Hierarchy

The platform operates on a strict rank order. A member at a lower rank must **never** be able to access data, operations, or interfaces belonging to a higher rank.

| Rank | Identity | Roles | Workspace |
|------|----------|-------|-----------|
| R1 | Member | `breeder`, `vet`, `feed`, `buyer`, `ambassador`, `partner` | Role-specific Smart Workspace |
| R2 | Wilaya Manager | `manager` | Wilaya-scoped Smart Workspace |
| R3 | Platform Admin | `admin` | National Smart Workspace (limited) |
| R4 | Founder / Super | `founder`, `super_admin` | Full platform control |

### 3.2 Founder (R4)

The Founder is the permanent highest authority of MawashiDZ.

Capabilities:
- Complete platform supervision and configuration
- All administrative capabilities
- Role assignment and revocation
- Security policy management
- Emergency platform controls
- Feature approval and roadmap authority
- Audit log access (full)
- Revenue and financial dashboards (future)

💡 **Recommendation:** The Founder should have a designated "CEO Mode" in the workspace — a distinct visual indicator that confirms the account is operating with full authority. This prevents confusion between Founder testing and normal use.

### 3.3 Platform Administrators (R3)

Administrators assist the Founder with day-to-day operations.

✅ **Principle:** Administrators must not automatically receive every permission. Permissions should be individually assigned per administrator account.

Permissible capabilities (assigned individually):
- Registration review (national queue)
- User management
- Content moderation
- Veterinary verification
- Marketplace moderation
- Support queue management
- Announcements (national)

Forbidden:
- Modifying Founder account
- Changing core platform security settings
- Accessing financial reports (unless explicitly granted)
- Permanently deleting audit records

### 3.4 Wilaya Managers (R2)

There are 58 wilaya managers — one per Algerian wilaya.

✅ **Wilaya Fence (Non-Negotiable):** Every wilaya manager sees **only** data from their assigned wilaya. This is enforced by RLS. It must never be bypassed, not even temporarily.

Permissible:
- Approve/reject/request-info on registrations within their wilaya
- Review listings within their wilaya
- Temporarily suspend members within their wilaya
- Manage reports from their wilaya
- Publish approved local announcements
- Generate wilaya-level reports
- Escalate sensitive cases to R3/R4

Forbidden:
- Viewing data from other wilayas
- Modifying platform-wide configuration
- Assigning roles above R1
- Deleting audit records
- Publishing national alerts without R3/R4 approval

### 3.5 Members (R1)

#### Breeders
The breeder is the primary user of MawashiDZ. Every platform decision should first ask: "Does this serve the breeder?"

Core needs: register livestock, maintain health records, list animals for sale, communicate with buyers and veterinarians.

#### Veterinarians
Professional service providers. Their credentials must be verified before they can issue health certificates or appear in search results.

Core needs: maintain a professional profile, record animal visits, issue health documents, be discoverable by breeders.

#### Feed Sellers
Local businesses supplying nutrition products. They need a simple product catalog and order management.

#### Buyers
Often seasonal users. They prioritize simplicity: search, compare, verify, contact.

#### Ambassadors and Partners
⚠️ **Assumption:** These roles are technical placeholders. No product requirements have been defined for them.
💡 **Recommendation:** The Founder must define the purpose of `ambassador` and `partner` roles before they are used in production. Until defined, they should be hidden from the public registration form.

### 3.6 Permission Philosophy

**Least Privilege Everywhere.** Every permission must answer: "Why does this role need this capability?"

If no answer exists, the permission must not exist.

Frontend restrictions are **not** security. Every permission must be enforced server-side through RLS, RPC, or authenticated API validation.

### 3.7 Immutable Data Policy

The following data must **never** be permanently deleted:

| Data | Reason |
|------|--------|
| Audit logs | Legal accountability |
| Security event logs | Forensics and incident response |
| Registration history | Appeal and dispute resolution |
| Approval/rejection decisions | Audit trail |
| Vaccination records | Animal health continuity |
| Veterinary records | Health accountability |
| Livestock ownership transfers | Commercial legal record |
| Notification history | Communication accountability |

Acceptable operations: **soft delete**, **archive**, **versioning**. Never hard delete critical records.

---

## 4. Database Architecture

### 4.1 Design Philosophy

The database must be designed around **business entities**, not around pages.

Every table must have:
- A clear, single responsibility
- Proper relationships with foreign keys
- Audit timestamps (`created_at`, `updated_at` where applicable)
- RLS enabled (no exceptions)
- Documented access policies

### 4.2 Existing Schema: Verified

See [Section 2.2](#22-database-tables-existing) for confirmed tables.

### 4.3 Required Future Tables

The following tables are **required** before marketplace or livestock features can launch. Their absence is the largest current technical gap.

#### Animal / Livestock

```sql
-- Core animal identity
animals (
  id uuid PK,
  owner_id uuid FK → profiles.id,
  species text,          -- sheep, cattle, goat, camel, horse
  breed text,
  gender text,
  birth_date date,
  identification_method text, -- ear_tag, microchip, brand, none
  identification_number text,
  weight_kg numeric,
  wilaya text,
  commune text,
  notes text,
  status text,           -- active, sold, deceased, transferred
  created_at timestamptz,
  updated_at timestamptz
)
```

#### Health Records

```sql
vaccinations (
  id uuid PK,
  animal_id uuid FK → animals.id,
  vaccine_name text,
  administered_by uuid FK → profiles.id,  -- vet
  administered_date date,
  next_due_date date,
  batch_number text,
  notes text,
  created_at timestamptz
)

medical_records (
  id uuid PK,
  animal_id uuid FK → animals.id,
  vet_id uuid FK → profiles.id,
  visit_date date,
  diagnosis text,
  treatment text,
  prescription text,
  follow_up_date date,
  created_at timestamptz
)
```

#### Marketplace

```sql
listings (
  id uuid PK,
  seller_id uuid FK → profiles.id,
  animal_id uuid FK → animals.id,  -- nullable for non-animal listings
  title text,
  description text,
  price numeric,
  price_negotiable boolean,
  quantity int,
  wilaya text,
  commune text,
  delivery_available boolean,
  status text,  -- draft, pending_review, active, sold, expired, rejected
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz
)
```

#### Notifications and Messaging

```sql
notifications (
  id uuid PK,
  recipient_id uuid FK → profiles.id,
  type text,
  title text,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz
)

support_tickets (
  id uuid PK,
  requester_id uuid FK → profiles.id,
  assigned_to uuid FK → profiles.id,
  type text,
  subject text,
  status text,
  priority text,
  wilaya text,
  linked_registration_id text,
  linked_animal_id uuid,
  linked_listing_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)

ticket_messages (
  id uuid PK,
  ticket_id uuid FK → support_tickets.id,
  author_id uuid FK → profiles.id,
  body text,
  is_internal_note boolean default false,
  created_at timestamptz
)
```

### 4.4 Naming Conventions

- Table names: **lowercase plural snake_case** (`animal_vaccinations`, not `AnimalVaccinations`)
- Column names: **lowercase snake_case**
- Primary keys: `id uuid default gen_random_uuid()`
- Timestamps: always `timestamptz`, never `timestamp` (timezone-aware)
- Soft delete: use `deleted_at timestamptz` or `archived_at timestamptz`
- Status columns: always `text` with a documented set of allowed values (consider `CHECK` constraints)

### 4.5 Indexing Strategy

Every foreign key must be indexed. Additionally index:
- `profiles.phone` — for login resolution
- `profiles.email` (case-insensitive) — for login resolution
- `profiles.member_id` — unique partial index (already implemented)
- `profiles.wilaya` — for wilaya-scoped queries
- `listings.status` — for marketplace queries
- `listings.wilaya` — for location-based filtering
- `animals.owner_id` — for breeder's herd view
- `notifications.recipient_id` — for inbox queries
- `notifications.read_at` IS NULL — for unread count queries

### 4.6 Phone Number Storage

✅ Algerian phone numbers are normalized to `+213XXXXXXXXX` format before storage.
💡 **Recommendation:** Add a `CHECK` constraint to enforce the `+213` prefix format in the `profiles.phone` column. Currently, only application-layer normalization exists.

### 4.7 Data Integrity Gaps

🚩 `registrations` has `UNIQUE (email)` and `UNIQUE (phone)` but `profiles` has no phone uniqueness constraint. A user could theoretically create multiple accounts with the same phone if they bypass the registration flow.

💡 **Recommendation:** Add `UNIQUE (phone)` to `profiles` where phone is not null, enforced as a partial unique index (matching the existing `member_id` pattern).

---

## 5. Authentication and Authorization

### 5.1 Authentication Methods

✅ **Email/password** via Supabase Auth
✅ **Login identifier resolution:** email, Algerian phone number, or member ID (all normalized server-side)
✅ **Email confirmation** required before account activation

💡 **Recommendation:** Document the session expiration policy. Supabase defaults to 1 hour access token + 60-day refresh token. For a platform handling livestock transactions, shorter inactivity timeouts on sensitive admin actions should be considered.

### 5.2 Password Policy

🚩 **Critical Gap:** No documented password policy exists. The registration flow does not enforce minimum length, complexity, or common password blocking.

💡 **Recommendation — Password Minimum Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number or symbol
- Block the 100 most common passwords (client + server validation)

### 5.3 Account Recovery

✅ Password recovery via email link is implemented (Supabase native flow).
✅ Non-enumerating recovery messaging (does not reveal whether email exists).

🚩 **Gap:** What happens when a user loses access to their email AND cannot remember their member ID? There is no documented alternative recovery path.

💡 **Recommendation:** Define an identity verification process for account recovery via phone or in-person verification through a wilaya manager. Document as a supported workflow.

### 5.4 Authorization (RLS)

✅ RLS is enabled on all existing tables.
✅ The wilaya fence is enforced by joining `user_roles` with `profiles.wilaya` in RLS policies.
✅ Sensitive mutations are routed through `service_role` or RPCs.

🚩 **Risk:** The manager wilaya fence depends on `profiles.wilaya` matching `registrations.wilaya`. If a member moves wilayas and their profile is updated, historical registrations from the old wilaya may become inaccessible to the new wilaya manager. This edge case is not handled.

💡 **Recommendation:** Wilaya assignment for managers should reference a dedicated `wilaya_manager_assignments` table, not `profiles.wilaya`. A manager's operational wilaya should be independent from their personal location.

### 5.5 Session Management

⚠️ **Assumption:** The platform uses Supabase's default token refresh behavior. No custom session management exists in the codebase.

💡 **Recommendation:** Implement:
- Auto-logout after inactivity for admin and manager sessions (configurable, suggested 30 minutes)
- Multi-tab session synchronization (detect logout in other tabs)
- "Sessions" view in the security tab so users can see active sessions

### 5.6 Brute Force Protection

⚠️ **Assumption:** Supabase provides some built-in protection. No custom rate limiting or IP blocking is implemented at the application layer.

💡 **Recommendation:** Document the Supabase Auth rate limits and test them. Consider adding Cloudflare or Netlify rate limiting at the edge for the registration endpoint.

---

## 6. Smart Workspace Architecture

> This section summarizes and validates the existing `PRODUCT_CONSTITUTION.md v1.4`.

### 6.1 Core Principle

✅ **Confirmed from `docs/product/PRODUCT_CONSTITUTION.md`:** The member profile is the **primary daily operational workspace**, not a settings page or passive dashboard.

### 6.2 Five Pillars

Every workspace must deliver:
1. Daily insights (Hub cards, context, relevant alerts)
2. Operational management (listings, requests, cases, inventory)
3. Quick actions (create, approve, message, publish)
4. Statistics and performance (views, completions, regional activity)
5. Notifications and workflow (unified inbox + tasks)

### 6.3 Role Workspaces

| Workspace | Primary Daily Actions |
|-----------|----------------------|
| Breeder | Manage herd, list animals, respond to buyers |
| Veterinarian | Record visits, issue certificates, manage calendar |
| Feed Seller | Manage products, process orders, track inventory |
| Buyer | Search, save, compare, contact sellers |
| Wilaya Manager | Review registrations, moderate listings, handle reports |
| Founder/Admin | Platform health, security, analytics, governance |

### 6.4 Smart Hub

✅ **Confirmed:** Hub is a modular card framework inside the workspace. It is **not** a separate product or page.

Every future service (insurance, transport, equipment, labs) must register as a **Card Provider**. No new top-level page should be created for each new service.

### 6.5 Architecture Rule: No Card → SQL

No card may execute SQL directly. The chain is:

```
Card (UI) → Card Provider → Service Layer → RPC/API → Database (RLS)
```

This rule is **non-negotiable** and must be enforced in code reviews.

### 6.6 Empty States

Empty workspaces must never be blank. Each empty state shows exactly one next action.

### 6.7 Phasing (Confirmed)

P0 → P1 (Hub, breeder-first) → P2 (notifications, search) → P3 (listing workspace) → P4 (vet, buyer, feed workspaces) → P5 (ingest) → P6 (analytics) → P7 (AI assistant)

This phases after the completion of Member Operations & Communication (Phase 1 in the roadmap).

---

## 7. Marketplace Architecture

> This section documents what does NOT yet exist and what must be built.

### 7.1 Current State

🚩 **No marketplace exists.** There are no listing tables, no search API, no purchase request flow, no seller tools.

### 7.2 Design Principles

1. **Listings are attached to verified profiles.** Anonymous listings are not permitted.
2. **Animals can be linked to listings.** A listing references an animal record when one exists, creating a chain: owner → animal → health records → listing.
3. **Moderation before visibility.** New listings enter `pending_review` status and require approval before public display. Exception: sellers with a verified "Trusted Breeder" status may auto-publish (future).
4. **No financial transactions inside the platform in v1.** MawashiDZ facilitates connection; it does not process payments. Payments happen off-platform. This is important for legal and regulatory simplicity.
5. **Price display is always in Algerian Dinar (DZD).**

### 7.3 Listing Lifecycle

```
Draft → Pending Review → Active → [Sold | Expired | Rejected | Archived]
                                        ↑
                                  Seller marks sold
                                  or buyer request confirmed
```

### 7.4 Marketplace Moderation

Before launch, the Founder must define:
- What listing types are permitted
- What listing types are prohibited
- Whether imported animals require different treatment
- Whether veterinary certification is required for certain species/types
- Maximum listing duration (suggested: 60 days)
- Maximum photo count per listing (suggested: 10)
- Maximum video count per listing (suggested: 1, max 30 seconds)

### 7.5 Broker Role Clarification

⚠️ **Assumption:** In Algerian livestock culture, a broker ("سمسار") facilitates transactions between sellers and buyers, typically taking a commission. The `ambassador` role in the current codebase does not clearly map to this function.

💡 **Recommendation:** The Founder must decide whether brokers receive a distinct role or whether brokers are simply breeders with enhanced listing capabilities. Do not create a role unless a distinct workflow justifies it.

### 7.6 What NOT to Build in Marketplace v1

❌ **In-platform payment processing** — regulatory complexity, legal risk, not justified yet
❌ **Auction system** — complex, not validated by user research
❌ **Animal transportation booking** — build after marketplace is proven
❌ **Insurance marketplace** — long-term idea only
❌ **Price negotiation chat** — messaging v1 is support-focused, not commerce chat
❌ **Delivery tracking** — not in scope for v1

---

## 8. Messaging and Support

> This section validates and extends `SUPPORT_AND_MESSAGES_CENTER.md`.

### 8.1 Confirmed Architecture

✅ **MawashiDZ is not a chat application.** Messaging is structured around **tickets** with **business context** (registration, listing, animal, vet case).

✅ Ticket lifecycle: `open → in_review → waiting_for_member → escalated → closed`

✅ Internal notes are staff-only and must never be visible to members.

### 8.2 Message Types (Phased)

**Phase 1 (now):**
- Member → Platform support
- Member → Wilaya manager (membership and listing issues)

**Phase 2 (after marketplace):**
- Member → Member (only when linked to a listing, purchase request, or vet case)

**Phase 3 (future):**
- Broadcast messages from wilaya managers to their wilaya
- National announcements from the Founder

### 8.3 Hard Restrictions (Non-Negotiable)

- No open-ended DM between unrelated members
- No message hard-delete (archive only)
- No read receipts without explicit consent in phase 1
- No end-to-end encryption in phase 1 (standard transport encryption sufficient; platform may need audit access)
- No voice or video messages in phase 1

### 8.4 Encryption Position

💡 **Recommendation:** For phase 1, HTTPS transport encryption (TLS) and encrypted database storage are sufficient. Full end-to-end encryption (E2EE) where platform operators cannot read messages would complicate moderation and legal compliance in Algeria. This decision must be reviewed with legal counsel before phase 3 (member-to-member messaging).

### 8.5 Missing Requirements

🚩 **Message retention policy not defined.** How long are closed tickets stored? Recommended: 7 years for legal safety.

🚩 **Spam protection not defined.** What prevents a bad actor from flooding the support system?

💡 **Recommendation:** Rate-limit ticket creation per user per day. Suggested: maximum 5 new tickets per 24 hours per member.

---

## 9. Notification System

### 9.1 Design Principles

Notifications must be **useful**, not noisy. Every notification must have a clear call to action and deep-link to the relevant workspace section.

### 9.2 Notification Types

| Type | Trigger | Priority |
|------|---------|----------|
| Registration approved/rejected | Admin/manager action | Critical |
| New message/ticket reply | Messaging | High |
| Listing status changed | Marketplace action | High |
| Purchase request received | Marketplace | High |
| Vaccination due | Animal health calendar | Medium |
| Medical follow-up due | Animal health calendar | Medium |
| Listing expiring soon | Marketplace timer | Medium |
| New buyer interested in listing | Marketplace signal | Medium |
| Price alert triggered | Marketplace | Low |
| Educational content | Platform | Low |
| Platform announcements | Admin | Variable |

### 9.3 Technical Architecture

- Notifications must be **server-backed** (database table with RLS)
- Client does NOT maintain a local-only notification state
- Badge counts are derived from unread notifications in the database
- A member can only read their own notifications (RLS enforced)
- Notification payloads must contain enough context to avoid extra API calls for rendering

### 9.4 Delivery Channels (Phased)

| Channel | Phase | Notes |
|---------|-------|-------|
| In-app (workspace inbox) | Phase 1 | Required now |
| Email | Phase 1 | Via Supabase Auth + Resend/Brevo |
| Browser push (PWA) | Phase 2 | After Service Worker implementation |
| SMS | Phase 3 | Via Algerian SMS gateway; requires business registration |
| WhatsApp | Phase 4 | Only if justified by user research |

### 9.5 User Preferences

Members must be able to:
- Disable specific notification types
- Choose delivery channel preferences
- Set quiet hours

This requires a `notification_preferences` table or jsonb column on `profiles`.

---

## 10. QR Ecosystem

### 10.1 Vision

QR codes become the digital identity layer of MawashiDZ. Every verified entity receives a QR that can be scanned to retrieve its verified record.

### 10.2 QR-Enabled Entities

| Entity | QR Purpose |
|--------|------------|
| Member | Verify identity, role, membership status |
| Animal | View health records, ownership, vaccination history |
| Listing | Verify listing details, seller identity |
| Veterinarian | Verify credentials and practice area |
| Membership card | Professional identity document |
| Health certificate | Veterinary document verification |

### 10.3 QR Security Architecture

QR codes must not contain sensitive data directly. They should encode a short signed token that:
1. Identifies the entity type and ID
2. Contains a timestamp (expiry)
3. Is cryptographically signed to prevent forgery

When scanned, the token is verified against the database to retrieve current data. This ensures:
- Revoked entities show as invalid even if QR has been printed
- QR forgery attempts fail (invalid signature)
- Old printed QRs can be invalidated by the platform

### 10.4 Offline QR Reading

⚠️ **Assumption:** The ability to verify QR codes without internet connectivity requires either embedded signed data or locally cached records.

💡 **Recommendation:** For offline verification of membership identity (not health records), embed a minimal signed payload in the QR (member ID, name, role, status, expiry, signature). Full records require connectivity. Define which fields are embedded vs fetched.

### 10.5 What NOT to Do with QR

❌ Do not embed private medical data in QR codes
❌ Do not create QRs without expiry
❌ Do not make QRs permanent without a revocation mechanism
❌ Do not use QR as a payment mechanism in v1

---

## 11. Livestock Management

### 11.1 Current State

🚩 **No livestock management exists in the database or frontend.** This is the largest product gap.

### 11.2 Animal Identification in Algeria

⚠️ **Field Research Required:** Before building the identification system, research must determine:
- What identification methods are currently used by Algerian breeders (ear tags, brands, microchips)
- Whether national livestock identification standards exist (MADR regulations)
- What percentage of breeders maintain written records
- Whether inter-wilaya transfer documentation exists and is enforced

### 11.3 Species Coverage

Initially support:
- Sheep (أغنام) — most common
- Cattle (أبقار)
- Goats (ماعز)
- Camels (إبل) — especially southern wilayas

Later:
- Horses (خيول)
- Rabbits (أرانب) — optional
- Poultry (دواجن) — consider separate product (very different management)

### 11.4 Animal Lifecycle

```
Registration
    ↓
Active in herd
    ↓
    ├── Vaccination records
    ├── Medical records
    ├── Weight tracking
    ├── Breeding records (future)
    │
    ├── Listed for sale → Marketplace listing
    │        ↓
    │   Sold → Ownership transfer → New owner profile
    │
    ├── Death → Marked deceased (record preserved)
    │
    └── Slaughter → Marked slaughtered (record preserved)
```

### 11.5 Ownership Transfer

When an animal is sold:
1. A transfer record is created (seller ID, buyer ID, date, price if shared, listing reference)
2. The animal's `owner_id` is updated
3. The listing is marked as sold
4. Both seller and buyer receive notification
5. Transfer history is immutable

### 11.6 Herd Management

A herd is a named group of animals belonging to one owner in one location. It simplifies bulk operations:
- Bulk vaccination records
- Bulk listing
- Aggregate health overview

This is a Phase 3+ feature. Do not design it until single-animal management is proven.

---

## 12. Veterinary Workflows

### 12.1 Veterinarian Verification

Before a veterinarian account gains professional capabilities:
1. They must submit professional credentials (license number, issue date, issuing authority)
2. A wilaya manager or admin must verify and approve
3. Only after approval can they appear in search results or issue health certificates

🚩 **Gap:** The verification document upload system does not exist yet. The `profiles` table has no field for professional credentials.

💡 **Recommendation:** Add a `vet_profile` table (or expand `profiles` with a jsonb `professional_info` column) to store: license number, license issuer, practice address, service area wilayas, specializations, clinic hours.

### 12.2 Health Certificates

A health certificate is an official document issued by a veterinarian attesting to an animal's health status at a specific point in time.

Requirements for issue:
- Vet must be verified
- Animal must exist in the system
- Certificate must include: animal ID, vet credentials, date of examination, findings, validity period, QR for verification

🔮 **Long-Term:** Integration with MADR's national veterinary systems if they become available via official API.

### 12.3 Professional Liability Disclaimer

💡 **Recommendation (Legal):** Before veterinarians can issue digitally visible health statements, legal review is required. The platform must include a clear disclaimer that health records on MawashiDZ are not a substitute for official veterinary certification unless explicitly stamped and licensed.

This is a **Founder Decision** requiring legal counsel input.

---

## 13. Media and Storage

### 13.1 Current State

🚩 **No media upload system exists.** No Supabase Storage buckets are configured in the codebase.

### 13.2 Media Strategy

| Media Type | Use Case | Max Size | Format |
|-----------|----------|----------|--------|
| Animal photo | Listing, animal profile | 5 MB | JPG, PNG, WebP |
| Animal video | Listing demonstration | 30 MB, max 30 seconds | MP4 |
| Profile photo | Member card | 2 MB | JPG, PNG |
| Document | Credential upload | 10 MB | PDF, JPG |
| Certificate PDF | Health certificate | 5 MB | PDF |

### 13.3 Security Requirements

- All uploads must be authenticated (no anonymous uploads)
- File type validation must happen server-side (not only client MIME check)
- Uploaded files must be scanned for malicious content before serving
- Storage access rules must be enforced via Supabase Storage RLS
- Presigned URLs should have short expiry (max 1 hour for documents)

### 13.4 Optimization

- Images must be compressed and resized server-side before storage (or using Supabase image transformation)
- Thumbnail generation required for listing grid views
- Videos should not be served directly from storage in production (CDN required)

### 13.5 Watermarking

💡 **Recommendation:** Listing photos should have a subtle MawashiDZ watermark applied automatically. This:
- Prevents photo theft between competing platforms
- Provides visual brand reinforcement
- Is reversible (can be disabled per listing type)

This is a Phase 3 feature, not Phase 1.

### 13.6 Retention Policy

🚩 **Not defined.** How long are uploaded files retained after an account is deleted or a listing expires?

💡 **Recommendation:** Define retention tiers:
- Active listing media: retained while listing is active + 90 days after expiry
- Animal health documents: retained for the lifetime of the animal record
- Deleted account media: 30-day grace period, then deletion
- Certificates: retained indefinitely (legal requirement)

---

## 14. Security Architecture

### 14.1 Security Principles

Security is a **design principle**, not an afterthought. These principles are non-negotiable:

1. Never trust the frontend
2. Validate everything server-side
3. Principle of least privilege on all roles
4. Defense in depth (multiple layers)
5. Assume breach posture (design for attacker presence)

### 14.2 Current Security Strengths

✅ Member ID allocation locked to `service_role` (ADR 001)
✅ `allocate_member_id` RPC not executable by `anon` or `authenticated`
✅ RLS enabled on all tables
✅ Wilaya fence enforced server-side, not only in UI
✅ Non-enumerating login/recovery (does not reveal which identifier exists)
✅ Advisory locking for concurrent ID allocation
✅ Phone normalization prevents format-variation bypasses

### 14.3 Known Security Gaps

🚩 **No rate limiting** on registration form submissions beyond Supabase email throttle
🚩 **No password strength policy** enforced at registration
🚩 **No content security policy (CSP)** headers defined
🚩 **No subresource integrity (SRI)** on external script loads
🚩 **No automated secret scanning** in CI/CD
🚩 **No input sanitization audit** — `escapeHtml()` exists but coverage is not verified
🚩 **Simulated market prices attributed to government source** — potential regulatory issue

### 14.4 API Security

All sensitive database operations should follow this pattern:

```
Client (authenticated) → RPC (SECURITY DEFINER) → Database (RLS applied before RPC)
```

❌ Never: `Client → Direct table PATCH via PostgREST`

The following operations **must** be RPCs, never direct REST:
- Status changes on registrations or profiles
- Role assignments
- Member ID allocation
- Any action affecting another user's data

### 14.5 Secrets Management

✅ Supabase API keys are in environment variables.

🚩 **Risk:** If `VITE_SUPABASE_KEY` or `SUPABASE_ANON_KEY` is committed to version history, it represents a security incident even if the key has been rotated.

💡 **Recommendation:** Run a one-time git history audit to confirm no secrets were committed. Use `git-secrets` or `truffleHog` as a pre-commit hook.

### 14.6 Fake Veterinarians

🚩 **Risk:** Without a verification process, anyone can register as a veterinarian and falsely certify animal health.

💡 **Mitigation:**
- Veterinarian accounts must be verified before professional capabilities activate
- The verification badge must be visually prominent and machine-verifiable via QR
- Fake veterinarian reports should be investigated and result in permanent account ban
- Consider requiring a national professional order license number (ONVAF — l'Ordre National des Vétérinaires Algériens)

### 14.7 QR Forgery

🚩 **Risk:** Someone prints a QR for an animal and attaches it to a different animal, or creates a fake QR entirely.

💡 **Mitigation:** All QRs must contain a cryptographic signature. Verification fails if the signature is invalid. QR tokens must have short validity periods (24 hours for purchase verification; longer for membership cards).

### 14.8 Fake Listings

🚩 **Risk:** Users post animals they do not own, using photos from the internet.

💡 **Mitigation (phased):**
- Phase 1: Require phone verification before listing
- Phase 2: Link listings to registered animals (ownership chain)
- Phase 3: Photo metadata analysis (location, date); reverse image search alerts
- Phase 4: Trusted Breeder status auto-publishes; new sellers require moderation

---

## 15. Performance Strategy

### 15.1 Current Architecture Performance Profile

✅ Static HTML/CSS/JS — fast initial load (no framework overhead)
✅ Lazy loading patterns documented in Smart Hub architecture
✅ Top-4 card limit on Hub open

🚩 **Risk:** `index.html` is 3,616 lines. All CSS, JavaScript, and HTML are in a single file. As features grow, this becomes unmaintainable and slow to parse.

💡 **Recommendation:** Begin extracting components to separate `.mjs` modules. Set a maximum HTML file size of 500 lines. This is a medium-priority refactor (Phase 2+).

### 15.2 Database Performance

Every query that could return large result sets must have:
- Pagination (cursor-based preferred over offset for large datasets)
- Index coverage
- Result size limits

### 15.3 Image Performance

- All images served at optimal size for their display context
- WebP format preferred
- Lazy loading on all images below the fold
- Responsive images using `srcset`

### 15.4 Network Performance (Algeria-specific)

⚠️ **Assumption:** Internet connectivity quality varies significantly across Algeria. Urban centers (Algiers, Oran, Constantine) have 4G coverage. Rural and southern wilayas may have 3G or slower connectivity.

💡 **Recommendation:**
- Target page load under 3 seconds on 3G
- Minimize initial JavaScript payload
- Aggressive caching strategy
- Compress all assets (gzip/brotli)
- Consider CDN placement closer to Algeria (European CDN nodes)

---

## 16. Offline Strategy

### 16.1 Current State

🚩 No Service Worker exists. No offline support is implemented.

### 16.2 Philosophy

The platform must degrade gracefully when offline. Users should never see a blank page if they have previously loaded data.

### 16.3 Offline Capabilities (Phased)

| Feature | Offline Behavior | Phase |
|---------|-----------------|-------|
| Hub cards | Show cached data with "last updated" timestamp | P1 |
| Member workspace | Show cached profile and listings | P1 |
| QR verification (own card) | Embedded signed data, offline readable | P2 |
| Animal records | Cached, read-only | P3 |
| Marketplace browsing | Cached listings, no new interactions | P3 |
| Messaging | Queue outgoing messages, send when connected | P4 |

### 16.4 Conflict Resolution

When offline changes sync with the server, the server is always the source of truth. Client-side changes that conflict with server state must be presented to the user for resolution rather than silently overwritten.

---

## 17. Localization and Accessibility

### 17.1 Current Language Support

✅ Arabic (AR) — primary, RTL
✅ English (EN)
✅ French (FR) — widely used in Algeria alongside Arabic
✅ German (DE)

❌ **Recommendation to Reconsider German:** German (DE) has no practical relevance to the Algerian livestock market. Adding and maintaining German translations creates ongoing maintenance cost with no clear user benefit. **The Founder should decide whether to retain German or redirect that effort to improving Arabic and French quality.**

⚠️ **Assumption:** Tamazight (Berber languages) — particularly Kabyle — is spoken by a significant portion of the Algerian population, especially in Kabylie. This language is currently not supported. This is a cultural and political sensitivity.

💡 **Recommendation:** Before adding any new language, conduct user research to determine which languages real users actually need. Prioritize Arabic quality over breadth of language coverage.

### 17.2 Translation Completeness

🚩 The handoff report notes incomplete translations — some placeholders remain in English (example email formats, phone operator names).

💡 **Recommendation:** Conduct a complete i18n audit. Every visible string must be translatable. Create an automated test that checks for un-translated strings.

### 17.3 Accessibility

🚩 No accessibility audit has been documented.

💡 **Minimum Requirements:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all interactive elements
- Screen reader compatibility for Arabic content (RTL screen readers)
- Sufficient color contrast ratios
- Form labels properly associated with inputs
- Error messages programmatically associated with fields

---

## 18. AI Strategy

### 18.1 AI Governance Principle

**AI must solve measurable problems.** Do not use AI as marketing. Do not implement AI features before real data exists to train or fine-tune them.

### 18.2 Founder Approval Required

Before any AI feature affecting user decisions is implemented, the Founder must approve:
- What problem it solves
- What data it uses
- How it makes decisions (explainability)
- What happens when it makes a wrong decision
- How users can disagree with it

### 18.3 AI Features by Phase

**Phase 4+ (after marketplace is proven):**
- Price estimation suggestions for new listings (based on similar sold listings)
- Vaccination reminder intelligence (based on species, previous records, seasonal alerts)
- Duplicate listing detection (prevent same animal being listed twice)
- Suspicious activity detection (fake accounts, fraud patterns)

**Phase 6+ (after national data exists):**
- Market trend analysis
- Regional health alert pattern recognition
- Listing quality scoring

🔮 **Long-Term (National data, regulatory approval):**
- Disease outbreak prediction
- Nutritional recommendations
- Breeding performance analysis

### 18.4 What AI Must NOT Do

❌ Make final decisions on registration approvals (human-in-the-loop required)
❌ Issue medical diagnoses (legal liability)
❌ Automatically publish listings without moderation
❌ Provide price guarantees
❌ Replace veterinary judgment

---

## 19. Business Strategy

### 19.1 Revenue Philosophy

**Trust is the product.** Any monetization strategy that compromises user trust must be rejected.

### 19.2 Revenue Models (Founder Decision Required)

The Founder must decide which revenue models to pursue and in what order:

| Model | Rationale | Risk to Trust | Phase |
|-------|-----------|--------------|-------|
| Free forever (basic) | User acquisition, data collection | None | Now |
| Verified member badge (paid) | Breeders pay for verified status | Low | Year 2 |
| Featured listings | Sellers pay for promoted visibility | Medium | Year 2 |
| Professional vet subscription | Monthly fee for enhanced vet tools | Low | Year 2 |
| Analytics for breeders | Premium herd performance reports | Low | Year 3 |
| Business accounts | Feed sellers and enterprises | Low | Year 2 |
| Transaction commission | % of sales facilitated | Medium | Year 3+ |

❌ **Rejected Revenue Models:**
- Intrusive advertising — damages trust
- Selling user data to third parties — violates trust and Algerian data protection law
- Mandatory premium membership before basic use — kills adoption

### 19.3 Seasonal Demand

⚠️ **Assumption:** Livestock commerce in Algeria peaks significantly during Eid al-Adha (عيد الأضحى) and Ramadan. Platform load planning must account for 10–50x traffic increase during these periods.

💡 **Recommendation:** Design load testing around Eid al-Adha scenarios from Year 1. Infrastructure must scale to handle peak traffic without manual intervention.

### 19.4 Competition

⚠️ **Assumption:** Competing platforms include general classified sites (Ouedkniss) and social media marketplace features (Facebook, WhatsApp groups). MawashiDZ's differentiation is **verified identity**, **health records**, and **structured livestock data** — not price or marketing.

---

## 20. Gap Analysis

> This section documents missing requirements, topics not covered in existing documents, and areas requiring research.

### 20.1 Critical Gaps (Must Address Before Launch)

| Gap | Impact | Priority |
|-----|--------|----------|
| No livestock data model | Cannot manage animals, cannot launch marketplace | Critical |
| No media storage system | No photos on listings or profiles | Critical |
| Simulated market prices attributed to government source | Legal/reputational risk | Critical |
| No password policy enforcement | Security gap | Critical |
| No listing moderation workflow | Cannot safely open marketplace | Critical |
| No veterinarian credential model | Cannot verify professionals | Critical |

### 20.2 High Priority Gaps

| Gap | Impact |
|-----|--------|
| No notification tables | Cannot inform users of platform events |
| No support ticket tables | Cannot handle user issues at scale |
| No audit log table | Cannot audit admin actions |
| Session management undefined | Security policy incomplete |
| Media retention policy undefined | Legal exposure |
| No backup/recovery documentation | Operational risk |
| No deployment checklist | Production stability risk |
| No monitoring or alerting | Blind to failures |
| Ambassador/partner roles undefined | Confusing to users |
| Missing `phone` uniqueness on `profiles` | Data integrity gap |

### 20.3 Medium Priority Gaps

| Gap |
|-----|
| No accessibility audit |
| German language justification missing |
| i18n translation completeness not verified |
| Offline strategy not implemented |
| No CI/CD pipeline documented |
| No incident response procedure |
| No developer onboarding guide |
| Testing coverage below 80% |
| Market price data source not real |

### 20.4 Topics Requiring Field Research

Before implementing the following features, user research in the field is required:

**Breeders (highest priority):**
- How do breeders currently identify their animals? (ear tag, brand, microchip, none)
- What documents do they already have? (vet certificates, ownership papers, purchase receipts)
- How often do they use a smartphone?
- What is typical internet connectivity in their area?
- How do they price animals for sale?
- What information do buyers always ask for?

**Buyers:**
- What prevents a buyer from completing a purchase?
- What information creates trust before buying?
- How do buyers currently verify animal health?

**Veterinarians:**
- What certification documentation do they currently maintain?
- What is their current digital tool usage?
- What would make MawashiDZ useful to them professionally?

**Weekly Markets:**
- Observe a real livestock market (سوق الماشية) before finalizing the marketplace design
- Document how prices are negotiated in practice
- Identify what information actually changes hands during a transaction

---

## 21. Risk Register

### 21.1 Critical Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| `index.html` grows beyond maintainable size | High | High | Begin modularization in Phase 1 |
| Supabase vendor lock-in | Medium | High | Abstract DB access through RPCs, document migration path |
| Market price legal liability | High | High | Remove government attribution immediately; label as estimates |
| No backup strategy documented | High | Critical | Define daily automated backups before any user data is stored |
| Mass account creation attacks | Medium | High | Rate limiting, CAPTCHA on registration |
| Eid al-Adha traffic spike | High | High | Load test and scale plan before Year 1 peak |

### 21.2 Critical Business Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Low initial adoption due to complex registration | High | Simplify registration to minimum required fields |
| Marketplace inactivity (no listings) | High | Seed platform with verified breeders before public launch |
| Fake veterinarians undermine trust | Medium | Strict verification before professional capabilities activate |
| Seasonal irrelevance between Eid peaks | Medium | Build year-round value through herd management features |
| Competition from WhatsApp groups | High | Emphasize verification and trust as the differentiator |

### 21.3 Critical Security Risks

| Risk | Mitigation |
|------|-----------|
| Fake listings with stolen photos | Phase 2: link listings to registered animals; Phase 3: image analysis |
| QR code forgery | Cryptographic signing with server-side verification |
| Unauthorized wilaya manager privilege escalation | Server-side RLS + RPC; no client-only permission checks |
| Account takeover via weak passwords | Enforce password policy; consider 2FA for managers and admins |
| Data leakage via PostgREST direct table access | Ensure all sensitive operations go through RPCs |

### 21.4 Year 1 Top Risks

1. Platform launches without real market price data → **fix before launch**
2. No livestock data model → **build before marketplace launch**
3. Registration flow produces false error messages → **verified as fixed in v1.9.0**
4. Eid traffic spike with no scaling plan → **create load plan in Q1**
5. No monitoring → **implement before any production users**

### 21.5 Year 3 Risks

- Technical debt accumulation in `index.html` monolith
- Wilaya manager bandwidth (58 managers, varying quality)
- Marketplace trust erosion if moderation is slow
- Competing platform launches with VC funding

### 21.6 Year 5 Risks

- National scale requires infrastructure overhaul (CDN, database sharding)
- Regulatory requirements may increase (data localization law)
- Platform dependencies on Supabase pricing changes
- Business model sustainability if marketplace commissions are too low

---

## 22. Feature Backlog: Build, Defer, Reject

### 22.1 Must Build (Phase 1 — now)

- Registration review + admin operations (Track A) ← in progress
- Password recovery flow (Track B) ← in progress
- Email notification on registration outcome (Track C)
- Notification inbox (Track D)
- Support ticket system (Track E)

### 22.2 Must Build (Phase 2)

- Animal/livestock data model
- Supabase Storage integration for photos and documents
- Basic marketplace listing (create, review, publish, search)
- Breeder Smart Workspace
- Smart Hub (Top-4 cards + Today in your wilaya)

### 22.3 Must Build (Phase 3)

- Veterinarian profile and verification
- Animal health records and vaccinations
- QR identity system
- Membership card generation (PDF)
- Buyer Smart Workspace
- Vet Smart Workspace

### 22.4 Defer (Phase 4+)

- Feed seller marketplace
- Broker/ambassador tools (pending Founder decision on role definition)
- AI assistant card
- Advanced analytics
- Breeding records
- Transportation marketplace
- Equipment marketplace

### 22.5 Reject (Do Not Build)

| Feature | Reason |
|---------|--------|
| In-platform payment processing | Regulatory complexity exceeds benefit at current scale |
| Auction system | Not validated by user research; complex fraud surface |
| Social feed / public posts | Not a social network; adds moderation burden |
| "Follow" between members | No business need; adds social network complexity |
| Unlimited open chat | Creates moderation burden; not the platform's purpose |
| Cryptocurrency payments | No user demand; regulatory risk in Algeria |
| Blockchain animal registry | Technical complexity without clear advantage over trusted database |
| AI medical diagnosis | Legal liability; replaces veterinarian judgment |
| Live video streaming | Bandwidth assumption wrong for many users; high infrastructure cost |
| Multi-language AI content generation | Premature; AI quality in Algerian Arabic dialect is not verified |

---

## 23. Founder Decisions Required

> These decisions must not be made by engineering alone. Implementation of related features is **blocked** until the Founder documents a decision.

| Decision | Why It Matters | Urgency |
|----------|---------------|---------|
| Market price data strategy | Currently simulated and falsely attributed to MADR; legal risk | **Immediate** |
| Ambassador and partner role definition | Roles exist in code but have no product purpose | High |
| Password policy standards | Security baseline | High |
| Veterinary certificate legal disclaimer | Prevents legal liability for health advice | High |
| Revenue model and monetization timeline | Determines infrastructure and feature priorities | Medium |
| German language retention | Ongoing maintenance cost with no clear user value | Medium |
| Broker role as distinct vs. enhanced breeder | Defines platform architecture | Medium |
| Member-to-member direct messaging policy | Phase 3 decision but architecture impacts Phase 2 | Medium |
| Data retention periods for each data type | Legal compliance and storage planning | Medium |
| Wilaya manager compensation and accountability | 58 managers; what is expected; what happens if they are inactive? | High |
| Account permanent deletion policy | Privacy rights vs. audit requirements | Medium |
| Legal entity and Terms of Service | Required before collecting user data commercially | High |

---

## 24. Five-Year Roadmap

### Year 1: Foundation

- Complete Phase 1 (Member Operations & Communication)
- Complete livestock data model and basic animal management
- Launch marketplace alpha (listings only, no payments)
- Implement QR membership cards
- Establish monitoring and backup
- Onboard 50–200 verified breeders across 5 wilayas
- Onboard 10–20 verified veterinarians

**Success criteria:** Verified breeder can list an animal, a buyer can contact the seller, a wilaya manager can approve registrations.

### Year 2: Growth

- Smart Hub P0–P3 complete
- Marketplace publicly available
- Health records and vaccination tracking
- Veterinarian workspace
- Mobile-optimized PWA with offline support
- 1,000+ active members across 20+ wilayas
- Revenue model decision implemented

### Year 3: Maturity

- All role workspaces complete
- Feed seller marketplace
- AI-assisted price suggestions
- Advanced analytics for breeders
- Performance at 10,000+ members without degradation
- Consider native mobile application (if web PWA proves insufficient)

### Year 4: Expansion

- National reach (all 58 wilayas)
- Third-party integrations (logistics, insurance)
- Government integration if legally and technically feasible
- API available for verified partners

### Year 5: Leadership

- Recognized as the national digital reference for Algerian livestock
- Sustainable revenue
- Self-governing moderation at wilaya level
- AI features based on 3+ years of real data
- Evaluate international expansion (MENA region) based on market research

---

## 25. Testing Standards

### 25.1 Current Test Coverage

✅ `tests/registration-flow.test.mjs` — registration pipeline scenarios
✅ `tests/registration-ui-guard.test.mjs` — double-click guard
✅ `tests/security-allocate-member-id.test.mjs` — member ID security
✅ `tests/auth-surface-guard.test.mjs` — auth access surface
✅ `tests/password-recovery.test.mjs` — recovery flow
✅ `tests/dashboard-review-pagination.test.mjs` — admin pagination
✅ `tests/i18n-layout.test.mjs` — translation completeness
✅ Database-level tests via `supabase/tests/run-phase0-tests.mjs`

### 25.2 Required Standards

Every PR must:
- Pass all existing tests (`npm test`)
- Add tests for any new RPC that involves permissions or data mutations
- Add tests for any new registration or auth flow change
- Not reduce existing coverage

### 25.3 Security Testing

Before any public marketplace feature launches:
- Penetration test of RLS policies
- Authorization boundary testing (can R1 access R2 data?)
- OWASP Top 10 review
- Rate limit testing

### 25.4 Performance Testing

Before Eid al-Adha (Year 1):
- Load test simulating 100x normal traffic
- Database query plan review for all marketplace queries
- Storage performance under concurrent upload scenarios

---

## 26. Documentation and Decision Records

### 26.1 Documentation Structure

```
/docs
├── constitution/
│   ├── CONSTITUTION.md          ← This document
│   ├── GAP_ANALYSIS.md          ← Detailed gaps and research needs
│   ├── RISK_REGISTER.md         ← Full risk register with owners
│   └── FEATURE_BACKLOG.md       ← Detailed build/defer/reject decisions
├── product/
│   ├── PRODUCT_CONSTITUTION.md  ← Smart Workspace constitution (v1.4)
│   ├── ROADMAP.md
│   ├── GLOSSARY.md
│   └── MEMBER_OPERATIONS.md / SUPPORT_AND_MESSAGES_CENTER.md
├── adr/
│   └── 001-member-id-allocation.md
├── architecture/
│   └── (future: data model, API, security diagrams)
└── database-schema.md
```

### 26.2 Decision Records

Every major technical decision must produce an Architecture Decision Record (ADR) in `docs/adr/`.

Every major product decision must produce a Product Decision Record (PDR) in `docs/product/PRODUCT_DECISIONS/`.

ADR and PDR templates must be followed. Do not silently contradict a decision — supersede it with a new record that explains why.

### 26.3 Living Document Protocol

This Constitution must be reviewed:
- Before every major product release
- When the business model changes materially
- When security policy changes
- When a new role or major feature is added
- Annually (minimum)

---

## 27. Glossary

| Term | Definition |
|------|------------|
| **Smart Workspace** | The role-specific daily operational home for every MawashiDZ member — not a passive dashboard |
| **Smart Hub** | Modular card framework inside the workspace; delivers daily insights |
| **Card** | A single unit of information or action in the Hub |
| **Card Provider** | Module defining a card's source, refresh policy, and visibility rules |
| **Rank R1–R4** | R1 member → R2 wilaya manager → R3 admin → R4 founder; no upward data leakage |
| **Wilaya Fence** | The server-side rule that managers see only their assigned wilaya |
| **Member ID** | Unique permanent identifier: `MDZ-[prefix]-[000001]` |
| **Breeder** | A livestock owner who manages and may sell animals (مرب) |
| **Broker** | Facilitates transactions between sellers and buyers, typically for a commission (سمسار) |
| **Vet / Veterinarian** | Licensed animal health professional (طبيب بيطري) |
| **Feed Seller** | Supplier of livestock feed and nutrition products (صاحب أعلاف) |
| **Buyer** | A person purchasing livestock (مشتري) |
| **Wilaya Manager** | Platform supervisor for one of the 58 Algerian wilayas |
| **Listing** | An offer to sell one or more animals or products on the marketplace |
| **Herd** | A named group of animals owned by one breeder in one location |
| **Vaccination Record** | A documented record of a vaccine administered to a specific animal |
| **Health Certificate** | Official document issued by a verified veterinarian attesting to animal health |
| **QR Identity** | A scannable QR code that verifies an entity's authenticity against the platform |
| **Membership Card** | A printable/digital card displaying a member's verified identity |
| **Trusted Breeder** | A breeder who has completed sales and received positive feedback; may access faster publishing |
| **Ticket** | A structured support request with lifecycle, priority, and linked context |
| **Internal Note** | A staff-only note on a ticket; never visible to the member |
| **PDR** | Product Decision Record — why a product choice was made |
| **ADR** | Architecture Decision Record — why a technical choice was made |
| **Least Privilege** | Security principle: grant only the minimum permissions required |
| **Wilaya** | One of Algeria's 58 administrative provinces |
| **DZD** | Algerian Dinar — the currency unit used throughout the platform |
| **RLS** | Row Level Security — PostgreSQL feature enforcing data access rules at the database level |
| **RPC** | Remote Procedure Call — a named database function callable via API |
| **SPA** | Single Page Application — the current frontend architecture |
| **PWA** | Progressive Web Application — the target for offline support |

---

## Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-07-24 (draft) | Founder (via initial document) | First draft Constitution (multiple parts, unstructured) |
| 2.0 | 2026-07-24 | Technical analysis | Complete reconstruction: verified facts, gap analysis, risk register, feature backlog, 5-year roadmap; removed duplicates; merged all sections; added critical recommendations |

---

*This Constitution is the property of MawashiDZ. It must be reviewed by the Founder before any major architectural decision is implemented.*
