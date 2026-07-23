# Member Operations & Communication System

**Phase 1 — mandatory before Smart Workspace (Hub P0)**

| | |
|--|--|
| **Status** | Approved product specification (docs); implementation phased |
| **Owner** | Founder / Product / Operations |
| **Audience** | Engineering, wilaya managers, admin, support |
| **Supersedes** | Treating “admin operations” and “member messaging” as separate, unrelated features |

This document describes **one member journey** after signup:

```text
Registration → review → communication with platform → account recovery → notifications → Smart Workspace
```

It is the **operational backbone** of MawashiDZ. The [Product Constitution](./PRODUCT_CONSTITUTION.md) (Smart Workspaces & Hub) builds **on top** of this layer—not instead of it.

**Constraint:** Ship in dedicated branches and PRs. Sensitive paths use **RPC + RLS + audit**; never rely on hidden UI alone.

---

## Phase 1 – Member Operations (mandatory before Smart Hub)

Nothing in **Smart Workspace P0/P1** should block or rewrite this phase. Hub assumes members can be **approved**, **messaged**, **notified**, and **recovered** through governed channels.

---

### 1. Registration review workflow

Founders, admins, and wilaya managers (within wilaya) must run a **single, auditable** review pipeline for new members.

| Capability | Detail |
|------------|--------|
| **Approve** | Activate member path; update `profiles.status`; trigger notifications and stats |
| **Reject** | With reason visible to the member (own request only) |
| **Request information** | Structured ask (documents, corrections); member can respond via tickets |
| **View profile** | Full registration + profile context for decision-makers (rank-scoped) |
| **Secure RPC** | Mutations via `admin_set_profile_status` and related RPCs—not open PostgREST PATCH from browser |
| **Audit log** | Every approve/reject/suspend/request-info recorded (align with `admin_audit_log` pattern) |
| **Notifications** | Member informed on each state change (in-app + email when configured) |
| **Statistics** | Admin/manager dashboards reflect queue depth and outcomes |
| **Founder / Admin** | National scope; role grants; escalation; never wilaya-fenced incorrectly |
| **Wilaya manager** | **Wilaya fence only**—membership and listings in assigned wilaya; see constitution rank rules |

**Implementation note:** Migration **008** (audit + extended admin RPC) is part of this pillar; merge and deploy before ticket system at scale.

---

### 2. Support & Messages Center

**Do not** label this “Chat”. Product name:

> **Support & Messages Center**

It is **purpose-bound messaging**, not a social network.

#### A. Member ↔ platform (admin / support)

| Type | Examples |
|------|----------|
| General inquiry | استفسار عام |
| Complaint | شكوى |
| Suggestion | اقتراح |
| Profile / data change request | طلب تعديل |
| Verification request | طلب توثيق |
| Technical issue | مشكلة تقنية |

#### B. Member ↔ wilaya manager (wilaya-scoped)

| Type | Examples |
|------|----------|
| Membership review follow-up | مراجعة العضوية |
| Listing review | مراجعة عرض |
| Local issues | مشاكل محلية |
| Visit request | طلب زيارة |
| Application status | متابعة حالة الطلب |

Managers **never** see another wilaya’s threads.

#### C. Later — member ↔ member (marketplace & services only)

Allowed **only** when tied to an operational object:

| Pair | Linked to |
|------|-----------|
| Buyer ↔ Breeder | Purchase request, listing, reservation, sale |
| Breeder ↔ Veterinarian | Consultation, health record, assigned case |
| Breeder ↔ Feed seller | Order, product, delivery |

**Not allowed:** general DMs, unsolicited spam, or off-platform negotiation without a linked ticket/listing.

---

### 3. Ticket system

Every message in the Support & Messages Center is a **ticket** (or thread with a ticket parent)—not ephemeral chat.

| Field / concept | Purpose |
|-----------------|--------|
| **Status** | `open` → `in_review` → `waiting_for_member` → `escalated` → `closed` |
| **Priority** | low / normal / high / urgent (rules TBD) |
| **Assigned manager** | Wilaya manager or admin queue |
| **Wilaya** | Scope for R2; null or national for R3/R4 |
| **Linked registration** | `registration_id` / profile |
| **Linked listing** | Marketplace listing id (when exists) |
| **Linked animal** | Animal / QR profile (when exists) |

Escalation: manager temporary action + evidence → founder/admin review → final decision (see constitution).

---

### 4. Password recovery

