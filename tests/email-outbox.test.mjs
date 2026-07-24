#!/usr/bin/env node
import assert from 'node:assert/strict';
import { processEmailOutbox } from '../netlify/functions/email-outbox.mjs';

{
  const res = await processEmailOutbox(new Request('https://mawashidz.com/api/process-email-outbox', { method: 'GET' }), {});
  assert.equal(res.status, 405);
}

{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
    }),
    { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret', EMAIL_OUTBOX_SECRET: 'secret' },
  );
  assert.equal(res.status, 401);
}

{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
    }),
    { EMAIL_OUTBOX_SECRET: 'secret' },
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'supabase-not-configured');
}

// Mock claim + requeue when Resend missing
{
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    calls.push({ u, body: init?.body });
    if (u.includes('/rpc/mdz_claim_email_outbox')) {
      return new Response(JSON.stringify([{
        id: 7,
        recipient_email: 'a@b.c',
        subject: 'Hi',
        body_text: 'Body',
        attempts: 1,
        status: 'processing',
      }]), { status: 200 });
    }
    if (u.includes('/rpc/mdz_mark_email_outbox')) {
      return new Response('null', { status: 200 });
    }
    return new Response('{}', { status: 500 });
  };
  try {
    const res = await processEmailOutbox(
      new Request('https://mawashidz.com/api/process-email-outbox', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret' },
      }),
      {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'secret',
        EMAIL_OUTBOX_SECRET: 'secret',
        // no RESEND_API_KEY
      },
    );
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.provider, 'none');
    assert.equal(payload.results[0].status, 'requeued');
    const mark = calls.find((c) => c.u.includes('mdz_mark_email_outbox'));
    assert.ok(mark);
    assert.match(String(mark.body), /"p_status":"pending"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('  ✓ email outbox auth/method gates + requeue without Resend');
