-- Applied to DraBornGo production as dkd_verified_metromall_and_server_coordinate_guard_20260811.

do $$
begin
  update public.dkd_verified_delivery_places
     set dkd_aliases=array['Metromall AVM Ankara','MetroMall AVM Ankara','Metromall Ankara','Metromall Alışveriş Merkezi','Metromall Alisveris Merkezi','Metro Mall Ankara'],
         dkd_city='Ankara',
         dkd_district='Etimesgut',
         dkd_address_text='Tunahan Mah. Dumlupınar 30 Ağustos Cad. No:2/A, Eryaman, 06824 Etimesgut/Ankara',
         dkd_lat=39.9836476,
         dkd_lng=32.6110372,
         dkd_is_active=true,
         dkd_updated_at=now()
   where lower(dkd_name)=lower('Metromall AVM');

  if not found then
    insert into public.dkd_verified_delivery_places(
      dkd_name,dkd_aliases,dkd_city,dkd_district,dkd_address_text,dkd_lat,dkd_lng,dkd_is_active
    ) values (
      'Metromall AVM',
      array['Metromall AVM Ankara','MetroMall AVM Ankara','Metromall Ankara','Metromall Alışveriş Merkezi','Metromall Alisveris Merkezi','Metro Mall Ankara'],
      'Ankara','Etimesgut','Tunahan Mah. Dumlupınar 30 Ağustos Cad. No:2/A, Eryaman, 06824 Etimesgut/Ankara',
      39.9836476,32.6110372,true
    );
  end if;
end $$;

create or replace function public.dkd_business_order_create_dkd(
  dkd_param_order_ref text default ''::text,
  dkd_param_title text default 'Sipariş'::text,
  dkd_param_customer_name text default ''::text,
  dkd_param_customer_phone text default ''::text,
  dkd_param_delivery_address text default ''::text,
  dkd_param_delivery_note text default ''::text,
  dkd_param_customer_charge_tl numeric default 0,
  dkd_param_dropoff_lat numeric default null::numeric,
  dkd_param_dropoff_lng numeric default null::numeric
) returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_business_value public.dkd_businesses%rowtype;
  dkd_job_id_value bigint;
  dkd_order_ref_value text := nullif(trim(coalesce(dkd_param_order_ref,'')),'');
  dkd_title_value text := coalesce(nullif(trim(dkd_param_title),''),'Sipariş');
  dkd_delivery_address_value text := nullif(trim(coalesce(dkd_param_delivery_address,'')),'');
  dkd_dropoff_lat_value numeric := dkd_param_dropoff_lat;
  dkd_dropoff_lng_value numeric := dkd_param_dropoff_lng;
  dkd_verified_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_delivery_address_value is null then raise exception 'dkd_delivery_address_required'; end if;
  if coalesce(dkd_param_customer_charge_tl,0)<0 then raise exception 'dkd_order_amount_invalid'; end if;

  select * into dkd_business_value
  from public.dkd_businesses
  where dkd_id=dkd_business_id_value and dkd_is_active is true;
  if not found then raise exception 'dkd_business_required'; end if;

  begin
    dkd_verified_value := public.dkd_delivery_place_resolve_dkd(
      dkd_delivery_address_value,
      nullif(trim(dkd_business_value.dkd_city),'')
    );
    if coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false) then
      dkd_dropoff_lat_value := nullif(dkd_verified_value->>'dkd_lat','')::numeric;
      dkd_dropoff_lng_value := nullif(dkd_verified_value->>'dkd_lng','')::numeric;
    end if;
  exception when others then
    null;
  end;

  if (dkd_dropoff_lat_value is null) <> (dkd_dropoff_lng_value is null) then
    dkd_dropoff_lat_value := null;
    dkd_dropoff_lng_value := null;
  end if;
  if dkd_dropoff_lat_value is not null and (
    dkd_dropoff_lat_value < -90 or dkd_dropoff_lat_value > 90 or
    dkd_dropoff_lng_value < -180 or dkd_dropoff_lng_value > 180 or
    (abs(dkd_dropoff_lat_value)<0.0001 and abs(dkd_dropoff_lng_value)<0.0001)
  ) then
    dkd_dropoff_lat_value := null;
    dkd_dropoff_lng_value := null;
  end if;

  insert into public.dkd_courier_jobs(
    title,product_title,pickup,dropoff,delivery_address_text,delivery_note,
    dropoff_lat,dropoff_lng,fee_tl,distance_km,eta_min,job_type,status,pickup_status,is_active,
    customer_charge_tl,dkd_order_ref_text,dkd_order_id_text,dkd_country,dkd_city,dkd_region,
    dkd_business_id,cargo_meta,created_at,updated_at
  ) values(
    dkd_title_value,dkd_title_value,
    coalesce(nullif(trim(dkd_business_value.dkd_address_text),''),dkd_business_value.dkd_business_name),
    dkd_delivery_address_value,dkd_delivery_address_value,
    nullif(trim(coalesce(dkd_param_delivery_note,'')),''),
    dkd_dropoff_lat_value,dkd_dropoff_lng_value,
    0,0,0,'delivery','open','waiting',true,
    round(coalesce(dkd_param_customer_charge_tl,0),2),dkd_order_ref_value,dkd_order_ref_value,
    'Türkiye',nullif(trim(dkd_business_value.dkd_city),''),nullif(trim(dkd_business_value.dkd_district),''),
    dkd_business_id_value,
    jsonb_build_object(
      'dkd_source','panel_order','dkd_customer_name',trim(coalesce(dkd_param_customer_name,'')),
      'dkd_customer_phone',trim(coalesce(dkd_param_customer_phone,'')),
      'dkd_created_by_user_id',auth.uid()::text,'dkd_created_from_panel',true,
      'dkd_dropoff_server_verified',coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false)
    ),now(),now()
  ) returning id into dkd_job_id_value;

  if dkd_order_ref_value is null then
    dkd_order_ref_value := 'DBG-'||to_char(now() at time zone 'Europe/Istanbul','YYMMDD')||'-'||lpad(dkd_job_id_value::text,6,'0');
    update public.dkd_courier_jobs
       set dkd_order_ref_text=dkd_order_ref_value,dkd_order_id_text=dkd_order_ref_value,updated_at=now()
     where id=dkd_job_id_value;
  end if;

  return jsonb_build_object(
    'dkd_ok_value',true,'dkd_job_id',dkd_job_id_value,'dkd_order_ref',dkd_order_ref_value,
    'dkd_status','open','dkd_dropoff_lat',dkd_dropoff_lat_value,'dkd_dropoff_lng',dkd_dropoff_lng_value,
    'dkd_server_verified',coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false)
  );
