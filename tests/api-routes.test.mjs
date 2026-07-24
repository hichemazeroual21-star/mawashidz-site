#!/usr/bin/env node
/**
 * Worker API route tests — routing, methods, ASSETS fallback, trailing slash.
 * Prices handler is pure (no network). News is only asserted for wiring + method gate.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker.mjs';

const root = process.cwd();
const wrangler = JSON.parse(
  readFileSync(join(root, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/,\s*}/g, '}'),
);

assert.equal(wrangler.name, 'mawashidz-live', 'production worker name must be mawashidz-live');
assert.equal(wrangler.main, 'worker.mjs', 'worker entry must be worker.mjs');
assert.equal(wrangler.assets?.binding, 'ASSETS', 'assets.binding ASSETS is required for env.ASSETS.fetch');
assert.deepEqual(wrangler.assets?.run_worker_first, ['/api/*'], 'API routes must run worker first');

const env = {
  ASSETS: {
    fetch: async (req) => new Response(`static:${new URL(req.url).pathname}`, { status: 200 }),
  },
};

async function get(path, init = {}) {
  return worker.fetch(new Request(`https://mawashidz.com${path}`, init), env);
}

// --- prices ---
{
  const res = await get('/api/livestock-prices');
  assert.equal(res.status, 200, 'prices endpoint must return 200');
  const prices = await res.json();
  assert.ok(Array.isArray(prices.rows) && prices.rows.length > 0, 'prices must include rows');
  assert.ok(prices.products?.length, 'prices must include products');
}

// trailing slash normalization
{
  const res = await get('/api/livestock-prices/');
  assert.equal(res.status, 200, 'trailing slash prices path must work');
}

// method gate
{
  const post = await get('/api/livestock-prices', { method: 'POST' });
  assert.equal(post.status, 405, 'POST must be rejected');
  assert.equal((await post.json()).error, 'method-not-allowed');

  const head = await get('/api/livestock-prices', { method: 'HEAD' });
  assert.equal(head.status, 200, 'HEAD must succeed without body work');
  assert.equal(await head.text(), '', 'HEAD body must be empty');
}

// news route is wired (may be 200 or 503 depending on RSS availability)
{
  const res = await get('/api/livestock-news');
  assert.ok([200, 503].includes(res.status), `news must return 200 or 503, got ${res.status}`);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
}

// static fallback
{
  const res = await get('/index.html');
  assert.equal(res.status, 200, 'static assets must fall through to ASSETS');
  assert.match(await res.text(), /^static:/, 'unknown paths must delegate to ASSETS binding');
}

// missing ASSETS binding must not throw — returns controlled 500
{
  const res = await worker.fetch(new Request('https://mawashidz.com/no-such-page'), {});
  assert.equal(res.status, 500, 'missing ASSETS binding must return 500, not crash');
  const body = await res.json();
  assert.equal(body.error, 'assets-binding-missing');
}

console.log('  ✓ Worker API routes: prices, methods, trailing slash, ASSETS guard, news wiring');