End-to-end **account recovery** must be complete and tested before Smart Hub launch.

| Step | Requirement |
|------|-------------|
| Forgot password | Clear entry from login; email or approved identifier |
| Reset password | Secure token link; strength rules |
| Confirm password | Match validation; accessible errors |
| Redirect | Back to login or workspace with success message |
| Link expiry | Explicit UX when token expired |
| Error messages | Actionable (AR/FR/EN); no generic failures |
| Re-login | Session established; profile loads |

Uses **Supabase Auth** flows; custom copy via templates where allowed.

---

### 5. Email & notifications architecture

| Channel | Owner | Use |
|---------|--------|-----|
| **Authentication emails** | Supabase Auth | Confirm email, magic link, password reset |
| **Operational emails** | Resend or Brevo (chosen provider) | Approval, rejection, ticket reply, wilaya announcements (approved) |
| **In-app notifications** | MawashiDZ API + RLS | Real-time or polled inbox; deep links |
| **Push notifications** | Future | Mobile app phase; same event sources as in-app |

Operational emails must **not** bypass ticket/audit rules (e.g. “reply” links open ticket context).

---

### 6. Notification center (member)

Every member has a **notification center** inside the account / workspace shell (constitution cross-reference).

Examples:

- تمت الموافقة على عضويتك  
- مدير الولاية رد على رسالتك  
- لديك طلب شراء  
- تم رفض العرض  
- لديك تنبيه صحي  

Requirements: mark read / mark all; filter by type; deep link to ticket, listing, or Hub card; **rank-safe** payloads.

---

### 7. Linked context

Every message and notification carries **linked context** so managers are not lost in search:

| Link | When |
|------|------|
| Member | Always |
| Registration / application | Review workflows |
| Listing | Marketplace |
| Animal / QR | Health or sale context |
| Wilaya | Manager scope |
| Veterinarian | Professional case |
| Ticket id | Universal reference |

Global search (workspace phase) must respect the same visibility as these links.

---

### 8. Audit & security

| Rule | Detail |
|------|--------|
| **No delete** | Messages and tickets are **archived**, not hard-deleted |
| **Every reply logged** | Who, when, channel |
| **Every status change logged** | Ticket + registration actions |
| **Actor + timestamp** | On all mutations |

Permissions enforced **server-side** (RLS + RPC). Wilaya fence and rank rules from the constitution apply to all ops surfaces.

#### Internal notes (staff only)

**Internal notes** are **never visible to the member**.

Examples:

- العضو اتصل هاتفياً  
- تم طلب وثيقة إضافية  
- المشكلة حُلّت  
- يُفضّل متابعة الطلب بعد أسبوع  

| Who can read/write | Scope |
|--------------------|--------|
| Founder / Admin | National |
| Wilaya manager | Assigned wilaya tickets/members only |

Notes attach to **ticket** and/or **registration**; shown in manager/founder workspace when opening the case. Enables handoff when the team grows without oral history.

---

### 9. Execution order (Phase 1 → Hub)

Approved sequence—**complete in order** before **Smart Workspace P0**:

| Order | Deliverable |
|-------|-------------|
| **1** | **Admin operations** — registration review workflow (RPC, audit, dashboards, notifications hook) |
| **2** | **Ticket system** — Support & Messages Center data model + UI shells |
| **3** | **Password recovery** — full Auth recovery UX and messaging |
| **4** | **Email architecture** — operational provider + templates wired to ticket/status events |
| **5** | **Notification center** — in-app inbox + deep links |
| **6** | **Smart Workspace P0** — Hub schema (`hub_cards`, events); no duplicate of steps 1–5 |

Steps 1–5 are **Member Operations & Communication**; step 6 starts the [constitution](./PRODUCT_CONSTITUTION.md) Hub track.

---

## Relationship to other docs

| Document | Relationship |
|----------|----------------|
| [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) | Smart Workspace, Hub, notification center *vision* |
| [ROADMAP.md](./ROADMAP.md) | Updated execution table includes this phase |
| [GLOSSARY.md](./GLOSSARY.md) | Terms: ticket, Support & Messages Center, internal notes |
| `docs/REGISTRATION_FLOW_AUDIT.md` | Signup pipeline; do not break when adding ops |
| `docs/adr/` | Engineering ADRs (e.g. member ID) |

---

## Decision recorded

**Founder:** Admin operations and member communication are **one system** documented here. Implement as a **single epic** (multiple PRs), then proceed to Smart Workspace P0.
