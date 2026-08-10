-- DraBornGo Panel v0.0.1 performance hardening
create index if not exists dkd_business_rate_history_courier_idx on public.dkd_business_courier_rate_history(dkd_courier_user_id);
create index if not exists dkd_business_rate_history_created_by_idx on public.dkd_business_courier_rate_history(dkd_created_by_user_id);
create index if not exists dkd_business_couriers_created_by_idx on public.dkd_business_couriers(dkd_created_by_user_id);

drop policy if exists dkd_businesses_owner_select on public.dkd_businesses;
create policy dkd_businesses_owner_select on public.dkd_businesses for select to authenticated using (dkd_owner_user_id=(select auth.uid()) or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_businesses_owner_update on public.dkd_businesses;
create policy dkd_businesses_owner_update on public.dkd_businesses for update to authenticated using (dkd_owner_user_id=(select auth.uid()) or coalesce(public.dkd_is_admin(),false)) with check (dkd_owner_user_id=(select auth.uid()) or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_business_couriers_visibility on public.dkd_business_couriers;
create policy dkd_business_couriers_visibility on public.dkd_business_couriers for select to authenticated using (dkd_courier_user_id=(select auth.uid()) or public.dkd_business_owned_by_auth_dkd(dkd_business_id) or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_business_rate_history_visibility on public.dkd_business_courier_rate_history;
create policy dkd_business_rate_history_visibility on public.dkd_business_courier_rate_history for select to authenticated using (dkd_courier_user_id=(select auth.uid()) or public.dkd_business_owned_by_auth_dkd(dkd_business_id) or coalesce(public.dkd_is_admin(),false));

drop policy if exists dkd_courier_identity_self_select on public.dkd_courier_identity_lookup;
create policy dkd_courier_identity_self_select on public.dkd_courier_identity_lookup for select to authenticated using (dkd_courier_user_id=(select auth.uid()));
