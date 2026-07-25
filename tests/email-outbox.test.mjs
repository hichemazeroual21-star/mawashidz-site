#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processEmailOutbox } from '../netlify/functions/email-outbox.mjs';

const baseEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  EMAIL_OUTBOX_SECRET: 'outbox-secret-distinct',
};

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
    baseEnv,
  );
  assert.equal(res.status, 401);
}

// MDZ-P1-EMAIL-003: missing distinct secret
{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer service-role-key' },
    }),
    {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      // no EMAIL_OUTBOX_SECRET
    },
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'email-outbox-secret-required');
}

{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer service-role-key' },
    }),
    {
      ...baseEnv,
      EMAIL_OUTBOX_SECRET: 'service-role-key', // same as service — forbidden
    },
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'email-outbox-secret-must-differ');
}

// MDZ-P1-EMAIL-003: service-role bearer rejected when distinct secret is configured
{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer service-role-key' },
    }),
    baseEnv,
  );
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, 'unauthorized');
}

{
  const res = await processEmailOutbox(
    new Request('https://mawashidz.com/api/process-email-outbox', {
      method: 'POST',
      headers: { Authorization: 'Bearer outbox-secret-distinct' },
    }),
    { EMAIL_OUTBOX_SECRET: 'outbox-secret-distinct' },
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'supabase-not-configured');
}

function mockFetchSequence(handlers) {
  const original = globalThis.fetch;
  let i = 0;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const body = init?.body ? String(init.body) : '';
    calls.push({ u, body, headers: init?.headers || {} });
    const handler = handlers[i++] || handlers[handlers.length - 1];
    return handler({ u, body, init });
  };
  return {
    calls,
    restore() { globalThis.fetch = original; },
  };
}

// MDZ-P1-EMAIL-001: ≥8 cron cycles without Resend stay requeued; then send after key added
{
  const awaitingMarks = [];
  for (let cycle = 1; cycle <= 8; cycle += 1) {
    const mock = mockFetchSequence([
      () => new Response(JSON.stringify([{
        id: 7,
        recipient_email: 'a@b.c',
        subject: 'Hi',
        body_text: 'Body',
        // SQL 013 undoes claim bump on awaiting_*; row stays claimable indefinitely without key
        attempts: cycle,
        status: 'processing',
      }]), { status: 200 }),
      ({ body }) => {
        awaitingMarks.push(body);
        assert.match(body, /"p_status":"pending"/);
        assert.match(body, /awaiting_resend_api_key/);
        return new Response('null', { status: 200 });
      },
    ]);
    try {
      const res = await processEmailOutbox(
        new Request('https://mawashidz.com/api/process-email-outbox', {
          method: 'POST',
          headers: { Authorization: 'Bearer outbox-secret-distinct' },
        }),
        { ...baseEnv /* no RESEND */ },
      );
      assert.equal(res.status, 200);
      const payload = await res.json();
      assert.equal(payload.results[0].status, 'requeued');
      assert.equal(payload.provider, 'none');
    } finally {
      mock.restore();
    }
  }
  assert.equal(awaitingMarks.length, 8);

  const mockSend = mockFetchSequence([
    () => new Response(JSON.stringify([{
      id: 7, recipient_email: 'a@b.c', subject: 'Hi', body_text: 'Body', attempts: 1, status: 'processing',
    }]), { status: 200 }),
    ({ u, init }) => {
      assert.match(u, /api\.resend\.com/);
      assert.equal(init.headers['Idempotency-Key'], 'mdz-outbox-7');
      return new Response(JSON.stringify({ id: 're_after_wait' }), { status: 200 });
    },
    ({ body }) => {
      assert.match(body, /"p_status":"sent"/);
      assert.match(body, /re_after_wait/);
      return new Response('null', { status: 200 });
    },
  ]);
  try {
    const res = await processEmailOutbox(
      new Request('https://mawashidz.com/api/process-email-outbox', {
        method: 'POST',
        headers: { Authorization: 'Bearer outbox-secret-distinct' },
      }),
      { ...baseEnv, RESEND_API_KEY: 're_test' },
    );
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.results[0].status, 'sent');
    assert.equal(payload.results[0].provider_message_id, 're_after_wait');
  } finally {
    mockSend.restore();
  }
  // Does not prove live cron or live Resend delivery — only worker logic + SQL contract in 013.
}

