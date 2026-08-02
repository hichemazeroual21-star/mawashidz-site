#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const JSON_MARKER = 'null::jsonb as snapshot, -- MDZ_021_BIND_BASELINE_JSON_HERE';
const SHA_MARKER = 'null::text as expected_snapshot_sha256, -- MDZ_021_BIND_BASELINE_SHA256_HERE';
const ANCHOR_SHA_MARKER = 'null::text as anchor_commit_sha, -- MDZ_021_BIND_ANCHOR_COMMIT_SHA_HERE';
const ANCHOR_RUN_MARKER = 'null::text as anchor_ci_run_url, -- MDZ_021_BIND_ANCHOR_CI_RUN_URL_HERE';
const ANCHOR_TIME_MARKER = 'null::timestamptz as anchor_ci_observed_at_utc -- MDZ_021_BIND_ANCHOR_CI_TIME_HERE';
const EXPECTED_PROJECT_REF = 'fpjvjfgwbfehhcvdirpy';
const EXPECTED_SIGNATURES = [
  'public.mdz_claim_email_outbox(integer,text)',
  'public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)',
  'public.mdz_mark_email_outbox(bigint,text,text,text)',
  'public.mdz_notify_user(uuid,text,text,text,jsonb,text)',
];

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

function buildStateGuard(snapshot, stage, expectedLedgerRows) {
  const functionChecks = snapshot.functions.map((fn) => `
  v_oid := to_regprocedure(${sqlLiteral(fn.expected_signature)});
  if v_oid is null
     or v_oid::text <> ${sqlLiteral(fn.resolved_oid)}
     or pg_get_userbyid((select proowner from pg_proc where oid = v_oid)) <> 'postgres'
     or pg_get_function_identity_arguments(v_oid) <> ${sqlLiteral(fn.expected_identity_args)}
     or encode(sha256(convert_to((select prosrc from pg_proc where oid = v_oid), 'UTF8')), 'hex')
        <> ${sqlLiteral(fn.source_sha256)}
     or octet_length(convert_to((select prosrc from pg_proc where oid = v_oid), 'UTF8'))
        <> ${Number(fn.source_utf8_bytes)}
     or encode(sha256(convert_to(pg_get_functiondef(v_oid), 'UTF8')), 'hex')
        <> ${sqlLiteral(fn.definition_sha256)}
     or octet_length(convert_to(pg_get_functiondef(v_oid), 'UTF8'))
        <> ${Number(fn.definition_utf8_bytes)}
     or coalesce((
       select array_agg(grantee_name order by grantee_name)
       from (
         select distinct case when a.grantee = 0 then 'PUBLIC'
           else pg_get_userbyid(a.grantee)::text end as grantee_name
         from aclexplode(coalesce(
           (select proacl from pg_proc where oid = v_oid),
           acldefault('f', (select proowner from pg_proc where oid = v_oid))
         )) a
         where a.privilege_type = 'EXECUTE'
       ) direct_acl
     ), array[]::text[]) <> array['postgres','service_role']::text[]
     or exists (
       select 1
       from aclexplode(coalesce(
         (select proacl from pg_proc where oid = v_oid),
         acldefault('f', (select proowner from pg_proc where oid = v_oid))
       )) a
       where a.privilege_type = 'EXECUTE'
         and (pg_get_userbyid(a.grantor) <> 'postgres'
           or (a.is_grantable and a.grantee <> (select proowner from pg_proc where oid = v_oid)))
     )
     or has_function_privilege('public', v_oid, 'EXECUTE')
     or has_function_privilege('anon', v_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_oid, 'EXECUTE')
     or not has_function_privilege('service_role', v_oid, 'EXECUTE')
     or (select count(*)
         from pg_proc extra
         join pg_namespace ns on ns.oid = extra.pronamespace
         where ns.nspname = 'public'
           and extra.proname = (select proname from pg_proc where oid = v_oid)
           and extra.oid <> v_oid) <> 0
  then
    raise exception '021 guarded apply ${stage}: baseline drift for %',
      ${sqlLiteral(fn.expected_signature)};
  end if;`).join('\n');

  return `do $mdz021_guard$
declare
  v_oid oid;
  v_ledger_rows integer;
begin
  if current_database() <> ${sqlLiteral(snapshot.database_name)}
     or current_setting('server_version_num')::integer <> ${Number(snapshot.server_version_num)}
     or current_setting('server_encoding') <> ${sqlLiteral(snapshot.server_encoding)}
     or current_setting('quote_all_identifiers') <> ${sqlLiteral(snapshot.quote_all_identifiers)}
     or current_setting('search_path') <> ${sqlLiteral(snapshot.session_search_path)}
     or (select system_identifier::text from pg_catalog.pg_control_system())
        <> ${sqlLiteral(snapshot.cluster_system_identifier)}
     or session_user::text <> ${sqlLiteral(snapshot.session_user_name)}
     or current_user::text <> ${sqlLiteral(snapshot.current_user_name)}
     or current_setting('role', true) is distinct from ${sqlLiteral(snapshot.role_setting)}
  then
    raise exception '021 guarded apply ${stage}: execution context mismatch';
  end if;

  select count(*)::integer into v_ledger_rows
  from public.mdz_schema_migrations where version = '021';
  if v_ledger_rows <> ${expectedLedgerRows} then
    raise exception '021 guarded apply ${stage}: expected ledger rows %, got %',
      ${expectedLedgerRows}, v_ledger_rows;
  end if;
${functionChecks}
end;
$mdz021_guard$;`;
}

