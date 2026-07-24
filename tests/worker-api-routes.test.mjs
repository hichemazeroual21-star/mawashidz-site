#!/usr/bin/env node
/**
 * Smoke-test Worker API routing (news + prices handlers) without Cloudflare deploy.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker/index.mjs';

const root = process.cwd();
assert.ok(existsSync(join(root, 'worker/index.mjs')));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const fakeAssets = {
  fetch: async () => new Response('asset-ok', { status: 200 }),
};

// prices — deterministic market snapshot
{
  const req = new Request('https://mawashidz.com/api/livestock-prices');
  const res = await worker.fetch(req, { ASSETS: fakeAssets });
  const okStatus = res.status === 200;
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  check('prices: HTTP 200', okStatus, `status=${res.status}`);
  check('prices: has rows', Array.isArray(body?.rows) && body.rows.length > 0, `rows=${body?.rows?.length}`);
  check('prices: has products', Array.isArray(body?.products) && body.products.length > 0);
}

// unknown API → JSON 404 (not asset HTML)
{
  const req = new Request('https://mawashidz.com/api/does-not-exist');
  const res = await worker.fetch(req, { ASSETS: fakeAssets });
  const text = await res.text();
  check('unknown api: 404', res.status === 404, `status=${res.status}`);
  check('unknown api: json body', text.includes('not-found'));
}

// non-API → assets binding
{
  const req = new Request('https://mawashidz.com/index.html');
  const res = await worker.fetch(req, { ASSETS: fakeAssets });
  const text = await res.text();
  check('static passthrough', res.status === 200 && text === 'asset-ok');
}

// wrangler config consistency
{
  const wrangler = JSON.parse(
    readFileSync(join(root, 'wrangler.jsonc'), 'utf8')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1'),
  );
  check('wrangler name mawashidz-live', wrangler.name === 'mawashidz-live', wrangler.name);
  check('wrangler main worker/index.mjs', wrangler.main === 'worker/index.mjs');
}

const failed = results.filter((r) => !r.ok);
console.log(`\nWorker API route tests: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
