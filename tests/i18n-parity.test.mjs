#!/usr/bin/env node
/**
 * Guards translation-key parity across all supported languages.
 * Every key present in the Arabic reference pack (assets/i18n.js +
 * assets/i18n-content.js merged) must exist in en, fr, and de —
 * otherwise applyI18n() leaves stale text from the previous language.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const noop = () => {};
const ctx = {
  window: {},
  document: { addEventListener: noop, querySelectorAll: () => [], getElementById: () => null },
  localStorage: { getItem: () => null, setItem: noop },
  console,
};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, 'assets/i18n.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(join(root, 'assets/i18n-content.js'), 'utf8'), ctx);
vm.runInContext('globalThis.__I18N = MDZ_I18N; globalThis.__LANGS = MDZ_LANGS;', ctx);

const packs = ctx.__I18N;
const langs = ctx.__LANGS;

assert.deepEqual(Object.keys(packs).sort(), [...langs].sort(), 'MDZ_I18N must define exactly the MDZ_LANGS languages');

const reference = new Set(Object.keys(packs.ar));
assert.ok(reference.size > 0, 'Arabic reference pack must not be empty');

let failed = false;
for (const lang of langs) {
  const keys = new Set(Object.keys(packs[lang]));
  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));
  if (missing.length) {
    failed = true;
    console.error(`  ✗ ${lang} missing ${missing.length} key(s): ${missing.join(', ')}`);
  }
  if (extra.length) {
    failed = true;
    console.error(`  ✗ ${lang} has ${extra.length} key(s) absent from ar: ${extra.join(', ')}`);
  }
}
assert.ok(!failed, 'All languages must expose the same translation keys as the Arabic reference pack');

console.log(`  ✓ i18n parity: ${langs.join(', ')} each expose ${reference.size} keys`);
