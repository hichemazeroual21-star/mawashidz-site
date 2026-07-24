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

console.log('  ✓ email outbox auth/method gates');
