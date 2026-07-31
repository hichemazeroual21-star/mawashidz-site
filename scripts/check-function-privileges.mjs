#!/usr/bin/env node
/**
 * CI guard: function privilege policy for NEW or MODIFIED migrations.
 *
 * Scope:
 *   - Enforce on supabase/migrations/*.sql that are new/modified vs base
 *     (ORIGIN_BASE / GITHUB_BASE_REF / origin/main), OR numbered >= 018.
 *   - Skip: *.verify.sql, *.partial-manual-rollback.sql, *.rollback.sql
 *   - Skip Migration 017 artifacts entirely (FROZEN).
 *   - Legacy migrations below 018 that are untouched are grandfathered.
 *
 * Fail when a create/replace function in scope:
 *   - Lacks REVOKE ALL ... FROM PUBLIC with the exact signature
 *   - Lacks REVOKE EXECUTE ... FROM anon unless ALLOW_ANON_EXECUTE justified
 *   - Uses SECURITY DEFINER without search_path = '' (new/modified only)
 *   - Matches by bare name without argument types (incomplete identity)
 *
 * Does not expand into a repository-wide SECURITY DEFINER rewrite.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, 'supabase', 'migrations');

const SKIP_SUFFIXES = [
  '.verify.sql',
  '.partial-manual-rollback.sql',
  '.rollback.sql',
];

function isSkippedPath(name) {
  const lower = name.toLowerCase();
  if (SKIP_SUFFIXES.some((s) => lower.endsWith(s))) return true;
  if (/^017_/.test(name)) return true; // FROZEN — never enforce via rewrite
  return false;
}

function migrationNumber(name) {
  const m = name.match(/^(\d{3})_/);
  return m ? Number(m[1]) : null;
}

function resolveBaseRef() {
  if (process.env.FUNCTION_PRIV_GUARD_BASE) {
    return process.env.FUNCTION_PRIV_GUARD_BASE;
  }
  if (process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  return 'origin/main';
}

function gitChangedMigrationFiles(baseRef) {
  try {
    const out = execSync(
      `git diff --name-only --diff-filter=AM ${baseRef}...HEAD -- supabase/migrations`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => p.replace(/^supabase\/migrations\//, ''))
      .filter((name) => name.endsWith('.sql') && !isSkippedPath(name));
  } catch {
    return [];
  }
}

function listEnforcedMigrations() {
  const all = readdirSync(MIG_DIR).filter((n) => n.endsWith('.sql') && !isSkippedPath(n));
  const baseRef = resolveBaseRef();
  const changed = new Set(gitChangedMigrationFiles(baseRef));
  const enforced = all.filter((name) => {
    const num = migrationNumber(name);
    if (num != null && num >= 18) return true;
    if (changed.has(name)) return true;
    return false;
  });
  return { enforced, changed: [...changed], baseRef };
}

/**
 * Extract CREATE [OR REPLACE] FUNCTION statements with signature.
 * Fail-closed: if we see create function but cannot parse identity args, error.
 */
function extractFunctions(sql, fileLabel) {
  const results = [];
  const re =
    /\bcreate\s+(or\s+replace\s+)?function\s+(public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    const start = match.index;
    const name = match[3];
    const schemaQualified = Boolean(match[2]);
    const headerEnd = match.index + match[0].length; // position after '('
    const close = findMatchingParen(sql, headerEnd - 1);
    if (close < 0) {
      throw new Error(
        `${fileLabel}: incomplete function identity for ${name}(...) — cannot find closing ')'`,
      );
    }
    const argsRaw = sql.slice(headerEnd, close);
    if (/^\s*\.\.\.\s*$/.test(argsRaw) || /\?\?\?/.test(argsRaw)) {
      throw new Error(
        `${fileLabel}: incomplete/placeholder argument list for ${name}`,
      );
    }
    const argsNorm = normalizeArgs(argsRaw);
    // Body window: from create through a reasonable following chunk for REVOKE/GRANT/search_path
    const window = sql.slice(start, Math.min(sql.length, close + 2500));
    const isSecurityDefiner = /\bsecurity\s+definer\b/i.test(window);
    results.push({
      name,
      schemaQualified,
      argsNorm,
      argsRaw: argsRaw.trim(),
      signature: `public.${name}(${argsNorm})`,
      window,
      isSecurityDefiner,
      start,
    });
  }
  return results;
}

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    } else if (ch === "'" ) {
      // skip string literals
      i++;
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (s[i] === "'") break;
        i++;
      }
    } else if (ch === '-' && s[i + 1] === '-') {
      while (i < s.length && s[i] !== '\n') i++;
    } else if (ch === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i++;
    }
  }
  return -1;
}

function normalizeArgs(argsRaw) {
  const trimmed = argsRaw.trim();
  if (!trimmed) return '';
  // Strip parameter names / modes / defaults → types only, comma-separated
  // e.g. "p_id uuid, p_status text default null" → "uuid, text"
  const parts = splitArgs(trimmed);
  return parts
    .map((part) => {
      let p = part.trim().replace(/\s+/g, ' ');
      // remove default clause
      p = p.replace(/\s+default\s+[\s\S]+$/i, '').trim();
      // remove OUT/INOUT/IN modes at start
      p = p.replace(/^(in|out|inout)\s+/i, '');
      const tokens = p.split(/\s+/);
      if (tokens.length === 1) {
        // type only already
        return tokens[0].toLowerCase();
      }
      // name type [type modifiers...] — take everything after first token as type
      return tokens.slice(1).join(' ').toLowerCase();
    })
    .join(', ');
}

