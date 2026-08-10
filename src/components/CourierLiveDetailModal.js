import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DkdStatusPill, dkd_money } from './PanelComponents';
import { RacingMotorcycle } from './RacingMotorcycle';
import { dkd_theme } from '../lib/theme';

function dkd_number_or_null(dkd_value) {
  if (dkd_value == null || dkd_value === '') return null;
  const dkd_number_value = Number(dkd_value);
  return Number.isFinite(dkd_number_value) ? dkd_number_value : null;
}

function dkd_status_tone(dkd_status) {
  const dkd_value = String(dkd_status || '').toLowerCase();
  if (['completed', 'delivered'].includes(dkd_value)) return 'green';
  if (['cancelled', 'canceled'].includes(dkd_value)) return 'red';
  if (['accepted', 'picked_up', 'to_customer', 'delivering'].includes(dkd_value)) return 'blue';
  return 'yellow';
}

function dkd_read_courier_coordinate(dkd_order, dkd_courier, dkd_axis) {
  const dkd_candidates_value = dkd_axis === 'lat'
    ? [dkd_order?.dkd_courier_lat, dkd_courier?.dkd_live_lat, dkd_courier?.dkd_courier_lat, dkd_courier?.lat]
    : [dkd_order?.dkd_courier_lng, dkd_courier?.dkd_live_lng, dkd_courier?.dkd_courier_lng, dkd_courier?.lng];
  for (const dkd_candidate_value of dkd_candidates_value) {
    const dkd_number_value = dkd_number_or_null(dkd_candidate_value);
    if (dkd_number_value != null) return dkd_number_value;
  }
  return null;
}

