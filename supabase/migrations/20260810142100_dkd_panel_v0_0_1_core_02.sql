create or replace function public.dkd_business_register_dkd(
  dkd_param_business_name text,
  dkd_param_owner_full_name text default '',
  dkd_param_phone text default '',
  dkd_param_business_type text default 'İşletme',
  dkd_param_city text default '',
  dkd_param_district text default '',
  dkd_param_address_text text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_email_value text;
  dkd_business_row public.dkd_businesses%rowtype;
begin
  if dkd_user_id_value is null then raise exception 'dkd_auth_required'; end if;
  if char_length(trim(coalesce(dkd_param_business_name,''))) < 2 then raise exception 'dkd_business_name_required'; end if;
  select email into dkd_email_value from auth.users where id = dkd_user_id_value;

  insert into public.dkd_businesses(
    dkd_owner_user_id, dkd_business_name, dkd_owner_full_name, dkd_phone, dkd_email,
    dkd_business_type, dkd_city, dkd_district, dkd_address_text, dkd_is_active
  ) values (
    dkd_user_id_value,
    left(trim(dkd_param_business_name),120),
    left(trim(coalesce(dkd_param_owner_full_name,'')),120),
    left(trim(coalesce(dkd_param_phone,'')),40),
    lower(coalesce(dkd_email_value,'')),
    left(trim(coalesce(nullif(dkd_param_business_type,''),'İşletme')),80),
    left(trim(coalesce(dkd_param_city,'')),80),
    left(trim(coalesce(dkd_param_district,'')),80),
    left(trim(coalesce(dkd_param_address_text,'')),300),
    true
  )
  on conflict (dkd_owner_user_id) do update set
    dkd_business_name = excluded.dkd_business_name,
    dkd_owner_full_name = excluded.dkd_owner_full_name,
    dkd_phone = excluded.dkd_phone,
    dkd_email = excluded.dkd_email,
    dkd_business_type = excluded.dkd_business_type,
    dkd_city = excluded.dkd_city,
    dkd_district = excluded.dkd_district,
    dkd_address_text = excluded.dkd_address_text,
    dkd_is_active = true,
    dkd_updated_at = now()
  returning * into dkd_business_row;

  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_business_id',dkd_business_row.dkd_id,
    'dkd_business_name',dkd_business_row.dkd_business_name,
    'dkd_owner_full_name',dkd_business_row.dkd_owner_full_name,
    'dkd_email',dkd_business_row.dkd_email
  );
end;
$function$;

create or replace function public.dkd_business_profile_dkd()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_business_row public.dkd_businesses%rowtype;
begin
  if dkd_user_id_value is null then raise exception 'dkd_auth_required'; end if;
  select * into dkd_business_row
  from public.dkd_businesses
  where dkd_owner_user_id = dkd_user_id_value and dkd_is_active is true
  order by dkd_created_at asc limit 1;
  if not found then return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','business_missing'); end if;
  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_business_id',dkd_business_row.dkd_id,
    'dkd_business_name',dkd_business_row.dkd_business_name,
    'dkd_owner_full_name',dkd_business_row.dkd_owner_full_name,
    'dkd_phone',dkd_business_row.dkd_phone,
    'dkd_email',dkd_business_row.dkd_email,
    'dkd_business_type',dkd_business_row.dkd_business_type,
    'dkd_city',dkd_business_row.dkd_city,
    'dkd_district',dkd_business_row.dkd_district,
    'dkd_address_text',dkd_business_row.dkd_address_text,
    'dkd_created_at',dkd_business_row.dkd_created_at
  );
end;
$function$;