export function buildGuardedApply021(migration021, snapshot) {
  if ((migration021.match(/^begin;\s*$/gim) ?? []).length !== 1
      || (migration021.match(/^commit;\s*$/gim) ?? []).length !== 1) {
    throw new Error('021 bind abort: canonical migration transaction markers changed');
  }
  const preGuard = buildStateGuard(snapshot, 'precondition', 0);
  const postGuard = buildStateGuard(snapshot, 'postcondition', 1);
  return migration021
    .replace(
      /^begin;\s*$/im,
      `begin;\n\nselect pg_advisory_xact_lock(hashtextextended('mawashidz:migration:021', 0));\nlock table public.mdz_schema_migrations in share row exclusive mode;\n\n${preGuard}`,
    )
    .replace(/^commit;\s*$/im, `${postGuard}\n\ncommit;`);
}

export function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('021 bind abort: unterminated quoted CSV field');
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('021 bind abort: expected one header and one data row');

  const [header, ...dataRows] = rows;
  if (dataRows.length !== 1) {
    throw new Error(`021 bind abort: expected exactly one preflight row, got ${dataRows.length}`);
  }
  if (new Set(header).size !== header.length) {
    throw new Error('021 bind abort: duplicate CSV column name');
  }
  if (dataRows[0].length !== header.length) {
    throw new Error('021 bind abort: CSV column count mismatch');
  }
  return Object.fromEntries(header.map((name, index) => [name, dataRows[0][index]]));
}

function requireExactlyOne(haystack, needle, label) {
  const count = haystack.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`021 bind abort: expected exactly one ${label} marker, got ${count}`);
  }
}

