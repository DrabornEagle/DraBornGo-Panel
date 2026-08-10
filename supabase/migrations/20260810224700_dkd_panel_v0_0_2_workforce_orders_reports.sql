-- DraBornGo Panel v0.0.2
-- Applied to shared Supabase project on 2026-08-10.
-- Workforce limits, owner status lock, order creation and reporting.

alter table public.dkd_business_couriers
  add column if not exists dkd_max_online_hours numeric(5,2) not null default 12,
  add column if not exists dkd_owner_status_locked boolean not null default false,
  add column if not exists dkd_owner_status_updated_at timestamptz;

alter table public.dkd_business_couriers drop constraint if exists dkd_business_couriers_max_online_hours_check;
alter table public.dkd_business_couriers add constraint dkd_business_couriers_max_online_hours_check check (dkd_max_online_hours >= 1 and dkd_max_online_hours <= 24);

create or replace function public.dkd_courier_daily_online_seconds_dkd(dkd_param_user_id uuid, dkd_param_reference_at timestamptz default now())
returns bigint language plpgsql stable security definer set search_path to 'public' as $function$
declare
  dkd_day_start_value timestamptz := (date_trunc('day', dkd_param_reference_at at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  dkd_day_end_value timestamptz := ((date_trunc('day', dkd_param_reference_at at time zone 'Europe/Istanbul') + interval '1 day') at time zone 'Europe/Istanbul');
  dkd_seconds_value numeric := 0;
begin
  select coalesce(sum(greatest(0, extract(epoch from (least(coalesce(dkd_session_value.dkd_ended_at, dkd_param_reference_at), dkd_day_end_value) - greatest(dkd_session_value.dkd_started_at, dkd_day_start_value))))), 0)
  into dkd_seconds_value
  from public.dkd_courier_online_sessions dkd_session_value
  where dkd_session_value.dkd_user_id = dkd_param_user_id and dkd_session_value.dkd_started_at < dkd_day_end_value and coalesce(dkd_session_value.dkd_ended_at, dkd_param_reference_at) > dkd_day_start_value;
  return floor(coalesce(dkd_seconds_value, 0))::bigint;
end;
$function$;

create or replace function public.dkd_business_courier_max_hours_set_dkd(dkd_param_courier_user_id uuid, dkd_param_max_online_hours numeric)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_hours_value numeric := round(coalesce(dkd_param_max_online_hours, 0), 2);
  dkd_used_seconds_value bigint := 0;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_param_courier_user_id is null then raise exception 'dkd_courier_required'; end if;
  if dkd_hours_value < 1 or dkd_hours_value > 24 then raise exception 'dkd_max_online_hours_invalid'; end if;
  update public.dkd_business_couriers set dkd_max_online_hours=dkd_hours_value, dkd_updated_at=now()
   where dkd_business_id=dkd_business_id_value and dkd_courier_user_id=dkd_param_courier_user_id and dkd_is_active is true;
  if not found then raise exception 'dkd_membership_not_found'; end if;
  dkd_used_seconds_value := public.dkd_courier_daily_online_seconds_dkd(dkd_param_courier_user_id, now());
  if dkd_used_seconds_value >= floor(dkd_hours_value * 3600) then
    perform public.dkd_close_courier_online_session_dkd(dkd_param_courier_user_id);
    update public.dkd_profiles set dkd_courier_online=false, dkd_courier_last_online_at=now() where user_id=dkd_param_courier_user_id;
  end if;
  return jsonb_build_object('dkd_ok_value',true,'dkd_max_online_hours',dkd_hours_value,'dkd_today_online_seconds',dkd_used_seconds_value,'dkd_limit_reached',dkd_used_seconds_value >= floor(dkd_hours_value*3600));
end;
$function$;

create or replace function public.dkd_business_courier_online_set_dkd(dkd_param_courier_user_id uuid, dkd_param_online boolean)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_membership_value public.dkd_business_couriers%rowtype;
  dkd_used_seconds_value bigint := 0;
  dkd_active_delivery_job_id_value bigint := null;
  dkd_released_offer_count_value integer := 0;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_param_courier_user_id is null then raise exception 'dkd_courier_required'; end if;
  select * into dkd_membership_value from public.dkd_business_couriers
   where dkd_business_id=dkd_business_id_value and dkd_courier_user_id=dkd_param_courier_user_id and dkd_is_active is true limit 1 for update;
  if not found then raise exception 'dkd_membership_not_found'; end if;
  dkd_used_seconds_value := public.dkd_courier_daily_online_seconds_dkd(dkd_param_courier_user_id, now());
  if dkd_param_online is true and dkd_used_seconds_value >= floor(dkd_membership_value.dkd_max_online_hours*3600) then
    perform public.dkd_close_courier_online_session_dkd(dkd_param_courier_user_id);
    update public.dkd_profiles set dkd_courier_online=false, dkd_courier_last_online_at=now() where user_id=dkd_param_courier_user_id;
    return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','max_online_hours_reached','dkd_online_value',false,'dkd_today_online_seconds',dkd_used_seconds_value,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours);
  end if;
  if dkd_param_online is not true then
    select dkd_job_value.id into dkd_active_delivery_job_id_value from public.dkd_courier_jobs dkd_job_value
     where dkd_job_value.assigned_user_id=dkd_param_courier_user_id and coalesce(dkd_job_value.is_active,true) is true
       and lower(coalesce(dkd_job_value.status,'')) in ('accepted','assigned','to_pickup','picked_up','to_customer','delivering')
       and lower(coalesce(dkd_job_value.pickup_status,'')) not in ('delivered','cancelled','canceled')
     order by dkd_job_value.updated_at desc nulls last, dkd_job_value.created_at desc nulls last limit 1;
    update public.dkd_courier_jobs dkd_job_value set assigned_user_id=null,status='open',dkd_auto_assigned_at=null,dkd_assignment_expires_at=null,
      cargo_meta=(coalesce(dkd_job_value.cargo_meta,'{}'::jsonb)-'dkd_auto_assigned_to'-'dkd_auto_assigned_at'),updated_at=now()
     where dkd_job_value.assigned_user_id=dkd_param_courier_user_id and coalesce(dkd_job_value.is_active,true) is true
       and lower(coalesce(dkd_job_value.status,'')) in ('dkd_auto_assigned','dkd_assigned_offer','courier_offer','auto_assigned','assigned_offer');
    get diagnostics dkd_released_offer_count_value = row_count;
    perform public.dkd_close_courier_online_session_dkd(dkd_param_courier_user_id);
    update public.dkd_profiles set dkd_courier_online=false,dkd_courier_auto_assigned_job_id=dkd_active_delivery_job_id_value,dkd_courier_last_online_at=now() where user_id=dkd_param_courier_user_id;
    update public.dkd_business_couriers set dkd_owner_status_locked=true,dkd_owner_status_updated_at=now(),dkd_updated_at=now() where dkd_id=dkd_membership_value.dkd_id;
    return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',false,'dkd_owner_status_locked',true,'dkd_active_delivery_preserved',dkd_active_delivery_job_id_value is not null,'dkd_active_delivery_job_id',dkd_active_delivery_job_id_value,'dkd_released_offer_count',dkd_released_offer_count_value);
  end if;
  update public.dkd_business_couriers set dkd_owner_status_locked=false,dkd_owner_status_updated_at=now(),dkd_updated_at=now() where dkd_id=dkd_membership_value.dkd_id;
  insert into public.dkd_courier_online_sessions(dkd_user_id,dkd_started_at,dkd_country,dkd_city,dkd_region)
  select dkd_param_courier_user_id,now(),coalesce(nullif(dkd_profile_value.dkd_courier_online_country,''),'Türkiye'),coalesce(nullif(dkd_profile_value.dkd_courier_online_city,''),nullif(dkd_profile_value.dkd_city,''),nullif(dkd_profile_value.courier_city,''),'Ankara'),coalesce(nullif(dkd_profile_value.dkd_courier_online_region,''),nullif(dkd_profile_value.dkd_region,''),nullif(dkd_profile_value.courier_zone,''),'')
  from public.dkd_profiles dkd_profile_value where dkd_profile_value.user_id=dkd_param_courier_user_id
    and not exists(select 1 from public.dkd_courier_online_sessions dkd_open_session_value where dkd_open_session_value.dkd_user_id=dkd_param_courier_user_id and dkd_open_session_value.dkd_ended_at is null);
  update public.dkd_profiles set dkd_courier_online=true,dkd_courier_last_online_at=now() where user_id=dkd_param_courier_user_id;
  return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',true,'dkd_owner_status_locked',false,'dkd_today_online_seconds',dkd_used_seconds_value,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours);
end;
$function$;

create or replace function public.dkd_business_courier_force_offline_dkd(dkd_param_courier_user_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
begin return public.dkd_business_courier_online_set_dkd(dkd_param_courier_user_id,false); end;
$function$;

create or replace function public.dkd_business_order_create_dkd(
  dkd_param_order_ref text default '', dkd_param_title text default 'Sipariş', dkd_param_customer_name text default '',
  dkd_param_customer_phone text default '', dkd_param_delivery_address text default '', dkd_param_delivery_note text default '',
  dkd_param_customer_charge_tl numeric default 0, dkd_param_dropoff_lat numeric default null, dkd_param_dropoff_lng numeric default null)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_business_value public.dkd_businesses%rowtype;
  dkd_job_id_value bigint;
  dkd_order_ref_value text := nullif(trim(coalesce(dkd_param_order_ref,'')),'');
  dkd_title_value text := coalesce(nullif(trim(dkd_param_title),''),'Sipariş');
  dkd_delivery_address_value text := nullif(trim(coalesce(dkd_param_delivery_address,'')),'');
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_delivery_address_value is null then raise exception 'dkd_delivery_address_required'; end if;
  if coalesce(dkd_param_customer_charge_tl,0)<0 then raise exception 'dkd_order_amount_invalid'; end if;
  select * into dkd_business_value from public.dkd_businesses where dkd_id=dkd_business_id_value and dkd_is_active is true;
  if not found then raise exception 'dkd_business_required'; end if;
  insert into public.dkd_courier_jobs(title,product_title,pickup,dropoff,delivery_address_text,delivery_note,dropoff_lat,dropoff_lng,fee_tl,distance_km,eta_min,job_type,status,pickup_status,is_active,customer_charge_tl,dkd_order_ref_text,dkd_order_id_text,dkd_country,dkd_city,dkd_region,dkd_business_id,cargo_meta,created_at,updated_at)
  values(dkd_title_value,dkd_title_value,coalesce(nullif(trim(dkd_business_value.dkd_address_text),''),dkd_business_value.dkd_business_name),dkd_delivery_address_value,dkd_delivery_address_value,nullif(trim(coalesce(dkd_param_delivery_note,'')),''),dkd_param_dropoff_lat,dkd_param_dropoff_lng,0,0,0,'delivery','open','waiting',true,round(coalesce(dkd_param_customer_charge_tl,0),2),dkd_order_ref_value,dkd_order_ref_value,'Türkiye',nullif(trim(dkd_business_value.dkd_city),''),nullif(trim(dkd_business_value.dkd_district),''),dkd_business_id_value,
    jsonb_build_object('dkd_source','panel_order','dkd_customer_name',trim(coalesce(dkd_param_customer_name,'')),'dkd_customer_phone',trim(coalesce(dkd_param_customer_phone,'')),'dkd_created_by_user_id',auth.uid()::text,'dkd_created_from_panel',true),now(),now()) returning id into dkd_job_id_value;
  if dkd_order_ref_value is null then
    dkd_order_ref_value := 'DBG-'||to_char(now() at time zone 'Europe/Istanbul','YYMMDD')||'-'||lpad(dkd_job_id_value::text,6,'0');
    update public.dkd_courier_jobs set dkd_order_ref_text=dkd_order_ref_value,dkd_order_id_text=dkd_order_ref_value,updated_at=now() where id=dkd_job_id_value;
  end if;
  return jsonb_build_object('dkd_ok_value',true,'dkd_job_id',dkd_job_id_value,'dkd_order_ref',dkd_order_ref_value,'dkd_status','open');
end;
$function$;

create or replace function public.dkd_business_courier_report_dkd(dkd_param_courier_user_id uuid, dkd_param_day date)
returns jsonb language plpgsql stable security definer set search_path to 'public','auth' as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_day_value date := coalesce(dkd_param_day,(now() at time zone 'Europe/Istanbul')::date);
  dkd_start_value timestamptz := (dkd_day_value::timestamp at time zone 'Europe/Istanbul');
  dkd_end_value timestamptz := ((dkd_day_value+1)::timestamp at time zone 'Europe/Istanbul');
  dkd_sessions_value jsonb := '[]'::jsonb; dkd_hours_value jsonb := '[]'::jsonb; dkd_jobs_value jsonb := '[]'::jsonb; dkd_cost_value jsonb := '{}'::jsonb;
  dkd_max_hours_value numeric := 12; dkd_locked_value boolean := false;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  select dkd_max_online_hours,dkd_owner_status_locked into dkd_max_hours_value,dkd_locked_value from public.dkd_business_couriers where dkd_business_id=dkd_business_id_value and dkd_courier_user_id=dkd_param_courier_user_id and dkd_is_active is true limit 1;
  if not found then raise exception 'dkd_membership_not_found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_started_at',greatest(s.dkd_started_at,dkd_start_value),'dkd_ended_at',least(coalesce(s.dkd_ended_at,now()),dkd_end_value),'dkd_duration_seconds',greatest(0,floor(extract(epoch from (least(coalesce(s.dkd_ended_at,now()),dkd_end_value)-greatest(s.dkd_started_at,dkd_start_value)))))) order by s.dkd_started_at),'[]'::jsonb)
  into dkd_sessions_value from public.dkd_courier_online_sessions s where s.dkd_user_id=dkd_param_courier_user_id and s.dkd_started_at<dkd_end_value and coalesce(s.dkd_ended_at,now())>dkd_start_value;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_hour',h,'dkd_label',lpad(h::text,2,'0')||':00','dkd_packages',(select count(*) from public.dkd_courier_jobs j where j.dkd_business_id=dkd_business_id_value and j.assigned_user_id=dkd_param_courier_user_id and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered')) and coalesce(j.completed_at,j.updated_at)>=dkd_start_value+make_interval(hours=>h) and coalesce(j.completed_at,j.updated_at)<dkd_start_value+make_interval(hours=>h+1))) order by h),'[]'::jsonb)
  into dkd_hours_value from generate_series(0,23) h;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_job_id',j.id,'dkd_order_ref',coalesce(nullif(j.dkd_order_ref_text,''),j.id::text),'dkd_title',coalesce(j.title,j.product_title,'Sipariş'),'dkd_completed_at',coalesce(j.completed_at,j.updated_at),'dkd_customer_charge_tl',j.customer_charge_tl) order by coalesce(j.completed_at,j.updated_at)),'[]'::jsonb)
  into dkd_jobs_value from public.dkd_courier_jobs j where j.dkd_business_id=dkd_business_id_value and j.assigned_user_id=dkd_param_courier_user_id and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered')) and coalesce(j.completed_at,j.updated_at)>=dkd_start_value and coalesce(j.completed_at,j.updated_at)<dkd_end_value;
  dkd_cost_value := public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,dkd_param_courier_user_id,dkd_start_value,least(dkd_end_value,now()));
  return jsonb_build_object('dkd_ok_value',true,'dkd_day',dkd_day_value,'dkd_sessions',dkd_sessions_value,'dkd_hours',dkd_hours_value,'dkd_jobs',dkd_jobs_value,'dkd_summary',dkd_cost_value,'dkd_max_online_hours',dkd_max_hours_value,'dkd_owner_status_locked',dkd_locked_value);
