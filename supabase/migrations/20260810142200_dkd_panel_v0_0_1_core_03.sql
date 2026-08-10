create or replace function public.dkd_business_courier_rate_set_dkd(
  dkd_param_courier_user_id uuid,
  dkd_param_package_fee_tl numeric,
  dkd_param_hourly_rate_tl numeric
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
  dkd_effective_at_value timestamptz := now();
begin
  if dkd_owner_user_id_value is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if coalesce(dkd_param_package_fee_tl,0) < 0 or coalesce(dkd_param_hourly_rate_tl,0) < 0 then raise exception 'dkd_rate_invalid'; end if;

  select * into dkd_membership_row
  from public.dkd_business_couriers
  where dkd_business_id=dkd_business_id_value
    and dkd_courier_user_id=dkd_param_courier_user_id
    and dkd_is_active is true
  limit 1 for update;
  if not found then raise exception 'dkd_membership_not_found'; end if;

  update public.dkd_business_courier_rate_history
     set dkd_effective_to = dkd_effective_at_value
   where dkd_membership_id = dkd_membership_row.dkd_id
     and dkd_effective_to is null;

  update public.dkd_business_couriers
     set dkd_package_fee_tl = round(coalesce(dkd_param_package_fee_tl,0),2),
         dkd_hourly_rate_tl = round(coalesce(dkd_param_hourly_rate_tl,0),2),
         dkd_updated_at = dkd_effective_at_value
   where dkd_id = dkd_membership_row.dkd_id
   returning * into dkd_membership_row;

  insert into public.dkd_business_courier_rate_history(
    dkd_membership_id, dkd_business_id, dkd_courier_user_id,
    dkd_package_fee_tl, dkd_hourly_rate_tl, dkd_effective_from, dkd_created_by_user_id
  ) values (
    dkd_membership_row.dkd_id, dkd_business_id_value, dkd_param_courier_user_id,
    dkd_membership_row.dkd_package_fee_tl, dkd_membership_row.dkd_hourly_rate_tl,
    dkd_effective_at_value, dkd_owner_user_id_value
  );

  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_package_fee_tl',dkd_membership_row.dkd_package_fee_tl,
    'dkd_hourly_rate_tl',dkd_membership_row.dkd_hourly_rate_tl,
    'dkd_effective_from',dkd_effective_at_value
  );
end;
$function$;

