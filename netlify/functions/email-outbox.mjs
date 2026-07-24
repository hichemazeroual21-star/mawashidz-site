/**
 * Process email_outbox via Resend.
 * - Claims rows into `processing` (lease) via mdz_claim_email_outbox
 * - Without RESEND_API_KEY: requeue to pending (never permanent skip)
 * - Failed sends stay failed; attempts capped in SQL claim
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY?, EMAIL_FROM?, EMAIL_OUTBOX_SECRET?
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
  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
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

async function sendResend({ apiKey, from, to, subject, text }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const payload = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(payload?.message || `resend_${r.status}`);
    err.payload = payload;
    throw err;
  }
  return payload;
}

export async function processEmailOutbox(request, runtimeEnv = {}) {
  const get = (name) => envOf(request, runtimeEnv, name);
  const supabaseUrl = get('SUPABASE_URL') || get('MDZ_SUPABASE_URL');
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY') || get('MDZ_SERVICE_ROLE_KEY');
  const secret = get('EMAIL_OUTBOX_SECRET') || serviceKey;
  const resendKey = get('RESEND_API_KEY');
  const from = get('EMAIL_FROM') || 'MawashiDZ <noreply@mawashidz.com>';
  const workerId = get('CF_WORKER_NAME') || 'mawashidz-live';

  if (request.method !== 'POST') {
    return json(405, { error: 'method-not-allowed' });
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!secret || bearer !== secret) {
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
    // Fallback to 1-arg overload if 012 not applied yet
    try {
      claimed = await supabaseRpc(supabaseUrl, serviceKey, 'mdz_claim_email_outbox', { p_limit: 20 });
      if (!Array.isArray(claimed)) claimed = claimed ? [claimed] : [];
    } catch (error2) {
      console.error('claim outbox failed', error2);
      return json(503, { error: 'claim-failed' });
    }
  }

  const results = [];
  for (const row of claimed) {
    try {
      if (!resendKey) {
        // Requeue — do not permanent-skip
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: 'pending',
          p_error: 'awaiting_resend_api_key',
        });
        results.push({ id: row.id, status: 'requeued' });
        continue;
      }
      await sendResend({
        apiKey: resendKey,
        from,
        to: row.recipient_email,
        subject: row.subject,
        text: row.body_text,
      });
      await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
        p_id: row.id,
        p_status: 'sent',
      });
      results.push({ id: row.id, status: 'sent' });
    } catch (error) {
      console.error('send failed', row.id, error);
      const attempts = Number(row.attempts || 0);
      const next = attempts >= 8 ? 'failed' : 'pending';
      try {
        await supabaseRpc(supabaseUrl, serviceKey, 'mdz_mark_email_outbox', {
          p_id: row.id,
          p_status: next,
          p_error: String(error.message || error).slice(0, 500),
        });
      } catch { /* ignore */ }
      results.push({ id: row.id, status: next === 'failed' ? 'failed' : 'retry' });
    }
  }

  return json(200, {
    processed: results.length,
    results,
    provider: resendKey ? 'resend' : 'none',
  });
}

export default async function handler(request) {
  return processEmailOutbox(request, typeof process !== 'undefined' ? process.env : {});
}