end;
$function$;

create or replace function public.dkd_business_day_report_dkd(dkd_param_day date)
returns jsonb language plpgsql stable security definer set search_path to 'public','auth' as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_day_value date := coalesce(dkd_param_day,(now() at time zone 'Europe/Istanbul')::date);
  dkd_start_value timestamptz := (dkd_day_value::timestamp at time zone 'Europe/Istanbul');
  dkd_end_value timestamptz := ((dkd_day_value+1)::timestamp at time zone 'Europe/Istanbul');
  dkd_gross_value numeric:=0; dkd_courier_cost_value numeric:=0; dkd_completed_count_value bigint:=0; dkd_orders_value jsonb:='[]'::jsonb; dkd_couriers_value jsonb:='[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  select count(*),coalesce(sum(coalesce(j.customer_charge_tl,0)),0) into dkd_completed_count_value,dkd_gross_value from public.dkd_courier_jobs j where j.dkd_business_id=dkd_business_id_value and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered')) and coalesce(j.completed_at,j.updated_at)>=dkd_start_value and coalesce(j.completed_at,j.updated_at)<dkd_end_value;
  select coalesce(sum((public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,m.dkd_courier_user_id,dkd_start_value,least(dkd_end_value,now()))->>'dkd_earnings_tl')::numeric),0) into dkd_courier_cost_value from public.dkd_business_couriers m where m.dkd_business_id=dkd_business_id_value and m.dkd_linked_at<dkd_end_value and coalesce(m.dkd_unlinked_at,'infinity'::timestamptz)>dkd_start_value;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_job_id',j.id,'dkd_order_ref',coalesce(nullif(j.dkd_order_ref_text,''),j.id::text),'dkd_title',coalesce(j.title,j.product_title,'Sipariş'),'dkd_amount_tl',j.customer_charge_tl,'dkd_completed_at',coalesce(j.completed_at,j.updated_at),'dkd_courier_user_id',j.assigned_user_id,'dkd_courier_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Kurye')) order by coalesce(j.completed_at,j.updated_at) desc),'[]'::jsonb)
  into dkd_orders_value from public.dkd_courier_jobs j left join auth.users u on u.id=j.assigned_user_id left join public.dkd_profiles p on p.user_id=j.assigned_user_id where j.dkd_business_id=dkd_business_id_value and (j.completed_at is not null or lower(coalesce(j.status,'')) in ('completed','delivered')) and coalesce(j.completed_at,j.updated_at)>=dkd_start_value and coalesce(j.completed_at,j.updated_at)<dkd_end_value;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_courier_user_id',m.dkd_courier_user_id,'dkd_display_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Kurye'),'dkd_cost',public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,m.dkd_courier_user_id,dkd_start_value,least(dkd_end_value,now()))) order by 2),'[]'::jsonb)
  into dkd_couriers_value from public.dkd_business_couriers m join auth.users u on u.id=m.dkd_courier_user_id left join public.dkd_profiles p on p.user_id=m.dkd_courier_user_id where m.dkd_business_id=dkd_business_id_value and m.dkd_linked_at<dkd_end_value and coalesce(m.dkd_unlinked_at,'infinity'::timestamptz)>dkd_start_value;
  return jsonb_build_object('dkd_ok_value',true,'dkd_day',dkd_day_value,'dkd_gross_tl',round(dkd_gross_value,2),'dkd_courier_cost_tl',round(dkd_courier_cost_value,2),'dkd_net_tl',round(dkd_gross_value-dkd_courier_cost_value,2),'dkd_completed_orders',dkd_completed_count_value,'dkd_orders',dkd_orders_value,'dkd_couriers',dkd_couriers_value);
