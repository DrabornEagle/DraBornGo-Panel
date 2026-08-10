import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  DkdHero, DkdMetricCard, DkdPeriodTabs, DkdSectionTitle, DkdStatusPill, dkd_money,
} from '../components/PanelComponents';
import { dkd_gradients, dkd_theme } from '../lib/theme';
import { dkd_panel_fetch_couriers, dkd_panel_fetch_dashboard, dkd_panel_fetch_orders } from '../services/panelService';

export default function DashboardScreen({ business, refreshSignal = 0 }) {
  const [dkd_period, dkd_set_period] = useState('daily');
  const [dkd_data, dkd_set_data] = useState({});
  const [dkd_orders, dkd_set_orders] = useState([]);
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');

  const dkd_load = useCallback(async (dkd_silent = false) => {
    if (!dkd_silent) dkd_set_refreshing(true);
    dkd_set_error('');
    try {
      const [dkd_dashboard_value, dkd_orders_value, dkd_couriers_value] = await Promise.all([
        dkd_panel_fetch_dashboard(), dkd_panel_fetch_orders(20), dkd_panel_fetch_couriers(),
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
  const dkd_online_couriers = dkd_couriers.filter((dkd_item) => dkd_item.dkd_is_online).slice(0, 4);

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator size="large" color={dkd_theme.cyan} /><Text style={styles.loaderText}>Panel hazırlanıyor…</Text></View>;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={() => dkd_load(false)} tintColor={dkd_theme.cyan} />}
    >
      <DkdHero
        businessName={business?.dkd_business_name || dkd_data?.dkd_business_name}
        subtitle="Kazanç, sipariş akışı ve kurye operasyonu gerçek zamanlı tek ekranda."
        onRefresh={() => dkd_load(false)}
        refreshing={dkd_refreshing}
      />
      {!!dkd_error && <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={17} color="#FF9DA8" /><Text style={styles.errorText}>{dkd_error}</Text></View>}

      <DkdSectionTitle icon="finance" title="Kazanç Merkezi" subtitle="Saatlik, günlük, haftalık ve aylık işletme performansı" />
      <DkdPeriodTabs value={dkd_period} onChange={dkd_set_period} />
      <View style={styles.metricGrid}>
        <DkdMetricCard delay={0} icon="cash-multiple" label="BRÜT TESLİMAT" value={dkd_money(dkd_period_data.dkd_gross_tl)} sub={`${dkd_period_data.dkd_completed_orders || 0} tamamlanan sipariş`} gradient={dkd_gradients.cyanBlue} />
        <DkdMetricCard delay={70} icon="bike-fast" label="KURYE MALİYETİ" value={dkd_money(dkd_period_data.dkd_courier_cost_tl)} sub="Paket + saatlik ücret" gradient={dkd_gradients.violetPink} />
        <DkdMetricCard delay={140} icon="chart-line" label="NET KAZANÇ" value={dkd_money(dkd_period_data.dkd_net_tl)} sub="Brüt − kurye maliyeti" gradient={dkd_gradients.greenBlue} />
        <DkdMetricCard delay={210} icon="package-variant-closed-check" label="AKTİF SİPARİŞ" value={String(dkd_data?.dkd_active_orders || 0)} sub="Şu anda operasyonda" gradient={dkd_gradients.orangePink} />
      </View>

      <DkdSectionTitle icon="bike" title="Kurye Operasyonu" subtitle={`${dkd_data?.dkd_couriers_online || 0} çevrimiçi • ${dkd_data?.dkd_couriers_total || 0} bağlı kurye`} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}><MaterialCommunityIcons name="access-point" size={21} color={dkd_theme.green} /><Text style={styles.summaryNumber}>{dkd_data?.dkd_couriers_online || 0}</Text><Text style={styles.summaryLabel}>Çevrimiçi</Text></View>
        <View style={styles.summaryCard}><MaterialCommunityIcons name="account-group-outline" size={21} color={dkd_theme.cyan} /><Text style={styles.summaryNumber}>{dkd_data?.dkd_couriers_total || 0}</Text><Text style={styles.summaryLabel}>Toplam Kurye</Text></View>
        <View style={styles.summaryCard}><MaterialCommunityIcons name="package-variant" size={21} color={dkd_theme.yellow} /><Text style={styles.summaryNumber}>{dkd_data?.dkd_active_orders || 0}</Text><Text style={styles.summaryLabel}>Aktif Paket</Text></View>
      </View>

      {dkd_online_couriers.length > 0 && (
        <View style={styles.listCard}>
          {dkd_online_couriers.map((dkd_courier, dkd_index) => (
            <View key={dkd_courier.dkd_courier_user_id} style={[styles.courierRow, dkd_index > 0 && styles.rowBorder]}>
              <View style={styles.avatar}><MaterialCommunityIcons name="motorbike" size={19} color={dkd_theme.cyan} /></View>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>{dkd_courier.dkd_display_name}</Text><Text style={styles.rowSub}>{dkd_courier.dkd_plate_no || 'Plaka yok'} • {dkd_courier.dkd_city || 'Bölge yok'}</Text></View>
              <DkdStatusPill text="ONLINE" tone="green" />
            </View>
          ))}
        </View>
      )}

      <DkdSectionTitle icon="truck-delivery-outline" title="Canlı Siparişler" subtitle="Kurye ataması, hedef adres ve teslimat durumu" />
      <View style={styles.listCard}>
        {dkd_active_orders.length === 0 ? <Text style={styles.emptyText}>Şu anda aktif sipariş yok.</Text> : dkd_active_orders.map((dkd_order, dkd_index) => (
          <View key={String(dkd_order.dkd_job_id)} style={[styles.orderRow, dkd_index > 0 && styles.rowBorder]}>
            <View style={styles.orderIcon}><MaterialCommunityIcons name="package-variant-closed" size={18} color="#FFE08A" /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>#{dkd_order.dkd_order_ref} • {dkd_order.dkd_title}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{dkd_order.dkd_dropoff || 'Adres bekleniyor'}</Text>
              <Text style={styles.orderCourier}>{dkd_order.dkd_courier_name || 'Kurye atanmadı'} {dkd_order.dkd_courier_plate ? `• ${dkd_order.dkd_courier_plate}` : ''}</Text>
            </View>
            <DkdStatusPill text={String(dkd_order.dkd_status || 'bekliyor').toUpperCase()} tone={dkd_order.dkd_courier_user_id ? 'blue' : 'yellow'} />
          </View>
        ))}
      </View>
      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dkd_theme.background }, content: { padding: 14, paddingTop: 10 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dkd_theme.background, gap: 10 }, loaderText: { color: dkd_theme.textSoft, fontSize: 12.5, fontWeight: '800' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,107,124,.08)', borderRadius: 14, padding: 10, marginTop: 10 }, errorText: { flex: 1, color: '#FFB5BD', fontSize: 11.5, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  summaryRow: { flexDirection: 'row', gap: 8 }, summaryCard: { flex: 1, minHeight: 104, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border, borderRadius: 20, padding: 12 }, summaryNumber: { color: dkd_theme.text, fontSize: 24, fontWeight: '900', marginTop: 9 }, summaryLabel: { color: dkd_theme.textSoft, fontSize: 10.5, fontWeight: '900', marginTop: 2 },
  listCard: { backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border, borderRadius: 22, paddingHorizontal: 12 },
  courierRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.08)' }, avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(102,232,255,.08)' }, rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { color: dkd_theme.text, fontSize: 12.5, fontWeight: '900' }, rowSub: { color: dkd_theme.textSoft, fontSize: 11, fontWeight: '700', marginTop: 3 }, orderCourier: { color: '#87DFF0', fontSize: 10.5, fontWeight: '800', marginTop: 4 },
  orderRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, orderIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,107,.08)' }, emptyText: { color: dkd_theme.textSoft, textAlign: 'center', padding: 24, fontSize: 12, fontWeight: '700' },
});
