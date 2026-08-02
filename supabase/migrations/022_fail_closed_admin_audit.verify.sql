-- Read-only production attestation for migration 022.
-- Links the live function bodies to the exact source exercised by the
-- isolated rollback test, then verifies the complete execution contract.

with expected(
  signature,
  function_name,
  source_sha256,
  expected_source_utf8_bytes,
  expected_direct_execute_grantees,
  return_type,
  arg_names,
  identity_args,
  default_count,
  default_expression,
  service_role_required
) as (
  values
    (
      'public.review_registration_status(text,text,text)',
      'review_registration_status',
      '315a74e268c4e0f7f593c27e69182bd1f08dc4ba039877cc5f9aceeac81f93d7',
      5626,
      array['authenticated','postgres','service_role']::text[],
      'jsonb',
      array['p_registration_id','p_new_status','p_reason']::text[],
      'p_registration_id text, p_new_status text, p_reason text',
      1,
      'NULL::text',
      true
    ),
    (
      'public.set_support_ticket_status(bigint,text)',
      'set_support_ticket_status',
      '80002a92f653641b0f751ad76a63dfdafc2ed3026dea1fdcd5981164557c837d',
      1602,
      array['authenticated','postgres']::text[],
      'public.support_tickets',
      array['p_ticket_id','p_status']::text[],
      'p_ticket_id bigint, p_status text',
      0,
      null,
      null
    )
), execution_context as (
  select
    to_char(
      statement_timestamp() at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ) as captured_at_utc,
    current_database() as database_name,
    current_user::text as current_user_name,
    session_user::text as session_user_name,
    current_setting('role', true) as role_setting,
    current_setting('server_version_num')::integer as server_version_num,
    current_setting('server_version_num')::integer / 10000 as live_server_major,
    180003::integer as isolated_tested_server_version_num,
    18::integer as isolated_tested_server_major,
    current_setting('server_version_num')::integer / 10000 = 18
      as engine_major_matches,
    current_setting('server_encoding') as server_encoding
), measured as (
  select
    e.*,
    p.oid,
    p.oid is not null as function_exists,
    case when p.oid is null then null else
      format('%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes))
    end as actual_signature,
    pg_get_function_identity_arguments(p.oid) as actual_identity_args,
    pg_get_expr(p.proargdefaults, 0) as actual_default_expression,
    case when p.oid is null then null else
      encode(sha256(convert_to(p.prosrc, 'UTF8')), 'hex')
    end as actual_source_sha256,
    octet_length(convert_to(p.prosrc, 'UTF8')) as actual_source_utf8_bytes,
    pg_get_userbyid(p.proowner)::text as owner_name,
    l.lanname::text as language_name,
    p.probin is null as binary_reference_is_null,
    p.prosqlbody is null as sql_body_is_null,
    p.prokind,
    p.prosecdef,
    p.proleakproof,
    p.proisstrict,
    p.proretset,
    p.provolatile,
    p.proparallel,
    p.proargnames,
    p.pronargdefaults,
    p.prorettype,
    coalesce(
      (select array_agg(config_item order by config_item)
       from unnest(p.proconfig) as config_item),
      array[]::text[]
    ) as runtime_config,
    p.proacl::text as raw_acl,
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
          order by case when a.grantee = 0 then 'PUBLIC'
                        else pg_get_userbyid(a.grantee) end
        )
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where a.privilege_type = 'EXECUTE'
      ),
      '[]'::jsonb
    ) as expanded_execute_acl,
    case when p.oid is null then null else
      position('mdz_audit_admin_action' in p.prosrc) > 0
    end as references_audit_writer,
    case when p.oid is null then null else
      not (p.prosrc ~* 'exception[[:space:]]+when')
    end as no_exception_handler,
    case when p.oid is null then null else
      not has_function_privilege('public', e.signature, 'EXECUTE')
    end as public_execute_blocked,
    case when p.oid is null then null else
      not has_function_privilege('anon', e.signature, 'EXECUTE')
    end as anon_execute_blocked,
    case when p.oid is null then null else
      has_function_privilege('authenticated', e.signature, 'EXECUTE')
    end as authenticated_execute_allowed,
    case when p.oid is null then null else
      has_function_privilege('service_role', e.signature, 'EXECUTE')
    end as service_role_execute,
    (
      select count(*)::integer
      from pg_proc extra
      join pg_namespace extra_ns on extra_ns.oid = extra.pronamespace
      where extra_ns.nspname = 'public'
        and extra.proname = e.function_name
        and extra.oid is distinct from p.oid
    ) as unexpected_overload_count
  from expected e
  left join pg_proc p on p.oid = to_regprocedure(e.signature)
  left join pg_namespace n on n.oid = p.pronamespace
  left join pg_language l on l.oid = p.prolang
), ledger as (
  select
    count(*)::integer as ledger_rows,
    max(version) as ledger_version,
    max(name) as ledger_name,
    max(applied_at) as ledger_applied_at,
    max(notes) as ledger_notes
  from public.mdz_schema_migrations
  where version = '022'
), evaluated as (
  select
    m.*,
    (
      m.function_exists
      and m.actual_identity_args = m.identity_args
      and m.actual_default_expression is not distinct from m.default_expression
      and m.actual_source_sha256 = m.source_sha256
      and m.actual_source_utf8_bytes = m.expected_source_utf8_bytes
      and m.owner_name = 'postgres'
      and m.language_name = 'plpgsql'
      and m.binary_reference_is_null
      and m.sql_body_is_null
      and m.prokind = 'f'
      and m.prosecdef
      and not m.proleakproof
      and not m.proisstrict
      and not m.proretset
      and m.provolatile = 'v'
      and m.proparallel = 'u'
      and m.proargnames = m.arg_names
      and m.pronargdefaults = m.default_count
      and m.prorettype = to_regtype(m.return_type)
      and m.runtime_config = array['search_path=""']::text[]
      and m.actual_direct_execute_grantees = m.expected_direct_execute_grantees
      and m.unexpected_execute_grantors = array[]::text[]
      and m.unexpected_grantable_grantees = array[]::text[]
      and m.references_audit_writer
      and m.no_exception_handler
      and m.public_execute_blocked
      and m.anon_execute_blocked
      and m.authenticated_execute_allowed
      and (
        m.service_role_required is null
        or m.service_role_execute = m.service_role_required
      )
      and m.unexpected_overload_count = 0
    ) as function_attested
  from measured m
)
select
  c.captured_at_utc,
  c.database_name,
  c.current_user_name,
  c.session_user_name,
  c.role_setting,
  c.server_version_num,
  c.live_server_major,
  c.isolated_tested_server_version_num,
  c.isolated_tested_server_major,
  c.engine_major_matches,
  c.server_encoding,
  e.signature,
  e.actual_signature,
  e.identity_args as expected_identity_args,
  e.actual_identity_args,
  e.source_sha256 as expected_source_sha256,
  e.actual_source_sha256,
  e.expected_source_utf8_bytes,
  e.actual_source_utf8_bytes,
  e.owner_name,
  e.language_name,
  e.binary_reference_is_null,
  e.sql_body_is_null,
  e.prokind as function_kind,
  e.prosecdef as security_definer,
  e.provolatile as volatility,
  e.proparallel as parallel_safety,
  e.arg_names as expected_argument_names,
  e.proargnames as actual_argument_names,
  e.default_count as expected_default_count,
  e.pronargdefaults as actual_default_count,
  e.default_expression as expected_default_expression,
  e.actual_default_expression,
  e.runtime_config,
  e.raw_acl,
  e.expected_direct_execute_grantees,
  e.actual_direct_execute_grantees,
  e.unexpected_execute_grantors,
  e.unexpected_grantable_grantees,
  e.expanded_execute_acl,
  e.references_audit_writer,
  e.no_exception_handler,
  e.public_execute_blocked,
  e.anon_execute_blocked,
  e.authenticated_execute_allowed,
  e.service_role_execute,
  e.unexpected_overload_count,
  l.ledger_rows,
  l.ledger_version,
  l.ledger_name,
  l.ledger_applied_at,
  l.ledger_notes,
  case when
    c.current_user_name = 'postgres'
    and c.server_encoding = 'UTF8'
    and c.engine_major_matches
    and e.function_attested
    and l.ledger_rows = 1
    and l.ledger_version = '022'
    and l.ledger_name = 'fail_closed_admin_audit'
    and l.ledger_applied_at is not null
  then 'OK_ATTESTED' else 'FAIL' end as check_result
from evaluated e
cross join execution_context c
cross join ledger l
order by e.signature;
