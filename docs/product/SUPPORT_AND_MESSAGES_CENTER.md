# Support & Messages Center (section 6)

Part of **[Member Operations & Communication](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** — **separate delivery track** from admin ops / notifications foundation (own branches, tests, PRs).

| | |
|--|--|
| **Status** | Approved product specification |
| **Owner** | Founder / Product / Operations |
| **Roadmap** | [ROADMAP.md](./ROADMAP.md) — track **E** within Member Operations & Communication |
| **Product name** | **Support & Messages Center** — not “Chat” |

Purpose-bound messaging tied to **tickets** and operational objects—not a social network.

---

## 1. Message types

### A. Member ↔ platform (admin / support)

| Type | Examples |
|------|----------|
| General inquiry | استفسار عام |
| Complaint | شكوى |
| Suggestion | اقتراح |
| Profile / data change | طلب تعديل |
| Verification | طلب توثيق |
| Technical issue | مشكلة تقنية |

### B. Member ↔ wilaya manager (wilaya-scoped)

| Type | Examples |
|------|----------|
| Membership follow-up | مراجعة العضوية |
| Listing review | مراجعة عرض |
| Local issues | مشاكل محلية |
| Visit request | طلب زيارة |
| Application status | متابعة حالة الطلب |

Managers **never** see another wilaya’s threads.

### C. Later — member ↔ member (marketplace & services only)

| Pair | Linked to |
|------|-----------|
| Buyer ↔ Breeder | Purchase request, listing, reservation, sale |
| Breeder ↔ Veterinarian | Consultation, health record, case |
| Breeder ↔ Feed seller | Order, product, delivery |

**Not allowed:** general DMs or spam without a linked object.

---

## 2. Ticket system

Every thread is a **ticket** (or child of a ticket)—not ephemeral chat.

| Field | Purpose |
|-------|---------|
| **Status** | `open` → `in_review` → `waiting_for_member` → `escalated` → `closed` |
| **Priority** | low / normal / high / urgent |
| **Assigned manager** | Wilaya or admin queue |
| **Wilaya** | R2 scope |
| **Links** | Registration, listing, animal/QR |

Escalation: manager action + evidence → founder/admin (constitution).

---

## 3. Linked context

Every message carries links: member, registration, listing, animal, wilaya, vet case, **ticket id**.  
Operational emails for ticket replies must open ticket context (extends [Member Operations](./MEMBER_OPERATIONS.md) email layer).

---

## 4. Audit & security

| Rule | Detail |
|------|--------|
| **No hard delete** | Archive only |
| **Log replies & status changes** | Actor + timestamp |
| **RLS + RPC** | Wilaya fence and rank rules |

### Internal notes (staff only)

Never visible to the member. Examples: phone contact; extra document requested; resolved; follow up in one week.

| Who | Scope |
|-----|--------|
| Founder / Admin | National |
| Wilaya manager | Assigned wilaya only |

Attach to ticket and/or registration for handoff between managers.

---

## Phase 2 execution order

| Order | Deliverable |
|-------|-------------|
| **E.1** | Ticket data model + RLS |
| **E.2** | Admin / support message types + UI |
| **E.3** | Wilaya manager messaging |
| **E.4** | Notification deep links to tickets |
| **E.5** | (Later) Member-to-member messaging behind listing/service links |

After track **E** (minimum viable) and tracks **A–D**, proceed to **Smart Workspace P0** ([ROADMAP.md](./ROADMAP.md)).

---

## Related docs

- [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) — review, recovery, email, notification center foundation  
- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) — workspace notification center vision  
- [GLOSSARY.md](./GLOSSARY.md) — Ticket, Support & Messages Center, internal notes
