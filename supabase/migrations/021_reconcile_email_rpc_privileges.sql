-- MawashiDZ — 021 Reconcile email RPC privileges
-- Forward-only repository closure for the production-only 016 containment.
-- Keeps the email runtime available to service_role while browser roles stay blocked.

begin;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.mdz_claim_email_outbox(integer,text)',
    'public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)',
    'public.mdz_mark_email_outbox(bigint,text,text,text)',
    'public.mdz_notify_user(uuid,text,text,text,jsonb,text)'
  ]
  loop
    if to_regprocedure(v_signature) is null then
      raise exception '021 abort: required email RPC is missing: %', v_signature;
    end if;
  end loop;
end;
$$;

revoke all on function public.mdz_claim_email_outbox(integer, text)
  from public;
revoke execute on function public.mdz_claim_email_outbox(integer, text)
  from anon, authenticated;
grant execute on function public.mdz_claim_email_outbox(integer, text)
  to service_role;

revoke all on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb)
  from public;
revoke execute on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb)
  from anon, authenticated;
grant execute on function public.mdz_enqueue_email(text, uuid, text, text, text, jsonb)
  to service_role;

revoke all on function public.mdz_mark_email_outbox(bigint, text, text, text)
  from public;
revoke execute on function public.mdz_mark_email_outbox(bigint, text, text, text)
  from anon, authenticated;
grant execute on function public.mdz_mark_email_outbox(bigint, text, text, text)
  to service_role;

revoke all on function public.mdz_notify_user(uuid, text, text, text, jsonb, text)
  from public;
revoke execute on function public.mdz_notify_user(uuid, text, text, text, jsonb, text)
  from anon, authenticated;
grant execute on function public.mdz_notify_user(uuid, text, text, text, jsonb, text)
  to service_role;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.mdz_claim_email_outbox(integer,text)',
    'public.mdz_enqueue_email(text,uuid,text,text,text,jsonb)',
    'public.mdz_mark_email_outbox(bigint,text,text,text)',
    'public.mdz_notify_user(uuid,text,text,text,jsonb,text)'
  ]
  loop
    if has_function_privilege('public', v_signature, 'EXECUTE')
       or has_function_privilege('anon', v_signature, 'EXECUTE')
       or has_function_privilege('authenticated', v_signature, 'EXECUTE')
       or not has_function_privilege('service_role', v_signature, 'EXECUTE')
    then
      raise exception '021 abort: email RPC privilege post-condition failed: %', v_signature;
    end if;
  end loop;

  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      (
        '021',
        'reconcile_email_rpc_privileges',
        'Forward-only repository closure for production email RPC containment; browser roles blocked and service_role retained.'
      )
    on conflict (version) do update set
      name = excluded.name,
      notes = excluded.notes;
  end if;
end;
$$;

commit;