create or replace function public.dkd_business_courier_unlink_dkd(dkd_param_courier_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_membership_id_value uuid;
  dkd_unlinked_at_value timestamptz := now();
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;

  select dkd_id into dkd_membership_id_value
  from public.dkd_business_couriers
  where dkd_business_id=dkd_business_id_value
    and dkd_courier_user_id=dkd_param_courier_user_id
    and dkd_is_active is true
  limit 1 for update;
  if dkd_membership_id_value is null then raise exception 'dkd_membership_not_found'; end if;

  update public.dkd_business_courier_rate_history
     set dkd_effective_to = dkd_unlinked_at_value
   where dkd_membership_id=dkd_membership_id_value and dkd_effective_to is null;

  update public.dkd_business_couriers
     set dkd_is_active=false, dkd_unlinked_at=dkd_unlinked_at_value, dkd_updated_at=dkd_unlinked_at_value
   where dkd_id=dkd_membership_id_value;

  return jsonb_build_object('dkd_ok_value',true,'dkd_unlinked_at',dkd_unlinked_at_value);
end;
$function$;

create or replace function public.dkd_courier_identity_register_dkd(dkd_param_tc text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','extensions'
as $function$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_tc_value text := regexp_replace(coalesce(dkd_param_tc,''),'[^0-9]','','g');
  dkd_digits integer[];
  dkd_digit10 integer;
  dkd_digit11 integer;
begin
  if dkd_user_id_value is null then raise exception 'dkd_auth_required'; end if;
  if not exists(select 1 from public.dkd_profiles where user_id=dkd_user_id_value and courier_status='approved') then
    raise exception 'dkd_courier_not_approved';
  end if;
  if char_length(dkd_tc_value) <> 11 or left(dkd_tc_value,1)='0' then raise exception 'dkd_tc_invalid'; end if;
  dkd_digits := array(select substr(dkd_tc_value, dkd_index_value, 1)::integer from generate_series(1,11) dkd_index_value);
  dkd_digit10 := ((dkd_digits[1]+dkd_digits[3]+dkd_digits[5]+dkd_digits[7]+dkd_digits[9])*7 - (dkd_digits[2]+dkd_digits[4]+dkd_digits[6]+dkd_digits[8])) % 10;
  if dkd_digit10 < 0 then dkd_digit10 := dkd_digit10 + 10; end if;
  dkd_digit11 := (dkd_digits[1]+dkd_digits[2]+dkd_digits[3]+dkd_digits[4]+dkd_digits[5]+dkd_digits[6]+dkd_digits[7]+dkd_digits[8]+dkd_digits[9]+dkd_digits[10]) % 10;
  if dkd_digits[10] <> dkd_digit10 or dkd_digits[11] <> dkd_digit11 then raise exception 'dkd_tc_invalid'; end if;

  insert into public.dkd_courier_identity_lookup(
    dkd_courier_user_id, dkd_national_id_bcrypt, dkd_national_id_last4, dkd_verified_at, dkd_updated_at
  ) values (
    dkd_user_id_value, extensions.crypt(dkd_tc_value, extensions.gen_salt('bf',10)), right(dkd_tc_value,4), now(), now()
  ) on conflict (dkd_courier_user_id) do update set
    dkd_national_id_bcrypt=excluded.dkd_national_id_bcrypt,
    dkd_national_id_last4=excluded.dkd_national_id_last4,
    dkd_verified_at=now(),
    dkd_updated_at=now();

  return jsonb_build_object('dkd_ok_value',true,'dkd_last4',right(dkd_tc_value,4));
end;
$function$;

create or replace function public.dkd_business_courier_period_cost_dkd(
  dkd_param_business_id uuid,
  dkd_param_courier_user_id uuid,
  dkd_param_start_at timestamptz,
  dkd_param_end_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_package_count_value bigint := 0;
  dkd_package_earnings_value numeric := 0;
  dkd_online_seconds_value numeric := 0;
  dkd_hourly_earnings_value numeric := 0;
  dkd_delivery_seconds_value numeric := 0;
  dkd_current_package_fee_value numeric := 0;
  dkd_current_hourly_rate_value numeric := 0;
begin
  if dkd_param_start_at is null or dkd_param_end_at is null or dkd_param_end_at <= dkd_param_start_at then
    return jsonb_build_object('dkd_earnings_tl',0,'dkd_completed_jobs',0,'dkd_online_seconds',0,'dkd_online_hours',0,'dkd_delivery_seconds',0,'dkd_hourly_basis_seconds',0,'dkd_hourly_tl',0,'dkd_package_earnings_tl',0,'dkd_hourly_earnings_tl',0);
  end if;

  select coalesce(dkd_membership_value.dkd_package_fee_tl,0), coalesce(dkd_membership_value.dkd_hourly_rate_tl,0)
    into dkd_current_package_fee_value, dkd_current_hourly_rate_value
  from public.dkd_business_couriers dkd_membership_value
  where dkd_membership_value.dkd_business_id=dkd_param_business_id
    and dkd_membership_value.dkd_courier_user_id=dkd_param_courier_user_id
  order by dkd_membership_value.dkd_linked_at desc limit 1;

  select
    count(*),
    coalesce(sum(coalesce(dkd_rate_value.dkd_package_fee_tl, dkd_membership_value.dkd_package_fee_tl, 0)),0),
    coalesce(sum(greatest(0,extract(epoch from (
      least(coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at), dkd_param_end_at)
      - greatest(coalesce(dkd_job_value.accepted_at,dkd_job_value.picked_up_at,dkd_job_value.created_at), dkd_param_start_at)
    )))),0)
  into dkd_package_count_value, dkd_package_earnings_value, dkd_delivery_seconds_value
  from public.dkd_courier_jobs dkd_job_value
  join public.dkd_business_couriers dkd_membership_value
    on dkd_membership_value.dkd_business_id=dkd_param_business_id
   and dkd_membership_value.dkd_courier_user_id=dkd_param_courier_user_id
   and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at) >= dkd_membership_value.dkd_linked_at
   and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at) < coalesce(dkd_membership_value.dkd_unlinked_at,'infinity'::timestamptz)
  left join lateral (
    select dkd_rate_history_value.dkd_package_fee_tl
    from public.dkd_business_courier_rate_history dkd_rate_history_value
    where dkd_rate_history_value.dkd_membership_id=dkd_membership_value.dkd_id
      and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at) >= dkd_rate_history_value.dkd_effective_from
      and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at) < coalesce(dkd_rate_history_value.dkd_effective_to,'infinity'::timestamptz)
    order by dkd_rate_history_value.dkd_effective_from desc limit 1
  ) dkd_rate_value on true
  where dkd_job_value.assigned_user_id=dkd_param_courier_user_id
    and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)>=dkd_param_start_at
    and coalesce(dkd_job_value.completed_at,dkd_job_value.updated_at)<dkd_param_end_at
    and (dkd_job_value.completed_at is not null or lower(coalesce(dkd_job_value.status,'')) in ('completed','delivered'))
    and (dkd_job_value.dkd_business_id=dkd_param_business_id or dkd_job_value.dkd_business_id is null);

  select
    coalesce(sum(dkd_overlap_value.dkd_overlap_seconds),0),
    coalesce(sum((dkd_overlap_value.dkd_overlap_seconds/3600.0) * dkd_overlap_value.dkd_hourly_rate_tl),0)
  into dkd_online_seconds_value, dkd_hourly_earnings_value
  from (
    select
      greatest(0,extract(epoch from (
        least(coalesce(dkd_session_value.dkd_ended_at,now()), dkd_param_end_at, coalesce(dkd_membership_value.dkd_unlinked_at,'infinity'::timestamptz), coalesce(dkd_rate_value.dkd_effective_to,'infinity'::timestamptz))
        - greatest(dkd_session_value.dkd_started_at, dkd_param_start_at, dkd_membership_value.dkd_linked_at, dkd_rate_value.dkd_effective_from)
      ))) as dkd_overlap_seconds,
      coalesce(dkd_rate_value.dkd_hourly_rate_tl,0) as dkd_hourly_rate_tl
    from public.dkd_courier_online_sessions dkd_session_value
    join public.dkd_business_couriers dkd_membership_value
      on dkd_membership_value.dkd_business_id=dkd_param_business_id
     and dkd_membership_value.dkd_courier_user_id=dkd_param_courier_user_id
     and dkd_session_value.dkd_started_at < coalesce(dkd_membership_value.dkd_unlinked_at,'infinity'::timestamptz)
     and coalesce(dkd_session_value.dkd_ended_at,now()) > dkd_membership_value.dkd_linked_at
    join public.dkd_business_courier_rate_history dkd_rate_value
      on dkd_rate_value.dkd_membership_id=dkd_membership_value.dkd_id
     and dkd_session_value.dkd_started_at < coalesce(dkd_rate_value.dkd_effective_to,'infinity'::timestamptz)
     and coalesce(dkd_session_value.dkd_ended_at,now()) > dkd_rate_value.dkd_effective_from
    where dkd_session_value.dkd_user_id=dkd_param_courier_user_id
      and dkd_session_value.dkd_started_at<dkd_param_end_at
      and coalesce(dkd_session_value.dkd_ended_at,now())>dkd_param_start_at
  ) dkd_overlap_value
  where dkd_overlap_value.dkd_overlap_seconds > 0;

  return jsonb_build_object(
    'dkd_earnings_tl', round(coalesce(dkd_package_earnings_value,0)+coalesce(dkd_hourly_earnings_value,0),2),
    'dkd_completed_jobs', coalesce(dkd_package_count_value,0),
    'dkd_online_seconds', floor(coalesce(dkd_online_seconds_value,0)),
    'dkd_online_hours', round(coalesce(dkd_online_seconds_value,0)/3600.0,2),
    'dkd_delivery_seconds', floor(coalesce(dkd_delivery_seconds_value,0)),
    'dkd_hourly_basis_seconds', floor(coalesce(dkd_online_seconds_value,0)),
    'dkd_hourly_tl', round(coalesce(dkd_current_hourly_rate_value,0),2),
    'dkd_package_fee_tl', round(coalesce(dkd_current_package_fee_value,0),2),
    'dkd_fixed_hourly_rate_tl', round(coalesce(dkd_current_hourly_rate_value,0),2),
    'dkd_package_earnings_tl', round(coalesce(dkd_package_earnings_value,0),2),
    'dkd_hourly_earnings_tl', round(coalesce(dkd_hourly_earnings_value,0),2)
  );
end;
$function$;
