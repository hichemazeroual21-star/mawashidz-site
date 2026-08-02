import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');

const decisions = read('docs/constitution/FOUNDER_DECISIONS.md');
const constitution = read('docs/constitution/MAWASHIDZ_CONSTITUTION.md');
const roadmap = read('docs/constitution/ROADMAP.md');
const product = read('docs/product/PRODUCT_CONSTITUTION.md');

assert.match(
  decisions,
  /FD-02[\s\S]*Hybrid: quick listing \+ upgradeable professional evidence[\s\S]*Decided — Founder, 2026-08-02/,
  'FD-02 must remain a Founder-decided hybrid marketplace policy',
);

assert.match(
  constitution,
  /No professional profile, animal QR or prior animal registration is required for this basic path\./,
  'basic Year-1 livestock listings must not require the professional path',
);

assert.match(
  constitution,
  /The same listing upgrades in place; no duplicate listing and no repeated data entry\./,
  'professional evidence must upgrade the same listing',
);

assert.match(
  roadmap,
  /Phone-confirmed member can publish a basic listing without professional or animal registration/,
  'the canonical roadmap must preserve the quick-listing acceptance criterion',
);

assert.match(
  product,
  /“Add livestock” opens the quick path by default/,
  'the product mechanics must default to Add livestock, not the professional form',
);

for (const [path, text] of [
  ['FOUNDER_DECISIONS.md', decisions],
  ['MAWASHIDZ_CONSTITUTION.md', constitution],
  ['ROADMAP.md', roadmap],
  ['PRODUCT_CONSTITUTION.md', product],
]) {
  assert.doesNotMatch(
    text,
    /Verified listings \*\*require\*\* a registered animal|default preference is strict verified path/,
    `${path} must not reintroduce the superseded mandatory-professional path`,
  );
}

console.log('  ✓ FD-02 quick + professional marketplace policy guard passed');
