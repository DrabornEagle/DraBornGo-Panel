-- DraBornGo Panel v0.0.2 realtime/report-detail production migration.
-- Already applied to production Supabase project guuwomvszlwhkmstewfl.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='dkd_business_couriers'
  ) then
    alter publication supabase_realtime add table public.dkd_business_couriers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='dkd_courier_online_sessions'
  ) then
    alter publication supabase_realtime add table public.dkd_courier_online_sessions;
  end if;
end $$;

create or replace function public.dkd_business_day_report_dkd(dkd_param_day date)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_day_value date := coalesce(dkd_param_day, (now() at time zone 'Europe/Istanbul')::date);
  dkd_start_value timestamptz := (dkd_day_value::timestamp at time zone 'Europe/Istanbul');
  dkd_end_value timestamptz := ((dkd_day_value + 1)::timestamp at time zone 'Europe/Istanbul');
  dkd_gross_value numeric := 0;
  dkd_courier_cost_value numeric := 0;
  dkd_completed_count_value bigint := 0;
  dkd_orders_value jsonb := '[]'::jsonb;
  dkd_couriers_value jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;

  select count(*), coalesce(sum(coalesce(dkd_job_value.customer_charge_tl,0)),0)
  into dkd_completed_count_value, dkd_gross_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.dkd_business_id = dkd_business_id_value
    and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
    and coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at) >= dkd_start_value
    and coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at) < dkd_end_value;

  select coalesce(sum((public.dkd_business_courier_period_cost_dkd(
    dkd_business_id_value,
    dkd_membership_value.dkd_courier_user_id,
    dkd_start_value,
    least(dkd_end_value, now())
  )->>'dkd_earnings_tl')::numeric),0)
  into dkd_courier_cost_value
  from public.dkd_business_couriers dkd_membership_value
  where dkd_membership_value.dkd_business_id = dkd_business_id_value
    and dkd_membership_value.dkd_linked_at < dkd_end_value
    and coalesce(dkd_membership_value.dkd_unlinked_at, 'infinity'::timestamptz) > dkd_start_value;

  select coalesce(jsonb_agg(jsonb_build_object(
    'dkd_job_id', dkd_job_value.id,
    'dkd_order_ref', coalesce(nullif(dkd_job_value.dkd_order_ref_text,''), nullif(dkd_job_value.dkd_order_id_text,''), dkd_job_value.id::text),
    'dkd_title', coalesce(dkd_job_value.title, dkd_job_value.product_title, 'Sipariş'),
    'dkd_amount_tl', coalesce(dkd_job_value.customer_charge_tl,0),
    'dkd_customer_charge_tl', coalesce(dkd_job_value.customer_charge_tl,0),
    'dkd_courier_fee_tl', coalesce(dkd_job_value.fee_tl,0),
    'dkd_status', coalesce(dkd_job_value.status,''),
    'dkd_pickup_status', coalesce(dkd_job_value.pickup_status,''),
    'dkd_pickup', coalesce(dkd_job_value.pickup,''),
    'dkd_dropoff', coalesce(nullif(dkd_job_value.delivery_address_text,''), nullif(dkd_job_value.dropoff,''), ''),
    'dkd_delivery_note', coalesce(dkd_job_value.delivery_note,''),
    'dkd_customer_name', coalesce(dkd_job_value.cargo_meta->>'dkd_customer_name',''),
    'dkd_customer_phone', coalesce(dkd_job_value.cargo_meta->>'dkd_customer_phone',''),
    'dkd_distance_km', coalesce(dkd_job_value.distance_km,0),
    'dkd_eta_min', coalesce(dkd_job_value.eta_min,0),
    'dkd_created_at', dkd_job_value.created_at,
    'dkd_accepted_at', dkd_job_value.accepted_at,
    'dkd_picked_up_at', dkd_job_value.picked_up_at,
    'dkd_completed_at', coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at),
    'dkd_courier_user_id', dkd_job_value.assigned_user_id,
    'dkd_courier_name', coalesce(
      nullif(dkd_user_value.raw_user_meta_data->>'dkd_full_name',''),
      nullif(dkd_user_value.raw_user_meta_data->>'full_name',''),
      nullif(dkd_profile_value.nickname,''),
      'Kurye'
    ),
    'dkd_courier_plate', coalesce(
      nullif(dkd_user_value.raw_user_meta_data->>'motorcycle_plate',''),
      nullif(dkd_live_value.plate_no,''),
      ''
    )
  ) order by coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at) desc), '[]'::jsonb)
  into dkd_orders_value
  from public.dkd_courier_jobs dkd_job_value
  left join auth.users dkd_user_value on dkd_user_value.id = dkd_job_value.assigned_user_id
  left join public.dkd_profiles dkd_profile_value on dkd_profile_value.user_id = dkd_job_value.assigned_user_id
  left join public.dkd_courier_live_locations dkd_live_value on dkd_live_value.courier_user_id = dkd_job_value.assigned_user_id
  where dkd_job_value.dkd_business_id = dkd_business_id_value
    and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
    and coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at) >= dkd_start_value
    and coalesce(dkd_job_value.completed_at, dkd_job_value.updated_at) < dkd_end_value;

  select coalesce(jsonb_agg(jsonb_build_object(
    'dkd_courier_user_id', dkd_membership_value.dkd_courier_user_id,
    'dkd_display_name', coalesce(
      nullif(dkd_user_value.raw_user_meta_data->>'dkd_full_name',''),
      nullif(dkd_user_value.raw_user_meta_data->>'full_name',''),
      nullif(dkd_profile_value.nickname,''),
      'Kurye'
    ),
    'dkd_cost', public.dkd_business_courier_period_cost_dkd(
      dkd_business_id_value,
      dkd_membership_value.dkd_courier_user_id,
      dkd_start_value,
      least(dkd_end_value, now())
    )
  ) order by 2), '[]'::jsonb)
  into dkd_couriers_value
  from public.dkd_business_couriers dkd_membership_value
  join auth.users dkd_user_value on dkd_user_value.id = dkd_membership_value.dkd_courier_user_id
  left join public.dkd_profiles dkd_profile_value on dkd_profile_value.user_id = dkd_membership_value.dkd_courier_user_id
  where dkd_membership_value.dkd_business_id = dkd_business_id_value
    and dkd_membership_value.dkd_linked_at < dkd_end_value
    and coalesce(dkd_membership_value.dkd_unlinked_at, 'infinity'::timestamptz) > dkd_start_value;

  return jsonb_build_object(
    'dkd_ok_value', true,
    'dkd_day', dkd_day_value,
    'dkd_gross_tl', round(dkd_gross_value,2),
    'dkd_courier_cost_tl', round(dkd_courier_cost_value,2),
    'dkd_net_tl', round(dkd_gross_value - dkd_courier_cost_value,2),
    'dkd_completed_orders', dkd_completed_count_value,
    'dkd_orders', dkd_orders_value,
    'dkd_couriers', dkd_couriers_value
  );
end;
$function$;
