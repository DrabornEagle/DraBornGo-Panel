import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  DkdMetricCard, DkdPeriodTabs, DkdSectionTitle, DkdStatusPill, dkd_money,
} from '../components/PanelComponents';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import CourierLiveDetailModal from '../components/CourierLiveDetailModal';
import { dkd_gradients, dkd_theme } from '../lib/theme';
import { dkd_panel_fetch_couriers, dkd_panel_fetch_dashboard, dkd_panel_fetch_orders } from '../services/panelService';

function DkdDashboardHero({ businessName, onRefresh, refreshing }) {
  return <LinearGradient colors={['#09253A', '#12345B', '#2C1C54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
    <View style={styles.heroGlowOne} /><View style={styles.heroGlowTwo} />
    <View style={styles.heroTop}>
      <LinearGradient colors={['#6CEAFF', '#6FF0B6']} style={styles.heroIcon}><MaterialCommunityIcons name="storefront-outline" size={28} color="#07131D" /></LinearGradient>
      <View style={styles.heroCopy}><Text style={styles.heroKicker}>DRABORNGO PANEL • v0.0.1</Text><Text style={styles.heroTitle} numberOfLines={1}>{businessName || 'İşletme Paneli'}</Text><Text style={styles.heroSub}>Kazanç, sipariş ve kurye operasyonunu tek merkezden yönet.</Text></View>
      <Pressable onPress={onRefresh} disabled={refreshing} style={styles.refreshButton}><MaterialCommunityIcons name={refreshing ? 'progress-clock' : 'refresh'} size={22} color="#E8F7FF" /></Pressable>
    </View>
    <View style={styles.heroBadges}>
      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>Canlı Takip</Text></View>
      <View style={styles.secureBadge}><MaterialCommunityIcons name="shield-check-outline" size={16} color="#9CF1D2" /><Text style={styles.secureText}>RLS korumalı</Text></View>
    </View>
  </LinearGradient>;
}

export default function DashboardScreenPro({ business, refreshSignal = 0 }) {
  const [dkd_period, dkd_set_period] = useState('daily');
  const [dkd_data, dkd_set_data] = useState({});
  const [dkd_orders, dkd_set_orders] = useState([]);
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');
  const [dkd_selected_courier_id, dkd_set_selected_courier_id] = useState(null);

  const dkd_load = useCallback(async (dkd_silent = false) => {
    if (!dkd_silent) dkd_set_refreshing(true);
    dkd_set_error('');
    try {
      const [dkd_dashboard_value, dkd_orders_value, dkd_couriers_value] = await Promise.all([
        dkd_panel_fetch_dashboard(), dkd_panel_fetch_orders(100), dkd_panel_fetch_couriers(),
      ]);
      dkd_set_data(dkd_dashboard_value || {});
      dkd_set_orders(dkd_orders_value || []);
      dkd_set_couriers(dkd_couriers_value || []);
    } catch (dkd_load_error) {
      dkd_set_error(String(dkd_load_error.message || dkd_load_error));
    } finally {
      dkd_set_loading(false); dkd_set_refreshing(false);
    }
  }, []);

  useEffect(() => { dkd_load(true); }, [dkd_load, refreshSignal]);

  const dkd_period_data = dkd_data?.[dkd_period] || {};
  const dkd_active_orders = useMemo(() => dkd_orders.filter((dkd_order) => !['completed', 'delivered', 'cancelled', 'canceled'].includes(String(dkd_order.dkd_status || '').toLowerCase())).slice(0, 4), [dkd_orders]);
  const dkd_online_couriers = useMemo(() => dkd_couriers.filter((dkd_item) => dkd_item.dkd_is_online).slice(0, 4), [dkd_couriers]);
  const dkd_selected_courier = useMemo(() => dkd_couriers.find((dkd_item) => String(dkd_item.dkd_courier_user_id) === String(dkd_selected_courier_id || '')) || null, [dkd_couriers, dkd_selected_courier_id]);
  const dkd_selected_order = useMemo(() => dkd_orders.find((dkd_order) => {
    const dkd_status_value = String(dkd_order.dkd_status || '').toLowerCase();
    const dkd_is_active_value = !['completed', 'delivered', 'cancelled', 'canceled'].includes(dkd_status_value);
    return dkd_is_active_value && String(dkd_order.dkd_courier_user_id || '') === String(dkd_selected_courier_id || '');
  }) || null, [dkd_orders, dkd_selected_courier_id]);

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator size="large" color={dkd_theme.cyan} /><Text style={styles.loaderText}>Panel hazırlanıyor…</Text></View>;

  return <ScrollView
    style={styles.root}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={() => dkd_load(false)} tintColor={dkd_theme.cyan} />}
  >
    <DkdDashboardHero businessName={business?.dkd_business_name || dkd_data?.dkd_business_name} onRefresh={() => dkd_load(false)} refreshing={dkd_refreshing} />
    {!!dkd_error && <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={19} color="#FF9DA8" /><Text style={styles.errorText}>{dkd_error}</Text></View>}

    <DkdSectionTitle icon="finance" title="Kazanç Merkezi" subtitle="Saatlik, günlük, haftalık ve aylık işletme performansı" />
    <DkdPeriodTabs value={dkd_period} onChange={dkd_set_period} />
    <View style={styles.metricGrid}>
      <DkdMetricCard delay={0} icon="cash-multiple" label="BRÜT TESLİMAT" value={dkd_money(dkd_period_data.dkd_gross_tl)} sub={`${dkd_period_data.dkd_completed_orders || 0} tamamlanan sipariş`} gradient={dkd_gradients.cyanBlue} />
      <DkdMetricCard delay={70} icon="bike-fast" label="KURYE MALİYETİ" value={dkd_money(dkd_period_data.dkd_courier_cost_tl)} sub="Paket + saatlik ücret" gradient={dkd_gradients.violetPink} />
      <DkdMetricCard delay={140} icon="chart-line" label="NET KAZANÇ" value={dkd_money(dkd_period_data.dkd_net_tl)} sub="Brüt − kurye maliyeti" gradient={dkd_gradients.greenBlue} />
      <DkdMetricCard delay={210} icon="package-variant-closed-check" label="AKTİF SİPARİŞ" value={String(dkd_data?.dkd_active_orders || 0)} sub="Şu anda operasyonda" gradient={dkd_gradients.orangePink} />
    </View>

    <LinearGradient colors={['#092938', '#10284F', '#2C1B50']} style={styles.operationPanel}>
      <View style={styles.operationGlowOne} /><View style={styles.operationGlowTwo} />
      <View style={styles.operationHead}>
        <LinearGradient colors={['#071D30', '#102D49']} style={styles.operationIcon}><RacingMotorcycle color="#65E9FF" accentColor="#F5FAFF" size={50} /></LinearGradient>
        <View style={styles.operationCopy}><Text style={styles.operationTitle}>Kurye Operasyonu</Text><Text style={styles.operationSub}>{dkd_data?.dkd_couriers_online || 0} çevrimiçi • {dkd_data?.dkd_couriers_total || 0} bağlı kurye</Text></View>
        <View style={styles.operationLive}><View style={styles.operationLiveDot} /><Text style={styles.operationLiveText}>CANLI</Text></View>
      </View>
      <View style={styles.summaryRow}>
        <LinearGradient colors={['rgba(62,229,169,.22)', 'rgba(40,125,121,.11)']} style={styles.operationMetric}><View style={styles.operationMetricIcon}><MaterialCommunityIcons name="access-point" size={23} color="#62F0B6" /></View><Text style={styles.summaryNumber}>{dkd_data?.dkd_couriers_online || 0}</Text><Text style={styles.summaryLabel}>Çevrimiçi</Text></LinearGradient>
        <LinearGradient colors={['rgba(75,209,255,.22)', 'rgba(69,101,210,.11)']} style={styles.operationMetric}><View style={styles.operationMetricIcon}><MaterialCommunityIcons name="account-group" size={23} color="#75E8FF" /></View><Text style={styles.summaryNumber}>{dkd_data?.dkd_couriers_total || 0}</Text><Text style={styles.summaryLabel}>Toplam Kurye</Text></LinearGradient>
        <LinearGradient colors={['rgba(255,199,86,.23)', 'rgba(217,111,69,.11)']} style={styles.operationMetric}><View style={styles.operationMetricIcon}><MaterialCommunityIcons name="package-variant-closed" size={23} color="#FFD36F" /></View><Text style={styles.summaryNumber}>{dkd_data?.dkd_active_orders || 0}</Text><Text style={styles.summaryLabel}>Aktif Paket</Text></LinearGradient>
      </View>

      {dkd_online_couriers.length > 0 && <View style={styles.operationCourierList}>
        {dkd_online_couriers.map((dkd_courier, dkd_index) => <Pressable key={dkd_courier.dkd_courier_user_id} onPress={() => dkd_set_selected_courier_id(dkd_courier.dkd_courier_user_id)} style={({ pressed }) => [styles.operationCourierRow, dkd_index > 0 && styles.operationCourierBorder, pressed && styles.operationCourierPressed]}>
          <LinearGradient colors={['rgba(99,235,255,.18)', 'rgba(98,240,182,.13)']} style={styles.avatar}><RacingMotorcycle color="#75E8FF" accentColor="#F5FAFF" size={39} /></LinearGradient>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>{dkd_courier.dkd_display_name}</Text><Text style={styles.rowSub}>{dkd_courier.dkd_plate_no || 'Plaka yok'} • {dkd_courier.dkd_city || 'Bölge yok'}</Text></View>
          <DkdStatusPill text="ONLINE" tone="green" /><MaterialCommunityIcons name="chevron-right" size={21} color="#84E9FF" />
        </Pressable>)}
      </View>}
    </LinearGradient>

    <DkdSectionTitle icon="truck-delivery-outline" title="Canlı Siparişler" subtitle="Kurye ataması, hedef adres ve teslimat durumu" />
    <View style={styles.listCard}>
      {dkd_active_orders.length === 0 ? <Text style={styles.emptyText}>Şu anda aktif sipariş yok.</Text> : dkd_active_orders.map((dkd_order, dkd_index) => <View key={String(dkd_order.dkd_job_id)} style={[styles.orderRow, dkd_index > 0 && styles.rowBorder]}>
        <View style={styles.orderIcon}><MaterialCommunityIcons name="package-variant-closed" size={20} color="#FFE08A" /></View>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>#{dkd_order.dkd_order_ref} • {dkd_order.dkd_title}</Text><Text style={styles.rowSub} numberOfLines={1}>{dkd_order.dkd_dropoff || 'Adres bekleniyor'}</Text><Text style={styles.orderCourier}>{dkd_order.dkd_courier_name || 'Kurye atanmadı'} {dkd_order.dkd_courier_plate ? `• ${dkd_order.dkd_courier_plate}` : ''}</Text></View>
        <DkdStatusPill text={String(dkd_order.dkd_status || 'bekliyor').toUpperCase()} tone={dkd_order.dkd_courier_user_id ? 'blue' : 'yellow'} />
      </View>)}
    </View>
    <CourierLiveDetailModal visible={Boolean(dkd_selected_courier_id)} courier={dkd_selected_courier} order={dkd_selected_order} onClose={() => dkd_set_selected_courier_id(null)} />
    <View style={styles.bottomSpacer} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dkd_theme.background }, content: { padding: 14, paddingTop: 10 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dkd_theme.background, gap: 10 }, loaderText: { color: dkd_theme.textSoft, fontSize: 14, fontWeight: '800' }, bottomSpacer: { height: 110 },
  hero: { borderRadius: 29, padding: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(159,224,255,.18)', minHeight: 178 }, heroGlowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: 'rgba(102,232,255,.11)', top: -90, right: -70 }, heroGlowTwo: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: 'rgba(255,109,178,.09)', bottom: -135, left: -110 }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, minWidth: 0 }, heroKicker: { color: '#BAF4FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.1 }, heroTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 3 }, heroSub: { color: '#AFBED1', fontSize: 14, fontWeight: '700', marginTop: 5, lineHeight: 19 }, refreshButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' }, heroBadges: { flexDirection: 'row', gap: 8, marginTop: 17 }, liveBadge: { minHeight: 32, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(76,233,170,.10)', borderWidth: 1, borderColor: 'rgba(76,233,170,.16)', flexDirection: 'row', alignItems: 'center', gap: 7 }, liveDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#61F0B5' }, liveText: { color: '#A8F5D2', fontSize: 13, fontWeight: '900' }, secureBadge: { minHeight: 32, paddingHorizontal: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 7 }, secureText: { color: '#D3E0EF', fontSize: 13, fontWeight: '800' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,107,124,.08)', borderRadius: 14, padding: 10, marginTop: 10 }, errorText: { flex: 1, color: '#FFB5BD', fontSize: 13.5, fontWeight: '800' }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  operationPanel: { borderRadius: 28, padding: 14, marginTop: 20, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(111,227,255,.16)' }, operationGlowOne: { position: 'absolute', width: 170, height: 170, borderRadius: 999, right: -80, top: -95, backgroundColor: 'rgba(106,232,255,.10)' }, operationGlowTwo: { position: 'absolute', width: 160, height: 160, borderRadius: 999, left: -95, bottom: -110, backgroundColor: 'rgba(170,108,255,.10)' }, operationHead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13 }, operationIcon: { width: 62, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, operationCopy: { flex: 1, minWidth: 0 }, operationTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' }, operationSub: { color: '#AABDD5', fontSize: 13.5, fontWeight: '700', marginTop: 3 }, operationLive: { minHeight: 31, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(82,234,173,.11)', borderWidth: 1, borderColor: 'rgba(82,234,173,.17)' }, operationLiveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#62F0B6' }, operationLiveText: { color: '#8BF4C8', fontSize: 11.5, fontWeight: '900', letterSpacing: .65 }, summaryRow: { flexDirection: 'row', gap: 8 }, operationMetric: { flex: 1, minHeight: 112, borderRadius: 20, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', overflow: 'hidden' }, operationMetricIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.08)' }, summaryNumber: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 9 }, summaryLabel: { color: '#C6D3E4', fontSize: 13, fontWeight: '900', marginTop: 2 }, operationCourierList: { marginTop: 12, backgroundColor: 'rgba(3,10,24,.28)', borderRadius: 20, paddingHorizontal: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' }, operationCourierRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, operationCourierPressed: { opacity: .74, transform: [{ scale: .992 }] }, operationCourierBorder: { borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.08)' },
  listCard: { backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border, borderRadius: 22, paddingHorizontal: 12 }, avatar: { width: 50, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { color: dkd_theme.text, fontSize: 14.5, fontWeight: '900' }, rowSub: { color: dkd_theme.textSoft, fontSize: 13, fontWeight: '700', marginTop: 3 }, rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.08)' }, orderCourier: { color: '#87DFF0', fontSize: 13, fontWeight: '800', marginTop: 4 }, orderRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, orderIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,107,.08)' }, emptyText: { color: dkd_theme.textSoft, textAlign: 'center', padding: 24, fontSize: 14, fontWeight: '700' },
});
