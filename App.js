// DraBornGo Panel v0.0.2 live operation hotfix.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AuthScreen from './src/screens/AuthScreenStable';
import DashboardScreen from './src/screens/DashboardScreenPro';
import OrdersScreen from './src/screens/OrdersScreenV2';
import CouriersScreen from './src/screens/CouriersScreenV2';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { dkd_theme } from './src/lib/theme';
import { dkd_supabase_ready, supabase } from './src/lib/supabase';
import { dkd_panel_ensure_business_profile, dkd_panel_fetch_business_profile, dkd_panel_fetch_orders, dkd_panel_subscribe_live } from './src/services/panelService';
import { dkd_panel_handle_job_realtime_notification, dkd_panel_notify_new_order, dkd_panel_prime_notifications, dkd_panel_register_push_token } from './src/services/notificationService';

const dkd_tabs = [
  { key:'dashboard',label:'Özet',icon:'view-dashboard-outline',activeIcon:'view-dashboard' },
  { key:'orders',label:'Sipariş',icon:'package-variant-closed',activeIcon:'package-variant' },
  { key:'couriers',label:'Kuryeler',icon:'bike-fast',activeIcon:'motorbike' },
  { key:'reports',label:'Rapor',icon:'chart-box-outline',activeIcon:'chart-box' },
  { key:'settings',label:'Ayarlar',icon:'cog-outline',activeIcon:'cog' },
];

function DkdBottomBar({ value,onChange }) {
  return <View style={styles.navWrap}><View style={styles.navBar}>{dkd_tabs.map((dkd_tab) => {
    const dkd_active = value === dkd_tab.key;
    return <Pressable key={dkd_tab.key} onPress={() => { Haptics.selectionAsync().catch(() => null); onChange(dkd_tab.key); }} style={styles.navItem}><Animated.View style={[styles.navIcon,dkd_active && styles.navIconActive]}><MaterialCommunityIcons name={dkd_active ? dkd_tab.activeIcon : dkd_tab.icon} size={21} color={dkd_active ? '#07121D' : '#71839C'} /></Animated.View><Text numberOfLines={1} style={[styles.navText,dkd_active && styles.navTextActive]}>{dkd_tab.label}</Text></Pressable>;
  })}</View></View>;
}

function dkd_order_snapshot_value(dkd_order_value) {
  return {
    id: dkd_order_value?.dkd_job_id,
    status: dkd_order_value?.dkd_status,
    pickup_status: dkd_order_value?.dkd_pickup_status,
    is_active: !['completed','delivered','cancelled','canceled'].includes(String(dkd_order_value?.dkd_status || '').toLowerCase()),
    dkd_order_ref_text: dkd_order_value?.dkd_order_ref,
    title: dkd_order_value?.dkd_title,
    product_title: dkd_order_value?.dkd_title,
  };
}
function dkd_order_snapshot_changed_value(dkd_previous_value,dkd_next_value) {
  if (!dkd_previous_value || !dkd_next_value) return false;
  return String(dkd_previous_value.status || '') !== String(dkd_next_value.status || '')
    || String(dkd_previous_value.pickup_status || '') !== String(dkd_next_value.pickup_status || '')
    || Boolean(dkd_previous_value.is_active) !== Boolean(dkd_next_value.is_active);
}

