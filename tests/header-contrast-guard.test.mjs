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
assert.match(html, /background:linear-gradient\(145deg,rgba\(255,255,255,\.11\),rgba\(255,255,255,\.055\)\)!important/);
assert.match(html, /border-radius:14px!important/);
assert.match(html, /backdrop-filter:blur\(8px\) saturate\(120%\)/);
assert.match(html, /box-shadow:inset 0 1px 0 rgba\(255,255,255,\.16\),0 5px 14px rgba\(0,0,0,\.12\)!important/);
assert.match(html, /\.top #headerActions \.mdz-btn-ghost:active/);
assert.match(html, /\.top \.desktop a\{color:rgba\(255,255,255,\.92\)!important\}/);
console.log('  ✓ header contrast guard');
