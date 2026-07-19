#!/usr/bin/env node
/** Sync production static files into public/ for Worker deployment. */
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'public');

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const rel of ['index.html', 'CNAME']) {
  cpSync(join(root, rel), join(out, rel));
}
for (const dir of ['js', 'assets']) {
  cpSync(join(root, dir), join(out, dir), { recursive: true });
}
