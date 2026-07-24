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
assert.equal(wrangler.assets?.binding, 'ASSETS', 'wrangler.jsonc must bind ASSETS for Worker script');
assert.deepEqual(wrangler.assets?.run_worker_first, ['/api/*'], 'wrangler.jsonc must run worker first for /api/*');
assert.equal(wrangler.main, 'worker.mjs', 'wrangler.jsonc must set main to worker.mjs');
assert.equal(wrangler.name, 'mawashidz-live', 'wrangler.jsonc name must be production worker mawashidz-live');

execSync('npm run build', { stdio: 'inherit' });

const publicRoot = join(root, 'public');
const indexPath = join(publicRoot, 'index.html');
const regModule = join(publicRoot, 'js/registration-flow.mjs');
const dashModule = join(publicRoot, 'js/mdz-dashboards.mjs');
const citiesPath = join(publicRoot, 'assets/algeria_cities.json');
const cnamePath = join(publicRoot, 'CNAME');
const buildInfoPath = join(publicRoot, 'build-info.json');
const headersPath = join(publicRoot, '_headers');

assert.ok(existsSync(buildInfoPath), 'public/build-info.json must exist after npm run build');
const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf8'));
assert.ok(buildInfo.version && buildInfo.commit && buildInfo.builtAt, 'build-info must include version, commit, builtAt');
assert.equal(buildInfo.worker, wrangler.name, 'build-info.worker must match wrangler.jsonc name');
assert.ok(existsSync(join(root, 'worker.mjs')), 'worker.mjs must exist for API routes');
assert.ok(buildInfo.version !== '1.9.0', 'build-info version must not be legacy 1.9.0');
assert.ok(existsSync(headersPath), 'public/_headers must exist after build (cache policy)');

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
