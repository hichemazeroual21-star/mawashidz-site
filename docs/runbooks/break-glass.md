# Break-glass access

**Phase:** 0.8 / Constitution §3.2 & §13  
**Status:** Procedure template — **Founder must approve** named holders and offline storage  
**Secrets:** Never commit recovery passwords, TOTP seeds, or service-role keys to git  

## Purpose

Recover platform control when:

- Sole admin account is locked out  
- Auth provider misconfiguration blocks login  
- Suspected account takeover of elevated roles  

## Roles (fill with Founder approval — do not publish names in public forks if sensitive)

| Role | Duty | Named holder (ops secret) | Last drill |
|------|------|---------------------------|------------|
| Break-glass A | Supabase Dashboard owner / org owner | _offline only_ | _YYYY-MM-DD_ |
| Break-glass B | Cloudflare account + Worker deploy | _offline only_ | _YYYY-MM-DD_ |
| Break-glass C | DNS / domain registrar | _offline only_ | _YYYY-MM-DD_ |

## Offline packet (sealed)

Store **offline** (encrypted USB / sealed paper), not in this repo:

1. Supabase project ref + Dashboard URL  
2. Recovery admin email(s) not used daily  
3. Cloudflare account recovery path  
4. Location of `SUPABASE_SERVICE_ROLE_KEY` / `EMAIL_OUTBOX_SECRET` vault entries (not the values in cleartext notes if vault exists)  
5. This runbook version + date  

## Procedure (high level)

1. Confirm SEV1 with second person when possible.  
2. Retrieve offline packet.  
3. Prefer Dashboard recovery over pasting service role into ad-hoc scripts.  
4. If SQL break-glass required: use service role from vault in a controlled shell; log ticket ID + time in incident notes; rotate keys after.  
5. Restore least privilege; remove temporary elevation.  
6. Postmortem within 72h (`incident-response.md`).

## Quarterly drill

- [ ] Locate offline packet without Slack/email  
- [ ] Prove Dashboard login with recovery admin (staging preferred)  
- [ ] Record date in table above (ops copy)  
- [ ] Rotate any credential that was exposed during drill  

## Explicit gaps (honest)

Until Founder fills holders and completes one drill, Constitution §3.2 “documented and tested” break-glass is **Not Verified** in production evidence terms.
