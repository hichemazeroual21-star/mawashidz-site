#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import piiHold, { NETLIFY_PII_HOLD_DECISION_ID, config } from '../netlify/edge-functions/pii-hold.mjs';

const root = process.cwd();
const netlifyConfig = readFileSync(join(root, 'netlify.toml'), 'utf8');

assert.match(netlifyConfig, /\[build\][\s\S]*?publish\s*=\s*"netlify-hold"/);
assert.match(netlifyConfig, /edge_functions\s*=\s*"netlify\/edge-functions"/);
assert.match(netlifyConfig, /\[functions\][\s\S]*?directory\s*=\s*"netlify-disabled-functions"/);
assert.doesNotMatch(netlifyConfig, /functions\s*=\s*"netlify\/functions"/);
assert.doesNotMatch(netlifyConfig, /\.netlify\/functions\/(?:news|prices|email-outbox)/);
assert.match(netlifyConfig, /\[\[edge_functions\]\][\s\S]*?function\s*=\s*"pii-hold"[\s\S]*?path\s*=\s*"\/\*"/);
assert.deepEqual(config, { path: '/*', onError: 'fail' });

assert.equal(NETLIFY_PII_HOLD_DECISION_ID, 'MDZ-ENG-DEC-2026-08-06-ENFORCE-PII-HOLD-02');

function assertSecurity(response) {
  assert.equal(response.status, 503);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal(response.headers.get('x-mawashidz-hold'), NETLIFY_PII_HOLD_DECISION_ID);
  assert.match(response.headers.get('content-security-policy') || '', /connect-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /script-src 'none'/);
  assert.match(response.headers.get('content-security-policy') || '', /form-action 'none'/);
}

for (const path of [
  '/',
  '/index.html',
  '/register',
  '/build-info.json',
  '/public/index.html',
  '/worker.mjs',
  '/js/registration-flow.mjs',
  '/assets/i18n.js',
]) {
  const response = piiHold(new Request(`https://mawashidz.netlify.app${path}`));
  assertSecurity(response);
  const body = await response.text();
  assert.match(body, /مواشي ديزاد قيد التطوير/);
  assert.doesNotMatch(body, /الجوانب القانونية|الأمنية|معلومات شخصية|Temporary privacy hold/i);
  assert.doesNotMatch(body, /<form\b|<script\b|<input\b|emailjs|supabase/i);
}

for (const path of [
  '/api/auth/login',
  '/api/auth/recover',
  '/api/process-email-outbox',
  '/api/livestock-news',
  '/api/livestock-prices',
  '/.netlify/functions/news',
  '/.netlify/functions/prices',
  '/.netlify/functions/email-outbox',
]) {
  const response = piiHold(new Request(`https://mawashidz.netlify.app${path}`, { method: 'POST' }));
  assertSecurity(response);
  assert.deepEqual(await response.json(), { error: 'pii-hold-active' });
}

for (const path of ['/', '/api/auth/login', '/.netlify/functions/news']) {
  const response = piiHold(new Request(`https://mawashidz.netlify.app${path}`, { method: 'HEAD' }));
  assertSecurity(response);
  assert.equal(await response.text(), '');
}

function filesBelow(directory) {
  return readdirSync(directory).flatMap((name) => {
    const pathname = join(directory, name);
    return statSync(pathname).isDirectory() ? filesBelow(pathname) : [relative(join(root, 'netlify-hold'), pathname)];
  });
}

assert.deepEqual(filesBelow(join(root, 'netlify-hold')).sort(), [
  '_headers',
  '_redirects',
  'index.html',
]);
assert.deepEqual(readdirSync(join(root, 'netlify-disabled-functions')), ['.gitkeep']);

const fallbackHtml = readFileSync(join(root, 'netlify-hold/index.html'), 'utf8');
assert.match(fallbackHtml, /مواشي ديزاد قيد التطوير/);
assert.doesNotMatch(fallbackHtml, /الجوانب القانونية|الأمنية|معلومات شخصية|Temporary privacy hold/i);
assert.doesNotMatch(fallbackHtml, /<form\b|<script\b|<input\b|emailjs|supabase/i);
assert.match(readFileSync(join(root, 'netlify-hold/_headers'), 'utf8'), /form-action 'none'/);
assert.equal(readFileSync(join(root, 'netlify-hold/_redirects'), 'utf8').trim(), '/* /index.html 404!');

console.log('  ✓ Netlify PII hold: edge fail-closed, inert fallback only, application functions excluded');
