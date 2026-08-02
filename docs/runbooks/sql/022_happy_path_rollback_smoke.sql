-- مواشي ديزاد — بوابة 022 الحية: مسار ناجح يُفحَص ثم يُرجَع بالكامل.
--
-- التشغيل: جلسة مالك قاعدة البيانات فقط، بعد نجاح 022.verify.sql.
-- الأثر الدائم المقصود: لا صفوف أعمال. تُرجع كتلة الاستثناء تعديل التذكرة
-- والإشعار وصف التدقيق. قد تتقدم متتاليات الهوية وتترك فجوات رقمية؛ المتتاليات
-- غير معاملية في PostgreSQL، ولذلك نسجل هذا صراحة ولا نخفيه.

begin;

drop table if exists pg_temp.mdz_022_happy_path_evidence;
create temp table mdz_022_happy_path_evidence (
  captured_at_utc text not null,
  transaction_started_at_utc text not null,
  database_name text not null,
  current_user_name text not null,
  session_user_name text not null,
  role_setting text,
  server_version_num integer not null,
  server_encoding text not null,
  actor_id uuid not null,
  actor_roles text[] not null,
  ticket_id bigint not null,
  ticket_code text not null,
  attempted_status text not null,
  audit_rows_during integer not null,
  audit_actor_id uuid,
  audit_action text,
  audit_target_type text,
  audit_target_label text,
  audit_created_at timestamptz,
  audit_payload jsonb,
  notification_rows_during integer not null,
  rollback_signal_sqlstate text,
  rollback_signal_message text,
  ticket_unchanged_after_rollback boolean not null,
  audit_event_absent_after_rollback boolean not null,
  notification_event_absent_after_rollback boolean not null,
  sequence_gap_expected boolean not null,
  check_result text not null
) on commit preserve rows;

do $smoke$
declare
  v_captured_at timestamptz := clock_timestamp();
  v_transaction_started_at timestamptz := transaction_timestamp();
  v_current_user text := current_user;
  v_session_user text := session_user;
  v_role_setting text := current_setting('role', true);
  v_actor_id uuid;
  v_actor_roles text[];
  v_ticket_id bigint;
  v_ticket_code text;
  v_ticket_status text;
  v_ticket_updated_at timestamptz;
  v_ticket_archived_at timestamptz;
  v_audit_max_before bigint;
  v_notification_max_before bigint;
  v_audit_rows_during integer := 0;
  v_notification_rows_during integer := 0;
  v_audit_actor_id uuid;
  v_audit_action text;
  v_audit_target_type text;
  v_audit_target_label text;
  v_audit_created_at timestamptz;
  v_audit_payload jsonb;
  v_rollback_sqlstate text;
  v_rollback_message text;
  v_ticket_unchanged boolean := false;
  v_audit_event_absent boolean := false;
  v_notification_event_absent boolean := false;
  v_check_result text;