end;
$function$;

-- Current courier listing exposes the new workforce control fields.
create or replace function public.dkd_business_couriers_dkd()
returns jsonb language plpgsql stable security definer set search_path to 'public','auth' as $function$
declare dkd_business_id_value uuid:=public.dkd_business_current_id_dkd(); dkd_day_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'); dkd_result_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if; if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('dkd_membership_id',m.dkd_id,'dkd_courier_user_id',m.dkd_courier_user_id,'dkd_display_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Kurye'),'dkd_plate_no',coalesce(nullif(u.raw_user_meta_data->>'motorcycle_plate',''),nullif(l.plate_no,''),''),'dkd_email_masked',public.dkd_panel_mask_email_dkd(u.email),'dkd_package_fee_tl',m.dkd_package_fee_tl,'dkd_hourly_rate_tl',m.dkd_hourly_rate_tl,'dkd_max_online_hours',m.dkd_max_online_hours,'dkd_owner_status_locked',m.dkd_owner_status_locked,'dkd_owner_status_updated_at',m.dkd_owner_status_updated_at,'dkd_is_online',coalesce(p.dkd_courier_online,false),'dkd_city',coalesce(nullif(p.dkd_city,''),nullif(p.courier_city,''),''),'dkd_lat',l.lat,'dkd_lng',l.lng,'dkd_location_updated_at',l.updated_at,'dkd_linked_at',m.dkd_linked_at,'dkd_today_online_seconds',public.dkd_courier_daily_online_seconds_dkd(m.dkd_courier_user_id,now()),'dkd_today',public.dkd_business_courier_period_cost_dkd(dkd_business_id_value,m.dkd_courier_user_id,dkd_day_start,now())) order by coalesce(p.dkd_courier_online,false) desc,m.dkd_linked_at desc),'[]'::jsonb)
  into dkd_result_value from public.dkd_business_couriers m join auth.users u on u.id=m.dkd_courier_user_id left join public.dkd_profiles p on p.user_id=m.dkd_courier_user_id left join public.dkd_courier_live_locations l on l.courier_user_id=m.dkd_courier_user_id where m.dkd_business_id=dkd_business_id_value and m.dkd_is_active is true;
  return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_business_id_value,'dkd_couriers',dkd_result_value);
