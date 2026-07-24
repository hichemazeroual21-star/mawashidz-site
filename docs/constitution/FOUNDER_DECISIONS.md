# MawashiDZ — Founder Decision Log
**Canonical path:** `docs/constitution/FOUNDER_DECISIONS.md`
**Status:** Open — decisions required before blocked features can proceed

---

> This document tracks every decision that must be made by the Founder before engineering can proceed.
> It is not a technical document. It is a governance document.
> Engineering must not substitute its own judgment for any item listed here.

---

## Decision Status Keys

| Symbol | Meaning |
|--------|---------|
| 🔴 BLOCKING | Directly blocks feature development; resolve immediately |
| 🟡 HIGH | Must be resolved within 30 days |
| 🟢 MEDIUM | Must be resolved before Phase 3 |
| 🔵 LONG-TERM | Revisit annually |

---

## FD-001: Market Price Data Attribution

**Status:** 🔴 BLOCKING

**Current situation:**
The current market price display uses **simulated, hash-generated prices** attributed to `وزارة الفلاحة` (MADR / Ministry of Agriculture). The `source` and `sourceName` fields in the market engine reference `madr.gov.dz` but the data is not from that source.

**Decision required:**
The Founder must choose one of:
1. Remove the MADR attribution and label prices clearly as "estimated reference prices" or "indicative market prices"
2. Establish a real data partnership with MADR or a licensed data provider
3. Remove market price display entirely until verified data is available

**Business impact:** Option 1 is lowest risk and can be implemented immediately. Options 2 and 3 require more time.
**Legal impact:** Falsely attributing simulated data to a government ministry could attract regulatory scrutiny.
**Technical impact:** Changing label text is a one-hour fix.

**Recommended action:** Implement Option 1 immediately, pursue Option 2 as a long-term goal.

---

## FD-002: Ambassador and Partner Role Definition

**Status:** 🟡 HIGH

**Current situation:**
The `ambassador` (B) and `partner` (P) roles exist in the member ID system and are shown as registration options internally, but have no defined product workflow, permissions, or UI.

**Decision required:**
The Founder must define:
- What is an ambassador's role in the platform?
- What additional capabilities do they receive vs. a regular member?
- Are partners business entities (feed suppliers, vets) or a separate category?
- Should these roles appear in the public registration form?

**Recommended action:** Until defined, hide these roles from the public registration form. Assign them manually only. Document the intended purpose within 30 days.

---

## FD-003: Password Policy

**Status:** 🟡 HIGH

**Current situation:**
No password policy exists. Users can register with any password, including single characters.

**Decision required:**
Approve the following minimum standards (or modify them):
- Minimum 8 characters
- At least one letter and one number
- Block the 100 most common passwords
- Password change required after admin reset

**Technical impact:** Requires frontend validation + Supabase Auth configuration.

---

## FD-004: Veterinary Health Statement Legal Disclaimer

**Status:** 🟡 HIGH

**Situation:**
When veterinarians publish health records or issue certificates through MawashiDZ, there is a legal question about platform liability if an animal's health status causes a buyer harm.

**Decision required:**
The Founder must:
1. Engage legal counsel to draft a liability disclaimer
2. Decide whether veterinary certificates through MawashiDZ are "official" documents or "informational"
3. Define what validation of ONVAF (national veterinary order) membership is required

**Recommended action:** Do not activate veterinarian health certificate features until legal review is complete.

---

## FD-005: Revenue Model and Monetization Timeline

**Status:** 🟢 MEDIUM

**Options for Founder review:**

| Model | When to Start | Notes |
|-------|--------------|-------|
| Free tier (all features) | Now | User acquisition priority |
| Verified badge (paid) | Year 2 | Low trust risk |
| Featured listings | Year 2 | Sellers pay for visibility |
| Vet professional subscription | Year 2 | Monthly for premium tools |
| Transaction commission | Year 3+ | High value, requires trust first |

