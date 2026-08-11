import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dkd_theme } from '../lib/theme';
import {
  dkd_admin_fetch_dashboard,
  dkd_admin_search_businesses,
  dkd_admin_fetch_business_detail,
  dkd_admin_search_couriers,
  dkd_admin_fetch_courier_detail,
  dkd_admin_set_platform_agreement,
  dkd_admin_set_iban,
  dkd_admin_review_payment,
  dkd_admin_create_payment_receipt_signed_url,
  dkd_panel_ack_platform_notice,
  dkd_panel_sign_out,
} from '../services/adminService';

const dkd_money = (dkd_value) => `${Number(dkd_value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
const dkd_earning_value = (dkd_value) => Number(dkd_value?.dkd_earnings_tl || 0);

function DkdStat({ icon, label, value }) {
  return <View style={styles.stat}><MaterialCommunityIcons name={icon} size={20} color={dkd_theme.cyan} /><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}
function DkdSectionTitle({ title, subtitle }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}</View>;
}
function DkdChartRows({ rows, keyName, valueName, suffix = '' }) {
  const dkd_values = Array.isArray(rows) ? rows : [];
  const dkd_max = Math.max(1, ...dkd_values.map((dkd_row) => Number(dkd_row?.[valueName] || 0)));
  return <View style={styles.chartList}>{dkd_values.map((dkd_row, dkd_index) => {
    const dkd_value = Number(dkd_row?.[valueName] || 0);
    const dkd_label = String(dkd_row?.[keyName] ?? dkd_index) + suffix;
    return <View key={`${dkd_label}-${dkd_index}`} style={styles.chartRow}><Text style={styles.chartLabel}>{dkd_label}</Text><View style={styles.chartTrack}><View style={[styles.chartFill, { width: `${Math.max(2, Math.min(100, (dkd_value / dkd_max) * 100))}%` }]} /></View><Text style={styles.chartMoney}>{dkd_money(dkd_value)}</Text></View>;
  })}</View>;
}

export default function AdminCenterScreen() {
  const [dkd_dashboard, dkd_set_dashboard] = useState(null);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_error, dkd_set_error] = useState('');
  const [dkd_mode, dkd_set_mode] = useState('businesses');
  const [dkd_business_query, dkd_set_business_query] = useState('');
  const [dkd_businesses, dkd_set_businesses] = useState([]);
  const [dkd_business_detail, dkd_set_business_detail] = useState(null);
  const [dkd_courier_query, dkd_set_courier_query] = useState('');
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_courier_detail, dkd_set_courier_detail] = useState(null);
  const [dkd_fee_mode, dkd_set_fee_mode] = useState('fixed');
  const [dkd_fee_value, dkd_set_fee_value] = useState('0');
  const [dkd_iban, dkd_set_iban] = useState('');
  const [dkd_busy, dkd_set_busy] = useState(false);
  const [dkd_receipt_url, dkd_set_receipt_url] = useState('');

  const dkd_load_dashboard = useCallback(async () => {
    dkd_set_error('');
    try {
      const dkd_value = await dkd_admin_fetch_dashboard();
      dkd_set_dashboard(dkd_value || {});
      dkd_set_iban(dkd_value?.dkd_iban || '');
    } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  }, []);

  const dkd_search_business = useCallback(async (dkd_query_value = dkd_business_query) => {
    try { const dkd_value = await dkd_admin_search_businesses(dkd_query_value); dkd_set_businesses(dkd_value?.dkd_businesses || []); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
  }, [dkd_business_query]);
  const dkd_search_courier = useCallback(async (dkd_query_value = dkd_courier_query) => {
    try { const dkd_value = await dkd_admin_search_couriers(dkd_query_value); dkd_set_couriers(dkd_value?.dkd_couriers || []); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
  }, [dkd_courier_query]);

  useEffect(() => { dkd_load_dashboard(); dkd_search_business(''); dkd_search_courier(''); }, []);
  useEffect(() => { const dkd_timer = setTimeout(() => dkd_search_business(), 260); return () => clearTimeout(dkd_timer); }, [dkd_business_query]);
  useEffect(() => { const dkd_timer = setTimeout(() => dkd_search_courier(), 260); return () => clearTimeout(dkd_timer); }, [dkd_courier_query]);

  const dkd_open_business = async (dkd_business_id_value) => {
    dkd_set_busy(true); dkd_set_error('');
    try {
      const dkd_value = await dkd_admin_fetch_business_detail(dkd_business_id_value);
      dkd_set_business_detail(dkd_value);
      dkd_set_fee_mode(dkd_value?.dkd_agreement?.dkd_fee_mode || 'fixed');
      dkd_set_fee_value(String(dkd_value?.dkd_agreement?.dkd_fee_value ?? 0));
    } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_open_courier = async (dkd_courier_user_id_value) => {
    dkd_set_busy(true); dkd_set_error('');
    try { dkd_set_courier_detail(await dkd_admin_fetch_courier_detail(dkd_courier_user_id_value)); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_save_fee = async () => {
    const dkd_business_id_value = dkd_business_detail?.dkd_business?.dkd_id;
    if (!dkd_business_id_value) return;
    dkd_set_busy(true);
    try { await dkd_admin_set_platform_agreement(dkd_business_id_value, dkd_fee_mode, Number(String(dkd_fee_value).replace(',', '.')) || 0); await dkd_open_business(dkd_business_id_value); await dkd_load_dashboard(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); dkd_set_busy(false); }
  };
  const dkd_save_iban = async () => {
    dkd_set_busy(true);
    try { await dkd_admin_set_iban(dkd_iban, 'DraBornGo'); await dkd_load_dashboard(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_review_payment = async (dkd_payment_id_value, dkd_status_value) => {
    dkd_set_busy(true);
    try { await dkd_admin_review_payment(dkd_payment_id_value, dkd_status_value, ''); await dkd_load_dashboard(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_show_receipt = async (dkd_path_value) => {
    try { const dkd_value = await dkd_admin_create_payment_receipt_signed_url(dkd_path_value); dkd_set_receipt_url(dkd_value || ''); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
  };
  const dkd_ack_popup = async () => {
    const dkd_key_value = dkd_dashboard?.dkd_popup?.dkd_notice_key;
    if (dkd_key_value) await dkd_panel_ack_platform_notice(dkd_key_value).catch(() => null);
    dkd_set_dashboard((dkd_prev) => ({ ...(dkd_prev || {}), dkd_popup: null }));
  };

  if (dkd_loading) return <View style={styles.loading}><ActivityIndicator size="large" color={dkd_theme.cyan} /><Text style={styles.muted}>Yönetim Merkezi hazırlanıyor…</Text></View>;

  const dkd_pending = dkd_dashboard?.dkd_pending_payments || [];
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.kicker}>DRABORNGO PANEL • ADMIN</Text><Text style={styles.title}>Yönetim Merkezi</Text><Text style={styles.subtitle}>İşletmeler, kuryeler ve Platform Hizmet Bedeli tek ekranda.</Text></View><Pressable style={styles.logoutIcon} onPress={dkd_panel_sign_out}><MaterialCommunityIcons name="logout" size={21} color="#FFB2BD" /></Pressable></View>
      {!!dkd_error && <View style={styles.errorBox}><Text style={styles.errorText}>{dkd_error}</Text></View>}
      <View style={styles.stats}><DkdStat icon="store-outline" label="İŞLETME" value={String(dkd_dashboard?.dkd_business_count || 0)} /><DkdStat icon="motorbike" label="KURYE" value={String(dkd_dashboard?.dkd_courier_count || 0)} /><DkdStat icon="calendar-today" label="BUGÜN" value={dkd_money(dkd_dashboard?.dkd_platform_today_tl)} /><DkdStat icon="calendar-week" label="HAFTA" value={dkd_money(dkd_dashboard?.dkd_platform_week_tl)} /><DkdStat icon="calendar-month" label="AY" value={dkd_money(dkd_dashboard?.dkd_platform_month_tl)} /><DkdStat icon="cash-multiple" label="TOPLAM" value={dkd_money(dkd_dashboard?.dkd_platform_all_tl)} /></View>

      <View style={styles.tabs}>{[['businesses','İşletmeler','store-search-outline'],['couriers','Kuryeler','account-search-outline'],['earnings','Kazanç Tablosu','chart-line']].map(([dkd_key,dkd_label,dkd_icon]) => <Pressable key={dkd_key} onPress={() => dkd_set_mode(dkd_key)} style={[styles.tab,dkd_mode===dkd_key&&styles.tabActive]}><MaterialCommunityIcons name={dkd_icon} size={18} color={dkd_mode===dkd_key?'#07121D':dkd_theme.textSoft} /><Text style={[styles.tabText,dkd_mode===dkd_key&&styles.tabTextActive]}>{dkd_label}</Text></Pressable>)}</View>

      {dkd_mode === 'businesses' && <>
        <DkdSectionTitle title="İşletme Araması" subtitle="İşletme adı, işletme sahibi, e-posta veya telefon ile ara." />
        <TextInput value={dkd_business_query} onChangeText={dkd_set_business_query} placeholder="İşletme veya işletme sahibi ara" placeholderTextColor="#536780" style={styles.search} />
        {(dkd_businesses || []).map((dkd_business) => <Pressable key={dkd_business.dkd_business_id} onPress={() => dkd_open_business(dkd_business.dkd_business_id)} style={styles.resultCard}><View style={styles.resultIcon}><MaterialCommunityIcons name="store" size={20} color={dkd_theme.cyan} /></View><View style={{flex:1}}><Text style={styles.resultTitle}>{dkd_business.dkd_business_name}</Text><Text style={styles.resultMeta}>{dkd_business.dkd_owner_full_name || 'İşletme sahibi'} • {dkd_business.dkd_courier_count || 0} kurye</Text><Text style={styles.resultMeta}>{dkd_business.dkd_city || ''} {dkd_business.dkd_district || ''}</Text></View><Text style={styles.resultMoney}>{dkd_money(dkd_business.dkd_platform_fee_total_tl)}</Text></Pressable>)}
        {dkd_business_detail && <View style={styles.detailCard}>
          <DkdSectionTitle title={dkd_business_detail?.dkd_business?.dkd_business_name || 'İşletme Detayı'} subtitle={`${dkd_business_detail?.dkd_business?.dkd_owner_full_name || ''} • ${dkd_business_detail?.dkd_courier_count || 0} aktif kurye`} />
          <View style={styles.miniStats}><DkdStat icon="cash" label="KURYE BUGÜN" value={dkd_money(dkd_business_detail.dkd_today_courier_earnings_tl)} /><DkdStat icon="cash" label="KURYE HAFTA" value={dkd_money(dkd_business_detail.dkd_week_courier_earnings_tl)} /><DkdStat icon="cash" label="KURYE AY" value={dkd_money(dkd_business_detail.dkd_month_courier_earnings_tl)} /><DkdStat icon="hand-coin" label="PLATFORM BUGÜN" value={dkd_money(dkd_business_detail.dkd_platform_today_tl)} /><DkdStat icon="hand-coin" label="PLATFORM HAFTA" value={dkd_money(dkd_business_detail.dkd_platform_week_tl)} /><DkdStat icon="hand-coin" label="PLATFORM AY" value={dkd_money(dkd_business_detail.dkd_platform_month_tl)} /></View>
          <Text style={styles.smallHead}>PLATFORM HİZMET BEDELİ ANLAŞMASI</Text><View style={styles.toggleRow}>{['fixed','percentage'].map((dkd_value) => <Pressable key={dkd_value} onPress={() => dkd_set_fee_mode(dkd_value)} style={[styles.toggle,dkd_fee_mode===dkd_value&&styles.toggleActive]}><Text style={[styles.toggleText,dkd_fee_mode===dkd_value&&styles.toggleTextActive]}>{dkd_value==='fixed'?'Sabit TL':'Yüzdelik %'}</Text></Pressable>)}</View><TextInput keyboardType="decimal-pad" value={dkd_fee_value} onChangeText={dkd_set_fee_value} style={styles.input} placeholder="Bedel" placeholderTextColor="#536780" /><Pressable style={styles.primaryButton} onPress={dkd_save_fee}><Text style={styles.primaryText}>ANLAŞMAYI KAYDET</Text></Pressable>
          <Text style={styles.smallHead}>AKTİF KURYELER</Text>{(dkd_business_detail.dkd_couriers || []).map((dkd_courier) => <View key={dkd_courier.dkd_courier_user_id} style={styles.courierLine}><View style={{flex:1}}><Text style={styles.resultTitle}>{dkd_courier.dkd_display_name}</Text><Text style={styles.resultMeta}>{dkd_courier.dkd_dbg_id || dkd_courier.dkd_email || ''}</Text></View><View><Text style={styles.resultMoney}>Gün {dkd_money(dkd_earning_value(dkd_courier.dkd_today))}</Text><Text style={styles.resultMeta}>Hf {dkd_money(dkd_earning_value(dkd_courier.dkd_week))} • Ay {dkd_money(dkd_earning_value(dkd_courier.dkd_month))}</Text></View></View>)}
          <Text style={styles.smallHead}>GÜN GÜN KURYE KAZANCI • SON 31 GÜN</Text><DkdChartRows rows={dkd_business_detail.dkd_daily_earnings} keyName="dkd_day" valueName="dkd_courier_earnings_tl" />
          <Text style={styles.smallHead}>SAATLİK KURYE KAZANCI • BUGÜN</Text><DkdChartRows rows={dkd_business_detail.dkd_hourly_earnings} keyName="dkd_hour" valueName="dkd_courier_earnings_tl" suffix=":00" />
          <Text style={styles.smallHead}>GÜN GÜN PLATFORM HİZMET BEDELİ</Text><DkdChartRows rows={dkd_business_detail.dkd_platform_daily} keyName="dkd_day" valueName="dkd_platform_fee_tl" />
        </View>}
      </>}

      {dkd_mode === 'couriers' && <>
        <DkdSectionTitle title="Kurye Araması" subtitle="Kurye adı, DBG ID veya e-posta ile ara." /><TextInput value={dkd_courier_query} onChangeText={dkd_set_courier_query} placeholder="Kurye ara" placeholderTextColor="#536780" style={styles.search} />
        {(dkd_couriers || []).map((dkd_courier) => <Pressable key={dkd_courier.dkd_courier_user_id} onPress={() => dkd_open_courier(dkd_courier.dkd_courier_user_id)} style={styles.resultCard}><View style={styles.resultIcon}><MaterialCommunityIcons name="motorbike" size={20} color={dkd_theme.cyan} /></View><View style={{flex:1}}><Text style={styles.resultTitle}>{dkd_courier.dkd_display_name}</Text><Text style={styles.resultMeta}>{dkd_courier.dkd_dbg_id || dkd_courier.dkd_email || ''}</Text><Text style={styles.resultMeta}>{dkd_courier.dkd_business_name || 'Bağlı işletme yok'}</Text></View><Text style={styles.resultMoney}>{dkd_money(dkd_courier.dkd_month_earnings_tl)}</Text></Pressable>)}
        {dkd_courier_detail && <View style={styles.detailCard}><DkdSectionTitle title={dkd_courier_detail.dkd_display_name || 'Kurye Detayı'} subtitle={`${dkd_courier_detail.dkd_dbg_id || ''} • ${dkd_courier_detail?.dkd_business?.dkd_business_name || 'Bağlı işletme yok'}`} /><View style={styles.miniStats}><DkdStat icon="clock-outline" label="BUGÜN" value={dkd_money(dkd_earning_value(dkd_courier_detail.dkd_today))} /><DkdStat icon="calendar-week" label="HAFTA" value={dkd_money(dkd_earning_value(dkd_courier_detail.dkd_week))} /><DkdStat icon="calendar-month" label="AY" value={dkd_money(dkd_earning_value(dkd_courier_detail.dkd_month))} /></View><Text style={styles.smallHead}>GÜN GÜN KAZANÇ • SON 31 GÜN</Text><DkdChartRows rows={dkd_courier_detail.dkd_daily_earnings} keyName="dkd_day" valueName="dkd_earnings_tl" /><Text style={styles.smallHead}>SAATLİK KAZANÇ • BUGÜN</Text><DkdChartRows rows={dkd_courier_detail.dkd_hourly_earnings} keyName="dkd_hour" valueName="dkd_earnings_tl" suffix=":00" /></View>}
      </>}

      {dkd_mode === 'earnings' && <>
        <DkdSectionTitle title="Platform Hizmet Bedeli" subtitle="Her tamamlanan paket, işletmenin aktif sabit veya yüzdelik anlaşmasına göre tek kez kayda alınır." />
        <View style={styles.detailCard}><Text style={styles.smallHead}>ÖDEME IBAN'I</Text><TextInput autoCapitalize="characters" value={dkd_iban} onChangeText={dkd_set_iban} placeholder="TR..." placeholderTextColor="#536780" style={styles.input} /><Pressable style={styles.primaryButton} onPress={dkd_save_iban}><Text style={styles.primaryText}>IBAN'I KAYDET</Text></Pressable></View>
        <DkdSectionTitle title={`Bekleyen Ödemeler (${dkd_pending.length})`} subtitle="İşletmelerin dekont yükleyerek bildirdiği ödemeler." />
        {dkd_pending.map((dkd_payment) => <View key={dkd_payment.dkd_payment_id} style={styles.paymentCard}><View style={{flex:1}}><Text style={styles.resultTitle}>{dkd_payment.dkd_business_name}</Text><Text style={styles.paymentAmount}>{dkd_money(dkd_payment.dkd_amount_tl)}</Text><Text style={styles.resultMeta}>{new Date(dkd_payment.dkd_submitted_at).toLocaleString('tr-TR')}</Text></View><View style={styles.paymentActions}><Pressable onPress={() => dkd_show_receipt(dkd_payment.dkd_receipt_path)} style={styles.smallButton}><Text style={styles.smallButtonText}>Dekont</Text></Pressable><Pressable onPress={() => dkd_review_payment(dkd_payment.dkd_payment_id,'approved')} style={[styles.smallButton,styles.approve]}><Text style={styles.approveText}>Onayla</Text></Pressable><Pressable onPress={() => dkd_review_payment(dkd_payment.dkd_payment_id,'rejected')} style={[styles.smallButton,styles.reject]}><Text style={styles.rejectText}>Reddet</Text></Pressable></View></View>)}
        {!!dkd_receipt_url && <View style={styles.receiptBox}><Text style={styles.smallHead}>DEKONT GÜVENLİ BAĞLANTISI</Text><Text selectable style={styles.receiptUrl}>{dkd_receipt_url}</Text><Pressable onPress={() => dkd_set_receipt_url('')}><Text style={styles.closeLink}>Kapat</Text></Pressable></View>}
      </>}
      {dkd_busy && <ActivityIndicator style={{marginTop:16}} color={dkd_theme.cyan} />}
      <View style={{height:42}} />
    </ScrollView>

    <Modal transparent visible={Boolean(dkd_dashboard?.dkd_popup)} animationType="fade" onRequestClose={dkd_ack_popup}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalIcon}><MaterialCommunityIcons name="cash-check" size={30} color={dkd_theme.cyan} /></View><Text style={styles.modalTitle}>{dkd_dashboard?.dkd_popup?.dkd_title}</Text><Text style={styles.modalText}>{dkd_dashboard?.dkd_popup?.dkd_body}</Text><Pressable style={styles.primaryButton} onPress={dkd_ack_popup}><Text style={styles.primaryText}>OKUDUM, ANLADIM</Text></Pressable></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:dkd_theme.background},content:{padding:14,paddingTop:18},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:dkd_theme.background},muted:{color:dkd_theme.textSoft,fontSize:14,fontWeight:'800'},header:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},kicker:{color:dkd_theme.cyan,fontSize:12,fontWeight:'900',letterSpacing:1.2},title:{color:dkd_theme.text,fontSize:30,fontWeight:'900',marginTop:3},subtitle:{color:dkd_theme.textSoft,fontSize:14,lineHeight:20,fontWeight:'700',marginTop:4,maxWidth:330},logoutIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,102,126,.08)',borderWidth:1,borderColor:'rgba(255,102,126,.18)'},errorBox:{padding:12,borderRadius:16,backgroundColor:'rgba(255,92,117,.08)',borderWidth:1,borderColor:'rgba(255,92,117,.18)',marginTop:12},errorText:{color:'#FFB5C0',fontSize:13.5,fontWeight:'800'},stats:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16},stat:{width:'31%',minWidth:104,flexGrow:1,padding:11,borderRadius:18,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},statLabel:{color:dkd_theme.muted,fontSize:10,fontWeight:'900',marginTop:6},statValue:{color:dkd_theme.text,fontSize:15,fontWeight:'900',marginTop:2},tabs:{flexDirection:'row',gap:7,marginTop:14},tab:{flex:1,minHeight:52,borderRadius:16,alignItems:'center',justifyContent:'center',gap:3,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},tabActive:{backgroundColor:dkd_theme.cyan,borderColor:dkd_theme.cyan},tabText:{color:dkd_theme.textSoft,fontSize:11.5,fontWeight:'900'},tabTextActive:{color:'#07121D'},sectionHead:{marginTop:20,marginBottom:9},sectionTitle:{color:dkd_theme.text,fontSize:20,fontWeight:'900'},sectionSub:{color:dkd_theme.textSoft,fontSize:13,lineHeight:18,fontWeight:'700',marginTop:3},search:{minHeight:50,borderRadius:16,paddingHorizontal:14,color:dkd_theme.text,fontSize:15,fontWeight:'800',backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},resultCard:{marginTop:8,padding:11,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},resultIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(98,231,255,.08)'},resultTitle:{color:dkd_theme.text,fontSize:14.5,fontWeight:'900'},resultMeta:{color:dkd_theme.textSoft,fontSize:12.5,fontWeight:'700',marginTop:2},resultMoney:{color:'#A8F1D0',fontSize:12.5,fontWeight:'900',textAlign:'right'},detailCard:{marginTop:12,padding:13,borderRadius:22,backgroundColor:'rgba(13,27,45,.98)',borderWidth:1,borderColor:'rgba(98,231,255,.16)'},miniStats:{flexDirection:'row',flexWrap:'wrap',gap:7},smallHead:{color:dkd_theme.muted,fontSize:11,fontWeight:'900',letterSpacing:.6,marginTop:15,marginBottom:7},toggleRow:{flexDirection:'row',gap:7},toggle:{flex:1,minHeight:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:dkd_theme.border},toggleActive:{backgroundColor:dkd_theme.cyan},toggleText:{color:dkd_theme.textSoft,fontWeight:'900'},toggleTextActive:{color:'#07121D'},input:{minHeight:48,borderRadius:15,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:dkd_theme.border,paddingHorizontal:12,color:dkd_theme.text,fontSize:14,fontWeight:'800',marginTop:8},primaryButton:{minHeight:48,borderRadius:15,backgroundColor:dkd_theme.cyan,alignItems:'center',justifyContent:'center',marginTop:9},primaryText:{color:'#07121D',fontSize:13.5,fontWeight:'900'},courierLine:{paddingVertical:9,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.06)',flexDirection:'row',gap:8,alignItems:'center'},chartList:{gap:6},chartRow:{flexDirection:'row',alignItems:'center',gap:6},chartLabel:{width:76,color:dkd_theme.textSoft,fontSize:10.5,fontWeight:'800'},chartTrack:{flex:1,height:9,borderRadius:9,overflow:'hidden',backgroundColor:'rgba(255,255,255,.06)'},chartFill:{height:'100%',borderRadius:9,backgroundColor:dkd_theme.cyan},chartMoney:{width:84,color:dkd_theme.text,fontSize:10.5,fontWeight:'900',textAlign:'right'},paymentCard:{marginTop:8,padding:12,borderRadius:18,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border,flexDirection:'row',gap:9},paymentAmount:{color:'#A8F1D0',fontSize:18,fontWeight:'900',marginTop:3},paymentActions:{gap:5,justifyContent:'center'},smallButton:{minWidth:70,minHeight:34,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(98,231,255,.08)',borderWidth:1,borderColor:'rgba(98,231,255,.16)'},smallButtonText:{color:dkd_theme.cyan,fontSize:11,fontWeight:'900'},approve:{backgroundColor:'rgba(91,224,163,.1)',borderColor:'rgba(91,224,163,.2)'},approveText:{color:'#A8F1D0',fontSize:11,fontWeight:'900'},reject:{backgroundColor:'rgba(255,92,117,.08)',borderColor:'rgba(255,92,117,.2)'},rejectText:{color:'#FFB5C0',fontSize:11,fontWeight:'900'},receiptBox:{marginTop:10,padding:12,borderRadius:16,backgroundColor:dkd_theme.surface,borderWidth:1,borderColor:dkd_theme.border},receiptUrl:{color:dkd_theme.cyan,fontSize:11,lineHeight:17},closeLink:{color:'#FFB5C0',fontWeight:'900',marginTop:8},modalBackdrop:{flex:1,backgroundColor:'rgba(1,7,14,.78)',alignItems:'center',justifyContent:'center',padding:22},modalCard:{width:'100%',maxWidth:390,padding:20,borderRadius:26,backgroundColor:'#0B1726',borderWidth:1,borderColor:'rgba(98,231,255,.22)'},modalIcon:{width:58,height:58,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(98,231,255,.09)',alignSelf:'center'},modalTitle:{color:dkd_theme.text,fontSize:22,fontWeight:'900',textAlign:'center',marginTop:12},modalText:{color:dkd_theme.textSoft,fontSize:14,lineHeight:21,fontWeight:'700',textAlign:'center',marginTop:8}
});
