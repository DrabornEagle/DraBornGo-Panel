create or replace function public.dkd_business_orders_dkd(dkd_param_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_limit_value integer := least(greatest(coalesce(dkd_param_limit,100),1),250);
  dkd_result_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;

  select coalesce(jsonb_agg(dkd_order_value order by (dkd_order_value->>'dkd_updated_at')::timestamptz desc),'[]'::jsonb)
    into dkd_result_value
  from (
    select jsonb_build_object(
      'dkd_job_id',dkd_job_value.id,
      'dkd_order_ref',coalesce(nullif(dkd_job_value.dkd_order_ref_text,''),nullif(dkd_job_value.dkd_order_id_text,''),dkd_job_value.id::text),
      'dkd_title',coalesce(dkd_job_value.title,dkd_job_value.product_title,'Sipariş'),
      'dkd_pickup',coalesce(dkd_job_value.pickup,''),
      'dkd_dropoff',coalesce(nullif(dkd_job_value.delivery_address_text,''),nullif(dkd_job_value.dropoff,''),''),
      'dkd_dropoff_lat',dkd_job_value.dropoff_lat,
      'dkd_dropoff_lng',dkd_job_value.dropoff_lng,
      'dkd_status',dkd_job_value.status,
      'dkd_pickup_status',dkd_job_value.pickup_status,
      'dkd_customer_charge_tl',dkd_job_value.customer_charge_tl,
      'dkd_platform_fee_tl',dkd_job_value.fee_tl,
      'dkd_distance_km',dkd_job_value.distance_km,
      'dkd_eta_min',dkd_job_value.eta_min,
      'dkd_created_at',dkd_job_value.created_at,
      'dkd_updated_at',dkd_job_value.updated_at,
      'dkd_accepted_at',dkd_job_value.accepted_at,
      'dkd_picked_up_at',dkd_job_value.picked_up_at,
      'dkd_completed_at',dkd_job_value.completed_at,
      'dkd_courier_user_id',dkd_job_value.assigned_user_id,
      'dkd_courier_name',coalesce(nullif(dkd_auth_value.raw_user_meta_data->>'dkd_full_name',''),nullif(dkd_auth_value.raw_user_meta_data->>'full_name',''),nullif(dkd_profile_value.nickname,''),'Atanmadı'),
      'dkd_courier_plate',coalesce(nullif(dkd_auth_value.raw_user_meta_data->>'motorcycle_plate',''),nullif(dkd_location_value.plate_no,''),''),
      'dkd_courier_online',coalesce(dkd_profile_value.dkd_courier_online,false),
      'dkd_courier_lat',dkd_location_value.lat,
      'dkd_courier_lng',dkd_location_value.lng,
      'dkd_courier_heading',dkd_location_value.heading_deg,
      'dkd_location_updated_at',dkd_location_value.updated_at
    ) as dkd_order_value
    from public.dkd_courier_jobs dkd_job_value
    left join auth.users dkd_auth_value on dkd_auth_value.id=dkd_job_value.assigned_user_id
    left join public.dkd_profiles dkd_profile_value on dkd_profile_value.user_id=dkd_job_value.assigned_user_id
    left join public.dkd_courier_live_locations dkd_location_value on dkd_location_value.courier_user_id=dkd_job_value.assigned_user_id
    where dkd_job_value.dkd_business_id=dkd_business_id_value
       or (
         dkd_job_value.dkd_business_id is null
         and exists(
           select 1 from public.dkd_business_couriers dkd_membership_value
           where dkd_membership_value.dkd_business_id=dkd_business_id_value
             and dkd_membership_value.dkd_courier_user_id=dkd_job_value.assigned_user_id
             and dkd_job_value.created_at >= dkd_membership_value.dkd_linked_at
             and dkd_job_value.created_at < coalesce(dkd_membership_value.dkd_unlinked_at,'infinity'::timestamptz)
         )
       )
    order by dkd_job_value.updated_at desc
    limit dkd_limit_value
  ) dkd_order_rows;

  return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_business_id_value,'dkd_orders',dkd_result_value);
end;
$function$;

