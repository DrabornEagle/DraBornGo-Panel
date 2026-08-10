-- DraBornGo Panel v0.0.1
-- Shared DraBornGo Supabase business console, courier linkage and business-defined courier earnings.

create table if not exists public.dkd_businesses (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_owner_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_business_name text not null,
  dkd_owner_full_name text not null default '',
  dkd_phone text,
  dkd_email text,
  dkd_business_type text not null default 'İşletme',
  dkd_city text not null default '',
  dkd_district text not null default '',
  dkd_address_text text not null default '',
  dkd_is_active boolean not null default true,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now(),
  constraint dkd_businesses_name_length_check check (char_length(trim(dkd_business_name)) between 2 and 120)
);

create unique index if not exists dkd_businesses_owner_uidx on public.dkd_businesses(dkd_owner_user_id);

create index if not exists dkd_businesses_active_idx on public.dkd_businesses(dkd_is_active, dkd_updated_at desc);

create table if not exists public.dkd_business_couriers (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_business_id uuid not null references public.dkd_businesses(dkd_id) on delete cascade,
  dkd_courier_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_created_by_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_package_fee_tl numeric(12,2) not null default 0,
  dkd_hourly_rate_tl numeric(12,2) not null default 0,
  dkd_is_active boolean not null default true,
  dkd_linked_at timestamptz not null default now(),
  dkd_unlinked_at timestamptz,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now(),
  constraint dkd_business_couriers_package_fee_check check (dkd_package_fee_tl >= 0 and dkd_package_fee_tl <= 100000),
  constraint dkd_business_couriers_hourly_rate_check check (dkd_hourly_rate_tl >= 0 and dkd_hourly_rate_tl <= 100000)
);

create unique index if not exists dkd_business_couriers_one_active_business_uidx
  on public.dkd_business_couriers(dkd_courier_user_id) where dkd_is_active is true;

create unique index if not exists dkd_business_couriers_active_pair_uidx
  on public.dkd_business_couriers(dkd_business_id, dkd_courier_user_id) where dkd_is_active is true;

create index if not exists dkd_business_couriers_business_idx
  on public.dkd_business_couriers(dkd_business_id, dkd_is_active, dkd_linked_at desc);

create table if not exists public.dkd_business_courier_rate_history (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_membership_id uuid not null references public.dkd_business_couriers(dkd_id) on delete cascade,
  dkd_business_id uuid not null references public.dkd_businesses(dkd_id) on delete cascade,
  dkd_courier_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_package_fee_tl numeric(12,2) not null default 0,
  dkd_hourly_rate_tl numeric(12,2) not null default 0,
  dkd_effective_from timestamptz not null default now(),
  dkd_effective_to timestamptz,
  dkd_created_by_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_created_at timestamptz not null default now(),
  constraint dkd_business_rate_history_package_fee_check check (dkd_package_fee_tl >= 0 and dkd_package_fee_tl <= 100000),
  constraint dkd_business_rate_history_hourly_rate_check check (dkd_hourly_rate_tl >= 0 and dkd_hourly_rate_tl <= 100000),
  constraint dkd_business_rate_history_range_check check (dkd_effective_to is null or dkd_effective_to >= dkd_effective_from)
);

create unique index if not exists dkd_business_rate_history_one_open_uidx
  on public.dkd_business_courier_rate_history(dkd_membership_id) where dkd_effective_to is null;

create index if not exists dkd_business_rate_history_lookup_idx
  on public.dkd_business_courier_rate_history(dkd_business_id, dkd_courier_user_id, dkd_effective_from desc);

-- TC identity is never stored as plaintext. The courier can opt in to exact TC lookup later;
-- only a bcrypt verifier and last four digits are retained.
create table if not exists public.dkd_courier_identity_lookup (
  dkd_courier_user_id uuid primary key references auth.users(id) on delete cascade,
  dkd_national_id_bcrypt text not null,
  dkd_national_id_last4 text not null,
  dkd_verified_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now(),
  constraint dkd_courier_identity_last4_check check (dkd_national_id_last4 ~ '^[0-9]{4}$')
);

alter table public.dkd_courier_jobs
  add column if not exists dkd_business_id uuid references public.dkd_businesses(dkd_id) on delete set null;

create index if not exists dkd_courier_jobs_business_created_idx
  on public.dkd_courier_jobs(dkd_business_id, created_at desc);

create index if not exists dkd_courier_jobs_business_status_idx
  on public.dkd_courier_jobs(dkd_business_id, status, updated_at desc);

alter table public.dkd_businesses enable row level security;

alter table public.dkd_business_couriers enable row level security;

alter table public.dkd_business_courier_rate_history enable row level security;

alter table public.dkd_courier_identity_lookup enable row level security;

