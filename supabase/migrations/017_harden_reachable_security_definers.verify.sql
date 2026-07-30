-- ============================================================
-- MawashiDZ — Migration 017 VERIFICATION (read-only)
-- Run in Supabase SQL Editor (post-apply acceptance; also useful as
-- pre-apply baseline — expect FAIL on privilege/absence checks before 017).
--
-- Acceptance (post-017): every check_result = 'OK'.
--
-- Privilege measurement (mandatory):
--   has_function_privilege('public'|anon|authenticated, fn, 'EXECUTE')
-- aclexplode is SUPPORTING documentation only (section 2).
--
-- Do NOT call has_function_privilege on intentionally dropped objects.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Retained functions — existence / DEFINER / owner / EXECUTE
--     + search_path only for functions 017 intentionally modifies
--
-- Owner check: Migration 017 does NOT modify function ownership.
-- Paste owner_name values from the mandatory Go/No-Go pre-apply
-- capture into captured_owners below, keyed by function_signature.
-- Do NOT hardcode a role name such as postgres.
-- Post-apply owner must equal the captured pre-apply owner.
--
-- Invariants:
--   * target_functions is the complete independent retained set.
--   * captured_owners is paste-only; it does NOT define the target set.
--   * LEFT JOIN captured_owners (never INNER) so missing paste rows
--     still emit a visible FAIL.
--   * Signature key is the full canonical function signature on both
--     sides (not proname alone).
-- ------------------------------------------------------------
with target_functions as (
  -- Complete known retained-function set covered by Migration 017.
  -- Defined independently of captured_owners.
  select *
  from (
    values
      -- containment: public/anon/authenticated EXECUTE must all be FALSE
      (
        'public.handle_new_user()',
        'containment',
        false,
        false,
        null::text
      ),
      (
        'public.mdz_registrations_assign_registration_id()',
        'containment',
        false,
        false,
        null::text
      ),
      (
        'public.get_wilaya_manager_email(text)',
        'containment',
        false,
        true,
        -- PostgreSQL stores ALTER ... SET search_path = '' as proconfig
        -- element search_path="" ; substring after 'search_path=' is "".
        '""'
      ),
      (
        'public.admin_set_profile_status(uuid, text)',
        'containment',
        false,
        true,
        null::text
      ),
      -- helpers: anon FALSE; authenticated TRUE; public FALSE (via REVOKE PUBLIC)
      (
        'public.mdz_is_platform_admin()',
        'helper',
        true,
        true,
        null::text
      ),
      (
        'public.mdz_is_wilaya_manager()',
        'helper',
        true,
        true,
        null::text
      ),
      (
        'public.mdz_caller_wilaya()',
        'helper',
        true,
        true,
        null::text
      ),
      -- unchanged login oracle (017 must not alter grants; do not assert service_role)
      (
        'public.resolve_login_identifier(text)',
        'unchanged_login',
        true,
        false,
        null::text
      ),
      -- replacement path for legacy admin — present/untouched; no service_role assert
      (
        'public.review_registration_status(text, text, text)',
        'untouched',
        true,
        false,
        null::text
      )
  ) as tf(
    function_signature,
    kind,
    expect_authenticated,
    expect_service_role,
    expect_search_path
  )
),
captured_owners as (
  -- REQUIRED for post-apply acceptance: replace each
  -- '<<PASTE_FROM_CAPTURE>>' with the captured owner_name string.
  -- Keys MUST equal target_functions.function_signature exactly.
  -- Missing / empty / placeholder / unmatched signature => FAIL.
  select *
  from (
    values
      ('public.handle_new_user()', '<<PASTE_FROM_CAPTURE>>'),
      (
        'public.mdz_registrations_assign_registration_id()',
        '<<PASTE_FROM_CAPTURE>>'
      ),
      ('public.get_wilaya_manager_email(text)', '<<PASTE_FROM_CAPTURE>>'),
      (
        'public.admin_set_profile_status(uuid, text)',
        '<<PASTE_FROM_CAPTURE>>'
      ),
      ('public.mdz_is_platform_admin()', '<<PASTE_FROM_CAPTURE>>'),
      ('public.mdz_is_wilaya_manager()', '<<PASTE_FROM_CAPTURE>>'),
      ('public.mdz_caller_wilaya()', '<<PASTE_FROM_CAPTURE>>'),
      ('public.resolve_login_identifier(text)', '<<PASTE_FROM_CAPTURE>>'),
      (
        'public.review_registration_status(text, text, text)',
        '<<PASTE_FROM_CAPTURE>>'
      )
  ) as c(function_signature, captured_owner_name)
)
select
  tf.function_signature,
  p.oid::regprocedure::text as live_regprocedure_text,
  tf.kind,
  (p.oid is not null) as function_exists,
  coalesce(p.prosecdef, false) as is_security_definer,
  pg_get_userbyid(p.proowner) as owner_name,
  co.captured_owner_name,
  p.proconfig as proconfig,
  (
    select substring(cfg from length('search_path=') + 1)
    from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
    where cfg like 'search_path=%'
    limit 1
  ) as observed_search_path,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
  case
    when p.oid is null
      then 'FAIL function missing'
    when not p.prosecdef
      then 'FAIL not SECURITY DEFINER'
    when co.function_signature is null
      or co.captured_owner_name is null
      or co.captured_owner_name = ''
      or co.captured_owner_name = '<<PASTE_FROM_CAPTURE>>'
      then 'FAIL captured owner missing (paste from Go/No-Go capture)'
    when pg_get_userbyid(p.proowner) is distinct from co.captured_owner_name
      then 'FAIL owner changed unexpectedly'
    when tf.expect_search_path is not null
      and coalesce(
        (
          select substring(cfg from length('search_path=') + 1)
          from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
          where cfg like 'search_path=%'
          limit 1
        ),
        '<unset>'
      ) is distinct from tf.expect_search_path
      then 'FAIL unexpected search_path/proconfig (017 intentionally modified this function)'
    when tf.kind in ('containment', 'helper')
      and has_function_privilege('public', p.oid, 'EXECUTE')
      then 'FAIL public still has EXECUTE'
    when tf.kind in ('containment', 'helper')
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      then 'FAIL anon still has EXECUTE'
    when tf.kind = 'containment'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      then 'FAIL authenticated still has EXECUTE'
    when tf.kind = 'helper'
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
      then 'FAIL helper missing authenticated EXECUTE'
    when tf.expect_service_role
      and not has_function_privilege('service_role', p.oid, 'EXECUTE')
      then 'FAIL missing service_role EXECUTE'
    when tf.kind = 'unchanged_login'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      then 'FAIL resolve_login_identifier anon EXECUTE changed (017 must leave it unchanged)'
    else 'OK'
  end as check_result
