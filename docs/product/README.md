# MawashiDZ — Product documentation library

**Last updated:** 2026-07-23

This folder is the **official product reference** for MawashiDZ: member operations, constitution, decisions, roadmap, and shared vocabulary. Engineering ADRs (e.g. member ID allocation) live under `docs/adr/`; **product direction and workspace philosophy** live here.

**Hierarchy:** Constitution → [ROADMAP](./ROADMAP.md) → phase umbrella **[Member Operations & Communication](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** (sections + separate delivery tracks)—not one undifferentiated epic.

**Governance (Founder-approved):** Do not scatter major product decisions in random files. **Update the constitution** when vision changes; **add a PDR** for each important product/architecture choice; **update the roadmap** when execution order changes.

---

## Product library version history

| Version | Date | Summary |
|---------|------|---------|
| **1.0** | 2026-07-23 | `docs/product/` created; Product Constitution, PDR-001–005, Glossary, Roadmap |
| **1.1** | 2026-07-23 | Member Operations & Communication System (Phase 1 before Hub) |
| **1.2** | 2026-07-23 | Constitution SSOT clause; version history; Founder merge approval |
| **1.3** | 2026-07-23 | Split detail specs; roadmap tree |
| **1.4** | 2026-07-23 | Umbrella [MEMBER_OPERATIONS_AND_COMMUNICATION](./MEMBER_OPERATIONS_AND_COMMUNICATION.md); **Admin Operations** named; Support & Messages = section 6 / track E |

Constitution-only versions: see [PRODUCT_CONSTITUTION.md#version-history](./PRODUCT_CONSTITUTION.md#version-history).

---

## What is the official reference?

| Document | Role |
|----------|------|
| **[MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** | **Phase 1 umbrella** — sections & delivery tracks (not one mega-PR) |
| **[MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md)** | Sections 1–5: review, **admin operations**, recovery, email, notifications |
| **[SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)** | Section 6 / track **E** — tickets & messaging |
| **[PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)** | **Highest vision** — Smart Workspace & Hub (**Phase 2** on roadmap) |
| **[ROADMAP.md](./ROADMAP.md)** | Phase 1 (Member Ops & Communication) → Phase 2 (Hub) |
| **[PRODUCT_DECISIONS/](./PRODUCT_DECISIONS/)** | Product Decision Records (PDR) |
| **[GLOSSARY.md](./GLOSSARY.md)** | Terms (Admin Operations, Support & Messages Center, …) |

Legacy path `docs/features/SMART_ROLE_PROFILE_HUB.md` redirects here; do not fork the constitution in feature folders.

---

## Who owns decisions?

| Area | Owner | Notes |
|------|--------|--------|
| **Product constitution & PDRs** | Founder / Product | Changes via reviewed PR; Founder approval for new PDRs or constitution amendments |
| **Roadmap phases & gates** | Founder + engineering lead | P0+ work does not start without phase approval in ROADMAP |
| **Technical ADRs** | Engineering | `docs/adr/` for database, Auth, security mechanics |
| **Implementation** | Engineering (Cursor, humans) | Must comply with constitution + PDRs + RLS/RPC rules |

When in doubt: ask *which workspace benefits?* (constitution design gate) and check whether a **PDR** already answers *why*.

---

## Recommended reading order

1. **This README** — scope and ownership  
2. **[MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** — Phase 1 umbrella  
3. **[MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md)** + **[SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)** — section detail  
4. **[PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)** — Hub (roadmap Phase 2)  

For registration, Auth, and production recovery, also read `docs/REGISTRATION_FLOW_AUDIT.md`, `docs/PRODUCTION_RECOVERY_MANIFEST.md`, and applicable `docs/adr/` entries.

---

## Adding or changing documentation

- **New product/architecture choice** → add `PRODUCT_DECISIONS/PDR-NNN.md` (next number), link from constitution if strategic.  
- **Phase or priority change** → update `ROADMAP.md` + Founder approval in PR description.  
- **New term** → add to `GLOSSARY.md`.  
- **Constitution change** → rare; requires Founder sign-off; update **Last updated** on this README.

---

## Quick links

- Umbrella: [MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)  
- Phase 1 detail: [MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md) · [SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)  
- Constitution: [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)  
- PDR index: [PRODUCT_DECISIONS/PDR-001.md](./PRODUCT_DECISIONS/PDR-001.md) … [PDR-005](./PRODUCT_DECISIONS/PDR-005.md)  
- Roadmap: [ROADMAP.md](./ROADMAP.md)  
- Glossary: [GLOSSARY.md](./GLOSSARY.md)
