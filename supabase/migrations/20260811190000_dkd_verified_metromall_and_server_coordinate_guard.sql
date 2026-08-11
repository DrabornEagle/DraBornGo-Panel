-- Production migration mirror: dkd_verified_metromall_and_server_coordinate_guard_20260811
-- The production DB also replaces dkd_business_order_create_dkd and
-- dkd_business_order_dropoff_set_dkd so verified delivery places are server-authoritative.

insert into public.dkd_verified_delivery_places(
  dkd_name,dkd_aliases,dkd_city,dkd_district,dkd_address_text,dkd_lat,dkd_lng,dkd_is_active
)
select
  'Metromall AVM',
  array['Metromall AVM Ankara','MetroMall AVM Ankara','Metromall Ankara','Metromall Alışveriş Merkezi','Metromall Alisveris Merkezi','Metro Mall Ankara'],
  'Ankara','Etimesgut','Tunahan Mah. Dumlupınar 30 Ağustos Cad. No:2/A, Eryaman, 06824 Etimesgut/Ankara',
  39.9836476,32.6110372,true
where not exists (select 1 from public.dkd_verified_delivery_places where lower(dkd_name)=lower('Metromall AVM'));

update public.dkd_verified_delivery_places
set dkd_aliases=array['Metromall AVM Ankara','MetroMall AVM Ankara','Metromall Ankara','Metromall Alışveriş Merkezi','Metromall Alisveris Merkezi','Metro Mall Ankara'],
    dkd_city='Ankara',dkd_district='Etimesgut',
    dkd_address_text='Tunahan Mah. Dumlupınar 30 Ağustos Cad. No:2/A, Eryaman, 06824 Etimesgut/Ankara',
    dkd_lat=39.9836476,dkd_lng=32.6110372,dkd_is_active=true,dkd_updated_at=now()
where lower(dkd_name)=lower('Metromall AVM');

revoke all on function public.dkd_delivery_place_resolve_dkd(text,text) from public, anon;
grant execute on function public.dkd_delivery_place_resolve_dkd(text,text) to authenticated, service_role;
revoke all on function public.dkd_courier_job_live_metrics_set_dkd(bigint,numeric,integer) from public, anon;
grant execute on function public.dkd_courier_job_live_metrics_set_dkd(bigint,numeric,integer) to authenticated, service_role;
revoke all on function public.dkd_business_order_dropoff_set_dkd(bigint,numeric,numeric) from public, anon;
grant execute on function public.dkd_business_order_dropoff_set_dkd(bigint,numeric,numeric) to authenticated, service_role;

update public.dkd_courier_jobs
set dropoff_lat=39.9836476,dropoff_lng=32.6110372,distance_km=0,eta_min=0,
    cargo_meta=coalesce(cargo_meta,'{}'::jsonb)||jsonb_build_object(
      'dkd_dropoff_server_verified',true,
      'dkd_verified_place_name','Metromall AVM',
      'dkd_verified_place_corrected_at',now()
    ),updated_at=now()
where coalesce(is_active,true)=true
  and (lower(coalesce(delivery_address_text,'')) like '%metromall%' or lower(coalesce(dropoff,'')) like '%metromall%');
