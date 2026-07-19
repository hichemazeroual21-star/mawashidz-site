#!/usr/bin/env node
/** Validates Worker public/ deploy artifact. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

execSync('node scripts/sync-worker-public.mjs', { stdio: 'inherit' });

const root = process.cwd();
const publicRoot = join(root, 'public');
const indexPath = join(publicRoot, 'index.html');
const modulePath = join(publicRoot, 'js/registration-flow.mjs');
const citiesPath = join(publicRoot, 'assets/algeria_cities.json');
const cnamePath = join(publicRoot, 'CNAME');

assert.ok(existsSync(indexPath), 'public/index.html must exist');
assert.ok(existsSync(modulePath), 'public/js/registration-flow.mjs must exist');
assert.ok(existsSync(citiesPath), 'public/assets/algeria_cities.json must exist');
assert.ok(existsSync(cnamePath), 'public/CNAME must exist');

const html = readFileSync(indexPath, 'utf8');
assert.match(html, /runRegistrationPipeline/, 'index.html must reference runRegistrationPipeline');
assert.match(html, /registerFormSubmitting/, 'index.html must include double-submit guard');
assert.match(html, /import\('\.\/js\/registration-flow\.mjs'\)/, 'index.html must dynamic-import registration-flow.mjs');

const coupledPattern = /try\s*\{[\s\S]*signUpAccount[\s\S]*await supabaseInsert\('registrations'/;
assert.ok(!coupledPattern.test(html), 'old coupled signUp+registrations try/catch must be removed');
assert.doesNotMatch(html, /function duplicateRegistrationMessage\(/, 'inline duplicateRegistrationMessage should be removed');

// Worker asset dir must not include node_modules
assert.ok(!existsSync(join(publicRoot, 'node_modules')), 'public/ must not contain node_modules');

console.log('  ✓ static deploy artifact validation passed');
