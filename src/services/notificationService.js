import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

let dkd_notifications_module_promise_value = null;
let dkd_device_module_promise_value = null;
let dkd_handler_ready_value = false;
const dkd_job_notification_seen_value = new Set();

function dkd_is_expo_go_value() { return Constants?.appOwnership === 'expo'; }
async function dkd_notifications_module_value() { if (!dkd_notifications_module_promise_value) dkd_notifications_module_promise_value = import('expo-notifications'); return dkd_notifications_module_promise_value; }
async function dkd_device_module_value() { if (!dkd_device_module_promise_value) dkd_device_module_promise_value = import('expo-device'); return dkd_device_module_promise_value; }
function dkd_project_id_value() { return Constants?.easConfig?.projectId || Constants?.expoConfig?.extra?.eas?.projectId || null; }
function dkd_remember_notification_key_value(dkd_key_value) {
  const dkd_safe_key_value = String(dkd_key_value || '').trim();
  if (!dkd_safe_key_value || dkd_job_notification_seen_value.has(dkd_safe_key_value)) return false;
  dkd_job_notification_seen_value.add(dkd_safe_key_value);
  if (dkd_job_notification_seen_value.size > 160) { const dkd_first_value = dkd_job_notification_seen_value.values().next().value; if (dkd_first_value) dkd_job_notification_seen_value.delete(dkd_first_value); }
  return true;
}

export async function dkd_panel_prime_notifications() {
  try {
    const dkd_notifications_value = await dkd_notifications_module_value();
    if (!dkd_handler_ready_value) {
      dkd_notifications_value.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
      dkd_handler_ready_value = true;
    }
    if (Platform.OS === 'android') {
      await dkd_notifications_value.setNotificationChannelAsync('draborngo-panel', {
        name: 'DraBornGo Panel',
        importance: dkd_notifications_value.AndroidImportance.HIGH,
        vibrationPattern: [0,180,100,220],
        lightColor: '#69E9FF',
        lockscreenVisibility: dkd_notifications_value.AndroidNotificationVisibility?.PUBLIC,
      });
    }
    return { dkd_ok_value: true };
  } catch (dkd_error_value) { return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) }; }
}

export async function dkd_panel_register_push_token() {
  try {
    if (Platform.OS === 'android' && dkd_is_expo_go_value()) return { dkd_ok_value:false, dkd_reason_value:'expo_go_remote_push_unavailable' };
    await dkd_panel_prime_notifications();
    const dkd_device_value = await dkd_device_module_value();
    if (!dkd_device_value?.isDevice) return { dkd_ok_value:false, dkd_reason_value:'physical_device_required' };
    const dkd_notifications_value = await dkd_notifications_module_value();
    let dkd_permission_value = await dkd_notifications_value.getPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') dkd_permission_value = await dkd_notifications_value.requestPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') return { dkd_ok_value:false, dkd_reason_value:'permission_denied' };

    let dkd_native_registered_value = false;
    let dkd_native_reason_value = '';
    try {
      const dkd_native_result_value = await dkd_notifications_value.getDevicePushTokenAsync();
      const dkd_native_token_value = String(dkd_native_result_value?.data || '').trim();
      if (dkd_native_token_value) {
        const { error: dkd_native_rpc_error_value } = await supabase.rpc('dkd_upsert_native_push_token', {
          dkd_param_token: dkd_native_token_value,
          dkd_param_platform: Platform.OS,
          dkd_param_app_mode: 'draborngo-panel-dev-client',
          dkd_param_device_name: dkd_device_value?.deviceName || 'DraBornGo Panel',
        });
        if (dkd_native_rpc_error_value) throw dkd_native_rpc_error_value;
        dkd_native_registered_value = true;
      }
    } catch (dkd_native_error_value) { dkd_native_reason_value = dkd_native_error_value?.message || String(dkd_native_error_value); }

    const dkd_project_id = dkd_project_id_value();
    if (!dkd_project_id) {
      return { dkd_ok_value: dkd_native_registered_value, dkd_native_registered_value, dkd_reason_value: dkd_native_registered_value ? 'native_registered_expo_project_missing' : 'panel_remote_push_project_not_configured', dkd_native_reason_value };
    }
    try {
      const dkd_token_value = (await dkd_notifications_value.getExpoPushTokenAsync({ projectId:dkd_project_id })).data;
      const { error: dkd_error_value } = await supabase.rpc('dkd_upsert_push_token', {
        dkd_param_token: dkd_token_value,
        dkd_param_platform: Platform.OS,
        dkd_param_app_mode: 'draborngo-panel-dev-client',
        dkd_param_device_name: dkd_device_value?.deviceName || 'DraBornGo Panel',
      });
      if (dkd_error_value) throw dkd_error_value;
      return { dkd_ok_value:true, dkd_token_value, dkd_native_registered_value };
    } catch (dkd_expo_error_value) {
      return { dkd_ok_value:dkd_native_registered_value, dkd_native_registered_value, dkd_reason_value:dkd_expo_error_value?.message || String(dkd_expo_error_value), dkd_native_reason_value };
    }
  } catch (dkd_error_value) { return { dkd_ok_value:false, dkd_reason_value:dkd_error_value?.message || String(dkd_error_value) }; }
}