function splitArgs(s) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function hasRevokeAllFromPublic(sqlWindow, fn) {
  // REVOKE ALL ON FUNCTION public.name(types) FROM PUBLIC
  const sig = escapeRegex(fn.signature);
  const nameOnly = escapeRegex(`public.${fn.name}`);
  const reExact = new RegExp(
    `revoke\\s+all(\\s+privileges)?\\s+on\\s+function\\s+${sig}\\s+from\\s+public\\b`,
    'i',
  );
  if (reExact.test(sqlWindow)) return true;
  // Also accept args matching normalized form with optional spaces
  const reFlex = new RegExp(
    `revoke\\s+all(\\s+privileges)?\\s+on\\s+function\\s+${nameOnly}\\s*\\(([^)]*)\\)\\s+from\\s+public\\b`,
    'i',
  );
  const m = sqlWindow.match(reFlex);
  if (!m) return false;
  return normalizeArgs(m[2]) === fn.argsNorm;
}

function hasRevokeExecuteFromAnon(sqlWindow, fn) {
  const nameOnly = escapeRegex(`public.${fn.name}`);
  const reFlex = new RegExp(
    `revoke\\s+execute\\s+on\\s+function\\s+${nameOnly}\\s*\\(([^)]*)\\)\\s+from\\s+anon\\b`,
    'i',
  );
  const m = sqlWindow.match(reFlex);
  if (m && normalizeArgs(m[1]) === fn.argsNorm) return true;
  // REVOKE ALL FROM PUBLIC already removes PUBLIC path; still require explicit anon revoke
  // unless ALLOW_ANON_EXECUTE justification appears before a GRANT to anon
  return false;
}

function hasAllowAnonJustification(sqlWindow, fn) {
  const nameOnly = escapeRegex(`public.${fn.name}`);
  // ALLOW_ANON_EXECUTE: reason — must appear in the function window
  if (!/allow_anon_execute\s*:/i.test(sqlWindow)) return false;
  const grantAnon = new RegExp(
    `grant\\s+execute\\s+on\\s+function\\s+${nameOnly}\\s*\\(([^)]*)\\)\\s+to\\s+[^;]*\\banon\\b`,
    'i',
  );
  const m = sqlWindow.match(grantAnon);
  return Boolean(m && normalizeArgs(m[1]) === fn.argsNorm);
}

function hasEmptySearchPath(sqlWindow) {
  // SET search_path = ''  or  SET search_path TO ''
  return /set\s+search_path\s*(=|to)\s*''/i.test(sqlWindow);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkSql(sql, label = 'sql') {
  const errors = [];
  let functions;
  try {
    functions = extractFunctions(sql, label);
  } catch (e) {
    return [String(e.message || e)];
  }

  for (const fn of functions) {
    if (!fn.schemaQualified) {
      errors.push(
        `${label}: ${fn.name}(...) must be schema-qualified as public.${fn.name}(...)`,
      );
    }
    if (!hasRevokeAllFromPublic(fn.window, fn) && !hasRevokeAllFromPublic(sql, fn)) {
      errors.push(
        `${label}: ${fn.signature} missing REVOKE ALL ON FUNCTION ... FROM PUBLIC (exact signature)`,
      );
    }
    const anonOk =
      hasRevokeExecuteFromAnon(fn.window, fn) ||
      hasRevokeExecuteFromAnon(sql, fn) ||
      hasAllowAnonJustification(fn.window, fn);
    // REVOKE ALL FROM PUBLIC does not revoke anon's direct grants; still need anon revoke
    // unless ALLOW_ANON_EXECUTE. Also accept REVOKE ALL ... FROM public, anon
    const revokeAllInclAnon = new RegExp(
      `revoke\\s+all(\\s+privileges)?\\s+on\\s+function\\s+public\\.${escapeRegex(fn.name)}\\s*\\(([^)]*)\\)\\s+from\\s+[^;]*\\banon\\b`,
      'i',
    );
    const mAllAnon = sql.match(revokeAllInclAnon);
    const allInclAnon =
      mAllAnon && normalizeArgs(mAllAnon[2]) === fn.argsNorm;
    if (!anonOk && !allInclAnon) {
      errors.push(
        `${label}: ${fn.signature} missing REVOKE EXECUTE ... FROM anon (or ALLOW_ANON_EXECUTE justification + GRANT)`,
      );
    }
    if (fn.isSecurityDefiner && !hasEmptySearchPath(fn.window)) {
      errors.push(
        `${label}: ${fn.signature} SECURITY DEFINER must SET search_path = '' (new/modified policy)`,
      );
    }
  }
  return errors;
}

function checkFile(absPath, label) {
  return checkSql(readFileSync(absPath, 'utf8'), label);
}

export function runGuard({ files } = {}) {
  if (!existsSync(MIG_DIR)) {
    throw new Error('supabase/migrations missing');
  }
  const { enforced, changed, baseRef } =
    files && files.length
      ? { enforced: files, changed: files, baseRef: '(explicit)' }
      : listEnforcedMigrations();

  const errors = [];
  for (const name of enforced) {
    const abs = join(MIG_DIR, name);
    if (!existsSync(abs)) {
      errors.push(`missing migration file: ${name}`);
      continue;
    }
    errors.push(...checkFile(abs, name));
  }

  return { enforced, changed, baseRef, errors };
}

function main() {
  const { enforced, changed, baseRef, errors } = runGuard();
  console.log(`function-privilege-guard base=${baseRef}`);
  console.log(`changed migrations: ${changed.length ? changed.join(', ') : '(none)'}`);
  console.log(`enforced migrations: ${enforced.length ? enforced.join(', ') : '(none)'}`);
  if (errors.length) {
    console.error('function-privilege-guard FAIL:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('  ✓ function privilege guard passed');
}

const isMain = process.argv[1] && process.argv[1].endsWith('check-function-privileges.mjs');
if (isMain) main();