end;
$function$;

-- Order listing includes manual-order details needed by the Panel UI.
create or replace function public.dkd_business_orders_dkd(dkd_param_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path to 'public','auth' as $function$
declare dkd_business_id_value uuid:=public.dkd_business_current_id_dkd(); dkd_limit_value integer:=least(greatest(coalesce(dkd_param_limit,100),1),250); dkd_result_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if; if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  select coalesce(jsonb_agg(o order by (o->>'dkd_updated_at')::timestamptz desc),'[]'::jsonb) into dkd_result_value from (
    select jsonb_build_object('dkd_job_id',j.id,'dkd_order_ref',coalesce(nullif(j.dkd_order_ref_text,''),nullif(j.dkd_order_id_text,''),j.id::text),'dkd_title',coalesce(j.title,j.product_title,'Sipariş'),'dkd_pickup',coalesce(j.pickup,''),'dkd_dropoff',coalesce(nullif(j.delivery_address_text,''),nullif(j.dropoff,''),''),'dkd_dropoff_lat',j.dropoff_lat,'dkd_dropoff_lng',j.dropoff_lng,'dkd_status',j.status,'dkd_pickup_status',j.pickup_status,'dkd_customer_charge_tl',j.customer_charge_tl,'dkd_platform_fee_tl',j.fee_tl,'dkd_distance_km',j.distance_km,'dkd_eta_min',j.eta_min,'dkd_created_at',j.created_at,'dkd_updated_at',j.updated_at,'dkd_accepted_at',j.accepted_at,'dkd_picked_up_at',j.picked_up_at,'dkd_completed_at',j.completed_at,'dkd_customer_name',coalesce(j.cargo_meta->>'dkd_customer_name',''),'dkd_customer_phone',coalesce(j.cargo_meta->>'dkd_customer_phone',''),'dkd_delivery_note',coalesce(j.delivery_note,''),'dkd_source',coalesce(j.cargo_meta->>'dkd_source',''),'dkd_courier_user_id',j.assigned_user_id,'dkd_courier_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Atanmadı'),'dkd_courier_plate',coalesce(nullif(u.raw_user_meta_data->>'motorcycle_plate',''),nullif(l.plate_no,''),''),'dkd_courier_online',coalesce(p.dkd_courier_online,false),'dkd_courier_lat',l.lat,'dkd_courier_lng',l.lng,'dkd_courier_heading',l.heading_deg,'dkd_location_updated_at',l.updated_at) o
    from public.dkd_courier_jobs j left join auth.users u on u.id=j.assigned_user_id left join public.dkd_profiles p on p.user_id=j.assigned_user_id left join public.dkd_courier_live_locations l on l.courier_user_id=j.assigned_user_id
    where j.dkd_business_id=dkd_business_id_value or (j.dkd_business_id is null and exists(select 1 from public.dkd_business_couriers m where m.dkd_business_id=dkd_business_id_value and m.dkd_courier_user_id=j.assigned_user_id and j.created_at>=m.dkd_linked_at and j.created_at<coalesce(m.dkd_unlinked_at,'infinity'::timestamptz)))
    order by j.updated_at desc limit dkd_limit_value) q;
  return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_business_id_value,'dkd_orders',dkd_result_value);
