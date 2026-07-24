# Email outbox runbook

**Authority:** Constitution §8 (Phase 1 communications).  
**Migrations:** `010` (base) → `012` (processing lease) → `013` (P0 hardening: provider idempotency + awaiting-provider attempt policy).

**HTTP path (canonical):** `POST /api/process-email-outbox`  
Do **not** use `/api/email-outbox` — that path is not registered on the Worker.

## Required secrets

| Secret | Required | Notes |
|--------|----------|--------|
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; never accept as HTTP bearer for this endpoint |
| `EMAIL_OUTBOX_SECRET` | **Yes** | Distinct shared secret for Worker/cron → `/api/process-email-outbox`. **Must not** equal the service-role key. Without it the Worker skips drain and the HTTP endpoint returns **503**. |
| `RESEND_API_KEY` | For delivery | Without it, rows stay `pending` with `awaiting_resend_api_key` and **attempts are not exhausted** (013). |

## Worker cron

`wrangler.jsonc` schedules `*/2 * * * *`. Cron calls `POST /api/process-email-outbox` with:

`Authorization: Bearer ${EMAIL_OUTBOX_SECRET}`

If `EMAIL_OUTBOX_SECRET` is unset, cron **skips** (logs a clear error) — it does **not** fall back to the service-role key.

## Operator drain (manual)

```bash
curl -sS -X POST "$ORIGIN/api/process-email-outbox" \
  -H "Authorization: Bearer $EMAIL_OUTBOX_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":25}'
```

- Wrong/missing bearer → **401** (or **503** if secret not configured).  
- Service-role bearer alone → **401** (rejected by design).

## Behaviour after 013

1. **Awaiting provider:** missing Resend → mark `pending` + `awaiting_resend_api_key` and **decrement** the claim attempt so ≥8 cron cycles without a key still leave the row claimable.
2. **Idempotency:** Resend `Idempotency-Key: mdz-outbox-<uuid>`; after provider success, mark with `provider_message_id`. If mark fails after provider OK, row may show `provider_ok_mark_pending`; next claim reconciles to `sent` when `provider_message_id` is already set (no second send).
3. **Fail-closed claim:** only the 2-arg claim (`p_limit`, `p_worker_id`) exists. Missing 012/013 → drain errors; **no** 1-arg non-atomic claim fallback.

## Safe deploy order

1. Apply migrations `012` then `013` on Supabase **before** deploying Worker code that calls 4-arg mark / provider id.  
2. Set `EMAIL_OUTBOX_SECRET` (new random value ≠ service role) on Worker.  
3. Deploy Worker (`worker.mjs` + `netlify/functions/email-outbox.mjs`).  
4. Set `RESEND_API_KEY` when ready to deliver.  
5. Run **live smoke** (not covered by `npm run test:ci`): claim → send → mark sent; awaiting-key behaviour; cron tick.  
   See [PHASE1_LIVE_SMOKE_EVIDENCE_2026-07-24.md](./PHASE1_LIVE_SMOKE_EVIDENCE_2026-07-24.md) — **Phase 1 is not Verified** until the operator Must checklist passes on a deployed tip.

## What static tests do **not** prove

- Live Resend delivery  
- Live cron on Cloudflare  
- Production migration apply  
- End-to-end inbox → email for a real member  
