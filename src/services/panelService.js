import { supabase } from '../lib/supabase';
import { dkd_panel_geocode_delivery_address_value } from './mapboxTrackingService';
import { dkd_panel_handle_job_realtime_notification } from './notificationService';

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
    ['dkd_max_online_hours_invalid', 'Azami çevrimiçi süre 1 ile 24 saat arasında olmalı.'],
    ['dkd_delivery_address_required', 'Teslimat adresi zorunlu.'],
    ['dkd_order_amount_invalid', 'Sipariş tutarı negatif olamaz.'],
    ['dkd_dropoff_coordinate_invalid', 'Teslimat konumu geçersiz.'],
    ['dkd_order_not_found', 'Sipariş bulunamadı veya bu işletmeye ait değil.'],
    ['max_online_hours_reached', 'Kurye bugünkü azami çevrimiçi süresine ulaştı.'],
  ];
  const dkd_match_value = dkd_map_value.find(([dkd_key_value]) => dkd_text_value.includes(dkd_key_value));
  return dkd_match_value?.[1] || dkd_text_value || dkd_fallback_value;
}

function dkd_throw_rpc_error(dkd_error_value) {
  if (dkd_error_value) throw new Error(dkd_error_message(dkd_error_value));
}

function dkd_safe_coordinate_number(dkd_value, dkd_axis_value) {
  if (dkd_value === null || dkd_value === undefined || dkd_value === '') return null;
  const dkd_number_value = Number(dkd_value);
  if (!Number.isFinite(dkd_number_value)) return null;
  if (dkd_axis_value === 'lat' && Math.abs(dkd_number_value) > 90) return null;
  if (dkd_axis_value === 'lng' && Math.abs(dkd_number_value) > 180) return null;
  return dkd_number_value;
}

export async function dkd_panel_sign_in(dkd_email_value, dkd_password_value) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: dkd_email_value.trim(), password: dkd_password_value });
  dkd_throw_rpc_error(error);
  return data;
}

export async function dkd_panel_sign_up(dkd_form_value) {
  const dkd_metadata_value = {
    source_app: 'draborngo_panel', signup_role: 'business_owner',
    dkd_panel_business_name: dkd_form_value.businessName.trim(),
    dkd_panel_owner_full_name: dkd_form_value.ownerFullName.trim(),
    dkd_panel_phone: dkd_form_value.phone.trim(),
    dkd_panel_business_type: dkd_form_value.businessType.trim() || 'İşletme',
    dkd_panel_city: dkd_form_value.city.trim(), dkd_panel_district: dkd_form_value.district.trim(),
    dkd_panel_address_text: dkd_form_value.address.trim(),
  };
  const { data, error } = await supabase.auth.signUp({ email: dkd_form_value.email.trim(), password: dkd_password_value ?? dkd_form_value.password, options: { data: dkd_metadata_value } });
  dkd_throw_rpc_error(error);
  if (data?.session) await dkd_panel_ensure_business_profile(data.user);
  return data;
}

export async function dkd_panel_sign_out() { await supabase.auth.signOut(); }

export async function dkd_panel_ensure_business_profile(dkd_user_value) {
  if (!dkd_user_value) return null;
  const dkd_existing_value = await supabase.rpc('dkd_business_profile_dkd');
  if (!dkd_existing_value.error && dkd_existing_value.data?.dkd_ok_value) return dkd_existing_value.data;
  const dkd_meta_value = dkd_user_value.user_metadata || {};
  if (!dkd_meta_value.dkd_panel_business_name) return null;
  const { data, error } = await supabase.rpc('dkd_business_register_dkd', {
    dkd_param_business_name: dkd_meta_value.dkd_panel_business_name,
    dkd_param_owner_full_name: dkd_meta_value.dkd_panel_owner_full_name || '', dkd_param_phone: dkd_meta_value.dkd_panel_phone || '',
    dkd_param_business_type: dkd_meta_value.dkd_panel_business_type || 'İşletme', dkd_param_city: dkd_meta_value.dkd_panel_city || '',
    dkd_param_district: dkd_meta_value.dkd_panel_district || '', dkd_param_address_text: dkd_meta_value.dkd_panel_address_text || '',
  });
  dkd_throw_rpc_error(error); return data;
}