**Decision required:** Approve revenue model phasing before Year 2 development.

---

## FD-006: German Language Retention

**Status:** 🟢 MEDIUM

**Situation:**
The platform supports Arabic, English, French, and German. German has no apparent user base or strategic rationale for the Algerian livestock market.

**Decision required:**
- Retain German (maintain translation quality across all 4 languages)
- Remove German and redirect maintenance effort to AR/FR quality
- Add Tamazight/Kabyle instead of or in addition to German

---

## FD-007: Broker Role Definition

**Status:** 🟢 MEDIUM

**Situation:**
In Algerian livestock culture, a broker (سمسار) is a common intermediary. The platform currently has no broker role. The `ambassador` role may overlap with this concept.

**Decision required:**
- Is "broker" a distinct role requiring its own workspace and permissions?
- Or are brokers simply breeders with enhanced listing and negotiation capabilities?
- Should brokers receive a commission-tracking feature?

**Engineering dependency:** Affects Phase 3 marketplace design.

---

## FD-008: Member-to-Member Direct Messaging Policy

**Status:** 🟢 MEDIUM

**Situation:**
Phase 1 messaging is support and operational only. Phase 3 plans to enable member-to-member messaging linked to transactions. The Founder must decide the model.

**Options:**
1. Member-to-member messaging allowed only when linked to a specific listing or vet case
2. Member-to-member messaging allowed freely once both accounts are verified
3. No direct member-to-member messaging; all communication goes through ticketing

**Recommended:** Option 1. Minimizes abuse, aligns with platform purpose.

---

## FD-009: Data Retention Periods

**Status:** 🟢 MEDIUM

**Decision required for each data category:**

| Data | Minimum Retention | Recommended |
|------|------------------|-------------|
| Audit logs | 5 years | 7 years |
| Support tickets | 3 years | 5 years |
| Closed listings | 2 years | 3 years |
| Animal health records | Lifetime of animal | Indefinitely |
| Messages | 2 years | 5 years |
| Account data after deletion | 30 days | 30 days |
| Media (photos, documents) | See media policy | See media policy |

---

## FD-010: Wilaya Manager Accountability Framework

**Status:** 🟡 HIGH

**Situation:**
58 wilaya managers will be responsible for registration approvals and local moderation. The platform does not currently define:
- How managers are recruited and vetted
- What happens if a manager is inactive (pending queue grows)
- Whether managers are paid or volunteer
- How managers are replaced if they leave or become unresponsive
- What constitutes manager misconduct and how it is handled

**Decision required:**
Define the operational framework for wilaya manager recruitment, onboarding, accountability, and replacement before the manager workspace is publicly used.

---

## FD-011: Legal Entity and Terms of Service

**Status:** 🔴 BLOCKING (for production use with real user data)

**Situation:**
The platform collects personal data (names, phone numbers, wilaya, photos of animals). Operating without a Privacy Policy, Terms of Service, and a registered legal entity may violate Algerian data protection law.

**Decision required:**
1. What legal entity owns MawashiDZ?
2. Has legal counsel reviewed the platform's data collection practices?
3. Is a Privacy Policy and Terms of Service published before user data is collected?
4. How are GDPR (for international users) and Algerian equivalent regulations handled?

**Recommended action:** Legal review required before any public launch.

---

## FD-012: Account Permanent Deletion Policy

**Status:** 🟢 MEDIUM

**Conflict:**
- User privacy rights: users should be able to delete their account and data
- Platform integrity: immutable audit logs and transaction history must be preserved

**Recommended resolution:**
- Anonymize personal data (name, phone, email) on account deletion request
- Preserve anonymized records for audit purposes
- Allow complete deletion only when no commercial transactions are linked to the account
- Implement a 30-day grace period before permanent deletion

The Founder must confirm this approach with legal counsel.

---

*This document is reviewed and updated before every major platform release.*
*Last updated: 2026-07-24*
