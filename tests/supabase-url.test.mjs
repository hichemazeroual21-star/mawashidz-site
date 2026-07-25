/**
 * Unit tests: SUPABASE_URL normalization (PGRST125 /rest/v1 footgun).
 */
import assert from 'node:assert/strict';
import { normalizeSupabaseUrl, validateSupabaseUrlConfig } from '../scripts/lib/supabase-url.mjs';

const warnings = [];
const warn = (m) => warnings.push(m);

assert.equal(
  normalizeSupabaseUrl('https://abc.supabase.co', { warn }),
  'https://abc.supabase.co',
);
assert.equal(warnings.length, 0);

assert.equal(
  normalizeSupabaseUrl('https://abc.supabase.co/', { warn }),
  'https://abc.supabase.co',
);

warnings.length = 0;
assert.equal(
  normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/', { warn }),
  'https://abc.supabase.co',
);
assert.ok(warnings.some((w) => /\/rest\/v1/.test(w)));

warnings.length = 0;
assert.equal(
  normalizeSupabaseUrl('https://abc.supabase.co/rest/v1', { warn }),
  'https://abc.supabase.co',
);

const bad = validateSupabaseUrlConfig('https://abc.supabase.co/rest/v1/');
assert.equal(bad.ok, false);
assert.ok(bad.errors.some((e) => /rest\/v1/.test(e)));
assert.equal(bad.normalized, 'https://abc.supabase.co');

const good = validateSupabaseUrlConfig('https://abc.supabase.co');
assert.equal(good.ok, true);

// Claim path contract: normalize then append /rest/v1/rpc/
const base = normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/', { warn: () => {} });
assert.equal(`${base}/rest/v1/rpc/mdz_claim_email_outbox`, 'https://abc.supabase.co/rest/v1/rpc/mdz_claim_email_outbox');

console.log('  ✓ supabase-url normalize + validate');