export async function dkd_panel_fetch_business_profile() { const { data, error } = await supabase.rpc('dkd_business_profile_dkd'); dkd_throw_rpc_error(error); return data; }
export async function dkd_panel_update_business_profile(dkd_form_value) {
  const { data, error } = await supabase.rpc('dkd_business_register_dkd', {
    dkd_param_business_name: dkd_form_value.businessName, dkd_param_owner_full_name: dkd_form_value.ownerFullName,
    dkd_param_phone: dkd_form_value.phone, dkd_param_business_type: dkd_form_value.businessType,
    dkd_param_city: dkd_form_value.city, dkd_param_district: dkd_form_value.district, dkd_param_address_text: dkd_form_value.address,
  });
  dkd_throw_rpc_error(error); return data;
}
export async function dkd_panel_fetch_dashboard() { const { data, error } = await supabase.rpc('dkd_business_dashboard_dkd'); dkd_throw_rpc_error(error); return data || {}; }
export async function dkd_panel_fetch_orders(dkd_limit_value = 100) { const { data, error } = await supabase.rpc('dkd_business_orders_dkd', { dkd_param_limit: dkd_limit_value }); dkd_throw_rpc_error(error); return data?.dkd_orders || []; }
export async function dkd_panel_fetch_couriers() { const { data, error } = await supabase.rpc('dkd_business_couriers_dkd'); dkd_throw_rpc_error(error); return data?.dkd_couriers || []; }
export async function dkd_panel_search_couriers(dkd_query_value) { const { data, error } = await supabase.rpc('dkd_business_courier_search_dkd', { dkd_param_query: dkd_query_value }); dkd_throw_rpc_error(error); return data || []; }

export async function dkd_panel_link_courier(dkd_user_id_value, dkd_package_fee_value, dkd_hourly_rate_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_link_dkd', { dkd_param_courier_user_id: dkd_user_id_value, dkd_param_package_fee_tl: Number(dkd_package_fee_value || 0), dkd_param_hourly_rate_tl: Number(dkd_hourly_rate_value || 0) });
  dkd_throw_rpc_error(error); return data;
}
export async function dkd_panel_set_courier_rate(dkd_user_id_value, dkd_package_fee_value, dkd_hourly_rate_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_rate_set_dkd', { dkd_param_courier_user_id: dkd_user_id_value, dkd_param_package_fee_tl: Number(dkd_package_fee_value || 0), dkd_param_hourly_rate_tl: Number(dkd_hourly_rate_value || 0) });
  dkd_throw_rpc_error(error); return data;
}
export async function dkd_panel_set_courier_max_hours(dkd_user_id_value, dkd_hours_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_max_hours_set_dkd', { dkd_param_courier_user_id: dkd_user_id_value, dkd_param_max_online_hours: Number(dkd_hours_value || 0) });
  dkd_throw_rpc_error(error); return data || {};
}
export async function dkd_panel_set_courier_online(dkd_user_id_value, dkd_online_value) {
  const { data, error } = await supabase.rpc('dkd_business_courier_online_set_dkd', { dkd_param_courier_user_id: dkd_user_id_value, dkd_param_online: dkd_online_value === true });
  dkd_throw_rpc_error(error);
  if (data?.dkd_ok_value === false) throw new Error(dkd_error_message(data?.dkd_reason_value || 'Kurye durumu değiştirilemedi.'));
  return data || {};
}
export async function dkd_panel_force_courier_offline(dkd_user_id_value) { return dkd_panel_set_courier_online(dkd_user_id_value, false); }
export async function dkd_panel_unlink_courier(dkd_user_id_value) { const { data, error } = await supabase.rpc('dkd_business_courier_unlink_dkd', { dkd_param_courier_user_id: dkd_user_id_value }); dkd_throw_rpc_error(error); return data; }
export async function dkd_panel_fetch_courier_earnings(dkd_user_id_value) { const { data, error } = await supabase.rpc('dkd_courier_earnings_summary_dkd', { dkd_param_user_id: dkd_user_id_value }); dkd_throw_rpc_error(error); return data || {}; }
export async function dkd_panel_fetch_courier_report(dkd_user_id_value, dkd_day_value) { const { data, error } = await supabase.rpc('dkd_business_courier_report_dkd', { dkd_param_courier_user_id: dkd_user_id_value, dkd_param_day: dkd_day_value }); dkd_throw_rpc_error(error); return data || {}; }
export async function dkd_panel_fetch_day_report(dkd_day_value) { const { data, error } = await supabase.rpc('dkd_business_day_report_dkd', { dkd_param_day: dkd_day_value }); dkd_throw_rpc_error(error); return data || {}; }

