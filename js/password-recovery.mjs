/**
 * Password recovery helpers — detect recovery auth and validate new passwords.
 */

export const RECOVERY_EXPECT_KEY = 'mdz_expect_recovery';
export const RECOVERY_ACTIVE_KEY = 'mdz_password_recovery';

export function markRecoveryExpected() {
  try {
    sessionStorage.setItem(RECOVERY_EXPECT_KEY, '1');
    localStorage.setItem(RECOVERY_EXPECT_KEY, '1');
  } catch { /* ignore */ }
}

export function clearRecoveryExpected() {
  try {
    sessionStorage.removeItem(RECOVERY_EXPECT_KEY);
    localStorage.removeItem(RECOVERY_EXPECT_KEY);
  } catch { /* ignore */ }
}

export function markRecoveryActive() {
  try {
    sessionStorage.setItem(RECOVERY_ACTIVE_KEY, '1');
    localStorage.setItem(RECOVERY_ACTIVE_KEY, '1');
    sessionStorage.removeItem(RECOVERY_EXPECT_KEY);
    localStorage.removeItem(RECOVERY_EXPECT_KEY);
  } catch { /* ignore */ }
}

export function clearRecoveryActive() {
  try {
    sessionStorage.removeItem(RECOVERY_ACTIVE_KEY);
    localStorage.removeItem(RECOVERY_ACTIVE_KEY);
    sessionStorage.removeItem(RECOVERY_EXPECT_KEY);
    localStorage.removeItem(RECOVERY_EXPECT_KEY);
  } catch { /* ignore */ }
}

export function isRecoveryActive() {
  try {
    return sessionStorage.getItem(RECOVERY_ACTIVE_KEY) === '1'
      || localStorage.getItem(RECOVERY_ACTIVE_KEY) === '1';
  } catch { return false; }
}

export function isRecoveryExpected() {
  try {
    return sessionStorage.getItem(RECOVERY_EXPECT_KEY) === '1'
      || localStorage.getItem(RECOVERY_EXPECT_KEY) === '1';
  } catch { return false; }
}

export function isRecoveryAuthType(type) {
  return String(type || '').toLowerCase() === 'recovery';
}

/** Decode JWT payload (no verify — client gate only; server enforces auth). */
export function decodeJwtPayload(accessToken) {
  try {
    const part = String(accessToken || '').split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** True when JWT amr claims include recovery (cross-device safe). */
export function accessTokenIndicatesRecovery(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (typeof entry === 'string') return entry.toLowerCase() === 'recovery';
    return String(entry?.method || '').toLowerCase() === 'recovery';
  });
}

const NON_RECOVERY_AUTH_TYPES = new Set([
  'signup',
  'invite',
  'email_change',
  'email',
  'magiclink',
]);

/**
 * True when callback must open set-password UI instead of normal account entry.
 * Prefer URL type=recovery or JWT amr recovery. Expect/active flags are only a
 * fallback when type is absent AND the token does not clearly indicate another
 * auth method — never override signup/invite, and never trust a stale expect
 * over a decodable non-recovery JWT.
 */
export function shouldEnterPasswordRecovery({ type, expectRecovery, accessToken } = {}) {
  if (isRecoveryAuthType(type)) return true;
  if (accessToken && accessTokenIndicatesRecovery(accessToken)) return true;
  const normalized = String(type || '').toLowerCase();
  if (NON_RECOVERY_AUTH_TYPES.has(normalized)) return false;
  if (accessToken && decodeJwtPayload(accessToken)) return false;
  if (expectRecovery === true) return true;
  return false;
}

export function validateNewPassword(password, confirm, t = (k) => k) {
  const pwd = String(password || '');
  const conf = String(confirm || '');
  if (pwd.length < 8) {
    return { ok: false, message: t('resetPasswordTooShort') };
  }
  if (pwd !== conf) {
    return { ok: false, message: t('resetPasswordMismatch') };
  }
  return { ok: true, message: '' };
}

/**
 * Build GoTrue update-user request options (password only).
 * Caller supplies access token — never log it.
 */
export function buildUpdatePasswordRequest(accessToken, password, authBase, apiKey) {
  return {
    url: `${authBase}/user`,
    init: {
      method: 'PUT',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: String(password || '') }),
    },
  };
}
