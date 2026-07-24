# Feature Discipline — What MawashiDZ Refuses to Build (For Now)

**Version:** 1.0  
**Date:** 2026-07-24  

A successful platform is defined as much by refusal as by delivery.

---

## Feature validation checklist (mandatory)

Before any feature:

1. Does it solve a real problem?  
2. Who benefits?  
3. How often will it be used?  
4. Is there a simpler solution?  
5. Unnecessary complexity?  
6. Maintenance cost?  
7. Security risk?  
8. Continuous support burden?  
9. Can it scale?  
10. Can new developers understand it?  
11. Will users discover it?  
12. Would removing it make the product worse?

If most answers are **No** → do not implement.

---

## Do not implement

| Feature | Reason | Tag |
|---------|--------|-----|
| Unlinked social DMs / “chat anyone” | PRD non-goal; fraud & moderation hell | Recommendation |
| Voice/video calls in messaging v1 | Support PRD non-goal; cost | Recommendation |
| AI auto-reply bots v1 | Support PRD non-goal | Recommendation |
| Blockchain livestock registry | No verified necessity | Recommendation |
| Cryptocurrency payments | No purpose; regulatory hazard | Recommendation |
| Microservices architecture now | Premature optimization | Recommendation |
| Hard-delete of tickets/messages | Audit & dispute needs | Verified Fact (PRD) |
| Client-only security gates | Not security | Verified Fact (principle) |
| Parallel five marketplaces | Dilution; cold start ×5 | Recommendation |
| AI medical diagnosis | Liability; trust destruction | Recommendation |
| Decorative analytics dashboards without ops metrics | Vanity | Recommendation |
| Duplicate registration workflows | Confusion | Recommendation |
| Competitor-feature cloning without research | Feature creep | Recommendation |

---

## Postpone

| Feature | Until | Tag |
|---------|-------|-----|
| Dedicated Broker role + CRM | Field research proves need | Recommendation |
| Commission tracking | Business model + broker decision | Long-Term Idea |
| Membership PDF cards | Approval trust + brand lock | Recommendation |
| Full herd ERP (feed consumption, breeding graphs, weights) | Listing MVP + research | Recommendation |
| Offline write sync | Conflict rules + connectivity research | Long-Term Idea |
| WhatsApp integration as product backbone | Founder policy; keep as optional notify bridge only | Long-Term Idea |
| E2EE messaging | Clarify moderation/audit model | Long-Term Idea |
| Equipment / insurance / labs marketplaces | After livestock commerce works | Long-Term Idea |
| Government API integrations | Legal agreement | Long-Term Idea |
| International expansion | Algeria success | Long-Term Idea |
| Push/SMS/WhatsApp notification fan-out | In-app + email foundation | Recommendation |
| Hub AI assistant as marketing centerpiece | Data + Founder AI policy | Long-Term Idea |
| CEO multi-email single identity | Real ops need | Long-Term Idea |

---

## Simplify (reject complexity inside good ideas)

| Idea | Simplified form | Tag |
|------|-----------------|-----|
| Rich multimedia messenger | Ticket threads + image attachments later | Recommendation |
| Animal passport + theft freeze + delivery tracking at once | Animal profile fields on listing first | Recommendation |
| 58 wilaya managers on day one with full tooling | Pilot few wilayas; expand | Recommendation |
| Event bus + CMS + ingest + AI + search simultaneously | ROADMAP phases already correct — obey them | Verified Fact + Recommendation |
| End-to-end encrypted everything | TLS + RLS + audit first | Recommendation |

---

## Premature optimization blacklist

- Distributed architecture without scale evidence  
- Complex caching before measuring  
- ML fraud models before labeled abuse data  
- Custom mobile apps before mobile web workflows work  

---

## UI complexity rules

- One primary objective per screen  
- No training required for core flows  
- No deep navigation for daily tasks  
- Prefer guided empty states over dense widgets  
- Prefer Smart Workspace pillars over dashboard widget walls  

---

## When to say no

Reject features that:

- Add little value  
- Create maintenance burden  
- Complicate onboarding  
- Duplicate another feature  
- Lack user research  
- Cannot be maintained for five years  

**Recommendation:** Product/engineering may veto wishlist items using this document even if they appear in older draft constitution prose.
