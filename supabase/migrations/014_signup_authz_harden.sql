-- ============================================================
-- MawashiDZ — 014 Signup / authz harden (pre-launch P0)
-- Scope: checklist item 1 only (privilege escalation from signup metadata)
-- ADR-003 Option A: operational elevation via user_roles only.
-- Idempotent · no data deletion.
-- ============================================================

-- Membership-type whitelist for profiles.role (never elevation aliases).
create or replace function public.mdz_membership_role(raw text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(trim(coalesce(raw, '')))
    when 'breeder' then 'breeder'
    when 'vet' then 'vet'
    when 'feed' then 'feed'
    when 'buyer' then 'buyer'
    when 'manager' then 'manager'
    when 'ambassador' then 'ambassador'
    when 'partner' then 'partner'
    else 'buyer'
  end;
$$;

revoke all on function public.mdz_membership_role(text) from public;
grant execute on function public.mdz_membership_role(text) to authenticated, service_role;

-- ADR-003 A: drop profiles.role bridge — elevation only from user_roles.
create or replace function public.mdz_is_wilaya_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role in ('wilaya_manager', 'manager', 'wilaya_mgr')
  );
$$;

revoke all on function public.mdz_is_wilaya_manager() from public;
grant execute on function public.mdz_is_wilaya_manager() to authenticated, service_role;

-- Signup: allocate member_id using whitelisted membership role only.
create or replace function public.assign_member_id_before_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  assigned_member_id text;
begin
  user_role := public.mdz_membership_role(new.raw_user_meta_data ->> 'role');
  assigned_member_id := public.allocate_member_id(user_role);
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('member_id', assigned_member_id, 'role', user_role);
  -- Never honor client-supplied status in metadata (force pending at source).
  new.raw_user_meta_data := new.raw_user_meta_data - 'status';
  return new;
end;
$$;

-- Signup: whitelist role; always pending; ignore metadata status on insert/conflict.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  assigned_member_id text;
begin
  user_role := public.mdz_membership_role(new.raw_user_meta_data ->> 'role');
  assigned_member_id := nullif(trim(new.raw_user_meta_data ->> 'member_id'), '');
  if assigned_member_id is null or assigned_member_id !~ '^MDZ-[A-Z]-[0-9]{6}$' then
    assigned_member_id := public.allocate_member_id(user_role);
  end if;
  insert into public.profiles (
    id, member_id, registration_id, full_name, first_name, last_name,
    phone, email, role, wilaya, daira, commune, birth_date,
    invite_code, invited_by, status
  ) values (
    new.id, assigned_member_id,
    nullif(trim(new.raw_user_meta_data ->> 'registration_id'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    public.normalize_algerian_phone(new.raw_user_meta_data ->> 'phone'),
    new.email, user_role,
    nullif(trim(new.raw_user_meta_data ->> 'wilaya'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'daira'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'commune'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'birth_date'), '')::date,
    nullif(trim(new.raw_user_meta_data ->> 'invite_code'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'invited_by'), ''),
    'pending'
  )
  on conflict (id) do update set
    member_id = coalesce(public.profiles.member_id, excluded.member_id),
    registration_id = coalesce(public.profiles.registration_id, excluded.registration_id),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    email = coalesce(public.profiles.email, excluded.email),
    role = coalesce(public.profiles.role, excluded.role),
    wilaya = coalesce(public.profiles.wilaya, excluded.wilaya),
    daira = coalesce(public.profiles.daira, excluded.daira),
    commune = coalesce(public.profiles.commune, excluded.commune),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    invite_code = coalesce(public.profiles.invite_code, excluded.invite_code),
    invited_by = coalesce(public.profiles.invited_by, excluded.invited_by),
    -- Do not adopt excluded.status from signup metadata (always keep existing or pending).
    status = coalesce(public.profiles.status, 'pending');
  return new;
end;
$$;

drop trigger if exists on_auth_user_assign_member_id on auth.users;
create trigger on_auth_user_assign_member_id
  before insert on auth.users
  for each row execute function public.assign_member_id_before_signup();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
