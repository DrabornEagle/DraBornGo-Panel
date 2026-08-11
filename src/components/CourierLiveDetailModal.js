import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DkdStatusPill, dkd_money } from './PanelComponents';
import { RacingMotorcycle } from './RacingMotorcycle';
import { supabase } from '../lib/supabase';
import { dkd_generated_public_env_value } from '../lib/dkd_public_env.generated';
import {
  dkd_panel_coordinate_value,
  dkd_panel_fetch_live_route_value,
  dkd_panel_geocode_delivery_address_value,
  dkd_panel_live_route_progress_value,
  dkd_panel_route_geojson_value,
} from '../services/mapboxTrackingService';
import { dkd_panel_set_order_dropoff_coordinates } from '../services/panelService';

const dkd_mapbox_token_value = String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || dkd_generated_public_env_value?.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();
if (dkd_mapbox_token_value.startsWith('pk.')) { try { MapboxGL.setAccessToken(dkd_mapbox_token_value); } catch {} }

function dkd_number_or_null_value(dkd_value) { const dkd_number_value = Number(dkd_value); return Number.isFinite(dkd_number_value) ? dkd_number_value : null; }
function dkd_status_tone_value(dkd_status_value) { const dkd_value = String(dkd_status_value || '').toLowerCase(); if (['completed','delivered'].includes(dkd_value)) return 'green'; if (['cancelled','canceled'].includes(dkd_value)) return 'red'; if (['accepted','assigned','to_pickup','picked_up','to_customer','delivering'].includes(dkd_value)) return 'blue'; return 'yellow'; }
function dkd_status_label_value(dkd_status_value) { const dkd_value = String(dkd_status_value || '').toLowerCase(); if (['accepted','assigned'].includes(dkd_value)) return 'KABUL EDİLDİ'; if (dkd_value === 'to_pickup') return 'ALIM NOKTASINA GİDİYOR'; if (['completed','delivered'].includes(dkd_value)) return 'TESLİM EDİLDİ'; if (['picked_up','to_customer','delivering'].includes(dkd_value)) return 'TESLİMATTA'; if (['cancelled','canceled'].includes(dkd_value)) return 'İPTAL'; return String(dkd_status_value || 'BEKLİYOR').toUpperCase(); }
function dkd_prop_coordinate_value(dkd_order_value, dkd_courier_value, dkd_axis_value) { const dkd_candidate_values = dkd_axis_value === 'lat' ? [dkd_order_value?.dkd_courier_lat, dkd_courier_value?.dkd_live_lat, dkd_courier_value?.dkd_courier_lat, dkd_courier_value?.dkd_lat, dkd_courier_value?.lat] : [dkd_order_value?.dkd_courier_lng, dkd_courier_value?.dkd_live_lng, dkd_courier_value?.dkd_courier_lng, dkd_courier_value?.dkd_lng, dkd_courier_value?.lng]; for (const dkd_candidate_value of dkd_candidate_values) { const dkd_number_value = dkd_number_or_null_value(dkd_candidate_value); if (dkd_number_value != null) return dkd_number_value; } return null; }
function dkd_overview_camera_value(dkd_courier_point_value, dkd_drop_point_value) {
  if (dkd_courier_point_value && dkd_drop_point_value) {
    const dkd_delta_value = Math.max(Math.abs(dkd_courier_point_value.dkd_lat_value - dkd_drop_point_value.dkd_lat_value), Math.abs(dkd_courier_point_value.dkd_lng_value - dkd_drop_point_value.dkd_lng_value));
    let dkd_zoom_value = 14.4;
    if (dkd_delta_value > 0.14) dkd_zoom_value = 9.7; else if (dkd_delta_value > 0.08) dkd_zoom_value = 10.5; else if (dkd_delta_value > 0.045) dkd_zoom_value = 11.2; else if (dkd_delta_value > 0.025) dkd_zoom_value = 12; else if (dkd_delta_value > 0.012) dkd_zoom_value = 12.8; else if (dkd_delta_value > 0.006) dkd_zoom_value = 13.6;
    return { dkd_center_value: [(dkd_courier_point_value.dkd_lng_value + dkd_drop_point_value.dkd_lng_value) / 2, (dkd_courier_point_value.dkd_lat_value + dkd_drop_point_value.dkd_lat_value) / 2], dkd_zoom_value };
  }
  const dkd_single_point_value = dkd_courier_point_value || dkd_drop_point_value;
  return { dkd_center_value: dkd_single_point_value?.dkd_coordinate_value || [32.8597,39.9334], dkd_zoom_value: dkd_single_point_value ? 14.5 : 11.3 };
}
function DkdMarker({ icon, tone = 'cyan' }) { return <View style={[styles.marker, tone === 'green' && styles.markerGreen]}><MaterialCommunityIcons name={icon} size={21} color="#06131D" /></View>; }

