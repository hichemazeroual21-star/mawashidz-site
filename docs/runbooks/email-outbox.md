# Email outbox

**Phase:** 1.C  
**Endpoint:** `POST /api/process-email-outbox`

## Env (Cloudflare Worker secrets)

| Name | Required | Purpose |
|------|----------|---------|
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Claim/mark outbox RPCs |
| `RESEND_API_KEY` | For sends | Without it, rows marked `skipped` (visible, not silent) |
| `EMAIL_FROM` | No | Default `MawashiDZ <noreply@mawashidz.com>` |
| `EMAIL_OUTBOX_SECRET` | No | Alternate bearer; defaults to service role key |

## Call

```bash
curl -X POST https://mawashidz.com/api/process-email-outbox \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Schedule via cron (Cloudflare Cron Trigger or external) every 1–5 minutes.

## Rollback

Unset `RESEND_API_KEY` → no external sends; outbox remains for ops visibility.