from target_functions tf
left join pg_proc p
  on p.oid = to_regprocedure(tf.function_signature)
left join captured_owners co
  on co.function_signature = tf.function_signature
order by tf.kind, tf.function_signature;

-- ------------------------------------------------------------
-- 2) Supporting ACL documentation (aclexplode) — NOT sole acceptance
-- ------------------------------------------------------------
select
  p.oid::regprocedure::text as full_signature,
  pg_get_userbyid(a.grantee) as grantee_name,
  a.grantee as grantee_oid,
  a.privilege_type,
  a.is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner)))
  as a(grantor, grantee, privilege_type, is_grantable)
where n.nspname = 'public'
  and a.privilege_type = 'EXECUTE'
  and p.oid in (
    to_regprocedure('public.handle_new_user()'),
    to_regprocedure('public.mdz_registrations_assign_registration_id()'),
    to_regprocedure('public.get_wilaya_manager_email(text)'),
    to_regprocedure('public.admin_set_profile_status(uuid, text)'),
    to_regprocedure('public.mdz_is_platform_admin()'),
    to_regprocedure('public.mdz_is_wilaya_manager()'),
    to_regprocedure('public.mdz_caller_wilaya()'),
    to_regprocedure('public.resolve_login_identifier(text)')
  )
order by 1, 3;

-- ------------------------------------------------------------
-- 3) Dropped objects — absence only (explicit OK / FAIL per object)
--     Do NOT call has_function_privilege on these.
-- ------------------------------------------------------------
select
  'dropped_function:public.process_contact_message()' as check_name,
  case
    when to_regprocedure('public.process_contact_message()') is null then 'OK'
    else 'FAIL'
  end as check_result;

select
  'dropped_function:public.send_welcome_email()' as check_name,
  case
    when to_regprocedure('public.send_welcome_email()') is null then 'OK'
    else 'FAIL'
  end as check_result;

select
  'dropped_trigger:public.contact_messages.on_contact_message_insert' as check_name,
  case
    when not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where not t.tgisinternal
        and ns.nspname = 'public'
        and c.relname = 'contact_messages'
        and t.tgname = 'on_contact_message_insert'
    ) then 'OK'
    else 'FAIL'
  end as check_result;

select
  'dropped_trigger:public.registrations.on_registration_created' as check_name,
  case
    when not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where not t.tgisinternal
        and ns.nspname = 'public'
        and c.relname = 'registrations'
        and t.tgname = 'on_registration_created'
    ) then 'OK'
    else 'FAIL'
  end as check_result;

-- ------------------------------------------------------------
-- 4) Required triggers — exist / enabled / table / function signature
-- ------------------------------------------------------------
select
  expected.tgname,
  expected.table_schema,
  expected.table_name,
  expected.function_sig,
  hit.tgenabled as observed_tgenabled,
  hit.observed_function_sig,
  case
    when hit.tg_oid is null
      then 'FAIL'
    when hit.observed_function_sig is distinct from expected.function_sig
      then 'FAIL'
    when hit.tgenabled not in ('O', 'A')
      then 'FAIL'
    else 'OK'
  end as check_result,
  case
    when hit.tg_oid is null
      then 'required trigger absent'
    when hit.observed_function_sig is distinct from expected.function_sig
      then 'trigger bound to wrong function signature'
    when hit.tgenabled not in ('O', 'A')
      then 'trigger disabled'
    else 'required trigger OK'
  end as detail
from (
  values
    ('on_auth_user_created', 'auth', 'users', 'handle_new_user()'),
    (
      'mdz_registrations_assign_registration_id',
      'public',
      'registrations',
      'mdz_registrations_assign_registration_id()'
    )
) as expected(tgname, table_schema, table_name, function_sig)
left join lateral (
  select
    t.oid as tg_oid,
    t.tgenabled,
    p.oid::regprocedure::text as observed_function_sig
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal
    and t.tgname = expected.tgname
    and ns.nspname = expected.table_schema
    and c.relname = expected.table_name
) hit on true
order by expected.tgname;