function validateSnapshot(record) {
  const snapshotText = record.baseline_json;
  const snapshotSha256 = record.baseline_snapshot_sha256;
  if (record.preflight_result !== 'READY_016_CONTAINED') {
    throw new Error(`021 bind abort: preflight_result=${record.preflight_result || 'missing'}`);
  }
  if (record.ledger_021_rows !== '0') {
    throw new Error(`021 bind abort: ledger_021_rows=${record.ledger_021_rows || 'missing'}`);
  }
  if (!/^[a-f0-9]{64}$/.test(snapshotSha256 ?? '')) {
    throw new Error('021 bind abort: invalid baseline_snapshot_sha256');
  }
  if (sha256(snapshotText ?? '') !== snapshotSha256) {
    throw new Error('021 bind abort: CSV baseline JSON does not match its saved SHA-256');
  }
  if ((snapshotText ?? '').includes('$mdz021$')) {
    throw new Error('021 bind abort: unsafe dollar-quote delimiter collision');
  }

  let snapshot;
  try {
    snapshot = JSON.parse(snapshotText);
  } catch {
    throw new Error('021 bind abort: baseline_json is not valid JSON');
  }
  if (snapshot.schema_version !== 2
      || snapshot.preflight_result !== 'READY_016_CONTAINED'
      || snapshot.ledger_021_rows !== 0) {
    throw new Error('021 bind abort: baseline metadata is not a ready pre-021 snapshot');
  }
  if (snapshot.current_user_name !== 'postgres'
      || snapshot.session_user_name !== 'postgres'
      || snapshot.server_encoding !== 'UTF8') {
    throw new Error('021 bind abort: baseline was not captured in the required owner/UTF8 context');
  }
  for (const field of [
    'captured_at_utc',
    'database_name',
    'server_version_num',
    'server_encoding',
    'quote_all_identifiers',
    'session_search_path',
    'cluster_system_identifier',
    'expected_supabase_project_ref',
    'session_user_name',
    'current_user_name',
    'role_setting',
  ]) {
    if (String(snapshot[field] ?? '') !== String(record[field] ?? '')) {
      throw new Error(`021 bind abort: CSV/context mismatch for ${field}`);
    }
  }

  if (!/^\d+$/.test(snapshot.cluster_system_identifier ?? '')) {
    throw new Error('021 bind abort: missing PostgreSQL cluster system identifier');
  }
  if (snapshot.expected_supabase_project_ref !== EXPECTED_PROJECT_REF) {
    throw new Error('021 bind abort: baseline targets a different Supabase project ref');
  }

  if (!Array.isArray(snapshot.functions) || snapshot.functions.length !== 4) {
    throw new Error('021 bind abort: baseline must contain exactly four functions');
  }
  const signatures = snapshot.functions.map((fn) => fn.expected_signature).sort();
  if (JSON.stringify(signatures) !== JSON.stringify([...EXPECTED_SIGNATURES].sort())) {
    throw new Error('021 bind abort: baseline function set differs from the reviewed 021 set');
  }
  for (const fn of snapshot.functions) {
    const executeAcl = Array.isArray(fn.expanded_execute_acl)
      ? fn.expanded_execute_acl.map((entry) => ({
        grantor: entry.grantor,
        grantee: entry.grantee,
        privilege: entry.privilege,
        grantable: entry.grantable,
      }))
      : null;
    const expectedExecuteAcl = [
      { grantor: 'postgres', grantee: 'postgres', privilege: 'EXECUTE', grantable: false },
      { grantor: 'postgres', grantee: 'service_role', privilege: 'EXECUTE', grantable: false },
    ];
    if (String(fn.actual_signature).replace(/\s+/g, '')
          !== String(fn.expected_signature).replace(/\s+/g, '')
        || fn.actual_identity_args !== fn.expected_identity_args
        || !/^\d+$/.test(fn.resolved_oid ?? '')
        || fn.owner_name !== 'postgres'
        || !/^[a-f0-9]{64}$/.test(fn.source_sha256 ?? '')
        || !/^[a-f0-9]{64}$/.test(fn.definition_sha256 ?? '')
        || !Number.isInteger(fn.source_utf8_bytes)
        || fn.source_utf8_bytes <= 0
        || !Number.isInteger(fn.definition_utf8_bytes)
        || fn.definition_utf8_bytes <= 0
        || fn.public_execute !== false
        || fn.anon_execute !== false
        || fn.authenticated_execute !== false
        || fn.service_role_execute !== true
        || fn.unexpected_overload_count !== 0
        || JSON.stringify(executeAcl) !== JSON.stringify(expectedExecuteAcl)
        || JSON.stringify(fn.actual_direct_execute_grantees) !== JSON.stringify(['postgres', 'service_role'])) {
      throw new Error(`021 bind abort: untrusted function snapshot for ${fn.expected_signature}`);
    }
  }

  return { snapshot, snapshotText, snapshotSha256 };
}

function validateExternalAnchor(anchor) {
  if (!anchor) return null;
  if (!/^[a-f0-9]{40}$/.test(anchor.commit_sha ?? '')) {
    throw new Error('021 bind abort: invalid external anchor commit SHA');
  }
  if (!/^https:\/\/github[.]com\/[^/]+\/[^/]+\/actions\/runs\/[0-9]+$/.test(
    anchor.ci_run_url ?? '',
  )) {
    throw new Error('021 bind abort: invalid GitHub Actions anchor URL');
  }
  const observed = new Date(anchor.ci_observed_at_utc ?? '');
  if (Number.isNaN(observed.getTime())) {
    throw new Error('021 bind abort: invalid GitHub Actions observed timestamp');
  }
  return { ...anchor, ci_observed_at_utc: observed.toISOString() };
}

