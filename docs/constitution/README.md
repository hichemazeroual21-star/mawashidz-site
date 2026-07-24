# MawashiDZ Constitution — Directory
**Canonical path:** `docs/constitution/README.md`
**Last updated:** 2026-07-24

---

This directory contains the official MawashiDZ Constitution documents. These are the highest authority documents for the platform. Every product decision, architecture choice, and implementation must be reconcilable with the Constitution.

## Documents

| Document | Purpose |
|----------|---------|
| [CONSTITUTION.md](./CONSTITUTION.md) | **Master Constitution v2.0** — complete platform governance, architecture, gaps, risks, roadmap, and glossary |
| [FOUNDER_DECISIONS.md](./FOUNDER_DECISIONS.md) | Decisions that must be made by the Founder before engineering can proceed |
| [RISK_REGISTER.md](./RISK_REGISTER.md) | All identified risks with probability, impact, and mitigation |
| [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) | Features to build (phased), defer (future), and reject (permanently) with justification |
| [FIELD_RESEARCH.md](./FIELD_RESEARCH.md) | Field research plan — what must be validated with real users before major feature decisions |

## Review Protocol

These documents must be reviewed:
- Before every major product release
- When the business model changes materially
- When a new role or significant feature is added
- When the security architecture changes
- Annually (minimum)

## Authority Hierarchy

```
CONSTITUTION.md (highest authority)
    ↓
FOUNDER_DECISIONS.md (governance gates)
    ↓
docs/product/PRODUCT_CONSTITUTION.md (product vision)
    ↓
docs/product/ROADMAP.md (delivery plan)
    ↓
docs/adr/ and docs/product/PRODUCT_DECISIONS/ (individual decisions)
    ↓
Implementation (code)
```

The Constitution is always the source of truth. Implementation follows the Constitution, never the opposite.

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-07-24 | Initial Constitution directory created; v2.0 Constitution written from repository analysis |
