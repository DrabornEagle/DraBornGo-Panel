import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DkdStatusPill, dkd_money } from './PanelComponents';

function dkd_text(dkd_value, dkd_fallback = '—') { const dkd_result = String(dkd_value ?? '').trim(); return dkd_result || dkd_fallback; }
function dkd_time(dkd_value) { return dkd_value ? new Date(dkd_value).toLocaleString('tr-TR') : '—'; }
function dkd_status_tone(dkd_status) { const dkd_value=String(dkd_status||'').toLowerCase(); if(['completed','delivered'].includes(dkd_value))return 'green'; if(['cancelled','canceled'].includes(dkd_value))return 'red'; if(['accepted','picked_up','to_customer','delivering'].includes(dkd_value))return 'blue'; return 'yellow'; }

export default function ReportOrderDetailModal({ visible, order, onClose }) {
  if (!order) return null;
  const dkd_rows = [
    ['account-outline','Müşteri',dkd_text(order.dkd_customer_name,'Belirtilmedi')],
    ['phone-outline','Telefon',dkd_text(order.dkd_customer_phone,'Belirtilmedi')],
    ['store-marker-outline','Alım Noktası',dkd_text(order.dkd_pickup,'Belirtilmedi')],
    ['map-marker-check-outline','Teslimat Adresi',dkd_text(order.dkd_dropoff,'Belirtilmedi')],
    ['note-text-outline','Kurye Notu',dkd_text(order.dkd_delivery_note,'Not yok')],
    ['bike-fast','Kurye',`${dkd_text(order.dkd_courier_name,'Kurye')}${order.dkd_courier_plate ? ` • ${order.dkd_courier_plate}` : ''}`],
  ];
  const dkd_timeline = [
    ['Oluşturuldu',order.dkd_created_at,'package-variant-plus'],
    ['Kabul edildi',order.dkd_accepted_at,'check-decagram-outline'],
    ['Paket alındı',order.dkd_picked_up_at,'package-variant-closed-check'],
    ['Teslim edildi',order.dkd_completed_at,'flag-checkered'],
  ];
  return <Modal visible={Boolean(visible)} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><LinearGradient colors={['#06111E','#0A1830','#17152F']} style={styles.sheet}>
      <View style={styles.handle}/>
      <View style={styles.head}><LinearGradient colors={['#FFE07A','#FFAA76','#9A7BFF']} style={styles.heroIcon}><MaterialCommunityIcons name="receipt-text-check-outline" size={27} color="#211404"/></LinearGradient><View style={styles.flexOne}><Text style={styles.kicker}>GÜNÜN SİPARİŞ DETAYI</Text><Text style={styles.title}>#{dkd_text(order.dkd_order_ref,order.dkd_job_id)}</Text><Text style={styles.subtitle}>{dkd_text(order.dkd_title,'Sipariş')}</Text></View><Pressable onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={23} color="#FFF"/></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.metricRow}><LinearGradient colors={['rgba(92,232,255,.18)','rgba(72,107,255,.08)']} style={styles.metric}><Text style={styles.metricLabel}>DURUM</Text><DkdStatusPill text={String(order.dkd_status||'COMPLETED').toUpperCase()} tone={dkd_status_tone(order.dkd_status)}/></LinearGradient><LinearGradient colors={['rgba(96,239,180,.18)','rgba(45,154,120,.08)']} style={styles.metric}><Text style={styles.metricLabel}>TAHSİLAT</Text><Text style={styles.metricValue}>{dkd_money(order.dkd_amount_tl ?? order.dkd_customer_charge_tl)}</Text></LinearGradient></View>
        <View style={styles.metricRow}><View style={styles.smallMetric}><MaterialCommunityIcons name="map-marker-distance" size={20} color="#75E9FF"/><Text style={styles.smallLabel}>MESAFE</Text><Text style={styles.smallValue}>{Number(order.dkd_distance_km||0).toFixed(1)} km</Text></View><View style={styles.smallMetric}><MaterialCommunityIcons name="clock-fast" size={20} color="#78EFB8"/><Text style={styles.smallLabel}>VARIŞ</Text><Text style={styles.smallValue}>{Number(order.dkd_eta_min||0)} dk</Text></View><View style={styles.smallMetric}><MaterialCommunityIcons name="cash-fast" size={20} color="#FFD478"/><Text style={styles.smallLabel}>KURYE ÜCRETİ</Text><Text style={styles.smallValue}>{dkd_money(order.dkd_courier_fee_tl)}</Text></View></View>
        {dkd_rows.map(([dkd_icon,dkd_label,dkd_value])=><View key={dkd_label} style={styles.infoRow}><View style={styles.infoIcon}><MaterialCommunityIcons name={dkd_icon} size={20} color="#77EAFF"/></View><View style={styles.flexOne}><Text style={styles.infoLabel}>{dkd_label}</Text><Text style={styles.infoValue}>{dkd_value}</Text></View></View>)}
        <View style={styles.sectionHead}><MaterialCommunityIcons name="timeline-clock-outline" size={20} color="#80EFFF"/><Text style={styles.sectionTitle}>Zaman Çizelgesi</Text></View>
        <View style={styles.timeline}>{dkd_timeline.map(([dkd_label,dkd_value,dkd_icon],dkd_index)=><View key={dkd_label} style={[styles.timelineRow,dkd_index>0&&styles.timelineBorder]}><View style={[styles.timelineIcon,dkd_value&&styles.timelineIconDone]}><MaterialCommunityIcons name={dkd_icon} size={16} color={dkd_value?'#07131D':'#71839D'}/></View><Text style={styles.timelineLabel}>{dkd_label}</Text><Text style={styles.timelineTime}>{dkd_time(dkd_value)}</Text></View>)}</View>
      </ScrollView>
    </LinearGradient></View>
  </Modal>;
}

