-- Shared Phase 0 assertions (run inside a migrated database)
do $$
declare
  v_id text;
  v_id2 text;
  v_email text;
  v_uid uuid;
  v_member text;
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

  -- 2) Role prefixes
  if public.allocate_member_id('vet') not like 'MDZ-V-%' then
    raise exception 'vet prefix failed';
  end if;
  if public.allocate_member_id('feed') not like 'MDZ-S-%' then
    raise exception 'feed prefix failed';
  end if;

  -- 3) handle_new_user creates profile + member_id
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

  select member_id, email into v_member, v_email
  from public.profiles where id = v_uid;

  if v_member is null or v_member !~ '^MDZ-F-[0-9]{6}$' then
    raise exception 'handle_new_user did not allocate member_id: %', v_member;
  end if;
  if v_email <> 'newuser@example.com' then
    raise exception 'handle_new_user email mismatch: %', v_email;
  end if;

  -- 4) resolve_login_identifier by member_id and phone
  if public.resolve_login_identifier(v_member) <> 'newuser@example.com' then
    raise exception 'resolve by member_id failed';
  end if;
  if public.resolve_login_identifier('+213561234567') <> 'newuser@example.com' then
    raise exception 'resolve by phone failed';
  end if;
  if public.resolve_login_identifier('0561234567') <> 'newuser@example.com' then
    raise exception 'resolve by local phone failed';
  end if;

  -- 5) Legacy row preserved (existing DB fixture only — skip if absent)
  select count(*) into v_count
  from public.profiles
  where id = '11111111-1111-1111-1111-111111111111';
  if v_count = 1 then
    -- must still exist with original email
    if not exists (
      select 1 from public.profiles
      where id = '11111111-1111-1111-1111-111111111111'
        and email = 'legacy@example.com'
        and full_name = 'مستخدم قديم'
    ) then
      raise exception 'legacy profile data was altered or lost';
    end if;
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
