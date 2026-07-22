#!/usr/bin/env node
/**
 * Compare production https://mawashidz.com artifacts to local checkout (root paths).
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PROD_BASE = 'https://mawashidz.com';
const FILES = [
  'index.html',
  'js/mdz-dashboards.mjs',
  'js/registration-flow.mjs',
  'js/mdz-roles.mjs',
  'assets/i18n.js',
];

function sha256File(path) {
  const buf = readFileSync(path);
  return createHash('sha256').update(buf).digest('hex');
}

async function sha256Url(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return createHash('sha256').update(buf).digest('hex');
}

const root = process.cwd();
let failed = 0;

for (const rel of FILES) {
  const localPath = join(root, rel);
  if (!existsSync(localPath)) {
    console.error(`MISSING local: ${rel}`);
    failed++;
    continue;
  }
  const local = sha256File(localPath);
  let remote;
  try {
    remote = await sha256Url(`${PROD_BASE}/${rel}`);
  } catch (e) {
    console.error(`FAIL fetch ${rel}: ${e.message}`);
    failed++;
    continue;
  }
  if (local !== remote) {
    console.error(`MISMATCH ${rel}`);
    console.error(`  local : ${local}`);
    console.error(`  prod  : ${remote}`);
    failed++;
  } else {
    console.log(`OK ${rel}`);
  }
}

if (failed) {
  console.error(`\nverify:prod failed (${failed} file(s))`);
  process.exit(1);
}
console.log('\nverify:prod passed — prod matches local for tracked files.');
