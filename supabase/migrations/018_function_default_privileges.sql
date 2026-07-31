-- ============================================================
-- MawashiDZ — 018 Function default privileges (forward-looking)
-- After: 017_harden_reachable_security_definers.sql
-- Scope: ROOT PACKAGE — FUNCTION DEFAULT PRIVILEGES only.
--
-- FORWARD-ONLY (read carefully):
--   • ALTER DEFAULT PRIVILEGES affects functions CREATED AFTER this
--     command for the named role.
--   • It does NOT retroactively modify privileges on existing functions.
--   • Existing sensitive / reachable SECURITY DEFINER surfaces were
--     handled separately by Migration 017 (FROZEN / historical).
--   • This migration MUST NOT modify any 017 artifact.
--
-- CRITICAL PostgreSQL RULE (root-cause of false 018 acceptance):
--   REVOKE via ALTER DEFAULT PRIVILEGES **must be GLOBAL**
--   (no IN SCHEMA). Per PostgreSQL docs, per-schema default privileges
--   can only ADD grants; `… IN SCHEMA public REVOKE EXECUTE …` is a
--   no-op unless undoing a matching per-schema GRANT. That no-op left
--   hardwired PUBLIC EXECUTE intact (NULL proacl → acldefault).
--
-- TARGET ROLE:
--   Apply global defaults for ROLE postgres (project function owner).
--   Also apply global defaults for the *current* session role (no FOR
--   ROLE clause) so SQL Editor / apply sessions that are not postgres
--   still stop inheriting PUBLIC EXECUTE on newly created functions.
--   Do NOT require `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`
--   as a hard dependency (membership / permission denied abort risk).
--   Any remaining other-role defaults = residual platform risk.
--
-- EXPLICIT PRIVILEGES (policy for future migrations):
--   Default privileges are defense-in-depth only. Every new/modified
--   function must still REVOKE ALL FROM PUBLIC, REVOKE EXECUTE FROM
--   anon (unless deliberately justified), and GRANT EXECUTE only to
--   the exact caller contract — using exact signatures.
--
-- Transaction: single BEGIN/COMMIT. Idempotent REVOKE defaults.
-- Ledger: register version 018 in mdz_schema_migrations when present.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) Preflight — roles
-- ------------------------------------------------------------
do $$
declare
  v_postgres_exists boolean;
  v_supabase_admin_exists boolean;
  v_admin_acl text;
  v_admin_nsp text;
begin
  select exists(select 1 from pg_roles where rolname = 'postgres')
    into v_postgres_exists;
  if not v_postgres_exists then
    raise exception
      '018 abort: role postgres not found — cannot set project default privileges';
  end if;

  raise notice
    '018 apply context: session_user=% current_user=%',
    session_user, current_user;

  select exists(select 1 from pg_roles where rolname = 'supabase_admin')
    into v_supabase_admin_exists;

  if v_supabase_admin_exists then
    select d.defaclacl::text,
           case when d.defaclnamespace = 0 then '<global>'
                else coalesce(n.nspname, d.defaclnamespace::text)
           end
      into v_admin_acl, v_admin_nsp
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    where d.defaclobjtype = 'f'
      and pg_get_userbyid(d.defaclrole) = 'supabase_admin'
    order by case when d.defaclnamespace = 0 then 0 else 1 end
    limit 1;

    raise notice
      '018 residual risk (not a migration failure): supabase_admin function default ACL nsp=% acl=%',
      coalesce(v_admin_nsp, '<none>'),
      coalesce(v_admin_acl, '<none>');
  else
    raise notice
      '018: role supabase_admin not present — no residual supabase_admin default ACL to report';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 1) GLOBAL default REVOKE for ROLE postgres
--    (NOT "IN SCHEMA public" — that form cannot remove PUBLIC EXECUTE)
-- ------------------------------------------------------------
alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres
  revoke execute on functions from anon;

alter default privileges for role postgres
  revoke execute on functions from authenticated;

-- ------------------------------------------------------------
-- 1b) GLOBAL default REVOKE for the applying session role
--     (no FOR ROLE — alters current_user's own defaults only).
--     Idempotent / duplicate when current_user = postgres.
-- ------------------------------------------------------------
alter default privileges
  revoke execute on functions from public;

alter default privileges
  revoke execute on functions from anon;

alter default privileges
  revoke execute on functions from authenticated;

-- Explicitly do NOT hard-depend on:
--   alter default privileges for role supabase_admin ...
-- Remaining other-role defaults = residual platform risk.

-- ------------------------------------------------------------
-- 2) Fail-closed post-condition for ROLE postgres GLOBAL defaults
--    Missing global row is NOT success (hardwired PUBLIC EXECUTE remains).
-- ------------------------------------------------------------
do $$
declare
  v_acl aclitem[];
  v_item aclitem;
  v_grantee text;
  v_priv text;
  v_bad text[] := array[]::text[];
