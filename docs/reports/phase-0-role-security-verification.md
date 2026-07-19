# Blocking verification — frontend roles vs SQL (pre-Production)

Date: 2026-07-19  
Branch: `cursor/phase0-db-foundation-ba07`

## STOP finding vs assumptions

| Assumption (suspected wire values) | Actual signup wire values |
|------------------------------------|---------------------------|
| `veterinarian` | **not sent** |
| `feed_seller` | **not present in repo** |
| `wilaya_manager` | **not sent** (display alias only) |
| — | **Actually sent:** `breeder`, `vet`, `feed`, `buyer`, `manager`, `ambassador`, `partner` |

**Verdict:** Real frontend role values **differ from the suspicion**, and **match** the SQL canonical short forms. Alias mappings added only as defense-in-depth.

## Files inspected
- `index.html` (sole frontend/signup surface in this repository)
  - L1866 tabs `data-role`
  - L1869 `#roleInput`
  - L2008–2024 `registrationRoleLabel` (display aliases only)
  - L2085 `ROLE_PREFIX`
  - L2187–2201 `openRegister` / `setRole`
  - L2370–2371 `signUpAccount` metadata `role: raw.role`

No other JS/TS signup clients found.
