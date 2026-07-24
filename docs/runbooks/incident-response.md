# Incident response

**Phase:** 0.8 stub  
**Constitution:** §13 Reliability

## Severity

| Level | Examples | Response |
|-------|----------|----------|
| **SEV1** | Auth down, data leak, mass spam registrations | Page Founder + admin; public status note |
| **SEV2** | Review RPC broken, wilaya queue stuck | Fix within hours; audit log review |
| **SEV3** | Single-user bugs, cosmetic | Next business day |

## First 30 minutes

1. Confirm blast radius (Auth vs Worker vs Supabase vs DNS).  
2. Freeze risky deploys.  
3. Preserve evidence (timestamps, request IDs, audit rows).  
4. If abuse: tighten rate limits / disable public insert path temporarily via SQL policy if needed.  
5. Notify Founder for SEV1.

## Postmortem (within 72h for SEV1–2)

- Timeline  
- Root cause  
- What Constitution/runbook missed  
- Follow-up PR (no silent strategy change)

## Break-glass

See **[break-glass.md](./break-glass.md)** for the Constitution §3.2 procedure template.  
Founder / `super_admin` recovery accounts and offline recovery notes are **ops secrets** — not stored in git. Verify access quarterly with backup drill. Until a drill is recorded, break-glass remains **Not Verified**.
