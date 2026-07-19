# MawashiDZ Security Notes

Last updated: 2026-07-19 (Phase 0 v1.8.2 — legacy backfill + jwt_role clarity)

## Frontend role values (verified)

Inspected file: `index.html` only (no other signup frontend exists in this repo).

| Source | Exact values |
|--------|----------------|
| Registration tabs `data-role` (L1866) | `breeder`, `vet`, `feed`, `buyer`, `manager`, `ambassador`, `partner` |
| Hidden input `#roleInput` default (L1869) | `breeder` |
| `setRole()` / `openRegister()` / `openManager()` | same set; manager via `openManager()` → `openRegister('manager')` |
| Signup metadata `data.role` (L2370–2371) | `role: raw.role` → exactly the `#roleInput` value above |

**Not sent by signup** (display aliases only in `registrationRoleLabel`, L2018–2021):
`admin`, `rancher`, `veterinarian`, `feed_trader`, `wilaya_manager`

**Not present anywhere in repo:** `feed_seller`

Assumption check: suspected wire values `veterinarian` / `feed_seller` / `wilaya_manager` **do not match** what signup actually sends. Real wire values match the SQL canonical short forms.

Canonical SQL mapping: `public.mdz_role_prefix()` / `public.mdz_normalize_role()`  
Alias mappings kept for defense-in-depth only.

---

## Known risks and resolution status

### 1) Anonymous email enumeration via `resolve_login_identifier`
| | |
|--|--|
| **Risk** | `anon` can call the RPC with a phone/MDZ and learn whether an account exists (returns email or null). |
| **Status** | **Open — accepted for Phase 0 login UX** |
| **Mitigation now** | Returns email only; does not distinguish match type; no user enumeration of passwords. |
| **Plan** | Phase 1: rate-limit (Edge/Worker), constant-time responses, generic login errors, optional CAPTCHA. |

### 2) Anonymous counter exhaustion via `allocate_member_id`
| | |
|--|--|
| **Risk** | Unauthenticated callers burn sequential IDs. |
| **Status** | **Resolved (Phase 0 hardening)** |
| **Mitigation now** | `REVOKE` execute from `PUBLIC` / `anon` / `authenticated`. Allocation only via `SECURITY DEFINER` `handle_new_user`. |
| **Note** | Frontend `allocateMemberId()` will fall back to random IDs for display; those values are **ignored** by the trigger. |

### 3) Client-controlled `member_id`
| | |
|--|--|
| **Risk** | Signup metadata previously could choose/spoof `member_id`. |
| **Status** | **Resolved (Phase 0 hardening)** |
| **Mitigation now** | `handle_new_user` discards client `member_id` and always calls `allocate_member_id` server-side. Profile trigger blocks later mutation. |

### 4) Client-controlled `status`
| | |
|--|--|
| **Risk** | Client could attempt `status=approved` via metadata or update. |
| **Status** | **Resolved (Phase 0 hardening)** |
| **Mitigation now** | New profiles always insert `status='pending'`. Client metadata `status` ignored. Update trigger blocks non-`service_role` status changes once set. |

---

## Production policy
- Do not apply SQL from agents/CI automatically.
- Owner applies migrations manually in Supabase SQL Editor after review.
- No automatic merges.
