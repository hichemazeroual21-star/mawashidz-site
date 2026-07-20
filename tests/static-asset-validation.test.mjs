#!/usr/bin/env node
/**
 * Validates Cloudflare Workers deploy artifact:
 * wrangler.jsonc → public/ (synced via scripts/sync-worker-public.mjs)
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const wranglerPath = join(root, 'wrangler.jsonc');
const syncScript = join(root, 'scripts/sync-worker-public.mjs');

assert.ok(existsSync(wranglerPath), 'wrangler.jsonc must exist for Cloudflare Workers deploy');
assert.ok(existsSync(syncScript), 'scripts/sync-worker-public.mjs must exist');

const wrangler = JSON.parse(readFileSync(wranglerPath, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/,\s*}/g, '}'));
assert.equal(wrangler.assets?.directory, './public', 'wrangler.jsonc must serve ./public');

execSync('node scripts/sync-worker-public.mjs', { stdio: 'inherit' });

const publicRoot = join(root, 'public');
const indexPath = join(publicRoot, 'index.html');
const regModule = join(publicRoot, 'js/registration-flow.mjs');
const dashModule = join(publicRoot, 'js/mdz-dashboards.mjs');
const citiesPath = join(publicRoot, 'assets/algeria_cities.json');
const cnamePath = join(publicRoot, 'CNAME');

assert.ok(existsSync(indexPath), 'public/index.html must exist after sync');
assert.ok(existsSync(regModule), 'public/js/registration-flow.mjs must exist after sync');
assert.ok(existsSync(dashModule), 'public/js/mdz-dashboards.mjs must exist after sync');
assert.ok(existsSync(citiesPath), 'public/assets/algeria_cities.json must exist after sync');
assert.ok(existsSync(cnamePath), 'public/CNAME must exist after sync');
assert.ok(!existsSync(join(publicRoot, 'node_modules')), 'public/ must not contain node_modules');

const html = readFileSync(indexPath, 'utf8');
assert.match(html, /runRegistrationPipeline/, 'index.html must reference runRegistrationPipeline');
assert.match(html, /registerFormSubmitting/, 'index.html must include double-submit guard');
assert.match(html, /import\('\.\/js\/registration-flow\.mjs'\)/, 'index.html must dynamic-import registration-flow.mjs');
assert.match(html, /updateAuthChrome/, 'index.html must use updateAuthChrome');
assert.match(html, /member_id يُخصَّص على السيرفر/, 'registration must rely on server-side member_id allocation');
assert.ok(!/await allocateMemberId\(raw\.role\)/.test(html), 'registration must not call allocateMemberId RPC from browser');
const payloadBlock = html.match(/const payload=\{[\s\S]*?founding_terms_accepted:checked\(form,'founder_terms'\)\s*\}/);
assert.ok(payloadBlock && !payloadBlock[0].includes('member_id:ids.memberId'),
  'registrations REST payload must not send member_id/registration_id as top-level columns (PGRST204 on legacy DB)');

const coupledPattern = /try\s*\{[\s\S]*signUpAccount[\s\S]*await supabaseInsert\('registrations'/;
assert.ok(!coupledPattern.test(html), 'old coupled signUp+registrations try/catch must be removed');

console.log('  ✓ Cloudflare Workers static artifact validation passed (wrangler.jsonc + public/)');