begin
  if current_user <> 'postgres' then
    raise exception '022 smoke abort: current_user must be postgres';
  end if;

  select
    ur.user_id,
    array_agg(distinct ur.role order by ur.role)
  into v_actor_id, v_actor_roles
  from public.user_roles ur
  where ur.role in ('admin', 'founder', 'super_admin')
  group by ur.user_id
  order by ur.user_id
  limit 1;

  if v_actor_id is null then
    raise exception '022 smoke abort: no platform administrator exists';
  end if;

  -- نقفل صفاً واحداً حتى لا تختلط نتيجة الاختبار بقرار متزامن على التذكرة نفسها.
  select t.id, t.ticket_code, t.status, t.updated_at, t.archived_at
  into v_ticket_id, v_ticket_code, v_ticket_status, v_ticket_updated_at, v_ticket_archived_at
  from public.support_tickets t
  order by t.created_at, t.id
  limit 1
  for update;

  if v_ticket_id is null then
    raise exception '022 smoke abort: no support ticket exists';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);

  select coalesce(max(id), 0)
  into v_audit_max_before
  from public.admin_audit_log;

  select coalesce(max(id), 0)
  into v_notification_max_before
  from public.notifications;

  begin
    -- إعادة الحالة نفسها تمر بالمسار الناجح كله دون تغيير دلالي مقصود للعضو.
    perform public.set_support_ticket_status(v_ticket_id, v_ticket_status);

    select count(*)::integer
    into v_audit_rows_during
    from public.admin_audit_log a
    where a.id > v_audit_max_before
      and a.actor_id = v_actor_id
      and a.action = 'ticket.status'
      and a.target_type = 'support_ticket'
      and a.target_label = v_ticket_code;

    select
      a.actor_id,
      a.action,
      a.target_type,
      a.target_label,
      a.created_at,
      a.payload
    into
      v_audit_actor_id,
      v_audit_action,
      v_audit_target_type,
      v_audit_target_label,
      v_audit_created_at,
      v_audit_payload
    from public.admin_audit_log a
    where a.id > v_audit_max_before
      and a.actor_id = v_actor_id
      and a.action = 'ticket.status'
      and a.target_type = 'support_ticket'
      and a.target_label = v_ticket_code
    order by a.id
    limit 1;

    select count(*)::integer
    into v_notification_rows_during
    from public.notifications n
    where n.id > v_notification_max_before
      and n.recipient_id = (
        select t.created_by from public.support_tickets t where t.id = v_ticket_id
      )
      and n.event_type = 'ticket_status'
      and n.payload @> jsonb_build_object(
        'ticket_id', v_ticket_id,
        'ticket_code', v_ticket_code,
        'status', v_ticket_status
      );

    if v_audit_rows_during <> 1
       or v_audit_actor_id is distinct from v_actor_id
       or v_audit_action is distinct from 'ticket.status'
       or v_audit_target_type is distinct from 'support_ticket'
       or v_audit_target_label is distinct from v_ticket_code
       or v_audit_created_at is null
       or v_audit_created_at is distinct from v_transaction_started_at
       or v_audit_payload is null
       or v_notification_rows_during <> 1 then
      raise exception '022 smoke assertion failed before rollback';
    end if;

    -- هذا الاستثناء مقصود: يعيد كل DML داخل الكتلة الفرعية فقط.
    raise exception using
      errcode = 'P0001',
      message = 'MDZ_022_SMOKE_ROLLBACK';
  exception when others then
    get stacked diagnostics
      v_rollback_sqlstate = returned_sqlstate,
      v_rollback_message = message_text;
  end;

  select
    t.status is not distinct from v_ticket_status
    and t.updated_at is not distinct from v_ticket_updated_at
    and t.archived_at is not distinct from v_ticket_archived_at
  into v_ticket_unchanged
  from public.support_tickets t
  where t.id = v_ticket_id;

  select not exists (
    select 1
    from public.admin_audit_log a
    where a.id > v_audit_max_before
      and a.actor_id = v_actor_id
      and a.action = 'ticket.status'
      and a.target_type = 'support_ticket'
      and a.target_label = v_ticket_code
  )
  into v_audit_event_absent;

  select not exists (
    select 1
    from public.notifications n
    where n.id > v_notification_max_before
      and n.event_type = 'ticket_status'
      and n.payload @> jsonb_build_object(
        'ticket_id', v_ticket_id,
        'ticket_code', v_ticket_code,
        'status', v_ticket_status
      )
  )
  into v_notification_event_absent;

  v_check_result := case when
    v_rollback_sqlstate = 'P0001'
    and v_rollback_message = 'MDZ_022_SMOKE_ROLLBACK'
    and v_audit_rows_during = 1
    and v_notification_rows_during = 1
    and v_audit_actor_id = v_actor_id
    and v_audit_action = 'ticket.status'
    and v_audit_target_type = 'support_ticket'
    and v_audit_target_label = v_ticket_code
    and v_audit_created_at = v_transaction_started_at
    and v_ticket_unchanged
    and v_audit_event_absent
    and v_notification_event_absent
  then 'OK_ROLLBACK_SMOKE' else 'FAIL' end;

  insert into pg_temp.mdz_022_happy_path_evidence values (
    to_char(v_captured_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    to_char(v_transaction_started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    current_database(),
    v_current_user,
    v_session_user,
    v_role_setting,
    current_setting('server_version_num')::integer,
    current_setting('server_encoding'),
    v_actor_id,
    v_actor_roles,
    v_ticket_id,
    v_ticket_code,
    v_ticket_status,
    v_audit_rows_during,
    v_audit_actor_id,
    v_audit_action,
    v_audit_target_type,
    v_audit_target_label,
    v_audit_created_at,
    v_audit_payload,
    v_notification_rows_during,
    v_rollback_sqlstate,
    v_rollback_message,
    v_ticket_unchanged,
    v_audit_event_absent,
    v_notification_event_absent,
    true,
    v_check_result
  );
end;
$smoke$;

commit;

select *
from pg_temp.mdz_022_happy_path_evidence;
