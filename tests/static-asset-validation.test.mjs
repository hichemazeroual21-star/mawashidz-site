#!/usr/bin/env node
/** Validates deploy-critical static assets (Netlify publish = repo root). */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const indexPath = join(root, 'index.html');
const modulePath = join(root, 'js/registration-flow.mjs');
const dashPath = join(root, 'js/mdz-dashboards.mjs');
const citiesPath = join(root, 'assets/algeria_cities.json');

assert.ok(existsSync(indexPath), 'index.html must exist');
assert.ok(existsSync(modulePath), 'js/registration-flow.mjs must exist');
assert.ok(existsSync(dashPath), 'js/mdz-dashboards.mjs must exist');
assert.ok(existsSync(citiesPath), 'assets/algeria_cities.json must exist');

const html = readFileSync(indexPath, 'utf8');
assert.match(html, /runRegistrationPipeline/, 'index.html must reference runRegistrationPipeline');
assert.match(html, /registerFormSubmitting/, 'index.html must include double-submit guard');
assert.match(html, /import\('\.\/js\/registration-flow\.mjs'\)/, 'index.html must dynamic-import registration-flow.mjs');
assert.match(html, /updateAuthChrome/, 'index.html must use updateAuthChrome');

const coupledPattern = /try\s*\{[\s\S]*signUpAccount[\s\S]*await supabaseInsert\('registrations'/;
assert.ok(!coupledPattern.test(html), 'old coupled signUp+registrations try/catch must be removed');

console.log('  ✓ static asset validation passed');
