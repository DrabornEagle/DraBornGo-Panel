create or replace function public.dkd_sanitize_courier_live_eta_dkd()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.eta_min is not null and (new.eta_min < 0 or new.eta_min > 720) then
    new.eta_min := null;
  end if;
  return new;
end;
$$;

drop trigger if exists dkd_sanitize_courier_live_eta_biu on public.dkd_courier_live_locations;
create trigger dkd_sanitize_courier_live_eta_biu
before insert or update of eta_min on public.dkd_courier_live_locations
for each row execute function public.dkd_sanitize_courier_live_eta_dkd();

update public.dkd_courier_live_locations
set eta_min = null
where eta_min is not null and (eta_min < 0 or eta_min > 720);
