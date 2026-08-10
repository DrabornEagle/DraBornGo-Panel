import { supabase } from '../lib/supabase';

function dkd_error_message(dkd_error_value, dkd_fallback_value = 'İşlem tamamlanamadı.') {
  if (!dkd_error_value) return dkd_fallback_value;
  const dkd_text_value = String(dkd_error_value.message || dkd_error_value || '');
  const dkd_map_value = [
    ['Invalid API key', 'DraBornGo ortak Supabase bağlantı anahtarı geçersiz. Uygulamayı güncel GitHub sürümüne eşitle.'],
    ['Invalid login credentials', 'E-posta veya şifre hatalı.'],
    ['Email not confirmed', 'E-posta adresini doğruladıktan sonra giriş yapabilirsin.'],
    ['User already registered', 'Bu e-posta ile daha önce hesap oluşturulmuş.'],
    ['Password should be at least', 'Şifre en az 6 karakter olmalı.'],
    ['Unable to validate email address', 'Geçerli bir e-posta adresi gir.'],
    ['dkd_courier_already_linked', 'Bu kurye şu anda başka bir işletmeye bağlı.'],
    ['dkd_courier_not_approved', 'Yalnızca onaylı DraBornGo kuryeleri eklenebilir.'],
    ['dkd_search_min_3_chars', 'Arama için en az 3 karakter yaz.'],
    ['dkd_membership_not_found', 'Kurye bağlantısı bulunamadı.'],
    ['dkd_rate_invalid', 'Ücret değerleri 0 veya daha büyük olmalı.'],
  ];
  const dkd_match_value = dkd_map_value.find(([dkd_key_value]) => dkd_text_value.includes(dkd_key_value));
  return dkd_match_value?.[1] || dkd_text_value || dkd_fallback_value;
}

export async function dkd_panel_sign_in(dkd_email_value, dkd_password_value) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: dkd_email_value.trim(), password: dkd_password_value });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_sign_up(dkd_form_value) {
  const dkd_metadata_value = {
    source_app: 'draborngo_panel',
    signup_role: 'business_owner',
    dkd_panel_business_name: dkd_form_value.businessName.trim(),
    dkd_panel_owner_full_name: dkd_form_value.ownerFullName.trim(),
    dkd_panel_phone: dkd_form_value.phone.trim(),
    dkd_panel_business_type: dkd_form_value.businessType.trim() || 'İşletme',
    dkd_panel_city: dkd_form_value.city.trim(),
    dkd_panel_district: dkd_form_value.district.trim(),
    dkd_panel_address_text: dkd_form_value.address.trim(),
  };
  const { data, error } = await supabase.auth.signUp({
    email: dkd_form_value.email.trim(),
    password: dkd_form_value.password,
    options: { data: dkd_metadata_value },
  });
  if (error) throw new Error(dkd_error_message(error));
  if (data?.session) await dkd_panel_ensure_business_profile(data.user);
  return data;
}

export async function dkd_panel_sign_out() {
  await supabase.auth.signOut();
}

export async function dkd_panel_ensure_business_profile(dkd_user_value) {
  if (!dkd_user_value) return null;
  const dkd_existing_value = await supabase.rpc('dkd_business_profile_dkd');
  if (!dkd_existing_value.error && dkd_existing_value.data?.dkd_ok_value) return dkd_existing_value.data;
  const dkd_meta_value = dkd_user_value.user_metadata || {};
  const dkd_business_name_value = dkd_meta_value.dkd_panel_business_name;
  if (!dkd_business_name_value) return null;
  const { data, error } = await supabase.rpc('dkd_business_register_dkd', {
    dkd_param_business_name: dkd_business_name_value,
    dkd_param_owner_full_name: dkd_meta_value.dkd_panel_owner_full_name || '',
    dkd_param_phone: dkd_meta_value.dkd_panel_phone || '',
    dkd_param_business_type: dkd_meta_value.dkd_panel_business_type || 'İşletme',
    dkd_param_city: dkd_meta_value.dkd_panel_city || '',
    dkd_param_district: dkd_meta_value.dkd_panel_district || '',
    dkd_param_address_text: dkd_meta_value.dkd_panel_address_text || '',
  });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_fetch_business_profile() {
  const { data, error } = await supabase.rpc('dkd_business_profile_dkd');
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_update_business_profile(dkd_form_value) {
  const { data, error } = await supabase.rpc('dkd_business_register_dkd', {
    dkd_param_business_name: dkd_form_value.businessName,
    dkd_param_owner_full_name: dkd_form_value.ownerFullName,
    dkd_param_phone: dkd_form_value.phone,
    dkd_param_business_type: dkd_form_value.businessType,
    dkd_param_city: dkd_form_value.city,
    dkd_param_district: dkd_form_value.district,
    dkd_param_address_text: dkd_form_value.address,
  });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_fetch_dashboard() {
  const { data, error } = await supabase.rpc('dkd_business_dashboard_dkd');
  if (error) throw new Error(dkd_error_message(error));
  return data || {};
}

export async function dkd_panel_fetch_orders(dkd_limit_value = 100) {
  const { data, error } = await supabase.rpc('dkd_business_orders_dkd', { dkd_param_limit: dkd_limit_value });
  if (error) throw new Error(dkd_error_message(error));
  return data?.dkd_orders || [];
}

export async function dkd_panel_fetch_couriers() {
  const { data, error } = await supabase.rpc('dkd_business_couriers_dkd');
  if (error) throw new Error(dkd_error_message(error));
  return data?.dkd_couriers || [];
}

export async function dkd_panel_search_couriers(dkd_query_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_search_dkd', { dkd_param_query: dkd_query_value });
  if (error) throw new Error(dkd_error_message(error));
  return data || [];
}

export async function dkd_panel_link_courier(dkd_user_id_value, dkd_package_fee_value, dkd_hourly_rate_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_link_dkd', {
    dkd_param_courier_user_id: dkd_user_id_value,
    dkd_param_package_fee_tl: Number(dkd_package_fee_value || 0),
    dkd_param_hourly_rate_tl: Number(dkd_hourly_rate_value || 0),
  });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_set_courier_rate(dkd_user_id_value, dkd_package_fee_value, dkd_hourly_rate_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_rate_set_dkd', {
    dkd_param_courier_user_id: dkd_user_id_value,
    dkd_param_package_fee_tl: Number(dkd_package_fee_value || 0),
    dkd_param_hourly_rate_tl: Number(dkd_hourly_rate_value || 0),
  });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_unlink_courier(dkd_user_id_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_unlink_dkd', { dkd_param_courier_user_id: dkd_user_id_value });
  if (error) throw new Error(dkd_error_message(error));
  return data;
}

export async function dkd_panel_fetch_courier_earnings(dkd_user_id_value) {
  const { data, error } = await supabase.rpc('dkd_courier_earnings_summary_dkd', { dkd_param_user_id: dkd_user_id_value });
  if (error) throw new Error(dkd_error_message(error));
  return data || {};
}

export function dkd_panel_subscribe_live(dkd_callback_value) {
  const dkd_channel_value = supabase
    .channel(`dkd-panel-live-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_courier_jobs' }, dkd_callback_value)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_courier_live_locations' }, dkd_callback_value)
    .subscribe();
  return () => supabase.removeChannel(dkd_channel_value);
}
