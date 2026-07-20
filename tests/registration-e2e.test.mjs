#!/usr/bin/env node
/**
 * End-to-end registration path (mocked Supabase + EmailJS).
 * Proves: submit → auth signup → registrations insert → success UI.
 * Fails if an error toast appears despite successful auth + insert.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const PORT = 8792;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

execSync('node scripts/sync-worker-public.mjs', { stdio: 'pipe' });
const PUBLISH = path.join(ROOT, 'public');

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(PUBLISH, p);
  if (!file.startsWith(PUBLISH) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const results = { passed: [], failed: [] };
function pass(name) { results.passed.push(name); console.log(`  ✓ ${name}`); }
function fail(name, detail) { results.failed.push({ name, detail }); console.error(`  ✗ ${name} — ${detail}`); }

async function runScenario(name, { registrationsStatus = 201, emailThrows = false } = {}) {
  const supabaseCalls = [];
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=ar'],
  });
  const page = await browser.newPage();
  const ui = { toasts: [], consoleErrors: [] };
  page.on('console', (m) => { if (m.type() === 'error') ui.consoleErrors.push(m.text()); });

  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return req.continue();
    if (url.includes('fpjvjfgwbfehhcvdirpy.supabase.co')) {
      let body = req.postData();
      if (body === undefined && req.fetchPostData) {
        try { body = await req.fetchPostData(); } catch { /* ignore */ }
      }
      supabaseCalls.push({ url, method: req.method(), body: body || '' });
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      };
      if (req.method() === 'OPTIONS') return req.respond({ status: 200, headers: cors, body: '' });
      if (url.includes('/auth/v1/signup')) {
        return req.respond({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'u-e2e',
            user: { id: 'u-e2e', user_metadata: { member_id: 'MDZ-V-000001' } },
            session: null,
          }),
        });
      }
      if (url.includes('/rest/v1/profiles')) {
        return req.respond({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify([{ member_id: 'MDZ-V-000001', role: 'vet', status: 'pending' }]),
        });
      }
      if (url.includes('/rest/v1/registrations')) {
        return req.respond({ status: registrationsStatus, headers: cors, body: registrationsStatus === 201 ? '' : '{"message":"server error"}' });
      }
      return req.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('cdn.jsdelivr.net/npm/@emailjs')) {
      const stub = emailThrows
        ? 'window.emailjs={init(){},send(){return Promise.reject(new Error("EmailJS down"))}}'
        : 'window.emailjs={init(){},send(){window.__emailSends=(window.__emailSends||0)+1;return Promise.resolve({status:200})}}';
      return req.respond({ status: 200, contentType: 'application/javascript', body: stub });
    }
    if (url.includes('api.open-meteo.com')) {
      return req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 10, precipitation: 0 } }),
      });
    }
    return req.abort('failed');
  });

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 700));

  await page.evaluate(() => openRegister('vet'));
  await new Promise((r) => setTimeout(r, 300));
  await page.type('#firstName', 'محمد');
  await page.type('#lastName', 'اختبار');
  await page.evaluate(() => {
    document.getElementById('birthDate').value = '1990-05-14';
    document.getElementById('mobileOperator').value = '05';
  });
  await page.type('#phoneLocal', '51234567');
  await page.type('#registerEmail', `e2e.${Date.now()}@example.com`);
  await page.type('#registerPassword', 'Str0ng!Pass');
  await page.type('#registerPasswordConfirm', 'Str0ng!Pass');
  await page.evaluate(() => {
    const w = document.getElementById('wilayaSelect');
    w.value = [...w.options].find((o) => o.value.includes('المدية')).value;
    w.dispatchEvent(new Event('change'));
    const d = document.getElementById('dairaSelect');
    d.value = 'المدية';
    d.dispatchEvent(new Event('change'));
    document.getElementById('communeSelect').value = document.getElementById('communeSelect').options[1].value;
    document.querySelector('[name="vet_license"]').value = 'VET-E2E';
    document.querySelector('[name="clinic_name"]').value = 'عيادة';
    document.querySelector('[name="vet_specialty"]').value = 'طب بيطري عام';
    document.querySelector('[name="privacy_accept"]').checked = true;
    document.querySelector('[name="founder_terms"]').checked = true;
  });

  await page.evaluate(() => document.getElementById('registerSubmit').click());
  await new Promise((r) => setTimeout(r, 1500));

  const state = await page.evaluate(() => {
    const confirm = document.getElementById('registerConfirm');
    const toast = document.getElementById('toast');
    const modal = document.getElementById('registerModal');
    return {
      successCard: confirm?.className.includes('premium-success') && confirm.style.display === 'block',
      isSuccessModal: modal?.classList.contains('is-success'),
      confirmHtml: confirm?.innerHTML || '',
      toastText: toast?.textContent?.trim() || '',
      toastVisible: toast?.classList.contains('show'),
    };
  });

  await browser.close();

  const signup = supabaseCalls.find((c) => c.url.includes('/auth/v1/signup') && c.method === 'POST');
  const insert = supabaseCalls.find((c) => c.url.includes('/rest/v1/registrations') && c.method === 'POST');

  return { name, signup, insert, state, ui, supabaseCalls };
}

