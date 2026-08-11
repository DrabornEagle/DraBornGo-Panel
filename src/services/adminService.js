import { supabase } from '../lib/supabase';

function dkd_throw(dkd_error_value) {
  if (!dkd_error_value) return;
  const dkd_text_value = String(dkd_error_value.message || dkd_error_value || 'İşlem tamamlanamadı.');
  const dkd_map_value = [
    ['dkd_admin_required','Bu işlem yalnızca Yönetim Merkezi yöneticisi tarafından yapılabilir.'],
    ['dkd_business_required','Bu hesap için işletme profili bulunamadı.'],
    ['dkd_fee_mode_invalid','Platform Hizmet Bedeli türü geçersiz.'],
    ['dkd_fee_value_invalid','Platform Hizmet Bedeli değeri geçersiz.'],
    ['dkd_payment_cycle_invalid','Ödeme periyodu geçersiz.'],
    ['dkd_payment_amount_invalid','Ödeme tutarı geçersiz.'],
    ['dkd_receipt_path_invalid','Dekont dosyası güvenli kullanıcı klasöründe değil.'],
    ['dkd_iban_invalid','IBAN formatı geçersiz.'],
  ];
  const dkd_match_value = dkd_map_value.find(([dkd_key_value]) => dkd_text_value.includes(dkd_key_value));
  throw new Error(dkd_match_value?.[1] || dkd_text_value);
}

async function dkd_rpc(dkd_name_value, dkd_params_value = undefined) {
  const { data, error } = await supabase.rpc(dkd_name_value, dkd_params_value);
  dkd_throw(error);
  return data || {};
}

export async function dkd_panel_sign_out() { await supabase.auth.signOut(); }
export async function dkd_panel_fetch_admin_bootstrap() { return dkd_rpc('dkd_panel_admin_bootstrap_dkd'); }
export async function dkd_admin_fetch_dashboard() { return dkd_rpc('dkd_admin_platform_dashboard_dkd'); }
export async function dkd_admin_search_businesses(dkd_query_value = '') { return dkd_rpc('dkd_admin_business_search_dkd',{ dkd_param_query:String(dkd_query_value || '') }); }
export async function dkd_admin_fetch_business_detail(dkd_business_id_value) { return dkd_rpc('dkd_admin_business_detail_dkd',{ dkd_param_business_id:dkd_business_id_value }); }
export async function dkd_admin_search_couriers(dkd_query_value = '') { return dkd_rpc('dkd_admin_courier_search_dkd',{ dkd_param_query:String(dkd_query_value || '') }); }
export async function dkd_admin_fetch_courier_detail(dkd_courier_user_id_value) { return dkd_rpc('dkd_admin_courier_detail_dkd',{ dkd_param_courier_user_id:dkd_courier_user_id_value }); }
export async function dkd_admin_set_platform_agreement(dkd_business_id_value,dkd_fee_mode_value,dkd_fee_value) { return dkd_rpc('dkd_admin_platform_fee_agreement_set_dkd',{ dkd_param_business_id:dkd_business_id_value,dkd_param_fee_mode:dkd_fee_mode_value,dkd_param_fee_value:Number(dkd_fee_value || 0) }); }
export async function dkd_admin_set_iban(dkd_iban_value,dkd_account_name_value='DraBornGo') { return dkd_rpc('dkd_admin_platform_iban_set_dkd',{ dkd_param_iban:String(dkd_iban_value || ''),dkd_param_account_name:String(dkd_account_name_value || 'DraBornGo') }); }
export async function dkd_admin_review_payment(dkd_payment_id_value,dkd_status_value,dkd_admin_note_value='') { return dkd_rpc('dkd_admin_platform_payment_review_dkd',{ dkd_param_payment_id:Number(dkd_payment_id_value),dkd_param_status:dkd_status_value,dkd_param_admin_note:String(dkd_admin_note_value || '') }); }
export async function dkd_admin_create_payment_receipt_signed_url(dkd_path_value) {
  const { data,error } = await supabase.storage.from('dkd-platform-payment-receipts').createSignedUrl(String(dkd_path_value || ''),300);
  dkd_throw(error); return data?.signedUrl || '';
}
export async function dkd_panel_fetch_platform_fee_profile() { return dkd_rpc('dkd_platform_owner_profile_dkd'); }
export async function dkd_panel_set_platform_schedule(dkd_cycle_value,dkd_weekday_value,dkd_month_day_value) { return dkd_rpc('dkd_platform_schedule_set_dkd',{ dkd_param_cycle:dkd_cycle_value,dkd_param_weekday:Number(dkd_weekday_value || 1),dkd_param_month_day:Number(dkd_month_day_value || 1) }); }
export async function dkd_panel_ack_platform_notice(dkd_notice_key_value) { return dkd_rpc('dkd_platform_notice_ack_dkd',{ dkd_param_notice_key:String(dkd_notice_key_value || '') }); }
export async function dkd_panel_submit_platform_payment(dkd_amount_value,dkd_receipt_path_value) { return dkd_rpc('dkd_platform_payment_submit_dkd',{ dkd_param_amount_tl:Number(dkd_amount_value || 0),dkd_param_receipt_path:String(dkd_receipt_path_value || '') }); }
export async function dkd_panel_upload_platform_receipt(dkd_asset_value) {
  if (!dkd_asset_value?.uri) throw new Error('Dekont dosyası seçilmedi.');
  if (Number(dkd_asset_value.size || 0) > 10 * 1024 * 1024) throw new Error('Dekont en fazla 10 MB olabilir.');
  const { data:dkd_user_result,error:dkd_user_error } = await supabase.auth.getUser();
  dkd_throw(dkd_user_error);
  const dkd_user_id_value = dkd_user_result?.user?.id;
  if (!dkd_user_id_value) throw new Error('Oturum bulunamadı.');
  const dkd_response_value = await fetch(dkd_asset_value.uri);
  if (!dkd_response_value.ok) throw new Error('Dekont dosyası okunamadı.');
  const dkd_buffer_value = await dkd_response_value.arrayBuffer();
  const dkd_name_value = String(dkd_asset_value.name || 'dekont').replace(/[^a-zA-Z0-9._-]/g,'_');
  const dkd_path_value = `${dkd_user_id_value}/${Date.now()}-${dkd_name_value}`;
  const { error } = await supabase.storage.from('dkd-platform-payment-receipts').upload(dkd_path_value,dkd_buffer_value,{ contentType:dkd_asset_value.mimeType || 'application/octet-stream',upsert:false });
  dkd_throw(error);
  return dkd_path_value;
}
