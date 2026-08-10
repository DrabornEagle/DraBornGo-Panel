-- DraBornGo Panel v0.0.1 security hardening
-- Trigger/helper functions must not be directly callable over PostgREST RPC.
revoke all on function public.dkd_panel_infer_job_business_dkd() from public;
revoke all on function public.dkd_panel_infer_job_business_dkd() from anon;
revoke all on function public.dkd_panel_infer_job_business_dkd() from authenticated;
revoke all on function public.dkd_panel_touch_updated_at_dkd() from public;
revoke all on function public.dkd_panel_touch_updated_at_dkd() from anon;
revoke all on function public.dkd_panel_touch_updated_at_dkd() from authenticated;
revoke all on function public.dkd_panel_mask_email_dkd(text) from public;
revoke all on function public.dkd_panel_mask_email_dkd(text) from anon;
revoke all on function public.dkd_panel_mask_email_dkd(text) from authenticated;
