-- Read-only structural verification for migration 022.
-- Behavioral rollback acceptance still requires an isolated staging database.

with target_functions(signature) as (
  values
    ('public.review_registration_status(text,text,text)'),
    ('public.set_support_ticket_status(bigint,text)')
), measured as (
  select
    signature,
    to_regprocedure(signature) is not null as function_exists,
    case
      when to_regprocedure(signature) is null then null
      else position(
        'mdz_audit_admin_action'
        in pg_get_functiondef(to_regprocedure(signature))
      ) > 0
    end as references_audit_writer,
    case
      when to_regprocedure(signature) is null then null
      else position(
        'undefined_function'
        in pg_get_functiondef(to_regprocedure(signature))
      ) = 0
    end as missing_writer_not_swallowed
    ,case
      when to_regprocedure(signature) is null then null
      else not (
        pg_get_functiondef(to_regprocedure(signature))
        ~* 'exception[[:space:]]+when'
      )
    end as no_exception_handler
    ,case
      when to_regprocedure(signature) is null then null
      else (
        select p.prosecdef
        from pg_proc p
        where p.oid = to_regprocedure(signature)
      )
    end as security_definer
    ,case
      when to_regprocedure(signature) is null then null
      else position(
        $needle$SET search_path TO ''$needle$
        in pg_get_functiondef(to_regprocedure(signature))
      ) > 0
    end as empty_search_path
    ,case
      when to_regprocedure(signature) is null then null
      else not has_function_privilege('public', signature, 'EXECUTE')
    end as public_execute_blocked
    ,case
      when to_regprocedure(signature) is null then null
      else not has_function_privilege('anon', signature, 'EXECUTE')
    end as anon_execute_blocked
    ,case
      when to_regprocedure(signature) is null then null
      else has_function_privilege('authenticated', signature, 'EXECUTE')
    end as authenticated_execute_allowed
  from target_functions
), ledger as (
  select case
    when to_regclass('public.mdz_schema_migrations') is null then false
    else exists (
      select 1
      from public.mdz_schema_migrations
      where version = '022'
        and name = 'fail_closed_admin_audit'
    )
  end as ledger_022_exists
)
select
  m.signature,
  m.function_exists,
  m.references_audit_writer,
  m.missing_writer_not_swallowed,
  m.no_exception_handler,
  m.security_definer,
  m.empty_search_path,
  m.public_execute_blocked,
  m.anon_execute_blocked,
  m.authenticated_execute_allowed,
  l.ledger_022_exists,
  case
    when m.function_exists
      and m.references_audit_writer
      and m.missing_writer_not_swallowed
      and m.no_exception_handler
      and m.security_definer
      and m.empty_search_path
      and m.public_execute_blocked
      and m.anon_execute_blocked
      and m.authenticated_execute_allowed
      and l.ledger_022_exists
    then 'OK'
    else 'FAIL'
  end as check_result
from measured m
cross join ledger l
order by m.signature;