create or replace function public.dkd_panel_mask_email_dkd(dkd_param_email text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when position('@' in coalesce(dkd_param_email,'')) <= 1 then ''
    else left(split_part(dkd_param_email,'@',1),1) || '***@' || split_part(dkd_param_email,'@',2)
  end;
$function$;

create or replace function public.dkd_business_courier_search_dkd(dkd_param_query text)
returns table(
  dkd_courier_user_id uuid,
  dkd_display_name text,
  dkd_plate_no text,
  dkd_email_masked text,
  dkd_city text,
  dkd_courier_status text,
  dkd_is_online boolean,
  dkd_already_linked boolean,
  dkd_tc_exact_match boolean
)
language plpgsql
stable
security definer
set search_path to 'public','auth','extensions'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_query_value text := trim(coalesce(dkd_param_query,''));
  dkd_query_digits_value text := regexp_replace(trim(coalesce(dkd_param_query,'')),'[^0-9]','','g');
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if char_length(dkd_query_value) < 3 and char_length(dkd_query_digits_value) <> 11 then
    raise exception 'dkd_search_min_3_chars';
  end if;

  return query
  select
    dkd_profile_value.user_id,
    coalesce(
      nullif(trim(dkd_auth_value.raw_user_meta_data->>'dkd_full_name'),''),
      nullif(trim(dkd_auth_value.raw_user_meta_data->>'full_name'),''),
      nullif(trim(dkd_profile_value.nickname),''),
      'Kurye'
    ) as dkd_display_name,
    coalesce(
      nullif(trim(dkd_auth_value.raw_user_meta_data->>'motorcycle_plate'),''),
      nullif(trim(dkd_location_value.plate_no),''),
      ''
    ) as dkd_plate_no,
    public.dkd_panel_mask_email_dkd(dkd_auth_value.email) as dkd_email_masked,
    coalesce(nullif(dkd_profile_value.dkd_city,''), nullif(dkd_profile_value.courier_city,''), '') as dkd_city,
    dkd_profile_value.courier_status,
    coalesce(dkd_profile_value.dkd_courier_online,false),
    exists(
      select 1 from public.dkd_business_couriers dkd_link_value
      where dkd_link_value.dkd_courier_user_id = dkd_profile_value.user_id
        and dkd_link_value.dkd_is_active is true
    ),
    case when char_length(dkd_query_digits_value)=11 then exists(
      select 1
      from public.dkd_courier_identity_lookup dkd_identity_value
      where dkd_identity_value.dkd_courier_user_id = dkd_profile_value.user_id
        and extensions.crypt(dkd_query_digits_value, dkd_identity_value.dkd_national_id_bcrypt) = dkd_identity_value.dkd_national_id_bcrypt
    ) else false end as dkd_tc_exact_match
  from public.dkd_profiles dkd_profile_value
  join auth.users dkd_auth_value on dkd_auth_value.id = dkd_profile_value.user_id
  left join public.dkd_courier_live_locations dkd_location_value on dkd_location_value.courier_user_id = dkd_profile_value.user_id
  where dkd_profile_value.courier_status = 'approved'
    and (
      lower(coalesce(dkd_auth_value.raw_user_meta_data->>'dkd_full_name','')) like '%' || lower(dkd_query_value) || '%'
      or lower(coalesce(dkd_auth_value.raw_user_meta_data->>'full_name','')) like '%' || lower(dkd_query_value) || '%'
      or lower(coalesce(dkd_profile_value.nickname,'')) like '%' || lower(dkd_query_value) || '%'
      or lower(coalesce(dkd_auth_value.raw_user_meta_data->>'motorcycle_plate','')) like '%' || lower(dkd_query_value) || '%'
      or lower(coalesce(dkd_location_value.plate_no,'')) like '%' || lower(dkd_query_value) || '%'
      or lower(coalesce(dkd_auth_value.email,'')) = lower(dkd_query_value)
      or (char_length(dkd_query_digits_value)=11 and exists(
        select 1 from public.dkd_courier_identity_lookup dkd_identity_value
        where dkd_identity_value.dkd_courier_user_id = dkd_profile_value.user_id
          and extensions.crypt(dkd_query_digits_value, dkd_identity_value.dkd_national_id_bcrypt) = dkd_identity_value.dkd_national_id_bcrypt
      ))
    )
  order by
    case when lower(coalesce(dkd_auth_value.email,'')) = lower(dkd_query_value) then 0 else 1 end,
    coalesce(dkd_profile_value.dkd_courier_online,false) desc,
    dkd_display_name asc
  limit 20;
end;
$function$;

create or replace function public.dkd_business_courier_link_dkd(
  dkd_param_courier_user_id uuid,
  dkd_param_package_fee_tl numeric default 0,
  dkd_param_hourly_rate_tl numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_owner_user_id_value uuid := auth.uid();
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_membership_row public.dkd_business_couriers%rowtype;
begin
  if dkd_owner_user_id_value is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_param_courier_user_id is null then raise exception 'dkd_courier_required'; end if;
  if coalesce(dkd_param_package_fee_tl,0) < 0 or coalesce(dkd_param_hourly_rate_tl,0) < 0 then raise exception 'dkd_rate_invalid'; end if;
  if not exists(select 1 from public.dkd_profiles where user_id=dkd_param_courier_user_id and courier_status='approved') then
    raise exception 'dkd_courier_not_approved';
  end if;
  if exists(
    select 1 from public.dkd_business_couriers
    where dkd_courier_user_id=dkd_param_courier_user_id and dkd_is_active is true
  ) then
    raise exception 'dkd_courier_already_linked';
  end if;

  insert into public.dkd_business_couriers(
    dkd_business_id, dkd_courier_user_id, dkd_created_by_user_id,
    dkd_package_fee_tl, dkd_hourly_rate_tl, dkd_is_active, dkd_linked_at
  ) values (
    dkd_business_id_value, dkd_param_courier_user_id, dkd_owner_user_id_value,
    round(coalesce(dkd_param_package_fee_tl,0),2), round(coalesce(dkd_param_hourly_rate_tl,0),2), true, now()
  ) returning * into dkd_membership_row;

  insert into public.dkd_business_courier_rate_history(
    dkd_membership_id, dkd_business_id, dkd_courier_user_id,
    dkd_package_fee_tl, dkd_hourly_rate_tl, dkd_effective_from, dkd_created_by_user_id
  ) values (
    dkd_membership_row.dkd_id, dkd_business_id_value, dkd_param_courier_user_id,
    dkd_membership_row.dkd_package_fee_tl, dkd_membership_row.dkd_hourly_rate_tl,
    dkd_membership_row.dkd_linked_at, dkd_owner_user_id_value
  );

  update public.dkd_courier_jobs
     set dkd_business_id = dkd_business_id_value
   where assigned_user_id = dkd_param_courier_user_id
     and dkd_business_id is null
     and is_active is true
     and lower(coalesce(status,'')) not in ('completed','delivered','cancelled','canceled');

  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_membership_id',dkd_membership_row.dkd_id,
    'dkd_business_id',dkd_business_id_value,
    'dkd_courier_user_id',dkd_param_courier_user_id,
    'dkd_package_fee_tl',dkd_membership_row.dkd_package_fee_tl,
    'dkd_hourly_rate_tl',dkd_membership_row.dkd_hourly_rate_tl
  );
end;
$function$;
