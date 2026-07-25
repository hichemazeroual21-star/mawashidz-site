-- ============================================================
-- ADR-003 backfill — 02 Apply (WRITES — run only after discovery + GATE)
-- Idempotent. Does not touch admin/founder/super_admin rows.
-- Does not modify profiles.role.
-- ============================================================

begin;

-- سجل دفعات العمليات (للتراجع الآمن)
create table if not exists public.mdz_ops_backfill_log (
  id bigint generated always as identity primary key,
  batch_id text not null,
  user_id uuid not null,
  role_granted text not null,
  user_roles_id bigint null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists mdz_ops_backfill_log_batch_idx
  on public.mdz_ops_backfill_log (batch_id);

-- حارس: لا تتابع إن لم يوجد أي elevation منصة
do $$
declare
  n int;
begin
  select count(*)::int into n
  from public.user_roles
  where role in ('admin', 'founder', 'super_admin');
  if n < 1 then
    raise exception 'ABORT: no platform admin/founder/super_admin in user_roles — refuse backfill'
      using errcode = 'P0001';
  end if;
end $$;

-- دفعة جديدة
create temporary table mdz_adr003_candidates on commit drop as
select
  p.id as user_id,
  'wilaya_manager'::text as role_granted
from public.profiles p
where lower(btrim(coalesce(p.role, ''))) in ('manager', 'wilaya_manager', 'wilaya_mgr')
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.id
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  );

-- معاينة داخل المعاملة
select count(*)::int as will_insert from mdz_adr003_candidates;

-- معرف الدفعة (ثابت لهذه الجلسة — انسخه للتراجع)
create temporary table mdz_adr003_batch_meta on commit drop as
select ('adr003-wilaya-' || to_char(now() at time zone 'utc', 'YYYYMMDD"T"HH24MISS')) as batch_id;

select batch_id from mdz_adr003_batch_meta;

-- إدراج آمن
with ins as (
  insert into public.user_roles (user_id, role)
  select c.user_id, c.role_granted
  from mdz_adr003_candidates c
  on conflict (user_id, role) do nothing
  returning id, user_id, role
)
insert into public.mdz_ops_backfill_log (batch_id, user_id, role_granted, user_roles_id, note)
select
  (select batch_id from mdz_adr003_batch_meta),
  i.user_id,
  i.role,
  i.id,
  'ADR-003 profiles.role bridge → user_roles wilaya_manager'
from ins;

-- نتيجة الدفعة
select batch_id, count(*)::int as rows_logged
from public.mdz_ops_backfill_log
where batch_id = (select batch_id from mdz_adr003_batch_meta)
group by 1;

commit;

-- إن فشلت أي خطوة: ROLLBACK تلقائي عند خطأ في DO/exception؛
-- إن فتحت المعاملة يدوياً وفحصت ثم ندمت: نفّذ ROLLBACK بدل COMMIT.
