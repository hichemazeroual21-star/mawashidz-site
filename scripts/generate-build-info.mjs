#!/usr/bin/env node
/** Write public/build-info.json from i18n version + git HEAD. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

const i18nPath = join(root, 'assets/i18n.js');
const i18n = readFileSync(i18nPath, 'utf8');
const versionMatch = i18n.match(/MDZ_APP_VERSION\s*=\s*'([^']+)'/);
const version = versionMatch ? versionMatch[1] : 'unknown';

let commit = process.env.GIT_COMMIT || process.env.CF_PAGES_COMMIT_SHA || '';
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    commit = 'unknown';
  }
}

const info = {
  version,
  commit,
  builtAt: new Date().toISOString(),
  worker: 'mawashidz-live',
};

const outPath = join(publicDir, 'build-info.json');
writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
console.log(`build-info.json → version=${version} commit=${commit.slice(0, 7)}`);