export default function CourierLiveDetailModal({ visible, courier, order, onClose }) {
  const dkd_courier_lat = dkd_read_courier_coordinate(order, courier, 'lat');
  const dkd_courier_lng = dkd_read_courier_coordinate(order, courier, 'lng');
  const dkd_drop_lat = dkd_number_or_null(order?.dkd_dropoff_lat);
  const dkd_drop_lng = dkd_number_or_null(order?.dkd_dropoff_lng);
  const dkd_has_courier = dkd_courier_lat != null && dkd_courier_lng != null;
  const dkd_has_drop = dkd_drop_lat != null && dkd_drop_lng != null;
  const dkd_location_updated_at = order?.dkd_location_updated_at || courier?.dkd_location_updated_at || courier?.dkd_updated_at || null;
  const dkd_region = useMemo(() => {
    if (dkd_has_courier && dkd_has_drop) {
      const dkd_lat_delta = Math.max(Math.abs(dkd_courier_lat - dkd_drop_lat) * 2.8, 0.025);
      const dkd_lng_delta = Math.max(Math.abs(dkd_courier_lng - dkd_drop_lng) * 2.8, 0.025);
      return { latitude: (dkd_courier_lat + dkd_drop_lat) / 2, longitude: (dkd_courier_lng + dkd_drop_lng) / 2, latitudeDelta: dkd_lat_delta, longitudeDelta: dkd_lng_delta };
    }
    if (dkd_has_courier) return { latitude: dkd_courier_lat, longitude: dkd_courier_lng, latitudeDelta: 0.035, longitudeDelta: 0.035 };
    if (dkd_has_drop) return { latitude: dkd_drop_lat, longitude: dkd_drop_lng, latitudeDelta: 0.035, longitudeDelta: 0.035 };
    return { latitude: 39.9334, longitude: 32.8597, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  }, [dkd_courier_lat, dkd_courier_lng, dkd_drop_lat, dkd_drop_lng, dkd_has_courier, dkd_has_drop]);

  if (!courier) return null;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <LinearGradient colors={['#071321', '#0B1930', '#171637']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <LinearGradient colors={['#08263B', '#113754']} style={styles.motorShell}><RacingMotorcycle color="#67ECFF" accentColor="#F5FAFF" size={58} /></LinearGradient>
          <View style={styles.headerCopy}><Text style={styles.kicker}>CANLI KURYE TAKİBİ</Text><Text style={styles.title}>{courier.dkd_display_name || 'Kurye'}</Text><Text style={styles.subtitle}>{courier.dkd_plate_no || 'Plaka yok'} • {courier.dkd_city || 'Bölge yok'}</Text></View>
          <View style={styles.onlineBadge}><View style={styles.liveDot} /><Text style={styles.onlineText}>CANLI</Text></View>
          <Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={20} color="#EAF7FF" /></Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.mapWrap}>
            {(dkd_has_courier || dkd_has_drop) ? <MapView style={styles.map} region={dkd_region}>
              {dkd_has_courier && <Marker coordinate={{ latitude: dkd_courier_lat, longitude: dkd_courier_lng }} title={courier.dkd_display_name || 'Kurye'} description="Canlı kurye konumu" pinColor="#4F91FF" />}
              {dkd_has_drop && <Marker coordinate={{ latitude: dkd_drop_lat, longitude: dkd_drop_lng }} title="Teslimat Noktası" description={order?.dkd_dropoff || ''} pinColor="#FF627D" />}
            </MapView> : <View style={styles.noLocation}><MaterialCommunityIcons name="map-marker-off-outline" size={34} color="#6D819D" /><Text style={styles.noLocationTitle}>Konum henüz alınmadı</Text><Text style={styles.noLocationText}>Kurye yeni konum gönderdiğinde harita Realtime üzerinden otomatik güncellenir.</Text></View>}
            <View style={styles.mapLiveBadge}><View style={styles.liveDot} /><Text style={styles.mapLiveText}>CANLI TAKİP</Text></View>
          </View>

          <View style={styles.metricRow}>
            <LinearGradient colors={['rgba(89,232,255,.17)', 'rgba(75,119,255,.08)']} style={styles.metric}><MaterialCommunityIcons name="map-marker-radius-outline" size={21} color="#72E9FF" /><Text style={styles.metricLabel}>KONUM</Text><Text style={styles.metricValue}>{dkd_has_courier ? 'AKTİF' : 'BEKLENİYOR'}</Text></LinearGradient>
            <LinearGradient colors={['rgba(100,240,181,.16)', 'rgba(61,178,139,.07)']} style={styles.metric}><MaterialCommunityIcons name="clock-fast" size={21} color="#70F0B7" /><Text style={styles.metricLabel}>VARIŞ</Text><Text style={styles.metricValue}>{order?.dkd_eta_min || 0} dk</Text></LinearGradient>
            <LinearGradient colors={['rgba(255,201,98,.16)', 'rgba(255,137,74,.07)']} style={styles.metric}><MaterialCommunityIcons name="map-marker-distance" size={21} color="#FFD16E" /><Text style={styles.metricLabel}>MESAFE</Text><Text style={styles.metricValue}>{Number(order?.dkd_distance_km || 0).toFixed(1)} km</Text></LinearGradient>
          </View>

          {!!dkd_location_updated_at && <View style={styles.updatedCard}><MaterialCommunityIcons name="update" size={19} color="#81E9FF" /><View style={styles.flexOne}><Text style={styles.updatedLabel}>SON KONUM GÜNCELLEMESİ</Text><Text style={styles.updatedValue}>{new Date(dkd_location_updated_at).toLocaleString('tr-TR')}</Text></View></View>}

          <View style={styles.sectionHead}><View style={styles.sectionIcon}><MaterialCommunityIcons name="package-variant-closed" size={22} color="#FFD170" /></View><View style={styles.flexOne}><Text style={styles.sectionTitle}>Üzerindeki Sipariş</Text><Text style={styles.sectionSub}>Kurye ataması ve teslimat ayrıntıları</Text></View></View>
          {order ? <LinearGradient colors={['rgba(80,111,255,.14)', 'rgba(162,82,255,.10)']} style={styles.orderCard}>
            <View style={styles.orderTop}><View style={styles.flexOne}><Text style={styles.orderRef}>#{order.dkd_order_ref || order.dkd_job_id}</Text><Text style={styles.orderTitle}>{order.dkd_title || 'Teslimat siparişi'}</Text></View><DkdStatusPill text={String(order.dkd_status || 'bekliyor').toUpperCase()} tone={dkd_status_tone(order.dkd_status)} /></View>
            <View style={styles.infoBlock}><Text style={styles.infoLabel}>TESLİMAT ADRESİ</Text><Text style={styles.infoValue}>{order.dkd_dropoff || 'Adres bilgisi bekleniyor'}</Text></View>
            <View style={styles.infoBlock}><Text style={styles.infoLabel}>ALIŞ NOKTASI</Text><Text style={styles.infoValue}>{order.dkd_pickup || 'Alış noktası belirtilmedi'}</Text></View>
            <View style={styles.orderMetaRow}><View style={styles.orderMeta}><Text style={styles.infoLabel}>TESLİMAT TUTARI</Text><Text style={styles.orderMetaValue}>{dkd_money(order.dkd_customer_charge_tl)}</Text></View><View style={styles.orderMeta}><Text style={styles.infoLabel}>KABUL</Text><Text style={styles.orderMetaValueSmall}>{order.dkd_accepted_at ? new Date(order.dkd_accepted_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</Text></View></View>
          </LinearGradient> : <View style={styles.emptyOrder}><MaterialCommunityIcons name="package-variant-remove" size={30} color="#7186A4" /><Text style={styles.emptyOrderTitle}>Aktif sipariş yok</Text><Text style={styles.emptyOrderText}>Kurye çevrimiçi ancak şu anda üzerine atanmış aktif bir sipariş bulunmuyor.</Text></View>}
          <Text style={styles.liveNote}>Bu ekran `dkd_courier_live_locations` ve `dkd_courier_jobs` Realtime değişiklikleri geldikçe açıkken otomatik yenilenir.</Text>
        </ScrollView>
      </LinearGradient>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.72)' }, sheet: { maxHeight: '92%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 14, borderWidth: 1, borderColor: 'rgba(154,214,255,.18)' }, handle: { width: 46, height: 5, borderRadius: 8, backgroundColor: '#3B4B63', alignSelf: 'center', marginBottom: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }, motorShell: { width: 66, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, headerCopy: { flex: 1, minWidth: 0 }, kicker: { color: '#89F0FF', fontSize: 12.5, fontWeight: '900', letterSpacing: 1 }, title: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 1 }, subtitle: { color: '#A9BDD5', fontSize: 13.5, fontWeight: '700', marginTop: 2 }, onlineBadge: { minHeight: 31, paddingHorizontal: 9, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(83,237,176,.11)', borderWidth: 1, borderColor: 'rgba(83,237,176,.18)' }, liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#60F0B6' }, onlineText: { color: '#8BF4CA', fontSize: 11.5, fontWeight: '900' }, closeButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.06)', alignItems: 'center', justifyContent: 'center' }, scrollContent: { paddingBottom: 28 }, mapWrap: { height: 280, borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(129,224,255,.18)', backgroundColor: '#0A1525' }, map: { flex: 1 }, mapLiveBadge: { position: 'absolute', top: 12, left: 12, minHeight: 31, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(5,18,31,.88)', flexDirection: 'row', alignItems: 'center', gap: 6 }, mapLiveText: { color: '#DDFBFF', fontSize: 11.5, fontWeight: '900' }, noLocation: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, noLocationTitle: { color: '#E4EFFB', fontSize: 16, fontWeight: '900', marginTop: 8 }, noLocationText: { color: '#8296B1', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', marginTop: 5 }, metricRow: { flexDirection: 'row', gap: 8, marginTop: 11 }, metric: { flex: 1, minHeight: 92, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.07)' }, metricLabel: { color: '#9BAEC5', fontSize: 10.5, fontWeight: '900', letterSpacing: .45, marginTop: 7 }, metricValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 4 }, updatedCard: { minHeight: 60, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, backgroundColor: 'rgba(93,220,255,.07)', borderWidth: 1, borderColor: 'rgba(93,220,255,.11)' }, updatedLabel: { color: '#7F9AB7', fontSize: 10.5, fontWeight: '900', letterSpacing: .5 }, updatedValue: { color: '#D7E7F7', fontSize: 13.5, fontWeight: '800', marginTop: 2 }, sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 9 }, sectionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,205,104,.09)' }, sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' }, sectionSub: { color: '#899EB8', fontSize: 12.5, fontWeight: '700', marginTop: 2 }, orderCard: { borderRadius: 22, padding: 13, borderWidth: 1, borderColor: 'rgba(151,175,255,.13)' }, orderTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, orderRef: { color: '#88EFFF', fontSize: 12.5, fontWeight: '900' }, orderTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 2 }, infoBlock: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.08)' }, infoLabel: { color: '#8398B4', fontSize: 10.5, fontWeight: '900', letterSpacing: .55 }, infoValue: { color: '#DDE9F6', fontSize: 14, lineHeight: 19, fontWeight: '700', marginTop: 4 }, orderMetaRow: { flexDirection: 'row', gap: 9, marginTop: 12 }, orderMeta: { flex: 1, minHeight: 61, borderRadius: 15, padding: 10, backgroundColor: 'rgba(255,255,255,.04)' }, orderMetaValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 5 }, orderMetaValueSmall: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 5 }, emptyOrder: { minHeight: 150, borderRadius: 22, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(110,135,170,.05)', borderWidth: 1, borderColor: 'rgba(130,160,200,.09)' }, emptyOrderTitle: { color: '#DCE7F4', fontSize: 16, fontWeight: '900', marginTop: 7 }, emptyOrderText: { color: '#8194AD', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 }, liveNote: { color: '#6F839D', fontSize: 12.5, lineHeight: 18, fontWeight: '700', marginTop: 13, textAlign: 'center' },
});
