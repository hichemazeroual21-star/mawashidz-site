#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
source = index_path.read_text(encoding="utf-8")

old_helpers = """function stripSensitiveRegistrationFields(value){
  if(Array.isArray(value)) return value.map(stripSensitiveRegistrationFields);
  if(!value||typeof value!=='object') return value;
  const clean={};
  for(const [key,item] of Object.entries(value)){
    if(MDZ_SENSITIVE_STORAGE_FIELDS.has(String(key).toLowerCase())) continue;
    clean[key]=stripSensitiveRegistrationFields(item);
  }
  return clean;
}
function scrubRegistrationBackupStorage(storage=localStorage){
  for(const key of MDZ_REGISTRATION_STORAGE_KEYS){
    try{
      const rawValue=storage.getItem(key);
      if(!rawValue) continue;
      const parsed=JSON.parse(rawValue);
      const cleaned=stripSensitiveRegistrationFields(parsed);
      const encoded=JSON.stringify(cleaned);
      if(encoded!==rawValue) storage.setItem(key,encoded);
    }catch(error){
      console.warn(`Credential scrub skipped for ${key}:`,error);
    }
  }
}
function saveRow(key,row){
  try{
    const rows=getRows(key);
    const safeRow=MDZ_REGISTRATION_STORAGE_KEYS.includes(key)
      ? stripSensitiveRegistrationFields(row)
      : row;
    rows.push({...safeRow,createdAt:new Date().toISOString()});
    // نحتفظ بآخر 100 سجل فقط حتى لا يمتلئ تخزين الهاتف ويُظهر خطأً كاذبًا بعد نجاح التسجيل.
    localStorage.setItem(key,JSON.stringify(rows.slice(-100)));
    return true;
  }catch(error){
    console.warn('Local backup skipped:',error);
    return false;
  }
}
"""

new_helpers = """function stripSensitiveRegistrationFields(value,removedFields=new Set(),path=''){
  if(Array.isArray(value)){
    return value.map((item,index)=>stripSensitiveRegistrationFields(item,removedFields,`${path}[${index}]`));
  }
  if(!value||typeof value!=='object') return value;
  const clean={};
  for(const [key,item] of Object.entries(value)){
    const fieldPath=path?`${path}.${key}`:key;
    if(MDZ_SENSITIVE_STORAGE_FIELDS.has(String(key).toLowerCase())){
      removedFields.add(fieldPath);
      continue;
    }
    clean[key]=stripSensitiveRegistrationFields(item,removedFields,fieldPath);
  }
  return clean;
}
function formatRemovedRegistrationFields(fields){
  return [...fields].sort().join(', ');
}
function scrubRegistrationBackupStorage(storage=localStorage){
  for(const key of MDZ_REGISTRATION_STORAGE_KEYS){
    try{
      const rawValue=storage.getItem(key);
      if(!rawValue) continue;
      const parsed=JSON.parse(rawValue);
      const removedFields=new Set();
      const cleaned=stripSensitiveRegistrationFields(parsed,removedFields);
      const encoded=JSON.stringify(cleaned);
      if(encoded!==rawValue){
        storage.setItem(key,encoded);
        console.warn(`Sensitive legacy registration fields scrubbed from ${key}: ${formatRemovedRegistrationFields(removedFields)}`);
      }
    }catch(error){
      console.warn(`Credential scrub skipped for ${key}:`,error);
    }
  }
}
function saveRow(key,row){
  try{
    const rows=getRows(key);
    const removedFields=new Set();
    const safeRow=MDZ_REGISTRATION_STORAGE_KEYS.includes(key)
      ? stripSensitiveRegistrationFields(row,removedFields)
      : row;
    if(removedFields.size){
      console.warn(`Sensitive registration fields stripped before ${key} storage: ${formatRemovedRegistrationFields(removedFields)}`);
    }
    rows.push({...safeRow,createdAt:new Date().toISOString()});
    // نحتفظ بآخر 100 سجل فقط حتى لا يمتلئ تخزين الهاتف ويُظهر خطأً كاذبًا بعد نجاح التسجيل.
    localStorage.setItem(key,JSON.stringify(rows.slice(-100)));
    return true;
  }catch(error){
    console.warn('Local backup skipped:',error);
    return false;
  }
}
"""

