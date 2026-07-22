#!/usr/bin/env node
/**
 * Ensure public/ matches source (index.html, js/, assets/, CNAME) without rewriting.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function collectFiles(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectFiles(p, base));
    else out.push(relative(base, p).replace(/\\/g, '/'));
  }
  return out;
}

const pairs = [];
pairs.push(['index.html', 'index.html']);
pairs.push(['CNAME', 'CNAME']);
for (const rel of collectFiles(join(root, 'js'), join(root, 'js'))) {
  pairs.push([join('js', rel), join('js', rel)]);
}
for (const rel of collectFiles(join(root, 'assets'), join(root, 'assets'))) {
  pairs.push([join('assets', rel), join('assets', rel)]);
}

let failed = 0;
for (const [srcRel, pubRel] of pairs) {
  const src = join(root, srcRel);
  const pub = join(root, 'public', pubRel);
  if (!existsSync(src)) continue;
  if (!existsSync(pub)) {
    console.error(`MISSING public/${pubRel} (source: ${srcRel})`);
    failed++;
    continue;
  }
  const a = sha256File(src);
  const b = sha256File(pub);
  if (a !== b) {
    console.error(`OUT OF SYNC public/${pubRel}`);
    console.error(`  source: ${a}`);
    console.error(`  public: ${b}`);
    failed++;
  }
}

if (failed) {
  console.error(`\npublic/ out of sync (${failed} path(s)). Run: npm run sync:worker`);
  process.exit(1);
}
console.log(`public/ in sync (${pairs.length} paths checked).`);
