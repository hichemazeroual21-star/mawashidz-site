-- مواشي ديزاد — لقطة ما قبل تطبيق الترحيل 021.
-- قراءة فقط: لا تنشئ جدولاً، ولا تحفظ سراً، ولا تغير ACL أو أي صف أعمال.
-- تحفظ النتيجة الخام كاملة. baseline_json هو الإدخال الوحيد المسموح
-- لربط ملف التحقق اللاحق بجسم الدوال وحالة الجلسة قبل التطبيق.

with evidence_contract as (
  select 'fpjvjfgwbfehhcvdirpy'::text as expected_supabase_project_ref
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
    contract.expected_supabase_project_ref,
    session_user::text as session_user_name,
    current_user::text as current_user_name,
    current_setting('role', true) as role_setting
  from pg_catalog.pg_control_system() control
  cross join evidence_contract contract
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
    ) as expanded_execute_acl,
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
    count(*)::integer as ledger_021_rows,
    max(name) as ledger_021_name,
    max(applied_at) as ledger_021_applied_at
  from public.mdz_schema_migrations
  where version = '021'
), assessment as (
  select
    count(*) = 4
    and bool_and(
      coalesce(function_exists, false)
      and coalesce(signature_matches, false)
      and coalesce(actual_identity_args = expected_identity_args, false)
      and coalesce(owner_name = 'postgres', false)
      and source_sha256 is not null
      and definition_sha256 is not null
      and not coalesce(proacl_is_null, true)
      and actual_direct_execute_grantees = expected_direct_execute_grantees
      and unexpected_execute_grantors = array[]::text[]
      and unexpected_grantable_grantees = array[]::text[]
      and not coalesce(public_execute, true)
      and not coalesce(anon_execute, true)
      and not coalesce(authenticated_execute, true)
      and coalesce(service_role_execute, false)
      and unexpected_overload_count = 0
    ) as expected_016_containment
  from measured
), function_snapshot as (
  select jsonb_agg(
    jsonb_build_object(
      'expected_signature', expected_signature,
      'actual_signature', actual_signature,
      'expected_identity_args', expected_identity_args,
      'actual_identity_args', actual_identity_args,
      'resolved_oid', resolved_oid,
      'owner_name', owner_name,
      'source_sha256', source_sha256,
      'source_utf8_bytes', source_utf8_bytes,
      'definition_sha256', definition_sha256,
      'definition_utf8_bytes', definition_utf8_bytes,
      'raw_proacl', raw_proacl,
      'actual_direct_execute_grantees', actual_direct_execute_grantees,
      'expanded_execute_acl', expanded_execute_acl,
      'public_execute', public_execute,
      'anon_execute', anon_execute,
      'authenticated_execute', authenticated_execute,
      'service_role_execute', service_role_execute,
      'unexpected_overload_count', unexpected_overload_count
    ) order by expected_signature
  ) as functions
  from measured
), state as (
  select
    c.*,
    l.*,
    a.expected_016_containment,
    case
      when c.current_user_name <> 'postgres' then 'STOP_NOT_OWNER_SESSION'
      when c.server_encoding <> 'UTF8' then 'STOP_ENCODING_MISMATCH'
      when l.ledger_021_rows <> 0 then 'STOP_021_LEDGER_ALREADY_EXISTS'
      when not a.expected_016_containment then 'STOP_UNEXPECTED_PREFLIGHT_DRIFT'
      else 'READY_016_CONTAINED'
    end as preflight_result
  from execution_context c
  cross join ledger l
  cross join assessment a
), snapshot as (
  select jsonb_build_object(
    'schema_version', 2,
    'captured_at_utc', s.captured_at_utc,
    'database_name', s.database_name,
    'server_version_num', s.server_version_num,
    'server_encoding', s.server_encoding,
    'quote_all_identifiers', s.quote_all_identifiers,
    'session_search_path', s.session_search_path,
    'cluster_system_identifier', s.cluster_system_identifier,
    'expected_supabase_project_ref', s.expected_supabase_project_ref,
    'session_user_name', s.session_user_name,
    'current_user_name', s.current_user_name,
    'role_setting', s.role_setting,
    'ledger_021_rows', s.ledger_021_rows,
    'preflight_result', s.preflight_result,
    'functions', f.functions
  ) as baseline_json
  from state s
  cross join function_snapshot f
)
select
  s.captured_at_utc,
  s.database_name,
  s.server_version_num,
  s.server_encoding,
  s.quote_all_identifiers,
  s.session_search_path,
  s.cluster_system_identifier,
  s.expected_supabase_project_ref,
  s.session_user_name,
  s.current_user_name,
  s.role_setting,
  s.ledger_021_rows,
  s.ledger_021_name,
  s.ledger_021_applied_at,
  s.expected_016_containment,
  encode(
    sha256(convert_to(j.baseline_json::text, 'UTF8')),
    'hex'
  ) as baseline_snapshot_sha256,
  j.baseline_json::text as baseline_json,
  format('$mdz021$%s$mdz021$::jsonb', j.baseline_json::text)
    as baseline_bind_literal,
  format(
    '%L::text',
    encode(sha256(convert_to(j.baseline_json::text, 'UTF8')), 'hex')
  ) as baseline_sha256_bind_literal,
  null::text as automated_restore_sql,
  'MANUAL_FORWARD_REPAIR_REQUIRED'::text as recovery_mode,
  true as snapshot_is_read_only,
  s.preflight_result
from state s
cross join snapshot j
;
