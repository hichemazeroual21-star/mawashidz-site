#!/usr/bin/env node
/**
 * Post-deploy smoke: email outbox drain endpoint.
 *
 * Requires:
 *   EMAIL_OUTBOX_SECRET  — bearer for POST /api/process-email-outbox
 * Optional:
 *   ORIGIN               — default https://mawashidz.com
 *   RESEND_API_KEY       — if set, verify From domain appears verified in Resend
 *   EMAIL_FROM           — expected from; default MawashiDZ <noreply@mawashidz.com>
 *
 * Does not print secrets. Exit 1 on failure.
 */
const ORIGIN = (process.env.ORIGIN || 'https://mawashidz.com').replace(/\/+$/, '');
const secret = process.env.EMAIL_OUTBOX_SECRET || '';
const expectedFrom = process.env.EMAIL_FROM || 'MawashiDZ <noreply@mawashidz.com>';
const resendKey = process.env.RESEND_API_KEY || '';

if (!secret) {
  console.error('FAIL: set EMAIL_OUTBOX_SECRET to run smoke:email-outbox');
  process.exit(1);
}

function domainFromAddress(from) {
  const m = String(from).match(/@([a-z0-9.-]+)>?$/i) || String(from).match(/@([a-z0-9.-]+)/i);
  return m ? m[1].toLowerCase() : '';
}

const res = await fetch(`${ORIGIN}/api/process-email-outbox`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ limit: 10 }),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.error(`FAIL: non-JSON response HTTP ${res.status}: ${text.slice(0, 200)}`);
  process.exit(1);
}

console.log(`HTTP ${res.status}`);
console.log(JSON.stringify({
  processed: body.processed,
  provider: body.provider,
  from: body.from,
  results: (body.results || []).map((r) => ({
    id: r.id,
    status: r.status,
    error: r.error || null,
    resend_status: r.resend_status ?? null,
  })),
  error: body.error || null,
  detail: body.detail || null,
}, null, 2));

if (res.status !== 200) {
  console.error(`FAIL: expected HTTP 200, got ${res.status}`);
  process.exit(1);
}

const from = body.from || expectedFrom;
if (from !== expectedFrom && !process.env.EMAIL_FROM) {
  console.warn(`WARN: response from="${from}" differs from default ${expectedFrom}`);
}

const domain = domainFromAddress(from);
if (!domain) {
  console.error(`FAIL: could not parse domain from from="${from}"`);
  process.exit(1);
}
console.log(`ok: from domain=${domain}`);

if (resendKey) {
  const dres = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  const dtext = await dres.text();
  let domainsPayload;
  try {
    domainsPayload = JSON.parse(dtext);
  } catch {
    console.error(`FAIL: Resend /domains non-JSON HTTP ${dres.status}`);
    process.exit(1);
  }
  if (!dres.ok) {
    console.error(`FAIL: Resend /domains HTTP ${dres.status}`, domainsPayload);
    process.exit(1);
  }
  const list = domainsPayload?.data || domainsPayload || [];
  const match = (Array.isArray(list) ? list : []).find((d) => String(d.name || '').toLowerCase() === domain);
  const status = match?.status || match?.region || null;
  console.log(`Resend domain lookup for ${domain}:`, match ? { status: match.status, id: match.id } : 'NOT FOUND');
  if (!match) {
    console.error(`FAIL: domain ${domain} not found in Resend account (verify domain or set EMAIL_FROM)`);
    process.exit(1);
  }
  const st = String(match.status || '').toLowerCase();
  if (st && st !== 'verified' && st !== 'already_verified') {
    console.error(`FAIL: Resend domain ${domain} status=${match.status} (need verified)`);
    process.exit(1);
  }
  console.log(`ok: Resend domain ${domain} looks verified`);
} else {
  console.log('skip: RESEND_API_KEY unset — not checking Resend domain verification');
}

console.log('smoke:email-outbox ok');
