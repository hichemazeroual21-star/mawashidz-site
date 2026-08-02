-- مواشي ديزاد — بوابة 022 الحية: عضو عادي لا يرى صف تدقيق موجوداً.
--
-- يُنشئ صف حارس داخل معاملة فرعية، يقرأ الجدول بدور authenticated، ثم يرمي
-- إشارة رجوع مقصودة. لا يبقى صف أعمال، لكن متتالية admin_audit_log قد تتقدم
-- وتترك فجوة رقمية لأن متتاليات PostgreSQL غير معاملية.

begin;

drop table if exists pg_temp.mdz_022_rls_evidence;
create temp table mdz_022_rls_evidence (
  captured_at_utc text not null,
  database_name text not null,
  current_user_name text not null,
  session_user_name text not null,
  role_setting text,
  server_version_num integer not null,
  server_encoding text not null,
  subject_sha256 text not null,
  sentinel_label_sha256 text not null,
  platform_admin_result boolean not null,
  table_rls_enabled boolean not null,
  admin_read_policy_count integer not null,
  permissive_select_policy_count integer not null,
  authenticated_select_granted boolean not null,
  total_rows_with_sentinel bigint not null,
  visible_audit_rows bigint not null,
  visible_sentinel_rows bigint not null,
  sentinel_absent_after_rollback boolean not null,
  rollback_signal_sqlstate text,
  rollback_signal_message text,
  sequence_gap_expected boolean not null,
  check_result text not null
) on commit preserve rows;

do $rls_smoke$
declare
  v_captured_at timestamptz := clock_timestamp();
  v_subject uuid;
  v_sentinel_label text;
  v_subject_sha256 text;
  v_sentinel_label_sha256 text;
  v_current_user_name text;
  v_session_user_name text;
  v_role_setting text;
  v_platform_admin boolean;
  v_rls_enabled boolean;
  v_admin_read_policy_count integer;
  v_permissive_select_policy_count integer;
  v_authenticated_select_granted boolean;
  v_total_rows_with_sentinel bigint := 0;
  v_visible_audit_rows bigint := -1;
  v_visible_sentinel_rows bigint := -1;
  v_sentinel_absent boolean := false;
  v_rollback_sqlstate text;
  v_rollback_message text;
  v_check_result text;
begin
  if current_user <> 'postgres' then
    raise exception '022 RLS smoke abort: current_user must be postgres';
  end if;

  select u.id
  into v_subject
  from auth.users u
  where not exists (
    select 1 from public.user_roles ur where ur.user_id = u.id
  )
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
      and lower(coalesce(p.role, '')) in (
        'admin', 'founder', 'super_admin',
        'manager', 'wilaya_manager', 'wilaya_mgr'
      )
  )
  order by u.created_at, u.id
  limit 1;

  if v_subject is null then
    raise exception '022 RLS smoke abort: no ordinary authenticated user exists';
  end if;

  v_sentinel_label := format(
    'MDZ_022_RLS_SENTINEL_%s_%s',
    txid_current(),
    floor(extract(epoch from clock_timestamp()) * 1000000)::bigint
  );
  v_subject_sha256 := encode(sha256(convert_to(v_subject::text, 'UTF8')), 'hex');
  v_sentinel_label_sha256 := encode(sha256(convert_to(v_sentinel_label, 'UTF8')), 'hex');

  select c.relrowsecurity
  into v_rls_enabled
  from pg_catalog.pg_class c
  where c.oid = 'public.admin_audit_log'::regclass;

  select count(*)::integer
  into v_admin_read_policy_count
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'admin_audit_log'
    and p.policyname = 'admin_audit: admin read'
    and p.cmd = 'SELECT'
    and 'authenticated' = any(p.roles);

  -- أي سياسة SELECT متساهلة إضافية قد تجمع بصيغة OR وتفتح القراءة.
  select count(*)::integer
  into v_permissive_select_policy_count
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'admin_audit_log'
    and p.cmd in ('SELECT', 'ALL')
    and p.permissive = 'PERMISSIVE';

  begin
    insert into public.admin_audit_log (
      actor_id, action, target_type, target_id, target_label, payload
    ) values (
      v_subject,
      'security.rls_probe',
      'admin_audit_log',
      null,
      v_sentinel_label,
      jsonb_build_object('probe', true)
    );

    select count(*)
    into v_total_rows_with_sentinel
    from public.admin_audit_log;

    perform set_config('request.jwt.claim.sub', v_subject::text, true);
    perform set_config('role', 'authenticated', true);

    v_current_user_name := current_user;
    v_session_user_name := session_user;
    v_role_setting := current_setting('role', true);
    v_platform_admin := public.mdz_is_platform_admin();
    v_authenticated_select_granted := has_table_privilege(
      current_user,
      'public.admin_audit_log',
      'SELECT'
    );

    select count(*)
    into v_visible_audit_rows
    from public.admin_audit_log;

    select count(*)
    into v_visible_sentinel_rows
    from public.admin_audit_log a
    where a.target_label = v_sentinel_label
      and a.action = 'security.rls_probe';

    if v_current_user_name <> 'authenticated'
       or v_platform_admin
       or v_visible_sentinel_rows <> 0 then
      raise exception '022 RLS smoke assertion failed before rollback';
    end if;

    perform set_config('role', 'none', true);
    raise exception using
      errcode = 'P0001',
      message = 'MDZ_022_RLS_SMOKE_ROLLBACK';
  exception when others then
    get stacked diagnostics
      v_rollback_sqlstate = returned_sqlstate,
      v_rollback_message = message_text;
  end;

  -- رجوع المعاملة الفرعية يعيد role وJWT ويحذف صف الحارس.
  if current_user <> 'postgres' then
    perform set_config('role', 'none', true);
  end if;

  select not exists (
    select 1
    from public.admin_audit_log a
    where a.target_label = v_sentinel_label
      and a.action = 'security.rls_probe'
  )
  into v_sentinel_absent;

  v_check_result := case when
    v_rollback_sqlstate = 'P0001'
    and v_rollback_message = 'MDZ_022_RLS_SMOKE_ROLLBACK'
    and v_current_user_name = 'authenticated'
    and v_session_user_name = 'postgres'
    and v_role_setting = 'authenticated'
    and current_setting('server_encoding') = 'UTF8'
    and not v_platform_admin
    and v_rls_enabled
    and v_admin_read_policy_count = 1
    and v_permissive_select_policy_count = 1
    and v_authenticated_select_granted
    and v_total_rows_with_sentinel >= 1
    and v_visible_audit_rows = 0
    and v_visible_sentinel_rows = 0
    and v_sentinel_absent
  then 'OK_RLS_SENTINEL_HIDDEN' else 'FAIL' end;

  insert into pg_temp.mdz_022_rls_evidence values (
    to_char(v_captured_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    current_database(),
    v_current_user_name,
    v_session_user_name,
    v_role_setting,
    current_setting('server_version_num')::integer,
    current_setting('server_encoding'),
    v_subject_sha256,
    v_sentinel_label_sha256,
    v_platform_admin,
    v_rls_enabled,
    v_admin_read_policy_count,
    v_permissive_select_policy_count,
    v_authenticated_select_granted,
    v_total_rows_with_sentinel,
    v_visible_audit_rows,
    v_visible_sentinel_rows,
    v_sentinel_absent,
    v_rollback_sqlstate,
    v_rollback_message,
    true,
    v_check_result
  );
end;
$rls_smoke$;

commit;

select *
from pg_temp.mdz_022_rls_evidence;