function DkdAuthenticatedApp({ session }) {
  const [dkd_tab,dkd_set_tab] = useState('dashboard');
  const [dkd_business,dkd_set_business] = useState(null);
  const [dkd_loading,dkd_set_loading] = useState(true);
  const [dkd_error,dkd_set_error] = useState('');
  const [dkd_refresh_signal,dkd_set_refresh_signal] = useState(0);
  const dkd_last_notified_job_ref = useRef(new Set());
  const dkd_order_state_ref_value = useRef(new Map());
  const dkd_order_poll_ready_ref_value = useRef(false);

  const dkd_load_profile = useCallback(async () => {
    dkd_set_error('');
    try {
      let dkd_profile_value = await dkd_panel_fetch_business_profile();
      if (!dkd_profile_value?.dkd_ok_value) { await dkd_panel_ensure_business_profile(session?.user); dkd_profile_value = await dkd_panel_fetch_business_profile(); }
      if (!dkd_profile_value?.dkd_ok_value) throw new Error('Bu hesap için işletme profili bulunamadı. Kayıt ekranından işletme hesabı oluştur.');
      dkd_set_business(dkd_profile_value);
    } catch (dkd_profile_error) { dkd_set_error(String(dkd_profile_error.message || dkd_profile_error)); }
    finally { dkd_set_loading(false); }
  },[session?.user]);

  useEffect(() => { dkd_load_profile(); },[dkd_load_profile]);
  useEffect(() => {
    let dkd_cancelled_value = false;
    (async () => { await dkd_panel_prime_notifications(); if (!dkd_cancelled_value) await dkd_panel_register_push_token(); })();
    return () => { dkd_cancelled_value = true; };
  },[session?.user?.id]);
  useEffect(() => { const dkd_interval_value = setInterval(() => dkd_set_refresh_signal((dkd_value) => dkd_value + 1),4000); return () => clearInterval(dkd_interval_value); },[]);

  useEffect(() => {
    return dkd_panel_subscribe_live((dkd_payload_value) => {
      dkd_set_refresh_signal((dkd_value) => dkd_value + 1);
      const dkd_table_value = String(dkd_payload_value?.table || '').trim();
      const dkd_event_value = String(dkd_payload_value?.eventType || '').toUpperCase();
      const dkd_record_value = dkd_payload_value?.new || {};
      if (dkd_table_value === 'dkd_courier_jobs' && dkd_event_value === 'INSERT') {
        const dkd_job_key_value = String(dkd_record_value?.id || '').trim();
        if (dkd_job_key_value && !dkd_last_notified_job_ref.current.has(dkd_job_key_value)) {
          dkd_last_notified_job_ref.current.add(dkd_job_key_value);
          dkd_panel_notify_new_order(dkd_record_value).catch(() => null);
        }
      }
    });
  },[]);

  useEffect(() => {
    let dkd_cancelled_value = false;
    async function dkd_poll_order_states_value() {
      try {
        const dkd_order_values = await dkd_panel_fetch_orders(120);
        if (dkd_cancelled_value) return;
        const dkd_next_map_value = new Map();
        for (const dkd_order_value of Array.isArray(dkd_order_values) ? dkd_order_values : []) {
          const dkd_next_snapshot_value = dkd_order_snapshot_value(dkd_order_value);
          const dkd_key_value = String(dkd_next_snapshot_value.id || '');
          if (!dkd_key_value) continue;
          const dkd_previous_snapshot_value = dkd_order_state_ref_value.current.get(dkd_key_value);
          if (dkd_order_poll_ready_ref_value.current && dkd_order_snapshot_changed_value(dkd_previous_snapshot_value,dkd_next_snapshot_value)) {
            dkd_panel_handle_job_realtime_notification({ eventType:'UPDATE',new:dkd_next_snapshot_value,old:dkd_previous_snapshot_value || {} }).catch(() => null);
          }
          dkd_next_map_value.set(dkd_key_value,dkd_next_snapshot_value);
        }
        dkd_order_state_ref_value.current = dkd_next_map_value;
        dkd_order_poll_ready_ref_value.current = true;
      } catch {}
    }
    dkd_poll_order_states_value();
    const dkd_interval_value = setInterval(dkd_poll_order_states_value,3000);
    return () => { dkd_cancelled_value = true; clearInterval(dkd_interval_value); };
  },[]);

  if (dkd_loading) return <View style={styles.loading}><ActivityIndicator color={dkd_theme.cyan} size="large" /><Text style={styles.loadingText}>İşletme hesabı hazırlanıyor…</Text></View>;
  if (dkd_error) return <View style={styles.loading}><MaterialCommunityIcons name="alert-circle-outline" size={36} color={dkd_theme.red} /><Text style={styles.errorTitle}>Panel açılamadı</Text><Text style={styles.errorText}>{dkd_error}</Text><Pressable onPress={dkd_load_profile} style={styles.retry}><Text style={styles.retryText}>Tekrar Dene</Text></Pressable><Pressable onPress={() => supabase.auth.signOut()} style={styles.logoutMini}><Text style={styles.logoutMiniText}>Çıkış Yap</Text></Pressable></View>;

  return <View style={styles.appRoot}>
    {dkd_tab === 'dashboard' && <DashboardScreen business={dkd_business} refreshSignal={dkd_refresh_signal} />}
    {dkd_tab === 'orders' && <OrdersScreen refreshSignal={dkd_refresh_signal} />}
    {dkd_tab === 'couriers' && <CouriersScreen refreshSignal={dkd_refresh_signal} />}
    {dkd_tab === 'reports' && <ReportsScreen refreshSignal={dkd_refresh_signal} />}
    {dkd_tab === 'settings' && <SettingsScreen business={dkd_business} onProfileUpdated={dkd_load_profile} />}
    <DkdBottomBar value={dkd_tab} onChange={dkd_set_tab} />
  </View>;
}

