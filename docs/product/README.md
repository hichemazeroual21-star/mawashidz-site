# MawashiDZ — Product documentation library

**Last updated:** 2026-07-27

This folder is the **official product reference** for MawashiDZ: member operations, constitution, decisions, roadmap, and shared vocabulary. Engineering ADRs (e.g. member ID allocation) live under `docs/adr/`; **product direction and workspace philosophy** live here.

**Document types (do not mix):**

| Type | Files | Contains |
|------|--------|----------|
| **Product requirements** | `MEMBER_OPERATIONS_AND_COMMUNICATION.md`, `MEMBER_OPERATIONS.md`, `SUPPORT_AND_MESSAGES_CENTER.md`, `PRODUCT_CONSTITUTION.md` | Goals, requirements, permissions, UX, scenarios, **acceptance criteria**, **non-goals** |
| **Delivery plan** | `ROADMAP.md` | Tracks, steps, gates, branches, migrations, status |
| **Decisions** | `PRODUCT_DECISIONS/` | PDR — why we chose X |
| **Terms** | `GLOSSARY.md` | Naming |

**Hierarchy:** For **platform vision, trust, roles, NON-GOALS, and phase order**, **[../constitution/MAWASHIDZ_CONSTITUTION.md](../constitution/MAWASHIDZ_CONSTITUTION.md)** **v3.0 FROZEN** and **[../constitution/ROADMAP.md](../constitution/ROADMAP.md)** are highest authority. **[PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) v1.5+** is **subordinate** and governs **Smart Workspace / Hub card mechanics only** (Phase 4), unless a newer **approved PDR** supersedes a Hub mechanic detail. **Phase 1 track detail:** [ROADMAP.md](./ROADMAP.md). Public marketing claims: [../constitution/PUBLIC_CLAIMS_POLICY.md](../constitution/PUBLIC_CLAIMS_POLICY.md).

**Governance (Founder-approved):** Do not scatter major product decisions in random files. **Update the constitution** when vision changes; **add a PDR** for each important product/architecture choice; **update the roadmap** when execution order changes.

---

## Product library version history

| Version | Date | Summary |
|---------|------|---------|
| **1.0** | 2026-07-23 | `docs/product/` created; Product Constitution, PDR-001–005, Glossary, Roadmap |
| **1.1** | 2026-07-23 | Member Operations & Communication System (Phase 1 before Hub) |
| **1.2** | 2026-07-23 | Constitution SSOT clause; version history; Founder merge approval |
| **1.3** | 2026-07-23 | Split detail specs; roadmap tree |
| **1.4** | 2026-07-23 | Umbrella phase; Admin Operations named |
| **1.5** | 2026-07-23 | PRD vs ROADMAP split; non-goals; per-section acceptance criteria |

Constitution-only versions: see [PRODUCT_CONSTITUTION.md#version-history](./PRODUCT_CONSTITUTION.md#version-history).

---

## What is the official reference?

| Document | Role |
|----------|------|
| **[MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** | **Phase 1 umbrella** — sections & delivery tracks (not one mega-PR) |
| **[MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md)** | Sections 1–5: review, **admin operations**, recovery, email, notifications |
| **[SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)** | Section 6 / track **E** — tickets & messaging |
| **[PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)** | Smart Workspace & Hub mechanics — subordinate; canonical **Phase 4** |
| **[ROADMAP.md](./ROADMAP.md)** | Phase 1 delivery detail — sequencing yields to the constitution roadmap |
| **[../product-roadmap/README.md](../product-roadmap/README.md)** | Arabic-first guided roadmap book — explanatory, not an SSOT |
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
2. **[../product-roadmap/README.md](../product-roadmap/README.md)** — guided overview and QR/offline proposal boundaries
3. **[MEMBER_OPERATIONS_AND_COMMUNICATION.md](./MEMBER_OPERATIONS_AND_COMMUNICATION.md)** — Phase 1 umbrella
4. **[MEMBER_OPERATIONS.md](./MEMBER_OPERATIONS.md)** + **[SUPPORT_AND_MESSAGES_CENTER.md](./SUPPORT_AND_MESSAGES_CENTER.md)** — section detail
5. **[PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)** — Hub mechanics (canonical roadmap Phase 4)

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
- Guided roadmap book: [../product-roadmap/README.md](../product-roadmap/README.md)
- Glossary: [GLOSSARY.md](./GLOSSARY.md)
