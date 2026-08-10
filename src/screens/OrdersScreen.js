import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dkd_theme } from '../lib/theme';
import { DkdEmptyState, DkdSectionTitle, DkdStatusPill, dkd_money } from '../components/PanelComponents';
import { dkd_panel_fetch_orders } from '../services/panelService';

function dkd_status_tone(dkd_status) {
  const dkd_value = String(dkd_status || '').toLowerCase();
  if (['completed', 'delivered'].includes(dkd_value)) return 'green';
  if (['cancelled', 'canceled'].includes(dkd_value)) return 'red';
  if (['accepted', 'picked_up', 'to_customer', 'delivering'].includes(dkd_value)) return 'blue';
  return 'yellow';
}

function DkdOrderDetail({ order, onClose }) {
  if (!order) return null;
  const dkd_courier_lat = Number(order.dkd_courier_lat);
  const dkd_courier_lng = Number(order.dkd_courier_lng);
  const dkd_drop_lat = Number(order.dkd_dropoff_lat);
  const dkd_drop_lng = Number(order.dkd_dropoff_lng);
  const dkd_has_courier = Number.isFinite(dkd_courier_lat) && Number.isFinite(dkd_courier_lng);
  const dkd_has_drop = Number.isFinite(dkd_drop_lat) && Number.isFinite(dkd_drop_lng);
  const dkd_base_lat = dkd_has_courier ? dkd_courier_lat : dkd_has_drop ? dkd_drop_lat : 39.9334;
  const dkd_base_lng = dkd_has_courier ? dkd_courier_lng : dkd_has_drop ? dkd_drop_lng : 32.8597;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.detailHeader}>
            <View style={styles.detailIcon}><MaterialCommunityIcons name="package-variant-closed" size={22} color={dkd_theme.yellow} /></View>
            <View style={{ flex: 1 }}><Text style={styles.detailKicker}>SİPARİŞ DETAYI</Text><Text style={styles.detailTitle}>#{order.dkd_order_ref}</Text></View>
            <Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={20} color={dkd_theme.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 26 }}>
            {(dkd_has_courier || dkd_has_drop) && (
              <View style={styles.mapWrap}>
                <MapView style={styles.map} initialRegion={{ latitude: dkd_base_lat, longitude: dkd_base_lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
                  {dkd_has_courier && <Marker coordinate={{ latitude: dkd_courier_lat, longitude: dkd_courier_lng }} title={order.dkd_courier_name || 'Kurye'} description={order.dkd_courier_plate || 'Canlı konum'} pinColor="#5B8CFF" />}
                  {dkd_has_drop && <Marker coordinate={{ latitude: dkd_drop_lat, longitude: dkd_drop_lng }} title="Teslimat Adresi" description={order.dkd_dropoff || ''} pinColor="#FF6B7C" />}
                </MapView>
                <View style={styles.mapBadge}><View style={styles.liveDot} /><Text style={styles.mapBadgeText}>{dkd_has_courier ? 'Kurye konumu' : 'Teslimat noktası'}</Text></View>
              </View>
            )}
            <View style={styles.detailGrid}>
              <View style={styles.detailTile}><Text style={styles.detailLabel}>DURUM</Text><DkdStatusPill text={String(order.dkd_status || 'bekliyor').toUpperCase()} tone={dkd_status_tone(order.dkd_status)} /></View>
              <View style={styles.detailTile}><Text style={styles.detailLabel}>MESAFE</Text><Text style={styles.detailValue}>{Number(order.dkd_distance_km || 0).toFixed(1)} km</Text></View>
              <View style={styles.detailTile}><Text style={styles.detailLabel}>TAHMİNİ SÜRE</Text><Text style={styles.detailValue}>{order.dkd_eta_min || 0} dk</Text></View>
              <View style={styles.detailTile}><Text style={styles.detailLabel}>TESLİMAT TUTARI</Text><Text style={styles.detailValue}>{dkd_money(order.dkd_customer_charge_tl)}</Text></View>
            </View>
            <DkdSectionTitle icon="bike-fast" title="Atanan Kurye" />
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{order.dkd_courier_name || 'Henüz kurye atanmadı'}</Text>
              <Text style={styles.infoText}>{order.dkd_courier_plate || 'Plaka bilgisi yok'} {order.dkd_courier_online ? '• Çevrimiçi' : ''}</Text>
              {!!order.dkd_location_updated_at && <Text style={styles.infoTiny}>Konum güncellendi: {new Date(order.dkd_location_updated_at).toLocaleString('tr-TR')}</Text>}
            </View>
            <DkdSectionTitle icon="map-marker-outline" title="Teslimat Adresi" />
            <View style={styles.infoCard}><Text style={styles.infoTitle}>{order.dkd_dropoff || 'Adres bilgisi bekleniyor'}</Text><Text style={styles.infoText}>{order.dkd_pickup || 'Alış noktası belirtilmedi'}</Text></View>
            <DkdSectionTitle icon="timeline-clock-outline" title="Zaman Çizelgesi" />
            <View style={styles.infoCard}>
              {[
                ['Sipariş oluşturuldu', order.dkd_created_at], ['Kurye kabul etti', order.dkd_accepted_at], ['Paket alındı', order.dkd_picked_up_at], ['Teslim tamamlandı', order.dkd_completed_at],
              ].map(([dkd_label, dkd_time], dkd_index) => (
                <View key={dkd_label} style={[styles.timelineRow, dkd_index > 0 && styles.timelineBorder]}>
                  <View style={[styles.timelineDot, dkd_time && styles.timelineDotActive]} />
                  <Text style={styles.timelineLabel}>{dkd_label}</Text>
                  <Text style={styles.timelineTime}>{dkd_time ? new Date(dkd_time).toLocaleString('tr-TR') : '—'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OrdersScreen({ refreshSignal = 0 }) {
  const [dkd_orders, dkd_set_orders] = useState([]);
  const [dkd_filter, dkd_set_filter] = useState('active');
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_selected, dkd_set_selected] = useState(null);
  const [dkd_error, dkd_set_error] = useState('');

  const dkd_load = useCallback(async () => {
    dkd_set_refreshing(true); dkd_set_error('');
    try { dkd_set_orders(await dkd_panel_fetch_orders(200)); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); dkd_set_refreshing(false); }
  }, []);
  useEffect(() => { dkd_load(); }, [dkd_load, refreshSignal]);

  const dkd_filtered = useMemo(() => dkd_orders.filter((dkd_order) => {
    const dkd_status = String(dkd_order.dkd_status || '').toLowerCase();
    const dkd_done = ['completed', 'delivered'].includes(dkd_status);
    const dkd_cancelled = ['cancelled', 'canceled'].includes(dkd_status);
    if (dkd_filter === 'active') return !dkd_done && !dkd_cancelled;
    if (dkd_filter === 'completed') return dkd_done;
    if (dkd_filter === 'cancelled') return dkd_cancelled;
    return true;
  }), [dkd_filter, dkd_orders]);

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator color={dkd_theme.cyan} size="large" /></View>;

  return (
    <View style={styles.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={dkd_load} tintColor={dkd_theme.cyan} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}><View><Text style={styles.kicker}>OPERASYON MERKEZİ</Text><Text style={styles.title}>Gelen Siparişler</Text><Text style={styles.subtitle}>Kurye, adres ve canlı konum detayları</Text></View><View style={styles.countBubble}><Text style={styles.countValue}>{dkd_filtered.length}</Text><Text style={styles.countLabel}>KAYIT</Text></View></View>
        <View style={styles.filters}>
          {[['active', 'Aktif'], ['completed', 'Tamamlanan'], ['cancelled', 'İptal'], ['all', 'Tümü']].map(([dkd_key, dkd_label]) => <Pressable key={dkd_key} onPress={() => dkd_set_filter(dkd_key)} style={[styles.filter, dkd_filter === dkd_key && styles.filterActive]}><Text style={[styles.filterText, dkd_filter === dkd_key && styles.filterTextActive]}>{dkd_label}</Text></Pressable>)}
        </View>
        {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
        {dkd_filtered.length === 0 ? <DkdEmptyState icon="package-variant" title="Sipariş bulunamadı" text="Seçtiğin filtrede henüz sipariş yok. Yeni hareketler burada otomatik görünecek." /> : dkd_filtered.map((dkd_order) => (
          <Pressable key={String(dkd_order.dkd_job_id)} onPress={() => dkd_set_selected(dkd_order)} style={styles.orderCard}>
            <View style={styles.orderTop}><View style={styles.orderIcon}><MaterialCommunityIcons name="package-variant-closed" size={20} color={dkd_theme.yellow} /></View><View style={styles.orderCopy}><Text style={styles.orderTitle}>#{dkd_order.dkd_order_ref} • {dkd_order.dkd_title}</Text><Text style={styles.orderAddress} numberOfLines={2}>{dkd_order.dkd_dropoff || 'Teslimat adresi bekleniyor'}</Text></View><DkdStatusPill text={String(dkd_order.dkd_status || 'bekliyor').toUpperCase()} tone={dkd_status_tone(dkd_order.dkd_status)} /></View>
            <View style={styles.orderMeta}><View style={styles.metaItem}><MaterialCommunityIcons name="bike-fast" size={15} color={dkd_theme.cyan} /><Text style={styles.metaText}>{dkd_order.dkd_courier_name || 'Atanmadı'}</Text></View><View style={styles.metaItem}><MaterialCommunityIcons name="map-marker-distance" size={15} color={dkd_theme.violet} /><Text style={styles.metaText}>{Number(dkd_order.dkd_distance_km || 0).toFixed(1)} km</Text></View><View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={15} color={dkd_theme.green} /><Text style={styles.metaText}>{dkd_order.dkd_eta_min || 0} dk</Text></View></View>
            <View style={styles.orderBottom}><Text style={styles.orderTime}>{new Date(dkd_order.dkd_updated_at || dkd_order.dkd_created_at).toLocaleString('tr-TR')}</Text><View style={styles.detailButton}><Text style={styles.detailButtonText}>Detay</Text><MaterialCommunityIcons name="chevron-right" size={17} color="#BEEFFF" /></View></View>
          </Pressable>
        ))}
        <View style={{ height: 110 }} />
      </ScrollView>
      <DkdOrderDetail order={dkd_selected} onClose={() => dkd_set_selected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dkd_theme.background }, content: { padding: 14, paddingTop: 16, gap: 10 }, loader: { flex: 1, backgroundColor: dkd_theme.background, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }, kicker: { color: dkd_theme.cyan, fontSize: 13, fontWeight: '900', letterSpacing: 1.4 }, title: { color: dkd_theme.text, fontSize: 27, fontWeight: '900', marginTop: 3 }, subtitle: { color: dkd_theme.textSoft, fontSize: 14, fontWeight: '700', marginTop: 3 }, countBubble: { width: 59, height: 59, borderRadius: 20, backgroundColor: '#11203A', borderWidth: 1, borderColor: dkd_theme.border, alignItems: 'center', justifyContent: 'center' }, countValue: { color: dkd_theme.text, fontSize: 20, fontWeight: '900' }, countLabel: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: .8 },
  filters: { flexDirection: 'row', gap: 6, marginBottom: 5 }, filter: { flex: 1, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, filterActive: { backgroundColor: '#173250', borderColor: 'rgba(102,232,255,.22)' }, filterText: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900' }, filterTextActive: { color: '#C5F7FF' }, errorText: { color: '#FFB0BA', fontSize: 14, fontWeight: '800', padding: 10 },
  orderCard: { borderRadius: 22, padding: 13, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, orderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, orderIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: 'rgba(255,214,107,.08)', alignItems: 'center', justifyContent: 'center' }, orderCopy: { flex: 1, minWidth: 0 }, orderTitle: { color: dkd_theme.text, fontSize: 14, fontWeight: '900' }, orderAddress: { color: dkd_theme.textSoft, fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 3 }, orderMeta: { flexDirection: 'row', gap: 7, marginTop: 12 }, metaItem: { flex: 1, minHeight: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.025)', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 }, metaText: { color: '#B6C4D8', fontSize: 13, fontWeight: '800', flexShrink: 1 }, orderBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.07)' }, orderTime: { flex: 1, color: '#687A93', fontSize: 13, fontWeight: '700' }, detailButton: { flexDirection: 'row', alignItems: 'center', gap: 2 }, detailButtonText: { color: '#BEEFFF', fontSize: 13, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.62)', justifyContent: 'flex-end' }, modalSheet: { maxHeight: '90%', backgroundColor: '#08111E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 14, borderWidth: 1, borderColor: dkd_theme.border }, modalHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 9, backgroundColor: '#344258', marginBottom: 12 }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }, detailIcon: { width: 45, height: 45, borderRadius: 16, backgroundColor: 'rgba(255,214,107,.08)', alignItems: 'center', justifyContent: 'center' }, detailKicker: { color: dkd_theme.yellow, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, detailTitle: { color: dkd_theme.text, fontSize: 20, fontWeight: '900', marginTop: 2 }, closeButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' },
  mapWrap: { height: 225, borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: dkd_theme.border }, map: { flex: 1 }, mapBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5,12,22,.88)', borderRadius: 11, paddingHorizontal: 9, paddingVertical: 7 }, liveDot: { width: 7, height: 7, borderRadius: 8, backgroundColor: dkd_theme.green }, mapBadgeText: { color: dkd_theme.text, fontSize: 13, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, detailTile: { width: '48.5%', minHeight: 83, borderRadius: 18, padding: 11, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, detailLabel: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: .7, marginBottom: 9 }, detailValue: { color: dkd_theme.text, fontSize: 14, fontWeight: '900' }, infoCard: { borderRadius: 19, padding: 12, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, infoTitle: { color: dkd_theme.text, fontSize: 15, fontWeight: '900' }, infoText: { color: dkd_theme.textSoft, fontSize: 13.5, fontWeight: '700', marginTop: 4 }, infoTiny: { color: dkd_theme.muted, fontSize: 13, fontWeight: '700', marginTop: 7 },
  timelineRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 }, timelineBorder: { borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.07)' }, timelineDot: { width: 9, height: 9, borderRadius: 9, backgroundColor: '#37455A' }, timelineDotActive: { backgroundColor: dkd_theme.green }, timelineLabel: { color: dkd_theme.text, fontSize: 13.5, fontWeight: '800', flex: 1 }, timelineTime: { color: dkd_theme.textSoft, fontSize: 13, fontWeight: '700' },
});
