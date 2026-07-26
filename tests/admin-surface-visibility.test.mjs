#!/usr/bin/env node
/**
 * Admin surface visibility — real DOM access matrix.
 *
 * Boots index.html in Chrome with a mocked Supabase and asserts which auth-chrome
 * surfaces are exposed per role, plus reload, roles-failure, logout and account-switch.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { chromeExecutablePath, REPO_ROOT } from './helpers/puppeteer-env.mjs';
import { hasAdminAccess, hasManagerAccess, MANAGER_ROLES } from '../js/mdz-dashboards.mjs';

const PORT = 8793;
const SHOTS = path.join(REPO_ROOT, 'tests/.artifacts/screenshots/admin-surface');
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(REPO_ROOT, p);
  if (!file.startsWith(REPO_ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: chromeExecutablePath(),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=ar'],
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

/** Signed-JWT shape is irrelevant here; only the `sub` claim is read client-side. */
function tokenFor(userId) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: userId })}.sig`;
}

function sessionFor(userId) {
  return {
    access_token: tokenFor(userId),
    refresh_token: `refresh-${userId}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId },
  };
}

/**
 * @param {object} cfg
 * @param {string|null} cfg.userId       session user (null → visitor)
 * @param {string[]}    cfg.roles        user_roles rows
 * @param {number}      cfg.rolesStatus  HTTP status for user_roles
 * @param {number}      cfg.rolesDelayMs artificial latency for user_roles
 * @param {object|null} cfg.profile      profiles row
 */
async function openApp(cfg) {
  const state = {
    roles: cfg.roles || [],
    rolesStatus: cfg.rolesStatus ?? 200,
    rolesDelayMs: cfg.rolesDelayMs ?? 0,
    profile: cfg.profile ?? null,
    rolesRequests: 0,
    profileRequests: 0,
  };
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(`PAGEERROR: ${e.message}`));
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return req.continue();
    if (url.includes('fpjvjfgwbfehhcvdirpy.supabase.co')) {
      if (req.method() === 'OPTIONS') return req.respond({ status: 200, headers: CORS, body: '' });
      const json = (body, status = 200) => req.respond({
        status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body),
      });
      if (url.includes('/rest/v1/user_roles')) {
        state.rolesRequests += 1;
        if (state.rolesDelayMs) await new Promise((r) => setTimeout(r, state.rolesDelayMs));
        if (state.rolesStatus !== 200) return json({ message: 'roles unavailable' }, state.rolesStatus);
        return json(state.roles.map((role) => ({ role })));
      }
      if (url.includes('/rest/v1/profiles')) {
        state.profileRequests += 1;
        return json(state.profile ? [state.profile] : []);
      }
      if (url.includes('/rest/v1/registrations')) return json([]);
      if (url.includes('/auth/v1/token')) return json({ ...sessionFor(cfg.userId || 'u'), token_type: 'bearer' });
      return json([]);
    }
    if (url.includes('api.open-meteo.com')) {
      return req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 22, wind_speed_10m: 8, precipitation: 0 } }) });
    }
    if (url.includes('cdn.jsdelivr.net')) {
      return req.respond({ status: 200, contentType: 'application/javascript', body: 'window.emailjs={init(){},send(){return Promise.resolve({status:200})}}' });
    }
    return req.abort('failed');
  });

  if (cfg.userId) {
    const session = sessionFor(cfg.userId);
    await page.evaluateOnNewDocument((s) => {
      localStorage.setItem('mdz_auth_session', JSON.stringify(s));
    }, session);
  }
  return { page, state };
}

/** Visibility of every privileged/auth surface, as the user would actually see it. */
async function surfaces(page) {
  return page.evaluate(() => {
    const shown = (id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      if (el.hasAttribute('hidden')) return false;
      return getComputedStyle(el).display !== 'none';
    };
    return {
      login: shown('headerLoginBtn'),
      account: shown('headerAccountBtn'),
      manager: shown('headerMgrDashBtn'),
      admin: shown('headerAdminDashBtn'),
      drawerManager: shown('drawerMgrDashLink'),
      drawerAdmin: shown('drawerAdminDashLink'),
      accessState: window.__mdzAccessState ? window.__mdzAccessState() : null,
      adminModalOpen: Boolean(document.getElementById('adminDashModal')?.classList.contains('open')),
      managerModalOpen: Boolean(document.getElementById('managerDashModal')?.classList.contains('open')),
    };
  });
}

