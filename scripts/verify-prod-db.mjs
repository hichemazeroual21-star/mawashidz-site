#!/usr/bin/env node
/**
 * Anonymous, read-only production database prober.
 *
 * RPC calls are restricted to the exact allowlist below and to functions whose
 * committed source-derived volatility is IMMUTABLE or STABLE. Production
 * catalog truth is captured separately by the PKG-02 operator query.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUPABASE_URL = 'https://fpjvjfgwbfehhcvdirpy.supabase.co';
export const REST = `${SUPABASE_URL}/rest/v1`;
const PUBLISHABLE_KEY = 'sb_publishable_kl5En74g9tnPW6JDpf3wDA_wQ573fB9';

export const BASELINE_PATH = 'docs/runbooks/evidence/prod-db-baseline.json';
export const REQUEST_TIMEOUT_MS = 15_000;
export const RETRY_BACKOFF_MS = [250, 750];

export const TABLES = Object.freeze([
  'registrations',
  'profiles',
  'user_roles',
  'contact_messages',
  'feedback_tickets',
  'notifications',
  'support_tickets',
  'support_messages',
  'email_outbox',
  'member_id_counters',
  'mdz_schema_migrations',
  'admin_audit_log',
]);

export const SAFE_PROBES = Object.freeze([
  { fn: 'mdz_is_platform_admin', args: {} },
  { fn: 'mdz_is_wilaya_manager', args: {} },
  { fn: 'mdz_caller_wilaya', args: {} },
  { fn: 'mdz_assert_admin_caller', args: {} },
  {
    fn: 'resolve_login_identifier',
    args: { lookup_value: '__mdz_probe_never_matches__' },
  },
  { fn: 'mdz_role_prefix', args: { member_role: 'buyer' } },
  {
    fn: 'normalize_algerian_phone',
    args: { phone_input: '0550000000' },
  },
  { fn: 'mdz_msg_registration_id', args: { p_message: '{}' } },
  {
    fn: 'mdz_is_test_registration_email',
    args: { p_email: '__probe__@example.invalid' },
  },
  {
    fn: 'mdz_registration_id_missing',
    args: { p_registration_id: '__probe__' },
  },
  {
    fn: 'mdz_is_real_pending_registration',
    args: {
      p_registration_id: '__probe__',
      p_email: '__probe__@example.invalid',
    },
  },
]);

const UNRESOLVED_ON_PGRST202 = new Set([
  'mdz_role_prefix',
  'normalize_algerian_phone',
  'mdz_msg_registration_id',
  'mdz_is_test_registration_email',
  'mdz_registration_id_missing',
  'mdz_is_real_pending_registration',
]);

export const MUTATING_DENYLIST = Object.freeze([
  'mdz_enqueue_email',
  'mdz_claim_email_outbox',
  'mdz_mark_email_outbox',
  'mdz_notify_user',
  'sync_member_id_counters_from_profiles',
  'admin_grant_user_role',
  'admin_revoke_user_role',
  'admin_set_profile_status',
  'review_registration_status',
  'allocate_member_id',
  'mdz_next_registration_id',
  'mdz_registrations_assign_registration_id',
  'mdz_registrations_insert_guard',
  'handle_new_user',
  'assign_member_id_before_signup',
  'create_support_ticket',
  'reply_support_ticket',
  'set_support_ticket_status',
  'add_support_internal_note',
  'mark_notification_read',
  'mark_all_notifications_read',
]);

const volatilityDocument = JSON.parse(
  readFileSync(
    new URL('../docs/runbooks/evidence/function-volatility.json', import.meta.url),
    'utf8',
  ),
);
export const FUNCTION_VOLATILITY = Object.freeze(volatilityDocument.functions);
const SAFE_VOLATILITIES = new Set(['IMMUTABLE', 'STABLE']);

const headers = Object.freeze({
  apikey: PUBLISHABLE_KEY,
  Authorization: `Bearer ${PUBLISHABLE_KEY}`,
});

export class NetworkProbeError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'NetworkProbeError';
  }
}

export function classify(status, body = '') {
  const text = String(body);
  if (text.includes('PGRST205')) return 'ABSENT_TABLE';
  if (text.includes('PGRST202')) return 'ABSENT_FUNCTION';
  if (text.includes('42501')) return 'DENIED';
  if (status >= 200 && status < 300) return 'REACHABLE';
  return 'UNKNOWN';
}

function sameArgs(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertProbeSafe({ fn, args = {} }) {
  if (MUTATING_DENYLIST.includes(fn)) {
    throw new Error(`Refusing mutating function: ${fn}`);
  }

  const approved = SAFE_PROBES.find((probe) => probe.fn === fn);
  if (!approved || !sameArgs(approved.args, args)) {
    throw new Error(`Function or argument signature is not approved: ${fn}`);
  }

  const volatility = FUNCTION_VOLATILITY[fn];
  if (!SAFE_VOLATILITIES.has(volatility)) {
    throw new Error(`Refusing ${fn}: volatility is ${volatility || 'unverified'}`);
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function requestWithRetry(url, init, fetchImpl = fetch) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_BACKOFF_MS.length) break;
      await sleep(RETRY_BACKOFF_MS[attempt]);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new NetworkProbeError(`Production probe request failed after retries`, lastError);
}

export async function probeTable(name, { fetchImpl = fetch } = {}) {
  const response = await requestWithRetry(
    `${REST}/${encodeURIComponent(name)}?select=*&limit=0`,
    { method: 'GET', headers },
    fetchImpl,
  );
  const body = await response.text();
  return { name, status: classify(response.status, body) };
}

export async function probeRlsCount(name, { fetchImpl = fetch } = {}) {
  const response = await requestWithRetry(
    `${REST}/${encodeURIComponent(name)}?select=*`,
    {
      method: 'HEAD',
      headers: {
        ...headers,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    },
    fetchImpl,
  );
  const status = classify(response.status, '');
  if (status !== 'REACHABLE') return { status, count: null };

  const contentRange = response.headers.get('content-range') || '';
  const totalMatch = contentRange.match(/\/(\d+)$/);
  return {
    status,
    count: totalMatch ? Number.parseInt(totalMatch[1], 10) : null,
  };
}

export function probeFunction(probe, { fetchImpl = fetch } = {}) {
  assertProbeSafe(probe);
  return requestWithRetry(
    `${REST}/rpc/${encodeURIComponent(probe.fn)}`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(probe.args),
    },
    fetchImpl,
  ).then(async (response) => {
    const body = await response.text();
    let status = classify(response.status, body);
    if (status === 'ABSENT_FUNCTION' && UNRESOLVED_ON_PGRST202.has(probe.fn)) {
      status = 'UNRESOLVED';
    }
    return { name: probe.fn, status };
  });
}

export async function collectProbeResults(options = {}) {
  const tables = [];
  for (const name of TABLES) {
    const table = await probeTable(name, options);
    if (table.status === 'REACHABLE') {
      const countResult = await probeRlsCount(name, options);
      table.rlsVisibleRows = countResult.count;
      if (countResult.status !== 'REACHABLE') table.countStatus = countResult.status;
    }
    tables.push(table);
  }

  const functions = [];
  for (const probe of SAFE_PROBES) {
    functions.push(await probeFunction(probe, options));
  }

  return { schemaVersion: 1, tables, functions };
}

function formatLine(kind, name, status, suffix = '') {
  return `${kind.padEnd(6)} ${name.padEnd(38)} ${status}${suffix}`;
}

export function formatResults(results) {
  const lines = [];
  for (const table of results.tables) {
    let suffix = '';
    if (table.rlsVisibleRows !== undefined) {
      suffix = ` rls_visible_rows=${table.rlsVisibleRows ?? 'UNRESOLVED'}`;
    }
    if (table.countStatus) suffix += ` count_status=${table.countStatus}`;
    lines.push(formatLine('TABLE', table.name, table.status, suffix));
  }
  for (const fn of results.functions) {
    lines.push(formatLine('FN', fn.name, fn.status));
  }
  return lines.join('\n');
}

function hasVisibleRows(results) {
  return results.tables.some(
    (table) => Number.isInteger(table.rlsVisibleRows) && table.rlsVisibleRows > 0,
  );
}

function normalizedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function runCli(argv = process.argv.slice(2)) {
  const baselineMode = argv.length === 1 && argv[0] === '--baseline';
  if (argv.length && !baselineMode) {
    console.error('Usage: node scripts/verify-prod-db.mjs [--baseline]');
    return 1;
  }

  let results;
  try {
    results = await collectProbeResults();
  } catch (error) {
    if (error instanceof NetworkProbeError) {
      console.error(`NETWORK: ${error.message}`);
      return 2;
    }
    throw error;
  }

  console.log(formatResults(results));

  if (hasVisibleRows(results)) {
    console.error('REGRESSION: anonymous RLS-visible row count exceeds zero');
    return 1;
  }

  const baselineFile = resolve(BASELINE_PATH);
  if (baselineMode) {
    mkdirSync(dirname(baselineFile), { recursive: true });
    writeFileSync(baselineFile, normalizedJson(results), 'utf8');
    console.log(`BASELINE: wrote ${BASELINE_PATH}`);
    return 0;
  }

  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  } catch {
    console.error(`REGRESSION: missing or invalid baseline ${BASELINE_PATH}`);
    return 1;
  }

  if (normalizedJson(results) !== normalizedJson(baseline)) {
    console.error('REGRESSION: production database signature differs from baseline');
    return 1;
  }

  console.log('OK: production database signature matches baseline');
  return 0;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = await runCli();
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
