import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

let dkd_notifications_module_promise_value = null;
let dkd_device_module_promise_value = null;
let dkd_handler_ready_value = false;

function dkd_is_expo_go_value() {
  return Constants?.appOwnership === 'expo';
}

async function dkd_notifications_module_value() {
  if (!dkd_notifications_module_promise_value) dkd_notifications_module_promise_value = import('expo-notifications');
  return dkd_notifications_module_promise_value;
}

async function dkd_device_module_value() {
  if (!dkd_device_module_promise_value) dkd_device_module_promise_value = import('expo-device');
  return dkd_device_module_promise_value;
}

function dkd_project_id_value() {
  return Constants?.easConfig?.projectId || Constants?.expoConfig?.extra?.eas?.projectId || null;
}

export async function dkd_panel_prime_notifications() {
  try {
    const dkd_notifications_value = await dkd_notifications_module_value();
    if (!dkd_handler_ready_value) {
      dkd_notifications_value.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      dkd_handler_ready_value = true;
    }
    if (Platform.OS === 'android') {
      await dkd_notifications_value.setNotificationChannelAsync('draborngo-panel', {
        name: 'DraBornGo Panel',
        importance: dkd_notifications_value.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 180, 100, 220],
        lightColor: '#69E9FF',
      });
    }
    return { dkd_ok_value: true };
  } catch (dkd_error_value) {
    return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) };
  }
}

export async function dkd_panel_register_push_token() {
  try {
    if (Platform.OS === 'android' && dkd_is_expo_go_value()) return { dkd_ok_value: false, dkd_reason_value: 'expo_go_remote_push_unavailable' };
    await dkd_panel_prime_notifications();
    const dkd_device_value = await dkd_device_module_value();
    if (!dkd_device_value?.isDevice) return { dkd_ok_value: false, dkd_reason_value: 'physical_device_required' };
    const dkd_notifications_value = await dkd_notifications_module_value();
    let dkd_permission_value = await dkd_notifications_value.getPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') dkd_permission_value = await dkd_notifications_value.requestPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') return { dkd_ok_value: false, dkd_reason_value: 'permission_denied' };
    const dkd_project_id = dkd_project_id_value();
    if (!dkd_project_id) return { dkd_ok_value: false, dkd_reason_value: 'missing_project_id' };
    const dkd_token_value = (await dkd_notifications_value.getExpoPushTokenAsync({ projectId: dkd_project_id })).data;
    const { error: dkd_error_value } = await supabase.rpc('dkd_upsert_push_token', {
      dkd_param_token: dkd_token_value,
      dkd_param_platform: Platform.OS,
      dkd_param_app_mode: 'draborngo-panel-release',
      dkd_param_device_name: dkd_device_value?.deviceName || 'DraBornGo Panel',
    });
    if (dkd_error_value) throw dkd_error_value;
    return { dkd_ok_value: true, dkd_token_value };
  } catch (dkd_error_value) {
    return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) };
  }
}

export async function dkd_panel_notify_new_order(dkd_order_value = {}) {
  try {
    if (Platform.OS === 'android' && dkd_is_expo_go_value()) return { dkd_ok_value: false, dkd_reason_value: 'expo_go_notification_runtime_unavailable' };
    await dkd_panel_prime_notifications();
    const dkd_notifications_value = await dkd_notifications_module_value();
    const dkd_permission_value = await dkd_notifications_value.getPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') return { dkd_ok_value: false, dkd_reason_value: 'permission_denied' };
    const dkd_title_value = String(dkd_order_value?.title || dkd_order_value?.product_title || 'Yeni sipariş').trim();
    const dkd_ref_value = String(dkd_order_value?.dkd_order_ref_text || dkd_order_value?.order_ref || dkd_order_value?.id || '').trim();
    await dkd_notifications_value.scheduleNotificationAsync({
      content: {
        title: 'Yeni Sipariş Geldi',
        body: dkd_ref_value ? `#${dkd_ref_value} • ${dkd_title_value}` : dkd_title_value,
        sound: 'default',
        priority: dkd_notifications_value.AndroidNotificationPriority?.MAX,
        data: { dkd_route_value: 'orders', dkd_job_id_value: dkd_order_value?.id || null },
      },
      trigger: null,
    });
    return { dkd_ok_value: true };
  } catch (dkd_error_value) {
    return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) };
  }
}
