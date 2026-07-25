import { normalizeSupabaseUrl } from '../../scripts/lib/supabase-url.mjs';

/**
 * Process email_outbox via Resend.
 * - Requires EMAIL_OUTBOX_SECRET (distinct from service role) as HTTP bearer
 * - Claims via 2-arg mdz_claim_email_outbox only (012+); fail-closed otherwise
 * - Without RESEND_API_KEY: requeue pending without exhausting attempt budget (013)
 * - Idempotency-Key + provider_message_id prevent duplicate sends after mark failure
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMAIL_OUTBOX_SECRET, RESEND_API_KEY?, EMAIL_FROM?
 * SUPABASE_URL must be project root (no trailing slash, no /rest/v1) — see normalizeSupabaseUrl.
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function envOf(request, runtimeEnv, name) {
  return runtimeEnv?.[name]
    || (typeof process !== 'undefined' && process.env && process.env[name])
    || '';
}

async function supabaseRpc(baseUrl, serviceKey, fn, args) {
  const base = normalizeSupabaseUrl(baseUrl);
  const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(args || {}),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const err = new Error(`rpc_${fn}_${r.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

async function sendResend({ apiKey, from, to, subject, text, idempotencyKey }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = String(idempotencyKey).slice(0, 256);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const payload = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = payload?.message || payload?.name || `resend_${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.payload = payload;
    console.error('resend send failed', {
      status: r.status,
      from,
      to,
      message: msg,
      payload,
    });
    throw err;
  }
  return payload;
}

export async function processEmailOutbox(request, runtimeEnv = {}) {
  const get = (name) => envOf(request, runtimeEnv, name);
  const supabaseUrlRaw = get('SUPABASE_URL') || get('MDZ_SUPABASE_URL');
  // Normalize on every invoke (Worker has no separate boot hook).
  const supabaseUrl = normalizeSupabaseUrl(supabaseUrlRaw);
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY') || get('MDZ_SERVICE_ROLE_KEY');
  const outboxSecret = get('EMAIL_OUTBOX_SECRET');
  const resendKey = get('RESEND_API_KEY');
  const from = get('EMAIL_FROM') || 'MawashiDZ <noreply@mawashidz.com>';
  const workerId = get('CF_WORKER_NAME') || 'mawashidz-live';

  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  if (!outboxSecret) {
    return json(503, { error: 'email-outbox-secret-required' });
  }
  if (serviceKey && outboxSecret === serviceKey) {
    return json(503, { error: 'email-outbox-secret-must-differ' });
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!bearer || bearer !== outboxSecret) {
    return json(401, { error: 'unauthorized' });
  }
  // Belt-and-suspenders: never treat service-role as a valid outbox bearer
  if (serviceKey && bearer === serviceKey) {
    return json(401, { error: 'unauthorized' });
  }

  if (!supabaseUrl || !serviceKey) {
    return json(503, { error: 'supabase-not-configured' });
  }

  let claimed = [];
  try {
    claimed = await supabaseRpc(supabaseUrl, serviceKey, 'mdz_claim_email_outbox', {
      p_limit: 20,
      p_worker_id: workerId,
    });
    if (!Array.isArray(claimed)) claimed = claimed ? [claimed] : [];
  } catch (error) {
    console.error('claim outbox failed (require migration 012+ two-arg claim)', error);
    // Temporary: surface PostgREST/Supabase payload so operators can see PGRST* / 401 / 404
    return json(503, {
      error: 'claim-failed-require-012',
      detail: String(error?.message || error).slice(0, 500),
      supabase: error?.payload ?? null,
    });
  }

  const results = [];
  for (const row of claimed) {
    try {
      if (row.provider_message_id) {
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: 'sent',
          p_provider_message_id: row.provider_message_id,
        });
        results.push({ id: row.id, status: 'reconciled' });
        continue;
      }

      if (!resendKey) {
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: 'pending',
          p_error: 'awaiting_resend_api_key',
        });
        results.push({ id: row.id, status: 'requeued' });
        continue;
      }

      const payload = await sendResend({
        apiKey: resendKey,
        from,
        to: row.recipient_email,
        subject: row.subject,
        text: row.body_text,
        idempotencyKey: `mdz-outbox-${row.id}`,
      });
      const providerId = payload?.id || `resend-ok-${row.id}`;

      try {
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: 'sent',
          p_provider_message_id: providerId,
        });
        results.push({ id: row.id, status: 'sent', provider_message_id: providerId });
      } catch (markErr) {
        // Provider succeeded; persist provider id even if full mark fails on retry path
        console.error('mark sent failed after provider success', row.id, markErr);
        try {
          await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
            p_id: row.id,
            p_status: 'processing',
            p_error: 'provider_ok_mark_pending',
            p_provider_message_id: providerId,
          });
        } catch { /* next claim reconciles via provider_message_id */ }
        results.push({ id: row.id, status: 'provider_ok_mark_pending', provider_message_id: providerId });
      }
    } catch (error) {
      const errText = String(error?.message || error).slice(0, 500);
      console.error('send failed', {
        id: row.id,
        error: errText,
        resendStatus: error?.status ?? null,
        resend: error?.payload ?? null,
        from,
      });
      const attempts = Number(row.attempts || 0);
      const next = attempts >= 8 ? 'failed' : 'pending';
      try {
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: next,
          p_error: errText,
        });
      } catch { /* ignore */ }
      results.push({
        id: row.id,
        status: next === 'failed' ? 'failed' : 'retry',
        error: errText,
        from,
        resend_status: error?.status ?? null,
        resend: error?.payload ?? null,
      });
    }
  }

  return json(200, {
    processed: results.length,
    results,
    provider: resendKey ? 'resend' : 'none',
    from,
  });
}

export default async function handler(request) {
  return processEmailOutbox(request, typeof process !== 'undefined' ? process.env : {});
}
