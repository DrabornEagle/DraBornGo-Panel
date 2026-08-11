revoke all on function public.dkd_platform_fee_capture_job_dkd() from public, anon, authenticated;

create index if not exists dkd_platform_fee_agreements_updated_by_idx on public.dkd_platform_fee_agreements(dkd_updated_by_user_id);
create index if not exists dkd_platform_billing_config_updated_by_idx on public.dkd_platform_billing_config(dkd_updated_by_user_id);
create index if not exists dkd_platform_fee_payments_submitted_by_idx on public.dkd_platform_fee_payments(dkd_submitted_by_user_id);
create index if not exists dkd_platform_fee_payments_reviewed_by_idx on public.dkd_platform_fee_payments(dkd_reviewed_by_user_id);
