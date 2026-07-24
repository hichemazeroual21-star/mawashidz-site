#!/usr/bin/env node
/** Sync production static files into public/ for Worker deployment. */
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'public');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const i18n = readFileSync(join(root, 'assets/i18n.js'), 'utf8');
const versionMatch = i18n.match(/MDZ_APP_VERSION\s*=\s*'([^']+)'/);
const version = versionMatch ? versionMatch[1] : 'unknown';

const rootIndexPath = join(root, 'index.html');
let indexHtml = readFileSync(rootIndexPath, 'utf8');
const rewritten = indexHtml.replace(
  /(assets\/i18n(?:-content)?\.js)\?v=[^"']+/g,
  `$1?v=${version}`,
);
// Keep source and deploy artifact aligned so verify:prod hashes match production.
if (rewritten !== indexHtml) {
  console.warn(`sync-worker-public: rewriting root index.html cache-bust → v=${version}`);
  writeFileSync(rootIndexPath, rewritten, 'utf8');
  indexHtml = rewritten;
}
writeFileSync(join(out, 'index.html'), indexHtml, 'utf8');

cpSync(join(root, 'CNAME'), join(out, 'CNAME'));
for (const dir of ['js', 'assets']) {
  cpSync(join(root, dir), join(out, dir), { recursive: true });
}

const headersSrc = join(root, 'deploy/_headers');
if (existsSync(headersSrc)) {
  cpSync(headersSrc, join(out, '_headers'));
}