export function bind021LiveEvidence(template, record, options = {}) {
  requireExactlyOne(template, JSON_MARKER, 'baseline JSON');
  requireExactlyOne(template, SHA_MARKER, 'baseline SHA-256');
  requireExactlyOne(template, ANCHOR_SHA_MARKER, 'anchor commit SHA');
  requireExactlyOne(template, ANCHOR_RUN_MARKER, 'anchor CI run URL');
  requireExactlyOne(template, ANCHOR_TIME_MARKER, 'anchor CI timestamp');
  const { snapshot, snapshotText, snapshotSha256 } = validateSnapshot(record);
  const anchor = validateExternalAnchor(options.anchor);
  if (!/^[a-f0-9]{64}$/.test(options.migration021Sha256 ?? '')) {
    throw new Error('021 bind abort: reviewed migration 021 SHA-256 is required');
  }
  if (typeof options.migration021Text !== 'string'
      || sha256(options.migration021Text) !== options.migration021Sha256) {
    throw new Error('021 bind abort: canonical migration text does not match its SHA-256');
  }
  const baselineCapturedAt = new Date(snapshot.captured_at_utc);
  if (Number.isNaN(baselineCapturedAt.getTime())) {
    throw new Error('021 bind abort: invalid baseline capture timestamp');
  }
  if (anchor && baselineCapturedAt > new Date(anchor.ci_observed_at_utc)) {
    throw new Error('021 bind abort: baseline was captured after the external CI anchor');
  }
  if (anchor
      && new Date(anchor.ci_observed_at_utc).getTime() - baselineCapturedAt.getTime()
        > 30 * 60 * 1000) {
    throw new Error('021 bind abort: baseline is older than the 30-minute anchor window');
  }
  const templateSha256 = sha256(template);
  let sql = template
    .replace(
      JSON_MARKER,
      `$mdz021$${snapshotText}$mdz021$::jsonb as snapshot, -- MDZ_021_BIND_BASELINE_JSON_HERE`,
    )
    .replace(
      SHA_MARKER,
      `'${snapshotSha256}'::text as expected_snapshot_sha256, -- MDZ_021_BIND_BASELINE_SHA256_HERE`,
    );
  const candidateBoundSqlSha256 = sha256(sql);
  if (anchor) {
    sql = sql
      .replace(
        ANCHOR_SHA_MARKER,
        `'${anchor.commit_sha}'::text as anchor_commit_sha, -- MDZ_021_BIND_ANCHOR_COMMIT_SHA_HERE`,
      )
      .replace(
        ANCHOR_RUN_MARKER,
        `'${anchor.ci_run_url}'::text as anchor_ci_run_url, -- MDZ_021_BIND_ANCHOR_CI_RUN_URL_HERE`,
      )
      .replace(
        ANCHOR_TIME_MARKER,
        `'${anchor.ci_observed_at_utc}'::timestamptz as anchor_ci_observed_at_utc -- MDZ_021_BIND_ANCHOR_CI_TIME_HERE`,
      );
  }
  const boundSqlSha256 = sha256(sql);
  const guardedApplySql = buildGuardedApply021(options.migration021Text, snapshot);
  const guardedApplySha256 = sha256(guardedApplySql);
  const publicAnchorReceipt = {
    schema_version: 1,
    artifact: 'MawashiDZ 021 pre-apply external anchor receipt',
    baseline_snapshot_sha256: snapshotSha256,
    baseline_captured_at_utc: snapshot.captured_at_utc,
    supabase_project_ref: snapshot.expected_supabase_project_ref,
    migration_021_sha256: options.migration021Sha256,
    verifier_template_sha256: templateSha256,
    candidate_bound_verifier_sha256: candidateBoundSqlSha256,
    guarded_apply_sha256: guardedApplySha256,
  };
  const publicAnchorReceiptText = `${JSON.stringify(publicAnchorReceipt, null, 2)}\n`;
  return {
    sql,
    guardedApplySql,
    publicAnchorReceipt,
    publicAnchorReceiptText,
    manifest: {
      schema_version: 2,
      artifact: 'MawashiDZ 021 baseline-bound live verifier',
      baseline_snapshot_sha256: snapshotSha256,
      template_sha256: templateSha256,
      bound_sql_sha256: boundSqlSha256,
      guarded_apply_sha256: guardedApplySha256,
      baseline_captured_at_utc: snapshot.captured_at_utc,
      database_name: snapshot.database_name,
      server_version_num: snapshot.server_version_num,
      server_encoding: snapshot.server_encoding,
      session_user_name: snapshot.session_user_name,
      current_user_name: snapshot.current_user_name,
      role_setting: snapshot.role_setting,
      quote_all_identifiers: snapshot.quote_all_identifiers,
      session_search_path: snapshot.session_search_path,
      cluster_system_identifier: snapshot.cluster_system_identifier,
      supabase_project_ref: snapshot.expected_supabase_project_ref,
      migration_021_sha256: options.migration021Sha256,
      external_anchor: anchor,
      public_anchor_receipt_sha256: sha256(publicAnchorReceiptText),
      function_fingerprints: snapshot.functions.map((fn) => ({
        signature: fn.expected_signature,
        resolved_oid: fn.resolved_oid,
        source_sha256: fn.source_sha256,
        definition_sha256: fn.definition_sha256,
      })),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const [csvPath, outputSqlPath] = args;
  if (!csvPath || !outputSqlPath) {
    throw new Error(
      'Usage: node scripts/bind-021-live-evidence.mjs <preflight.csv> <bound-verify.sql> [--anchor-sha <sha>] [--anchor-run-url <url>] [--anchor-time <iso>]',
    );
  }
  const root = process.cwd();
  const templatePath = resolve(
    root,
    'docs/runbooks/sql/021_reconcile_email_rpc_privileges.live-evidence.sql',
  );
  const migrationPath = resolve(
    root,
    'supabase/migrations/021_reconcile_email_rpc_privileges.sql',
  );
  const [csv, template, migration021] = await Promise.all([
    readFile(resolve(root, csvPath), 'utf8'),
    readFile(templatePath, 'utf8'),
    readFile(migrationPath, 'utf8'),
  ]);
  const record = parseCsv(csv.replace(/^\uFEFF/, ''));
  const optionValue = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  };
  const anchorValues = {
    commit_sha: optionValue('--anchor-sha'),
    ci_run_url: optionValue('--anchor-run-url'),
    ci_observed_at_utc: optionValue('--anchor-time'),
  };
  const hasAnyAnchorValue = Object.values(anchorValues).some(Boolean);
  const hasAllAnchorValues = Object.values(anchorValues).every(Boolean);
  if (hasAnyAnchorValue && !hasAllAnchorValues) {
    throw new Error('021 bind abort: all three external anchor values are required together');
  }
  const {
    sql,
    guardedApplySql,
    publicAnchorReceiptText,
    manifest,
  } = bind021LiveEvidence(template, record, {
    anchor: hasAllAnchorValues ? anchorValues : null,
    migration021Sha256: sha256(migration021),
    migration021Text: migration021,
  });
  const resolvedOutput = resolve(root, outputSqlPath);
  const manifestPath = `${resolvedOutput}.manifest.json`;
  const guardedApplyPath = `${resolvedOutput}.apply.sql`;
  const anchorReceiptPath = `${resolvedOutput}.anchor-receipt.json`;
  await mkdir(dirname(resolvedOutput), { recursive: true });
  await Promise.all([
    writeFile(resolvedOutput, sql, { encoding: 'utf8', flag: 'wx' }),
    writeFile(guardedApplyPath, guardedApplySql, { encoding: 'utf8', flag: 'wx' }),
    writeFile(anchorReceiptPath, publicAnchorReceiptText, { encoding: 'utf8', flag: 'wx' }),
    writeFile(
      manifestPath,
      `${JSON.stringify({ ...manifest, generated_at_utc: new Date().toISOString() }, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    ),
  ]);
  console.log(JSON.stringify({
    result: manifest.external_anchor
      ? 'OK_021_EVIDENCE_BOUND_TO_EXTERNAL_ANCHOR'
      : 'CANDIDATE_021_EVIDENCE_REQUIRES_EXTERNAL_ANCHOR',
    output_sql: resolvedOutput,
    manifest: manifestPath,
    baseline_snapshot_sha256: manifest.baseline_snapshot_sha256,
    bound_sql_sha256: manifest.bound_sql_sha256,
    guarded_apply_sql: guardedApplyPath,
    guarded_apply_sha256: manifest.guarded_apply_sha256,
    public_anchor_receipt: anchorReceiptPath,
    public_anchor_receipt_sha256: manifest.public_anchor_receipt_sha256,
    external_anchor_bound: Boolean(manifest.external_anchor),
  }, null, 2));
}

const isMain = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
