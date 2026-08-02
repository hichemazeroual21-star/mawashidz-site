import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(source, /const MDZ_REGISTRATION_BACKUP_SCHEMA=Object\.freeze\(\{/);
assert.doesNotMatch(source, /MDZ_SENSITIVE_STORAGE_FIELDS|stripSensitiveRegistrationFields/);
assert.doesNotMatch(source, /saveRow\('mdz_failed_registrations',[\s\S]{0,240}error:String\(error\)/);
assert.match(source, /failure_code:registrationFailureCode\(error\)/);
assert.match(source, /saveRow\('mdz_failed_registrations',buildRegistrationBackup\(raw,extra,\{failure_code:/);

const start = source.indexOf('function getRows(key)');
const end = source.indexOf('\nfunction makeRegistrationId()', start);
assert.ok(start >= 0 && end > start, 'registration storage helpers must be extractable');

const storageData = new Map();
const warnings = [];
const storage = {
  getItem: (key) => storageData.has(key) ? storageData.get(key) : null,
  setItem: (key, value) => storageData.set(key, String(value)),
};
const context = {
  localStorage: storage,
  console: { warn: (...args) => warnings.push(args.join(' ')) },
};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}\nthis.api={buildRegistrationBackup,normalizeRegistrationBackupRows,scrubRegistrationBackupStorage,saveRow,registrationFailureCode};`, context);
const {
  buildRegistrationBackup,
  normalizeRegistrationBackupRows,
  scrubRegistrationBackupStorage,
  saveRow,
  registrationFailureCode,
} = context.api;

const secretMarkers = [
  'PW_MARKER', 'PW2_MARKER', 'ACCESS_MARKER', 'REFRESH_MARKER',
  'ID_MARKER', 'API_MARKER', 'BEARER_MARKER', 'SESSION_MARKER', 'ERROR_BEARER_MARKER',
];
const poisoned = {
  first_name: 'A',
  email: 'a@example.com',
  role: 'buyer',
  password: 'PW_MARKER',
  password_confirm: 'PW2_MARKER',
  password_hash: 'PW_MARKER',
  passwordConfirmation: 'PW2_MARKER',
  access_token: 'ACCESS_MARKER',
  refresh_token: 'REFRESH_MARKER',
  id_token: 'ID_MARKER',
  api_key: 'API_MARKER',
  bearer_token: 'BEARER_MARKER',
  session_token: 'SESSION_MARKER',
  Authorization: 'Bearer BEARER_MARKER',
  error: 'Authorization: Bearer ERROR_BEARER_MARKER',
  bio: { token: 'BEARER_MARKER' },
  vet_services: ['فحص عام', { token: 'SESSION_MARKER' }, 'تلقيح'],
  unknown_field: 'drop-me',
};

const safe = buildRegistrationBackup(poisoned, {
  registration_id: 'MDZ-REG-1',
  failure_code: 'auth_failed',
});
assert.deepEqual(Object.keys(safe).sort(), [
  'email', 'failure_code', 'first_name', 'registration_id', 'role', 'vet_services',
].sort());
assert.deepEqual(safe.vet_services, ['فحص عام', 'تلقيح']);
assert.equal(safe.failure_code, 'auth_failed');
assert.equal('bio' in safe, false, 'object values are rejected even for known scalar fields');
assert.equal(secretMarkers.some((marker) => JSON.stringify(safe).includes(marker)), false);

assert.equal(buildRegistrationBackup({ failure_code: 'Bearer ERROR_BEARER_MARKER' }).failure_code, 'registration_failed');
assert.equal(registrationFailureCode({ status: 429 }), 'rate_limited');
assert.equal(registrationFailureCode({ status: 401 }), 'auth_failed');
assert.equal(registrationFailureCode({ name: 'AbortError' }), 'network_failed');
assert.equal(registrationFailureCode(new Error('Authorization: Bearer ERROR_BEARER_MARKER')), 'registration_failed');

const normalized = normalizeRegistrationBackupRows([
  poisoned,
  null,
  'invalid-row',
  [{ password: 'PW_MARKER' }],
]);
assert.equal(normalized.length, 1);
assert.equal(secretMarkers.some((marker) => JSON.stringify(normalized).includes(marker)), false);

storage.setItem('mdz_registrations', JSON.stringify([poisoned]));
storage.setItem('mdz_failed_registrations', '{"password":"PW_MARKER"');
warnings.length = 0;
scrubRegistrationBackupStorage(storage);
const oldSuccess = JSON.parse(storage.getItem('mdz_registrations'));
const oldFailure = JSON.parse(storage.getItem('mdz_failed_registrations'));
assert.equal(oldSuccess.length, 1);
assert.equal(oldSuccess[0].email, 'a@example.com');
assert.equal(secretMarkers.some((marker) => JSON.stringify(oldSuccess).includes(marker)), false);
assert.deepEqual(oldFailure, [], 'malformed legacy JSON must fail closed');
assert.ok(warnings.some((line) => line.includes('Malformed registration backup reset for mdz_failed_registrations')));
assert.equal(warnings.some((line) => secretMarkers.some((marker) => line.includes(marker))), false, 'warnings must not leak secret values');

storage.setItem('mdz_registrations', JSON.stringify([poisoned]));
assert.equal(saveRow('mdz_registrations', {
  email: 'new@example.com',
  password: 'PW_MARKER',
  error: 'Bearer ERROR_BEARER_MARKER',
}), true);
const savedRows = JSON.parse(storage.getItem('mdz_registrations'));
assert.equal(savedRows.length, 2);
assert.equal(secretMarkers.some((marker) => JSON.stringify(savedRows).includes(marker)), false);
assert.equal(typeof savedRows.at(-1).createdAt, 'string');

console.log(`PROBE_SHA=${process.env.GITHUB_SHA || 'local'}`);
console.log(`PROBE_ALIASES=${['password','password_confirm','password_hash','passwordConfirmation','access_token','refresh_token','id_token','api_key','bearer_token','session_token','Authorization'].join(',')}`);
console.log(`PROBE_LEGACY_SUCCESS=${JSON.stringify(oldSuccess)}`);
console.log(`PROBE_MALFORMED_RESULT=${JSON.stringify(oldFailure)}`);
console.log(`PROBE_NEW_ROWS=${JSON.stringify(savedRows)}`);
console.log('  ✓ registration backup positive-schema containment');
