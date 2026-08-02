-- MawashiDZ — 022 Fail closed when privileged audit cannot be written
-- Removes the legacy undefined_function compatibility catches from the two
-- privileged mutation paths that were allowed to continue without an audit row.

begin;

do $$
declare
  v_live_server_major integer := current_setting('server_version_num')::integer / 10000;
begin
  if v_live_server_major <> 18 then
    raise exception
      '022 abort: PostgreSQL major % does not match isolated-tested major 18; rerun the rollback suite on the live major and update the reviewed gate first',
      v_live_server_major;
  end if;
  if to_regprocedure('public.mdz_audit_admin_action(uuid,text,text,uuid,text,jsonb)') is null then
    raise exception '022 abort: public.mdz_audit_admin_action is missing';
  end if;
  if to_regprocedure('public.review_registration_status(text,text,text)') is null then
    raise exception '022 abort: public.review_registration_status is missing';
  end if;
  if to_regprocedure('public.set_support_ticket_status(bigint,text)') is null then
    raise exception '022 abort: public.set_support_ticket_status is missing';
  end if;
  if to_regclass('public.mdz_schema_migrations') is null then
    raise exception '022 abort: public.mdz_schema_migrations is missing';
  end if;
end;
$$;

create or replace function public.review_registration_status(
  p_registration_id text,
  p_new_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  reg public.registrations%rowtype;
  caller_wilaya text;
  is_admin boolean := false;
  is_manager boolean := false;
  updated_profile_id uuid;
  profiles_updated int := 0;
  regs_updated int := 0;
  reason_clean text := nullif(btrim(coalesce(p_reason, '')), '');
  reg_id text;
  member_email text;
  notif_title text;
  notif_body text;
  mail_subject text;
  mail_body text;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_new_status not in ('approved', 'rejected', 'pending', 'suspended', 'active') then
    raise exception 'invalid status: %', p_new_status using errcode = '22023';
  end if;

  if p_new_status = 'rejected' and reason_clean is null then
    raise exception 'rejection reason required' using errcode = '22023';
  end if;

  reg_id := nullif(btrim(coalesce(p_registration_id, '')), '');
  if reg_id is null then
    raise exception 'registration_id required' using errcode = '22023';
  end if;

  select * into reg
  from public.registrations r
  where r.registration_id = reg_id
  order by r.created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;

  is_admin := public.mdz_is_platform_admin();
  is_manager := public.mdz_is_wilaya_manager();

  if not is_admin and not is_manager then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  if not is_admin and p_new_status not in ('approved', 'rejected') then
    raise exception 'managers may only approve or reject' using errcode = '42501';
  end if;

  if not is_admin then
    caller_wilaya := public.mdz_caller_wilaya();
    if caller_wilaya is null
       or nullif(btrim(reg.wilaya), '') is null
       or btrim(reg.wilaya) is distinct from btrim(caller_wilaya) then
      raise exception 'wilaya scope violation' using errcode = '42501';
    end if;
  end if;

  perform set_config('mdz.admin_profile_update', 'true', true);

  update public.profiles p
  set status = p_new_status
  where p.registration_id = reg_id;
  get diagnostics profiles_updated = row_count;

  select p.id, p.email into updated_profile_id, member_email
  from public.profiles p
  where p.registration_id = reg_id
  order by p.created_at desc nulls last
  limit 1;

  update public.registrations r
  set status = p_new_status,
      review_reason = case when p_new_status = 'rejected' then reason_clean else coalesce(reason_clean, r.review_reason) end,
      reviewed_at = now(),
      reviewed_by = caller_id
  where r.registration_id = reg_id;
  get diagnostics regs_updated = row_count;

  if regs_updated < 1 then
    raise exception 'registration update failed' using errcode = 'P0002';
  end if;

  -- No exception catch: an unavailable or failing writer aborts the mutation.
  perform public.mdz_audit_admin_action(
    caller_id,
    'registration.review',
    'registration',
    updated_profile_id,
    reg_id,
    jsonb_build_object(
      'status', p_new_status,
      'reason', reason_clean,
      'wilaya', reg.wilaya,
      'actor_rank', case when is_admin then 'admin' else 'wilaya_manager' end
    )
  );

  if updated_profile_id is not null then
    if p_new_status = 'approved' then
      notif_title := 'تمت الموافقة على طلب العضوية';
      notif_body := 'يمكنك الآن استخدام حسابك في مواشي DZ.';
      mail_subject := 'MawashiDZ — تمت الموافقة على عضويتك';
      mail_body := 'تمت الموافقة على طلب عضويتك. افتح حسابك: https://mawashidz.com/#account';
    elsif p_new_status = 'rejected' then
      notif_title := 'تم رفض طلب العضوية';
      notif_body := reason_clean;
      mail_subject := 'MawashiDZ — تحديث طلب العضوية';
      mail_body := 'تم رفض طلب عضويتك. السبب: ' || reason_clean || '. التفاصيل: https://mawashidz.com/#account';
    elsif p_new_status = 'suspended' then
      notif_title := 'تم تعليق الحساب';
      notif_body := coalesce(reason_clean, 'تواصل مع الدعم عبر تذكرة إن احتجت مساعدة.');
      mail_subject := 'MawashiDZ — تعليق الحساب';
      mail_body := 'تم تعليق حسابك. افتح حسابك أو تذكرة دعم: https://mawashidz.com/#account-support';
    else
      notif_title := 'تحديث حالة العضوية';
      notif_body := p_new_status;
      mail_subject := 'MawashiDZ — تحديث العضوية';
      mail_body := 'تم تحديث حالة عضويتك إلى: ' || p_new_status;
    end if;

    perform public.mdz_notify_user(
      updated_profile_id,
      'registration_' || p_new_status,
      notif_title,
      notif_body,
      jsonb_build_object('registration_id', reg_id, 'status', p_new_status, 'reason', reason_clean),
      case when p_new_status = 'rejected' then '#account-request' else '#account' end
    );

    if member_email is not null and btrim(member_email) <> '' then
      perform public.mdz_enqueue_email(
        member_email,
        updated_profile_id,
        'registration_' || p_new_status,
        mail_subject,
        mail_body,
        jsonb_build_object('registration_id', reg_id, 'status', p_new_status)
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'registration_id', reg_id,
    'status', p_new_status,
    'profile_id', updated_profile_id,
    'profiles_updated', profiles_updated,
    'registrations_updated', regs_updated,
    'wilaya', reg.wilaya
  );
end;
$$;

revoke all on function public.review_registration_status(text, text, text) from public;
revoke execute on function public.review_registration_status(text, text, text) from anon;

create or replace function public.set_support_ticket_status(
  p_ticket_id bigint,
  p_status text
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets%rowtype;
  result public.support_tickets;
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_status not in ('open', 'in_review', 'waiting_for_member', 'escalated', 'closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select * into t from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  if not (
    public.mdz_is_platform_admin()
    or (
      public.mdz_is_wilaya_manager()
      and t.wilaya is not null
      and t.wilaya = public.mdz_caller_wilaya()
    )
  ) then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  update public.support_tickets
  set status = p_status,
      updated_at = now(),
      archived_at = case when p_status = 'closed' then coalesce(archived_at, now()) else archived_at end
  where id = p_ticket_id
  returning * into result;

  perform public.mdz_notify_user(
    t.created_by,
    'ticket_status',
    'تحديث حالة تذكرة الدعم',
    p_status,
    jsonb_build_object('ticket_id', t.id, 'ticket_code', t.ticket_code, 'status', p_status),
    '#account-support'
  );

  -- No exception catch: an unavailable or failing writer aborts the mutation.
  perform public.mdz_audit_admin_action(
    uid,
    'ticket.status',
    'support_ticket',
    null,
    t.ticket_code,
    jsonb_build_object('ticket_id', t.id, 'status', p_status)
  );

  return result;
end;
$$;

revoke all on function public.set_support_ticket_status(bigint, text) from public;
revoke execute on function public.set_support_ticket_status(bigint, text) from anon;

-- CREATE OR REPLACE preserves ACLs. Remove every non-owner direct EXECUTE
-- grant first, including grants to roles unknown to this migration, then build
-- the exact allowlist from zero. CASCADE also removes delegated grants.
do $acl_normalize$
declare
  v_signature text;
  v_grantee_name text;
begin
  foreach v_signature in array array[
    'public.review_registration_status(text,text,text)',
    'public.set_support_ticket_status(bigint,text)'
  ]
  loop
    for v_grantee_name in
      select distinct pg_get_userbyid(a.grantee)::text
      from pg_proc p
      cross join lateral aclexplode(
        coalesce(p.proacl, acldefault('f', p.proowner))
      ) a
      where p.oid = to_regprocedure(v_signature)
        and a.privilege_type = 'EXECUTE'
        and a.grantee <> 0
        and a.grantee <> p.proowner
    loop
      execute format(
        'revoke execute on function %s from %I cascade',
        v_signature,
        v_grantee_name
      );
    end loop;
  end loop;
end;
$acl_normalize$;

grant execute on function public.review_registration_status(text, text, text)
  to authenticated, service_role;
grant execute on function public.set_support_ticket_status(bigint, text) to authenticated;

do $$
declare
  v_signature text;
  v_expected_source_sha256 text;
  v_expected_source_utf8_bytes integer;
  v_expected_direct_grantees text[];
  v_expected_arg_names text[];
  v_expected_default_count integer;
  v_expected_return_type text;
  v_definition text;
  v_actual_source_sha256 text;
  v_actual_source_utf8_bytes integer;
  v_owner_name text;
  v_language_name text;
  v_binary_reference_is_null boolean;
  v_sql_body_is_null boolean;
  v_kind "char";
  v_security_definer boolean;
  v_leakproof boolean;
  v_strict boolean;
  v_returns_set boolean;
  v_volatility "char";
  v_parallel "char";
  v_arg_names text[];
  v_default_count integer;
  v_return_type oid;
  v_runtime_config text[];
  v_actual_direct_grantees text[];
  v_unexpected_acl_grantors text[];
  v_unexpected_grantable_grantees text[];
  v_unexpected_overload_count integer;
begin
  for
    v_signature,
    v_expected_source_sha256,
    v_expected_source_utf8_bytes,
    v_expected_direct_grantees,
    v_expected_arg_names,
    v_expected_default_count,
    v_expected_return_type
  in
    select * from (values
      (
        'public.review_registration_status(text,text,text)',
        '315a74e268c4e0f7f593c27e69182bd1f08dc4ba039877cc5f9aceeac81f93d7',
        5626,
        array['authenticated','postgres','service_role']::text[],
        array['p_registration_id','p_new_status','p_reason']::text[],
        1,
        'jsonb'
      ),
      (
        'public.set_support_ticket_status(bigint,text)',
        '80002a92f653641b0f751ad76a63dfdafc2ed3026dea1fdcd5981164557c837d',
        1602,
        array['authenticated','postgres']::text[],
        array['p_ticket_id','p_status']::text[],
        0,
        'public.support_tickets'
      )
    ) as expected(
      signature,
      source_sha256,
      source_utf8_bytes,
      direct_grantees,
      arg_names,
      default_count,
      return_type
    )
  loop
    select
      pg_get_functiondef(p.oid),
      encode(sha256(convert_to(p.prosrc, 'UTF8')), 'hex'),
      octet_length(convert_to(p.prosrc, 'UTF8')),
      pg_get_userbyid(p.proowner),
      l.lanname,
      p.probin is null,
      p.prosqlbody is null,
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
      p.proconfig,
      coalesce(
        (
          select array_agg(grantee_name order by grantee_name)
          from (
            select distinct
              case when a.grantee = 0 then 'PUBLIC'
                   else pg_get_userbyid(a.grantee)::text end as grantee_name
            from aclexplode(
              coalesce(p.proacl, acldefault('f', p.proowner))
            ) a
            where a.privilege_type = 'EXECUTE'
          ) direct_acl
        ),
        array[]::text[]
      ),
      coalesce(
        (
          select array_agg(grantor_name order by grantor_name)
          from (
            select distinct pg_get_userbyid(a.grantor)::text as grantor_name
            from aclexplode(
              coalesce(p.proacl, acldefault('f', p.proowner))
            ) a
            where a.privilege_type = 'EXECUTE'
              and pg_get_userbyid(a.grantor) <> 'postgres'
          ) unexpected_grantors
        ),
        array[]::text[]
      ),
      coalesce(
        (
          select array_agg(grantee_name order by grantee_name)
          from (
            select distinct pg_get_userbyid(a.grantee)::text as grantee_name
            from aclexplode(
              coalesce(p.proacl, acldefault('f', p.proowner))
            ) a
            where a.privilege_type = 'EXECUTE'
              and a.is_grantable
              and a.grantee <> p.proowner
          ) unexpected_grantable
        ),
        array[]::text[]
      ),
      (
        select count(*)::integer
        from pg_proc extra
        join pg_namespace ns on ns.oid = extra.pronamespace
        where ns.nspname = 'public'
          and extra.proname = p.proname
          and extra.oid <> p.oid
      )
    into
      v_definition,
      v_actual_source_sha256,
      v_actual_source_utf8_bytes,
      v_owner_name,
      v_language_name,
      v_binary_reference_is_null,
      v_sql_body_is_null,
      v_kind,
      v_security_definer,
      v_leakproof,
      v_strict,
      v_returns_set,
      v_volatility,
      v_parallel,
      v_arg_names,
      v_default_count,
      v_return_type,
      v_runtime_config,
      v_actual_direct_grantees,
      v_unexpected_acl_grantors,
      v_unexpected_grantable_grantees,
      v_unexpected_overload_count
    from pg_proc p
    join pg_language l on l.oid = p.prolang
    where p.oid = to_regprocedure(v_signature);

    if position('mdz_audit_admin_action' in v_definition) = 0
       or v_definition ~* 'exception[[:space:]]+when'
       or v_actual_source_sha256 is distinct from v_expected_source_sha256
       or v_actual_source_utf8_bytes is distinct from v_expected_source_utf8_bytes
       or v_owner_name is distinct from 'postgres'
       or v_language_name is distinct from 'plpgsql'
       or v_binary_reference_is_null is distinct from true
       or v_sql_body_is_null is distinct from true
       or v_kind is distinct from 'f'
       or v_security_definer is distinct from true
       or v_leakproof is distinct from false
       or v_strict is distinct from false
       or v_returns_set is distinct from false
       or v_volatility is distinct from 'v'
       or v_parallel is distinct from 'u'
       or v_arg_names is distinct from v_expected_arg_names
       or v_default_count is distinct from v_expected_default_count
       or v_return_type is distinct from to_regtype(v_expected_return_type)
       or v_runtime_config is distinct from array['search_path=""']::text[]
       or v_actual_direct_grantees is distinct from v_expected_direct_grantees
       or v_unexpected_acl_grantors <> array[]::text[]
       or v_unexpected_grantable_grantees <> array[]::text[]
       or has_function_privilege('public', v_signature, 'EXECUTE')
       or has_function_privilege('anon', v_signature, 'EXECUTE')
       or not has_function_privilege('authenticated', v_signature, 'EXECUTE')
       or (
         v_signature = 'public.review_registration_status(text,text,text)'
         and not has_function_privilege('service_role', v_signature, 'EXECUTE')
       )
       or v_unexpected_overload_count <> 0 then
      raise exception '022 abort: function attestation failed: %', v_signature;
    end if;
  end loop;

  insert into public.mdz_schema_migrations (version, name, notes) values
    (
      '022',
      'fail_closed_admin_audit',
      'Privileged registration reviews and support-ticket status changes now roll back when the audit writer is missing or fails.'
    )
  on conflict (version) do update set
    name = excluded.name,
    notes = excluded.notes;
end;
$$;

commit;
