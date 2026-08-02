-- مواشي ديزاد — تحقق حي مربوط بلقطة ما قبل الترحيل 021.
-- قراءة فقط. لا يمكن أن يعيد OK_ATTESTED قبل ربط baseline_json الخام
-- الناتج من 021_preflight_snapshot.sql في الموضع الوحيد أدناه.

with baseline_input as (
  select
    null::jsonb as snapshot, -- MDZ_021_BIND_BASELINE_JSON_HERE
    null::text as expected_snapshot_sha256, -- MDZ_021_BIND_BASELINE_SHA256_HERE
    null::text as anchor_commit_sha, -- MDZ_021_BIND_ANCHOR_COMMIT_SHA_HERE
    null::text as anchor_ci_run_url, -- MDZ_021_BIND_ANCHOR_CI_RUN_URL_HERE
    null::timestamptz as anchor_ci_observed_at_utc -- MDZ_021_BIND_ANCHOR_CI_TIME_HERE
), target_functions(
  expected_signature,
  expected_identity_args,
  expected_direct_execute_grantees
) as (
  values
    (
      'public.mdz_claim_email_outbox(integer,text)',
      'p_limit integer, p_worker_id text',
      array['postgres','service_role']::text[]
    ),
    (
      'public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)',
      'p_email text, p_user_id uuid, p_template_key text, p_subject text, p_body_text text, p_payload jsonb',
      array['postgres','service_role']::text[]
    ),
    (
      'public.mdz_mark_email_outbox(bigint,text,text,text)',
      'p_id bigint, p_status text, p_error text, p_provider_message_id text',
      array['postgres','service_role']::text[]
    ),
    (
      'public.mdz_notify_user(uuid,text,text,text,jsonb,text)',
      'p_recipient_id uuid, p_event_type text, p_title text, p_body text, p_payload jsonb, p_link_path text',
      array['postgres','service_role']::text[]
    )
), baseline_context as (
  select
    b.snapshot is not null
      and b.expected_snapshot_sha256 ~ '^[a-f0-9]{64}$'
      as baseline_bound,
    nullif(b.snapshot ->> 'schema_version', '')::integer as baseline_schema_version,
    b.snapshot ->> 'captured_at_utc' as baseline_captured_at_utc,
    b.snapshot ->> 'database_name' as baseline_database_name,
    nullif(b.snapshot ->> 'server_version_num', '')::integer
      as baseline_server_version_num,
    b.snapshot ->> 'server_encoding' as baseline_server_encoding,
    b.snapshot ->> 'quote_all_identifiers' as baseline_quote_all_identifiers,
    b.snapshot ->> 'session_search_path' as baseline_session_search_path,
    b.snapshot ->> 'cluster_system_identifier'
      as baseline_cluster_system_identifier,
    b.snapshot ->> 'expected_supabase_project_ref'
      as baseline_expected_supabase_project_ref,
    b.snapshot ->> 'session_user_name' as baseline_session_user_name,
    b.snapshot ->> 'current_user_name' as baseline_current_user_name,
    b.snapshot ->> 'role_setting' as baseline_role_setting,
    nullif(b.snapshot ->> 'ledger_021_rows', '')::integer
      as baseline_ledger_021_rows,
    b.snapshot ->> 'preflight_result' as baseline_preflight_result,
    b.expected_snapshot_sha256,
    b.anchor_commit_sha,
    b.anchor_ci_run_url,
    b.anchor_ci_observed_at_utc,
    b.anchor_commit_sha ~ '^[a-f0-9]{40}$'
      and b.anchor_ci_run_url ~ '^https://github[.]com/[^/]+/[^/]+/actions/runs/[0-9]+$'
      and b.anchor_ci_observed_at_utc is not null
      as external_anchor_bound,
    encode(
      sha256(convert_to(coalesce(b.snapshot::text, ''), 'UTF8')),
      'hex'
    ) as actual_snapshot_sha256,
    b.expected_snapshot_sha256 = encode(
      sha256(convert_to(coalesce(b.snapshot::text, ''), 'UTF8')),
      'hex'
    ) as baseline_snapshot_integrity,
    b.snapshot
  from baseline_input b
), baseline_functions as (
  select f.*
  from baseline_input b
  cross join lateral jsonb_to_recordset(
    coalesce(b.snapshot -> 'functions', '[]'::jsonb)
  ) as f(
    expected_signature text,
    actual_signature text,
    expected_identity_args text,
    actual_identity_args text,
    resolved_oid text,
    owner_name text,
    source_sha256 text,
    source_utf8_bytes integer,
    definition_sha256 text,
    definition_utf8_bytes integer,
    raw_proacl text,
    actual_direct_execute_grantees text[],
    expanded_execute_acl jsonb,
    public_execute boolean,
    anon_execute boolean,
    authenticated_execute boolean,
    service_role_execute boolean,
    unexpected_overload_count integer
  )
), execution_context as (
  select
    to_char(
      statement_timestamp() at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ) as captured_at_utc,
    current_database() as database_name,
    current_setting('server_version_num')::integer as server_version_num,
    current_setting('server_encoding') as server_encoding,
    current_setting('quote_all_identifiers') as quote_all_identifiers,
    current_setting('search_path') as session_search_path,
    control.system_identifier::text as cluster_system_identifier,
    'fpjvjfgwbfehhcvdirpy'::text as expected_supabase_project_ref,
    session_user::text as session_user_name,
    current_user::text as current_user_name,
    current_setting('role', true) as role_setting
  from pg_catalog.pg_control_system() control
), measured as (
  select
    t.expected_signature,
    t.expected_identity_args,
    t.expected_direct_execute_grantees,
    p.oid::text as resolved_oid,
    p.oid is not null as function_exists,
    case when p.oid is null then null else
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_catalog.oidvectortypes(p.proargtypes)
      )
    end as actual_signature,
    case when p.oid is null then null else
      pg_get_function_identity_arguments(p.oid)
    end as actual_identity_args,
    case when p.oid is null then false else
      p.oid = to_regprocedure(t.expected_signature)
    end as signature_matches,
    pg_get_userbyid(p.proowner) as owner_name,
    case when p.oid is null then null else
      encode(sha256(convert_to(p.prosrc, 'UTF8')), 'hex')
    end as source_sha256,
    case when p.oid is null then null else
      octet_length(convert_to(p.prosrc, 'UTF8'))
    end as source_utf8_bytes,
    case when p.oid is null then null else
      encode(
        sha256(convert_to(pg_get_functiondef(p.oid), 'UTF8')),
        'hex'
      )
    end as definition_sha256,
    case when p.oid is null then null else
      octet_length(convert_to(pg_get_functiondef(p.oid), 'UTF8'))
    end as definition_utf8_bytes,
    case when p.oid is null then null else p.proacl is null end as proacl_is_null,
    p.proacl::text as raw_proacl,
    coalesce(
      (
        select array_agg(grantee_name order by grantee_name)
        from (
          select distinct
            case when a.grantee = 0 then 'PUBLIC'
                 else pg_get_userbyid(a.grantee)::text end as grantee_name
          from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where a.privilege_type = 'EXECUTE'
        ) direct_acl
      ),
      array[]::text[]
    ) as actual_direct_execute_grantees,
    coalesce(
      (
        select array_agg(grantor_name order by grantor_name)
        from (
          select distinct pg_get_userbyid(a.grantor)::text as grantor_name
          from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where a.privilege_type = 'EXECUTE'
            and pg_get_userbyid(a.grantor) <> 'postgres'
        ) unexpected_grantors
      ),
      array[]::text[]
    ) as unexpected_execute_grantors,
    coalesce(
      (
        select array_agg(grantee_name order by grantee_name)
        from (
          select distinct pg_get_userbyid(a.grantee)::text as grantee_name
          from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          where a.privilege_type = 'EXECUTE'
            and a.is_grantable
            and a.grantee <> p.proowner
        ) unexpected_grantable
      ),
      array[]::text[]
    ) as unexpected_grantable_grantees,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'grantor', pg_get_userbyid(a.grantor),
            'grantee', case when a.grantee = 0 then 'PUBLIC'
                            else pg_get_userbyid(a.grantee) end,
            'privilege', a.privilege_type,
            'grantable', a.is_grantable
          )
          order by
            case when a.grantee = 0 then 'PUBLIC'
                 else pg_get_userbyid(a.grantee) end
        )
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where a.privilege_type = 'EXECUTE'
      ),
      '[]'::jsonb
    ) as expanded_execute_acl_supporting,
    case when p.oid is null then null else
      has_function_privilege('public', p.oid, 'EXECUTE')
    end as public_execute,
    case when p.oid is null then null else
      has_function_privilege('anon', p.oid, 'EXECUTE')
    end as anon_execute,
    case when p.oid is null then null else
      has_function_privilege('authenticated', p.oid, 'EXECUTE')
    end as authenticated_execute,
    case when p.oid is null then null else
      has_function_privilege('service_role', p.oid, 'EXECUTE')
    end as service_role_execute,
    (
      select count(*)::integer
      from pg_proc extra
      join pg_namespace extra_ns on extra_ns.oid = extra.pronamespace
      where extra_ns.nspname = 'public'
        and extra.proname = p.proname
        and extra.oid is distinct from p.oid
    ) as unexpected_overload_count
  from target_functions t
  left join pg_proc p on p.oid = to_regprocedure(t.expected_signature)
  left join pg_namespace n on n.oid = p.pronamespace
), ledger as (
  select
    count(*)::integer as ledger_rows,
    max(version) as ledger_version,
    max(name) as ledger_name,
    max(applied_at) as ledger_applied_at,
    max(notes) as ledger_notes
  from public.mdz_schema_migrations
  where version = '021'
), context_match as (
  select
    b.baseline_bound
    and b.baseline_snapshot_integrity
    and b.baseline_schema_version = 2
    and b.baseline_preflight_result = 'READY_016_CONTAINED'
    and b.baseline_ledger_021_rows = 0
    and b.baseline_database_name = c.database_name
    and b.baseline_server_version_num = c.server_version_num
    and b.baseline_server_encoding = c.server_encoding
    and b.baseline_quote_all_identifiers = c.quote_all_identifiers
    and b.baseline_session_search_path = c.session_search_path
    and b.baseline_cluster_system_identifier = c.cluster_system_identifier
    and b.baseline_expected_supabase_project_ref = c.expected_supabase_project_ref
    and b.baseline_session_user_name = c.session_user_name
    and b.baseline_current_user_name = c.current_user_name
    and b.baseline_role_setting is not distinct from c.role_setting
      as baseline_context_matches
  from baseline_context b
  cross join execution_context c
), summary as (
  select
    count(*) = 4
    and bool_and(
      coalesce(m.function_exists, false)
      and coalesce(m.signature_matches, false)
      and coalesce(m.actual_identity_args = m.expected_identity_args, false)
      and coalesce(m.owner_name = 'postgres', false)
      and not coalesce(m.proacl_is_null, true)
      and m.actual_direct_execute_grantees = m.expected_direct_execute_grantees
      and m.unexpected_execute_grantors = array[]::text[]
      and m.unexpected_grantable_grantees = array[]::text[]
      and not coalesce(m.public_execute, true)
      and not coalesce(m.anon_execute, true)
      and not coalesce(m.authenticated_execute, true)
      and coalesce(m.service_role_execute, false)
      and m.unexpected_overload_count = 0
      and b.expected_signature = m.expected_signature
      and b.resolved_oid = m.resolved_oid
      and b.actual_signature = m.actual_signature
      and b.actual_identity_args = m.actual_identity_args
      and b.owner_name = m.owner_name
      and b.source_sha256 = m.source_sha256
      and b.source_utf8_bytes = m.source_utf8_bytes
      and b.definition_sha256 = m.definition_sha256
      and b.definition_utf8_bytes = m.definition_utf8_bytes
    ) as all_functions_ok,
    count(b.expected_signature) = 4 as baseline_function_count_ok
  from measured m
  left join baseline_functions b using (expected_signature)
), assembled as (
  select
    m.*,
    b.raw_proacl as baseline_raw_proacl,
    b.resolved_oid as baseline_resolved_oid,
    b.source_sha256 as baseline_source_sha256,
    b.source_utf8_bytes as baseline_source_utf8_bytes,
    b.definition_sha256 as baseline_definition_sha256,
    b.definition_utf8_bytes as baseline_definition_utf8_bytes,
    b.resolved_oid = m.resolved_oid as oid_unchanged,
    b.source_sha256 = m.source_sha256
      and b.source_utf8_bytes = m.source_utf8_bytes as body_unchanged,
    b.definition_sha256 = m.definition_sha256
      and b.definition_utf8_bytes = m.definition_utf8_bytes
      as definition_unchanged
  from measured m
  left join baseline_functions b using (expected_signature)
)
select
  c.captured_at_utc,
  c.database_name,
  c.server_version_num,
  c.server_encoding,
  c.quote_all_identifiers,
  c.session_search_path,
  c.cluster_system_identifier,
  c.expected_supabase_project_ref,
  c.session_user_name,
  c.current_user_name,
  c.role_setting,
  b.baseline_bound,
  b.expected_snapshot_sha256 as baseline_snapshot_sha256,
  b.actual_snapshot_sha256,
  b.baseline_snapshot_integrity,
  b.baseline_captured_at_utc,
  b.baseline_database_name,
  b.baseline_server_version_num,
  b.baseline_server_encoding,
  b.baseline_quote_all_identifiers,
  b.baseline_session_search_path,
  b.baseline_cluster_system_identifier,
  b.baseline_expected_supabase_project_ref,
  b.baseline_session_user_name,
  b.baseline_current_user_name,
  b.baseline_role_setting,
  b.baseline_preflight_result,
  b.external_anchor_bound,
  b.anchor_commit_sha,
  b.anchor_ci_run_url,
  to_char(
    b.anchor_ci_observed_at_utc at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) as anchor_ci_observed_at_utc,
  (b.baseline_captured_at_utc::timestamptz <= b.anchor_ci_observed_at_utc)
    as baseline_precedes_external_anchor,
  (b.anchor_ci_observed_at_utc - b.baseline_captured_at_utc::timestamptz
    <= interval '30 minutes') as baseline_anchor_window_ok,
  x.baseline_context_matches,
  a.expected_signature,
  a.actual_signature,
  a.expected_identity_args,
  a.actual_identity_args,
  a.baseline_resolved_oid,
  a.resolved_oid,
  a.oid_unchanged,
  a.function_exists,
  a.signature_matches,
  a.owner_name,
  a.baseline_source_sha256,
  a.source_sha256 as actual_source_sha256,
  a.baseline_source_utf8_bytes,
  a.source_utf8_bytes as actual_source_utf8_bytes,
  a.baseline_definition_sha256,
  a.definition_sha256 as actual_definition_sha256,
  a.baseline_definition_utf8_bytes,
  a.definition_utf8_bytes as actual_definition_utf8_bytes,
  a.body_unchanged,
  a.definition_unchanged,
  a.baseline_raw_proacl,
  a.raw_proacl as actual_raw_proacl,
  a.expected_direct_execute_grantees,
  a.actual_direct_execute_grantees,
  a.unexpected_execute_grantors,
  a.unexpected_grantable_grantees,
  a.expanded_execute_acl_supporting,
  a.public_execute,
  a.anon_execute,
  a.authenticated_execute,
  a.service_role_execute,
  a.unexpected_overload_count,
  l.ledger_rows,
  l.ledger_version,
  l.ledger_name,
  l.ledger_applied_at,
  to_char(
    l.ledger_applied_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) as ledger_applied_at_utc,
  l.ledger_notes,
  case
    when not b.baseline_bound then 'BLOCK_BASELINE_NOT_BOUND'
    when not b.baseline_snapshot_integrity then 'FAIL_BASELINE_INTEGRITY'
    when not b.external_anchor_bound then 'BLOCK_EXTERNAL_ANCHOR_NOT_BOUND'
    when b.baseline_cluster_system_identifier <> c.cluster_system_identifier
      then 'FAIL_CLUSTER_ID_MISMATCH'
    when b.baseline_expected_supabase_project_ref <> c.expected_supabase_project_ref
      then 'FAIL_PROJECT_REF_MISMATCH'
    when b.baseline_quote_all_identifiers <> c.quote_all_identifiers
      or b.baseline_session_search_path <> c.session_search_path
      then 'FAIL_DEPARSE_CONTEXT_MISMATCH'
    when not x.baseline_context_matches then 'FAIL_CONTEXT_MISMATCH'
    when b.baseline_captured_at_utc::timestamptz > b.anchor_ci_observed_at_utc
      then 'FAIL_ANCHOR_ORDER'
    when b.anchor_ci_observed_at_utc - b.baseline_captured_at_utc::timestamptz
      > interval '30 minutes' then 'FAIL_STALE_BASELINE'
    when l.ledger_rows = 0
      and coalesce(a.oid_unchanged, false)
      and coalesce(a.body_unchanged, false)
      and coalesce(a.definition_unchanged, false)
      and coalesce(a.function_exists, false)
      and coalesce(a.signature_matches, false)
      and coalesce(a.actual_identity_args = a.expected_identity_args, false)
      and coalesce(a.owner_name = 'postgres', false)
      and a.actual_direct_execute_grantees = a.expected_direct_execute_grantees
      and a.unexpected_execute_grantors = array[]::text[]
      and a.unexpected_grantable_grantees = array[]::text[]
      and not coalesce(a.public_execute, true)
      and not coalesce(a.anon_execute, true)
      and not coalesce(a.authenticated_execute, true)
      and coalesce(a.service_role_execute, false)
      and a.unexpected_overload_count = 0
    then 'PRECHECK_MATCH_LEDGER_PENDING'
    when not (b.anchor_ci_observed_at_utc < l.ledger_applied_at)
      then 'FAIL_ANCHOR_ORDER'
    when l.ledger_applied_at - b.anchor_ci_observed_at_utc > interval '60 minutes'
      then 'FAIL_STALE_EXECUTION_WINDOW'
    when s.all_functions_ok
      and s.baseline_function_count_ok
      and l.ledger_rows = 1
      and l.ledger_version = '021'
      and l.ledger_name = 'reconcile_email_rpc_privileges'
      and l.ledger_applied_at is not null
      and coalesce(a.oid_unchanged, false)
      and coalesce(a.body_unchanged, false)
      and coalesce(a.definition_unchanged, false)
      and coalesce(a.function_exists, false)
      and coalesce(a.signature_matches, false)
      and coalesce(a.actual_identity_args = a.expected_identity_args, false)
      and coalesce(a.owner_name = 'postgres', false)
      and a.actual_direct_execute_grantees = a.expected_direct_execute_grantees
      and a.unexpected_execute_grantors = array[]::text[]
      and a.unexpected_grantable_grantees = array[]::text[]
      and not coalesce(a.public_execute, true)
      and not coalesce(a.anon_execute, true)
      and not coalesce(a.authenticated_execute, true)
      and coalesce(a.service_role_execute, false)
      and a.unexpected_overload_count = 0
    then 'OK_ATTESTED'
    else 'FAIL'
  end as function_check_result,
  case
    when not b.baseline_bound then 'BLOCK_BASELINE_NOT_BOUND'
    when not b.baseline_snapshot_integrity then 'FAIL_BASELINE_INTEGRITY'
    when not b.external_anchor_bound then 'BLOCK_EXTERNAL_ANCHOR_NOT_BOUND'
    when b.baseline_schema_version <> 2 then 'FAIL_BASELINE_SCHEMA'
    when b.baseline_cluster_system_identifier <> c.cluster_system_identifier
      then 'FAIL_CLUSTER_ID_MISMATCH'
    when b.baseline_expected_supabase_project_ref <> c.expected_supabase_project_ref
      then 'FAIL_PROJECT_REF_MISMATCH'
    when b.baseline_quote_all_identifiers <> c.quote_all_identifiers
      or b.baseline_session_search_path <> c.session_search_path
      then 'FAIL_DEPARSE_CONTEXT_MISMATCH'
    when not x.baseline_context_matches then 'FAIL_CONTEXT_MISMATCH'
    when b.baseline_captured_at_utc::timestamptz > b.anchor_ci_observed_at_utc
      then 'FAIL_ANCHOR_ORDER'
    when b.anchor_ci_observed_at_utc - b.baseline_captured_at_utc::timestamptz
      > interval '30 minutes' then 'FAIL_STALE_BASELINE'
    when l.ledger_rows = 0 then 'FAIL_LEDGER_NOT_APPLIED'
    when not (b.anchor_ci_observed_at_utc < l.ledger_applied_at)
      then 'FAIL_ANCHOR_ORDER'
    when l.ledger_applied_at - b.anchor_ci_observed_at_utc > interval '60 minutes'
      then 'FAIL_STALE_EXECUTION_WINDOW'
    when x.baseline_context_matches
      and s.all_functions_ok
      and s.baseline_function_count_ok
      and l.ledger_rows = 1
      and l.ledger_version = '021'
      and l.ledger_name = 'reconcile_email_rpc_privileges'
      and l.ledger_applied_at is not null
    then 'OK_ATTESTED'
    else 'FAIL'
  end as overall_result
from assembled a
cross join execution_context c
cross join baseline_context b
cross join context_match x
cross join summary s
cross join ledger l
order by a.expected_signature;