function DkdMapSurface({ dkd_courier_point_value, dkd_drop_point_value, dkd_route_value, dkd_courier_user_id_value, dkd_order_id_value, dkd_follow_value, dkd_on_follow_press_value, dkd_fullscreen_value = false }) {
  const dkd_overview_value = dkd_overview_camera_value(dkd_courier_point_value, dkd_drop_point_value);
  const dkd_center_value = dkd_follow_value && dkd_courier_point_value ? dkd_courier_point_value.dkd_coordinate_value : dkd_overview_value.dkd_center_value;
  const dkd_zoom_value = dkd_follow_value && dkd_courier_point_value ? 16.8 : dkd_overview_value.dkd_zoom_value;
  const dkd_route_coordinate_values = Array.isArray(dkd_route_value?.dkd_route_coordinate_values) ? dkd_route_value.dkd_route_coordinate_values : [];
  return <View style={dkd_fullscreen_value ? styles.fullscreenMapWrap : styles.mapFill}>
    <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Street} logoEnabled attributionEnabled compassEnabled rotateEnabled pitchEnabled>
      <MapboxGL.Camera centerCoordinate={dkd_center_value} zoomLevel={dkd_zoom_value} animationDuration={dkd_follow_value ? 250 : 500} animationMode="flyTo" />
      {dkd_route_coordinate_values.length >= 2 ? <MapboxGL.ShapeSource id={`dkd-live-route-source-${dkd_order_id_value}-${dkd_fullscreen_value ? 'full' : 'card'}`} shape={dkd_panel_route_geojson_value(dkd_route_coordinate_values)}><MapboxGL.LineLayer id={`dkd-live-route-line-${dkd_order_id_value}-${dkd_fullscreen_value ? 'full' : 'card'}`} style={{ lineColor: '#66E8FF', lineWidth: 5.5, lineOpacity: 0.92, lineCap: 'round', lineJoin: 'round' }} /></MapboxGL.ShapeSource> : null}
      {dkd_courier_point_value ? <MapboxGL.PointAnnotation id={`dkd-panel-courier-${dkd_courier_user_id_value}-${dkd_fullscreen_value ? 'full' : 'card'}`} coordinate={dkd_courier_point_value.dkd_coordinate_value}><DkdMarker icon="motorbike" /></MapboxGL.PointAnnotation> : null}
      {dkd_drop_point_value ? <MapboxGL.PointAnnotation id={`dkd-panel-drop-${dkd_order_id_value}-${dkd_fullscreen_value ? 'full' : 'card'}`} coordinate={dkd_drop_point_value.dkd_coordinate_value}><DkdMarker icon="map-marker-check" tone="green" /></MapboxGL.PointAnnotation> : null}
    </MapboxGL.MapView>
    <Pressable onPress={dkd_on_follow_press_value} style={[styles.followButton, dkd_follow_value && styles.followButtonActive]}><MaterialCommunityIcons name={dkd_follow_value ? 'crosshairs-gps' : 'target'} size={24} color={dkd_follow_value ? '#07131D' : '#FFF'} /></Pressable>
  </View>;
}

