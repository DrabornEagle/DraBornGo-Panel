import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const dkd_panel_notification_channel_value = 'draborngo-panel-orders';
const dkd_panel_seen_order_storage_key_value = 'dkd_panel_notified_order_ids_v1';
const dkd_panel_seen_order_limit_value = 80;
let dkd_panel_notification_primed_value = false;

function dkd_text_value(dkd_value) { return String(dkd_value ?? '').trim(); }

export async function dkd_panel_prime_notifications() {
  try {
    if (!dkd_panel_notification_primed_value) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      dkd_panel_notification_primed_value = true;
    }
    const dkd_existing_value = await Notifications.getPermissionsAsync();
    let dkd_status_value = dkd_existing_value?.status;
    if (dkd_status_value !== 'granted') {
      const dkd_requested_value = await Notifications.requestPermissionsAsync();
      dkd_status_value = dkd_requested_value?.status;
    }
    if (dkd_status_value !== 'granted') return { dkd_ok_value: false, dkd_reason_value: 'permission_denied' };
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(dkd_panel_notification_channel_value, {
        name: 'DraBornGo Panel Siparişleri',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 180, 100, 220],
        lightColor: '#69EAFF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    return { dkd_ok_value: true };
  } catch (dkd_error_value) {
    return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) };
  }
}

async function dkd_panel_read_seen_order_ids() {
  try {
    const dkd_raw_value = await AsyncStorage.getItem(dkd_panel_seen_order_storage_key_value);
    const dkd_list_value = dkd_raw_value ? JSON.parse(dkd_raw_value) : [];
    return Array.isArray(dkd_list_value) ? dkd_list_value.map(dkd_text_value).filter(Boolean) : [];
  } catch { return []; }
}

async function dkd_panel_mark_order_notified(dkd_order_id_value) {
  const dkd_id_value = dkd_text_value(dkd_order_id_value);
  if (!dkd_id_value) return false;
  const dkd_seen_value = await dkd_panel_read_seen_order_ids();
  if (dkd_seen_value.includes(dkd_id_value)) return false;
  const dkd_next_value = [...dkd_seen_value, dkd_id_value].slice(-dkd_panel_seen_order_limit_value);
  await AsyncStorage.setItem(dkd_panel_seen_order_storage_key_value, JSON.stringify(dkd_next_value));
  return true;
}

export async function dkd_panel_notify_new_order(dkd_order_value = {}) {
  try {
    const dkd_order_id_value = dkd_text_value(dkd_order_value?.dkd_job_id ?? dkd_order_value?.id ?? dkd_order_value?.job_id);
    if (!dkd_order_id_value) return { dkd_ok_value: false, dkd_reason_value: 'missing_order_id' };
    const dkd_is_first_value = await dkd_panel_mark_order_notified(dkd_order_id_value);
    if (!dkd_is_first_value) return { dkd_ok_value: true, dkd_skipped_value: true };
    const dkd_prime_value = await dkd_panel_prime_notifications();
    if (!dkd_prime_value?.dkd_ok_value) return dkd_prime_value;
    const dkd_ref_value = dkd_text_value(dkd_order_value?.dkd_order_ref ?? dkd_order_value?.dkd_order_ref_text ?? dkd_order_id_value);
    const dkd_title_value = dkd_text_value(dkd_order_value?.dkd_title ?? dkd_order_value?.title ?? dkd_order_value?.product_title) || 'Yeni sipariş';
    const dkd_dropoff_value = dkd_text_value(dkd_order_value?.dkd_dropoff ?? dkd_order_value?.delivery_address_text ?? dkd_order_value?.dropoff);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Yeni Sipariş Geldi',
        body: `#${dkd_ref_value} • ${dkd_title_value}${dkd_dropoff_value ? ` • ${dkd_dropoff_value}` : ''}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority?.MAX,
        data: { route: 'orders', screen: 'orders', dkd_job_id: dkd_order_id_value },
      },
      trigger: null,
    });
    return { dkd_ok_value: true };
  } catch (dkd_error_value) {
    return { dkd_ok_value: false, dkd_reason_value: dkd_error_value?.message || String(dkd_error_value) };
  }
}
