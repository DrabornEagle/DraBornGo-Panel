-- DraBornGo Panel v0.0.2 / DraBornGo v0.0.17
-- Business-scoped delivery jobs must remain open in the linked-courier shared pool
-- until a courier explicitly presses Kabul Et. Legacy automatic offers remain only
-- for generic jobs where dkd_business_id is null.

create or replace function public.dkd_courier_online_set_dkd(
  dkd_param_online boolean,
  dkd_param_country text default 'Türkiye',
  dkd_param_city text default 'Ankara',
  dkd_param_region text default '',
  dkd_param_live_lat numeric default null,
  dkd_param_live_lng numeric default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_next_job_id_value bigint := null;
  dkd_active_delivery_job_id_value bigint := null;
  dkd_existing_offer_job_id_value bigint := null;
  dkd_safe_country_value text := coalesce(nullif(trim(dkd_param_country),''),'Türkiye');
  dkd_safe_city_value text := coalesce(nullif(trim(dkd_param_city),''),'Ankara');
  dkd_safe_region_value text := coalesce(nullif(trim(dkd_param_region),''),'');
  dkd_membership_value public.dkd_business_couriers%rowtype;
  dkd_has_membership_value boolean := false;
  dkd_used_seconds_value bigint := 0;
begin
  if dkd_user_id_value is null then return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','auth_required'); end if;
  insert into public.dkd_profiles(user_id) values(dkd_user_id_value) on conflict(user_id) do nothing;

  select * into dkd_membership_value
  from public.dkd_business_couriers
  where dkd_courier_user_id=dkd_user_id_value and dkd_is_active is true
  order by dkd_linked_at desc limit 1;
  dkd_has_membership_value := found;

  if dkd_has_membership_value and dkd_membership_value.dkd_owner_status_locked is true then
    perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value);
    update public.dkd_profiles set dkd_courier_online=false,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value;
    return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','online_status_locked','dkd_online_value',false,'dkd_status_locked_value',true,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours);
  end if;

  if dkd_has_membership_value and dkd_param_online is true then
    dkd_used_seconds_value := public.dkd_courier_daily_online_seconds_dkd(dkd_user_id_value,now());
    if dkd_used_seconds_value >= floor(dkd_membership_value.dkd_max_online_hours * 3600) then
      perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value);
      update public.dkd_profiles set dkd_courier_online=false,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value;
      return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','max_online_hours_reached','dkd_online_value',false,'dkd_status_locked_value',false,'dkd_today_online_seconds',dkd_used_seconds_value,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours);
    end if;
  end if;

  select dkd_job_value.id into dkd_active_delivery_job_id_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.assigned_user_id=dkd_user_id_value
    and coalesce(dkd_job_value.is_active,true)=true
    and lower(coalesce(dkd_job_value.status,'')) in ('accepted','assigned','to_pickup','picked_up','to_customer','delivering')
    and lower(coalesce(dkd_job_value.pickup_status,'')) not in ('delivered','cancelled','canceled')
  order by dkd_job_value.updated_at desc nulls last, dkd_job_value.created_at desc nulls last
  limit 1;

  if dkd_active_delivery_job_id_value is not null then
    perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value);
    update public.dkd_profiles
       set dkd_courier_online=false,
           dkd_courier_auto_assigned_job_id=dkd_active_delivery_job_id_value,
           dkd_courier_last_online_at=now()
     where user_id=dkd_user_id_value;
    return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',false,'dkd_has_active_delivery_value',true,'dkd_assigned_job_id',dkd_active_delivery_job_id_value,'assigned_job_id',dkd_active_delivery_job_id_value);
  end if;

  if dkd_param_online is not true then
    perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value);
    update public.dkd_profiles set dkd_courier_online=false,dkd_courier_auto_assigned_job_id=null,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value;
    return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',false,'dkd_assigned_job_id',null,'assigned_job_id',null);
  end if;

  if not exists(select 1 from public.dkd_profiles dkd_profile_value where dkd_profile_value.user_id=dkd_user_id_value and coalesce(dkd_profile_value.courier_status,'')='approved') then
    return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','courier_not_approved');
  end if;

  insert into public.dkd_courier_online_sessions(dkd_user_id,dkd_started_at,dkd_country,dkd_city,dkd_region)
  select dkd_user_id_value,now(),dkd_safe_country_value,dkd_safe_city_value,dkd_safe_region_value
  where not exists(select 1 from public.dkd_courier_online_sessions dkd_session_value where dkd_session_value.dkd_user_id=dkd_user_id_value and dkd_session_value.dkd_ended_at is null);

  update public.dkd_profiles
     set dkd_courier_online=true,
         dkd_courier_online_country=dkd_safe_country_value,
         dkd_courier_online_city=dkd_safe_city_value,
         dkd_courier_online_region=dkd_safe_region_value,
         dkd_courier_online_lat=dkd_param_live_lat,
         dkd_courier_online_lng=dkd_param_live_lng,
         dkd_courier_last_online_at=now()
   where user_id=dkd_user_id_value;

  select dkd_job_value.id into dkd_existing_offer_job_id_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.assigned_user_id=dkd_user_id_value
    and coalesce(dkd_job_value.is_active,true)=true
    and lower(coalesce(dkd_job_value.status,'')) in ('dkd_auto_assigned','dkd_assigned_offer','courier_offer','auto_assigned','assigned_offer')
  order by dkd_job_value.updated_at desc nulls last, dkd_job_value.created_at desc nulls last
  limit 1;

  if dkd_existing_offer_job_id_value is not null then
    update public.dkd_profiles set dkd_courier_auto_assigned_job_id=dkd_existing_offer_job_id_value where user_id=dkd_user_id_value;
    return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',true,'dkd_assigned_job_id',dkd_existing_offer_job_id_value,'assigned_job_id',dkd_existing_offer_job_id_value);
  end if;

  select dkd_job_value.id into dkd_next_job_id_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.assigned_user_id is null
    and dkd_job_value.dkd_business_id is null
    and coalesce(dkd_job_value.is_active,true)=true
    and lower(coalesce(dkd_job_value.status,'open')) in ('open','ready','published')
    and not public.dkd_jsonb_array_has_text_dkd(coalesce(dkd_job_value.cargo_meta,'{}'::jsonb)->'dkd_rejected_courier_user_ids',dkd_user_id_value::text)
    and public.dkd_region_match_dkd(dkd_job_value.dkd_country,dkd_job_value.dkd_city,dkd_job_value.dkd_region,dkd_safe_country_value,dkd_safe_city_value,dkd_safe_region_value)
  order by case
    when dkd_param_live_lat is not null and dkd_param_live_lng is not null and dkd_job_value.pickup_lat is not null and dkd_job_value.pickup_lng is not null
      then public.dkd_distance_km_between(dkd_param_live_lat,dkd_param_live_lng,dkd_job_value.pickup_lat,dkd_job_value.pickup_lng)
    else null
  end asc nulls last, dkd_job_value.updated_at desc nulls last, dkd_job_value.created_at desc
  limit 1 for update skip locked;

  if dkd_next_job_id_value is not null then
    update public.dkd_courier_jobs dkd_job_value
       set assigned_user_id=dkd_user_id_value,
           status='dkd_assigned_offer',
           dkd_auto_assigned_at=now(),
           dkd_assignment_expires_at=now()+interval '4 minutes',
           cargo_meta=coalesce(dkd_job_value.cargo_meta,'{}'::jsonb)||jsonb_build_object('dkd_auto_assigned_to',dkd_user_id_value::text,'dkd_auto_assigned_at',now()),
           updated_at=now()
     where dkd_job_value.id=dkd_next_job_id_value;
  end if;

  update public.dkd_profiles set dkd_courier_auto_assigned_job_id=dkd_next_job_id_value where user_id=dkd_user_id_value;
  return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',true,'dkd_has_active_delivery_value',false,'dkd_assigned_job_id',dkd_next_job_id_value,'assigned_job_id',dkd_next_job_id_value);
end;
$function$;
