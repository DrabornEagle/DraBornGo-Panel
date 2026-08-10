-- DraBornGo Panel v0.0.1
-- Business owners may stop a linked courier's online work session without cancelling an accepted delivery.

create or replace function public.dkd_business_courier_force_offline_dkd(
  dkd_param_courier_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $function$
declare
  dkd_owner_user_id_value uuid := auth.uid();
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_active_delivery_job_id_value bigint := null;
  dkd_released_offer_count_value integer := 0;
begin
  if dkd_owner_user_id_value is null then
    raise exception 'dkd_auth_required';
  end if;
  if dkd_business_id_value is null then
    raise exception 'dkd_business_required';
  end if;
  if dkd_param_courier_user_id is null then
    raise exception 'dkd_courier_required';
  end if;

  if not exists (
    select 1
    from public.dkd_business_couriers dkd_membership_value
    where dkd_membership_value.dkd_business_id = dkd_business_id_value
      and dkd_membership_value.dkd_courier_user_id = dkd_param_courier_user_id
      and dkd_membership_value.dkd_is_active is true
  ) then
    raise exception 'dkd_membership_not_found';
  end if;

  -- Accepted/in-progress deliveries are preserved. The courier simply stops receiving new work
  -- and the hourly work-session clock stops at this exact moment.
  select dkd_job_value.id
    into dkd_active_delivery_job_id_value
  from public.dkd_courier_jobs dkd_job_value
  where dkd_job_value.assigned_user_id = dkd_param_courier_user_id
    and coalesce(dkd_job_value.is_active,true) is true
    and lower(coalesce(dkd_job_value.status,'')) in (
      'accepted','assigned','to_pickup','picked_up','to_customer','delivering'
    )
    and lower(coalesce(dkd_job_value.pickup_status,'')) not in ('delivered','cancelled','canceled')
  order by dkd_job_value.updated_at desc nulls last, dkd_job_value.created_at desc nulls last
  limit 1;

  -- Unaccepted automatic offers are returned to the pool so an offline courier is not holding work.
  update public.dkd_courier_jobs dkd_job_value
     set assigned_user_id = null,
         status = 'open',
         dkd_auto_assigned_at = null,
         dkd_assignment_expires_at = null,
         cargo_meta = (coalesce(dkd_job_value.cargo_meta,'{}'::jsonb)
                       - 'dkd_auto_assigned_to'
                       - 'dkd_auto_assigned_at'),
         updated_at = now()
   where dkd_job_value.assigned_user_id = dkd_param_courier_user_id
     and coalesce(dkd_job_value.is_active,true) is true
     and lower(coalesce(dkd_job_value.status,'')) in (
       'dkd_auto_assigned','dkd_assigned_offer','courier_offer','auto_assigned','assigned_offer'
     );
  get diagnostics dkd_released_offer_count_value = row_count;

  perform public.dkd_close_courier_online_session_dkd(dkd_param_courier_user_id);

  update public.dkd_profiles
     set dkd_courier_online = false,
         dkd_courier_auto_assigned_job_id = dkd_active_delivery_job_id_value,
         dkd_courier_last_online_at = now()
   where user_id = dkd_param_courier_user_id;

  return jsonb_build_object(
    'dkd_ok_value', true,
    'dkd_online_value', false,
    'dkd_courier_user_id', dkd_param_courier_user_id,
    'dkd_business_id', dkd_business_id_value,
    'dkd_active_delivery_preserved', dkd_active_delivery_job_id_value is not null,
    'dkd_active_delivery_job_id', dkd_active_delivery_job_id_value,
    'dkd_released_offer_count', dkd_released_offer_count_value,
    'dkd_forced_offline_at', now()
  );
end;
$function$;

revoke all on function public.dkd_business_courier_force_offline_dkd(uuid) from public;
revoke all on function public.dkd_business_courier_force_offline_dkd(uuid) from anon;
grant execute on function public.dkd_business_courier_force_offline_dkd(uuid) to authenticated;
