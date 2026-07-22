/**
 * Account panel load errors — testable; used by openAccount in index.html.
 */

export const ACCOUNT_STEP = {
  SESSION: 'session',
  PROFILE: 'profile',
  PROFILE_MISSING: 'profile_missing',
  ROLES: 'roles',
  DASHBOARD_MODULE: 'dashboard_module',
  DASHBOARD_RENDER: 'dashboard_render',
};

export class AccountLoadError extends Error {
  /**
   * @param {string} step — ACCOUNT_STEP value
   * @param {number|null} status — HTTP status when applicable
   * @param {unknown} [cause]
   */
  constructor(step, status = null, cause = null) {
    super(typeof cause === 'object' && cause && 'message' in cause ? String(cause.message) : step);
    this.name = 'AccountLoadError';
    this.step = step;
    this.status = status;
    this.cause = cause;
  }
}

/** @param {AccountLoadError|Error} err */
export function logAccountLoadFailure(err) {
  const step = err instanceof AccountLoadError ? err.step : 'unknown';
  const status = err instanceof AccountLoadError ? err.status : err?.status;
  console.error('[openAccount]', { step, status, error: err });
}

/**
 * @param {string} restUrl — Supabase REST base (…/rest/v1)
 * @param {string} apiKey
 * @param {string} token — user access_token
 */
export async function fetchAccountProfile(restUrl, apiKey, token) {
  let r;
  try {
    r = await fetch(`${restUrl}/profiles?select=*&limit=1`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    throw new AccountLoadError(ACCOUNT_STEP.PROFILE, null, cause);
  }
  if (r.status === 401 || r.status === 403) {
    throw new AccountLoadError(ACCOUNT_STEP.SESSION, r.status);
  }
  if (!r.ok) {
    throw new AccountLoadError(ACCOUNT_STEP.PROFILE, r.status);
  }
  let rows;
  try {
    rows = await r.json();
  } catch (cause) {
    throw new AccountLoadError(ACCOUNT_STEP.PROFILE, r.status, cause);
  }
  const profile = rows[0] || null;
  if (!profile) {
    throw new AccountLoadError(ACCOUNT_STEP.PROFILE_MISSING, null);
  }
  return profile;
}

/**
 * @param {string} restUrl
 * @param {string} apiKey
 * @param {string} token
 * @returns {Promise<string[]>}
 */
export async function fetchAccountRoles(restUrl, apiKey, token) {
  let r;
  try {
    r = await fetch(`${restUrl}/user_roles?select=role`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    throw new AccountLoadError(ACCOUNT_STEP.ROLES, null, cause);
  }
  if (r.status === 401 || r.status === 403) {
    throw new AccountLoadError(ACCOUNT_STEP.SESSION, r.status);
  }
  if (!r.ok) {
    throw new AccountLoadError(ACCOUNT_STEP.ROLES, r.status);
  }
  try {
    const rows = await r.json();
    return rows.map((x) => String(x.role || '').toLowerCase()).filter(Boolean);
  } catch (cause) {
    throw new AccountLoadError(ACCOUNT_STEP.ROLES, r.status, cause);
  }
}

/** @param {unknown} err */
export function normalizeAccountLoadError(err) {
  if (err instanceof AccountLoadError) return err;
  return new AccountLoadError(ACCOUNT_STEP.DASHBOARD_RENDER, null, err);
}

function isNetworkCause(cause) {
  if (!cause) return false;
  if (cause?.name === 'TypeError') return true;
  return String(cause?.message || '').toLowerCase().includes('fetch');
}

/**
 * User-visible message for authenticated account load failures (not login form).
 * @param {unknown} err
 * @param {(key: string, vars?: object) => string} t
 */
export function messageForAccountLoadError(err, t) {
  if (!(err instanceof AccountLoadError)) {
    if (err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('fetch')) {
      return t('accountErrNetwork');
    }
    return t('accountErrUnknown');
  }

  switch (err.step) {
    case ACCOUNT_STEP.SESSION:
      return t('accountErrSession');
    case ACCOUNT_STEP.PROFILE:
      if (err.status === 401 || err.status === 403) return t('accountErrSession');
      if (isNetworkCause(err.cause)) return t('accountErrNetwork');
      if (err.status) return t('accountErrProfileHttp', { status: err.status });
      return t('accountErrProfile');
    case ACCOUNT_STEP.PROFILE_MISSING:
      return t('accountErrProfileMissing');
    case ACCOUNT_STEP.ROLES:
      if (err.status === 401 || err.status === 403) return t('accountErrSession');
      if (isNetworkCause(err.cause)) return t('accountErrNetwork');
      if (err.status) return t('accountErrRolesHttp', { status: err.status });
      return t('accountErrRoles');
    case ACCOUNT_STEP.DASHBOARD_MODULE:
      return t('accountErrDashboardModule');
    case ACCOUNT_STEP.DASHBOARD_RENDER:
      return t('accountErrDashboardRender');
    default:
      return t('accountErrUnknown');
  }
}