async function dkd_panel_present_local_notification_value(dkd_title_value,dkd_body_value,dkd_data_value={}) {
  try {
    if (Platform.OS === 'android' && dkd_is_expo_go_value()) return { dkd_ok_value:false, dkd_reason_value:'expo_go_notification_runtime_unavailable' };
    await dkd_panel_prime_notifications();
    const dkd_notifications_value = await dkd_notifications_module_value();
    const dkd_permission_value = await dkd_notifications_value.getPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') return { dkd_ok_value:false, dkd_reason_value:'permission_denied' };
    await dkd_notifications_value.scheduleNotificationAsync({ content:{ title:dkd_title_value, body:dkd_body_value, priority:dkd_notifications_value.AndroidNotificationPriority?.MAX, data:dkd_data_value }, trigger:null });
    return { dkd_ok_value:true };
  } catch (dkd_error_value) { return { dkd_ok_value:false, dkd_reason_value:dkd_error_value?.message || String(dkd_error_value) }; }
}

export async function dkd_panel_notify_new_order(dkd_order_value={}) {
  const dkd_title_value = String(dkd_order_value?.title || dkd_order_value?.product_title || 'Yeni sipariş').trim();
  const dkd_ref_value = String(dkd_order_value?.dkd_order_ref_text || dkd_order_value?.order_ref || dkd_order_value?.id || '').trim();
  return dkd_panel_present_local_notification_value('Yeni Sipariş Geldi',dkd_ref_value ? `#${dkd_ref_value} • ${dkd_title_value}` : dkd_title_value,{ dkd_route_value:'orders',dkd_job_id_value:dkd_order_value?.id || null,dkd_event_key:'new_order' });
}

export async function dkd_panel_handle_job_realtime_notification(dkd_payload_value={}) {
  try {
    if (String(dkd_payload_value?.eventType || '').toUpperCase() !== 'UPDATE') return { dkd_ok_value:true,dkd_skipped_value:true };
    const dkd_record_value = dkd_payload_value?.new || {};
    const dkd_old_record_value = dkd_payload_value?.old || {};
    const dkd_job_id_value = String(dkd_record_value?.id || '').trim();
    if (!dkd_job_id_value) return { dkd_ok_value:true,dkd_skipped_value:true };
    const dkd_status_value = String(dkd_record_value?.status || '').toLowerCase();
    const dkd_pickup_status_value = String(dkd_record_value?.pickup_status || '').toLowerCase();
    const dkd_old_status_value = String(dkd_old_record_value?.status || '').toLowerCase();
    const dkd_old_pickup_status_value = String(dkd_old_record_value?.pickup_status || '').toLowerCase();
    const dkd_order_ref_value = String(dkd_record_value?.dkd_order_ref_text || dkd_record_value?.dkd_order_id_text || dkd_job_id_value).trim();
    const dkd_title_value = String(dkd_record_value?.title || dkd_record_value?.product_title || 'Sipariş').trim();

    let dkd_event_key_value = '';
    let dkd_notification_title_value = '';
    let dkd_notification_body_value = '';
    if ((['completed','delivered','done','finished'].includes(dkd_status_value) || ['delivered','completed'].includes(dkd_pickup_status_value) || dkd_record_value?.is_active === false)
      && !(['completed','delivered','done','finished'].includes(dkd_old_status_value) || ['delivered','completed'].includes(dkd_old_pickup_status_value) || dkd_old_record_value?.is_active === false)) {
      dkd_event_key_value='delivered'; dkd_notification_title_value='Sipariş Teslim Edildi'; dkd_notification_body_value=`#${dkd_order_ref_value} • ${dkd_title_value} teslimatı tamamlandı.`;
    } else if ((['picked_up','to_customer','delivering'].includes(dkd_status_value) || dkd_pickup_status_value === 'picked_up')
      && !(['picked_up','to_customer','delivering'].includes(dkd_old_status_value) || dkd_old_pickup_status_value === 'picked_up')) {
      dkd_event_key_value='picked_up'; dkd_notification_title_value='Kurye Paketi Teslim Aldı'; dkd_notification_body_value=`#${dkd_order_ref_value} • ${dkd_title_value} kurye tarafından teslim alındı ve müşteriye doğru yola çıktı.`;
    } else if (['accepted','assigned','to_pickup'].includes(dkd_status_value) && !['accepted','assigned','to_pickup'].includes(dkd_old_status_value)) {
      dkd_event_key_value='accepted'; dkd_notification_title_value='Kurye Görevi Kabul Etti'; dkd_notification_body_value=`#${dkd_order_ref_value} • ${dkd_title_value} kurye tarafından kabul edildi.`;
    } else return { dkd_ok_value:true,dkd_skipped_value:true };

    if (!dkd_remember_notification_key_value(`${dkd_job_id_value}:${dkd_event_key_value}`)) return { dkd_ok_value:true,dkd_duplicate_value:true };
    return dkd_panel_present_local_notification_value(dkd_notification_title_value,dkd_notification_body_value,{ dkd_route_value:'orders',dkd_job_id_value,dkd_event_key:dkd_event_key_value });
  } catch (dkd_error_value) { return { dkd_ok_value:false,dkd_reason_value:dkd_error_value?.message || String(dkd_error_value) }; }
}
