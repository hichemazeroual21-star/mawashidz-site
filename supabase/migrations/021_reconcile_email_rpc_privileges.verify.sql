-- Read-only verification for migration 021.

with target_functions(signature) as (
  values
    ('public.mdz_claim_email_outbox(integer,text)'),
    ('public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)'),
    ('public.mdz_mark_email_outbox(bigint,text,text,text)'),
    ('public.mdz_notify_user(uuid,text,text,text,jsonb,text)')
), measured as (
  select
    signature,
    to_regprocedure(signature) is not null as function_exists,
    case when to_regprocedure(signature) is null then null
         else has_function_privilege('public', signature, 'EXECUTE') end as public_execute,
    case when to_regprocedure(signature) is null then null
         else has_function_privilege('anon', signature, 'EXECUTE') end as anon_execute,
    case when to_regprocedure(signature) is null then null
         else has_function_privilege('authenticated', signature, 'EXECUTE') end as authenticated_execute,
    case when to_regprocedure(signature) is null then null
         else has_function_privilege('service_role', signature, 'EXECUTE') end as service_role_execute
  from target_functions
), summary as (
  select
    count(*) = 4
      and bool_and(function_exists)
      and not bool_or(coalesce(public_execute, true))
      and not bool_or(coalesce(anon_execute, true))
      and not bool_or(coalesce(authenticated_execute, true))
      and bool_and(coalesce(service_role_execute, false)) as privileges_ok
  from measured
), ledger as (
  select case
    when to_regclass('public.mdz_schema_migrations') is null then false
    else exists (
      select 1
      from public.mdz_schema_migrations
      where version = '021'
        and name = 'reconcile_email_rpc_privileges'
    )
  end as ledger_021_exists
)
select
  m.signature,
  m.function_exists,
  m.public_execute,
  m.anon_execute,
  m.authenticated_execute,
  m.service_role_execute,
  l.ledger_021_exists,
  case when s.privileges_ok and l.ledger_021_exists then 'OK' else 'FAIL' end as check_result
from measured m
cross join summary s
cross join ledger l
order by m.signature;
