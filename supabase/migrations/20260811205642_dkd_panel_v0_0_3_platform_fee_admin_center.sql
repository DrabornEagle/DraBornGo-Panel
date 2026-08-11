create table if not exists public.dkd_platform_fee_agreements (
  dkd_business_id uuid primary key references public.dkd_businesses(dkd_id) on delete cascade,
  dkd_fee_mode text not null default 'fixed' check (dkd_fee_mode in ('fixed','percentage')),
  dkd_fee_value numeric(12,2) not null default 0 check (dkd_fee_value >= 0),
  dkd_payment_cycle text not null default 'weekly' check (dkd_payment_cycle in ('weekly','monthly')),
  dkd_weekday smallint not null default 1 check (dkd_weekday between 1 and 7),
  dkd_month_day smallint not null default 1 check (dkd_month_day between 1 and 31),
  dkd_effective_from timestamptz not null default now(),
  dkd_is_active boolean not null default true,
  dkd_updated_by_user_id uuid references auth.users(id) on delete set null,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create table if not exists public.dkd_platform_billing_config (
  dkd_singleton boolean primary key default true check (dkd_singleton = true),
  dkd_iban text not null default '',
  dkd_account_name text not null default 'DraBornGo',
  dkd_updated_by_user_id uuid references auth.users(id) on delete set null,
  dkd_updated_at timestamptz not null default now()
);
insert into public.dkd_platform_billing_config(dkd_singleton) values(true) on conflict (dkd_singleton) do nothing;

create table if not exists public.dkd_platform_fee_ledger (
  dkd_id bigserial primary key,
  dkd_job_id bigint not null unique,
  dkd_business_id uuid not null references public.dkd_businesses(dkd_id) on delete restrict,
  dkd_courier_user_id uuid references auth.users(id) on delete set null,
  dkd_completed_at timestamptz not null,
  dkd_fee_mode text not null check (dkd_fee_mode in ('fixed','percentage')),
  dkd_fee_value numeric(12,2) not null,
  dkd_fee_base_tl numeric(12,2) not null default 0,
  dkd_platform_fee_tl numeric(12,2) not null default 0,
  dkd_created_at timestamptz not null default now()
);
create index if not exists dkd_platform_fee_ledger_business_completed_idx on public.dkd_platform_fee_ledger(dkd_business_id,dkd_completed_at desc);
create index if not exists dkd_platform_fee_ledger_courier_completed_idx on public.dkd_platform_fee_ledger(dkd_courier_user_id,dkd_completed_at desc);

create table if not exists public.dkd_platform_fee_payments (
  dkd_id bigserial primary key,
  dkd_business_id uuid not null references public.dkd_businesses(dkd_id) on delete restrict,
  dkd_submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  dkd_amount_tl numeric(12,2) not null check (dkd_amount_tl > 0),
  dkd_receipt_path text not null,
  dkd_status text not null default 'pending' check (dkd_status in ('pending','approved','rejected')),
  dkd_admin_note text not null default '',
  dkd_submitted_at timestamptz not null default now(),
  dkd_reviewed_at timestamptz,
  dkd_reviewed_by_user_id uuid references auth.users(id) on delete set null
);
create index if not exists dkd_platform_fee_payments_business_status_idx on public.dkd_platform_fee_payments(dkd_business_id,dkd_status,dkd_submitted_at desc);

create table if not exists public.dkd_platform_notice_acks (
  dkd_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_notice_key text not null,
  dkd_acknowledged_at timestamptz not null default now(),
  primary key (dkd_user_id,dkd_notice_key)
);

alter table public.dkd_platform_fee_agreements enable row level security;
alter table public.dkd_platform_billing_config enable row level security;
alter table public.dkd_platform_fee_ledger enable row level security;
alter table public.dkd_platform_fee_payments enable row level security;
alter table public.dkd_platform_notice_acks enable row level security;
revoke all on public.dkd_platform_fee_agreements from anon, authenticated;
revoke all on public.dkd_platform_billing_config from anon, authenticated;
revoke all on public.dkd_platform_fee_ledger from anon, authenticated;
revoke all on public.dkd_platform_fee_payments from anon, authenticated;
revoke all on public.dkd_platform_notice_acks from anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dkd-platform-payment-receipts','dkd-platform-payment-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists dkd_platform_receipts_insert_own on storage.objects;
create policy dkd_platform_receipts_insert_own on storage.objects for insert to authenticated
with check (bucket_id='dkd-platform-payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists dkd_platform_receipts_select_own on storage.objects;
create policy dkd_platform_receipts_select_own on storage.objects for select to authenticated
using (bucket_id='dkd-platform-payment-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.dkd_admin_users a where a.user_id=auth.uid() and a.role_key='admin')));

create or replace function public.dkd_panel_admin_is_current_dkd()
returns boolean language sql stable security definer set search_path='public','auth' as $$
  select auth.uid() is not null and exists(select 1 from public.dkd_admin_users a where a.user_id=auth.uid() and a.role_key='admin');
$$;
revoke all on function public.dkd_panel_admin_is_current_dkd() from public;
grant execute on function public.dkd_panel_admin_is_current_dkd() to authenticated;

create or replace function public.dkd_platform_fee_capture_job_dkd()
returns trigger language plpgsql security definer set search_path='public','auth' as $$
declare
  dkd_agreement_value public.dkd_platform_fee_agreements%rowtype;
  dkd_completed_at_value timestamptz;
  dkd_base_value numeric := 0;
  dkd_fee_value numeric := 0;
begin
  if new.dkd_business_id is null then return new; end if;
  if not (new.completed_at is not null or lower(coalesce(new.status,'')) in ('completed','delivered','done','finished') or lower(coalesce(new.pickup_status,'')) in ('delivered','completed')) then return new; end if;
  dkd_completed_at_value := coalesce(new.completed_at,new.updated_at,now());
  select * into dkd_agreement_value from public.dkd_platform_fee_agreements a
   where a.dkd_business_id=new.dkd_business_id and a.dkd_is_active=true and a.dkd_effective_from<=dkd_completed_at_value limit 1;
  if not found then return new; end if;
  dkd_base_value := greatest(coalesce(new.fee_tl,0),0);
  if dkd_agreement_value.dkd_fee_mode='percentage' then
    dkd_fee_value := round(dkd_base_value * dkd_agreement_value.dkd_fee_value / 100.0,2);
  else
    dkd_fee_value := round(dkd_agreement_value.dkd_fee_value,2);
  end if;
  insert into public.dkd_platform_fee_ledger(dkd_job_id,dkd_business_id,dkd_courier_user_id,dkd_completed_at,dkd_fee_mode,dkd_fee_value,dkd_fee_base_tl,dkd_platform_fee_tl)
  values(new.id,new.dkd_business_id,new.assigned_user_id,dkd_completed_at_value,dkd_agreement_value.dkd_fee_mode,dkd_agreement_value.dkd_fee_value,dkd_base_value,dkd_fee_value)
  on conflict (dkd_job_id) do nothing;
  return new;
end;
$$;
drop trigger if exists dkd_platform_fee_capture_job_trigger on public.dkd_courier_jobs;
create trigger dkd_platform_fee_capture_job_trigger after insert or update of status,pickup_status,is_active,completed_at on public.dkd_courier_jobs for each row execute function public.dkd_platform_fee_capture_job_dkd();

create or replace function public.dkd_platform_notice_ack_dkd(dkd_param_notice_key text)
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare dkd_user_id_value uuid:=auth.uid(); dkd_key_value text:=trim(coalesce(dkd_param_notice_key,''));
begin
 if dkd_user_id_value is null then raise exception 'dkd_auth_required'; end if;
 if dkd_key_value='' then raise exception 'dkd_notice_key_required'; end if;
 insert into public.dkd_platform_notice_acks(dkd_user_id,dkd_notice_key) values(dkd_user_id_value,dkd_key_value) on conflict do nothing;
 return jsonb_build_object('dkd_ok_value',true,'dkd_notice_key',dkd_key_value);
end;$$;
revoke all on function public.dkd_platform_notice_ack_dkd(text) from public;
grant execute on function public.dkd_platform_notice_ack_dkd(text) to authenticated;

create or replace function public.dkd_platform_schedule_set_dkd(dkd_param_cycle text,dkd_param_weekday integer,dkd_param_month_day integer)
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare
 dkd_business_id_value uuid:=public.dkd_business_current_id_dkd();
 dkd_cycle_value text:=lower(trim(coalesce(dkd_param_cycle,'')));
 dkd_weekday_value integer:=coalesce(dkd_param_weekday,1);
 dkd_month_day_value integer:=coalesce(dkd_param_month_day,1);
begin
 if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
 if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
 if dkd_cycle_value not in ('weekly','monthly') then raise exception 'dkd_payment_cycle_invalid'; end if;
 if dkd_weekday_value not between 1 and 7 then raise exception 'dkd_weekday_invalid'; end if;
 if dkd_month_day_value not between 1 and 31 then raise exception 'dkd_month_day_invalid'; end if;
 insert into public.dkd_platform_fee_agreements(dkd_business_id,dkd_fee_mode,dkd_fee_value,dkd_payment_cycle,dkd_weekday,dkd_month_day,dkd_is_active,dkd_updated_by_user_id)
 values(dkd_business_id_value,'fixed',0,dkd_cycle_value,dkd_weekday_value,dkd_month_day_value,true,auth.uid())
 on conflict (dkd_business_id) do update set dkd_payment_cycle=excluded.dkd_payment_cycle,dkd_weekday=excluded.dkd_weekday,dkd_month_day=excluded.dkd_month_day,dkd_updated_by_user_id=auth.uid(),dkd_updated_at=now();
 return jsonb_build_object('dkd_ok_value',true,'dkd_payment_cycle',dkd_cycle_value,'dkd_weekday',dkd_weekday_value,'dkd_month_day',dkd_month_day_value);
end;$$;
revoke all on function public.dkd_platform_schedule_set_dkd(text,integer,integer) from public;
grant execute on function public.dkd_platform_schedule_set_dkd(text,integer,integer) to authenticated;

create or replace function public.dkd_platform_payment_submit_dkd(dkd_param_amount_tl numeric,dkd_param_receipt_path text)
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare
 dkd_business_id_value uuid:=public.dkd_business_current_id_dkd();
 dkd_path_value text:=trim(coalesce(dkd_param_receipt_path,''));
 dkd_payment_id_value bigint;
 dkd_admin_user_value uuid;
begin
 if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
 if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
 if coalesce(dkd_param_amount_tl,0)<=0 then raise exception 'dkd_payment_amount_invalid'; end if;
 if dkd_path_value='' or split_part(dkd_path_value,'/',1)<>auth.uid()::text then raise exception 'dkd_receipt_path_invalid'; end if;
 insert into public.dkd_platform_fee_payments(dkd_business_id,dkd_submitted_by_user_id,dkd_amount_tl,dkd_receipt_path)
 values(dkd_business_id_value,auth.uid(),round(dkd_param_amount_tl,2),dkd_path_value) returning dkd_id into dkd_payment_id_value;
 for dkd_admin_user_value in select user_id from public.dkd_admin_users where role_key='admin' loop
   perform public.dkd_queue_push_event('dkd_platform_payment_'||dkd_payment_id_value::text||'_'||dkd_admin_user_value::text,'platform_fee_payment',dkd_admin_user_value,'Platform Hizmet Bedeli Ödeme Bildirimi','Bir işletme dekont yükleyerek ödeme bildiriminde bulundu.','admin_center','admin_center',jsonb_build_object('paymentId',dkd_payment_id_value,'businessId',dkd_business_id_value,'dkd_notification_kind','platform_fee_payment'));
 end loop;
 return jsonb_build_object('dkd_ok_value',true,'dkd_payment_id',dkd_payment_id_value);
end;$$;
revoke all on function public.dkd_platform_payment_submit_dkd(numeric,text) from public;
grant execute on function public.dkd_platform_payment_submit_dkd(numeric,text) to authenticated;

create or replace function public.dkd_platform_owner_profile_dkd()
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare
 dkd_business_id_value uuid:=public.dkd_business_current_id_dkd();
 dkd_agreement_value public.dkd_platform_fee_agreements%rowtype;
 dkd_config_value public.dkd_platform_billing_config%rowtype;
 dkd_today_value date:=(now() at time zone 'Europe/Istanbul')::date;
 dkd_due_today_value boolean:=false;
 dkd_period_key_value text:='';
 dkd_notice_key_value text:='';
 dkd_outstanding_value numeric:=0;
 dkd_total_fee_value numeric:=0;
 dkd_paid_value numeric:=0;
 dkd_popup_value jsonb:=null;
 dkd_recent_ledger_value jsonb:='[]'::jsonb;
 dkd_recent_payments_value jsonb:='[]'::jsonb;
begin
 if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
 if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
 select * into dkd_agreement_value from public.dkd_platform_fee_agreements where dkd_business_id=dkd_business_id_value;
 if not found then
   insert into public.dkd_platform_fee_agreements(dkd_business_id,dkd_updated_by_user_id) values(dkd_business_id_value,auth.uid()) on conflict do nothing;
   select * into dkd_agreement_value from public.dkd_platform_fee_agreements where dkd_business_id=dkd_business_id_value;
 end if;
 select * into dkd_config_value from public.dkd_platform_billing_config where dkd_singleton=true;
 select coalesce(sum(dkd_platform_fee_tl),0) into dkd_total_fee_value from public.dkd_platform_fee_ledger where dkd_business_id=dkd_business_id_value;
 select coalesce(sum(dkd_amount_tl),0) into dkd_paid_value from public.dkd_platform_fee_payments where dkd_business_id=dkd_business_id_value and dkd_status in ('pending','approved');
 dkd_outstanding_value:=greatest(dkd_total_fee_value-dkd_paid_value,0);
 if dkd_agreement_value.dkd_payment_cycle='weekly' then
   dkd_due_today_value:=extract(isodow from dkd_today_value)::integer=dkd_agreement_value.dkd_weekday;
   dkd_period_key_value:=to_char(dkd_today_value,'IYYY-IW');
 else
   dkd_due_today_value:=extract(day from dkd_today_value)::integer=least(dkd_agreement_value.dkd_month_day,extract(day from (date_trunc('month',dkd_today_value)+interval '1 month - 1 day'))::integer);
   dkd_period_key_value:=to_char(dkd_today_value,'YYYY-MM');
 end if;
 dkd_notice_key_value:='platform_due:'||dkd_business_id_value::text||':'||dkd_period_key_value;
 if dkd_due_today_value and dkd_outstanding_value>0 and not exists(select 1 from public.dkd_platform_notice_acks where dkd_user_id=auth.uid() and dkd_notice_key=dkd_notice_key_value) then
   dkd_popup_value:=jsonb_build_object('dkd_notice_key',dkd_notice_key_value,'dkd_title','Platform Hizmet Bedeli Ödeme Günü','dkd_body','Bugün belirlediğiniz ödeme günü. Güncel Platform Hizmet Bedeli bakiyenizi kontrol edip ödeme yaptıktan sonra dekont yükleyebilirsiniz.','dkd_amount_tl',round(dkd_outstanding_value,2));
 end if;
 select coalesce(jsonb_agg(x order by (x->>'dkd_completed_at')::timestamptz desc),'[]'::jsonb) into dkd_recent_ledger_value from (select jsonb_build_object('dkd_job_id',l.dkd_job_id,'dkd_completed_at',l.dkd_completed_at,'dkd_fee_mode',l.dkd_fee_mode,'dkd_fee_value',l.dkd_fee_value,'dkd_fee_base_tl',l.dkd_fee_base_tl,'dkd_platform_fee_tl',l.dkd_platform_fee_tl) x from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_business_id_value order by l.dkd_completed_at desc limit 40) q;
 select coalesce(jsonb_agg(x order by (x->>'dkd_submitted_at')::timestamptz desc),'[]'::jsonb) into dkd_recent_payments_value from (select jsonb_build_object('dkd_id',p.dkd_id,'dkd_amount_tl',p.dkd_amount_tl,'dkd_receipt_path',p.dkd_receipt_path,'dkd_status',p.dkd_status,'dkd_admin_note',p.dkd_admin_note,'dkd_submitted_at',p.dkd_submitted_at,'dkd_reviewed_at',p.dkd_reviewed_at) x from public.dkd_platform_fee_payments p where p.dkd_business_id=dkd_business_id_value order by p.dkd_submitted_at desc limit 20) q;
 return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_business_id_value,'dkd_fee_mode',dkd_agreement_value.dkd_fee_mode,'dkd_fee_value',dkd_agreement_value.dkd_fee_value,'dkd_payment_cycle',dkd_agreement_value.dkd_payment_cycle,'dkd_weekday',dkd_agreement_value.dkd_weekday,'dkd_month_day',dkd_agreement_value.dkd_month_day,'dkd_iban',coalesce(dkd_config_value.dkd_iban,''),'dkd_account_name',coalesce(dkd_config_value.dkd_account_name,'DraBornGo'),'dkd_total_fee_tl',round(dkd_total_fee_value,2),'dkd_submitted_or_paid_tl',round(dkd_paid_value,2),'dkd_outstanding_tl',round(dkd_outstanding_value,2),'dkd_due_today',dkd_due_today_value,'dkd_popup',dkd_popup_value,'dkd_recent_ledger',dkd_recent_ledger_value,'dkd_recent_payments',dkd_recent_payments_value);
end;$$;
revoke all on function public.dkd_platform_owner_profile_dkd() from public;
grant execute on function public.dkd_platform_owner_profile_dkd() to authenticated;

create or replace function public.dkd_admin_platform_fee_agreement_set_dkd(dkd_param_business_id uuid,dkd_param_fee_mode text,dkd_param_fee_value numeric)
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare dkd_mode_value text:=lower(trim(coalesce(dkd_param_fee_mode,''))); dkd_value numeric:=coalesce(dkd_param_fee_value,0);
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 if dkd_mode_value not in ('fixed','percentage') then raise exception 'dkd_fee_mode_invalid'; end if;
 if dkd_value<0 or (dkd_mode_value='percentage' and dkd_value>100) then raise exception 'dkd_fee_value_invalid'; end if;
 if not exists(select 1 from public.dkd_businesses where dkd_id=dkd_param_business_id) then raise exception 'dkd_business_not_found'; end if;
 insert into public.dkd_platform_fee_agreements(dkd_business_id,dkd_fee_mode,dkd_fee_value,dkd_effective_from,dkd_is_active,dkd_updated_by_user_id)
 values(dkd_param_business_id,dkd_mode_value,round(dkd_value,2),now(),true,auth.uid())
 on conflict (dkd_business_id) do update set dkd_fee_mode=excluded.dkd_fee_mode,dkd_fee_value=excluded.dkd_fee_value,dkd_effective_from=now(),dkd_is_active=true,dkd_updated_by_user_id=auth.uid(),dkd_updated_at=now();
 return jsonb_build_object('dkd_ok_value',true,'dkd_business_id',dkd_param_business_id,'dkd_fee_mode',dkd_mode_value,'dkd_fee_value',round(dkd_value,2));
end;$$;
revoke all on function public.dkd_admin_platform_fee_agreement_set_dkd(uuid,text,numeric) from public;
grant execute on function public.dkd_admin_platform_fee_agreement_set_dkd(uuid,text,numeric) to authenticated;

create or replace function public.dkd_admin_platform_iban_set_dkd(dkd_param_iban text,dkd_param_account_name text default 'DraBornGo')
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare dkd_iban_value text:=upper(replace(trim(coalesce(dkd_param_iban,'')),' ',''));
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 if dkd_iban_value<>'' and (length(dkd_iban_value)<15 or length(dkd_iban_value)>34) then raise exception 'dkd_iban_invalid'; end if;
 insert into public.dkd_platform_billing_config(dkd_singleton,dkd_iban,dkd_account_name,dkd_updated_by_user_id,dkd_updated_at)
 values(true,dkd_iban_value,coalesce(nullif(trim(dkd_param_account_name),''),'DraBornGo'),auth.uid(),now())
 on conflict (dkd_singleton) do update set dkd_iban=excluded.dkd_iban,dkd_account_name=excluded.dkd_account_name,dkd_updated_by_user_id=auth.uid(),dkd_updated_at=now();
 return jsonb_build_object('dkd_ok_value',true,'dkd_iban',dkd_iban_value);
end;$$;
revoke all on function public.dkd_admin_platform_iban_set_dkd(text,text) from public;
grant execute on function public.dkd_admin_platform_iban_set_dkd(text,text) to authenticated;

create or replace function public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id uuid,dkd_param_start_at timestamptz,dkd_param_end_at timestamptz)
returns numeric language plpgsql stable security definer set search_path='public','auth' as $$
declare dkd_total_value numeric:=0; dkd_courier_value uuid;
begin
 for dkd_courier_value in select distinct m.dkd_courier_user_id from public.dkd_business_couriers m where m.dkd_business_id=dkd_param_business_id and m.dkd_linked_at<dkd_param_end_at and coalesce(m.dkd_unlinked_at,'infinity'::timestamptz)>dkd_param_start_at loop
   dkd_total_value:=dkd_total_value+coalesce((public.dkd_business_courier_period_cost_dkd(dkd_param_business_id,dkd_courier_value,dkd_param_start_at,dkd_param_end_at)->>'dkd_earnings_tl')::numeric,0);
 end loop;
 return round(dkd_total_value,2);
end;$$;
revoke all on function public.dkd_admin_business_courier_cost_period_dkd(uuid,timestamptz,timestamptz) from public;

create or replace function public.dkd_panel_admin_bootstrap_dkd()
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
begin
 if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
 return jsonb_build_object('dkd_is_admin',public.dkd_panel_admin_is_current_dkd());
end;$$;
revoke all on function public.dkd_panel_admin_bootstrap_dkd() from public;
grant execute on function public.dkd_panel_admin_bootstrap_dkd() to authenticated;

create or replace function public.dkd_admin_business_search_dkd(dkd_param_query text default '')
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare dkd_query_value text:=trim(coalesce(dkd_param_query,'')); dkd_rows_value jsonb;
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('dkd_business_id',b.dkd_id,'dkd_business_name',b.dkd_business_name,'dkd_owner_full_name',b.dkd_owner_full_name,'dkd_email',b.dkd_email,'dkd_phone',b.dkd_phone,'dkd_city',b.dkd_city,'dkd_district',b.dkd_district,'dkd_courier_count',(select count(*) from public.dkd_business_couriers m where m.dkd_business_id=b.dkd_id and m.dkd_is_active=true),'dkd_platform_fee_total_tl',(select round(coalesce(sum(l.dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger l where l.dkd_business_id=b.dkd_id)) order by b.dkd_business_name),'[]'::jsonb)
 into dkd_rows_value from public.dkd_businesses b where b.dkd_is_active=true and (dkd_query_value='' or b.dkd_business_name ilike '%'||dkd_query_value||'%' or b.dkd_owner_full_name ilike '%'||dkd_query_value||'%' or coalesce(b.dkd_email,'') ilike '%'||dkd_query_value||'%' or coalesce(b.dkd_phone,'') ilike '%'||dkd_query_value||'%');
 return jsonb_build_object('dkd_ok_value',true,'dkd_businesses',dkd_rows_value);
end;$$;
revoke all on function public.dkd_admin_business_search_dkd(text) from public;
grant execute on function public.dkd_admin_business_search_dkd(text) to authenticated;

create or replace function public.dkd_admin_courier_search_dkd(dkd_param_query text default '')
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare dkd_query_value text:=trim(coalesce(dkd_param_query,'')); dkd_rows_value jsonb; dkd_now_value timestamptz:=now(); dkd_week_start_value timestamptz:=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_month_start_value timestamptz:=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 select coalesce(jsonb_agg(q),'[]'::jsonb) into dkd_rows_value from (
  select jsonb_build_object('dkd_courier_user_id',p.user_id,'dkd_display_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Kurye'),'dkd_email',u.email,'dkd_dbg_id',p.dbg_id,'dkd_courier_status',p.courier_status,'dkd_business_id',m.dkd_business_id,'dkd_business_name',b.dkd_business_name,'dkd_week_earnings_tl',case when m.dkd_business_id is null then 0 else (public.dkd_business_courier_period_cost_dkd(m.dkd_business_id,p.user_id,dkd_week_start_value,dkd_now_value)->>'dkd_earnings_tl')::numeric end,'dkd_month_earnings_tl',case when m.dkd_business_id is null then 0 else (public.dkd_business_courier_period_cost_dkd(m.dkd_business_id,p.user_id,dkd_month_start_value,dkd_now_value)->>'dkd_earnings_tl')::numeric end) q
  from public.dkd_profiles p join auth.users u on u.id=p.user_id left join lateral(select mm.* from public.dkd_business_couriers mm where mm.dkd_courier_user_id=p.user_id order by mm.dkd_is_active desc,mm.dkd_linked_at desc limit 1) m on true left join public.dkd_businesses b on b.dkd_id=m.dkd_business_id
  where p.courier_status in ('approved','active') and (dkd_query_value='' or coalesce(p.nickname,'') ilike '%'||dkd_query_value||'%' or coalesce(p.dbg_id,'') ilike '%'||dkd_query_value||'%' or coalesce(u.email,'') ilike '%'||dkd_query_value||'%' or coalesce(u.raw_user_meta_data->>'dkd_full_name','') ilike '%'||dkd_query_value||'%' or coalesce(u.raw_user_meta_data->>'full_name','') ilike '%'||dkd_query_value||'%') order by coalesce(p.nickname,u.email) limit 100
 ) s;
 return jsonb_build_object('dkd_ok_value',true,'dkd_couriers',dkd_rows_value);
end;$$;
revoke all on function public.dkd_admin_courier_search_dkd(text) from public;
grant execute on function public.dkd_admin_courier_search_dkd(text) to authenticated;

create or replace function public.dkd_admin_business_detail_dkd(dkd_param_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare
 dkd_business_value public.dkd_businesses%rowtype; dkd_agreement_value public.dkd_platform_fee_agreements%rowtype;
 dkd_now_value timestamptz:=now(); dkd_today_start_value timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_week_start_value timestamptz:=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_month_start_value timestamptz:=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 dkd_couriers_value jsonb:='[]'::jsonb; dkd_daily_value jsonb:='[]'::jsonb; dkd_hourly_value jsonb:='[]'::jsonb; dkd_platform_daily_value jsonb:='[]'::jsonb; dkd_day_value date; dkd_hour_value integer;
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 select * into dkd_business_value from public.dkd_businesses where dkd_id=dkd_param_business_id; if not found then raise exception 'dkd_business_not_found'; end if;
 select * into dkd_agreement_value from public.dkd_platform_fee_agreements where dkd_business_id=dkd_param_business_id;
 select coalesce(jsonb_agg(jsonb_build_object('dkd_courier_user_id',m.dkd_courier_user_id,'dkd_display_name',coalesce(nullif(u.raw_user_meta_data->>'dkd_full_name',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(p.nickname,''),'Kurye'),'dkd_dbg_id',p.dbg_id,'dkd_email',u.email,'dkd_package_fee_tl',m.dkd_package_fee_tl,'dkd_hourly_rate_tl',m.dkd_hourly_rate_tl,'dkd_today',public.dkd_business_courier_period_cost_dkd(dkd_param_business_id,m.dkd_courier_user_id,dkd_today_start_value,dkd_now_value),'dkd_week',public.dkd_business_courier_period_cost_dkd(dkd_param_business_id,m.dkd_courier_user_id,dkd_week_start_value,dkd_now_value),'dkd_month',public.dkd_business_courier_period_cost_dkd(dkd_param_business_id,m.dkd_courier_user_id,dkd_month_start_value,dkd_now_value))),'[]'::jsonb) into dkd_couriers_value from public.dkd_business_couriers m join auth.users u on u.id=m.dkd_courier_user_id left join public.dkd_profiles p on p.user_id=m.dkd_courier_user_id where m.dkd_business_id=dkd_param_business_id and m.dkd_is_active=true;
 for dkd_day_value in select generate_series(((now() at time zone 'Europe/Istanbul')::date-30),(now() at time zone 'Europe/Istanbul')::date,'1 day'::interval)::date loop
   dkd_daily_value:=dkd_daily_value||jsonb_build_array(jsonb_build_object('dkd_day',dkd_day_value,'dkd_courier_earnings_tl',public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id,dkd_day_value::timestamp at time zone 'Europe/Istanbul',(dkd_day_value+1)::timestamp at time zone 'Europe/Istanbul')));
   dkd_platform_daily_value:=dkd_platform_daily_value||jsonb_build_array(jsonb_build_object('dkd_day',dkd_day_value,'dkd_platform_fee_tl',(select round(coalesce(sum(l.dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_param_business_id and l.dkd_completed_at>=dkd_day_value::timestamp at time zone 'Europe/Istanbul' and l.dkd_completed_at<(dkd_day_value+1)::timestamp at time zone 'Europe/Istanbul')));
 end loop;
 for dkd_hour_value in 0..23 loop
   dkd_hourly_value:=dkd_hourly_value||jsonb_build_array(jsonb_build_object('dkd_hour',dkd_hour_value,'dkd_courier_earnings_tl',public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id,dkd_today_start_value+make_interval(hours=>dkd_hour_value),least(dkd_today_start_value+make_interval(hours=>dkd_hour_value+1),dkd_now_value))));
 end loop;
 return jsonb_build_object('dkd_ok_value',true,'dkd_business',to_jsonb(dkd_business_value),'dkd_courier_count',jsonb_array_length(dkd_couriers_value),'dkd_couriers',dkd_couriers_value,'dkd_today_courier_earnings_tl',public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id,dkd_today_start_value,dkd_now_value),'dkd_week_courier_earnings_tl',public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id,dkd_week_start_value,dkd_now_value),'dkd_month_courier_earnings_tl',public.dkd_admin_business_courier_cost_period_dkd(dkd_param_business_id,dkd_month_start_value,dkd_now_value),'dkd_daily_earnings',dkd_daily_value,'dkd_hourly_earnings',dkd_hourly_value,'dkd_platform_daily',dkd_platform_daily_value,'dkd_platform_today_tl',(select round(coalesce(sum(l.dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_param_business_id and l.dkd_completed_at>=dkd_today_start_value),'dkd_platform_week_tl',(select round(coalesce(sum(l.dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_param_business_id and l.dkd_completed_at>=dkd_week_start_value),'dkd_platform_month_tl',(select round(coalesce(sum(l.dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_param_business_id and l.dkd_completed_at>=dkd_month_start_value),'dkd_agreement',case when dkd_agreement_value.dkd_business_id is null then null else to_jsonb(dkd_agreement_value) end);
end;$$;
revoke all on function public.dkd_admin_business_detail_dkd(uuid) from public;
grant execute on function public.dkd_admin_business_detail_dkd(uuid) to authenticated;

create or replace function public.dkd_admin_courier_detail_dkd(dkd_param_courier_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare
 dkd_membership_value public.dkd_business_couriers%rowtype; dkd_business_value public.dkd_businesses%rowtype; dkd_user_value auth.users%rowtype; dkd_profile_value public.dkd_profiles%rowtype;
 dkd_now_value timestamptz:=now(); dkd_today_start_value timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_week_start_value timestamptz:=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_month_start_value timestamptz:=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 dkd_daily_value jsonb:='[]'::jsonb; dkd_hourly_value jsonb:='[]'::jsonb; dkd_history_value jsonb:='[]'::jsonb; dkd_day_value date; dkd_hour_value integer;
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 select * into dkd_user_value from auth.users where id=dkd_param_courier_user_id; if not found then raise exception 'dkd_courier_not_found'; end if;
 select * into dkd_profile_value from public.dkd_profiles where user_id=dkd_param_courier_user_id;
 select * into dkd_membership_value from public.dkd_business_couriers where dkd_courier_user_id=dkd_param_courier_user_id order by dkd_is_active desc,dkd_linked_at desc limit 1;
 if dkd_membership_value.dkd_business_id is not null then select * into dkd_business_value from public.dkd_businesses where dkd_id=dkd_membership_value.dkd_business_id; end if;
 select coalesce(jsonb_agg(jsonb_build_object('dkd_business_id',m.dkd_business_id,'dkd_business_name',b.dkd_business_name,'dkd_linked_at',m.dkd_linked_at,'dkd_unlinked_at',m.dkd_unlinked_at,'dkd_is_active',m.dkd_is_active) order by m.dkd_linked_at desc),'[]'::jsonb) into dkd_history_value from public.dkd_business_couriers m left join public.dkd_businesses b on b.dkd_id=m.dkd_business_id where m.dkd_courier_user_id=dkd_param_courier_user_id;
 if dkd_membership_value.dkd_business_id is not null then
  for dkd_day_value in select generate_series(((now() at time zone 'Europe/Istanbul')::date-30),(now() at time zone 'Europe/Istanbul')::date,'1 day'::interval)::date loop dkd_daily_value:=dkd_daily_value||jsonb_build_array(jsonb_build_object('dkd_day',dkd_day_value,'dkd_earnings_tl',(public.dkd_business_courier_period_cost_dkd(dkd_membership_value.dkd_business_id,dkd_param_courier_user_id,dkd_day_value::timestamp at time zone 'Europe/Istanbul',(dkd_day_value+1)::timestamp at time zone 'Europe/Istanbul')->>'dkd_earnings_tl')::numeric)); end loop;
  for dkd_hour_value in 0..23 loop dkd_hourly_value:=dkd_hourly_value||jsonb_build_array(jsonb_build_object('dkd_hour',dkd_hour_value,'dkd_earnings_tl',(public.dkd_business_courier_period_cost_dkd(dkd_membership_value.dkd_business_id,dkd_param_courier_user_id,dkd_today_start_value+make_interval(hours=>dkd_hour_value),least(dkd_today_start_value+make_interval(hours=>dkd_hour_value+1),dkd_now_value))->>'dkd_earnings_tl')::numeric)); end loop;
 end if;
 return jsonb_build_object('dkd_ok_value',true,'dkd_courier_user_id',dkd_param_courier_user_id,'dkd_display_name',coalesce(nullif(dkd_user_value.raw_user_meta_data->>'dkd_full_name',''),nullif(dkd_user_value.raw_user_meta_data->>'full_name',''),nullif(dkd_profile_value.nickname,''),'Kurye'),'dkd_email',dkd_user_value.email,'dkd_dbg_id',dkd_profile_value.dbg_id,'dkd_courier_status',dkd_profile_value.courier_status,'dkd_business',case when dkd_business_value.dkd_id is null then null else to_jsonb(dkd_business_value) end,'dkd_business_history',dkd_history_value,'dkd_today',case when dkd_membership_value.dkd_business_id is null then '{}'::jsonb else public.dkd_business_courier_period_cost_dkd(dkd_membership_value.dkd_business_id,dkd_param_courier_user_id,dkd_today_start_value,dkd_now_value) end,'dkd_week',case when dkd_membership_value.dkd_business_id is null then '{}'::jsonb else public.dkd_business_courier_period_cost_dkd(dkd_membership_value.dkd_business_id,dkd_param_courier_user_id,dkd_week_start_value,dkd_now_value) end,'dkd_month',case when dkd_membership_value.dkd_business_id is null then '{}'::jsonb else public.dkd_business_courier_period_cost_dkd(dkd_membership_value.dkd_business_id,dkd_param_courier_user_id,dkd_month_start_value,dkd_now_value) end,'dkd_daily_earnings',dkd_daily_value,'dkd_hourly_earnings',dkd_hourly_value);
end;$$;
revoke all on function public.dkd_admin_courier_detail_dkd(uuid) from public;
grant execute on function public.dkd_admin_courier_detail_dkd(uuid) to authenticated;

create or replace function public.dkd_admin_platform_dashboard_dkd()
returns jsonb language plpgsql stable security definer set search_path='public','auth' as $$
declare
 dkd_today_start_value timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_week_start_value timestamptz:=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_month_start_value timestamptz:=date_trunc('month',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'; dkd_pending_value jsonb:='[]'::jsonb; dkd_popup_value jsonb:=null; dkd_iban_value text:='';
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 select dkd_iban into dkd_iban_value from public.dkd_platform_billing_config where dkd_singleton=true;
 select coalesce(jsonb_agg(jsonb_build_object('dkd_payment_id',p.dkd_id,'dkd_business_id',p.dkd_business_id,'dkd_business_name',b.dkd_business_name,'dkd_amount_tl',p.dkd_amount_tl,'dkd_receipt_path',p.dkd_receipt_path,'dkd_submitted_at',p.dkd_submitted_at) order by p.dkd_submitted_at desc),'[]'::jsonb) into dkd_pending_value from public.dkd_platform_fee_payments p join public.dkd_businesses b on b.dkd_id=p.dkd_business_id where p.dkd_status='pending';
 select jsonb_build_object('dkd_notice_key','platform_payment:'||p.dkd_id::text,'dkd_title','Yeni Ödeme Bildirimi','dkd_body',b.dkd_business_name||' Platform Hizmet Bedeli ödemesi için dekont yükledi.','dkd_payment_id',p.dkd_id,'dkd_business_id',p.dkd_business_id,'dkd_amount_tl',p.dkd_amount_tl) into dkd_popup_value from public.dkd_platform_fee_payments p join public.dkd_businesses b on b.dkd_id=p.dkd_business_id where p.dkd_status='pending' and not exists(select 1 from public.dkd_platform_notice_acks a where a.dkd_user_id=auth.uid() and a.dkd_notice_key='platform_payment:'||p.dkd_id::text) order by p.dkd_submitted_at asc limit 1;
 return jsonb_build_object('dkd_ok_value',true,'dkd_business_count',(select count(*) from public.dkd_businesses where dkd_is_active=true),'dkd_courier_count',(select count(distinct dkd_courier_user_id) from public.dkd_business_couriers where dkd_is_active=true),'dkd_platform_today_tl',(select round(coalesce(sum(dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger where dkd_completed_at>=dkd_today_start_value),'dkd_platform_week_tl',(select round(coalesce(sum(dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger where dkd_completed_at>=dkd_week_start_value),'dkd_platform_month_tl',(select round(coalesce(sum(dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger where dkd_completed_at>=dkd_month_start_value),'dkd_platform_all_tl',(select round(coalesce(sum(dkd_platform_fee_tl),0),2) from public.dkd_platform_fee_ledger),'dkd_pending_payment_count',jsonb_array_length(dkd_pending_value),'dkd_pending_payments',dkd_pending_value,'dkd_iban',coalesce(dkd_iban_value,''),'dkd_popup',dkd_popup_value);
end;$$;
revoke all on function public.dkd_admin_platform_dashboard_dkd() from public;
grant execute on function public.dkd_admin_platform_dashboard_dkd() to authenticated;

create or replace function public.dkd_admin_platform_payment_review_dkd(dkd_param_payment_id bigint,dkd_param_status text,dkd_param_admin_note text default '')
returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare dkd_status_value text:=lower(trim(coalesce(dkd_param_status,''))); dkd_payment_value public.dkd_platform_fee_payments%rowtype; dkd_owner_user_value uuid;
begin
 if not public.dkd_panel_admin_is_current_dkd() then raise exception 'dkd_admin_required'; end if;
 if dkd_status_value not in ('approved','rejected') then raise exception 'dkd_payment_status_invalid'; end if;
 update public.dkd_platform_fee_payments set dkd_status=dkd_status_value,dkd_admin_note=coalesce(dkd_param_admin_note,''),dkd_reviewed_at=now(),dkd_reviewed_by_user_id=auth.uid() where dkd_id=dkd_param_payment_id returning * into dkd_payment_value;
 if dkd_payment_value.dkd_id is null then raise exception 'dkd_payment_not_found'; end if;
 select dkd_owner_user_id into dkd_owner_user_value from public.dkd_businesses where dkd_id=dkd_payment_value.dkd_business_id;
 if dkd_owner_user_value is not null then perform public.dkd_queue_push_event('dkd_platform_payment_review_'||dkd_payment_value.dkd_id::text||'_'||dkd_status_value, 'platform_fee_payment_review',dkd_owner_user_value,case when dkd_status_value='approved' then 'Ödeme Onaylandı' else 'Ödeme İncelendi' end,case when dkd_status_value='approved' then 'Platform Hizmet Bedeli ödeme bildiriminiz onaylandı.' else 'Platform Hizmet Bedeli ödeme bildiriminiz için düzeltme gerekiyor.' end,'platform_fee','platform_fee',jsonb_build_object('paymentId',dkd_payment_value.dkd_id,'status',dkd_status_value,'dkd_notification_kind','platform_fee_payment_review')); end if;
 return jsonb_build_object('dkd_ok_value',true,'dkd_payment_id',dkd_payment_value.dkd_id,'dkd_status',dkd_status_value);
end;$$;
revoke all on function public.dkd_admin_platform_payment_review_dkd(bigint,text,text) from public;
grant execute on function public.dkd_admin_platform_payment_review_dkd(bigint,text,text) to authenticated;

create or replace function public.dkd_platform_fee_due_push_sweep_dkd()
returns integer language plpgsql security definer set search_path='public','auth' as $$
declare dkd_row_value record; dkd_today_value date:=(now() at time zone 'Europe/Istanbul')::date; dkd_due_value boolean; dkd_period_key_value text; dkd_outstanding_value numeric; dkd_count_value integer:=0;
begin
 for dkd_row_value in select a.*,b.dkd_owner_user_id,b.dkd_business_name from public.dkd_platform_fee_agreements a join public.dkd_businesses b on b.dkd_id=a.dkd_business_id where a.dkd_is_active=true and b.dkd_is_active=true loop
   if dkd_row_value.dkd_payment_cycle='weekly' then dkd_due_value:=extract(isodow from dkd_today_value)::integer=dkd_row_value.dkd_weekday; dkd_period_key_value:=to_char(dkd_today_value,'IYYY-IW'); else dkd_due_value:=extract(day from dkd_today_value)::integer=least(dkd_row_value.dkd_month_day,extract(day from (date_trunc('month',dkd_today_value)+interval '1 month - 1 day'))::integer); dkd_period_key_value:=to_char(dkd_today_value,'YYYY-MM'); end if;
   if dkd_due_value then
     select greatest(coalesce((select sum(l.dkd_platform_fee_tl) from public.dkd_platform_fee_ledger l where l.dkd_business_id=dkd_row_value.dkd_business_id),0)-coalesce((select sum(p.dkd_amount_tl) from public.dkd_platform_fee_payments p where p.dkd_business_id=dkd_row_value.dkd_business_id and p.dkd_status in ('pending','approved')),0),0) into dkd_outstanding_value;
     if dkd_outstanding_value>0 then
       perform public.dkd_queue_push_event('dkd_platform_due_'||dkd_row_value.dkd_business_id::text||'_'||dkd_period_key_value,'platform_fee_due',dkd_row_value.dkd_owner_user_id,'Platform Hizmet Bedeli Ödeme Günü','Bugün ödeme gününüz. Güncel bakiye: '||to_char(round(dkd_outstanding_value,2),'FM999999990D00')||' TL.','platform_fee','platform_fee',jsonb_build_object('businessId',dkd_row_value.dkd_business_id,'amountTl',round(dkd_outstanding_value,2),'periodKey',dkd_period_key_value,'dkd_notification_kind','platform_fee_due'));
       dkd_count_value:=dkd_count_value+1;
     end if;
   end if;
 end loop;
 return dkd_count_value;
end;$$;
revoke all on function public.dkd_platform_fee_due_push_sweep_dkd() from public;

do $$
declare dkd_job_id_value bigint;
begin
 select jobid into dkd_job_id_value from cron.job where jobname='dkd_platform_fee_due_reminder_daily' limit 1;
 if dkd_job_id_value is not null then perform cron.unschedule(dkd_job_id_value); end if;
 perform cron.schedule('dkd_platform_fee_due_reminder_daily','0 7 * * *','select public.dkd_platform_fee_due_push_sweep_dkd();');
end$$;
