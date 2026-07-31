-- ============================================================
-- MawashiDZ — 018 Function default privileges (forward-looking)
-- After: 017_harden_reachable_security_definers.sql
-- Scope: ROOT PACKAGE — FUNCTION DEFAULT PRIVILEGES only.
--
-- FORWARD-ONLY (read carefully):
--   • ALTER DEFAULT PRIVILEGES affects functions CREATED AFTER this
--     command for the named role in schema public.
--   • It does NOT retroactively modify privileges on existing functions.
--   • Existing sensitive / reachable SECURITY DEFINER surfaces were
--     handled separately by Migration 017 (FROZEN / historical).
--   • This migration MUST NOT modify any 017 artifact.
--
-- TARGET ROLE:
--   Apply defaults for ROLE postgres only — the role confirmed to
--   create/own project functions in the live catalog.
--   Do NOT require ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin:
--   the migration runner may lack membership and that would abort the
--   whole migration with permission denied. supabase_admin default ACL
--   is inspected and documented as residual platform risk only.
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
-- 0) Preflight — roles and current default ACL (fail-closed only
--    for conditions under project control)
-- ------------------------------------------------------------
do $$
declare
  v_postgres_exists boolean;
  v_supabase_admin_exists boolean;
  v_admin_acl text;
begin
  select exists(select 1 from pg_roles where rolname = 'postgres')
    into v_postgres_exists;
  if not v_postgres_exists then
    raise exception
      '018 abort: role postgres not found — cannot set project default privileges';
  end if;

  select exists(select 1 from pg_roles where rolname = 'supabase_admin')
    into v_supabase_admin_exists;

  if v_supabase_admin_exists then
    select d.defaclacl::text
      into v_admin_acl
    from pg_default_acl d
    left join pg_namespace n on n.oid = d.defaclnamespace
    where d.defaclobjtype = 'f'
      and pg_get_userbyid(d.defaclrole) = 'supabase_admin'
      and (n.nspname = 'public' or d.defaclnamespace = 0)
    order by n.nspname nulls last
    limit 1;

    raise notice
      '018 residual risk (not a migration failure): supabase_admin function default ACL present=% acl=%',
      (v_admin_acl is not null),
      coalesce(v_admin_acl, '<none>');
  else
    raise notice
      '018: role supabase_admin not present — no residual supabase_admin default ACL to report';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 1) Forward-looking defaults for ROLE postgres in schema public
--    Repeat-safe: re-REVOKE is a no-op if already revoked.
-- ------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from authenticated;

-- Explicitly do NOT:
--   alter default privileges for role supabase_admin ...
-- That remains residual platform risk (documented in verify + package notes).

-- ------------------------------------------------------------
-- 2) Post-condition under project control — postgres defaults
--    must not grant EXECUTE to PUBLIC / anon / authenticated.
--    Fail closed if postgres still grants those after ALTER.
-- ------------------------------------------------------------
do $$
declare
  v_acl aclitem[];
  v_item aclitem;
  v_grantee text;
  v_priv text;
begin
  select d.defaclacl
    into v_acl
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  where d.defaclobjtype = 'f'
    and n.nspname = 'public'
    and pg_get_userbyid(d.defaclrole) = 'postgres'
  limit 1;

  -- No row / empty ACL is acceptable (means no default grants recorded).
  if v_acl is null then
    raise notice
      '018 OK: no pg_default_acl row for postgres/public/functions (or empty) after REVOKE';
    return;
  end if;

  foreach v_item in array v_acl
  loop
    -- aclitem text form: grantee=privs/grantor
    v_grantee := split_part(v_item::text, '=', 1);
    v_priv := split_part(split_part(v_item::text, '=', 2), '/', 1);

    -- Empty grantee name means PUBLIC in PostgreSQL ACL text
    if (v_grantee = '' or v_grantee in ('public', 'anon', 'authenticated'))
       and position('X' in v_priv) > 0
    then
      raise exception
        '018 abort: postgres default function ACL still grants EXECUTE to % (aclitem=%)',
        case when v_grantee = '' then 'PUBLIC' else v_grantee end,
        v_item::text;
    end if;
  end loop;

  raise notice '018 OK: postgres/public function defaults no longer grant EXECUTE to PUBLIC/anon/authenticated';
end;
$$;

-- ------------------------------------------------------------
-- 3) Ledger (idempotent upsert; table may exist from 015+)
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.mdz_schema_migrations') is not null then
    insert into public.mdz_schema_migrations (version, name, notes) values
      (
        '018',
        '018_function_default_privileges.sql',
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public: REVOKE EXECUTE on FUNCTIONS from PUBLIC, anon, authenticated. Forward-only; not retroactive. supabase_admin defaults = residual risk only. Migration 017 untouched.'
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
-- * Existing functions unchanged by this migration (forward-only).
-- * New SECURITY DEFINER functions should SET search_path = '' and
--   schema-qualify refs; CI enforces that for new/modified migrations
--   only (legacy grandfathered).
-- * Residual: supabase_admin default ACL may still grant EXECUTE to
--   clients for objects created as that role — outside package control.
-- ============================================================
