-- DraBornGo Panel v0.0.1: use existing courier application identity data for exact-match search.
-- The business panel never receives or renders national_id.
create or replace function public.dkd_business_courier_search_dkd(dkd_param_query text)
returns table(dkd_courier_user_id uuid,dkd_display_name text,dkd_plate_no text,dkd_email_masked text,dkd_city text,dkd_courier_status text,dkd_is_online boolean,dkd_already_linked boolean,dkd_tc_exact_match boolean)
language plpgsql stable security definer set search_path to 'public','auth','extensions' as $function$
declare
  dkd_business_id_value uuid:=public.dkd_business_current_id_dkd();
  dkd_query_value text:=trim(coalesce(dkd_param_query,''));
  dkd_query_digits_value text:=regexp_replace(trim(coalesce(dkd_param_query,'')),'[^0-9]','','g');
begin
  if auth.uid() is null then raise exception 'dkd_auth_required'; end if;
  if dkd_business_id_value is null then raise exception 'dkd_business_required'; end if;
  if char_length(dkd_query_value)<3 and char_length(dkd_query_digits_value)<>11 then raise exception 'dkd_search_min_3_chars'; end if;

  return query
  select p.user_id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'dkd_full_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),nullif(trim(a.first_name||' '||a.last_name),''),nullif(trim(p.nickname),''),'Kurye'),
    coalesce(nullif(trim(u.raw_user_meta_data->>'motorcycle_plate'),''),nullif(trim(l.plate_no),''),nullif(trim(a.plate_no),''),''),
    public.dkd_panel_mask_email_dkd(coalesce(nullif(u.email,''),a.email,'')),
    coalesce(nullif(p.dkd_city,''),nullif(p.courier_city,''),nullif(a.city,''),''),
    p.courier_status,
    coalesce(p.dkd_courier_online,false),
    exists(select 1 from public.dkd_business_couriers m where m.dkd_courier_user_id=p.user_id and m.dkd_is_active is true),
    case when char_length(dkd_query_digits_value)=11 then (
      regexp_replace(coalesce(a.national_id,''),'[^0-9]','','g')=dkd_query_digits_value
      or exists(select 1 from public.dkd_courier_identity_lookup i where i.dkd_courier_user_id=p.user_id and extensions.crypt(dkd_query_digits_value,i.dkd_national_id_bcrypt)=i.dkd_national_id_bcrypt)
    ) else false end
  from public.dkd_profiles p
  join auth.users u on u.id=p.user_id
  left join public.dkd_courier_live_locations l on l.courier_user_id=p.user_id
  left join lateral (
    select ca.first_name,ca.last_name,ca.email,ca.national_id,ca.plate_no,ca.city
    from public.dkd_courier_license_applications ca
    where ca.user_id=p.user_id
    order by (case when ca.status='approved' then 0 else 1 end),ca.updated_at desc
    limit 1
  ) a on true
  where p.courier_status='approved' and (
    lower(coalesce(u.raw_user_meta_data->>'dkd_full_name','')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(u.raw_user_meta_data->>'full_name','')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(a.first_name||' '||a.last_name,'')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(p.nickname,'')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(u.raw_user_meta_data->>'motorcycle_plate','')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(l.plate_no,'')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(a.plate_no,'')) like '%'||lower(dkd_query_value)||'%'
    or lower(coalesce(u.email,''))=lower(dkd_query_value)
    or lower(coalesce(a.email,''))=lower(dkd_query_value)
    or (char_length(dkd_query_digits_value)=11 and (
      regexp_replace(coalesce(a.national_id,''),'[^0-9]','','g')=dkd_query_digits_value
      or exists(select 1 from public.dkd_courier_identity_lookup i where i.dkd_courier_user_id=p.user_id and extensions.crypt(dkd_query_digits_value,i.dkd_national_id_bcrypt)=i.dkd_national_id_bcrypt)
    ))
  )
  order by coalesce(p.dkd_courier_online,false) desc,2 asc
  limit 20;
end; $function$;

revoke all on function public.dkd_business_courier_search_dkd(text) from public;
grant execute on function public.dkd_business_courier_search_dkd(text) to authenticated;