end;
$function$;

-- Public courier task RPC remains generic; scoped tasks are visible only to linked couriers.
create or replace function public.dkd_courier_jobs_for_me()
returns setof public.dkd_courier_jobs language plpgsql stable security definer set search_path to 'public','auth' as $function$
declare dkd_user_id_value uuid:=auth.uid(); dkd_user_city_value text:=null; dkd_is_courier_value boolean:=false;
begin
  if dkd_user_id_value is null then return; end if;
  select coalesce(lower(trim(p.courier_status))='approved',false),coalesce(nullif(trim(p.dkd_courier_online_city),''),nullif(trim(p.dkd_city),''),nullif(trim(p.courier_city),'')) into dkd_is_courier_value,dkd_user_city_value from public.dkd_profiles p where p.user_id=dkd_user_id_value;
  if not coalesce(dkd_is_courier_value,false) and not public.dkd_is_admin() then return; end if;
  return query select j.* from public.dkd_courier_jobs j where coalesce(j.is_active,true)=true and lower(coalesce(j.status,'open')) not in ('deleted','admin_deleted','cancelled_by_admin','cancelled','canceled') and (
    j.assigned_user_id=dkd_user_id_value or (j.assigned_user_id is null and lower(coalesce(j.status,'open')) in ('open','ready','published')
    and (j.dkd_business_id is null or exists(select 1 from public.dkd_business_couriers m where m.dkd_business_id=j.dkd_business_id and m.dkd_courier_user_id=dkd_user_id_value and m.dkd_is_active is true))
    and (j.dkd_business_id is not null or dkd_user_city_value is null or nullif(trim(j.dkd_city),'') is null or lower(trim(j.dkd_city))=lower(trim(dkd_user_city_value)))
    and not exists(select 1 from jsonb_array_elements_text(coalesce(j.cargo_meta,'{}'::jsonb)->'dkd_rejected_courier_user_ids') r(v) where r.v=dkd_user_id_value::text)))
  order by case when j.assigned_user_id=dkd_user_id_value then 0 else 1 end,j.updated_at desc nulls last,j.created_at desc nulls last limit 80;
