import assert from 'node:assert/strict';
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

const start = source.indexOf('const MDZ_REGISTRATION_BACKUP_FIELDS=');
const end = source.indexOf('\nfunction saveRow(key,row)', start);
assert.ok(start >= 0 && end > start, 'containment helpers must be extractable');
const helperSource = `${source.slice(start, end)}\nthis.api={buildRegistrationBackup,stripSensitiveRegistrationFields,scrubRegistrationBackupStorage};`;
const storageData = new Map();
const storage = {
  getItem: key => storageData.has(key) ? storageData.get(key) : null,
  setItem: (key, value) => storageData.set(key, String(value)),
};
const context = { localStorage: storage, console };
vm.createContext(context);
vm.runInContext(helperSource, context);
const { buildRegistrationBackup, stripSensitiveRegistrationFields, scrubRegistrationBackupStorage } = context.api;

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

const cleaned = stripSensitiveRegistrationFields({
  password: 'x', profile: { password_confirm: 'y', phone: '+213' }, rows: [{ token: 'z', role: 'buyer' }],
});
assert.equal('password' in cleaned, false);
assert.equal('password_confirm' in cleaned.profile, false);
assert.equal(cleaned.profile.phone, '+213');
assert.equal('token' in cleaned.rows[0], false);
assert.equal(cleaned.rows[0].role, 'buyer');

storage.setItem('mdz_registrations', JSON.stringify([{ email: 'a@example.com', password: 'x' }]));
storage.setItem('mdz_failed_registrations', JSON.stringify([{ error: 'network', password_confirm: 'y' }]));
scrubRegistrationBackupStorage(storage);
const oldSuccess = JSON.parse(storage.getItem('mdz_registrations'));
const oldFailure = JSON.parse(storage.getItem('mdz_failed_registrations'));
assert.deepEqual(oldSuccess, [{ email: 'a@example.com' }]);
assert.deepEqual(oldFailure, [{ error: 'network' }]);

console.log('  ✓ registration credential storage containment');