const styles=StyleSheet.create({backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.74)'},sheet:{maxHeight:'94%',borderTopLeftRadius:30,borderTopRightRadius:30,padding:15,borderWidth:1,borderColor:'rgba(145,215,255,.18)'},handle:{width:50,height:5,borderRadius:99,backgroundColor:'#394A62',alignSelf:'center',marginBottom:13},head:{flexDirection:'row',alignItems:'center',gap:11},heroIcon:{width:58,height:58,borderRadius:19,alignItems:'center',justifyContent:'center'},flexOne:{flex:1,minWidth:0},kicker:{color:'#8DF1FF',fontSize:11.5,fontWeight:'900',letterSpacing:1},title:{color:'#FFF',fontSize:26,fontWeight:'900',marginTop:2},subtitle:{color:'#A9BCD3',fontSize:13.5,fontWeight:'800',marginTop:2},close:{width:45,height:45,borderRadius:15,backgroundColor:'rgba(255,255,255,.07)',alignItems:'center',justifyContent:'center'},content:{paddingTop:14,paddingBottom:34},metricRow:{flexDirection:'row',gap:9,marginBottom:9},metric:{flex:1,minHeight:92,borderRadius:20,padding:12,borderWidth:1,borderColor:'rgba(255,255,255,.07)'},metricLabel:{color:'#869CB7',fontSize:10.5,fontWeight:'900',letterSpacing:.55,marginBottom:8},metricValue:{color:'#FFF',fontSize:18,fontWeight:'900'},smallMetric:{flex:1,minHeight:93,borderRadius:18,padding:10,backgroundColor:'#0C182A',borderWidth:1,borderColor:'rgba(255,255,255,.06)'},smallLabel:{color:'#7E93AD',fontSize:9.5,fontWeight:'900',letterSpacing:.4,marginTop:7},smallValue:{color:'#FFF',fontSize:13.5,fontWeight:'900',marginTop:4},infoRow:{minHeight:72,borderRadius:19,padding:12,marginBottom:8,backgroundColor:'#0C1728',borderWidth:1,borderColor:'rgba(255,255,255,.06)',flexDirection:'row',alignItems:'center',gap:11},infoIcon:{width:43,height:43,borderRadius:14,backgroundColor:'rgba(91,225,255,.08)',alignItems:'center',justifyContent:'center'},infoLabel:{color:'#8197B1',fontSize:10.5,fontWeight:'900'},infoValue:{color:'#EAF4FF',fontSize:14,fontWeight:'800',marginTop:4,lineHeight:19},sectionHead:{flexDirection:'row',alignItems:'center',gap:8,marginTop:9,marginBottom:8},sectionTitle:{color:'#FFF',fontSize:17,fontWeight:'900'},timeline:{borderRadius:20,backgroundColor:'#0B1525',borderWidth:1,borderColor:'rgba(255,255,255,.06)',paddingHorizontal:12},timelineRow:{minHeight:65,flexDirection:'row',alignItems:'center',gap:9},timelineBorder:{borderTopWidth:1,borderTopColor:'rgba(255,255,255,.06)'},timelineIcon:{width:34,height:34,borderRadius:12,backgroundColor:'#172338',alignItems:'center',justifyContent:'center'},timelineIconDone:{backgroundColor:'#72E9B6'},timelineLabel:{color:'#DCE8F5',fontSize:12.5,fontWeight:'900',width:92},timelineTime:{flex:1,color:'#8297B1',fontSize:11.5,fontWeight:'800',textAlign:'right'}});
