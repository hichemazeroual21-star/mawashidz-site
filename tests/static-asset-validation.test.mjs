#!/usr/bin/env node
/** Validates deploy artifact includes registration-flow integration. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const indexPath = join(root, 'index.html');
const modulePath = join(root, 'js/registration-flow.mjs');

assert.ok(existsSync(modulePath), 'js/registration-flow.mjs must exist in deploy artifact');
const html = readFileSync(indexPath, 'utf8');

assert.match(html, /runRegistrationPipeline/, 'index.html must reference runRegistrationPipeline');
assert.match(html, /registerFormSubmitting/, 'index.html must include double-submit guard');
assert.match(html, /import\('\.\/js\/registration-flow\.mjs'\)/, 'index.html must dynamic-import registration-flow.mjs');

const coupledPattern = /try\s*\{[\s\S]*signUpAccount[\s\S]*await supabaseInsert\('registrations'/;
assert.ok(!coupledPattern.test(html), 'old coupled signUp+registrations try/catch must be removed');

assert.doesNotMatch(html, /function duplicateRegistrationMessage\(/, 'inline duplicateRegistrationMessage should be removed');

console.log('  ✓ static deploy artifact validation passed');
