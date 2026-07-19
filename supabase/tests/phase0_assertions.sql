-- Shared Phase 0 assertions (run inside a migrated database)
do $$
declare
  v_id text;
  v_id2 text;
  v_email text;
  v_uid uuid;
  v_uid2 uuid;
  v_member text;
  v_member_spoof_attempt text := 'MDZ-F-999999';
  v_status text;
  v_role text;
  v_count int;
  v_dupes int;
begin
  -- 1) allocate_member_id basic uniqueness + format
  v_id := public.allocate_member_id('breeder');
  v_id2 := public.allocate_member_id('breeder');
  if v_id !~ '^MDZ-F-[0-9]{6}$' then
    raise exception 'allocate_member_id format failed: %', v_id;
  end if;
  if v_id = v_id2 then
    raise exception 'allocate_member_id returned duplicate: %', v_id;
  end if;
  if substring(v_id2 from 7)::int <> substring(v_id from 7)::int + 1 then
    raise exception 'allocate_member_id not sequential: % -> %', v_id, v_id2;
  end if;

  -- 2) Canonical frontend role prefixes + alias defense-in-depth
  if public.mdz_role_prefix('vet') <> 'V' then raise exception 'vet prefix'; end if;
  if public.mdz_role_prefix('feed') <> 'S' then raise exception 'feed prefix'; end if;
  if public.mdz_role_prefix('manager') <> 'W' then raise exception 'manager prefix'; end if;
  if public.mdz_role_prefix('veterinarian') <> 'V' then raise exception 'veterinarian alias'; end if;
  if public.mdz_role_prefix('feed_seller') <> 'S' then raise exception 'feed_seller alias'; end if;
  if public.mdz_role_prefix('feed_trader') <> 'S' then raise exception 'feed_trader alias'; end if;
  if public.mdz_role_prefix('wilaya_manager') <> 'W' then raise exception 'wilaya_manager alias'; end if;
  if public.mdz_normalize_role('veterinarian') <> 'vet' then raise exception 'normalize veterinarian'; end if;
  if public.mdz_normalize_role('feed_seller') <> 'feed' then raise exception 'normalize feed_seller'; end if;
  if public.mdz_normalize_role('wilaya_manager') <> 'manager' then raise exception 'normalize wilaya_manager'; end if;

  -- 3) handle_new_user creates profile + server-side member_id
  v_uid := gen_random_uuid();
  insert into auth.users (id, email, raw_user_meta_data)
  values (
    v_uid,
    'newuser@example.com',
    jsonb_build_object(
      'role', 'breeder',
      'full_name', 'اختبار جديد',
      'first_name', 'اختبار',
      'last_name', 'جديد',
      'phone', '+213561234567',
      'wilaya', 'الجزائر',
      'registration_id', 'MDZ-REG-TEST-1'
    )
  );

  select member_id, email, status, role
    into v_member, v_email, v_status, v_role
  from public.profiles where id = v_uid;

  if v_member is null or v_member !~ '^MDZ-F-[0-9]{6}$' then
    raise exception 'handle_new_user did not allocate member_id: %', v_member;
  end if;
  if v_email <> 'newuser@example.com' then
    raise exception 'handle_new_user email mismatch: %', v_email;
  end if;
  if v_status <> 'pending' then
    raise exception 'new profile status must be pending, got: %', v_status;
  end if;
  if v_role <> 'breeder' then
    raise exception 'role not normalized/stored as breeder: %', v_role;
  end if;

  -- 3b) Client member_id + status must be ignored
  v_uid2 := gen_random_uuid();
  insert into auth.users (id, email, raw_user_meta_data)
  values (
    v_uid2,
    'spoof@example.com',
    jsonb_build_object(
      'role', 'vet',
      'member_id', v_member_spoof_attempt,
      'status', 'approved',
      'full_name', 'محاولة تزوير',
      'phone', '+213671234567'
    )
  );

  select member_id, status, role
    into v_member, v_status, v_role
  from public.profiles where id = v_uid2;

  if v_member = v_member_spoof_attempt then
    raise exception 'client member_id was trusted (must be ignored)';
  end if;
  if v_member !~ '^MDZ-V-[0-9]{6}$' then
    raise exception 'server member_id for vet expected, got: %', v_member;
  end if;
  if v_status <> 'pending' then
    raise exception 'client status was trusted (must be pending), got: %', v_status;
  end if;
  if v_role <> 'vet' then
    raise exception 'vet role expected, got: %', v_role;
  end if;

  -- 4) resolve_login_identifier by member_id and phone
  select member_id into v_member from public.profiles where id = v_uid;
  if public.resolve_login_identifier(v_member) <> 'newuser@example.com' then
    raise exception 'resolve by member_id failed';
  end if;
  if public.resolve_login_identifier('+213561234567') <> 'newuser@example.com' then
    raise exception 'resolve by phone failed';
  end if;
  if public.resolve_login_identifier('0561234567') <> 'newuser@example.com' then
    raise exception 'resolve by local phone failed';
  end if;

  -- 5) Legacy row preserved AND backfilled with member_id (existing fixture)
  select count(*) into v_count
  from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';
  if v_count = 1 then
    if not exists (
      select 1 from public.profiles
      where id = '11111111-1111-1111-1111-111111111111'
        and email = 'legacy@example.com'
        and full_name = 'مستخدم قديم'
        and member_id ~ '^MDZ-[A-Z]-[0-9]{6}$'
    ) then
      raise exception 'legacy profile missing data or member_id backfill';
    end if;
  end if;

  -- 5b) No profile may remain without member_id after Phase 0
  select count(*) into v_count
  from public.profiles
  where member_id is null or btrim(member_id) = '';
  if v_count > 0 then
    raise exception 'profiles still missing member_id after backfill: %', v_count;
  end if;

  -- 6) No duplicate member_ids
  select count(*) into v_dupes from (
    select member_id from public.profiles
    where member_id is not null
    group by member_id having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise exception 'duplicate member_id detected';
  end if;

  -- 7) Sensitive column protection
  begin
    update public.profiles
    set member_id = 'MDZ-F-999999'
    where id = v_uid;
    raise exception 'member_id mutation should have been blocked';
  exception
    when others then
      if sqlerrm not like '%immutable%' then
        raise;
      end if;
  end;

  raise notice 'PHASE0_ASSERTIONS_OK';
end $$;
