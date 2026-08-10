-- Preserve the existing DraBornGo RPC contract while applying business-defined rates when linked.
create or replace function public.dkd_courier_earnings_summary_dkd(dkd_param_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_auth_user_id uuid := auth.uid();
  dkd_target_user_id uuid := coalesce(dkd_param_user_id,auth.uid());
  dkd_is_admin_value boolean := coalesce(public.dkd_is_admin(),false);
  dkd_business_id_value uuid;
  dkd_business_name_value text;
  dkd_business_active_value boolean := false;
  dkd_day_start timestamptz := (date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_hour_start timestamptz := (date_trunc('hour',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_week_start timestamptz := (date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_month_start timestamptz := (date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_hourly_value jsonb;
  dkd_daily_value jsonb;
  dkd_weekly_value jsonb;
  dkd_monthly_value jsonb;
  dkd_lifetime_value jsonb;
  dkd_result_value jsonb;
begin
  if dkd_auth_user_id is null or dkd_target_user_id is null then raise exception 'dkd_auth_required'; end if;

  select dkd_membership_value.dkd_business_id, dkd_business_value.dkd_business_name, dkd_membership_value.dkd_is_active
    into dkd_business_id_value, dkd_business_name_value, dkd_business_active_value
  from public.dkd_business_couriers dkd_membership_value
  join public.dkd_businesses dkd_business_value on dkd_business_value.dkd_id=dkd_membership_value.dkd_business_id
  where dkd_membership_value.dkd_courier_user_id=dkd_target_user_id
  order by dkd_membership_value.dkd_is_active desc, dkd_membership_value.dkd_linked_at desc limit 1;

  if dkd_target_user_id<>dkd_auth_user_id
     and not dkd_is_admin_value
     and not (dkd_business_id_value is not null and public.dkd_business_owned_by_auth_dkd(dkd_business_id_value)) then
    raise exception 'dkd_access_denied';
  end if;

  if dkd_business_id_value is not null then
    dkd_hourly_value := public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_target_user_id,dkd_hour_start,now());
    dkd_daily_value := public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_target_user_id,dkd_day_start,now());
    dkd_weekly_value := public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_target_user_id,dkd_week_start,now());
    dkd_monthly_value := public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_target_user_id,dkd_month_start,now());
    dkd_lifetime_value := public.dkd_business_courier_period_cost_dkd(
      dkd_business_id_value,
      dkd_target_user_id,
      coalesce((select min(dkd_linked_at) from public.dkd_business_couriers where dkd_business_id=dkd_business_id_value and dkd_courier_user_id=dkd_target_user_id), now()),
      now()
    );

    return jsonb_build_object(
      'hourly',dkd_hourly_value,
      'daily',dkd_daily_value,
      'weekly',dkd_weekly_value,
      'monthly',dkd_monthly_value,
      'dkd_user_id',dkd_target_user_id,
      'dkd_generated_at',now(),
      'dkd_is_online',coalesce((select p.dkd_courier_online from public.dkd_profiles p where p.user_id=dkd_target_user_id),false),
      'dkd_lifetime_earnings_tl',coalesce((dkd_lifetime_value->>'dkd_earnings_tl')::numeric,0),
      'dkd_lifetime_completed_jobs',coalesce((dkd_lifetime_value->>'dkd_completed_jobs')::bigint,0),
      'dkd_business_linked',coalesce(dkd_business_active_value,false),
      'dkd_business_id',dkd_business_id_value,
      'dkd_business_name',dkd_business_name_value
    );
  end if;

  -- Unlinked couriers retain the original DraBornGo fee-based calculation.
  with dkd_periods as (
    select 'hourly'::text as dkd_key_value, dkd_hour_start as dkd_start_at, now() as dkd_end_at
    union all select 'daily',dkd_day_start,now()
    union all select 'weekly',dkd_week_start,now()
    union all select 'monthly',dkd_month_start,now()
  ), dkd_stats as (
    select
      dkd_period_value.dkd_key_value,
      coalesce((
        select sum(coalesce(dkd_job_value.fee_tl,0))
        from public.dkd_courier_jobs dkd_job_value
        where dkd_job_value.assigned_user_id=dkd_target_user_id
          and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)>=dkd_period_value.dkd_start_at
          and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)<=dkd_period_value.dkd_end_at
          and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
      ),0)::numeric as dkd_earnings_tl,
      coalesce((
        select count(*) from public.dkd_courier_jobs dkd_job_value
        where dkd_job_value.assigned_user_id=dkd_target_user_id
          and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)>=dkd_period_value.dkd_start_at
          and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)<=dkd_period_value.dkd_end_at
          and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
      ),0)::bigint as dkd_completed_jobs,
      coalesce((
        select sum(greatest(0,extract(epoch from (least(coalesce(dkd_session_value.dkd_ended_at,now()),dkd_period_value.dkd_end_at)-greatest(dkd_session_value.dkd_started_at,dkd_period_value.dkd_start_at)))))
        from public.dkd_courier_online_sessions dkd_session_value
        where dkd_session_value.dkd_user_id=dkd_target_user_id
          and dkd_session_value.dkd_started_at<dkd_period_value.dkd_end_at
          and coalesce(dkd_session_value.dkd_ended_at,now())>dkd_period_value.dkd_start_at
      ),0)::numeric as dkd_online_seconds,
      coalesce((
        select sum(greatest(0,extract(epoch from (
          least(coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at),dkd_period_value.dkd_end_at)
          - greatest(coalesce(dkd_job_value.accepted_at,dkd_job_value.picked_up_at,dkd_job_value.created_at),dkd_period_value.dkd_start_at)
        ))))
        from public.dkd_courier_jobs dkd_job_value
        where dkd_job_value.assigned_user_id=dkd_target_user_id
          and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
          and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)>dkd_period_value.dkd_start_at
          and coalesce(dkd_job_value.accepted_at,dkd_job_value.picked_up_at,dkd_job_value.created_at)<dkd_period_value.dkd_end_at
      ),0)::numeric as dkd_delivery_seconds
    from dkd_periods dkd_period_value
  ), dkd_enriched as (
    select *, case when dkd_online_seconds>=60 then dkd_online_seconds when dkd_delivery_seconds>=60 then dkd_delivery_seconds else 0 end as dkd_hourly_basis_seconds
    from dkd_stats
  )
  select jsonb_object_agg(dkd_key_value,jsonb_build_object(
    'dkd_earnings_tl',round(dkd_earnings_tl,2),
    'dkd_completed_jobs',dkd_completed_jobs,
    'dkd_online_seconds',floor(dkd_online_seconds),
    'dkd_online_hours',round(dkd_online_seconds/3600.0,2),
    'dkd_delivery_seconds',floor(dkd_delivery_seconds),
    'dkd_hourly_basis_seconds',floor(dkd_hourly_basis_seconds),
    'dkd_hourly_tl',case when dkd_hourly_basis_seconds>=60 then round(dkd_earnings_tl/(dkd_hourly_basis_seconds/3600.0),2) else 0 end
  )) into dkd_result_value from dkd_enriched;

  return coalesce(dkd_result_value,'{}'::jsonb)||jsonb_build_object(
    'dkd_user_id',dkd_target_user_id,
    'dkd_generated_at',now(),
    'dkd_is_online',coalesce((select p.dkd_courier_online from public.dkd_profiles p where p.user_id=dkd_target_user_id),false),
    'dkd_lifetime_earnings_tl',coalesce((select round(sum(coalesce(j.fee_tl,0)),2) from public.dkd_courier_jobs j where j.assigned_user_id=dkd_target_user_id and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered'))),0),
    'dkd_lifetime_completed_jobs',coalesce((select count(*) from public.dkd_courier_jobs j where j.assigned_user_id=dkd_target_user_id and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered'))),0),
    'dkd_business_linked',false
  );
end;
$function$;

create or replace function public.dkd_business_couriers_dkd()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_day_start timestamptz := (date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_result_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'dkd_membership_id',dkd_membership_value.dkd_id,
    'dkd_courier_user_id',dkd_membership_value.dkd_courier_user_id,
    'dkd_display_name',coalesce(nullif(dkd_auth_value.raw_user_meta_data->>'dkd_full_name',''),nullif(dkd_auth_value.raw_user_meta_data->>'full_name',''),nullif(dkd_profile_value.nickname,''),'Kurye'),
    'dkd_plate_no',coalesce(nullif(dkd_auth_value.raw_user_meta_data->>'motorcycle_plate',''),nullif(dkd_location_value.plate_no,''),''),
    'dkd_email_masked',public.dkd_panel_mask_email_dkd(dkd_auth_value.email),
    'dkd_package_fee_tl',dkd_membership_value.dkd_package_fee_tl,
    'dkd_hourly_rate_tl',dkd_membership_value.dkd_hourly_rate_tl,
    'dkd_is_online',coalesce(dkd_profile_value.dkd_courier_online,false),
    'dkd_city',coalesce(nullif(dkd_profile_value.dkd_city,''),nullif(dkd_profile_value.courier_city,''),''),
    'dkd_lat',dkd_location_value.lat,
    'dkd_lng',dkd_location_value.lng,
    'dkd_location_updated_at',dkd_location_value.updated_at,
    'dkd_linked_at',dkd_membership_value.dkd_linked_at,
    'dkd_today',public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_membership_value.dkd_courier_user_id,dkd_day_start,now())
  ) order by coalesce(dkd_profile_value.dkd_courier_online,false) desc, dkd_membership_value.dkd_linked_at desc),'[]'::jsonb)
  into dkd_result_value
  from public.dkd_business_couriers dkd_membership_value
  join auth.users dkd_auth_value on dkd_auth_value.id=dkd_membership_value.dkd_courier_user_id
  left join public.dkd_profiles dkd_profile_value on dkd_profile_value.user_id=dkd_membership_value.dkd_courier_user_id
  left join public.dkd_courier_live_locations dkd_location_value on dkd_location_value.courier_user_id=dkd_membership_value.dkd_courier_user_id
  where dkd_membership_value.dkd_business_id=dkd_business_id_value and dkd_membership_value.dkd_is_active is true;

  return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_business_id_value,'dkd_couriers',dkd_result_value);
end;
$function$;
