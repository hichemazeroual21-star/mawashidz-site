/**
 * Password recovery helpers — detect recovery auth and validate new passwords.
 */

export const RECOVERY_EXPECT_KEY = 'mdz_expect_recovery';
export const RECOVERY_ACTIVE_KEY = 'mdz_password_recovery';

export function markRecoveryExpected() {
  try { sessionStorage.setItem(RECOVERY_EXPECT_KEY, '1'); } catch { /* ignore */ }
}

export function clearRecoveryExpected() {
  try { sessionStorage.removeItem(RECOVERY_EXPECT_KEY); } catch { /* ignore */ }
}

export function markRecoveryActive() {
  try {
    sessionStorage.setItem(RECOVERY_ACTIVE_KEY, '1');
    sessionStorage.removeItem(RECOVERY_EXPECT_KEY);
  } catch { /* ignore */ }
}

export function clearRecoveryActive() {
  try {
    sessionStorage.removeItem(RECOVERY_ACTIVE_KEY);
    sessionStorage.removeItem(RECOVERY_EXPECT_KEY);
  } catch { /* ignore */ }
}

export function isRecoveryActive() {
  try { return sessionStorage.getItem(RECOVERY_ACTIVE_KEY) === '1'; } catch { return false; }
}

export function isRecoveryExpected() {
  try { return sessionStorage.getItem(RECOVERY_EXPECT_KEY) === '1'; } catch { return false; }
}

export function isRecoveryAuthType(type) {
  return String(type || '').toLowerCase() === 'recovery';
}

/** True when callback must open set-password UI instead of normal account entry. */
export function shouldEnterPasswordRecovery({ type, expectRecovery } = {}) {
  return isRecoveryAuthType(type) || expectRecovery === true;
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