export async function dkd_panel_create_order(dkd_form_value) {
  const dkd_delivery_address_value = String(dkd_form_value.deliveryAddress || '').trim();
  let dkd_dropoff_lat_value = dkd_safe_coordinate_number(dkd_form_value.dropoffLat, 'lat');
  let dkd_dropoff_lng_value = dkd_safe_coordinate_number(dkd_form_value.dropoffLng, 'lng');
  if ((dkd_dropoff_lat_value == null || dkd_dropoff_lng_value == null) && dkd_delivery_address_value) {
    try {
      const dkd_geocode_value = await dkd_panel_geocode_delivery_address_value(dkd_delivery_address_value, { dkd_city_value: dkd_form_value.city || 'Ankara' });
      dkd_dropoff_lat_value = dkd_geocode_value?.dkd_lat_value ?? null;
      dkd_dropoff_lng_value = dkd_geocode_value?.dkd_lng_value ?? null;
    } catch {
      dkd_dropoff_lat_value = null;
      dkd_dropoff_lng_value = null;
    }
  }
  const { data, error } = await supabase.rpc('dkd_business_order_create_dkd', {
    dkd_param_order_ref: String(dkd_form_value.orderRef || '').trim(), dkd_param_title: String(dkd_form_value.title || 'Sipariş').trim(),
    dkd_param_customer_name: String(dkd_form_value.customerName || '').trim(), dkd_param_customer_phone: String(dkd_form_value.customerPhone || '').trim(),
    dkd_param_delivery_address: dkd_delivery_address_value, dkd_param_delivery_note: String(dkd_form_value.deliveryNote || '').trim(),
    dkd_param_customer_charge_tl: Number(String(dkd_form_value.amount || '0').replace(',', '.')) || 0,
    dkd_param_dropoff_lat: dkd_dropoff_lat_value, dkd_param_dropoff_lng: dkd_dropoff_lng_value,
  });
  dkd_throw_rpc_error(error); return data || {};
}

export async function dkd_panel_set_order_dropoff_coordinates(dkd_job_id_value, dkd_lat_value, dkd_lng_value) {
  const dkd_job_number_value = Number(dkd_job_id_value);
  const dkd_lat_number_value = dkd_safe_coordinate_number(dkd_lat_value, 'lat');
  const dkd_lng_number_value = dkd_safe_coordinate_number(dkd_lng_value, 'lng');
  if (!Number.isFinite(dkd_job_number_value) || dkd_job_number_value <= 0 || dkd_lat_number_value == null || dkd_lng_number_value == null) {
    return { dkd_ok_value: false, dkd_reason_value: 'invalid_coordinate' };
  }
  const { data, error } = await supabase.rpc('dkd_business_order_dropoff_set_dkd', {
    dkd_param_job_id: dkd_job_number_value,
    dkd_param_dropoff_lat: dkd_lat_number_value,
    dkd_param_dropoff_lng: dkd_lng_number_value,
  });
  dkd_throw_rpc_error(error);
  return data || {};
}

export function dkd_panel_subscribe_live(dkd_callback_value) {
  let dkd_channel_value = supabase.channel(`dkd-panel-live-${Date.now()}`);
  ['dkd_courier_jobs', 'dkd_courier_live_locations', 'dkd_business_couriers', 'dkd_courier_online_sessions'].forEach((dkd_table_value) => {
    dkd_channel_value = dkd_channel_value.on('postgres_changes', { event: '*', schema: 'public', table: dkd_table_value }, (dkd_payload_value) => {
      const dkd_enriched_payload_value = { ...(dkd_payload_value || {}), table: dkd_table_value };
      if (dkd_table_value === 'dkd_courier_jobs' && String(dkd_payload_value?.eventType || '').toUpperCase() === 'UPDATE') {
        dkd_panel_handle_job_realtime_notification(dkd_enriched_payload_value).catch(() => null);
      }
      dkd_callback_value?.(dkd_enriched_payload_value);
    });
  });
  dkd_channel_value.subscribe();
  return () => supabase.removeChannel(dkd_channel_value);
}