begin
  select d.defaclacl
    into v_acl
  from pg_default_acl d
  where d.defaclobjtype = 'f'
    and d.defaclnamespace = 0  -- GLOBAL only
    and pg_get_userbyid(d.defaclrole) = 'postgres';

  if v_acl is null then
    raise exception
      '018 abort: no GLOBAL pg_default_acl row for postgres/functions after REVOKE — hardwired PUBLIC EXECUTE would still apply';
  end if;

  foreach v_item in array v_acl
  loop
    v_grantee := split_part(v_item::text, '=', 1);
    v_priv := split_part(split_part(v_item::text, '=', 2), '/', 1);

    if (v_grantee = '' or v_grantee in ('public', 'anon', 'authenticated'))
       and position('X' in v_priv) > 0
    then
      v_bad := v_bad || case when v_grantee = '' then 'PUBLIC' else v_grantee end;
    end if;
  end loop;

  if cardinality(v_bad) > 0 then
    raise exception
      '018 abort: postgres GLOBAL function defaults still grant EXECUTE to: % (acl=%)',
      array_to_string(v_bad, ', '),
      v_acl::text;
  end if;

  raise notice
    '018 OK: postgres GLOBAL function defaults acl=% (no PUBLIC/anon/authenticated EXECUTE)',
    v_acl::text;
end;
$$;

-- ------------------------------------------------------------
-- 3) In-migration probe (same transaction) — creator = current_user
--    Must not inherit EXECUTE for PUBLIC / anon / authenticated.
--    Dropped before commit (no leftover object).
-- ------------------------------------------------------------
do $$
declare
  v_public boolean;
  v_anon boolean;
  v_auth boolean;
  v_owner text;
  v_proacl_null boolean;
  v_proacl text;
begin
  execute $c$
    create function public.mdz018_mig_probe()
    returns text
    language sql
    stable
    as $f$ select 'probe'::text $f$
  $c$;

  select pg_get_userbyid(p.proowner),
         p.proacl is null,
         p.proacl::text
    into v_owner, v_proacl_null, v_proacl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'mdz018_mig_probe'
    and pg_get_function_identity_arguments(p.oid) = '';

  -- Measure DEFAULTS only (before any explicit REVOKE).
  v_public := has_function_privilege(
    'public', 'public.mdz018_mig_probe()', 'EXECUTE'
  );
  v_anon := has_function_privilege(
    'anon', 'public.mdz018_mig_probe()', 'EXECUTE'
  );
  v_auth := has_function_privilege(
    'authenticated', 'public.mdz018_mig_probe()', 'EXECUTE'
  );

  raise notice
    '018 probe(defaults): session_user=% current_user=% owner=% proacl_null=% proacl=% public_x=% anon_x=% auth_x=%',
    session_user, current_user, v_owner, v_proacl_null, coalesce(v_proacl, '<null>'),
    v_public, v_anon, v_auth;

  if v_public or v_anon or v_auth then
    execute 'drop function public.mdz018_mig_probe()';
    raise exception
      '018 abort: probe still grants client EXECUTE under defaults alone (public=% anon=% authenticated=%). creator current_user=% owner=%. GLOBAL defaults not effective for this session role.',
      v_public, v_anon, v_auth, current_user, v_owner;
  end if;

  -- Explicit REVOKE after successful defaults proof (package policy + CI signature match).
  execute $c$
    revoke all on function public.mdz018_mig_probe() from public;
    revoke execute on function public.mdz018_mig_probe() from anon;
    revoke execute on function public.mdz018_mig_probe() from authenticated
  $c$;

  execute 'drop function public.mdz018_mig_probe()';
  raise notice '018 OK: in-migration probe has no PUBLIC/anon/authenticated EXECUTE under GLOBAL defaults';
end;
$$;

-- ------------------------------------------------------------
-- 4) Ledger (idempotent upsert; table may exist from 015+)
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      (
        '018',
        '018_function_default_privileges.sql',
        'GLOBAL ALTER DEFAULT PRIVILEGES FOR ROLE postgres (+ current session): REVOKE EXECUTE on FUNCTIONS from PUBLIC, anon, authenticated. Forward-only. IN SCHEMA revoke is a PG no-op for removing PUBLIC EXECUTE — not used. supabase_admin FOR ROLE not required. Migration 017 untouched.'
      )
    on conflict (version) do update
    set name = excluded.name,
        notes = excluded.notes,
        applied_at = now();
  end if;
end;
$$;

commit;

-- ============================================================
-- Notes:
-- * Existing functions unchanged (forward-only).
-- * Explicit post-CREATE REVOKE/GRANT remains mandatory (CI).
-- * Supporting aclexplode(coalesce(proacl, acldefault(...))) is misleading
--   when proacl IS NULL (always shows hardwired PUBLIC EXECUTE). Prefer
--   has_function_privilege + non-null proacl after correct GLOBAL defaults.
-- ============================================================
