#!/usr/bin/env node
/**
 * Live probe: anon must not execute review_registration_status.
 * Skips softly if RPC is not deployed yet (404/PGRST202).
 */
const SUPABASE_URL = 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';

async function main() {
  // Prefer publishable key from index.html if env missing
  let key = SUPABASE_ANON;
  if (!key) {
    const html = await (await import('node:fs')).promises.readFile(new URL('../index.html', import.meta.url), 'utf8');
    const m = html.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/);
    key = m?.[1] || '';
  }
  if (!key) {
    console.log('  ⚠ skip review RPC anon probe — no publishable key');
    return;
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/review_registration_status`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_registration_id: 'MDZ-REG-DOES-NOT-EXIST',
      p_new_status: 'approved',
      p_reason: null,
    }),
  });

  if (r.status === 404 || r.status === 400) {
    const body = await r.text();
    if (/Could not find the function|PGRST202|404/.test(body) || r.status === 404) {
      console.log('  ⚠ review_registration_status not deployed yet — apply migration 007 on Supabase');
      return;
    }
  }

  // anon JWT has role anon — must fail auth/privileges, never succeed
  if (r.ok) {
    console.error('  ✗ anon must not successfully call review_registration_status');
    process.exit(1);
  }
  console.log(`  ✓ review_registration_status blocked for anon/unprivileged (HTTP ${r.status})`);
}

await main();