if source.count(old_helpers) != 1:
    raise SystemExit(f"helper anchor count={source.count(old_helpers)}")
source = source.replace(old_helpers, new_helpers, 1)
index_path.write_text(source, encoding="utf-8")

unit_test = r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(source, /const MDZ_REGISTRATION_BACKUP_FIELDS=Object\.freeze\(\[/);
const allowlistStart = source.indexOf('const MDZ_REGISTRATION_BACKUP_FIELDS=');
const allowlistEnd = source.indexOf(']);', allowlistStart) + 3;
assert.ok(allowlistStart >= 0 && allowlistEnd > allowlistStart, 'registration allow-list must be bounded');
const allowlistSource = source.slice(allowlistStart, allowlistEnd);
assert.doesNotMatch(allowlistSource, /password|access_token|refresh_token|authorization|secret/);
assert.match(source, /saveRow\('mdz_registrations',buildRegistrationBackup\(/);
assert.match(source, /saveRow\('mdz_failed_registrations',buildRegistrationBackup\(/);
assert.doesNotMatch(source, /saveRow\('mdz_(?:failed_)?registrations',[\s\S]{0,120}\{\.\.\.raw/);
assert.match(source, /scrubRegistrationBackupStorage\(\);/);
assert.match(source, /Sensitive registration fields stripped before \$\{key\} storage/);

const start = source.indexOf('const MDZ_REGISTRATION_BACKUP_FIELDS=');
const end = source.indexOf('\nscrubRegistrationBackupStorage();', start);
assert.ok(start >= 0 && end > start, 'containment helpers must be extractable');
const helperSource = `function getRows(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}}\n${source.slice(start, end)}\nthis.api={buildRegistrationBackup,stripSensitiveRegistrationFields,scrubRegistrationBackupStorage,saveRow};`;
const storageData = new Map();
const warnings = [];
const storage = {
  getItem: key => storageData.has(key) ? storageData.get(key) : null,
  setItem: (key, value) => storageData.set(key, String(value)),
};
const context = { localStorage: storage, console: { warn: (...args) => warnings.push(args.join(' ')) } };
vm.createContext(context);
vm.runInContext(helperSource, context);
const { buildRegistrationBackup, stripSensitiveRegistrationFields, scrubRegistrationBackupStorage, saveRow } = context.api;

const safe = buildRegistrationBackup({
  first_name: 'A', email: 'a@example.com', password: 'secret', password_confirm: 'secret',
  access_token: 'token', unknown_field: 'drop-me',
}, { registration_id: 'MDZ-REG-1' }, { status: 'pending' });
assert.equal(safe.first_name, 'A');
assert.equal(safe.registration_id, 'MDZ-REG-1');
assert.equal(safe.status, 'pending');
assert.equal('password' in safe, false);
assert.equal('password_confirm' in safe, false);
assert.equal('access_token' in safe, false);
assert.equal('unknown_field' in safe, false);

const removed = new Set();
const cleaned = stripSensitiveRegistrationFields({
  password: 'x', profile: { password_confirm: 'y', phone: '+213' }, rows: [{ token: 'z', role: 'buyer' }],
}, removed);
assert.equal('password' in cleaned, false);
assert.equal('password_confirm' in cleaned.profile, false);
assert.equal(cleaned.profile.phone, '+213');
assert.equal('token' in cleaned.rows[0], false);
assert.equal(cleaned.rows[0].role, 'buyer');
assert.deepEqual([...removed].sort(), ['password', 'profile.password_confirm', 'rows[0].token']);

warnings.length = 0;
assert.equal(saveRow('mdz_registrations', { email: 'a@example.com', password: 'x', nested: { token: 'z' } }), true);
const saved = JSON.parse(storage.getItem('mdz_registrations'));
assert.equal(saved.length, 1);
assert.equal(saved[0].email, 'a@example.com');
assert.equal('password' in saved[0], false);
assert.equal('token' in saved[0].nested, false);
assert.ok(warnings.some((line) => line.includes('Sensitive registration fields stripped') && line.includes('password') && line.includes('nested.token')),
  'second storage layer must strip and warn without leaking values');
assert.ok(warnings.every((line) => !line.includes("'x'") && !line.includes("'z'")), 'warnings must not leak sensitive values');

storage.setItem('mdz_registrations', JSON.stringify([{ email: 'a@example.com', password: 'x' }]));
storage.setItem('mdz_failed_registrations', JSON.stringify([{ error: 'network', password_confirm: 'y' }]));
warnings.length = 0;
scrubRegistrationBackupStorage(storage);
const oldSuccess = JSON.parse(storage.getItem('mdz_registrations'));
const oldFailure = JSON.parse(storage.getItem('mdz_failed_registrations'));
assert.deepEqual(oldSuccess, [{ email: 'a@example.com' }]);
assert.deepEqual(oldFailure, [{ error: 'network' }]);
assert.ok(warnings.some((line) => line.includes('Sensitive legacy registration fields scrubbed') && line.includes('password')));
assert.ok(warnings.some((line) => line.includes('Sensitive legacy registration fields scrubbed') && line.includes('password_confirm')));

console.log('  ✓ registration credential storage containment (positive allow-list + fail-closed warning)');
'''
(root / "tests" / "registration-storage-containment.test.mjs").write_text(unit_test, encoding="utf-8")

browser_test = r'''#!/usr/bin/env node
/**
 * PKG-E2 browser evidence.
 * Runs one successful registration and one failed auth registration in a real Chromium page,
 * inspects both localStorage backup keys, and writes screenshots + JSON evidence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const PORT = 8794;
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'pkg-e2');
const SHA = process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const PASSWORD = 'Str0ng!Pass';
const FORBIDDEN_KEYS = new Set(['password', 'password_confirm', 'access_token', 'refresh_token', 'authorization', 'token', 'secret']);
const CHROME = process.env.CHROME_BIN || [
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].find((candidate) => fs.existsSync(candidate));
assert.ok(CHROME, 'Chrome/Chromium executable is required for PKG-E2 browser evidence');

fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
execSync('node scripts/sync-worker-public.mjs', { stdio: 'pipe' });
const PUBLISH = path.join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png' };

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

function findForbiddenKeys(value, pathName = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${pathName}[${index}]`, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [key, item] of Object.entries(value)) {
    const currentPath = `${pathName}.${key}`;
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) found.push(currentPath);
    findForbiddenKeys(item, currentPath, found);
  }
  return found;
}

async function fillRegistration(page, suffix) {
  await page.evaluate(() => openRegister('vet'));
  await page.type('#firstName', 'محمد');
  await page.type('#lastName', 'اختبار');
  await page.evaluate(() => {
    document.getElementById('birthDate').value = '1990-05-14';
    document.getElementById('mobileOperator').value = '05';
  });
  await page.type('#phoneLocal', `51${suffix.padStart(6, '0')}`.slice(0, 8));
  await page.type('#registerEmail', `pkg-e2-${suffix}@example.com`);
  await page.type('#registerPassword', PASSWORD);
  await page.type('#registerPasswordConfirm', PASSWORD);
  await page.evaluate(() => {
    const wilaya = document.getElementById('wilayaSelect');
    const option = [...wilaya.options].find((item) => item.value.includes('المدية')) || wilaya.options[1];
    wilaya.value = option.value;
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

async function runScenario({ name, signupStatus, suffix }) {
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=ar'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = request.url();
    if (url.startsWith(`http://localhost:${PORT}`)) return request.continue();
    if (url.includes('fpjvjfgwbfehhcvdirpy.supabase.co')) {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 200, headers: cors, body: '' });
      if (url.includes('/auth/v1/signup')) {
        if (signupStatus !== 200) {
          return request.respond({ status: signupStatus, headers: cors, contentType: 'application/json', body: JSON.stringify({ message: 'forced auth failure' }) });
        }
        return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({
          id: `u-${suffix}`,
          user: { id: `u-${suffix}`, user_metadata: { member_id: 'MDZ-V-000001' } },
          session: null,
        }) });
      }
      if (url.includes('/rest/v1/profiles')) {
        return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify([{ member_id: 'MDZ-V-000001', role: 'vet', status: 'pending' }]) });
      }
      if (url.includes('/rest/v1/registrations')) return request.respond({ status: 201, headers: cors, body: '' });
      return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    if (url.includes('cdn.jsdelivr.net/npm/@emailjs')) {
      return request.respond({ status: 200, contentType: 'application/javascript', body: 'window.emailjs={init(){},send(){return Promise.resolve({status:200})}}' });
    }
    if (url.includes('api.open-meteo.com')) {
      return request.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 24, wind_speed_10m: 10, precipitation: 0 } }) });
    }
    return request.abort('failed');
  });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await fillRegistration(page, suffix);
  await page.evaluate(() => document.getElementById('registerSubmit').click());
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const storage = await page.evaluate(() => {
    const read = (key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    };
    return {
      mdz_registrations: read('mdz_registrations'),
      mdz_failed_registrations: read('mdz_failed_registrations'),
    };
  });
  const forbidden = findForbiddenKeys(storage);
  const serialized = JSON.stringify(storage);
  assert.deepEqual(forbidden, [], `${name}: forbidden keys reached localStorage: ${forbidden.join(', ')}`);
  assert.equal(serialized.includes(PASSWORD), false, `${name}: raw password value reached localStorage`);
  if (signupStatus === 200) {
    assert.equal(storage.mdz_registrations.length, 1, `${name}: successful backup row missing`);
    assert.equal(storage.mdz_failed_registrations.length, 0, `${name}: failed backup must remain empty`);
  } else {
    assert.equal(storage.mdz_registrations.length, 0, `${name}: successful backup must remain empty`);
    assert.equal(storage.mdz_failed_registrations.length, 1, `${name}: failed backup row missing`);
  }

  await page.evaluate(({ scenario, sha, snapshot }) => {
    document.querySelectorAll('.modal').forEach((modal) => modal.classList.remove('open'));
    const panel = document.createElement('pre');
    panel.id = 'pkg-e2-browser-evidence';
    panel.textContent = [
      'PKG-E2 BROWSER STORAGE EVIDENCE',
      `scenario: ${scenario}`,
      `sha: ${sha}`,
      '',
      JSON.stringify(snapshot, null, 2),
    ].join('\n');
    Object.assign(panel.style, {
      position: 'fixed', inset: '12px', zIndex: '999999', margin: '0', padding: '18px',
      overflow: 'auto', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left',
      background: '#07100c', color: '#e8f0eb', border: '2px solid #c9a64e', borderRadius: '14px',
      font: '12px/1.5 monospace', boxShadow: '0 12px 40px #0009',
    });
    document.body.appendChild(panel);
  }, { scenario: name, sha: SHA, snapshot: storage });

  const screenshot = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();
  return { scenario: name, sha: SHA, storage, forbiddenKeys: forbidden, screenshot: path.relative(ROOT, screenshot) };
}

try {
  const evidence = [];
  evidence.push(await runScenario({ name: 'successful-registration', signupStatus: 200, suffix: '100001' }));
  evidence.push(await runScenario({ name: 'failed-registration', signupStatus: 500, suffix: '100002' }));
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence.json'), JSON.stringify({ sha: SHA, generatedAt: new Date().toISOString(), evidence }, null, 2) + '\n');
  console.log(`  ✓ PKG-E2 browser storage evidence: success + failure clean on ${SHA}`);
} finally {
  server.close();
}
'''
(root / "tests" / "registration-storage-browser.test.mjs").write_text(browser_test, encoding="utf-8")

package_path = root / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package["scripts"]["test:storage-browser"] = "node tests/registration-storage-browser.test.mjs"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

ci_path = root / ".github" / "workflows" / "ci.yml"
ci = ci_path.read_text(encoding="utf-8")
anchor = """      - name: Verify public/ sync
        run: |
          npm run build
          npm run verify:public
"""
insert = anchor + """      - name: PKG-E2 browser storage evidence
        run: npm run test:storage-browser
      - name: Upload PKG-E2 browser evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pkg-e2-browser-evidence-${{ github.sha }}
          path: artifacts/pkg-e2/
          if-no-files-found: error
"""
if ci.count(anchor) != 1:
    raise SystemExit(f"CI anchor count={ci.count(anchor)}")
ci_path.write_text(ci.replace(anchor, insert, 1), encoding="utf-8")

print("PKG-E2 final review patch applied")
