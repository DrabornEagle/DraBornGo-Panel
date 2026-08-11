alter table public.dkd_platform_billing_config
  alter column dkd_account_name set default 'Doğancan Kartal';

update public.dkd_platform_billing_config
set dkd_account_name='Doğancan Kartal', dkd_updated_at=now()
where dkd_singleton=true;

create or replace function public.dkd_platform_fee_capture_job_dkd()
returns trigger
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  dkd_agreement_value public.dkd_platform_fee_agreements%rowtype;
  dkd_completed_at_value timestamptz;
  dkd_base_value numeric := 0;
  dkd_fee_value numeric := 0;
begin
  if new.dkd_business_id is null then return new; end if;
  if not (
    new.completed_at is not null
    or lower(coalesce(new.status,'')) in ('completed','delivered','done','finished')
    or lower(coalesce(new.pickup_status,'')) in ('delivered','completed')
  ) then return new; end if;

  dkd_completed_at_value := coalesce(new.completed_at,new.updated_at,now());

  select * into dkd_agreement_value
  from public.dkd_platform_fee_agreements dkd_agreement
  where dkd_agreement.dkd_business_id=new.dkd_business_id
    and dkd_agreement.dkd_is_active=true
    and dkd_agreement.dkd_effective_from<=dkd_completed_at_value
  limit 1;

  if not found then return new; end if;

  dkd_base_value := greatest(coalesce(new.customer_charge_tl,new.fee_tl,0),0);
  if dkd_agreement_value.dkd_fee_mode='percentage' then
    dkd_fee_value := round(dkd_base_value * dkd_agreement_value.dkd_fee_value / 100.0,2);
  else
    dkd_fee_value := round(dkd_agreement_value.dkd_fee_value,2);
  end if;

  insert into public.dkd_platform_fee_ledger(
    dkd_job_id,dkd_business_id,dkd_courier_user_id,dkd_completed_at,
    dkd_fee_mode,dkd_fee_value,dkd_fee_base_tl,dkd_platform_fee_tl
  ) values(
    new.id,new.dkd_business_id,new.assigned_user_id,dkd_completed_at_value,
    dkd_agreement_value.dkd_fee_mode,dkd_agreement_value.dkd_fee_value,
    dkd_base_value,dkd_fee_value
  )
  on conflict (dkd_job_id) do update set
    dkd_business_id=excluded.dkd_business_id,
    dkd_courier_user_id=excluded.dkd_courier_user_id,
    dkd_completed_at=excluded.dkd_completed_at,
    dkd_fee_mode=excluded.dkd_fee_mode,
    dkd_fee_value=excluded.dkd_fee_value,
    dkd_fee_base_tl=excluded.dkd_fee_base_tl,
    dkd_platform_fee_tl=excluded.dkd_platform_fee_tl;

  return new;
end;
$$;

revoke all on function public.dkd_platform_fee_capture_job_dkd() from public,anon,authenticated;

create or replace function public.dkd_admin_platform_iban_set_dkd(
  dkd_param_iban text,
  dkd_param_account_name text default 'Doğancan Kartal'
)
returns jsonb
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  dkd_iban_value text:=upper(replace(trim(coalesce(dkd_param_iban,'')),' ',''));
  dkd_account_name_value text:=coalesce(nullif(trim(dkd_param_account_name),''),'Doğancan Kartal');
begin
  if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
  if dkd_iban_value<>'' and (length(dkd_iban_value)<15 or length(dkd_iban_value)>34) then raise exception 'dkd_iban_invalid'; end if;

  insert into public.dkd_platform_billing_config(
    dkd_singleton,dkd_iban,dkd_account_name,dkd_updated_by_user_id,dkd_updated_at
  ) values(
    true,dkd_iban_value,dkd_account_name_value,auth.uid(),now()
  )
  on conflict (dkd_singleton) do update set
    dkd_iban=excluded.dkd_iban,
    dkd_account_name=excluded.dkd_account_name,
    dkd_updated_by_user_id=auth.uid(),
    dkd_updated_at=now();

  return jsonb_build_object(
    'dkd_ok_value',true,
    'dkd_iban',dkd_iban_value,
    'dkd_account_name',dkd_account_name_value
  );
end;
$$;

revoke all on function public.dkd_admin_platform_iban_set_dkd(text,text) from public;
grant execute on function public.dkd_admin_platform_iban_set_dkd(text,text) to authenticated;

insert into public.dkd_platform_fee_ledger(
  dkd_job_id,dkd_business_id,dkd_courier_user_id,dkd_completed_at,
  dkd_fee_mode,dkd_fee_value,dkd_fee_base_tl,dkd_platform_fee_tl
)
select
  dkd_job.id,
  dkd_job.dkd_business_id,
  dkd_job.assigned_user_id,
  coalesce(dkd_job.completed_at,dkd_job.updated_at,now()),
  dkd_agreement.dkd_fee_mode,
  dkd_agreement.dkd_fee_value,
  greatest(coalesce(dkd_job.customer_charge_tl,dkd_job.fee_tl,0),0),
  case
    when dkd_agreement.dkd_fee_mode='percentage'
      then round(greatest(coalesce(dkd_job.customer_charge_tl,dkd_job.fee_tl,0),0) * dkd_agreement.dkd_fee_value / 100.0,2)
    else round(dkd_agreement.dkd_fee_value,2)
  end
from public.dkd_courier_jobs dkd_job
join public.dkd_platform_fee_agreements dkd_agreement
  on dkd_agreement.dkd_business_id=dkd_job.dkd_business_id
 and dkd_agreement.dkd_is_active=true
where (
  dkd_job.completed_at is not null
  or lower(coalesce(dkd_job.status,'')) in ('completed','delivered','done','finished')
  or lower(coalesce(dkd_job.pickup_status,'')) in ('delivered','completed')
)
and coalesce(dkd_job.completed_at,dkd_job.updated_at,now()) >= dkd_agreement.dkd_effective_from
on conflict (dkd_job_id) do update set
  dkd_business_id=excluded.dkd_business_id,
  dkd_courier_user_id=excluded.dkd_courier_user_id,
  dkd_completed_at=excluded.dkd_completed_at,
  dkd_fee_mode=excluded.dkd_fee_mode,
  dkd_fee_value=excluded.dkd_fee_value,
  dkd_fee_base_tl=excluded.dkd_fee_base_tl,
  dkd_platform_fee_tl=excluded.dkd_platform_fee_tl;
