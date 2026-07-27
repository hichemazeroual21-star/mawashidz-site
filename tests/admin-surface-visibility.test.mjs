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
 * @param {number}      cfg.profileDelayMs artificial latency for profiles
 * @param {object[]}    cfg.registrationsRows rows returned to dashboard loaders
 * @param {number}      cfg.registrationsDelayMs artificial latency for registrations
 */
async function openApp(cfg) {
  const state = {
    roles: cfg.roles || [],
    rolesStatus: cfg.rolesStatus ?? 200,
    rolesDelayMs: cfg.rolesDelayMs ?? 0,
    profile: cfg.profile ?? null,
    profileDelayMs: cfg.profileDelayMs ?? 0,
    profileStatus: cfg.profileStatus ?? 200,
    registrationsRows: cfg.registrationsRows || [],
    registrationsDelayMs: cfg.registrationsDelayMs ?? 0,
    rolesRequests: 0,
    profileRequests: 0,
    registrationsRequests: 0,
    registrationsUrls: [],
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
        if (state.profileDelayMs) await new Promise((r) => setTimeout(r, state.profileDelayMs));
        if (state.profileStatus !== 200) return json({ message: 'profile unavailable' }, state.profileStatus);
        return json(state.profile ? [state.profile] : []);
      }
      if (url.includes('/rest/v1/registrations')) {
        state.registrationsRequests += 1;
        state.registrationsUrls.push(url);
        if (state.registrationsDelayMs) await new Promise((r) => setTimeout(r, state.registrationsDelayMs));
        return json(state.registrationsRows);
      }
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

async function loadApp(cfg, hash = '') {
  const { page, state } = await openApp(cfg);
  await page.goto(`http://localhost:${PORT}/${hash}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

// 4) admin / founder / super_admin
for (const role of ['admin', 'founder', 'super_admin']) {
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

// 9) roles failure must veto the profiles.role=manager fallback
{
  const { page } = await loadApp({ userId: 'mgr-3', roles: ['wilaya_manager'], rolesStatus: 503, profile: { id: 'mgr-3', role: 'manager', wilaya: 'قسنطينة' } });
  await settle(page);
  const s = await surfaces(page);
  matrix.push({ persona: 'manager + roles failure', ...s });
  check('roles failure + profile manager: manager surface hidden', s.manager === false && s.drawerManager === false);
  await page.evaluate(() => window.openManagerDashboard());
  await settle(page, 800);
  const after = await surfaces(page);
  check('roles failure + profile manager: manager dashboard refuses to open', after.managerModalOpen === false);
  check('roles failure + profile manager: still hidden after attempt', after.manager === false);
  await page.close();
}

// 10) account switch during an in-flight profile fetch
{
  const { page, state } = await loadApp({
    userId: 'mgr-4',
    roles: ['wilaya_manager'],
    profile: { id: 'mgr-4', role: 'manager', wilaya: 'تلمسان' },
    profileDelayMs: 1500,
  });
  await settle(page, 700);
  check('switch-during-profile: manager visible before switch', (await surfaces(page)).manager === true);
  await page.evaluate(() => {
    window.__mgrModalEverOpen = false;
    const modal = document.getElementById('managerDashModal');
    new MutationObserver(() => {
      if (modal.classList.contains('open')) window.__mgrModalEverOpen = true;
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    window.openManagerDashboard();
  });
  await settle(page, 250);
  state.roles = [];
  state.profile = { id: 'member-77', role: 'breeder', wilaya: 'باتنة' };
  state.profileDelayMs = 0;
  await page.evaluate((s) => window.saveSession(s), sessionFor('member-77'));
  await settle(page, 2200);
  const s = await surfaces(page);
  matrix.push({ persona: 'switch during profile fetch (manager → member)', ...s });
  check('switch-during-profile: no manager modal', s.managerModalOpen === false);
  check('switch-during-profile: manager surface hidden', s.manager === false && s.drawerManager === false);
  const leak = await page.evaluate(() => {
    const box = document.getElementById('managerDashContent');
    return {
      dashText: box?.textContent || '',
      rendered: Boolean(box?.querySelector('.dash-hero, .dash-table, table')),
      everOpen: window.__mgrModalEverOpen === true,
    };
  });
  check('switch-during-profile: manager modal never opened', leak.everOpen === false);
  check('switch-during-profile: dashboard never rendered', leak.rendered === false);
  check(
    'switch-during-profile: no stale wilaya leaked into the dashboard',
    leak.dashText.includes('تلمسان') === false,
    leak.dashText.slice(0, 60),
  );
  const restored = await page.evaluate(() => {
    const el = document.getElementById('headerMgrDashBtn');
    return el.hasAttribute('hidden');
  });
  check('switch-during-profile: previous context not restored', restored === true);
  await page.close();
}

// 11) direct hash entry points
{
  const { page } = await loadApp({ userId: 'admin-7', roles: ['admin'], profile: { id: 'admin-7', role: 'buyer' } }, '#admin-dash');
  await settle(page, 1200);
  const s = await surfaces(page);
  check('#admin-dash: opens for admin', s.adminModalOpen === true);
  await page.close();
}
{
  const { page } = await loadApp({ userId: 'member-8', roles: [], profile: { id: 'member-8', role: 'breeder' } }, '#admin-dash');
  await settle(page, 1200);
  const s = await surfaces(page);
  matrix.push({ persona: 'member via #admin-dash', ...s });
  check('#admin-dash: refused for member', s.adminModalOpen === false);
  await page.close();
}
{
  const { page } = await loadApp({ userId: 'mgr-5', roles: ['wilaya_manager'], profile: { id: 'mgr-5', role: 'manager', wilaya: 'الجزائر' } }, '#manager-dash');
  await settle(page, 1200);
  const s = await surfaces(page);
  check('#manager-dash: opens for manager', s.managerModalOpen === true);
  await page.close();
}
{
  const { page } = await loadApp({ userId: 'mgr-6', roles: ['wilaya_manager'], rolesStatus: 500, profile: { id: 'mgr-6', role: 'manager', wilaya: 'الجزائر' } }, '#manager-dash');
  await settle(page, 1200);
  const s = await surfaces(page);
  matrix.push({ persona: 'manager via #manager-dash + roles failure', ...s });
  check('#manager-dash: refused when roles lookup failed', s.managerModalOpen === false);
  await page.close();
}

// 12) already-rendered privileged surface is invalidated immediately on account switch
{
  const row = {
    registration_id: 'MDZ-REG-2026-000777',
    full_name: 'Rendered Admin Row',
    role: 'breeder',
    user_type: 'breeder',
    wilaya: 'الجزائر',
    status: 'pending',
    created_at: '2026-07-26T00:00:00Z',
  };
  const { page, state } = await loadApp({
    userId: 'admin-rendered',
    roles: ['admin'],
    profile: { id: 'admin-rendered', role: 'buyer' },
    registrationsRows: [row],
  });
  await settle(page, 700);
  await page.evaluate(() => {
    const original = EventTarget.prototype.removeEventListener;
    window.__adminReviewRemovals = 0;
    EventTarget.prototype.removeEventListener = function patchedRemove(type, handler, options) {
      if (this.id === 'adminDashContent' && type === 'click') window.__adminReviewRemovals += 1;
      return original.call(this, type, handler, options);
    };
    window.openAdminDashboard();
  });
  await page.waitForSelector('#adminDashContent [data-review-action]', { timeout: 5000 });
  const opened = await surfaces(page);
  check('rendered-switch: admin modal opened and data rendered', opened.adminModalOpen === true);
  state.roles = [];
  state.profile = { id: 'member-rendered', role: 'breeder' };
  await page.evaluate((s) => window.saveSession(s), sessionFor('member-rendered'));
  const invalidated = await page.evaluate(() => ({
    open: document.getElementById('adminDashModal').classList.contains('open'),
    children: document.getElementById('adminDashContent').childElementCount,
    text: document.getElementById('adminDashContent').textContent,
    removals: window.__adminReviewRemovals,
  }));
  check('rendered-switch: modal closes immediately', invalidated.open === false);
  check('rendered-switch: content clears immediately', invalidated.children === 0 && invalidated.text === '');
  check('rendered-switch: review handler disposed', invalidated.removals >= 1, `removals=${invalidated.removals}`);
  await page.close();
}

// 13) delayed registrations response cannot repaint after a manager → member switch
{
  const delayedRow = {
    registration_id: 'MDZ-REG-2026-000888',
    full_name: 'Stale Delayed Row',
    role: 'breeder',
    user_type: 'breeder',
    wilaya: 'عنابة',
    status: 'pending',
    created_at: '2026-07-26T00:00:00Z',
  };
  const { page, state } = await loadApp({
    userId: 'mgr-delayed-data',
    roles: ['wilaya_manager'],
    profile: { id: 'mgr-delayed-data', role: 'manager', wilaya: 'عنابة' },
    registrationsRows: [delayedRow],
    registrationsDelayMs: 1600,
  });
  await settle(page, 700);
  await page.evaluate(() => {
    const original = EventTarget.prototype.addEventListener;
    window.__managerReviewAdds = 0;
    EventTarget.prototype.addEventListener = function patchedAdd(type, handler, options) {
      if (this.id === 'managerDashContent' && type === 'click') window.__managerReviewAdds += 1;
      return original.call(this, type, handler, options);
    };
    window.openManagerDashboard();
  });
  for (let i = 0; i < 30 && state.registrationsRequests < 1; i += 1) await settle(page, 50);
  const loading = await surfaces(page);
  check('delayed-data-switch: modal opens while registrations are pending', loading.managerModalOpen === true);
  check('delayed-data-switch: registrations request is in flight', state.registrationsRequests === 1);
  state.roles = [];
  state.profile = { id: 'member-after-delay', role: 'breeder', wilaya: 'سطيف' };
  state.registrationsDelayMs = 0;
  await page.evaluate((s) => window.saveSession(s), sessionFor('member-after-delay'));
  const immediate = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    children: document.getElementById('managerDashContent').childElementCount,
  }));
  check('delayed-data-switch: modal closes immediately', immediate.open === false);
  check('delayed-data-switch: loading content clears immediately', immediate.children === 0);
  await settle(page, 2100);
  const after = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    children: document.getElementById('managerDashContent').childElementCount,
    text: document.getElementById('managerDashContent').textContent,
    reviewAdds: window.__managerReviewAdds,
  }));
  check('delayed-data-switch: stale response cannot reopen modal', after.open === false);
  check('delayed-data-switch: stale response renders nothing', after.children === 0 && !after.text.includes('Stale Delayed Row'));
  check('delayed-data-switch: stale response wires no review handler', after.reviewAdds === 0, `adds=${after.reviewAdds}`);
  await page.close();
}

// ---------------------------------------------------------------------------
// Wilaya scoping — failing contracts (hotfix evidence; no product fix in this commit)
// ---------------------------------------------------------------------------

function registrationsUrlsScoped(urls) {
  return urls.filter((u) => u.includes('/rest/v1/registrations'));
}

function allRegistrationsScopedByWilaya(urls) {
  const regs = registrationsUrlsScoped(urls);
  return regs.length > 0 && regs.every((u) => u.includes('wilaya=eq.'));
}

function anyUnscopedRegistrations(urls) {
  return registrationsUrlsScoped(urls).some((u) => !u.includes('wilaya=eq.'));
}

// 14) manager role with profile=null must not load an unscoped registrations list
{
  const { page, state } = await loadApp({
    userId: 'mgr-null-profile',
    roles: ['wilaya_manager'],
    profile: null,
    registrationsRows: [{
      registration_id: 'MDZ-REG-2026-UNSCOPED',
      full_name: 'Should Not Render Unscoped',
      role: 'breeder',
      user_type: 'breeder',
      wilaya: 'وهران',
      status: 'pending',
      created_at: '2026-07-27T00:00:00Z',
    }],
  });
  await settle(page, 700);
  state.registrationsRequests = 0;
  state.registrationsUrls = [];
  await page.evaluate(() => window.openManagerDashboard());
  await settle(page, 1200);
  const after = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    text: document.getElementById('managerDashContent')?.textContent || '',
  }));
  check(
    'null-profile manager: manager modal refused (fail-closed without wilaya)',
    after.open === false,
    `open=${after.open} text=${JSON.stringify(after.text.slice(0, 120))}`,
  );
  check(
    'null-profile manager: no registrations fetch without resolved wilaya',
    state.registrationsRequests === 0,
    `requests=${state.registrationsRequests} urls=${JSON.stringify(state.registrationsUrls)}`,
  );
  check(
    'null-profile manager: must not issue unscoped registrations fetch',
    !anyUnscopedRegistrations(state.registrationsUrls),
    `urls=${JSON.stringify(state.registrationsUrls)}`,
  );
  await page.close();
}

// 15) logout → login → open manager dash: registrations must stay wilaya-scoped
{
  const wilaya = 'بسكرة';
  const { page, state } = await loadApp({
    userId: 'mgr-relogin',
    roles: ['wilaya_manager'],
    profile: { id: 'mgr-relogin', role: 'manager', wilaya },
    registrationsRows: [{
      registration_id: 'MDZ-REG-2026-BISKRA',
      full_name: 'Biskra Row',
      role: 'breeder',
      user_type: 'breeder',
      wilaya,
      status: 'pending',
      created_at: '2026-07-27T00:00:00Z',
    }],
  });
  await settle(page, 700);
  await page.evaluate(() => window.logoutAccount());
  await settle(page, 200);
  // Re-login same manager, but profile bind returns null (roles still grant manager chrome).
  state.profile = null;
  state.registrationsRequests = 0;
  state.registrationsUrls = [];
  await page.evaluate((s) => window.saveSession(s), sessionFor('mgr-relogin'));
  await settle(page, 400);
  await page.evaluate(async () => {
    if (typeof window.openManagerDashboard === 'function') await window.openManagerDashboard();
  });
  await settle(page, 1200);
  const after = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    text: document.getElementById('managerDashContent')?.textContent || '',
  }));
  check(
    'logout→login manager: manager modal refused when profile bind has no wilaya',
    after.open === false,
    `open=${after.open} text=${JSON.stringify(after.text.slice(0, 120))}`,
  );
  check(
    'logout→login manager: no registrations fetch without resolved wilaya',
    state.registrationsRequests === 0,
    `requests=${state.registrationsRequests} urls=${JSON.stringify(state.registrationsUrls)}`,
  );
  check(
    'logout→login manager: must not issue unscoped registrations fetch',
    !anyUnscopedRegistrations(state.registrationsUrls),
    `urls=${JSON.stringify(state.registrationsUrls)}`,
  );
  await page.close();
}

// 2b) logout → full login path with a real wilaya on the profile (no profile=null injection)
{
  const wilaya = 'بسكرة';
  const userId = 'mgr-natural-relogin';
  const { page, state } = await loadApp({
    userId,
    roles: ['wilaya_manager'],
    profile: { id: userId, role: 'manager', wilaya, member_id: 'MDZ-W-000042', status: 'approved' },
    registrationsRows: [{
      registration_id: 'MDZ-REG-2026-BISKRA-NAT',
      full_name: 'Biskra Natural',
      role: 'breeder',
      user_type: 'breeder',
      wilaya,
      status: 'pending',
      created_at: '2026-07-27T00:00:00Z',
    }],
  });
  await settle(page, 700);
  await page.evaluate(() => window.logoutAccount());
  await settle(page, 300);

  // Full login path: form submit → resolve email → signIn → saveSession → openAccount.
  // Profile mock keeps the real wilaya row — never assigned to null in this test.
  state.registrationsRequests = 0;
  state.registrationsUrls = [];
  const profileRequestsBeforeLogin = state.profileRequests;
  await page.evaluate(() => window.openLogin());
  await page.type('#loginIdentifier', 'manager.biskra@example.com', { delay: 5 });
  await page.type('#loginForm input[name="password"]', 'test-password-ok', { delay: 5 });
  await Promise.all([
    page.click('#loginSubmit'),
    page.waitForFunction(() => {
      const session = localStorage.getItem('mdz_auth_session');
      return Boolean(session && JSON.parse(session)?.access_token);
    }, { timeout: 10000 }).catch(() => null),
  ]);
  await settle(page, 1500);

  await page.evaluate(async () => {
    window.__mgrRefreshWilayaArgs = [];
    const originalOpen = window.openManagerDashboard;
    // Probe the wilaya argument that refreshManagerDashboard passes into loadManagerData
    // by wrapping fetch for registrations while the dashboard opens.
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = String(args[0] || '');
      if (url.includes('/rest/v1/registrations')) {
        try {
          const u = new URL(url);
          window.__mgrRefreshWilayaArgs.push(u.searchParams.get('wilaya') || null);
        } catch {
          window.__mgrRefreshWilayaArgs.push(null);
        }
      }
      return origFetch(...args);
    };
    try {
      await originalOpen();
    } finally {
      window.fetch = origFetch;
    }
  });
  await settle(page, 1200);

  const after = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    text: document.getElementById('managerDashContent')?.textContent || '',
    wilayaArgs: window.__mgrRefreshWilayaArgs || [],
    hasSession: Boolean(localStorage.getItem('mdz_auth_session')),
  }));
  const scoped = allRegistrationsScopedByWilaya(state.registrationsUrls);
  const wilayaInUrl = state.registrationsUrls.some((u) => {
    try {
      return decodeURIComponent(u).includes(`wilaya=eq.${wilaya}`);
    } catch {
      return u.includes('wilaya=eq.');
    }
  });
  check(
    '2b natural logout→login: profile kept real wilaya (no null injection)',
    state.profile?.wilaya === wilaya,
    `profile=${JSON.stringify(state.profile)}`,
  );
  check(
    '2b natural logout→login: login restored a session',
    after.hasSession === true,
  );
  check(
    '2b natural logout→login: profile was re-fetched after login',
    state.profileRequests > profileRequestsBeforeLogin,
    `before=${profileRequestsBeforeLogin} after=${state.profileRequests}`,
  );
  check(
    '2b natural logout→login: wilaya reached registrations request (refreshManagerDashboard path)',
    after.wilayaArgs.some((w) => w === `eq.${wilaya}` || w === wilaya) || wilayaInUrl,
    `wilayaArgs=${JSON.stringify(after.wilayaArgs)} urls=${JSON.stringify(state.registrationsUrls)} text=${JSON.stringify(after.text.slice(0, 160))}`,
  );
  check(
    '2b natural logout→login: registrations URL must include wilaya=eq.',
    scoped || wilayaInUrl,
    `requests=${state.registrationsRequests} urls=${JSON.stringify(state.registrationsUrls)} open=${after.open}`,
  );
  check(
    '2b natural logout→login: rendered wilaya label (not laterValue)',
    after.open === true && after.text.includes(wilaya) && !after.text.includes('يُحدد لاحقًا'),
    `open=${after.open} text=${JSON.stringify(after.text.slice(0, 200))}`,
  );
  await page.close();
}

// 16) profile lookup throw falls back to in-memory profile (no silent .catch(()=>null))
{
  const wilaya = 'بسكرة';
  const userId = 'mgr-profile-fallback';
  const { page, state } = await loadApp({
    userId,
    roles: ['wilaya_manager'],
    profile: { id: userId, role: 'manager', wilaya, member_id: 'MDZ-W-000099', status: 'approved' },
    registrationsRows: [{
      registration_id: 'MDZ-REG-2026-FALLBACK',
      full_name: 'Fallback Row',
      role: 'breeder',
      user_type: 'breeder',
      wilaya,
      status: 'pending',
      created_at: '2026-07-27T00:00:00Z',
    }],
  });
  await settle(page, 700);
  await page.evaluate(async () => { await window.openAccount(); });
  await settle(page, 900);
  // Next ensureAccountProfile force-refetch will throw; in-memory profile must remain usable.
  state.profileStatus = 500;
  state.registrationsRequests = 0;
  state.registrationsUrls = [];
  await page.evaluate(async () => { await window.openManagerDashboard(); });
  await settle(page, 1200);
  const after = await page.evaluate(() => ({
    open: document.getElementById('managerDashModal').classList.contains('open'),
    text: document.getElementById('managerDashContent')?.textContent || '',
  }));
  check(
    'profile-fallback: manager opens using in-memory wilaya after profile fetch error',
    after.open === true && after.text.includes(wilaya) && !after.text.includes('يُحدد لاحقًا'),
    `open=${after.open} text=${JSON.stringify(after.text.slice(0, 180))}`,
  );
  check(
    'profile-fallback: registrations URL stays wilaya-scoped',
    allRegistrationsScopedByWilaya(state.registrationsUrls),
    `requests=${state.registrationsRequests} urls=${JSON.stringify(state.registrationsUrls)}`,
  );
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
assert.match(html, /function accessContextCurrent\(session,uid,epoch\)/, 'epoch-guarded context check required');
assert.match(html, /mdzAccessEpoch\+=1;/, 'clearing the context must invalidate in-flight responses');
assert.match(html, /function invalidatePrivilegedSurfaces\(\)/, 'privileged surface invalidator required');
assert.match(
  html,
  /function clearAccessContext\(\)\{[\s\S]*?invalidatePrivilegedSurfaces\(\);/,
  'every access-context clear must invalidate rendered privileged surfaces',
);
assert.match(
  html,
  /const data=await dash\.loadAdminData[\s\S]*?if\(!privilegedAccessCurrent\(snapshot\)\) return false;[\s\S]*?box\.innerHTML=/,
  'admin refresh must revalidate after data and before render',
);
assert.match(
  html,
  /const data=await dash\.loadManagerData[\s\S]*?if\(!privilegedAccessCurrent\(snapshot\)\) return false;[\s\S]*?box\.innerHTML=/,
  'manager refresh must revalidate after data and before render',
);
assert.match(
  html,
  /isAccessCurrent:\(\)=>privilegedAccessCurrent\(snapshot\)/,
  'review handlers must retain the access snapshot guard',
);
for (const fn of ['openManagerDashboard', 'openAdminDashboard']) {
  const body = html.match(new RegExp(`async function ${fn}\\(\\)\\{[\\s\\S]*?\\n\\}`))?.[0] || '';
  assert.match(body, /const access=await syncAccessContext/, `${fn} must capture the access result locally`);
  assert.match(body, /access\.state!=='ready'/, `${fn} must require a resolved role lookup`);
  assert.match(body, /accessContextCurrent\(session,access\.userId,access\.epoch\)/, `${fn} must revalidate the context`);
  assert.ok(!/\bmdzUserRoles\b/.test(body), `${fn} must gate on local access.roles, not the global cache`);
}
assert.ok(
  !/ensureAccountProfile\(session,\{force:true\}\)\.catch\(\(\)=>null\)/.test(html),
  'manager profile bind must not use silent .catch(()=>null)',
);
assert.match(
  html,
  /reuse the in-memory profile instead of swallowing/,
  'manager profile bind must document in-memory fallback',
);
assert.match(
  html,
  /Fail closed before open\/fetch: manager surfaces require a resolved wilaya/,
  'manager open path must fail closed without wilaya',
);
assert.match(
  html,
  /const wilaya=String\(profile\?\.wilaya\|\|''\)\.trim\(\);\s*\n\s*if\(!wilaya\)\{box\.replaceChildren\(\);return false\}/,
  'manager refresh must refuse load without wilaya',
);
const dashSrc = fs.readFileSync(path.join(REPO_ROOT, 'js/mdz-dashboards.mjs'), 'utf8');
assert.match(dashSrc, /manager_wilaya_required/, 'loadManagerData must reject missing wilaya');
check('static guards: epoch invalidation + local access gating', true);

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
