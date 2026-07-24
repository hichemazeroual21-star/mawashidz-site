# Email outbox

**Phase:** 1.C (elevated)  
**Endpoint:** `POST /api/process-email-outbox`  
**Scheduler:** Cloudflare Cron `*/2 * * * *` via Worker `scheduled` handler (`wrangler.jsonc`)

## Behavior (post-012)

1. Worker claims rows with `mdz_claim_email_outbox(limit, worker_id)` → status `processing` + lease (`locked_at` / `locked_by`).
2. Stale `processing` locks older than 10 minutes are recovered to `pending`.
3. Without `RESEND_API_KEY`, rows are **requeued to `pending`** (never permanent `skipped`).
4. Send failures requeue to `pending` until attempts ≥ 8, then `failed`.
5. Successful sends → `sent` + `sent_at`.

## Env (Cloudflare Worker secrets)

| Name | Required | Purpose |
|------|----------|---------|
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Claim/mark outbox RPCs |
| `RESEND_API_KEY` | For sends | Without it, outbox stays pending for later |
| `EMAIL_FROM` | No | Default `MawashiDZ <noreply@mawashidz.com>` |
| `EMAIL_OUTBOX_SECRET` | Strongly recommended | Bearer for the HTTP endpoint; defaults to service role key if unset |

## Manual drain

```bash
curl -X POST https://mawashidz.com/api/process-email-outbox \
  -H "Authorization: Bearer $EMAIL_OUTBOX_SECRET"
```

## Apply order

`010` → `011` → `012_phase1_quality_elevation.sql`

## Rollback

Unset `RESEND_API_KEY` → no external sends; pending rows remain visible for ops. Cron can stay enabled.
