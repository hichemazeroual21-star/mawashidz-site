# Decision Log

Durable record of settled strategic and architectural choices.  
Amendments require Founder approval when they change Constitution meaning.

| Date | ID | Decision | Alternatives rejected | Why | Review |
|------|-----|----------|----------------------|-----|--------|
| 2026-07-24 | D-001 | Constitution v3.0 frozen as SSOT | Keep v2 draft sprawl | Single thesis; end review loops | On major release |
| 2026-07-24 | D-002 | Product thesis = identity + commerce (Algeria) | Everything-app vision | Focus Years 1–2 | 2027-07 |
| 2026-07-24 | D-003 | Animals before Hub | Hub-before-animals (old product gate courtesy) | Hub without objects is chrome | After Phase 2 |
| 2026-07-24 | D-004 | Tickets before open member chat | Full chat platform first | Ops + fraud | After Phase 3 |
| 2026-07-24 | D-005 | Broker as distinct membership (**engineering direction**; thin tools) — **FD-01 remains Proposed until Founder checkmark** | Broker inherits breeder | Algerian intermediary reality (needs field research) | After field research + FD-01 Decided |
| 2026-07-24 | D-006 | QR = opaque ID + verification API | PII-in-QR; blockchain passport | Threat model + simplicity | Before Phase 2 ship |
| 2026-07-24 | D-007 | Data classification (not absolute immutability) | Never-delete-anything | Privacy + storage at scale | With FD-06 |
| 2026-07-24 | D-008 | Years 1–2 NON-GOALS list | Soft “maybe later” ambiguity | Prevents scope creep | Annual |
| 2026-07-24 | D-009 | Medical AI forbidden until governance | AI-ready marketing | Liability | Until policy |
| 2026-07-24 | D-010 | Stay Supabase+edge; incremental modularization | Premature microservices / SPA rewrite | Risk vs benefit | When pain measured |
| 2026-07-24 | D-011 | Canonical roadmap in `docs/constitution/ROADMAP.md` | Dual conflicting roadmaps | One sequencing truth | — |
| 2026-07-24 | D-012 | Historical reviews archived, not authoritative | Keep competing SSOT docs | Freeze strategy | — |
| 2026-07-24 | D-013 | Phase 1 email = outbox + Resend adapter | Client EmailJS for membership outcomes | Keys stay server-side; PRD allows Resend/Brevo | After first prod sends |
| 2026-07-24 | D-014 | Support = typed tickets only (no DM) | Chat-style inbox | Constitution NON-GOAL | Phase 1 exit |
| 2026-07-24 | D-015 | Product Constitution subordinate to strategic Constitution + ROADMAP | Product doc as highest vision authority | Prevent Hub/feed scope bypass of NON-GOALS | — |
| 2026-07-24 | D-016 | Canonical migration path = numbered `supabase/migrations` + setup watermark (ADR-002) | Ignore dual path; immediate squash | TD-001 mitigation | After blank-install drill |
| 2026-07-24 | D-017 | Public trust claims must not imply shipped Phase 2+ capabilities | Market QR/passports as live services | Protect trust thesis | Continuous |

Pending Founder checkmarks: see [FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md) FD-01…FD-08, FD-10.

**Note on D-005:** Engineering may design toward distinct brokers; **do not ship irreversible broker schema or public promises** until FD-01 = Decided. Same pattern for FD-02 vs listing↔animal language in Constitution §4.