// MDZ-P1-EMAIL-002: provider success + mark failure still records provider id path
{
  const mock = mockFetchSequence([
    () => new Response(JSON.stringify([{
      id: 9, recipient_email: 'a@b.c', subject: 'Hi', body_text: 'Body', attempts: 1, status: 'processing',
    }]), { status: 200 }),
    ({ u, init }) => {
      assert.match(u, /api\.resend\.com/);
      assert.equal(init.headers['Idempotency-Key'], 'mdz-outbox-9');
      return new Response(JSON.stringify({ id: 're_abc' }), { status: 200 });
    },
    () => new Response(JSON.stringify({ message: 'mark boom' }), { status: 500 }),
    ({ body }) => {
      assert.match(body, /provider_ok_mark_pending|re_abc|"p_provider_message_id":"re_abc"/);
      return new Response('null', { status: 200 });
    },
  ]);
  try {
    const res = await processEmailOutbox(
      new Request('https://mawashidz.com/api/process-email-outbox', {
        method: 'POST',
        headers: { Authorization: 'Bearer outbox-secret-distinct' },
      }),
      { ...baseEnv, RESEND_API_KEY: 're_test' },
    );
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.results[0].status, 'provider_ok_mark_pending');
    assert.equal(payload.results[0].provider_message_id, 're_abc');
  } finally {
    mock.restore();
  }
}

// Reconcile path when provider_message_id already present
{
  const mock = mockFetchSequence([
    () => new Response(JSON.stringify([{
      id: 3, recipient_email: 'a@b.c', subject: 'Hi', body_text: 'Body', attempts: 2,
      status: 'processing', provider_message_id: 're_prev',
    }]), { status: 200 }),
    ({ body }) => {
      assert.match(body, /"p_status":"sent"/);
      assert.match(body, /re_prev/);
      return new Response('null', { status: 200 });
    },
  ]);
  try {
    const res = await processEmailOutbox(
      new Request('https://mawashidz.com/api/process-email-outbox', {
        method: 'POST',
        headers: { Authorization: 'Bearer outbox-secret-distinct' },
      }),
      { ...baseEnv, RESEND_API_KEY: 're_test' },
    );
    assert.equal((await res.json()).results[0].status, 'reconciled');
    assert.ok(!mock.calls.some((c) => c.u.includes('api.resend.com')));
  } finally {
    mock.restore();
  }
}

// MDZ-P1-EMAIL-004: no 1-arg claim fallback — claim failure returns 503
{
  const mock = mockFetchSequence([
    () => new Response(JSON.stringify({ message: 'no 2-arg fn' }), { status: 404 }),
  ]);
  try {
    const res = await processEmailOutbox(
      new Request('https://mawashidz.com/api/process-email-outbox', {
        method: 'POST',
        headers: { Authorization: 'Bearer outbox-secret-distinct' },
      }),
      baseEnv,
    );
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'claim-failed-require-012');
    assert.equal(mock.calls.length, 1);
    assert.match(mock.calls[0].body, /p_worker_id/);
  } finally {
    mock.restore();
  }
}

const src = readFileSync(join(process.cwd(), 'netlify/functions/email-outbox.mjs'), 'utf8');
assert.ok(!src.includes("mdz_claim_email_outbox', { p_limit: 20 }") || src.includes('claim-failed-require-012'));
assert.ok(!/Fallback to 1-arg/.test(src));

const m013 = readFileSync(join(process.cwd(), 'supabase/migrations/013_email_outbox_p0_hardening.sql'), 'utf8');
assert.match(m013, /provider_message_id/);
assert.match(m013, /awaiting_/);
assert.match(m013, /greatest\(0, attempts - 1\)/);
assert.match(m013, /drop function if exists public\.mdz_claim_email_outbox\(int\)/i);

console.log('  ✓ email outbox P0 gates (secret, await attempts, idempotency, no 1-arg claim)');
