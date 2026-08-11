alter function public.dkd_platform_owner_profile_dkd() volatile;

drop policy if exists dkd_platform_receipts_select_own on storage.objects;
create policy dkd_platform_receipts_select_own on storage.objects for select to authenticated
using (
  bucket_id='dkd-platform-payment-receipts'
  and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.dkd_panel_admin_is_current_dkd()
  )
);
