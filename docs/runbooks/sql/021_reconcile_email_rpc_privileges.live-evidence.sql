-- مواشي ديزاد — أدلة القبول الحية للترحيل 021.
-- قراءة فقط: SELECT وفحص كتالوج PostgreSQL؛ لا يغير أي بيانات.

with target_functions(
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
    session_user::text as session_user_name,
    current_user::text as current_user_name,
    current_setting('role', true) as role_setting
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
), acl_documentation as (
  select
    t.expected_signature,
    case when p.proacl is null then 'acldefault' else 'explicit_proacl' end
      as acl_expansion_source,
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
                 else pg_get_userbyid(a.grantee) end,
            a.privilege_type
        )
        from aclexplode(
          coalesce(p.proacl, acldefault('f', p.proowner))
        ) as a(grantor, grantee, privilege_type, is_grantable)
        where a.privilege_type = 'EXECUTE'
      ),
      '[]'::jsonb
    ) as expanded_execute_acl_supporting
  from target_functions t
  join pg_proc p on p.oid = to_regprocedure(t.expected_signature)
), ledger as (
  select
    count(*)::integer as ledger_rows,
    max(version) as ledger_version,
    max(name) as ledger_name,
    max(applied_at) as ledger_applied_at,
    max(notes) as ledger_notes
  from public.mdz_schema_migrations
  where version = '021'
), summary as (
  select
    count(*) = 4
    and bool_and(
      coalesce(function_exists, false)
      and coalesce(signature_matches, false)
      and coalesce(actual_identity_args = expected_identity_args, false)
      and coalesce(owner_name = 'postgres', false)
      and not coalesce(proacl_is_null, true)
      and actual_direct_execute_grantees = expected_direct_execute_grantees
      and unexpected_execute_grantors = array[]::text[]
      and unexpected_grantable_grantees = array[]::text[]
      and not coalesce(public_execute, true)
      and not coalesce(anon_execute, true)
      and not coalesce(authenticated_execute, true)
      and coalesce(service_role_execute, false)
      and unexpected_overload_count = 0
    ) as all_functions_ok
  from measured
)
select
  c.captured_at_utc,
  c.database_name,
  c.server_version_num,
  c.server_encoding,
  c.session_user_name,
  c.current_user_name,
  c.role_setting,
  m.expected_signature,
  m.actual_signature,
  m.expected_identity_args,
  m.actual_identity_args,
  m.resolved_oid,
  m.function_exists,
  m.signature_matches,
  m.owner_name,
  m.proacl_is_null,
  m.raw_proacl,
  m.expected_direct_execute_grantees,
  m.actual_direct_execute_grantees,
  m.unexpected_execute_grantors,
  m.unexpected_grantable_grantees,
  a.acl_expansion_source,
  a.expanded_execute_acl_supporting,
  m.public_execute,
  m.anon_execute,
  m.authenticated_execute,
  m.service_role_execute,
  m.unexpected_overload_count,
  l.ledger_rows,
  l.ledger_version,
  l.ledger_name,
  l.ledger_applied_at,
  to_char(
    l.ledger_applied_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) as ledger_applied_at_utc,
  l.ledger_notes,
  case when
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
  then 'OK_ATTESTED' else 'FAIL' end as function_check_result,
  case when
    c.current_user_name = 'postgres'
    and c.server_encoding = 'UTF8'
    and s.all_functions_ok
    and l.ledger_rows = 1
    and l.ledger_version = '021'
    and l.ledger_name = 'reconcile_email_rpc_privileges'
    and l.ledger_applied_at is not null
  then 'OK_ATTESTED' else 'FAIL' end as overall_result
from measured m
cross join execution_context c
cross join ledger l
cross join summary s
left join acl_documentation a using (expected_signature)
order by m.expected_signature;
