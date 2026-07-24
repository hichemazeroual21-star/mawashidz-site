# Founder Decisions Required

**Version:** 1.0  
**Date:** 2026-07-24  
**Rule:** Implementation of related features pauses until decisions are documented.

No Critical row should remain blank before marketplace MVP development.

| Decision | Reason | Business impact | Technical impact | Urgency | Recommended options | Founder approval |
|----------|--------|-----------------|------------------|---------|---------------------|------------------|
| Long-term mission statement | Aligns all roadmaps | Defines success | Filters backlog | Critical | Trust+operations for Algerian livestock economy | **Yes** |
| 5-year success definition | Prevent vanity metrics | Hiring & investment narrative | Analytics taxonomy | Critical | WAU operators + completed sales cycles + verified vets | **Yes** |
| Algeria-only vs expansion | Multi-country tenancy cost | Focus vs dilution | Locale, currency, law | Critical | Algeria-only for 5 years | **Yes** |
| Free vs paid model | Revenue vs adoption | Survival | Entitlements schema | Critical | Free core + optional professional tools later | **Yes** |
| Advertising policy | Trust risk | Brand | Ad slots / none | High | No ads until trust established; never fake listings as ads | **Yes** |
| Vet paid subscription? | Vet adoption sensitivity | Supply of verified vets | Billing | Medium | Free verification first | **Yes** |
| Brand identity lock | Consistency | Marketing | Design tokens | High | Founder-owned palette/type/voice | **Yes** |
| ToS / Privacy / retention | Legal exposure | Launch readiness | Data deletion jobs | Critical | External legal counsel draft | **Yes** |
| Veterinary disclaimer | Medical liability | Vet participation | Certificate UX copy | Critical | Platform ≠ clinical care provider | **Yes** |
| Marketplace allowed species / categories | Moderation scope | Liquidity | Listing schema enums | High | Sheep/goat/cattle/camel first; poultry later | **Yes** |
| Seller verification bar | Friction vs fraud | Adoption | KYC fields, manual review | Critical | Hybrid: light signup + manual approve + progressive trust | **Yes** |
| Price visibility before login | Funnel design | Conversion | RLS for public listing preview | High | Public browse listings; contact requires account | **Yes** |
| Messaging before verification | Spam/fraud | Trust | Ticket gates | High | Messaging only after approval | **Yes** |
| Broker role | Role sprawl | Intermediary inclusion | RLS complexity | High | No dedicated role Year 1; profile flag later | **Yes** |
| Relationship to Adhahi.dz / state tools | Legal/brand | Positioning | Integrations | High | Complementary private commerce; no false official claim | **Yes** |
| Synthetic price board labeling | Honesty | Reputation | Copy/API meta | Critical | Always “indicative/reference” until real feeds | **Yes** |
| Payments / escrow | Complexity & regulation | Monetization | PCI, providers | High | Out of scope Year 1; offline cash + documented deal | **Yes** |
| AI that influences buy/medical decisions | Safety | Trust | Model governance | High | Assistive only; human final; Founder gate each use case | **Yes** |
| Account deletion philosophy | Privacy vs audit | Support load | Soft-delete rules | Medium | Soft-delete profile; retain immutable audit | **Yes** |
| Government data requests process | Compliance | Risk | Access runbooks | Medium | Legal-reviewed playbook | **Yes** |
| Ambassador & Partner meaning | Code already has prefixes | Confusion | Role cleanup | Medium | Define or freeze issuing new ones | **Yes** |
| Seasonal Aid mode | Peak demand | GTM | Feature flags | High | Special listing/verification mode for Aid season | **Yes** |
| Smart Workspace vs Dashboard wording in Arabic UI | Consistency | UX clarity | i18n keys | Medium | Keep Smart Workspace / مساحة عمل ذكية | **Yes** (confirm) |
| Priority: Member Ops vs Hub P0 | ROADMAP already gates | Delivery risk | Branch policy | Critical | Enforce existing ROADMAP gates | **Yes** (reaffirm) |

## Output rule

**Recommendation:** No marketplace listing schema PR merges until Critical rows above are decided and filed as PDR or constitution amendment.
