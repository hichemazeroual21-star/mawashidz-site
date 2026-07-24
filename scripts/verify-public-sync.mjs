#!/usr/bin/env node
/**
 * Verify public/ is a faithful deploy artifact of root sources after build.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

execSync('node scripts/sync-worker-public.mjs', { stdio: 'inherit' });
execSync('node scripts/generate-build-info.mjs', { stdio: 'inherit' });

const buildInfoPath = join(root, 'public/build-info.json');
if (!existsSync(buildInfoPath)) {
  console.error('build-info.json missing after build');
  process.exit(1);
}

const i18n = readFileSync(join(root, 'assets/i18n.js'), 'utf8');
const version = i18n.match(/MDZ_APP_VERSION\s*=\s*'([^']+)'/)?.[1];
if (!version) {
  console.error('MDZ_APP_VERSION missing from assets/i18n.js');
  process.exit(1);
}

const publicIndex = readFileSync(join(root, 'public/index.html'), 'utf8');
const rootIndex = readFileSync(join(root, 'index.html'), 'utf8');
if (rootIndex !== publicIndex) {
  console.error('root index.html !== public/index.html after sync');
  process.exit(1);
}
if (!publicIndex.includes(`assets/i18n.js?v=${version}`) || !publicIndex.includes(`assets/i18n-content.js?v=${version}`)) {
  console.error(`public/index.html cache-bust must use ?v=${version}`);
  process.exit(1);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

let failed = 0;
for (const dir of ['js', 'assets']) {
  const files = walkFiles(join(root, dir));
  for (const file of files) {
    const rel = relative(root, file);
    const pub = join(root, 'public', rel);
    if (!existsSync(pub)) {
      console.error(`missing public/${rel}`);
      failed++;
      continue;
    }
    if (sha256(file) !== sha256(pub)) {
      console.error(`checksum mismatch ${rel}`);
      failed++;
    }
  }
}

if (failed) {
  console.error(`verify-public-sync failed (${failed})`);
  process.exit(1);
}

console.log(`verify-public-sync: OK — index aligned, cache-bust v=${version}, js/assets checksums match`);