async function settle(page, ms = 600) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Header-only capture so reviewers can see the rendered surface per persona. */
async function shootHeader(page, name) {
  const header = await page.$('.top');
  if (!header) return;
  await header.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function loadApp(cfg) {
  const { page, state } = await openApp(cfg);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return { page, state };
}

// ---------------------------------------------------------------------------
// Access matrix
// ---------------------------------------------------------------------------
const matrix = [];

// 1) visitor — no session at all
{
  const { page } = await loadApp({ userId: null });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: 'visitor', ...s });
  check('visitor: login offered', s.login === true);
  check('visitor: account hidden', s.account === false);
  check('visitor: manager hidden', s.manager === false && s.drawerManager === false);
  check('visitor: admin hidden', s.admin === false && s.drawerAdmin === false);
  await page.close();
}

// 2) member — session, no roles
{
  const { page } = await loadApp({ userId: 'member-1', roles: [], profile: { id: 'member-1', role: 'breeder', wilaya: 'الجزائر', member_id: 'MDZ-F-000001', status: 'approved' } });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: 'member', ...s });
  await shootHeader(page, 'header-member');
  check('member: account offered', s.account === true);
  check('member: login hidden', s.login === false);
  check('member: manager hidden', s.manager === false && s.drawerManager === false);
  check('member: admin hidden', s.admin === false && s.drawerAdmin === false);
  await page.close();
}

// 3) manager via user_roles
{
  const { page } = await loadApp({ userId: 'mgr-1', roles: ['wilaya_manager'], profile: { id: 'mgr-1', role: 'manager', wilaya: 'البليدة' } });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: 'manager (user_roles)', ...s });
  check('manager: manager surface visible', s.manager === true && s.drawerManager === true);
  check('manager: admin surface hidden', s.admin === false && s.drawerAdmin === false);
  await page.close();
}

// 3b) manager only via profiles.role spelling (wilaya_mgr) — unified vocabulary
{
  const { page } = await loadApp({ userId: 'mgr-2', roles: [], profile: { id: 'mgr-2', role: 'wilaya_mgr', wilaya: 'وهران' } });
  await settle(page);
  const before = await surfaces(page);
  check('manager(profile-role): hidden before profile is bound', before.manager === false);
  await page.evaluate(() => window.openAccount());
  await settle(page, 800);
  const s = await surfaces(page);
  matrix.push({ persona: 'manager (profiles.role=wilaya_mgr)', ...s });
  check('manager(profile-role): manager surface visible after profile bound', s.manager === true);
  check('manager(profile-role): admin surface hidden', s.admin === false);
  await page.close();
}

// 4) admin / founder
for (const role of ['admin', 'founder']) {
  const { page } = await loadApp({ userId: `${role}-1`, roles: [role], profile: { id: `${role}-1`, role: 'buyer', wilaya: 'الجزائر' } });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: role, ...s });
  check(`${role}: admin surface visible`, s.admin === true && s.drawerAdmin === true);
  check(`${role}: manager surface visible`, s.manager === true && s.drawerManager === true);
  await page.close();
}

// 5) roles fetch failure — stay hidden, no dashboard entry
{
  const { page } = await loadApp({ userId: 'admin-2', roles: ['admin'], rolesStatus: 500, profile: { id: 'admin-2', role: 'buyer' } });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: 'roles fetch failure', ...s });
  check('roles failure: admin hidden', s.admin === false && s.drawerAdmin === false);
  check('roles failure: manager hidden', s.manager === false && s.drawerManager === false);
  check('roles failure: account still offered', s.account === true);
  await page.evaluate(() => window.openAdminDashboard());
  await settle(page, 700);
  const after = await surfaces(page);
  check('roles failure: admin dashboard refuses to open', after.adminModalOpen === false);
  await page.close();
}

// 5b) pending roles must not flash privileged chrome
{
  const { page } = await loadApp({ userId: 'admin-3', roles: ['admin'], rolesDelayMs: 900, profile: { id: 'admin-3', role: 'buyer' } });
  let flashed = false;
  for (let i = 0; i < 8; i += 1) {
    const s = await surfaces(page);
    if (s.admin === true || s.manager === true) { flashed = true; break; }
    await settle(page, 90);
  }
  check('pending roles: no privileged flash while loading', flashed === false);
  await settle(page, 1400);
  const ready = await surfaces(page);
  check('pending roles: admin appears once roles resolve', ready.admin === true);
  await page.close();
}

