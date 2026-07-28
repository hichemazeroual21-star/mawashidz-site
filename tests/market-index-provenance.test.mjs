/**
 * Unit tests: livestock price index provenance (PUBLIC_CLAIMS_POLICY).
 *
 * The index is computed locally from hardcoded base prices — no feed is fetched.
 * It must therefore never name an official body as the source of a row, and the
 * public disclaimer must not claim official provenance.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildMarketSnapshot, MDZ_PRODUCTS } from '../netlify/functions/market-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const OFFICIAL_HOSTS = ['madr.gov.dz', 'aps.dz', 'ons.dz', 'joradp.dz', 'interieur.gov.dz'];

// 1. No product may carry an external source URL while its price is synthetic.
for (const p of MDZ_PRODUCTS) {
  assert.equal(
    /^https?:\/\//i.test(p.source || ''),
    false,
    `product ${p.id} must not link an external source for a computed price`,
  );
}

// 2. Rendered rows must not attribute computed prices to an official body.
const snapshot = buildMarketSnapshot(1_700_000_000);
assert.ok(snapshot.rows.length > 0, 'snapshot must produce rows');
for (const row of snapshot.rows) {
  for (const host of OFFICIAL_HOSTS) {
    assert.equal(
      String(row.source || '').includes(host),
      false,
      `row ${row.productId}/${row.wilayaCode} must not cite ${host}`,
    );
  }
  assert.ok(row.sourceName, 'row must carry a self-attribution label');
}
assert.equal(snapshot.rows.every((r) => r.sourceName === 'تقدير MawashiDZ'), true);

// 3. Client fallback engine must mirror the server contract.
const engine = read('assets/market-engine.js');
for (const host of OFFICIAL_HOSTS) {
  assert.equal(engine.includes(host), false, `market-engine.js must not cite ${host}`);
}

// 4. Disclaimer must not claim official sources in any locale.
const i18n = read('assets/i18n.js');
const disclaimers = [...i18n.matchAll(/exchangeDisclaimer:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
assert.equal(disclaimers.length, 4, `expected 4 locale disclaimers, got ${disclaimers.length}`);
const FORBIDDEN = [
  'المصادر الرسمية',
  'official sources',
  'sources officielles',
  'offiziellen Quellen',
];
for (const text of disclaimers) {
  for (const phrase of FORBIDDEN) {
    assert.equal(
      text.includes(phrase),
      false,
      `disclaimer must not claim official provenance: "${phrase}"`,
    );
  }
}
for (const key of ['exchangeSourceInternal']) {
  assert.equal(
    (i18n.match(new RegExp(`${key}:`, 'g')) || []).length,
    4,
    `${key} must be translated in all 4 locales`,
  );
}

// 5. The source cell must be link-guarded, not an unconditional anchor.
const html = read('index.html');
assert.match(html, /function renderExchangeSource\(row\)/, 'source renderer required');
assert.match(html, /\^https\?:\\\/\\\/\/i\.test\(href\)/, 'renderer must gate on an http(s) source');
assert.equal(
  /<a href="\$\{escapeNewsHTML\(r\.source\)\}"/.test(html),
  false,
  'row source must not be rendered as an unconditional link',
);

console.log('  ✓ market index provenance (no official-source claim on computed prices)');