create or replace function public.dkd_business_owned_by_auth_dkd(dkd_param_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public','auth'
as $function$
  select exists(
    select 1
    from public.dkd_businesses dkd_business_value
    where dkd_business_value.dkd_id = dkd_param_business_id
      and dkd_business_value.dkd_owner_user_id = auth.uid()
      and dkd_business_value.dkd_is_active is true
  );
$function$;

create or replace function public.dkd_business_current_id_dkd()
returns uuid
language sql
stable
security definer
set search_path to 'public','auth'
as $function$
  select dkd_business_value.dkd_id
  from public.dkd_businesses dkd_business_value
  where dkd_business_value.dkd_owner_user_id = auth.uid()
    and dkd_business_value.dkd_is_active is true
  order by dkd_business_value.dkd_created_at asc
  limit 1;
$function$;

-- RLS: owner sees their own business; linked couriers can see only their own membership/rates.
drop policy if exists dkd_businesses_owner_select on public.dkd_businesses;

create policy dkd_businesses_owner_select on public.dkd_businesses
  for select to authenticated
  using (dkd_owner_user_id = auth.uid() or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_businesses_owner_update on public.dkd_businesses;

create policy dkd_businesses_owner_update on public.dkd_businesses
  for update to authenticated
  using (dkd_owner_user_id = auth.uid() or coalesce(public.dkd_is_admin(),false))
  with check (dkd_owner_user_id = auth.uid() or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_business_couriers_visibility on public.dkd_business_couriers;

create policy dkd_business_couriers_visibility on public.dkd_business_couriers
  for select to authenticated
  using (
    dkd_courier_user_id = auth.uid()
    or public.dkd_business_owned_by_auth_dkd(dkd_business_id)
    or coalesce(public.dkd_is_admin(),false)
  );

drop policy if exists dkd_business_rate_history_visibility on public.dkd_business_courier_rate_history;

create policy dkd_business_rate_history_visibility on public.dkd_business_courier_rate_history
  for select to authenticated
  using (
    dkd_courier_user_id = auth.uid()
    or public.dkd_business_owned_by_auth_dkd(dkd_business_id)
    or coalesce(public.dkd_is_admin(),false)
  );

drop policy if exists dkd_courier_identity_self_select on public.dkd_courier_identity_lookup;

create policy dkd_courier_identity_self_select on public.dkd_courier_identity_lookup
  for select to authenticated using (dkd_courier_user_id = auth.uid());

-- Realtime-compatible read access, still scoped to the owner's business and linked couriers.
drop policy if exists dkd_courier_jobs_business_panel_select on public.dkd_courier_jobs;

create policy dkd_courier_jobs_business_panel_select on public.dkd_courier_jobs
  for select to authenticated
  using (
    (dkd_business_id is not null and public.dkd_business_owned_by_auth_dkd(dkd_business_id))
    or exists(
      select 1 from public.dkd_business_couriers dkd_membership_value
      where dkd_membership_value.dkd_courier_user_id = dkd_courier_jobs.assigned_user_id
        and public.dkd_business_owned_by_auth_dkd(dkd_membership_value.dkd_business_id)
        and dkd_courier_jobs.created_at >= dkd_membership_value.dkd_linked_at
        and dkd_courier_jobs.created_at < coalesce(dkd_membership_value.dkd_unlinked_at,'infinity'::timestamptz)
    )
  );

drop policy if exists dkd_courier_live_locations_business_panel_select on public.dkd_courier_live_locations;

create policy dkd_courier_live_locations_business_panel_select on public.dkd_courier_live_locations
  for select to authenticated
  using (
    exists(
      select 1 from public.dkd_business_couriers dkd_membership_value
      where dkd_membership_value.dkd_courier_user_id = dkd_courier_live_locations.courier_user_id
        and dkd_membership_value.dkd_is_active is true
        and public.dkd_business_owned_by_auth_dkd(dkd_membership_value.dkd_business_id)
    )
  );

create or replace function public.dkd_panel_touch_updated_at_dkd()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.dkd_updated_at := now();
  return new;
end;
$function$;

drop trigger if exists dkd_businesses_touch_updated_at_bu on public.dkd_businesses;

create trigger dkd_businesses_touch_updated_at_bu
before update on public.dkd_businesses
for each row execute function public.dkd_panel_touch_updated_at_dkd();

drop trigger if exists dkd_business_couriers_touch_updated_at_bu on public.dkd_business_couriers;

create trigger dkd_business_couriers_touch_updated_at_bu
before update on public.dkd_business_couriers
for each row execute function public.dkd_panel_touch_updated_at_dkd();

create or replace function public.dkd_panel_infer_job_business_dkd()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  dkd_business_id_value uuid;
begin
  if new.dkd_business_id is null and new.assigned_user_id is not null then
    select dkd_membership_value.dkd_business_id
      into dkd_business_id_value
    from public.dkd_business_couriers dkd_membership_value
    where dkd_membership_value.dkd_courier_user_id = new.assigned_user_id
      and dkd_membership_value.dkd_is_active is true
    order by dkd_membership_value.dkd_linked_at desc
    limit 1;
    if dkd_business_id_value is not null then
      new.dkd_business_id := dkd_business_id_value;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists dkd_panel_infer_job_business_biu on public.dkd_courier_jobs;

create trigger dkd_panel_infer_job_business_biu
before insert or update of assigned_user_id, dkd_business_id on public.dkd_courier_jobs
for each row execute function public.dkd_panel_infer_job_business_dkd();
