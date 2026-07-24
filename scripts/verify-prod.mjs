#!/usr/bin/env node
/**
 * Production verification — https://mawashidz.com vs local build artifact.
 * Fails on stale v1.9.x shell, missing build-info, SHA mismatch, or broken API routes
 * when production already serves this commit.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const PROD_BASE = 'https://mawashidz.com';
const LEGACY_BANNED_VERSION = '1.9.0';

const FILES = [
  'index.html',
  'js/mdz-dashboards.mjs',
  'js/registration-flow.mjs',
  'assets/i18n.js',
];

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Prefer public/ (deploy artifact); fall back to root source. */
function localDeployPath(rel) {
  const fromPublic = join(process.cwd(), 'public', rel);
  if (existsSync(fromPublic)) return fromPublic;
  return join(process.cwd(), rel);
}

async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  return { status: r.status, text: r.ok ? await r.text() : '', ok: r.ok };
}

async function sha256Url(url) {
  const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return createHash('sha256').update(buf).digest('hex');
}

const root = process.cwd();
let failed = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed++;
};

let expectedCommit = process.env.VERIFY_GIT_COMMIT || '';
if (!expectedCommit) {
  try {
    expectedCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    expectedCommit = '';
  }
}

const localBuildInfoPath = join(root, 'public/build-info.json');
if (existsSync(localBuildInfoPath) && expectedCommit) {
  try {
    const localInfo = JSON.parse(readFileSync(localBuildInfoPath, 'utf8'));
    if (localInfo.commit && localInfo.commit !== expectedCommit) {
      fail(`local public/build-info commit ${localInfo.commit.slice(0, 7)} !== HEAD ${expectedCommit.slice(0, 7)} — run npm run build`);
    }
  } catch {
    fail('local public/build-info.json is not valid JSON');
  }
}

let prodCommit = '';

// --- build-info on production ---
const prodInfo = await fetchText(`${PROD_BASE}/build-info.json`);
if (!prodInfo.ok) {
  fail('production /build-info.json missing (run npm run build and deploy)');
} else {
  let info;
  try {
    info = JSON.parse(prodInfo.text);
  } catch {
    fail('production build-info.json is not valid JSON');
    info = null;
  }
  if (info) {
    prodCommit = info.commit || '';
    console.log(`prod build-info: version=${info.version} commit=${info.commit?.slice(0, 7)} builtAt=${info.builtAt} worker=${info.worker || '?'}`);
    if (info.version === LEGACY_BANNED_VERSION) {
      fail(`production version is banned legacy ${LEGACY_BANNED_VERSION}`);
    }
    if (info.worker && info.worker !== 'mawashidz-live') {
      fail(`production worker field is ${info.worker}, expected mawashidz-live`);
    }
    if (expectedCommit && info.commit && info.commit !== expectedCommit) {
      fail(`production commit ${info.commit.slice(0, 7)} !== expected ${expectedCommit.slice(0, 7)}`);
    }
  }
}

// --- legacy shell detection (evidence-based, not cache guessing) ---
const prodIndex = await fetchText(`${PROD_BASE}/index.html`);
if (prodIndex.ok) {
  if (prodIndex.text.includes(`الإصدار v${LEGACY_BANNED_VERSION}`) || (/\bv1\.9\.0\b/.test(prodIndex.text) && prodIndex.text.includes('Phase 1 Auth UI'))) {
    fail(`production index.html still declares or embeds legacy v${LEGACY_BANNED_VERSION} monolith`);
  }
  if (!prodIndex.text.includes('MDZ_APP_VERSION') && !prodIndex.text.includes('assets/i18n.js')) {
    fail('production index.html missing v1.10+ i18n.js wiring (stale monolith)');
  }
} else {
  fail(`production index.html HTTP ${prodIndex.status}`);
}

const i18n = await fetchText(`${PROD_BASE}/assets/i18n.js`);
if (!i18n.ok) {
  fail(`production /assets/i18n.js HTTP ${i18n.status} (required for v1.10+)`);
} else {
  const vm = i18n.text.match(/MDZ_APP_VERSION\s*=\s*'([^']+)'/);
  if (!vm) fail('production i18n.js missing MDZ_APP_VERSION');
  else if (vm[1] === LEGACY_BANNED_VERSION) fail(`production i18n version is ${LEGACY_BANNED_VERSION}`);
  else console.log(`prod MDZ_APP_VERSION=${vm[1]}`);
}

for (const rel of FILES) {
  const localPath = localDeployPath(rel);
  if (!existsSync(localPath)) {
    fail(`missing local ${rel}`);
    continue;
  }
  try {
    const local = sha256File(localPath);
    const remote = await sha256Url(`${PROD_BASE}/${rel}`);
    if (local !== remote) {
      fail(`SHA mismatch ${rel}`);
      console.error(`  local : ${local}`);
      console.error(`  prod  : ${remote}`);
    } else {
      console.log(`OK ${rel}${localPath.includes(`${join('public')}`) || localPath.includes('/public/') ? ' (public/)' : ''}`);
    }
  } catch (e) {
    fail(`fetch ${rel}: ${e.message}`);
  }
}

// --- API routes (Worker) — required when prod already serves this commit ---
const forceApi = process.env.VERIFY_API === '1';
const skipApi = process.env.VERIFY_API === '0';
const commitMatched = Boolean(expectedCommit && prodCommit && expectedCommit === prodCommit);
const shouldCheckApi = !skipApi && (forceApi || commitMatched);

if (shouldCheckApi) {
  const prices = await fetchText(`${PROD_BASE}/api/livestock-prices`);
  if (!prices.ok) {
    fail(`production /api/livestock-prices HTTP ${prices.status}`);
  } else {
    try {
      const body = JSON.parse(prices.text);
      if (!Array.isArray(body.rows) || !body.rows.length) fail('production prices JSON missing rows');
      else console.log(`OK /api/livestock-prices (rows=${body.rows.length})`);
    } catch {
      fail('production /api/livestock-prices is not valid JSON');
    }
  }

  const news = await fetchText(`${PROD_BASE}/api/livestock-news`);
  if (![200, 503].includes(news.status)) {
    fail(`production /api/livestock-news HTTP ${news.status} (expected 200 or 503)`);
  } else {
    try {
      const body = JSON.parse(news.text || '{}');
      if (news.status === 200 && !Array.isArray(body.items)) fail('production news 200 without items[]');
      else console.log(`OK /api/livestock-news (status=${news.status})`);
    } catch {
      fail('production /api/livestock-news is not valid JSON');
    }
  }
} else if (skipApi) {
  console.log('skip API checks (VERIFY_API=0)');
} else {
  console.log('skip API checks (production commit differs — set VERIFY_API=1 to force)');
}

if (failed) {
  console.error(`\nverify:prod failed (${failed} check(s)).`);
  console.error('If Cloudflare Version command is still `wrangler deploy` on all branches, fix dashboard BEFORE deploy.');
  process.exit(1);
}
console.log('\nverify:prod passed — production matches this checkout.');
