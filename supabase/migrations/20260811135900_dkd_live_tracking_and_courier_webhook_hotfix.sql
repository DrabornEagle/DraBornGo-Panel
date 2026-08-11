create table if not exists public.dkd_internal_webhook_config (
  dkd_key text primary key,
  dkd_url text not null,
  dkd_secret text not null default encode(gen_random_bytes(32),'hex'),
  dkd_updated_at timestamptz not null default now()
);

alter table public.dkd_internal_webhook_config enable row level security;
revoke all on table public.dkd_internal_webhook_config from anon, authenticated;
grant select on table public.dkd_internal_webhook_config to service_role;

insert into public.dkd_internal_webhook_config(dkd_key,dkd_url)
values ('courier_order_alert','https://guuwomvszlwhkmstewfl.supabase.co/functions/v1/send-courier-order-alert')
on conflict (dkd_key) do update set dkd_url=excluded.dkd_url, dkd_updated_at=now();

create or replace function public.dkd_business_order_dropoff_set_dkd(
  dkd_param_job_id bigint,
  dkd_param_dropoff_lat numeric,
  dkd_param_dropoff_lng numeric
) returns jsonb
language plpgsql
security definer
set search_path='public','auth'
as $function$
declare
  dkd_business_id_value uuid := public.dkd_business_current_id_dkd();
  dkd_updated_id_value bigint;
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if dkd_param_job_id is null then raise exception 'dkd_job_required'; end if;
  if dkd_param_dropoff_lat is null or dkd_param_dropoff_lng is null
     or dkd_param_dropoff_lat < -90 or dkd_param_dropoff_lat > 90
     or dkd_param_dropoff_lng < -180 or dkd_param_dropoff_lng > 180 then
    raise exception 'dkd_dropoff_coordinate_invalid';
  end if;

  update public.dkd_courier_jobs
     set dropoff_lat=round(dkd_param_dropoff_lat,7),
         dropoff_lng=round(dkd_param_dropoff_lng,7),
         cargo_meta=coalesce(cargo_meta,'{}'::jsonb)||jsonb_build_object(
           'dkd_dropoff_resolved_by_panel',true,
           'dkd_dropoff_resolved_at',now()
         ),
         updated_at=now()
   where id=dkd_param_job_id
     and dkd_business_id=dkd_business_id_value
  returning id into dkd_updated_id_value;

  if dkd_updated_id_value is null then raise exception 'dkd_order_not_found'; end if;
  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_job_id',dkd_updated_id_value,
    'dkd_dropoff_lat',round(dkd_param_dropoff_lat,7),
    'dkd_dropoff_lng',round(dkd_param_dropoff_lng,7)
  );
end;
$function$;

grant execute on function public.dkd_business_order_dropoff_set_dkd(bigint,numeric,numeric) to authenticated;

create or replace function public.dkd_courier_order_alert_webhook()
returns trigger
language plpgsql
security definer
set search_path='public'
as $function$
declare
  dkd_config_value public.dkd_internal_webhook_config%rowtype;
  dkd_event_value text := '';
  dkd_old_status_value text := '';
  dkd_new_status_value text := lower(coalesce(new.status,''));
  dkd_old_pickup_value text := '';
  dkd_new_pickup_value text := lower(coalesce(new.pickup_status,''));
begin
  select * into dkd_config_value
  from public.dkd_internal_webhook_config
  where dkd_key='courier_order_alert';

  if not found or coalesce(dkd_config_value.dkd_url,'')='' or coalesce(dkd_config_value.dkd_secret,'')='' then
    return new;
  end if;

  if tg_op='INSERT' then
    if coalesce(new.is_active,true)=true
       and dkd_new_status_value in ('open','ready','published','pending','courier_pool','new','waiting')
       and new.assigned_user_id is null then
      dkd_event_value := 'new_order';
    else
      return new;
    end if;
  elsif tg_op='UPDATE' then
    dkd_old_status_value := lower(coalesce(old.status,''));
    dkd_old_pickup_value := lower(coalesce(old.pickup_status,''));
    if (dkd_new_status_value in ('completed','delivered','done','finished') or dkd_new_pickup_value in ('delivered','completed'))
       and not (dkd_old_status_value in ('completed','delivered','done','finished') or dkd_old_pickup_value in ('delivered','completed')) then
      dkd_event_value := 'delivered';
    elsif dkd_new_status_value in ('accepted','assigned','to_pickup')
       and dkd_old_status_value not in ('accepted','assigned','to_pickup') then
      dkd_event_value := 'accepted';
    else
      return new;
    end if;
  else
    return new;
  end if;

  perform net.http_post(
    url := dkd_config_value.dkd_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-dkd-webhook-secret',dkd_config_value.dkd_secret
    ),
    body := jsonb_build_object(
      'type',tg_op,
      'table',tg_table_name,
      'schema',tg_table_schema,
      'event',dkd_event_value,
      'record',to_jsonb(new),
      'old_record',case when tg_op='UPDATE' then to_jsonb(old) else null end
    ),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new;
end;
$function$;

drop trigger if exists dkd_courier_job_push_open on public.dkd_courier_jobs;
drop trigger if exists dkd_courier_jobs_alert_webhook_insert on public.dkd_courier_jobs;
create trigger dkd_courier_jobs_alert_webhook_insert
after insert on public.dkd_courier_jobs
for each row execute function public.dkd_courier_order_alert_webhook();

drop trigger if exists dkd_courier_jobs_alert_webhook_update on public.dkd_courier_jobs;
create trigger dkd_courier_jobs_alert_webhook_update
after update of status,pickup_status,assigned_user_id,job_type,is_active on public.dkd_courier_jobs
for each row
when (
  (old.status is distinct from new.status)
  or (old.pickup_status is distinct from new.pickup_status)
  or (old.assigned_user_id is distinct from new.assigned_user_id)
  or (old.job_type is distinct from new.job_type)
  or (old.is_active is distinct from new.is_active)
)
execute function public.dkd_courier_order_alert_webhook();