try {
  // Scenario 1: full happy path
  const happy = await runScenario('happy path');
  if (!happy.signup) fail(`${happy.name}: signup called`, 'missing POST /auth/v1/signup');
  else pass(`${happy.name}: signup POST reached Supabase`);
  if (!happy.insert) fail(`${happy.name}: registrations insert`, 'missing POST /rest/v1/registrations');
  else pass(`${happy.name}: registrations insert reached Supabase`);
  if (!happy.state.successCard || !happy.state.isSuccessModal) {
    fail(`${happy.name}: success UI`, `card=${happy.state.successCard} modal=${happy.state.isSuccessModal}`);
  } else pass(`${happy.name}: premium-success + is-success shown`);
  if (/تعذر|خطأ|فشل|error/i.test(happy.state.toastText) && happy.state.toastVisible) {
    fail(`${happy.name}: no false error toast`, happy.state.toastText);
  } else pass(`${happy.name}: no false error toast after success`);
  if (!/MDZ-REG-\d{4}-\d{6}/.test(happy.state.confirmHtml)) {
    fail(`${happy.name}: registration id in success card`, 'MDZ-REG missing');
  } else pass(`${happy.name}: registration id visible in success card`);

  // Scenario 2: registrations insert fails AFTER auth — must still show success (pipeline design)
  const partial = await runScenario('auth ok + registrations 500', { registrationsStatus: 500 });
  if (!partial.signup) fail(`${partial.name}: signup called`, 'missing signup');
  else pass(`${partial.name}: signup still called`);
  if (!partial.state.successCard) {
    fail(`${partial.name}: must still show success UI`, `card=${partial.state.successCard}`);
  } else pass(`${partial.name}: success UI despite registrations failure (no false error)`);
  if (partial.state.confirmHtml.includes('تعذر حفظ الطلب') && !partial.state.successCard) {
    fail(`${partial.name}: false error in confirm box`, 'old coupled error path');
  } else pass(`${partial.name}: confirm box is not a hard failure message`);

  // Scenario 3: email fails after success — UI still success
  const emailFail = await runScenario('auth ok + email down', { emailThrows: true });
  if (!emailFail.state.successCard) fail(`${emailFail.name}: success UI`, 'missing success card');
  else pass(`${emailFail.name}: success UI when EmailJS fails`);
} finally {
  server.close();
}

const total = results.passed.length + results.failed.length;
console.log(`\nRegistration E2E: ${results.passed.length}/${total} passed`);
if (results.failed.length) {
  results.failed.forEach((f) => console.error(`  FAILED: ${f.name} — ${f.detail}`));
  process.exit(1);
}