create or replace function public.dkd_business_dashboard_dkd()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_business_name_value text;
  dkd_hour_start timestamptz := (date_trunc('hour',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_day_start timestamptz := (date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_week_start timestamptz := (date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_month_start timestamptz := (date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_period_result jsonb := '{}'::jsonb;
  dkd_period_key text;
  dkd_period_start timestamptz;
  dkd_completed_count bigint;
  dkd_gross_value numeric;
  dkd_courier_cost_value numeric;
  dkd_active_orders_value bigint;
  dkd_couriers_total_value bigint;
  dkd_couriers_online_value bigint;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  select dkd_business_name into dkd_business_name_value from public.dkd_businesses where dkd_id=dkd_business_id_value;

  select count(*) filter(where dkd_is_active is true), count(*) filter(where dkd_is_active is true and coalesce(dkd_profile_value.dkd_courier_online,false) is true)
    into dkd_couriers_total_value, dkd_couriers_online_value
  from public.dkd_business_couriers dkd_membership_value
  left join public.dkd_profiles dkd_profile_value on dkd_profile_value.user_id=dkd_membership_value.dkd_courier_user_id
  where dkd_membership_value.dkd_business_id=dkd_business_id_value;

  select count(*) into dkd_active_orders_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.dkd_business_id=dkd_business_id_value
    and coalesce(dkd_job_value.is_active,true) is true
    and lower(coalesce(dkd_job_value.status,'')) not in ('completed','delivered','cancelled','canceled');

  for dkd_period_key, dkd_period_start in
    values ('hourly'::text,dkd_hour_start),('daily',dkd_day_start),('weekly',dkd_week_start),('monthly',dkd_month_start)
  loop
    select count(*), coalesce(sum(coalesce(dkd_job_value.customer_charge_tl,0)),0)
      into dkd_completed_count, dkd_gross_value
    from public.dkd_courier_jobs dkd_job_value
    where dkd_job_value.dkd_business_id=dkd_business_id_value
      and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)>=dkd_period_start
      and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)<=now()
      and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'));

    select coalesce(sum((public.dkd_business_courier_period_cost_dkd(
      dkd_business_id_value,dkd_membership_value.dkd_courier_user_id,dkd_period_start,now()
    )->>'dkd_earnings_tl')::numeric),0)
      into dkd_courier_cost_value
    from public.dkd_business_couriers dkd_membership_value
    where dkd_membership_value.dkd_business_id=dkd_business_id_value
      and dkd_membership_value.dkd_linked_at < now()
      and coalesce(dkd_membership_value.dkd_unlinked_at,now()+interval '1 second') > dkd_period_start;

    dkd_period_result := dkd_period_result || jsonb_build_object(
      dkd_period_key,
      jsonb_build_object(
        'dkd_gross_tl',round(coalesce(dkd_gross_value,0),2),
        'dkd_courier_cost_tl',round(coalesce(dkd_courier_cost_value,0),2),
        'dkd_net_tl',round(coalesce(dkd_gross_value,0)-coalesce(dkd_courier_cost_value,0),2),
        'dkd_completed_orders',coalesce(dkd_completed_count,0)
      )
    );
  end loop;

  return dkd_period_result || jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_business_id',dkd_business_id_value,
    'dkd_business_name',dkd_business_name_value,
    'dkd_active_orders',coalesce(dkd_active_orders_value,0),
    'dkd_couriers_total',coalesce(dkd_couriers_total_value,0),
    'dkd_couriers_online',coalesce(dkd_couriers_online_value,0),
    'dkd_generated_at',now()
  );
end;
$function$;

-- Tight grants: direct writes stay behind security-definer RPCs.
revoke all on public.dkd_businesses from anon;

revoke all on public.dkd_business_couriers from anon;

revoke all on public.dkd_business_courier_rate_history from anon;

revoke all on public.dkd_courier_identity_lookup from anon;

grant select on public.dkd_businesses to authenticated;

grant select on public.dkd_business_couriers to authenticated;

grant select on public.dkd_business_courier_rate_history to authenticated;

grant select on public.dkd_courier_identity_lookup to authenticated;

revoke all on function public.dkd_business_owned_by_auth_dkd(uuid) from public;

revoke all on function public.dkd_business_current_id_dkd() from public;

revoke all on function public.dkd_business_register_dkd(text,text,text,text,text,text,text) from public;

revoke all on function public.dkd_business_profile_dkd() from public;

revoke all on function public.dkd_business_courier_search_dkd(text) from public;

revoke all on function public.dkd_business_courier_link_dkd(uuid,numeric,numeric) from public;

revoke all on function public.dkd_business_courier_rate_set_dkd(uuid,numeric,numeric) from public;

revoke all on function public.dkd_business_courier_unlink_dkd(uuid) from public;

revoke all on function public.dkd_courier_identity_register_dkd(text) from public;

revoke all on function public.dkd_business_courier_period_cost_dkd(uuid,uuid,timestamptz,timestamptz) from public;

revoke all on function public.dkd_business_courier_period_cost_dkd(uuid,uuid,timestamptz,timestamptz) from authenticated;

revoke all on function public.dkd_courier_earnings_summary_dkd(uuid) from public;

revoke all on function public.dkd_business_couriers_dkd() from public;

revoke all on function public.dkd_business_orders_dkd(integer) from public;

revoke all on function public.dkd_business_dashboard_dkd() from public;

grant execute on function public.dkd_business_owned_by_auth_dkd(uuid) to authenticated;

grant execute on function public.dkd_business_current_id_dkd() to authenticated;

grant execute on function public.dkd_business_register_dkd(text,text,text,text,text,text,text) to authenticated;

grant execute on function public.dkd_business_profile_dkd() to authenticated;

grant execute on function public.dkd_business_courier_search_dkd(text) to authenticated;

grant execute on function public.dkd_business_courier_link_dkd(uuid,numeric,numeric) to authenticated;

grant execute on function public.dkd_business_courier_rate_set_dkd(uuid,numeric,numeric) to authenticated;

grant execute on function public.dkd_business_courier_unlink_dkd(uuid) to authenticated;

grant execute on function public.dkd_courier_identity_register_dkd(text) to authenticated;

grant execute on function public.dkd_courier_earnings_summary_dkd(uuid) to authenticated;

grant execute on function public.dkd_business_couriers_dkd() to authenticated;

grant execute on function public.dkd_business_orders_dkd(integer) to authenticated;

grant execute on function public.dkd_business_dashboard_dkd() to authenticated;
