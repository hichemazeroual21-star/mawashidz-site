#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { chromeExecutablePath, REPO_ROOT } from './helpers/puppeteer-env.mjs';

const ROOT = REPO_ROOT;
const PORT = 8794;
const SHA = process.env.EVIDENCE_SHA || execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
const PASSWORD = 'Str0ng!Pass-PW_MARKER';
const ERROR_MARKER = 'ERROR_BEARER_MARKER';
const ARTIFACT_DIR = path.join(ROOT, 'tests', '.artifacts', 'pkg-e2');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
execSync('node scripts/sync-worker-public.mjs', { cwd: ROOT, stdio: 'pipe' });
const PUBLISH = path.join(ROOT, 'public');

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/') requestPath = '/index.html';
  const file = path.join(PUBLISH, requestPath);
  if (!file.startsWith(PUBLISH) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, resolve));

function credentialPaths(value, current = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => credentialPaths(item, `${current}[${index}]`, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [key, item] of Object.entries(value)) {
    const next = `${current}.${key}`;
    if (/(?:pass(?:word)?|token|secret|authorization|api[_-]?key)/i.test(key)) found.push(next);
    credentialPaths(item, next, found);
  }
  return found;
}

async function createPage(signupStatus = 200) {
  const browser = await puppeteer.launch({
    executablePath: chromeExecutablePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=ar'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = request.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return request.continue();
    if (url.includes('fpjvjfgwbfehhcvdirpy.supabase.co')) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      };
      if (request.method() === 'OPTIONS') return request.respond({ status: 200, headers: cors, body: '' });
      if (url.includes('/auth/v1/signup')) {
        if (signupStatus !== 200) {
          return request.respond({
            status: signupStatus,
            headers: cors,
            contentType: 'application/json',
            body: JSON.stringify({ message: `Authorization: Bearer ${ERROR_MARKER}` }),
          });
        }
        return request.respond({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'u-pkg-e2',
            user: { id: 'u-pkg-e2', user_metadata: { member_id: 'MDZ-V-000001' } },
            session: null,
          }),
        });
      }
      if (url.includes('/rest/v1/profiles')) {
        return request.respond({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify([{ member_id: 'MDZ-V-000001', role: 'vet', status: 'pending' }]),
        });
      }
      if (url.includes('/rest/v1/registrations')) return request.respond({ status: 201, headers: cors, body: '' });
      return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('cdn.jsdelivr.net/npm/@emailjs')) {
      return request.respond({
        status: 200,
        contentType: 'application/javascript',
        body: 'window.emailjs={init(){},send(){return Promise.resolve({status:200})}}',
      });
    }
    if (url.includes('api.open-meteo.com')) {
      return request.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 10, precipitation: 0 } }),
      });
    }
    return request.abort('failed');
  });
  return { browser, page };
}

async function fillRegistration(page, suffix) {
  await page.evaluate(() => openRegister('vet'));
  await page.type('#firstName', 'محمد');
  await page.type('#lastName', 'اختبار');
  await page.evaluate(() => {
    document.getElementById('birthDate').value = '1990-05-14';
    document.getElementById('mobileOperator').value = '05';
  });
  await page.type('#phoneLocal', `51${suffix}`.slice(0, 8));
  await page.type('#registerEmail', `pkg-e2-${suffix}@example.com`);
  await page.type('#registerPassword', PASSWORD);
  await page.type('#registerPasswordConfirm', PASSWORD);
  await page.evaluate(() => {
    const wilaya = document.getElementById('wilayaSelect');
    const wilayaOption = [...wilaya.options].find((item) => item.value.includes('المدية')) || wilaya.options[1];
    wilaya.value = wilayaOption.value;
    wilaya.dispatchEvent(new Event('change'));
    const daira = document.getElementById('dairaSelect');
    if (daira.options.length > 1) {
      daira.value = daira.options[1].value;
      daira.dispatchEvent(new Event('change'));
    }
    const commune = document.getElementById('communeSelect');
    if (commune.options.length > 1) commune.value = commune.options[1].value;
    document.querySelector('[name="vet_license"]').value = 'VET-PKG-E2';
    document.querySelector('[name="clinic_name"]').value = 'عيادة الاختبار';
    document.querySelector('[name="vet_specialty"]').value = 'طب بيطري عام';
    document.querySelector('[name="privacy_accept"]').checked = true;
    document.querySelector('[name="founder_terms"]').checked = true;
  });
}