end;
$function$;

-- Owner lock and daily limit are enforced server-side for courier self-service.
create or replace function public.dkd_courier_online_set_dkd(dkd_param_online boolean, dkd_param_country text default 'Türkiye', dkd_param_city text default 'Ankara', dkd_param_region text default '', dkd_param_live_lat numeric default null, dkd_param_live_lng numeric default null)
returns jsonb language plpgsql security definer set search_path to 'public','auth' as $function$
declare
  dkd_user_id_value uuid:=auth.uid(); dkd_next_job_id_value bigint:=null; dkd_active_delivery_job_id_value bigint:=null; dkd_existing_offer_job_id_value bigint:=null;
  dkd_safe_country_value text:=coalesce(nullif(trim(dkd_param_country),''),'Türkiye'); dkd_safe_city_value text:=coalesce(nullif(trim(dkd_param_city),''),'Ankara'); dkd_safe_region_value text:=coalesce(nullif(trim(dkd_param_region),''),'');
  dkd_membership_value public.dkd_business_couriers%rowtype; dkd_has_membership_value boolean:=false; dkd_used_seconds_value bigint:=0;
begin
  if dkd_user_id_value is null then return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','auth_required'); end if;
  insert into public.dkd_profiles(user_id) values(dkd_user_id_value) on conflict(user_id) do nothing;
  select * into dkd_membership_value from public.dkd_business_couriers where dkd_courier_user_id=dkd_user_id_value and dkd_is_active is true order by dkd_linked_at desc limit 1; dkd_has_membership_value:=found;
  if dkd_has_membership_value and dkd_membership_value.dkd_owner_status_locked is true then
    perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value); update public.dkd_profiles set dkd_courier_online=false,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value;
    return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','online_status_locked','dkd_online_value',false,'dkd_status_locked_value',true,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours);
  end if;
  if dkd_has_membership_value and dkd_param_online is true then
    dkd_used_seconds_value:=public.dkd_courier_daily_online_seconds_dkd(dkd_user_id_value,now());
    if dkd_used_seconds_value>=floor(dkd_membership_value.dkd_max_online_hours*3600) then perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value); update public.dkd_profiles set dkd_courier_online=false,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value; return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','max_online_hours_reached','dkd_online_value',false,'dkd_status_locked_value',false,'dkd_today_online_seconds',dkd_used_seconds_value,'dkd_max_online_hours',dkd_membership_value.dkd_max_online_hours); end if;
  end if;
  select j.id into dkd_active_delivery_job_id_value from public.dkd_courier_jobs j where j.assigned_user_id=dkd_user_id_value and coalesce(j.is_active,true)=true and lower(coalesce(j.status,'')) in ('accepted','assigned','to_pickup','picked_up','to_customer','delivering') and lower(coalesce(j.pickup_status,'')) not in ('delivered','cancelled','canceled') order by j.updated_at desc nulls last,j.created_at desc nulls last limit 1;
  if dkd_active_delivery_job_id_value is not null then perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value); update public.dkd_profiles set dkd_courier_online=false,dkd_courier_auto_assigned_job_id=dkd_active_delivery_job_id_value,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value; return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',false,'dkd_has_active_delivery_value',true,'dkd_assigned_job_id',dkd_active_delivery_job_id_value,'assigned_job_id',dkd_active_delivery_job_id_value); end if;
  if dkd_param_online is not true then perform public.dkd_close_courier_online_session_dkd(dkd_user_id_value); update public.dkd_profiles set dkd_courier_online=false,dkd_courier_auto_assigned_job_id=null,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value; return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',false,'dkd_assigned_job_id',null,'assigned_job_id',null); end if;
  if not exists(select 1 from public.dkd_profiles p where p.user_id=dkd_user_id_value and coalesce(p.courier_status,'')='approved') then return jsonb_build_object('dkd_ok_value',false,'dkd_reason_value','courier_not_approved'); end if;
  insert into public.dkd_courier_online_sessions(dkd_user_id,dkd_started_at,dkd_country,dkd_city,dkd_region) select dkd_user_id_value,now(),dkd_safe_country_value,dkd_safe_city_value,dkd_safe_region_value where not exists(select 1 from public.dkd_courier_online_sessions s where s.dkd_user_id=dkd_user_id_value and s.dkd_ended_at is null);
  update public.dkd_profiles set dkd_courier_online=true,dkd_courier_online_country=dkd_safe_country_value,dkd_courier_online_city=dkd_safe_city_value,dkd_courier_online_region=dkd_safe_region_value,dkd_courier_online_lat=dkd_param_live_lat,dkd_courier_online_lng=dkd_param_live_lng,dkd_courier_last_online_at=now() where user_id=dkd_user_id_value;
  select j.id into dkd_existing_offer_job_id_value from public.dkd_courier_jobs j where j.assigned_user_id=dkd_user_id_value and coalesce(j.is_active,true)=true and lower(coalesce(j.status,'')) in ('dkd_auto_assigned','dkd_assigned_offer','courier_offer','auto_assigned','assigned_offer') order by j.updated_at desc nulls last,j.created_at desc nulls last limit 1;
  if dkd_existing_offer_job_id_value is not null then update public.dkd_profiles set dkd_courier_auto_assigned_job_id=dkd_existing_offer_job_id_value where user_id=dkd_user_id_value; return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',true,'dkd_assigned_job_id',dkd_existing_offer_job_id_value,'assigned_job_id',dkd_existing_offer_job_id_value); end if;
  select j.id into dkd_next_job_id_value from public.dkd_courier_jobs j where j.assigned_user_id is null and coalesce(j.is_active,true)=true and lower(coalesce(j.status,'open')) in ('open','ready','published') and (j.dkd_business_id is null or exists(select 1 from public.dkd_business_couriers m where m.dkd_business_id=j.dkd_business_id and m.dkd_courier_user_id=dkd_user_id_value and m.dkd_is_active is true)) and not public.dkd_jsonb_array_has_text_dkd(coalesce(j.cargo_meta,'{}'::jsonb)->'dkd_rejected_courier_user_ids',dkd_user_id_value::text) and (j.dkd_business_id is not null or public.dkd_region_match_dkd(j.dkd_country,j.dkd_city,j.dkd_region,dkd_safe_country_value,dkd_safe_city_value,dkd_safe_region_value)) order by case when dkd_param_live_lat is not null and dkd_param_live_lng is not null and j.pickup_lat is not null and j.pickup_lng is not null then public.dkd_distance_km_between(dkd_param_live_lat,dkd_param_live_lng,j.pickup_lat,j.pickup_lng) else null end asc nulls last,j.updated_at desc nulls last,j.created_at desc limit 1 for update skip locked;
  if dkd_next_job_id_value is not null then update public.dkd_courier_jobs j set assigned_user_id=dkd_user_id_value,status='dkd_assigned_offer',dkd_auto_assigned_at=now(),dkd_assignment_expires_at=now()+interval '4 minutes',cargo_meta=coalesce(j.cargo_meta,'{}'::jsonb)||jsonb_build_object('dkd_auto_assigned_to',dkd_user_id_value::text,'dkd_auto_assigned_at',now()),updated_at=now() where j.id=dkd_next_job_id_value; end if;
  update public.dkd_profiles set dkd_courier_auto_assigned_job_id=dkd_next_job_id_value where user_id=dkd_user_id_value;
  return jsonb_build_object('dkd_ok_value',true,'dkd_online_value',true,'dkd_has_active_delivery_value',false,'dkd_assigned_job_id',dkd_next_job_id_value,'assigned_job_id',dkd_next_job_id_value);
end;
$function$;

-- Acceptance is limited to scoped task membership; cargo behavior remains in the existing production implementation.
-- The live database version of dkd_courier_job_accept(bigint,numeric,numeric) was replaced by this release migration
-- with the same cargo fee logic plus an active-membership predicate for dkd_business_id-scoped jobs.

grant execute on function public.dkd_business_courier_max_hours_set_dkd(uuid,numeric) to authenticated;
grant execute on function public.dkd_business_courier_online_set_dkd(uuid,boolean) to authenticated;
grant execute on function public.dkd_business_order_create_dkd(text,text,text,text,text,text,numeric,numeric,numeric) to authenticated;
grant execute on function public.dkd_business_courier_report_dkd(uuid,date) to authenticated;
grant execute on function public.dkd_business_day_report_dkd(date) to authenticated;
grant execute on function public.dkd_courier_daily_online_seconds_dkd(uuid,timestamptz) to authenticated;
