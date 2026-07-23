# Member Operations & Communication

**Roadmap phase (umbrella)** — mandatory before [Smart Workspace & Hub](./PRODUCT_CONSTITUTION.md)

| | |
|--|--|
| **Status** | Approved — **one phase title**, **several delivery tracks** (not one mega-PR) |
| **Owner** | Founder / Product / Operations |
| **Index** | [ROADMAP.md](./ROADMAP.md) |

## Is this one big project?

**No.** *Member Operations & Communication* is the **name of the roadmap phase**. It groups everything a member needs **after registration** and **before** the Smart Workspace—but each section below has **its own scope, branches, tests, and merge gates**.

> **Founder clarification (yes):** This title is the **phase that contains multiple sections**—including **Admin Operations**, Password Recovery, Notifications, and **Support & Messages**—not a single undifferentiated implementation.

---

## Phase structure (documentation map)

```text
Member Operations & Communication          ← this document (umbrella)
│
├── Registration Review                    → MEMBER_OPERATIONS.md §1
├── Admin Operations                       → MEMBER_OPERATIONS.md §2
├── Password Recovery                      → MEMBER_OPERATIONS.md §3
├── Email Architecture                     → MEMBER_OPERATIONS.md §4
├── Notifications                          → MEMBER_OPERATIONS.md §5
└── Support & Messages Center              → SUPPORT_AND_MESSAGES_CENTER.md
```

| Section | Detail spec | Typical delivery |
|---------|-------------|------------------|
| **Registration review** | Workflow: approve, reject, request info, view profile | With admin operations |
| **Admin operations** | RPC (`admin_set_profile_status`, …), audit log, admin/founder/manager dashboards (e.g. migration **008**) | **First track** — often called “Admin Ops” in engineering |
| **Password recovery** | Supabase Auth forgot/reset flow + UX | Separate PR when needed |
| **Email architecture** | Auth emails + operational provider (Resend/Brevo) | Separate PR |
| **Notifications** | In-app notification center (status, alerts) | Separate PR |
| **Support & messages** | Tickets, admin/wilaya messaging, later P2P | **Separate track** after core ops + notifications foundation |

**Admin Operations** is **not** renamed away—it remains the official name for the **administration implementation layer** (RPC, audit, dashboards) that powers registration review.

---

## Recommended execution order (within this phase)

| Track | Section | Gate |
|-------|---------|------|
| **A** | Registration review + **Admin operations** | Live in production |
| **B** | Password recovery | Verified end-to-end |
| **C** | Email architecture | Status + auth emails working |
| **D** | Notifications | MVP inbox without full ticketing |
| **E** | Support & messages | Tickets + admin/wilaya channels |

Tracks **A→D** do not require tickets. Track **E** starts when **A** is stable; **D** should exist before ticket deep-links.

Only after **A–E** (minimum: A + B + C + D + E core) → **[Smart Workspace P0](./ROADMAP.md)**.

---

## Related documents

- [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) — sections 1–5 (not messaging)  
- [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md) — section 6  
- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) — vision (Hub after this phase)  
- [GLOSSARY.md](./GLOSSARY.md) — Admin Operations, Support & Messages Center, …
