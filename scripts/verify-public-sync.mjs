#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
execSync('node scripts/sync-worker-public.mjs', { stdio: 'inherit' });
execSync('node scripts/generate-build-info.mjs', { stdio: 'inherit' });

const buildInfo = join(root, 'public/build-info.json');
if (!existsSync(buildInfo)) {
  console.error('build-info.json missing after build');
  process.exit(1);
}
console.log('verify-public-sync: build produced public/ + build-info.json');
