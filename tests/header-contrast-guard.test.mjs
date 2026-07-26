#!/usr/bin/env node
/**
 * Guard: dark header ghost actions stay light on green chrome.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
assert.match(html, /\.top #headerActions \.mdz-btn-ghost/);
assert.match(html, /color:#fff!important/);
assert.match(html, /\.top \.desktop a\{color:rgba\(255,255,255,\.92\)!important\}/);
console.log('  ✓ header contrast guard');