export default function App() {
  const [dkd_session,dkd_set_session] = useState(null);
  const [dkd_booting,dkd_set_booting] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { dkd_set_session(data?.session || null); dkd_set_booting(false); });
    const { data:dkd_listener } = supabase.auth.onAuthStateChange((_dkd_event,dkd_next_session) => { dkd_set_session(dkd_next_session); dkd_set_booting(false); });
    return () => dkd_listener?.subscription?.unsubscribe();
  },[]);
  return <SafeAreaProvider><StatusBar style="light" translucent backgroundColor="transparent" /><NavigationBar style="dark" hidden={false} /><SafeAreaView style={styles.safe} edges={['top']}>{!dkd_supabase_ready ? <View style={styles.loading}><MaterialCommunityIcons name="database-alert-outline" size={38} color={dkd_theme.yellow} /><Text style={styles.errorTitle}>Supabase ayarı eksik</Text><Text style={styles.errorText}>DraBornGo ortak Supabase bağlantısı yüklenemedi. Güncel GitHub sürümüne eşitle.</Text></View> : dkd_booting ? <View style={styles.loading}><ActivityIndicator size="large" color={dkd_theme.cyan} /></View> : dkd_session ? <DkdAuthenticatedApp session={dkd_session} /> : <AuthScreen />}</SafeAreaView></SafeAreaProvider>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:dkd_theme.background},appRoot:{flex:1,backgroundColor:dkd_theme.background},loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:dkd_theme.background,padding:28,gap:10},loadingText:{color:dkd_theme.textSoft,fontSize:15,fontWeight:'800'},errorTitle:{color:dkd_theme.text,fontSize:22,fontWeight:'900',textAlign:'center'},errorText:{color:dkd_theme.textSoft,fontSize:14.5,lineHeight:21,fontWeight:'700',textAlign:'center',maxWidth:340},retry:{marginTop:10,minHeight:50,minWidth:140,borderRadius:15,backgroundColor:dkd_theme.cyan,alignItems:'center',justifyContent:'center'},retryText:{color:'#07121D',fontSize:14,fontWeight:'900'},logoutMini:{minHeight:44,minWidth:120,alignItems:'center',justifyContent:'center'},logoutMiniText:{color:'#FF9EAA',fontSize:13.5,fontWeight:'900'},navWrap:{position:'absolute',left:10,right:10,bottom:8},navBar:{minHeight:76,borderRadius:26,paddingHorizontal:5,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(8,17,30,.98)',borderWidth:1,borderColor:'rgba(166,217,255,.16)'},navItem:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:4},navIcon:{width:37,height:36,borderRadius:13,alignItems:'center',justifyContent:'center'},navIconActive:{backgroundColor:dkd_theme.cyan},navText:{color:'#71839C',fontSize:11.5,fontWeight:'900'},navTextActive:{color:'#CFF8FF'}
});
