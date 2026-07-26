/**
 * Guard: auth diagnostic instrumentation must stay wired (temporary triage).
 * Does not hit network or Supabase.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const pub = readFileSync(join(root, 'public/index.html'), 'utf8');

for (const [label, src] of [
  ['index.html', html],
  ['public/index.html', pub],
]) {
  assert.match(src, /function mdzAuthDiagRecord\(/, `${label}: mdzAuthDiagRecord`);
  assert.match(src, /\[mdz-auth-diag\]/, `${label}: console tag`);
  assert.match(src, /id="mdzAuthDiagPanel"/, `${label}: diag panel`);
  assert.match(src, /id="mdzAuthDiagToggle"/, `${label}: collapsed toggle`);
  assert.match(src, /data-expanded="0"/, `${label}: collapsed by default`);
  assert.match(src, /#mdzAuthDiagPanel\{[^}]*z-index:90/, `${label}: z-index below modal`);
  assert.match(src, /data-input-focus/, `${label}: auto-hide on input focus`);
  assert.match(src, /mdzAuthDebugFlag\(\)|debug'\)==='1'/, `${label}: ?debug=1 gate`);
  assert.match(src, /r==='founder'/, `${label}: founder gate`);
  assert.match(src, /const step='fetchMyRoles'/, `${label}: fetchMyRoles step`);
  assert.match(src, /mdzAuthDiagRecord\(step,e,\{\s*body\s*\}\)/, `${label}: fetchMyRoles logs via step`);
  assert.match(src, /const step='fetchMyProfile'/, `${label}: fetchMyProfile step`);
  assert.match(src, /mdzAuthDiagRecord\('getSession\.parse'/, `${label}: getSession logs`);
  assert.match(src, /mdzAuthDiagRecord\('ensureFreshSession\.refresh'/, `${label}: refresh logs`);
  assert.match(src, /mdzAuthDiagRecord\('loginForm'/, `${label}: loginForm logs`);
  assert.match(src, /mdzAuthDiagRecord\('resetPasswordForm'/, `${label}: resetPassword logs`);
  /* updateAuthChrome after roles / post-login */
  assert.match(
    src,
    /mdzUserRoles=await fetchMyRoles\(session\.access_token\);\s*\n\s*updateAuthChrome\(\);/,
    `${label}: updateAuthChrome after roles in openAccount`,
  );
  assert.match(
    src,
    /await openAccount\(\); \/\* loads roles \+ updateAuthChrome \*\/\s*\n\s*updateAuthChrome\(\); \/\* re-run post-login/,
    `${label}: updateAuthChrome post-login`,
  );
  assert.match(
    src,
    /mdzUserRoles=await fetchMyRoles\(session\.access_token\);\s*\n\s*updateAuthChrome\(\); \/\* after roles resolve on boot \*\//,
    `${label}: boot path updateAuthChrome after roles`,
  );
  /* Arabic generic path must remain for UI */
  assert.match(src, /authErrGeneric/, `${label}: keeps authErrGeneric`);
  assert.match(src, /authErrorArabic\(e\)/, `${label}: still surfaces Arabic via authErrorArabic`);
}

console.log('auth-diagnostic-guard: ok');