end;
$function$;

create or replace function public.dkd_business_order_dropoff_set_dkd(
  dkd_param_job_id bigint,
  dkd_param_dropoff_lat numeric,
  dkd_param_dropoff_lng numeric
) returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_job_value public.dkd_courier_jobs%rowtype;
  dkd_updated_id_value bigint;
  dkd_lat_value numeric := dkd_param_dropoff_lat;
  dkd_lng_value numeric := dkd_param_dropoff_lng;
  dkd_verified_value jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_param_job_id is null then raise exception 'dkd_job_required'; end if;

  select * into dkd_job_value
  from public.dkd_courier_jobs
  where id=dkd_param_job_id and dkd_business_id=dkd_business_id_value;
  if not found then raise exception 'dkd_order_not_found'; end if;

  begin
    dkd_verified_value := public.dkd_delivery_place_resolve_dkd(
      coalesce(nullif(trim(dkd_job_value.delivery_address_text),''),nullif(trim(dkd_job_value.dropoff),'')),
      dkd_job_value.dkd_city
    );
    if coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false) then
      dkd_lat_value := nullif(dkd_verified_value->>'dkd_lat','')::numeric;
      dkd_lng_value := nullif(dkd_verified_value->>'dkd_lng','')::numeric;
    end if;
  exception when others then
    null;
  end;

  if dkd_lat_value is null or dkd_lng_value is null
     or dkd_lat_value < -90 or dkd_lat_value > 90
     or dkd_lng_value < -180 or dkd_lng_value > 180
     or (abs(dkd_lat_value)<0.0001 and abs(dkd_lng_value)<0.0001) then
    raise exception 'dkd_dropoff_coordinate_invalid';
  end if;

  update public.dkd_courier_jobs
     set dropoff_lat=round(dkd_lat_value,7),
         dropoff_lng=round(dkd_lng_value,7),
         distance_km=case when coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false) then 0 else distance_km end,
         eta_min=case when coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false) then 0 else eta_min end,
         cargo_meta=coalesce(cargo_meta,'{}'::jsonb)||jsonb_build_object(
           'dkd_dropoff_resolved_by_panel',true,
           'dkd_dropoff_server_verified',coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false),
           'dkd_dropoff_resolved_at',now()
         ),
         updated_at=now()
   where id=dkd_param_job_id and dkd_business_id=dkd_business_id_value
  returning id into dkd_updated_id_value;

  if dkd_updated_id_value is null then raise exception 'dkd_order_not_found'; end if;
  return jsonb_build_object(
    'dkd_ok_value',true,'dkd_job_id',dkd_updated_id_value,
    'dkd_dropoff_lat',round(dkd_lat_value,7),'dkd_dropoff_lng',round(dkd_lng_value,7),
    'dkd_server_verified',coalesce((dkd_verified_value->>'dkd_ok_value')::boolean,false)
  );
end;
$function$;

revoke all on function public.dkd_delivery_place_resolve_dkd(text,text) from public, anon;
grant execute on function public.dkd_delivery_place_resolve_dkd(text,text) to authenticated, service_role;
revoke all on function public.dkd_courier_job_live_metrics_set_dkd(bigint,numeric,integer) from public, anon;
grant execute on function public.dkd_courier_job_live_metrics_set_dkd(bigint,numeric,integer) to authenticated, service_role;
revoke all on function public.dkd_business_order_dropoff_set_dkd(bigint,numeric,numeric) from public, anon;
grant execute on function public.dkd_business_order_dropoff_set_dkd(bigint,numeric,numeric) to authenticated, service_role;

update public.dkd_courier_jobs
   set dropoff_lat=39.9836476,
       dropoff_lng=32.6110372,
       distance_km=0,
       eta_min=0,
       cargo_meta=coalesce(cargo_meta,'{}'::jsonb)||jsonb_build_object(
         'dkd_dropoff_server_verified',true,
         'dkd_verified_place_name','Metromall AVM',
         'dkd_verified_place_corrected_at',now()
       ),
       updated_at=now()
 where coalesce(is_active,true)=true
   and (lower(coalesce(delivery_address_text,'')) like '%metromall%' or lower(coalesce(dropoff,'')) like '%metromall%');
