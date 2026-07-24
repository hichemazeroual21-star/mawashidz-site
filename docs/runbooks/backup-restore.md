# Backup & restore

**Phase:** 0.8 stub  
**Constitution:** §13 Reliability

## Philosophy

- Primary backup: Supabase automated daily backups (plan-dependent).  
- Treat restore as a practiced skill, not a theory.  
- Immutable ledgers (audit, ownership later) make point-in-time restore the recovery path — not “edit history.”

## Quarterly drill

1. Note current time and a known `profiles.member_id`.  
2. In Supabase dashboard, initiate restore to a **staging** project (never overwrite production without Founder approval).  
3. Verify: auth user exists, profile row, `user_roles` if any, `admin_audit_log` readable by admin RPC.  
4. Record RTO/RPO observed in incident notes.  
5. Update this runbook with actual timings.

## Year-1 RTO/RPO targets (aspirational)

| Metric | Target |
|--------|--------|
| RPO | ≤ 24h (plan backup window) |
| RTO | ≤ 4h for staging-validated restore path |

Tighten after production traffic justifies.

## Related

- [incident-response.md](./incident-response.md)  
- [../constitution/TECHNICAL_DEBT_REGISTER.md](../constitution/TECHNICAL_DEBT_REGISTER.md)