export default function CourierLiveDetailModal({ visible, courier, order, onClose }) {
  const [dkd_live_value, dkd_set_live_value] = useState(null);
  const [dkd_loading_value, dkd_set_loading_value] = useState(false);
  const [dkd_error_value, dkd_set_error_value] = useState('');
  const [dkd_resolved_drop_point_value, dkd_set_resolved_drop_point_value] = useState(null);
  const [dkd_route_value, dkd_set_route_value] = useState(null);
  const [dkd_route_loading_value, dkd_set_route_loading_value] = useState(false);
  const [dkd_fullscreen_value, dkd_set_fullscreen_value] = useState(false);
  const [dkd_follow_value, dkd_set_follow_value] = useState(true);
  const dkd_route_request_ref_value = useRef(0);
  const dkd_last_route_started_at_ref_value = useRef(0);
  const dkd_last_route_position_ref_value = useRef('');
  const dkd_resolve_fingerprint_ref_value = useRef('');
  const dkd_courier_user_id_value = String(courier?.dkd_courier_user_id || order?.dkd_courier_user_id || '').trim();
  const dkd_order_id_value = String(order?.dkd_job_id || order?.id || 'active');

  const dkd_fetch_live_value = useCallback(async () => {
    if (!visible || !dkd_courier_user_id_value) return;
    try {
      const { data: dkd_data_value, error: dkd_fetch_error_value } = await supabase.from('dkd_courier_live_locations').select('courier_user_id,lat,lng,eta_min,heading_deg,updated_at').eq('courier_user_id', dkd_courier_user_id_value).maybeSingle();
      if (dkd_fetch_error_value) { dkd_set_error_value(String(dkd_fetch_error_value.message || dkd_fetch_error_value)); return; }
      dkd_set_error_value(''); if (dkd_data_value) dkd_set_live_value(dkd_data_value);
    } catch (dkd_fetch_error_value) { dkd_set_error_value(String(dkd_fetch_error_value?.message || dkd_fetch_error_value)); }
  }, [visible, dkd_courier_user_id_value]);

  useEffect(() => { if (visible) { dkd_set_loading_value(true); dkd_fetch_live_value().finally(() => dkd_set_loading_value(false)); } else { dkd_set_live_value(null); dkd_set_error_value(''); dkd_set_resolved_drop_point_value(null); dkd_set_route_value(null); dkd_set_fullscreen_value(false); dkd_set_follow_value(true); dkd_last_route_position_ref_value.current = ''; dkd_resolve_fingerprint_ref_value.current = ''; } }, [visible, dkd_fetch_live_value]);
  useEffect(() => {
    if (!visible || !dkd_courier_user_id_value) return undefined;
    let dkd_channel_value = null;
    try { dkd_channel_value = supabase.channel(`dkd-panel-courier-live-${dkd_courier_user_id_value}-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_courier_live_locations', filter: `courier_user_id=eq.${dkd_courier_user_id_value}` }, (dkd_payload_value) => { if (dkd_payload_value?.new) dkd_set_live_value(dkd_payload_value.new); }).subscribe(); } catch (dkd_realtime_error_value) { dkd_set_error_value(String(dkd_realtime_error_value?.message || dkd_realtime_error_value)); }
    return () => { if (dkd_channel_value) { try { supabase.removeChannel(dkd_channel_value); } catch {} } };
  }, [visible, dkd_courier_user_id_value]);
  useEffect(() => { if (!visible) return undefined; const dkd_timer_value = setInterval(dkd_fetch_live_value, 1000); return () => clearInterval(dkd_timer_value); }, [visible, dkd_fetch_live_value]);

  const dkd_courier_point_value = useMemo(() => dkd_panel_coordinate_value(dkd_live_value?.lat ?? dkd_prop_coordinate_value(order,courier,'lat'), dkd_live_value?.lng ?? dkd_prop_coordinate_value(order,courier,'lng')), [dkd_live_value,order,courier]);
  const dkd_stored_drop_point_value = useMemo(() => dkd_panel_coordinate_value(order?.dkd_dropoff_lat,order?.dkd_dropoff_lng), [order?.dkd_dropoff_lat,order?.dkd_dropoff_lng]);
  const dkd_drop_point_value = dkd_resolved_drop_point_value || dkd_stored_drop_point_value;
  const dkd_delivery_address_value = String(order?.dkd_dropoff || order?.delivery_address_text || '').trim();

  useEffect(() => {
    if (!visible || !order || !dkd_delivery_address_value) return;
    const dkd_resolve_key_value = `${dkd_order_id_value}:${dkd_delivery_address_value}`;
    if (dkd_resolve_fingerprint_ref_value.current === dkd_resolve_key_value) return;
    dkd_resolve_fingerprint_ref_value.current = dkd_resolve_key_value;
    let dkd_cancelled_value = false;
    (async () => {
      try {
        const dkd_geocode_value = await dkd_panel_geocode_delivery_address_value(dkd_delivery_address_value,{ dkd_city_value: courier?.dkd_city || 'Ankara', dkd_proximity_value: dkd_courier_point_value });
        if (dkd_cancelled_value || !dkd_geocode_value) return;
        dkd_set_resolved_drop_point_value(dkd_geocode_value);
        const dkd_job_number_value = Number(order?.dkd_job_id || order?.id);
        if (Number.isFinite(dkd_job_number_value) && dkd_job_number_value > 0) await dkd_panel_set_order_dropoff_coordinates(dkd_job_number_value,dkd_geocode_value.dkd_lat_value,dkd_geocode_value.dkd_lng_value).catch(() => null);
      } catch (dkd_geocode_error_value) { if (!dkd_cancelled_value) dkd_set_error_value(String(dkd_geocode_error_value?.message || dkd_geocode_error_value)); }
    })();
    return () => { dkd_cancelled_value = true; };
  }, [visible,order,dkd_delivery_address_value,dkd_order_id_value,courier?.dkd_city,dkd_courier_point_value]);

  const dkd_refresh_route_value = useCallback(async (dkd_force_value = false) => {
    if (!visible || !dkd_courier_point_value || !dkd_drop_point_value) return;
    const dkd_position_value = `${dkd_courier_point_value.dkd_lat_value.toFixed(3)}|${dkd_courier_point_value.dkd_lng_value.toFixed(3)}|${dkd_drop_point_value.dkd_lat_value.toFixed(5)}|${dkd_drop_point_value.dkd_lng_value.toFixed(5)}`;
    const dkd_now_value = Date.now();
    if (!dkd_force_value && dkd_last_route_position_ref_value.current === dkd_position_value && dkd_now_value - dkd_last_route_started_at_ref_value.current < 8000) return;
    dkd_last_route_position_ref_value.current = dkd_position_value; dkd_last_route_started_at_ref_value.current = dkd_now_value;
    const dkd_request_id_value = ++dkd_route_request_ref_value.current;
    dkd_set_route_loading_value(true);
    try { const dkd_next_route_value = await dkd_panel_fetch_live_route_value(dkd_courier_point_value,dkd_drop_point_value); if (dkd_route_request_ref_value.current === dkd_request_id_value && dkd_next_route_value) dkd_set_route_value(dkd_next_route_value); }
    finally { if (dkd_route_request_ref_value.current === dkd_request_id_value) dkd_set_route_loading_value(false); }
  }, [visible,dkd_courier_point_value,dkd_drop_point_value]);
  useEffect(() => { dkd_refresh_route_value(false); }, [dkd_refresh_route_value]);
  useEffect(() => { if (!visible || !dkd_courier_point_value || !dkd_drop_point_value) return undefined; const dkd_timer_value = setInterval(() => dkd_refresh_route_value(true),8000); return () => clearInterval(dkd_timer_value); }, [visible,dkd_courier_point_value,dkd_drop_point_value,dkd_refresh_route_value]);

  const dkd_progress_value = useMemo(() => dkd_panel_live_route_progress_value(dkd_route_value,dkd_courier_point_value),[dkd_route_value,dkd_courier_point_value]);
  const dkd_live_distance_value = dkd_number_or_null_value(dkd_progress_value?.dkd_distance_km_value ?? dkd_route_value?.dkd_distance_km_value);
  const dkd_live_eta_value = dkd_number_or_null_value(dkd_progress_value?.dkd_duration_min_value ?? dkd_route_value?.dkd_duration_min_value);
  const dkd_live_row_eta_value = dkd_number_or_null_value(dkd_live_value?.eta_min);
  const dkd_distance_text_value = dkd_drop_point_value && dkd_courier_point_value ? (dkd_live_distance_value == null ? (dkd_route_loading_value ? '...' : '—') : `${dkd_live_distance_value.toFixed(1)} km`) : '—';
  const dkd_eta_text_value = dkd_drop_point_value && dkd_courier_point_value ? (dkd_live_eta_value != null ? `${Math.max(1,Math.round(dkd_live_eta_value))} dk` : dkd_live_row_eta_value > 0 ? `${Math.round(dkd_live_row_eta_value)} dk` : dkd_route_loading_value ? '...' : '—') : '—';
  const dkd_location_updated_at = dkd_live_value?.updated_at || order?.dkd_location_updated_at || courier?.dkd_location_updated_at || courier?.dkd_updated_at || null;
  if (!courier) return null;

  return <>
    <Modal visible={Boolean(visible)} transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><LinearGradient colors={['#071321','#0B1930','#171637']} style={styles.sheet}><View style={styles.handle}/><View style={styles.header}><LinearGradient colors={['#08263B','#113754']} style={styles.motorShell}><RacingMotorcycle color="#67ECFF" accentColor="#F5FAFF" size={55}/></LinearGradient><View style={styles.headerCopy}><Text style={styles.kicker}>CANLI KURYE TAKİBİ</Text><Text style={styles.title}>{courier.dkd_display_name || 'Kurye'}</Text><Text style={styles.subtitle}>{courier.dkd_plate_no || 'Plaka yok'} • {courier.dkd_city || 'Bölge yok'}</Text></View><View style={styles.onlineBadge}><View style={styles.liveDot}/><Text style={styles.onlineText}>CANLI</Text></View><Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color="#FFF"/></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.mapWrap}>{dkd_courier_point_value || dkd_drop_point_value ? <DkdMapSurface dkd_courier_point_value={dkd_courier_point_value} dkd_drop_point_value={dkd_drop_point_value} dkd_route_value={dkd_route_value} dkd_courier_user_id_value={dkd_courier_user_id_value} dkd_order_id_value={dkd_order_id_value} dkd_follow_value={dkd_follow_value} dkd_on_follow_press_value={() => dkd_set_follow_value((dkd_value) => !dkd_value)} /> : <View style={styles.noLocation}>{dkd_loading_value ? <ActivityIndicator color="#6DEBFF"/> : <MaterialCommunityIcons name="map-marker-off-outline" size={35} color="#6D819D"/>}<Text style={styles.noLocationTitle}>Konum henüz alınmadı</Text><Text style={styles.noLocationText}>{dkd_error_value || 'Kurye konum göndermeye başladığında burada görünür.'}</Text></View>}<View style={styles.mapLiveBadge}><View style={styles.liveDot}/><Text style={styles.mapLiveText}>CANLI TAKİP • 1 sn</Text></View><Pressable onPress={() => dkd_set_fullscreen_value(true)} style={styles.expandButton}><MaterialCommunityIcons name="arrow-expand-all" size={22} color="#FFF"/></Pressable></View>
      <View style={styles.metricRow}><LinearGradient colors={['rgba(89,232,255,.17)','rgba(75,119,255,.08)']} style={styles.metric}><MaterialCommunityIcons name="map-marker-radius-outline" size={21} color="#72E9FF"/><Text style={styles.metricLabel}>KONUM</Text><Text style={styles.metricValue}>{dkd_courier_point_value ? 'AKTİF' : 'BEKLENİYOR'}</Text></LinearGradient><LinearGradient colors={['rgba(100,240,181,.16)','rgba(61,178,139,.07)']} style={styles.metric}><MaterialCommunityIcons name="clock-fast" size={21} color="#70F0B7"/><Text style={styles.metricLabel}>VARIŞ</Text><Text style={styles.metricValue}>{dkd_eta_text_value}</Text></LinearGradient><LinearGradient colors={['rgba(255,201,98,.16)','rgba(255,137,74,.07)']} style={styles.metric}><MaterialCommunityIcons name="map-marker-distance" size={21} color="#FFD16E"/><Text style={styles.metricLabel}>MESAFE</Text><Text style={styles.metricValue}>{dkd_distance_text_value}</Text></LinearGradient></View>
      {!!dkd_location_updated_at && <View style={styles.updatedCard}><MaterialCommunityIcons name="update" size={19} color="#81E9FF"/><View style={{flex:1}}><Text style={styles.updatedLabel}>SON KONUM GÜNCELLEMESİ</Text><Text style={styles.updatedValue}>{new Date(dkd_location_updated_at).toLocaleString('tr-TR')}</Text></View><View style={styles.secondBadge}><Text style={styles.secondBadgeText}>1 sn</Text></View></View>}
      <View style={styles.sectionHead}><View style={styles.sectionIcon}><MaterialCommunityIcons name="package-variant-closed" size={22} color="#FFD170"/></View><View style={{flex:1}}><Text style={styles.sectionTitle}>Üzerindeki Sipariş</Text><Text style={styles.sectionSub}>Kurye ataması ve teslimat ayrıntıları</Text></View></View>
      {order ? <LinearGradient colors={['rgba(80,111,255,.14)','rgba(162,82,255,.10)']} style={styles.orderCard}><View style={styles.orderTop}><View style={{flex:1}}><Text style={styles.orderRef}>#{order.dkd_order_ref || order.dkd_job_id}</Text><Text style={styles.orderTitle}>{order.dkd_title || 'Teslimat siparişi'}</Text></View><DkdStatusPill text={dkd_status_label_value(order.dkd_status)} tone={dkd_status_tone_value(order.dkd_status)}/></View><View style={styles.infoBlock}><Text style={styles.infoLabel}>TESLİMAT ADRESİ</Text><Text style={styles.infoValue}>{order.dkd_dropoff || 'Adres bilgisi bekleniyor'}</Text></View><View style={styles.infoBlock}><Text style={styles.infoLabel}>ALIŞ NOKTASI</Text><Text style={styles.infoValue}>{order.dkd_pickup || 'Alış noktası belirtilmedi'}</Text></View><View style={styles.orderMetaRow}><View style={styles.orderMeta}><Text style={styles.infoLabel}>TESLİMAT TUTARI</Text><Text style={styles.orderMetaValue}>{dkd_money(order.dkd_customer_charge_tl)}</Text></View><View style={styles.orderMeta}><Text style={styles.infoLabel}>KABUL</Text><Text style={styles.orderMetaValueSmall}>{order.dkd_accepted_at ? new Date(order.dkd_accepted_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) : '—'}</Text></View></View></LinearGradient> : <View style={styles.emptyOrder}><MaterialCommunityIcons name="package-variant-remove" size={30} color="#7186A4"/><Text style={styles.emptyOrderTitle}>Aktif sipariş yok</Text><Text style={styles.emptyOrderText}>Kurye çevrimiçi ancak şu anda üzerine atanmış aktif bir sipariş bulunmuyor.</Text></View>}
    </ScrollView></LinearGradient></View></Modal>

    <Modal visible={dkd_fullscreen_value} animationType="fade" onRequestClose={() => dkd_set_fullscreen_value(false)}><View style={styles.fullscreenRoot}><View style={styles.fullscreenHeader}><View style={{flex:1}}><Text style={styles.fullscreenKicker}>CANLI TAKİP</Text><Text style={styles.fullscreenTitle}>{courier.dkd_display_name || 'Kurye'}</Text></View><View style={styles.fullscreenLive}><View style={styles.liveDot}/><Text style={styles.fullscreenLiveText}>ANLIK</Text></View><Pressable onPress={() => dkd_set_fullscreen_value(false)} style={styles.fullscreenClose}><MaterialCommunityIcons name="close" size={25} color="#FFF"/></Pressable></View><DkdMapSurface dkd_courier_point_value={dkd_courier_point_value} dkd_drop_point_value={dkd_drop_point_value} dkd_route_value={dkd_route_value} dkd_courier_user_id_value={dkd_courier_user_id_value} dkd_order_id_value={`${dkd_order_id_value}-fullscreen`} dkd_follow_value={dkd_follow_value} dkd_on_follow_press_value={() => dkd_set_follow_value((dkd_value) => !dkd_value)} dkd_fullscreen_value /><View style={styles.fullscreenMetrics}><View style={styles.fullMetric}><Text style={styles.fullMetricLabel}>KALAN MESAFE</Text><Text style={styles.fullMetricValue}>{dkd_distance_text_value}</Text></View><View style={styles.fullMetric}><Text style={styles.fullMetricLabel}>TAHMİNİ VARIŞ</Text><Text style={styles.fullMetricValue}>{dkd_eta_text_value}</Text></View><View style={styles.fullMetric}><Text style={styles.fullMetricLabel}>SON KONUM</Text><Text style={styles.fullMetricValueSmall}>{dkd_location_updated_at ? new Date(dkd_location_updated_at).toLocaleTimeString('tr-TR') : '—'}</Text></View></View></View></Modal>
  </>;
}

const styles=StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.72)'},sheet:{maxHeight:'92%',borderTopLeftRadius:30,borderTopRightRadius:30,padding:14,borderWidth:1,borderColor:'rgba(154,214,255,.18)'},handle:{width:46,height:5,borderRadius:8,backgroundColor:'#3B4B63',alignSelf:'center',marginBottom:12},header:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12},motorShell:{width:66,height:54,borderRadius:18,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1,minWidth:0},kicker:{color:'#89F0FF',fontSize:12.5,fontWeight:'900',letterSpacing:1},title:{color:'#FFF',fontSize:21,fontWeight:'900',marginTop:1},subtitle:{color:'#A9BDD5',fontSize:13.5,fontWeight:'700',marginTop:2},onlineBadge:{minHeight:31,paddingHorizontal:9,borderRadius:999,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(83,237,176,.11)',borderWidth:1,borderColor:'rgba(83,237,176,.18)'},liveDot:{width:7,height:7,borderRadius:99,backgroundColor:'#60F0B6'},onlineText:{color:'#8BF4CA',fontSize:11.5,fontWeight:'900'},closeButton:{width:40,height:40,borderRadius:14,backgroundColor:'rgba(255,255,255,.06)',alignItems:'center',justifyContent:'center'},scrollContent:{paddingBottom:28},mapWrap:{height:300,borderRadius:23,overflow:'hidden',borderWidth:1,borderColor:'rgba(129,224,255,.18)',backgroundColor:'#0A1525'},mapFill:{flex:1},map:{flex:1},mapLiveBadge:{position:'absolute',top:12,left:12,minHeight:31,paddingHorizontal:10,borderRadius:12,backgroundColor:'rgba(5,18,31,.88)',flexDirection:'row',alignItems:'center',gap:6},mapLiveText:{color:'#DDFBFF',fontSize:11.5,fontWeight:'900'},expandButton:{position:'absolute',top:12,right:12,width:48,height:48,borderRadius:16,backgroundColor:'rgba(4,13,24,.88)',alignItems:'center',justifyContent:'center'},followButton:{position:'absolute',right:12,bottom:12,width:48,height:48,borderRadius:16,backgroundColor:'rgba(4,13,24,.90)',borderWidth:1,borderColor:'rgba(117,235,255,.20)',alignItems:'center',justifyContent:'center'},followButtonActive:{backgroundColor:'#6DEBFF'},noLocation:{flex:1,alignItems:'center',justifyContent:'center',padding:28},noLocationTitle:{color:'#E4EFFB',fontSize:16,fontWeight:'900',marginTop:8},noLocationText:{color:'#8296B1',fontSize:13,lineHeight:18,fontWeight:'700',textAlign:'center',marginTop:5},marker:{width:42,height:42,borderRadius:999,backgroundColor:'#6DEBFF',borderWidth:3,borderColor:'#FFF',alignItems:'center',justifyContent:'center'},markerGreen:{backgroundColor:'#70EFB5',borderRadius:14},metricRow:{flexDirection:'row',gap:8,marginTop:11},metric:{flex:1,minHeight:92,borderRadius:18,padding:10,borderWidth:1,borderColor:'rgba(255,255,255,.07)'},metricLabel:{color:'#9BAEC5',fontSize:10.5,fontWeight:'900',letterSpacing:.45,marginTop:7},metricValue:{color:'#FFF',fontSize:15,fontWeight:'900',marginTop:4},updatedCard:{minHeight:60,borderRadius:18,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:10,marginTop:10,backgroundColor:'rgba(93,220,255,.07)',borderWidth:1,borderColor:'rgba(93,220,255,.11)'},updatedLabel:{color:'#7F9AB7',fontSize:10.5,fontWeight:'900',letterSpacing:.5},updatedValue:{color:'#D7E7F7',fontSize:13.5,fontWeight:'800',marginTop:2},secondBadge:{paddingHorizontal:8,paddingVertical:5,borderRadius:10,backgroundColor:'rgba(95,238,185,.10)'},secondBadgeText:{color:'#8CF2C9',fontSize:10.5,fontWeight:'900'},sectionHead:{flexDirection:'row',alignItems:'center',gap:10,marginTop:18,marginBottom:9},sectionIcon:{width:42,height:42,borderRadius:15,backgroundColor:'rgba(255,200,89,.09)',alignItems:'center',justifyContent:'center'},sectionTitle:{color:'#FFF',fontSize:18,fontWeight:'900'},sectionSub:{color:'#8095AE',fontSize:12.5,fontWeight:'700',marginTop:2},orderCard:{borderRadius:22,padding:14,borderWidth:1,borderColor:'rgba(135,149,255,.12)'},orderTop:{flexDirection:'row',alignItems:'flex-start',gap:9},orderRef:{color:'#81E9FF',fontSize:12,fontWeight:'900'},orderTitle:{color:'#FFF',fontSize:17,fontWeight:'900',marginTop:3},infoBlock:{paddingTop:13,marginTop:12,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.06)'},infoLabel:{color:'#7E90AB',fontSize:10,fontWeight:'900'},infoValue:{color:'#E4EEF9',fontSize:13.5,lineHeight:19,fontWeight:'800',marginTop:4},orderMetaRow:{flexDirection:'row',gap:8,marginTop:10},orderMeta:{flex:1,paddingTop:10,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.06)'},orderMetaValue:{color:'#FFF',fontSize:14.5,fontWeight:'900',marginTop:4},orderMetaValueSmall:{color:'#DDE9F6',fontSize:13.5,fontWeight:'900',marginTop:4},emptyOrder:{alignItems:'center',padding:25,borderRadius:20,backgroundColor:'rgba(255,255,255,.035)'},emptyOrderTitle:{color:'#E2ECF8',fontSize:15,fontWeight:'900',marginTop:7},emptyOrderText:{color:'#7D91AA',fontSize:12.5,lineHeight:17,fontWeight:'700',textAlign:'center',marginTop:4},fullscreenRoot:{flex:1,backgroundColor:'#061321'},fullscreenHeader:{minHeight:112,paddingHorizontal:16,paddingTop:34,paddingBottom:12,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#061625'},fullscreenKicker:{color:'#78EAFF',fontSize:11.5,fontWeight:'900',letterSpacing:1.2},fullscreenTitle:{color:'#FFF',fontSize:24,fontWeight:'900',marginTop:3},fullscreenLive:{minHeight:36,paddingHorizontal:11,borderRadius:15,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(85,239,178,.10)',borderWidth:1,borderColor:'rgba(85,239,178,.18)'},fullscreenLiveText:{color:'#91F3CB',fontSize:11.5,fontWeight:'900'},fullscreenClose:{width:50,height:50,borderRadius:17,backgroundColor:'rgba(255,255,255,.07)',alignItems:'center',justifyContent:'center'},fullscreenMapWrap:{flex:1},fullscreenMetrics:{minHeight:120,padding:12,flexDirection:'row',gap:8,backgroundColor:'#071321'},fullMetric:{flex:1,borderRadius:18,backgroundColor:'rgba(255,255,255,.045)',padding:11},fullMetricLabel:{color:'#7D91AA',fontSize:9.5,fontWeight:'900'},fullMetricValue:{color:'#FFF',fontSize:20,fontWeight:'900',marginTop:8},fullMetricValueSmall:{color:'#FFF',fontSize:15,fontWeight:'900',marginTop:10}
});
