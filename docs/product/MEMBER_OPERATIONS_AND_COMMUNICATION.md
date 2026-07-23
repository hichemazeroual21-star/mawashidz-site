# Member Operations & Communication — product requirements

**Type:** Product requirements (PRD umbrella) — **not** an implementation plan.  
**Execution order, tracks, migrations, and PR gates:** [ROADMAP.md](./ROADMAP.md) only.

| | |
|--|--|
| **Roadmap phase** | Phase 1 — before [Smart Workspace & Hub](./PRODUCT_CONSTITUTION.md) |
| **Owner** | Founder / Product |
| **Audience** | Product, design, engineering, ops |

---

## Goal

After registration, every member and operator can complete **review, account recovery, status communication, and governed messaging** before the daily **Smart Workspace** experience. Operators work with **clear permissions**, **auditability**, and **linked context**—not ad-hoc tools or informal chat.

---

## Scope (what this phase includes)

```text
Member Operations & Communication
│
├── Registration review          → MEMBER_OPERATIONS.md §1
├── Admin operations             → MEMBER_OPERATIONS.md §2
├── Password recovery            → MEMBER_OPERATIONS.md §3
├── Email architecture           → MEMBER_OPERATIONS.md §4
├── Notifications                → MEMBER_OPERATIONS.md §5
└── Support & Messages Center  → SUPPORT_AND_MESSAGES_CENTER.md
       ├── Tickets
       ├── Admin / support messages
       ├── Wilaya manager messages
       ├── Audit & internal notes
       └── (Later) Member-to-member messaging
```

> **Founder clarification:** One **phase title**, multiple **product sections**. **Admin Operations** remains a named section. **Support & Messages Center** is a section—not “Chat”. Delivery is split in the **ROADMAP**, not in this file.

---

## Non-goals (phase-wide)

This phase is **not**:

| Non-goal | Meaning |
|----------|---------|
| **A chat app** | No open-ended messaging UX |
| **WhatsApp / Messenger / Telegram clone** | No consumer chat patterns as the primary model |
| **Social network** | No feeds, follows, or public member-to-member discovery |
| **Random DMs** | No unsolicited member-to-member messages without a linked business object |
| **Hard-delete of messages** | Archive and audit only; no erasing history |
| **Smart Workspace / Hub** | Deferred to roadmap Phase 2+ (constitution) |
| **Full marketplace** | Listing commerce is later; only messaging *linked* to future listings where specified |
| **AI assistant** | Later phase per constitution |

Section-specific non-goals: see each detail document.

---

## Permissions (summary)

| Rank | Registration review | Admin operations UI | Wilaya messaging | National support |
|------|---------------------|---------------------|------------------|------------------|
| **Member** | View own status; respond to requests | — | Message own wilaya manager when enabled | Open support tickets |
| **Wilaya manager** | Approve/reject/request info **in wilaya only** | Wilaya queue & actions | Wilaya-scoped threads | Escalate |
| **Admin / Founder** | National | Full audit, roles, configuration | Oversight | All queues |

Server-side enforcement required; see acceptance criteria in section docs. Rank detail: [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md).

---

## UX principles (phase-wide)

- **Business platform, not chat:** labeled flows (ticket type, status), not bubble-first UX.
- **Actionable states:** members always know *what happens next* after approve/reject/request info.
- **Linked context:** every operator view shows member, wilaya, ticket, and related objects without hunting.
- **RTL + AR/FR/EN** copy for errors and status (especially recovery and rejection).
- **Accessibility:** keyboard and screen-reader friendly queues for managers.

---

## Detail documents (requirements + acceptance criteria)

| Document | Contents |
|----------|----------|
| [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) | §1–5 requirements and **done** criteria |
| [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) | Messaging, tickets, audit, internal notes + **done** criteria |
| [ROADMAP.md](./ROADMAP.md) | **When** and **how** engineering delivers (tracks, gates, branches) |
| [GLOSSARY.md](./GLOSSARY.md) | Official terms |

---

## Product acceptance (phase complete)

Phase 1 is **product-complete** when **every section’s acceptance criteria** in the detail docs are met in production (verified by QA + founder sign-off), and [ROADMAP.md](./ROADMAP.md) gates for Smart Workspace **P0** are checked.

Do **not** mark the phase done on documentation alone.
