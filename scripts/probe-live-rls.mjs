#!/usr/bin/env node
/**
 * Live two-user RLS probe. Tokens are read from the environment and never printed.
 * Usage: RLS_USER_A_JWT=... RLS_USER_B_JWT=... npm run probe:rls
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function decodePayload(token) {
  const part = String(token || '').split('.')[1];
  if (!part) throw new Error('JWT payload is missing');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const defaultUrl = html.match(/const SUPABASE_URL='([^']+)'/)?.[1];
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  || html.match(/const SUPABASE_PUBLISHABLE_KEY='([^']+)'/)?.[1];
const baseUrl = String(process.env.SUPABASE_URL || defaultUrl || '').replace(/\/+$/, '');
const tokenA = process.env.RLS_USER_A_JWT || '';
const tokenB = process.env.RLS_USER_B_JWT || '';

assert.ok(baseUrl && publishableKey, 'Supabase URL/publishable key unavailable');
assert.ok(tokenA && tokenB, 'Set RLS_USER_A_JWT and RLS_USER_B_JWT to short-lived confirmed-user access JWTs');

const payloadA = decodePayload(tokenA);
const payloadB = decodePayload(tokenB);
const now = Math.floor(Date.now() / 1000);
assert.match(String(payloadA.sub || ''), /^[0-9a-f-]{36}$/i, 'user A JWT sub invalid');
assert.match(String(payloadB.sub || ''), /^[0-9a-f-]{36}$/i, 'user B JWT sub invalid');
assert.notEqual(payloadA.sub, payloadB.sub, 'RLS probe requires two different users');
assert.ok(Number(payloadA.exp || 0) > now, 'user A JWT expired');
assert.ok(Number(payloadB.exp || 0) > now, 'user B JWT expired');

async function profileRead(token, targetId) {
  const url = `${baseUrl}/rest/v1/profiles?select=id&id=eq.${encodeURIComponent(targetId)}&limit=1`;
  const response = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  let rows;
  try { rows = JSON.parse(text); } catch { throw new Error(`non-JSON RLS response status=${response.status}`); }
  assert.equal(response.status, 200, `RLS read failed status=${response.status}`);
  assert.ok(Array.isArray(rows), 'RLS response must be an array');
  return rows;
}

const aSelf = await profileRead(tokenA, payloadA.sub);
const aReadsB = await profileRead(tokenA, payloadB.sub);
const bSelf = await profileRead(tokenB, payloadB.sub);
const bReadsA = await profileRead(tokenB, payloadA.sub);

assert.equal(aSelf.length, 1, 'user A must read own profile');
assert.equal(bSelf.length, 1, 'user B must read own profile');
assert.equal(aReadsB.length, 0, 'RLS FAILURE: user A read user B profile');
assert.equal(bReadsA.length, 0, 'RLS FAILURE: user B read user A profile');

console.log(`RLS_PROBE_AT=${new Date().toISOString()}`);
console.log(`RLS_USER_A_SELF status=200 rows=${aSelf.length}`);
console.log(`RLS_USER_A_READ_B status=200 rows=${aReadsB.length}`);
console.log(`RLS_USER_B_SELF status=200 rows=${bSelf.length}`);
console.log(`RLS_USER_B_READ_A status=200 rows=${bReadsA.length}`);
console.log('RLS_RESULT=PASS');
