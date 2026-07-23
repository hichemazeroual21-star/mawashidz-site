# Support & Messages Center — product requirements (§6)

Part of **[Member Operations & Communication](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)**.  
**Product name:** **Support & Messages Center** — never “Chat”.  
**Implementation plan:** [ROADMAP.md](./ROADMAP.md) track **E** — not here.

---

## Goal

Members and operators communicate **for a reason** (support, wilaya ops, later commerce)—with **tickets**, **history**, and **staff notes**—on a livestock business platform, not a messaging app.

---

## Non-goals (this section)

| Non-goal | |
|----------|---|
| General chat or “DM anyone” | |
| WhatsApp / Messenger / social-style UX as the primary pattern | |
| Public member profiles for messaging discovery | |
| Unlinked member-to-member messages | |
| **Hard delete** of messages or tickets (archive only) | |
| Voice/video calls in v1 | |
| AI auto-reply bots in v1 | |

---

## 1. Message types & scenarios

### Requirements

**A. Member ↔ platform (admin / support)**  
Inquiry, complaint, suggestion, profile change, verification, technical issue.

**B. Member ↔ wilaya manager**  
Membership follow-up, listing review, local issues, visit request, application status.

**C. Later — member ↔ member**  
Only when linked to purchase request, listing, reservation, sale, vet case, or feed order.

### Permissions

- Managers: wilaya fence for B; cannot read other wilayas’ threads.
- Members: own threads + threads on their listings/requests when C is enabled.

### UX

- User picks **type** when opening a request (not a blank chat box).
- Thread shows **status** and **linked objects** prominently.

### Acceptance criteria

- [ ] Member can open a **typed** support request (at least 3 types in MVP).
- [ ] Wilaya manager sees only **wilaya-scoped** threads.
- [ ] Member-to-member channel **disabled** until C is explicitly released.
- [ ] UI does not use “Chat” as primary label (glossary term enforced in copy).

---

## 2. Ticket system

### Requirements

- Every conversation is a **ticket** with lifecycle: `open` → `in_review` → `waiting_for_member` → `escalated` → `closed`.
- **Priority** (low / normal / high / urgent).
- **Assignment** to admin or wilaya manager queue.
- **Links:** registration, listing, animal/QR when applicable.

### Permissions

- Status changes by authorized roles only; member can reply when `waiting_for_member`.

### UX

- Queue views for operators (urgent first, filter by wilaya/status).
- Member sees ticket list with clear status labels.

### Acceptance criteria

- [ ] Create ticket → appears in correct operator queue.
- [ ] Full status lifecycle exercisable in staging.
- [ ] **Escalated** tickets visible to founder/admin per policy.
- [ ] Closed tickets **archived**, still readable for audit; not deleted.
- [ ] Automated tests for RLS on tickets **green**.

---

## 3. Linked context

### Requirements

Each ticket/message displays: member, wilaya, ticket id, and links to registration, listing, animal, vet case as applicable.

Operational emails for replies open the **same ticket context** in the product.

### Acceptance criteria

- [ ] Operator opens ticket → sees all linked ids without separate search.
- [ ] Email link (when enabled) lands on correct ticket for logged-in user.
- [ ] Search (when workspace search ships) cannot expose fields tickets don’t already authorize.

---

## 4. Audit & internal notes

### Requirements

- Log every reply and status change (actor, timestamp).
- **Internal notes:** staff-only; never shown to member.
- Notes attach to ticket and/or registration for handoff.

### Permissions

| Role | Internal notes |
|------|----------------|
| Founder / Admin | National |
| Wilaya manager | Assigned wilaya tickets/members only |
| Member | **No access** |

### UX

- Clear visual distinction: **member-visible reply** vs **internal note**.

### Acceptance criteria

- [ ] Member cannot see internal notes (UI + API/RLS).
- [ ] New manager opening old ticket sees **note history**.
- [ ] No hard-delete API for messages; archive path only.
- [ ] Audit export or query available to founder/admin.

---

## Product acceptance (section complete)

Support & Messages is **done** when all acceptance checklists above are met in production, integrated with §5 notifications (deep links), and [ROADMAP.md](./ROADMAP.md) track **E** is signed off.

---

## Related docs

- [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) — email & notification foundation  
- [GLOSSARY.md](./GLOSSARY.md) — Support & Messages Center, Ticket, Internal notes