async function readStorage(page) {
  return page.evaluate(() => {
    const read = (key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    };
    return {
      mdz_registrations: read('mdz_registrations'),
      mdz_failed_registrations: read('mdz_failed_registrations'),
    };
  });
}

async function legacyProbe() {
  const { browser, page } = await createPage();
  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('mdz_registrations', JSON.stringify([{
        email: 'legacy@example.com',
        password: 'PW_MARKER',
        password_hash: 'PW_MARKER',
        passwordConfirmation: 'PW2_MARKER',
        access_token: 'ACCESS_MARKER',
        refresh_token: 'REFRESH_MARKER',
        id_token: 'ID_MARKER',
        api_key: 'API_MARKER',
        bearer_token: 'BEARER_MARKER',
        session_token: 'SESSION_MARKER',
        error: 'Authorization: Bearer ERROR_BEARER_MARKER',
      }]));
      localStorage.setItem('mdz_failed_registrations', '{"password":"PW_MARKER"');
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    const storage = await readStorage(page);
    assert.deepEqual(storage.mdz_registrations, [{ email: 'legacy@example.com' }]);
    assert.deepEqual(storage.mdz_failed_registrations, []);
    assert.deepEqual(credentialPaths(storage), []);
    const serialized = JSON.stringify(storage);
    assert.equal(serialized.includes('MARKER'), false);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'legacy-cleanup.png'), fullPage: true });
    return { scenario: 'legacy-cleanup', storage, credentialPaths: [] };
  } finally {
    await browser.close();
  }
}

async function registrationProbe({ name, signupStatus, suffix }) {
  const { browser, page } = await createPage(signupStatus);
  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await fillRegistration(page, suffix);
    await page.evaluate(() => document.getElementById('registerSubmit').click());
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const storage = await readStorage(page);
    const forbidden = credentialPaths(storage);
    const serialized = JSON.stringify(storage);
    assert.deepEqual(forbidden, [], `${name}: credential-like keys reached storage`);
    assert.equal(serialized.includes(PASSWORD), false, `${name}: password value reached storage`);
    assert.equal(serialized.includes(ERROR_MARKER), false, `${name}: error bearer value reached storage`);
    if (signupStatus === 200) {
      assert.equal(storage.mdz_registrations.length, 1);
      assert.equal(storage.mdz_failed_registrations.length, 0);
    } else {
      assert.equal(storage.mdz_registrations.length, 0);
      assert.equal(storage.mdz_failed_registrations.length, 1);
      assert.equal(
        storage.mdz_failed_registrations[0].failure_code,
        'auth_failed',
        `${name}: a rejected Auth signup must persist only the bounded auth failure category`,
      );
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
    return { scenario: name, storage, credentialPaths: forbidden };
  } finally {
    await browser.close();
  }
}

try {
  const evidence = [
    await legacyProbe(),
    await registrationProbe({ name: 'successful-registration', signupStatus: 200, suffix: '100001' }),
    await registrationProbe({ name: 'failed-registration', signupStatus: 500, suffix: '100002' }),
  ];
  const report = { sha: SHA, generatedAt: new Date().toISOString(), evidence };
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PROBE_SHA=${SHA}`);
  for (const item of evidence) console.log(`PROBE_${item.scenario.toUpperCase().replaceAll('-', '_')}=${JSON.stringify(item.storage)}`);
  console.log('  ✓ PKG-E2 browser storage evidence: legacy + success + failure clean');
} finally {
  server.close();
}
