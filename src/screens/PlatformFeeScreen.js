import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { dkd_theme } from '../lib/theme';
import {
  dkd_panel_fetch_platform_fee_profile,
  dkd_panel_set_platform_schedule,
  dkd_panel_ack_platform_notice,
  dkd_panel_upload_platform_receipt,
  dkd_panel_submit_platform_payment,
} from '../services/panelService';

const dkd_weekdays = [{v:1,l:'Pzt'},{v:2,l:'Sal'},{v:3,l:'Çar'},{v:4,l:'Per'},{v:5,l:'Cum'},{v:6,l:'Cmt'},{v:7,l:'Paz'}];
const dkd_money = (dkd_value) => `${Number(dkd_value || 0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} TL`;

function DkdInfo({ label, value, icon }) { return <View style={styles.info}><MaterialCommunityIcons name={icon} size={20} color={dkd_theme.cyan} /><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }

export default function PlatformFeeScreen() {
  const [dkd_data,dkd_set_data] = useState(null);
  const [dkd_loading,dkd_set_loading] = useState(true);
  const [dkd_busy,dkd_set_busy] = useState(false);
  const [dkd_error,dkd_set_error] = useState('');
  const [dkd_cycle,dkd_set_cycle] = useState('weekly');
  const [dkd_weekday,dkd_set_weekday] = useState(1);
  const [dkd_month_day,dkd_set_month_day] = useState(1);
  const [dkd_amount,dkd_set_amount] = useState('0');
  const [dkd_receipt,dkd_set_receipt] = useState(null);

  const dkd_load = useCallback(async () => {
    dkd_set_error('');
    try {
      const dkd_value = await dkd_panel_fetch_platform_fee_profile();
      dkd_set_data(dkd_value || {});
      dkd_set_cycle(dkd_value?.dkd_payment_cycle || 'weekly');
      dkd_set_weekday(Number(dkd_value?.dkd_weekday || 1));
      dkd_set_month_day(Number(dkd_value?.dkd_month_day || 1));
      dkd_set_amount(String(Number(dkd_value?.dkd_outstanding_tl || 0).toFixed(2)));
    } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  },[]);
  useEffect(() => { dkd_load(); },[dkd_load]);

  const dkd_save_schedule = async () => {
    dkd_set_busy(true); dkd_set_error('');
    try { await dkd_panel_set_platform_schedule(dkd_cycle,dkd_weekday,dkd_month_day); await dkd_load(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_pick_receipt = async () => {
    const dkd_value = await DocumentPicker.getDocumentAsync({ type:['image/jpeg','image/png','image/webp','application/pdf'],copyToCacheDirectory:true,multiple:false });
    if (!dkd_value.canceled && dkd_value.assets?.[0]) dkd_set_receipt(dkd_value.assets[0]);
  };
  const dkd_submit = async () => {
    const dkd_amount_value = Number(String(dkd_amount).replace(',','.'));
    if (!(dkd_amount_value > 0)) return dkd_set_error('Ödeme tutarı 0 TL’den büyük olmalı.');
    if (!dkd_receipt?.uri) return dkd_set_error('Önce ödeme dekontunu seç.');
    dkd_set_busy(true); dkd_set_error('');
    try {
      const dkd_path_value = await dkd_panel_upload_platform_receipt(dkd_receipt);
      await dkd_panel_submit_platform_payment(dkd_amount_value,dkd_path_value);
      dkd_set_receipt(null); await dkd_load();
    } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_ack_popup = async () => {
    const dkd_key_value = dkd_data?.dkd_popup?.dkd_notice_key;
    if (dkd_key_value) await dkd_panel_ack_platform_notice(dkd_key_value).catch(() => null);
    dkd_set_data((dkd_prev) => ({...(dkd_prev || {}),dkd_popup:null}));
  };

  if (dkd_loading) return <View style={styles.loading}><ActivityIndicator size="large" color={dkd_theme.cyan}/><Text style={styles.muted}>Platform Hizmet Bedeli hazırlanıyor…</Text></View>;
  const dkd_fee_text = dkd_data?.dkd_fee_mode === 'percentage' ? `%${Number(dkd_data?.dkd_fee_value || 0)}` : dkd_money(dkd_data?.dkd_fee_value);
  return <View style={styles.root}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.kicker}>ÖDEME VE ANLAŞMA</Text><Text style={styles.title}>Platform Hizmet Bedeli</Text><Text style={styles.subtitle}>Teslim edilen paketler için işletmenize tanımlanan hizmet bedelini, ödeme gününü ve ödeme bildirimlerini buradan yönet.</Text>
    {!!dkd_error && <View style={styles.errorBox}><Text style={styles.error}>{dkd_error}</Text></View>}
    <View style={styles.infoGrid}><DkdInfo icon="hand-coin-outline" label="ANLAŞMAN" value={dkd_fee_text}/><DkdInfo icon="cash-clock" label="GÜNCEL BAKİYE" value={dkd_money(dkd_data?.dkd_outstanding_tl)}/><DkdInfo icon="cash-check" label="BİLDİRİLEN/ÖDENEN" value={dkd_money(dkd_data?.dkd_submitted_or_paid_tl)}/><DkdInfo icon="cash-multiple" label="TOPLAM HİZMET BEDELİ" value={dkd_money(dkd_data?.dkd_total_fee_tl)}/></View>

    <View style={styles.card}><Text style={styles.cardTitle}>Ödeme Bilgisi</Text><Text style={styles.label}>ALICI</Text><Text style={styles.bigValue}>{dkd_data?.dkd_account_name || 'DraBornGo'}</Text><Text style={styles.label}>IBAN</Text><Text selectable style={styles.iban}>{dkd_data?.dkd_iban || 'IBAN henüz Yönetim Merkezi tarafından tanımlanmadı.'}</Text></View>

    <View style={styles.card}><Text style={styles.cardTitle}>Ödeme Gününü Seç</Text><Text style={styles.cardText}>Haftalık veya aylık ödeme düzenini sen seçebilirsin. Ödeme gününde bildirim ve tek seferlik bilgilendirme açılır.</Text><View style={styles.switchRow}>{[['weekly','Haftalık'],['monthly','Aylık']].map(([dkd_value,dkd_label]) => <Pressable key={dkd_value} onPress={() => dkd_set_cycle(dkd_value)} style={[styles.switch,dkd_cycle===dkd_value&&styles.switchActive]}><Text style={[styles.switchText,dkd_cycle===dkd_value&&styles.switchTextActive]}>{dkd_label}</Text></Pressable>)}</View>
      {dkd_cycle==='weekly' ? <View style={styles.chips}>{dkd_weekdays.map((dkd_day) => <Pressable key={dkd_day.v} onPress={() => dkd_set_weekday(dkd_day.v)} style={[styles.chip,dkd_weekday===dkd_day.v&&styles.chipActive]}><Text style={[styles.chipText,dkd_weekday===dkd_day.v&&styles.chipTextActive]}>{dkd_day.l}</Text></Pressable>)}</View> : <><Text style={styles.label}>AYIN GÜNÜ</Text><View style={styles.chips}>{Array.from({length:31},(_,dkd_index)=>dkd_index+1).map((dkd_day) => <Pressable key={dkd_day} onPress={() => dkd_set_month_day(dkd_day)} style={[styles.dayChip,dkd_month_day===dkd_day&&styles.chipActive]}><Text style={[styles.chipText,dkd_month_day===dkd_day&&styles.chipTextActive]}>{dkd_day}</Text></Pressable>)}</View></>}
      <Pressable disabled={dkd_busy} onPress={dkd_save_schedule} style={styles.primary}><Text style={styles.primaryText}>ÖDEME GÜNÜNÜ KAYDET</Text></Pressable>
    </View>

    <View style={styles.card}><Text style={styles.cardTitle}>Ödeme Bildir</Text><Text style={styles.cardText}>Ödemeyi yaptıktan sonra tutarı girip dekontunu yükle. Bildirim anında Yönetim Merkezi’ne düşer.</Text><Text style={styles.label}>ÖDEME TUTARI</Text><TextInput keyboardType="decimal-pad" value={dkd_amount} onChangeText={dkd_set_amount} style={styles.input}/><Pressable onPress={dkd_pick_receipt} style={styles.receiptButton}><MaterialCommunityIcons name="file-upload-outline" size={20} color={dkd_theme.cyan}/><View style={{flex:1}}><Text style={styles.receiptTitle}>{dkd_receipt?.name || 'Dekont Seç'}</Text><Text style={styles.receiptMeta}>JPG, PNG, WEBP veya PDF • en fazla 10 MB</Text></View></Pressable><Pressable disabled={dkd_busy} onPress={dkd_submit} style={styles.primary}>{dkd_busy?<ActivityIndicator color="#07121D"/>:<Text style={styles.primaryText}>ÖDEMEYİ BİLDİR</Text>}</Pressable></View>

    <View style={styles.card}><Text style={styles.cardTitle}>Son Ödeme Bildirimleri</Text>{(dkd_data?.dkd_recent_payments || []).length ? (dkd_data.dkd_recent_payments || []).map((dkd_payment) => <View key={dkd_payment.dkd_id} style={styles.row}><View style={{flex:1}}><Text style={styles.rowTitle}>{dkd_money(dkd_payment.dkd_amount_tl)}</Text><Text style={styles.rowMeta}>{new Date(dkd_payment.dkd_submitted_at).toLocaleString('tr-TR')}</Text></View><Text style={[styles.status,dkd_payment.dkd_status==='approved'&&styles.statusOk,dkd_payment.dkd_status==='rejected'&&styles.statusBad]}>{dkd_payment.dkd_status==='approved'?'Onaylandı':dkd_payment.dkd_status==='rejected'?'Reddedildi':'İnceleniyor'}</Text></View>) : <Text style={styles.empty}>Henüz ödeme bildirimi yok.</Text>}</View>
    <View style={styles.card}><Text style={styles.cardTitle}>Son Paket Hizmet Bedelleri</Text>{(dkd_data?.dkd_recent_ledger || []).length ? (dkd_data.dkd_recent_ledger || []).map((dkd_item) => <View key={dkd_item.dkd_job_id} style={styles.row}><View style={{flex:1}}><Text style={styles.rowTitle}>Paket #{dkd_item.dkd_job_id}</Text><Text style={styles.rowMeta}>{new Date(dkd_item.dkd_completed_at).toLocaleString('tr-TR')}</Text></View><Text style={styles.money}>{dkd_money(dkd_item.dkd_platform_fee_tl)}</Text></View>) : <Text style={styles.empty}>Henüz tamamlanan paket hizmet bedeli kaydı yok.</Text>}</View>
    <View style={{height:110}} />
  </ScrollView>
  <Modal transparent visible={Boolean(dkd_data?.dkd_popup)} animationType="fade" onRequestClose={dkd_ack_popup}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalIcon}><MaterialCommunityIcons name="calendar-alert" size={31} color={dkd_theme.cyan}/></View><Text style={styles.modalTitle}>{dkd_data?.dkd_popup?.dkd_title}</Text><Text style={styles.modalText}>{dkd_data?.dkd_popup?.dkd_body}</Text><Text style={styles.modalAmount}>{dkd_money(dkd_data?.dkd_popup?.dkd_amount_tl)}</Text><Pressable onPress={dkd_ack_popup} style={styles.primary}><Text style={styles.primaryText}>OKUDUM, ANLADIM</Text></Pressable></View></View></Modal>
  </View>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:dkd_theme.background},content:{padding:14,paddingTop:18},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:dkd_theme.background},muted:{color:dkd_theme.textSoft,fontWeight:'800'},kicker:{color:dkd_theme.cyan,fontSize:12.5,fontWeight:'900',letterSpacing:1.1},title:{color:dkd_theme.text,fontSize:28,fontWeight:'900',marginTop:3},subtitle:{color:dkd_theme.textSoft,fontSize:14,lineHeight:20,fontWeight:'700',marginTop:4,marginBottom:14},errorBox:{padding:11,borderRadius:15,backgroundColor:'rgba(255,92,117,.08)',borderWidth:1,borderColor:'rgba(255,92,117,.18)',marginBottom:10},error:{color:'#FFB6C0',fontWeight:'800'},infoGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},info:{width:'47%',flexGrow:1,minHeight:103,padding:12,borderRadius:20,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},infoLabel:{color:dkd_theme.muted,fontSize:10.5,fontWeight:'900',marginTop:6},infoValue:{color:dkd_theme.text,fontSize:16,fontWeight:'900',marginTop:3},card:{marginTop:11,padding:13,borderRadius:22,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},cardTitle:{color:dkd_theme.text,fontSize:19,fontWeight:'900'},cardText:{color:dkd_theme.textSoft,fontSize:13,lineHeight:18,fontWeight:'700',marginTop:4},label:{color:dkd_theme.muted,fontSize:11,fontWeight:'900',letterSpacing:.6,marginTop:12,marginBottom:5},bigValue:{color:dkd_theme.text,fontSize:16,fontWeight:'900'},iban:{color:dkd_theme.cyan,fontSize:15,fontWeight:'900',lineHeight:21},switchRow:{flexDirection:'row',gap:8,marginTop:12},switch:{flex:1,minHeight:46,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:dkd_theme.border,backgroundColor:'rgba(255,255,255,.03)'},switchActive:{backgroundColor:dkd_theme.cyan},switchText:{color:dkd_theme.textSoft,fontWeight:'900'},switchTextActive:{color:'#07121D'},chips:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9},chip:{flex:1,minWidth:42,minHeight:40,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.03)',borderWidth:1,borderColor:dkd_theme.border},dayChip:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.03)',borderWidth:1,borderColor:dkd_theme.border},chipActive:{backgroundColor:dkd_theme.cyan},chipText:{color:dkd_theme.textSoft,fontSize:12,fontWeight:'900'},chipTextActive:{color:'#07121D'},primary:{minHeight:49,borderRadius:15,backgroundColor:dkd_theme.cyan,alignItems:'center',justifyContent:'center',marginTop:11},primaryText:{color:'#07121D',fontSize:13.5,fontWeight:'900'},input:{minHeight:49,borderRadius:15,paddingHorizontal:12,color:dkd_theme.text,fontSize:15,fontWeight:'800',backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:dkd_theme.border},receiptButton:{minHeight:64,borderRadius:16,marginTop:9,padding:10,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'rgba(98,231,255,.05)',borderWidth:1,borderColor:'rgba(98,231,255,.15)'},receiptTitle:{color:dkd_theme.text,fontSize:13.5,fontWeight:'900'},receiptMeta:{color:dkd_theme.textSoft,fontSize:11.5,fontWeight:'700',marginTop:2},row:{minHeight:55,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)',flexDirection:'row',alignItems:'center',gap:8},rowTitle:{color:dkd_theme.text,fontSize:14,fontWeight:'900'},rowMeta:{color:dkd_theme.textSoft,fontSize:11.5,fontWeight:'700',marginTop:2},status:{color:'#FFD28D',fontSize:11.5,fontWeight:'900'},statusOk:{color:'#A8F1D0'},statusBad:{color:'#FFB6C0'},money:{color:'#A8F1D0',fontSize:14,fontWeight:'900'},empty:{color:dkd_theme.textSoft,fontSize:13,fontWeight:'700',marginTop:10},modalBackdrop:{flex:1,backgroundColor:'rgba(1,7,14,.8)',alignItems:'center',justifyContent:'center',padding:22},modalCard:{width:'100%',maxWidth:390,padding:20,borderRadius:26,backgroundColor:'#0B1726',borderWidth:1,borderColor:'rgba(98,231,255,.22)'},modalIcon:{width:60,height:60,borderRadius:20,alignSelf:'center',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(98,231,255,.09)'},modalTitle:{color:dkd_theme.text,fontSize:22,fontWeight:'900',textAlign:'center',marginTop:12},modalText:{color:dkd_theme.textSoft,fontSize:14,lineHeight:21,fontWeight:'700',textAlign:'center',marginTop:8},modalAmount:{color:'#A8F1D0',fontSize:25,fontWeight:'900',textAlign:'center',marginTop:10}});
