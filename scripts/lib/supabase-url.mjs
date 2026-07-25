/**
 * Normalize Supabase project URL for REST RPC calls.
 * Code builds: `${normalizeSupabaseUrl(url)}/rest/v1/rpc/${fn}`
 * So the value must be the project root only — never end with `/` or `/rest/v1`.
 */

/**
 * @param {string} raw
 * @param {{ warn?: (msg: string) => void }} [opts]
 * @returns {string}
 */
export function normalizeSupabaseUrl(raw, opts = {}) {
  const warn = opts.warn || ((msg) => console.warn(msg));
  let u = String(raw || '').trim();
  if (!u) return '';

  const original = u;
  if (/\/rest\/v1(\/|$)/i.test(u)) {
    warn(
      'SUPABASE_URL contains /rest/v1 — strip it. Use https://<project>.supabase.co only '
      + '(code appends /rest/v1/rpc/...).',
    );
  }

  // Strip all trailing slashes, then a trailing /rest/v1 segment (repeat for safety).
  u = u.replace(/\/+$/g, '');
  while (/\/rest\/v1$/i.test(u)) {
    u = u.replace(/\/rest\/v1$/i, '').replace(/\/+$/g, '');
  }

  if (original !== u) {
    warn(`SUPABASE_URL normalized: "${original}" → "${u}"`);
  }

  if (/\/rest\/v1/i.test(u)) {
    warn('SUPABASE_URL still contains /rest/v1 after normalize — fix Worker secret');
  }

  return u;
}

/**
 * @param {string} raw
 * @returns {{ ok: boolean, normalized: string, errors: string[] }}
 */
export function validateSupabaseUrlConfig(raw) {
  const errors = [];
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    errors.push('SUPABASE_URL is empty');
    return { ok: false, normalized: '', errors };
  }
  if (/\/rest\/v1/i.test(trimmed)) {
    errors.push('SUPABASE_URL must not contain /rest/v1');
  }
  if (/\/$/.test(trimmed)) {
    errors.push('SUPABASE_URL must not end with /');
  }
  const normalized = normalizeSupabaseUrl(trimmed, { warn: () => {} });
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized)) {
    errors.push(
      `SUPABASE_URL should look like https://<ref>.supabase.co (got: ${normalized || '(empty)'})`,
    );
  }
  return { ok: errors.length === 0, normalized, errors };
}
