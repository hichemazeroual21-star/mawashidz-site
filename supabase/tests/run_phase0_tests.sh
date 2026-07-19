#!/usr/bin/env bash
# MawashiDZ Phase 0 — local migration + concurrency test harness
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }
section() { echo; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "▶ $1"; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

psql_db() {
  local db="$1"; shift
  sudo -u postgres psql -d "$db" -v ON_ERROR_STOP=1 "$@"
}

reset_db() {
  local db="$1"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${db};"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db} OWNER mawashi;"
}

apply_sql() {
  local db="$1"
  local file="$2"
  psql_db "$db" -f "$file" >/tmp/mdz_sql_out.txt 2>/tmp/mdz_sql_err.txt \
    || { echo "SQL failed: $file"; cat /tmp/mdz_sql_err.txt; cat /tmp/mdz_sql_out.txt; exit 1; }
}

# ------------------------------------------------------------
section "A) Existing database path"
# ------------------------------------------------------------
reset_db mawashi_existing
sed "s|\\\\i supabase/tests/fixtures/auth_stubs.sql|\\\\i ${ROOT}/supabase/tests/fixtures/auth_stubs.sql|" \
  "$ROOT/supabase/tests/fixtures/existing_schema.sql" > /tmp/existing_schema_abs.sql
apply_sql mawashi_existing /tmp/existing_schema_abs.sql

LEGACY_BEFORE=$(psql_db mawashi_existing -Atc "select count(*)::text||':'||coalesce(max(email),'') from profiles where id='11111111-1111-1111-1111-111111111111';")
[[ "$LEGACY_BEFORE" == "1:legacy@example.com" ]] || fail "legacy seed missing"

apply_sql mawashi_existing "$ROOT/supabase/migrations/20260718233000_phase0_existing_database.sql"
pass "existing migration applied once (first run)"

# Snapshot after first run — used to prove second run allocates nothing
psql_db mawashi_existing -Atc "select coalesce(string_agg(prefix||':'||last_value::text, ',' order by prefix), '') from member_id_counters;" > /tmp/mdz_counters_run1.txt
psql_db mawashi_existing -Atc "select coalesce(string_agg(id::text||'='||member_id, ',' order by id), '') from profiles;" > /tmp/mdz_members_run1.txt
COUNTER_SUM_1=$(psql_db mawashi_existing -Atc "select coalesce(sum(last_value),0) from member_id_counters;")
LEGACY_AFTER=$(psql_db mawashi_existing -Atc "select count(*)::text||':'||coalesce(max(email),'')||':'||coalesce(max(full_name),'')||':'||coalesce(max(member_id),'')||':'||coalesce(max(role),'') from profiles where id='11111111-1111-1111-1111-111111111111';")
echo "$LEGACY_AFTER" | grep -qE '^1:legacy@example.com:مستخدم قديم:MDZ-[A-Z]-[0-9]{6}:buyer$' \
  || fail "legacy data/backfill failed: $LEGACY_AFTER"
pass "first-run: legacy preserved + unique valid member_id + role=buyer"
echo "FIRST_RUN_LEGACY=$LEGACY_AFTER"
echo "FIRST_RUN_COUNTER_SUM=$COUNTER_SUM_1"
echo "FIRST_RUN_COUNTERS=$(cat /tmp/mdz_counters_run1.txt)"

NULL_IDS=$(psql_db mawashi_existing -Atc "select count(*) from profiles where member_id is null or btrim(member_id)='';")
[[ "$NULL_IDS" == "0" ]] || fail "profiles still missing member_id: $NULL_IDS"
pass "first-run: no NULL/blank member_id"

# Syntax proof: jwt_role multi-line coalesce is present in deployed function
psql_db mawashi_existing -Atc "select pg_get_functiondef('public.protect_profile_sensitive_columns()'::regprocedure);" \
  | grep -A3 'jwt_role text' | tee /tmp/mdz_jwt_role_def.txt
grep -q "nullif(current_setting('request.jwt.claim.role', true), '')" /tmp/mdz_jwt_role_def.txt \
  || fail "jwt_role declaration missing nullif/current_setting"
# Reject the historically broken one-liner form (missing closing args)
! grep -qE "jwt_role text := coalesce\(nullif\(current_setting\('request\.jwt\.claim\.role', true\), ''\);" /tmp/mdz_jwt_role_def.txt \
  || fail "broken one-liner jwt_role declaration detected"
pass "jwt_role declaration is valid multi-arg coalesce"

apply_sql mawashi_existing "$ROOT/supabase/migrations/20260718233000_phase0_existing_database.sql"
pass "existing migration re-run (second run)"

psql_db mawashi_existing -Atc "select coalesce(string_agg(prefix||':'||last_value::text, ',' order by prefix), '') from member_id_counters;" > /tmp/mdz_counters_run2.txt
psql_db mawashi_existing -Atc "select coalesce(string_agg(id::text||'='||member_id, ',' order by id), '') from profiles;" > /tmp/mdz_members_run2.txt
COUNTER_SUM_2=$(psql_db mawashi_existing -Atc "select coalesce(sum(last_value),0) from member_id_counters;")

diff -u /tmp/mdz_members_run1.txt /tmp/mdz_members_run2.txt >/tmp/mdz_members_diff.txt \
  || { cat /tmp/mdz_members_diff.txt; fail "second run changed profile member_ids"; }
pass "second-run: profile member_ids unchanged"

[[ "$COUNTER_SUM_1" == "$COUNTER_SUM_2" ]] \
  || fail "second run consumed member IDs: sum $COUNTER_SUM_1 -> $COUNTER_SUM_2"
diff -u /tmp/mdz_counters_run1.txt /tmp/mdz_counters_run2.txt >/tmp/mdz_counters_diff.txt \
  || { cat /tmp/mdz_counters_diff.txt; fail "second run changed counter last_value"; }
pass "second-run: counters unchanged (zero additional allocations)"
echo "SECOND_RUN_COUNTER_SUM=$COUNTER_SUM_2"

COLS=$(psql_db mawashi_existing -Atc "select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('member_id','role','status','wilaya','registration_id');")
[[ "$COLS" == "5" ]] || fail "missing profile columns (got $COLS)"
pass "profiles columns present"

psql_db mawashi_existing -f "$ROOT/supabase/tests/phase0_assertions.sql" > /tmp/mdz_assert_existing.txt 2>&1
grep -q PHASE0_ASSERTIONS_OK /tmp/mdz_assert_existing.txt || { cat /tmp/mdz_assert_existing.txt; fail "assertions failed on existing path"; }
pass "functional assertions (existing)"

# ------------------------------------------------------------
section "B) Concurrency — 100 parallel allocate_member_id"
# ------------------------------------------------------------
WORKDIR=$(mktemp -d)
for i in $(seq 1 100); do
  (
    sudo -u postgres psql -d mawashi_existing -v ON_ERROR_STOP=1 -Atc "select public.allocate_member_id('breeder');" \
      > "$WORKDIR/id_$i.txt" 2>"$WORKDIR/err_$i.txt" || echo FAIL > "$WORKDIR/id_$i.txt"
  ) &
done
wait

FAILS=$(grep -rl '^FAIL$' "$WORKDIR" 2>/dev/null | wc -l | tr -d ' ' || true)
FAILS=${FAILS:-0}
[[ "$FAILS" == "0" ]] || { echo "Concurrency errors:"; cat "$WORKDIR"/err_*.txt 2>/dev/null | head -40; fail "allocate_member_id failed in $FAILS workers"; }

# Keep only lines that look like member IDs (ignore notices/blank lines)
grep -hE '^MDZ-[A-Z]-[0-9]{6}$' "$WORKDIR"/id_*.txt | sort > /tmp/mdz_concurrent_ids.txt || true
TOTAL=$(wc -l < /tmp/mdz_concurrent_ids.txt | tr -d ' ')
UNIQUE=$(sort -u /tmp/mdz_concurrent_ids.txt | wc -l | tr -d ' ')
BAD=$(grep -cvE '^MDZ-F-[0-9]{6}$' /tmp/mdz_concurrent_ids.txt 2>/dev/null | tr -d ' ' || true)
BAD=${BAD:-0}

[[ "$TOTAL" == "100" ]] || fail "expected 100 ids, got $TOTAL"
[[ "$UNIQUE" == "100" ]] || fail "duplicate ids under concurrency: unique=$UNIQUE /tmp sample: $(head -5 /tmp/mdz_concurrent_ids.txt)"
[[ "$BAD" == "0" ]] || fail "invalid id formats: $BAD"
pass "100 concurrent allocations — unique sequential IDs"

mkdir -p /opt/cursor/artifacts
cp /tmp/mdz_concurrent_ids.txt /opt/cursor/artifacts/phase0_concurrent_member_ids.txt
psql_db mawashi_existing -f "$ROOT/supabase/tests/phase0_concurrency.sql" > /tmp/mdz_conc_post.txt 2>&1
grep -q PHASE0_CONCURRENCY_POSTCHECK_OK /tmp/mdz_conc_post.txt || { cat /tmp/mdz_conc_post.txt; fail "concurrency postcheck failed"; }
pass "concurrency postcheck"

# ------------------------------------------------------------
section "C) Fresh database path"
# ------------------------------------------------------------
reset_db mawashi_fresh
apply_sql mawashi_fresh "$ROOT/supabase/tests/fixtures/auth_stubs.sql"
apply_sql mawashi_fresh "$ROOT/supabase/migrations/20260718233001_phase0_fresh_database.sql"
apply_sql mawashi_fresh "$ROOT/supabase/migrations/20260718233000_phase0_existing_database.sql"
pass "fresh bootstrap + hardening applied"

apply_sql mawashi_fresh "$ROOT/supabase/migrations/20260718233001_phase0_fresh_database.sql"
apply_sql mawashi_fresh "$ROOT/supabase/migrations/20260718233000_phase0_existing_database.sql"
pass "fresh path re-run (idempotent) OK"

psql_db mawashi_fresh -f "$ROOT/supabase/tests/phase0_assertions.sql" > /tmp/mdz_assert_fresh.txt 2>&1
grep -q PHASE0_ASSERTIONS_OK /tmp/mdz_assert_fresh.txt || { cat /tmp/mdz_assert_fresh.txt; fail "assertions failed on fresh path"; }
pass "functional assertions (fresh)"

# ------------------------------------------------------------
section "D) Security surface"
# ------------------------------------------------------------
COUNTER_POLICIES=$(psql_db mawashi_existing -Atc "select count(*) from pg_policies where tablename='member_id_counters';")
[[ "$COUNTER_POLICIES" == "0" ]] || fail "member_id_counters should have zero public policies"
pass "member_id_counters locked (0 RLS policies)"

ANON_ALLOC=$(psql_db mawashi_existing -Atc "select has_function_privilege('anon','public.allocate_member_id(text)','EXECUTE');")
[[ "$ANON_ALLOC" == "f" ]] || fail "anon must NOT execute allocate_member_id (counter exhaustion hardening)"
pass "anon cannot execute allocate_member_id (server-side only)"

AUTH_ALLOC=$(psql_db mawashi_existing -Atc "select has_function_privilege('authenticated','public.allocate_member_id(text)','EXECUTE');")
[[ "$AUTH_ALLOC" == "f" ]] || fail "authenticated must NOT execute allocate_member_id"
pass "authenticated cannot execute allocate_member_id"

RLS_ON=$(psql_db mawashi_existing -Atc "select relrowsecurity from pg_class where oid='public.profiles'::regclass;")
[[ "$RLS_ON" == "t" ]] || fail "profiles RLS not enabled"
pass "profiles RLS enabled"

echo
echo "════════════════════════════════════════"
echo " PHASE 0 LOCAL TESTS: ALL PASSED"
echo "════════════════════════════════════════"
echo "Artifacts:"
echo "  /opt/cursor/artifacts/phase0_concurrent_member_ids.txt"
echo "  /tmp/mdz_assert_existing.txt"
echo "  /tmp/mdz_assert_fresh.txt"
