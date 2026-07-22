/**
 * user_roles REST fetch — testable; used by fetchMyRoles in index.html.
 */

export class UserRolesFetchError extends Error {
  /** @param {number} status @param {unknown} [cause] */
  constructor(status, cause = null) {
    super(`user_roles_fetch_failed_${status}`);
    this.name = 'UserRolesFetchError';
    this.status = status;
    this.cause = cause;
  }
}

/** @param {unknown} rows */
export function mapUserRoleRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((x) => String(x?.role ?? '').trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {string} restUrl
 * @param {string} apiKey
 * @param {string} token
 * @returns {Promise<string[]>}
 */
export async function fetchUserRoles(restUrl, apiKey, token) {
  let response;
  try {
    response = await fetch(`${restUrl}/user_roles?select=role`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
  } catch (cause) {
    const err = new UserRolesFetchError(0, cause);
    console.error('[fetchMyRoles]', { status: 0, error: err });
    throw err;
  }

  if (!response.ok) {
    const err = new UserRolesFetchError(response.status);
    console.error('[fetchMyRoles]', { status: response.status, error: err });
    throw err;
  }

  let rows;
  try {
    rows = await response.json();
  } catch (cause) {
    const err = new UserRolesFetchError(response.status, cause);
    console.error('[fetchMyRoles]', { status: response.status, error: err });
    throw err;
  }

  return mapUserRoleRows(rows);
}