// 6) reload — privileged chrome restored without opening account
{
  const { page, state } = await loadApp({ userId: 'admin-4', roles: ['admin'], profile: { id: 'admin-4', role: 'buyer' } });
  await settle(page);
  const first = await surfaces(page);
  check('reload: admin visible on first load', first.admin === true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(page, 900);
  const s = await surfaces(page);
  matrix.push({ persona: 'admin after reload', ...s });
  await shootHeader(page, 'header-admin-after-reload');
  check('reload: admin still visible after reload', s.admin === true && s.drawerAdmin === true);
  check('reload: roles refetched for the session', state.rolesRequests >= 2, `requests=${state.rolesRequests}`);
  await page.close();
}

// 7) logout clears access context immediately
{
  const { page } = await loadApp({ userId: 'admin-5', roles: ['admin'], profile: { id: 'admin-5', role: 'buyer' } });
  await settle(page);
  check('logout: admin visible before logout', (await surfaces(page)).admin === true);
  await page.evaluate(() => window.logoutAccount());
  const s = await surfaces(page);
  matrix.push({ persona: 'after logout', ...s });
  check('logout: admin hidden immediately', s.admin === false && s.drawerAdmin === false);
  check('logout: manager hidden immediately', s.manager === false && s.drawerManager === false);
  check('logout: login offered again', s.login === true);
  await page.close();
}

// 8) account switch must not inherit previous roles
{
  const { page, state } = await loadApp({ userId: 'admin-6', roles: ['admin'], profile: { id: 'admin-6', role: 'buyer' } });
  await settle(page);
  check('switch: admin visible for first account', (await surfaces(page)).admin === true);
  state.roles = [];
  state.profile = { id: 'member-9', role: 'breeder', wilaya: 'سطيف' };
  const nextSession = sessionFor('member-9');
  await page.evaluate((s) => window.saveSession
    ? window.saveSession(s)
    : localStorage.setItem('mdz_auth_session', JSON.stringify(s)), nextSession);
  const immediate = await page.evaluate(() => {
    const el = document.getElementById('headerAdminDashBtn');
    return { hidden: el.hasAttribute('hidden') };
  });
  check('switch: admin hidden immediately after session swap', immediate.hidden === true);
  await page.evaluate(() => window.openAdminDashboard());
  await settle(page, 900);
  const s = await surfaces(page);
  matrix.push({ persona: 'after account switch (admin → member)', ...s });
  await shootHeader(page, 'header-after-account-switch');
  check('switch: admin dashboard refuses to open for new account', s.adminModalOpen === false);
  check('switch: admin surface stays hidden', s.admin === false && s.drawerAdmin === false);
  await page.close();
}

// ---------------------------------------------------------------------------
// Shared role vocabulary (frontend ↔ backend helper module)
// ---------------------------------------------------------------------------
assert.deepEqual([...MANAGER_ROLES].sort(), ['manager', 'wilaya_manager', 'wilaya_mgr']);
for (const spelling of ['manager', 'wilaya_manager', 'wilaya_mgr']) {
  assert.equal(hasManagerAccess([], spelling), true, `profiles.role=${spelling} must grant manager surface`);
}
assert.equal(hasManagerAccess([], 'breeder'), false);
assert.equal(hasManagerAccess([], null), false);
assert.equal(hasAdminAccess(['ADMIN']), true, 'role comparison must be case-insensitive');
assert.equal(hasAdminAccess(undefined), false);
assert.equal(hasManagerAccess(undefined, undefined), false);
check('role vocabulary: manager spellings unified frontend/backend', true);

const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
assert.ok(!/operator/i.test(html.match(/const MDZ_MANAGER_ROLES=\[[^\]]*\]/)?.[0] || ''), 'operator is not a role');
assert.match(html, /await syncAccessContext\(session,\{force:true\}\);\s*\n\s*await refreshNotifBadge/, 'reload path must sync access context (and repaint chrome)');
assert.ok(!/mdzUserRoles=mdzUserRoles\.length\?mdzUserRoles:/.test(html), 'admin dashboard must not reuse non-empty role cache');
check('static guards: reload sync + no stale role cache', true);

// ---------------------------------------------------------------------------
await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log('\n===== ACCESS MATRIX =====');
console.log(
  ['persona', 'login', 'account', 'manager', 'admin']
    .map((h) => String(h).padEnd(38 - 0).slice(0, 38))
    .join('| '),
);
for (const row of matrix) {
  console.log([
    String(row.persona).padEnd(38).slice(0, 38),
    String(row.login).padEnd(38).slice(0, 38),
    String(row.account).padEnd(38).slice(0, 38),
    String(row.manager).padEnd(38).slice(0, 38),
    String(row.admin).padEnd(38).slice(0, 38),
  ].join('| '));
}
console.log(`\n===== ${results.length - failed.length}/${results.length} checks passed =====`);
if (failed.length) {
  console.error('FAILED:');
  failed.forEach((f) => console.error(` - ${f.name} ${f.detail}`));
  process.exit(1);
}
console.log('  ✓ admin surface visibility matrix');
