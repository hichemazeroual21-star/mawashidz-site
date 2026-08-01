#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
source = index_path.read_text(encoding="utf-8")

old_save = """function saveRow(key,row){
  try{
    const rows=getRows(key);
    rows.push({...row,createdAt:new Date().toISOString()});
    // نحتفظ بآخر 100 سجل فقط حتى لا يمتلئ تخزين الهاتف ويُظهر خطأً كاذبًا بعد نجاح التسجيل.
    localStorage.setItem(key,JSON.stringify(rows.slice(-100)));
    return true;
  }catch(error){
    console.warn('Local backup skipped:',error);
    return false;
  }
}
"""

new_save = """const MDZ_REGISTRATION_BACKUP_FIELDS=Object.freeze([
  'registration_id','member_id','member_id_sequential','member_invite_code',
  'first_name','last_name','full_name','birth_date','phone','email','whatsapp',
  'wilaya','daira','commune','user_type','role','message','is_verified',
  'privacy_accepted','founding_terms_accepted','invited_by','referral_code','bio',
  'livestock_count','breeder_activity','vet_license','clinic_name','vet_specialty',
  'vet_experience_years','graduation_year','coverage','vet_services','accept_requests',
  'accept_qr','business_name','feed_types','delivery','buyer_interest','buyer_delivery',
  'qualification','management_experience','manager_plan','ambassador_plan',
  'partner_business','partnership_type','status','error','createdAt'
]);
const MDZ_REGISTRATION_STORAGE_KEYS=Object.freeze(['mdz_registrations','mdz_failed_registrations']);
const MDZ_SENSITIVE_STORAGE_FIELDS=new Set([
  'password','password_confirm','access_token','refresh_token','authorization','token','secret'
]);
function buildRegistrationBackup(...sources){
  const merged=Object.assign({},...sources.filter(Boolean));
  const backup={};
  for(const key of MDZ_REGISTRATION_BACKUP_FIELDS){
    if(Object.prototype.hasOwnProperty.call(merged,key)) backup[key]=merged[key];
  }
  return backup;
}
function stripSensitiveRegistrationFields(value){
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
scrubRegistrationBackupStorage();
"""

if old_save not in source:
    raise SystemExit("saveRow anchor not found or already changed")
source = source.replace(old_save, new_save, 1)

old_success = "saveRow('mdz_registrations',{...raw,...extra,status:t('statusPending'),member_id:ids.memberId})"
new_success = "saveRow('mdz_registrations',buildRegistrationBackup(raw,extra,{status:t('statusPending'),member_id:ids.memberId}))"
if source.count(old_success) != 1:
    raise SystemExit(f"success storage anchor count={source.count(old_success)}")
source = source.replace(old_success, new_success, 1)

old_failure = "saveRow('mdz_failed_registrations',{...raw,...extra,error:String(error)})"
new_failure = "saveRow('mdz_failed_registrations',buildRegistrationBackup(raw,extra,{error:String(error)}))"
if source.count(old_failure) != 1:
    raise SystemExit(f"failure storage anchor count={source.count(old_failure)}")
source = source.replace(old_failure, new_failure, 1)

index_path.write_text(source, encoding="utf-8")

# Runtime/static regression test.
test_path = root / "tests" / "registration-storage-containment.test.mjs"
test_path.write_text(r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(source, /const MDZ_REGISTRATION_BACKUP_FIELDS=Object\.freeze\(\[/);
assert.doesNotMatch(source, /MDZ_REGISTRATION_BACKUP_FIELDS[\s\S]*?'password'/);
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
''', encoding="utf-8")

package_path = root / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
needle = "node tests/registration-storage-containment.test.mjs"
if needle not in package["scripts"]["test:unit"]:
    package["scripts"]["test:unit"] += " && " + needle
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("PKG-E2 patch applied")
