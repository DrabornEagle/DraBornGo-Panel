import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
const dkd_palette = {
  bg:'#050816', panel:'#0C1226', panel2:'#101936', text:'#F7FAFF', soft:'#94A3C3', muted:'#657390',
  cyan:'#5EEBFF', blue:'#6F87FF', purple:'#A66BFF', pink:'#FF76B7', mint:'#63EDC2', gold:'#FFD37A', red:'#FF7188'
};

function DkdGlowOrb({ style, colors }) {
  const dkd_spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dkd_loop = Animated.loop(Animated.timing(dkd_spin,{toValue:1,duration:9000,easing:Easing.linear,useNativeDriver:true}));
    dkd_loop.start(); return () => dkd_loop.stop();
  },[dkd_spin]);
  return <Animated.View pointerEvents="none" style={[styles.glowOrb,style,{transform:[{rotate:dkd_spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}]}><LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject}/></Animated.View>;
}

function DkdStatCard({ icon, label, value, colors, delay = 0 }) {
  const dkd_anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(dkd_anim,{toValue:1,duration:520,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(); },[dkd_anim,delay]);
  return <Animated.View style={[styles.statCard,{opacity:dkd_anim,transform:[{translateY:dkd_anim.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}]}>
    <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.statGradient}>
      <View style={styles.statIcon}><MaterialCommunityIcons name={icon} size={21} color="#08101E"/></View>
      <Text style={styles.statLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text>
    </LinearGradient>
  </Animated.View>;
}

function DkdSectionHead({ eyebrow, title, subtitle }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}</View>;
}

function DkdAnimatedBar({ value, max, color }) {
  const dkd_anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(dkd_anim,{toValue:1,duration:650,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start(); },[dkd_anim,value]);
  const dkd_target = Math.max(3,Math.min(100,(Number(value || 0)/Math.max(1,max))*100));
  return <View style={styles.chartTrack}><Animated.View style={[styles.chartFill,{backgroundColor:color,width:dkd_anim.interpolate({inputRange:[0,1],outputRange:['0%',`${dkd_target}%`]})}]}/></View>;
}

function DkdChartRows({ rows, keyName, valueName, suffix = '', color = dkd_palette.cyan }) {
  const dkd_values = Array.isArray(rows) ? rows : [];
  const dkd_max = Math.max(1,...dkd_values.map((dkd_row)=>Number(dkd_row?.[valueName] || 0)));
  if (!dkd_values.length) return <Text style={styles.emptyText}>Henüz grafik verisi yok.</Text>;
  return <View style={styles.chartList}>{dkd_values.map((dkd_row,dkd_index)=>{
    const dkd_value = Number(dkd_row?.[valueName] || 0);
    const dkd_label = `${String(dkd_row?.[keyName] ?? dkd_index)}${suffix}`;
    return <View key={`${dkd_label}-${dkd_index}`} style={styles.chartRow}><Text style={styles.chartLabel}>{dkd_label}</Text><DkdAnimatedBar value={dkd_value} max={dkd_max} color={color}/><Text style={styles.chartMoney}>{dkd_money(dkd_value)}</Text></View>;
  })}</View>;
}

function DkdModeButton({ active, icon, label, onPress, colors }) {
  return <Pressable onPress={onPress} style={styles.modePress}><LinearGradient colors={active ? colors : ['#0D1530','#0B1227']} style={[styles.modeButton,active&&styles.modeButtonActive]}><MaterialCommunityIcons name={icon} size={21} color={active ? '#07111F' : '#8291B0'}/><Text style={[styles.modeText,active&&styles.modeTextActive]}>{label}</Text></LinearGradient></Pressable>;
}

export default function AdminCenterScreen() {
  const [dkd_dashboard,dkd_set_dashboard] = useState(null);
  const [dkd_loading,dkd_set_loading] = useState(true);
  const [dkd_error,dkd_set_error] = useState('');
  const [dkd_mode,dkd_set_mode] = useState('businesses');
  const [dkd_business_query,dkd_set_business_query] = useState('');
  const [dkd_businesses,dkd_set_businesses] = useState([]);
  const [dkd_business_detail,dkd_set_business_detail] = useState(null);
  const [dkd_courier_query,dkd_set_courier_query] = useState('');
  const [dkd_couriers,dkd_set_couriers] = useState([]);
  const [dkd_courier_detail,dkd_set_courier_detail] = useState(null);
  const [dkd_fee_mode,dkd_set_fee_mode] = useState('fixed');
  const [dkd_fee_value,dkd_set_fee_value] = useState('0');
  const [dkd_iban,dkd_set_iban] = useState('');
  const [dkd_busy,dkd_set_busy] = useState(false);
  const [dkd_receipt_url,dkd_set_receipt_url] = useState('');
  const dkd_hero_anim = useRef(new Animated.Value(0)).current;
  const dkd_pulse_anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dkd_hero_anim,{toValue:1,duration:650,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    const dkd_loop = Animated.loop(Animated.sequence([
      Animated.timing(dkd_pulse_anim,{toValue:1,duration:1600,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(dkd_pulse_anim,{toValue:0,duration:1600,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
    ]));
    dkd_loop.start(); return () => dkd_loop.stop();
  },[dkd_hero_anim,dkd_pulse_anim]);

  const dkd_load_dashboard = useCallback(async()=>{
    dkd_set_error('');
    try { const dkd_value = await dkd_admin_fetch_dashboard(); dkd_set_dashboard(dkd_value || {}); dkd_set_iban(dkd_value?.dkd_iban || ''); }
    catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  },[]);
  const dkd_search_business = useCallback(async(dkd_query_value=dkd_business_query)=>{
    try { const dkd_value=await dkd_admin_search_businesses(dkd_query_value); dkd_set_businesses(dkd_value?.dkd_businesses || []); }
    catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
  },[dkd_business_query]);
  const dkd_search_courier = useCallback(async(dkd_query_value=dkd_courier_query)=>{
    try { const dkd_value=await dkd_admin_search_couriers(dkd_query_value); dkd_set_couriers(dkd_value?.dkd_couriers || []); }
    catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
  },[dkd_courier_query]);

  useEffect(()=>{ dkd_load_dashboard(); dkd_search_business(''); dkd_search_courier(''); },[]);
  useEffect(()=>{ const dkd_timer=setTimeout(()=>dkd_search_business(),260); return()=>clearTimeout(dkd_timer); },[dkd_business_query]);
  useEffect(()=>{ const dkd_timer=setTimeout(()=>dkd_search_courier(),260); return()=>clearTimeout(dkd_timer); },[dkd_courier_query]);

  const dkd_open_business = async(dkd_business_id_value)=>{
    dkd_set_busy(true); dkd_set_error('');
    try { const dkd_value=await dkd_admin_fetch_business_detail(dkd_business_id_value); dkd_set_business_detail(dkd_value); dkd_set_fee_mode(dkd_value?.dkd_agreement?.dkd_fee_mode || 'fixed'); dkd_set_fee_value(String(dkd_value?.dkd_agreement?.dkd_fee_value ?? 0)); }
    catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_open_courier = async(dkd_courier_user_id_value)=>{
    dkd_set_busy(true); dkd_set_error('');
    try { dkd_set_courier_detail(await dkd_admin_fetch_courier_detail(dkd_courier_user_id_value)); }
    catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_busy(false); }
  };
  const dkd_save_fee = async()=>{
    const dkd_business_id_value=dkd_business_detail?.dkd_business?.dkd_id;
    if(!dkd_business_id_value){ Alert.alert('İşletme seçilmedi','Önce anlaşma tanımlanacak işletmeyi aç.'); return; }
    const dkd_numeric_value=Number(String(dkd_fee_value).replace(',','.'));
    if(!Number.isFinite(dkd_numeric_value) || dkd_numeric_value<0){ Alert.alert('Geçersiz bedel','Platform Hizmet Bedeli için geçerli bir değer gir.'); return; }
    dkd_set_busy(true); dkd_set_error('');
    try {
      await dkd_admin_set_platform_agreement(dkd_business_id_value,dkd_fee_mode,dkd_numeric_value);
      const dkd_next_detail_value=await dkd_admin_fetch_business_detail(dkd_business_id_value);
      dkd_set_business_detail(dkd_next_detail_value);
      dkd_set_fee_mode(dkd_next_detail_value?.dkd_agreement?.dkd_fee_mode || dkd_fee_mode);
      dkd_set_fee_value(String(dkd_next_detail_value?.dkd_agreement?.dkd_fee_value ?? dkd_numeric_value));
      await dkd_load_dashboard();
      Alert.alert('Anlaşma Kaydedildi',dkd_fee_mode==='percentage' ? 'Platform Hizmet Bedeli %'+dkd_numeric_value+' olarak aktif edildi.' : 'Platform Hizmet Bedeli '+dkd_numeric_value.toLocaleString('tr-TR')+' TL olarak aktif edildi.');
    } catch(dkd_error_value){
      const dkd_message_value=String(dkd_error_value.message || dkd_error_value);
      dkd_set_error(dkd_message_value); Alert.alert('Kaydedilemedi',dkd_message_value);
    } finally { dkd_set_busy(false); }
  };
  const dkd_save_iban = async()=>{ dkd_set_busy(true); try { await dkd_admin_set_iban(dkd_iban,'Doğancan Kartal'); await dkd_load_dashboard(); } catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } finally { dkd_set_busy(false); } };
  const dkd_review_payment = async(dkd_payment_id_value,dkd_status_value)=>{ dkd_set_busy(true); try { await dkd_admin_review_payment(dkd_payment_id_value,dkd_status_value,''); await dkd_load_dashboard(); } catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } finally { dkd_set_busy(false); } };
  const dkd_show_receipt = async(dkd_path_value)=>{ try { const dkd_value=await dkd_admin_create_payment_receipt_signed_url(dkd_path_value); dkd_set_receipt_url(dkd_value || ''); } catch(dkd_error_value){ dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } };
  const dkd_ack_popup = async()=>{ const dkd_key_value=dkd_dashboard?.dkd_popup?.dkd_notice_key; if(dkd_key_value)await dkd_panel_ack_platform_notice(dkd_key_value).catch(()=>null); dkd_set_dashboard((dkd_prev)=>({...(dkd_prev || {}),dkd_popup:null})); };

  if(dkd_loading)return <View style={styles.loading}><ActivityIndicator size="large" color={dkd_palette.cyan}/><Text style={styles.loadingText}>Yönetim Merkezi hazırlanıyor…</Text></View>;
  const dkd_pending = dkd_dashboard?.dkd_pending_payments || [];

  return <View style={styles.root}>
    <DkdGlowOrb style={styles.orbOne} colors={['rgba(94,235,255,.35)','rgba(111,135,255,.03)']}/><DkdGlowOrb style={styles.orbTwo} colors={['rgba(166,107,255,.28)','rgba(255,118,183,.02)']}/>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={{opacity:dkd_hero_anim,transform:[{translateY:dkd_hero_anim.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}>
        <LinearGradient colors={['#172C65','#402067','#701F66']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.adminBadge}><View style={styles.liveDot}/><Text style={styles.adminBadgeText}>ADMIN CONTROL</Text></View><Pressable style={styles.logoutButton} onPress={dkd_panel_sign_out}><MaterialCommunityIcons name="logout-variant" size={21} color="#FFF"/></Pressable></View>
          <Text style={styles.heroTitle}>Yönetim Merkezi</Text><Text style={styles.heroSub}>İşletme ağı, kurye performansı ve Platform Hizmet Bedeli gelirini canlı yönet.</Text>
          <View style={styles.heroMeta}><View style={styles.heroMetaPill}><MaterialCommunityIcons name="shield-check" size={15} color={dkd_palette.mint}/><Text style={styles.heroMetaText}>Yönetici oturumu aktif</Text></View><Animated.View style={[styles.heroPulse,{opacity:dkd_pulse_anim.interpolate({inputRange:[0,1],outputRange:[.35,1]}),transform:[{scale:dkd_pulse_anim.interpolate({inputRange:[0,1],outputRange:[.94,1.08]})}]}]}><MaterialCommunityIcons name="chart-timeline-variant-shimmer" size={24} color="#FFF"/></Animated.View></View>
        </LinearGradient>
      </Animated.View>

      {!!dkd_error && <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle" size={19} color={dkd_palette.red}/><Text style={styles.errorText}>{dkd_error}</Text></View>}

      <DkdSectionHead eyebrow="CANLI ÖZET" title="Operasyon Nabzı" subtitle="Ağın güncel hacmi ve Platform Hizmet Bedeli görünümü."/>
      <View style={styles.statsGrid}>
        <DkdStatCard icon="storefront" label="İŞLETME" value={String(dkd_dashboard?.dkd_business_count || 0)} colors={['#5EEBFF','#5F9DFF']} delay={30}/>
        <DkdStatCard icon="motorbike" label="KURYE" value={String(dkd_dashboard?.dkd_courier_count || 0)} colors={['#70F1C5','#4BCDA8']} delay={80}/>
        <DkdStatCard icon="calendar-today" label="BUGÜN" value={dkd_money(dkd_dashboard?.dkd_platform_today_tl)} colors={['#FFD37A','#FF9A63']} delay={130}/>
        <DkdStatCard icon="calendar-week" label="HAFTA" value={dkd_money(dkd_dashboard?.dkd_platform_week_tl)} colors={['#9E85FF','#705DFF']} delay={180}/>
        <DkdStatCard icon="calendar-month" label="AY" value={dkd_money(dkd_dashboard?.dkd_platform_month_tl)} colors={['#FF82C3','#E85D98']} delay={230}/>
        <DkdStatCard icon="cash-multiple" label="TOPLAM" value={dkd_money(dkd_dashboard?.dkd_platform_all_tl)} colors={['#73E7FF','#A17BFF']} delay={280}/>
      </View>

      <View style={styles.modeRow}>
        <DkdModeButton active={dkd_mode==='businesses'} icon="store-search" label="İşletmeler" onPress={()=>dkd_set_mode('businesses')} colors={['#5EEBFF','#6D9BFF']}/>
        <DkdModeButton active={dkd_mode==='couriers'} icon="account-search" label="Kuryeler" onPress={()=>dkd_set_mode('couriers')} colors={['#6FECC4','#5EE0A8']}/>
        <DkdModeButton active={dkd_mode==='earnings'} icon="finance" label="Kazanç" onPress={()=>dkd_set_mode('earnings')} colors={['#A77BFF','#FF75B6']}/>
      </View>

      {dkd_mode==='businesses' && <>
        <DkdSectionHead eyebrow="İŞLETME AĞI" title="İşletme Bul" subtitle="Ad, işletme sahibi, e-posta veya telefon ile hızlı arama."/>
        <View style={styles.searchWrap}><MaterialCommunityIcons name="magnify" size={22} color={dkd_palette.cyan}/><TextInput value={dkd_business_query} onChangeText={dkd_set_business_query} placeholder="İşletme veya işletme sahibi ara" placeholderTextColor="#596987" style={styles.searchInput}/></View>
        {(dkd_businesses || []).map((dkd_business)=><Pressable key={dkd_business.dkd_business_id} onPress={()=>dkd_open_business(dkd_business.dkd_business_id)} style={({pressed})=>[styles.resultPress,pressed&&{opacity:.82}]}><LinearGradient colors={['#0D1732','#111A34']} style={styles.resultCard}><View style={styles.resultIconWrap}><LinearGradient colors={['#5EEBFF','#6D8DFF']} style={styles.resultIcon}><MaterialCommunityIcons name="storefront" size={21} color="#07111F"/></LinearGradient></View><View style={styles.resultMain}><Text style={styles.resultTitle}>{dkd_business.dkd_business_name}</Text><Text style={styles.resultMeta}>{dkd_business.dkd_owner_full_name || 'İşletme sahibi'} • {dkd_business.dkd_courier_count || 0} kurye</Text><View style={styles.locationRow}><MaterialCommunityIcons name="map-marker" size={13} color={dkd_palette.soft}/><Text style={styles.resultMeta}>{dkd_business.dkd_city || ''} {dkd_business.dkd_district || ''}</Text></View></View><View style={styles.resultRight}><Text style={styles.resultMoney}>{dkd_money(dkd_business.dkd_platform_fee_total_tl)}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#60708E"/></View></LinearGradient></Pressable>)}

        {dkd_business_detail && <LinearGradient colors={['#101C3A','#16152F','#19132C']} style={styles.detailPanel}>
          <View style={styles.detailTitleRow}><View style={{flex:1}}><Text style={styles.detailEyebrow}>İŞLETME DETAYI</Text><Text style={styles.detailTitle}>{dkd_business_detail?.dkd_business?.dkd_business_name || 'İşletme'}</Text><Text style={styles.detailSub}>{dkd_business_detail?.dkd_business?.dkd_owner_full_name || ''} • {dkd_business_detail?.dkd_courier_count || 0} aktif kurye</Text></View><View style={styles.detailBadge}><MaterialCommunityIcons name="store-check" size={24} color={dkd_palette.mint}/></View></View>
          <View style={styles.miniGrid}>{[
            ['KURYE BUGÜN',dkd_business_detail.dkd_today_courier_earnings_tl,dkd_palette.cyan],['KURYE HAFTA',dkd_business_detail.dkd_week_courier_earnings_tl,dkd_palette.blue],['KURYE AY',dkd_business_detail.dkd_month_courier_earnings_tl,dkd_palette.purple],
            ['PLATFORM BUGÜN',dkd_business_detail.dkd_platform_today_tl,dkd_palette.mint],['PLATFORM HAFTA',dkd_business_detail.dkd_platform_week_tl,dkd_palette.gold],['PLATFORM AY',dkd_business_detail.dkd_platform_month_tl,dkd_palette.pink]
          ].map(([dkd_label,dkd_value,dkd_color])=><View key={dkd_label} style={styles.miniCard}><View style={[styles.miniDot,{backgroundColor:dkd_color}]}/><Text style={styles.miniLabel}>{dkd_label}</Text><Text style={styles.miniValue}>{dkd_money(dkd_value)}</Text></View>)}</View>

          <Text style={styles.blockLabel}>PLATFORM HİZMET BEDELİ ANLAŞMASI</Text><View style={styles.segmentRow}>{['fixed','percentage'].map((dkd_value)=><Pressable key={dkd_value} onPress={()=>dkd_set_fee_mode(dkd_value)} style={[styles.segment,dkd_fee_mode===dkd_value&&styles.segmentActive]}><Text style={[styles.segmentText,dkd_fee_mode===dkd_value&&styles.segmentTextActive]}>{dkd_value==='fixed'?'Sabit TL':'Yüzdelik %'}</Text></Pressable>)}</View>
          <View style={styles.feeInputRow}><TextInput keyboardType="decimal-pad" value={dkd_fee_value} onChangeText={dkd_set_fee_value} style={styles.feeInput} placeholder="Bedel" placeholderTextColor="#5D6B88"/><Pressable onPress={dkd_save_fee} disabled={dkd_busy} style={styles.saveFeeButton}><LinearGradient colors={['#5EEBFF','#6D8DFF']} style={styles.saveFeeGradient}>{dkd_busy?<ActivityIndicator color="#07111F"/>:<><MaterialCommunityIcons name="content-save-check" size={20} color="#07111F"/><Text style={styles.saveFeeText}>Kaydet</Text></>}</LinearGradient></Pressable></View>

          <Text style={styles.blockLabel}>AKTİF KURYELER</Text>{(dkd_business_detail.dkd_couriers || []).map((dkd_courier)=><View key={dkd_courier.dkd_courier_user_id} style={styles.courierRow}><View style={styles.avatar}><MaterialCommunityIcons name="motorbike" size={20} color={dkd_palette.cyan}/></View><View style={{flex:1}}><Text style={styles.courierName}>{dkd_courier.dkd_display_name}</Text><Text style={styles.courierMeta}>{dkd_courier.dkd_dbg_id || dkd_courier.dkd_email || ''}</Text></View><View><Text style={styles.courierMoney}>Gün {dkd_money(dkd_earning_value(dkd_courier.dkd_today))}</Text><Text style={styles.courierMeta}>Hf {dkd_money(dkd_earning_value(dkd_courier.dkd_week))} • Ay {dkd_money(dkd_earning_value(dkd_courier.dkd_month))}</Text></View></View>)}

          <Text style={styles.blockLabel}>GÜN GÜN KURYE KAZANCI • SON 31 GÜN</Text><DkdChartRows rows={dkd_business_detail.dkd_daily_earnings} keyName="dkd_day" valueName="dkd_courier_earnings_tl" color={dkd_palette.cyan}/>
          <Text style={styles.blockLabel}>SAATLİK KURYE KAZANCI • BUGÜN</Text><DkdChartRows rows={dkd_business_detail.dkd_hourly_earnings} keyName="dkd_hour" valueName="dkd_courier_earnings_tl" suffix=":00" color={dkd_palette.blue}/>
          <Text style={styles.blockLabel}>GÜN GÜN PLATFORM HİZMET BEDELİ</Text><DkdChartRows rows={dkd_business_detail.dkd_platform_daily} keyName="dkd_day" valueName="dkd_platform_fee_tl" color={dkd_palette.pink}/>
        </LinearGradient>}
      </>}

      {dkd_mode==='couriers' && <>
        <DkdSectionHead eyebrow="KURYE AĞI" title="Kurye Bul" subtitle="Kurye adı, DBG ID veya e-posta üzerinden ara."/>
        <View style={styles.searchWrap}><MaterialCommunityIcons name="account-search" size={21} color={dkd_palette.mint}/><TextInput value={dkd_courier_query} onChangeText={dkd_set_courier_query} placeholder="Kurye ara" placeholderTextColor="#596987" style={styles.searchInput}/></View>
        {(dkd_couriers || []).map((dkd_courier)=><Pressable key={dkd_courier.dkd_courier_user_id} onPress={()=>dkd_open_courier(dkd_courier.dkd_courier_user_id)} style={styles.resultPress}><LinearGradient colors={['#0C1830','#0E1E2E']} style={styles.resultCard}><View style={styles.resultIconWrap}><LinearGradient colors={['#6FECC4','#51C9B2']} style={styles.resultIcon}><MaterialCommunityIcons name="motorbike" size={21} color="#07111F"/></LinearGradient></View><View style={styles.resultMain}><Text style={styles.resultTitle}>{dkd_courier.dkd_display_name}</Text><Text style={styles.resultMeta}>{dkd_courier.dkd_dbg_id || dkd_courier.dkd_email || ''}</Text><Text style={styles.resultMeta}>{dkd_courier.dkd_business_name || 'Bağlı işletme yok'}</Text></View><Text style={styles.resultMoney}>{dkd_money(dkd_courier.dkd_month_earnings_tl)}</Text></LinearGradient></Pressable>)}
        {dkd_courier_detail && <LinearGradient colors={['#0D2030','#121B34','#17152D']} style={styles.detailPanel}><View style={styles.detailTitleRow}><View style={{flex:1}}><Text style={styles.detailEyebrow}>KURYE DETAYI</Text><Text style={styles.detailTitle}>{dkd_courier_detail.dkd_display_name || 'Kurye'}</Text><Text style={styles.detailSub}>{dkd_courier_detail.dkd_dbg_id || ''} • {dkd_courier_detail?.dkd_business?.dkd_business_name || 'Bağlı işletme yok'}</Text></View><View style={styles.detailBadge}><MaterialCommunityIcons name="bike-fast" size={24} color={dkd_palette.cyan}/></View></View><View style={styles.miniGrid}>{[['BUGÜN',dkd_earning_value(dkd_courier_detail.dkd_today),dkd_palette.cyan],['HAFTA',dkd_earning_value(dkd_courier_detail.dkd_week),dkd_palette.mint],['AY',dkd_earning_value(dkd_courier_detail.dkd_month),dkd_palette.purple]].map(([dkd_label,dkd_value,dkd_color])=><View key={dkd_label} style={styles.miniCard}><View style={[styles.miniDot,{backgroundColor:dkd_color}]}/><Text style={styles.miniLabel}>{dkd_label}</Text><Text style={styles.miniValue}>{dkd_money(dkd_value)}</Text></View>)}</View><Text style={styles.blockLabel}>GÜN GÜN KAZANÇ • SON 31 GÜN</Text><DkdChartRows rows={dkd_courier_detail.dkd_daily_earnings} keyName="dkd_day" valueName="dkd_earnings_tl" color={dkd_palette.mint}/><Text style={styles.blockLabel}>SAATLİK KAZANÇ • BUGÜN</Text><DkdChartRows rows={dkd_courier_detail.dkd_hourly_earnings} keyName="dkd_hour" valueName="dkd_earnings_tl" suffix=":00" color={dkd_palette.blue}/></LinearGradient>}
      </>}

      {dkd_mode==='earnings' && <>
        <DkdSectionHead eyebrow="GELİR MERKEZİ" title="Platform Hizmet Bedeli" subtitle="İşletme bazlı anlaşmalar ve ödeme bildirimleri tek yerde."/>
        <LinearGradient colors={['#24153F','#171936','#10203B']} style={styles.ibanCard}><View style={styles.ibanIcon}><MaterialCommunityIcons name="bank" size={25} color={dkd_palette.gold}/></View><View style={{flex:1}}><Text style={styles.ibanLabel}>TAHSİLAT IBAN'I</Text><Text style={styles.ibanSub}>İşletmelerin ödeme ekranında görünen hesap.</Text></View></LinearGradient>
        <View style={styles.ibanInputCard}><TextInput autoCapitalize="characters" value={dkd_iban} onChangeText={dkd_set_iban} placeholder="TR..." placeholderTextColor="#596987" style={styles.ibanInput}/><Pressable onPress={dkd_save_iban} style={styles.ibanSave}><MaterialCommunityIcons name="content-save" size={20} color="#07111F"/><Text style={styles.ibanSaveText}>Kaydet</Text></Pressable></View>
        <DkdSectionHead eyebrow="ÖDEME KUYRUĞU" title={`Bekleyen Ödemeler (${dkd_pending.length})`} subtitle="Dekont yüklenen bildirimleri incele ve sonuçlandır."/>
        {dkd_pending.length ? dkd_pending.map((dkd_payment)=><LinearGradient key={dkd_payment.dkd_payment_id} colors={['#101831','#16152F']} style={styles.paymentCard}><View style={styles.paymentTop}><View style={styles.paymentIcon}><MaterialCommunityIcons name="receipt-text-check" size={21} color={dkd_palette.gold}/></View><View style={{flex:1}}><Text style={styles.paymentBusiness}>{dkd_payment.dkd_business_name}</Text><Text style={styles.paymentDate}>{new Date(dkd_payment.dkd_submitted_at).toLocaleString('tr-TR')}</Text></View><Text style={styles.paymentAmount}>{dkd_money(dkd_payment.dkd_amount_tl)}</Text></View><View style={styles.paymentActions}><Pressable onPress={()=>dkd_show_receipt(dkd_payment.dkd_receipt_path)} style={styles.paymentButton}><MaterialCommunityIcons name="file-eye" size={17} color={dkd_palette.cyan}/><Text style={styles.paymentButtonText}>Dekont</Text></Pressable><Pressable onPress={()=>dkd_review_payment(dkd_payment.dkd_payment_id,'approved')} style={[styles.paymentButton,styles.approveButton]}><MaterialCommunityIcons name="check" size={17} color={dkd_palette.mint}/><Text style={[styles.paymentButtonText,{color:dkd_palette.mint}]}>Onayla</Text></Pressable><Pressable onPress={()=>dkd_review_payment(dkd_payment.dkd_payment_id,'rejected')} style={[styles.paymentButton,styles.rejectButton]}><MaterialCommunityIcons name="close" size={17} color={dkd_palette.red}/><Text style={[styles.paymentButtonText,{color:dkd_palette.red}]}>Reddet</Text></Pressable></View></LinearGradient>) : <View style={styles.emptyCard}><MaterialCommunityIcons name="check-decagram" size={30} color={dkd_palette.mint}/><Text style={styles.emptyTitle}>Bekleyen ödeme yok</Text><Text style={styles.emptyText}>Yeni dekont geldiğinde burada görünecek.</Text></View>}
        {!!dkd_receipt_url && <View style={styles.receiptSheet}><Text style={styles.receiptTitle}>Güvenli Dekont Bağlantısı</Text><Text numberOfLines={2} style={styles.receiptUrl}>{dkd_receipt_url}</Text><View style={styles.receiptActions}><Pressable onPress={()=>Linking.openURL(dkd_receipt_url)} style={styles.receiptOpen}><Text style={styles.receiptOpenText}>AÇ</Text></Pressable><Pressable onPress={()=>dkd_set_receipt_url('')} style={styles.receiptClose}><Text style={styles.receiptCloseText}>KAPAT</Text></Pressable></View></View>}
      </>}

      {dkd_busy && <ActivityIndicator style={{marginTop:18}} color={dkd_palette.cyan}/>}<View style={{height:48}}/>
    </ScrollView>
    <Modal transparent visible={Boolean(dkd_dashboard?.dkd_popup)} animationType="fade" onRequestClose={dkd_ack_popup}><View style={styles.modalBackdrop}><LinearGradient colors={['#17274F','#25163C','#3A173D']} style={styles.modalCard}><View style={styles.modalIcon}><MaterialCommunityIcons name="cash-check" size={31} color={dkd_palette.gold}/></View><Text style={styles.modalTitle}>{dkd_dashboard?.dkd_popup?.dkd_title}</Text><Text style={styles.modalText}>{dkd_dashboard?.dkd_popup?.dkd_body}</Text><Pressable onPress={dkd_ack_popup} style={styles.modalButton}><LinearGradient colors={['#5EEBFF','#6D8DFF']} style={styles.modalButtonGradient}><Text style={styles.modalButtonText}>OKUDUM, ANLADIM</Text></LinearGradient></Pressable></LinearGradient></View></Modal>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:dkd_palette.bg},content:{padding:16,paddingTop:18},loading:{flex:1,backgroundColor:dkd_palette.bg,alignItems:'center',justifyContent:'center',gap:12},loadingText:{color:dkd_palette.soft,fontWeight:'800'},glowOrb:{position:'absolute',borderRadius:999,overflow:'hidden',opacity:.6},orbOne:{width:240,height:240,top:-110,right:-105},orbTwo:{width:260,height:260,bottom:120,left:-150},hero:{borderRadius:30,padding:18,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},adminBadge:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:'rgba(4,10,25,.25)'},liveDot:{width:8,height:8,borderRadius:8,backgroundColor:dkd_palette.mint},adminBadgeText:{color:'#E8F9FF',fontSize:10,fontWeight:'900',letterSpacing:1},logoutButton:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.09)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},heroTitle:{color:'#FFF',fontSize:34,fontWeight:'900',marginTop:20,letterSpacing:-.8},heroSub:{color:'rgba(237,244,255,.78)',fontSize:14,lineHeight:20,fontWeight:'700',marginTop:7,maxWidth:350},heroMeta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:18},heroMetaPill:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:8,borderRadius:999,backgroundColor:'rgba(6,12,28,.28)'},heroMetaText:{color:'#DDF7ED',fontSize:11.5,fontWeight:'800'},heroPulse:{width:46,height:46,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.12)'},errorBox:{flexDirection:'row',gap:9,alignItems:'center',padding:12,borderRadius:17,marginTop:12,backgroundColor:'rgba(255,113,136,.08)',borderWidth:1,borderColor:'rgba(255,113,136,.18)'},errorText:{flex:1,color:'#FFC1CB',fontSize:13,fontWeight:'800'},sectionHead:{marginTop:23,marginBottom:11},sectionEyebrow:{color:dkd_palette.cyan,fontSize:10.5,fontWeight:'900',letterSpacing:1.4},sectionTitle:{color:dkd_palette.text,fontSize:23,fontWeight:'900',marginTop:4,letterSpacing:-.35},sectionSub:{color:dkd_palette.soft,fontSize:13,lineHeight:18,fontWeight:'700',marginTop:4},statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},statCard:{width:'31%',minWidth:103,flexGrow:1},statGradient:{minHeight:118,borderRadius:22,padding:12,justifyContent:'flex-end',overflow:'hidden'},statIcon:{position:'absolute',top:11,right:11,width:38,height:38,borderRadius:13,backgroundColor:'rgba(255,255,255,.45)',alignItems:'center',justifyContent:'center'},statLabel:{color:'rgba(5,12,25,.68)',fontSize:10,fontWeight:'900',letterSpacing:.6},statValue:{color:'#07111F',fontSize:17,fontWeight:'900',marginTop:3},modeRow:{flexDirection:'row',gap:8,marginTop:16},modePress:{flex:1},modeButton:{minHeight:72,borderRadius:21,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:'rgba(135,159,205,.12)'},modeButtonActive:{borderColor:'rgba(255,255,255,.2)'},modeText:{color:'#8391AD',fontSize:11.5,fontWeight:'900'},modeTextActive:{color:'#07111F'},searchWrap:{minHeight:56,borderRadius:19,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:14,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.16)'},searchInput:{flex:1,color:dkd_palette.text,fontSize:14.5,fontWeight:'800'},resultPress:{marginTop:9},resultCard:{minHeight:82,borderRadius:21,padding:12,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'rgba(112,144,207,.13)'},resultIconWrap:{width:50,height:50,borderRadius:17,overflow:'hidden'},resultIcon:{flex:1,alignItems:'center',justifyContent:'center'},resultMain:{flex:1},resultTitle:{color:dkd_palette.text,fontSize:15,fontWeight:'900'},resultMeta:{color:dkd_palette.soft,fontSize:12,fontWeight:'700',marginTop:3},locationRow:{flexDirection:'row',alignItems:'center',gap:2},resultRight:{alignItems:'flex-end',gap:5},resultMoney:{color:'#9FF0D2',fontSize:12.5,fontWeight:'900'},detailPanel:{marginTop:14,borderRadius:28,padding:15,borderWidth:1,borderColor:'rgba(105,188,255,.15)'},detailTitleRow:{flexDirection:'row',gap:10,alignItems:'center'},detailEyebrow:{color:dkd_palette.cyan,fontSize:10,fontWeight:'900',letterSpacing:1.1},detailTitle:{color:dkd_palette.text,fontSize:24,fontWeight:'900',marginTop:4},detailSub:{color:dkd_palette.soft,fontSize:12.5,fontWeight:'700',marginTop:4},detailBadge:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(99,237,194,.09)'},miniGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:14},miniCard:{width:'31%',flexGrow:1,minHeight:88,borderRadius:18,padding:10,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.05)'},miniDot:{width:8,height:8,borderRadius:8},miniLabel:{color:dkd_palette.muted,fontSize:9.5,fontWeight:'900',marginTop:10},miniValue:{color:dkd_palette.text,fontSize:13.5,fontWeight:'900',marginTop:3},blockLabel:{color:'#7989AA',fontSize:10.5,fontWeight:'900',letterSpacing:.65,marginTop:18,marginBottom:8},segmentRow:{flexDirection:'row',gap:8},segment:{flex:1,minHeight:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},segmentActive:{backgroundColor:dkd_palette.cyan},segmentText:{color:dkd_palette.soft,fontWeight:'900'},segmentTextActive:{color:'#07111F'},feeInputRow:{flexDirection:'row',gap:8,marginTop:9},feeInput:{flex:1,minHeight:50,borderRadius:15,paddingHorizontal:13,color:dkd_palette.text,fontSize:15,fontWeight:'800',backgroundColor:'rgba(255,255,255,.04)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},saveFeeButton:{width:112,borderRadius:15,overflow:'hidden'},saveFeeGradient:{flex:1,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center'},saveFeeText:{color:'#07111F',fontWeight:'900'},courierRow:{minHeight:64,flexDirection:'row',alignItems:'center',gap:9,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,.055)'},avatar:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(94,235,255,.08)'},courierName:{color:dkd_palette.text,fontSize:13.5,fontWeight:'900'},courierMeta:{color:dkd_palette.soft,fontSize:10.5,fontWeight:'700',marginTop:2},courierMoney:{color:'#9FF0D2',fontSize:11.5,fontWeight:'900',textAlign:'right'},chartList:{gap:7},chartRow:{flexDirection:'row',alignItems:'center',gap:7},chartLabel:{width:75,color:dkd_palette.soft,fontSize:10,fontWeight:'800'},chartTrack:{flex:1,height:9,borderRadius:999,overflow:'hidden',backgroundColor:'rgba(255,255,255,.055)'},chartFill:{height:'100%',borderRadius:999},chartMoney:{width:82,color:dkd_palette.text,fontSize:10,fontWeight:'900',textAlign:'right'},ibanCard:{minHeight:90,borderRadius:23,padding:14,flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:'rgba(255,211,122,.13)'},ibanIcon:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,211,122,.09)'},ibanLabel:{color:dkd_palette.gold,fontSize:10.5,fontWeight:'900',letterSpacing:.9},ibanSub:{color:dkd_palette.soft,fontSize:12.5,fontWeight:'700',marginTop:4},ibanInputCard:{flexDirection:'row',gap:8,marginTop:9},ibanInput:{flex:1,minHeight:54,borderRadius:16,paddingHorizontal:13,color:dkd_palette.text,fontSize:14,fontWeight:'800',backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.15)'},ibanSave:{width:105,borderRadius:16,backgroundColor:dkd_palette.gold,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},ibanSaveText:{color:'#07111F',fontWeight:'900'},paymentCard:{borderRadius:22,padding:13,marginTop:9,borderWidth:1,borderColor:'rgba(255,255,255,.07)'},paymentTop:{flexDirection:'row',alignItems:'center',gap:9},paymentIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,211,122,.08)'},paymentBusiness:{color:dkd_palette.text,fontSize:14,fontWeight:'900'},paymentDate:{color:dkd_palette.soft,fontSize:10.5,fontWeight:'700',marginTop:3},paymentAmount:{color:dkd_palette.gold,fontSize:17,fontWeight:'900'},paymentActions:{flexDirection:'row',gap:7,marginTop:11},paymentButton:{flex:1,minHeight:40,borderRadius:13,flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(94,235,255,.06)',borderWidth:1,borderColor:'rgba(94,235,255,.12)'},paymentButtonText:{color:dkd_palette.cyan,fontSize:11,fontWeight:'900'},approveButton:{backgroundColor:'rgba(99,237,194,.05)',borderColor:'rgba(99,237,194,.12)'},rejectButton:{backgroundColor:'rgba(255,113,136,.05)',borderColor:'rgba(255,113,136,.12)'},emptyCard:{alignItems:'center',padding:24,borderRadius:22,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.12)'},emptyTitle:{color:dkd_palette.text,fontSize:15,fontWeight:'900',marginTop:9},emptyText:{color:dkd_palette.soft,fontSize:12,fontWeight:'700',marginTop:4},receiptSheet:{marginTop:10,padding:13,borderRadius:18,backgroundColor:'#0D1830',borderWidth:1,borderColor:'rgba(94,235,255,.15)'},receiptTitle:{color:dkd_palette.text,fontSize:14,fontWeight:'900'},receiptUrl:{color:dkd_palette.cyan,fontSize:10.5,lineHeight:15,marginTop:5},receiptActions:{flexDirection:'row',gap:8,marginTop:9},receiptOpen:{flex:1,minHeight:39,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:dkd_palette.cyan},receiptOpenText:{color:'#07111F',fontWeight:'900'},receiptClose:{flex:1,minHeight:39,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.05)'},receiptCloseText:{color:dkd_palette.soft,fontWeight:'900'},emptyText:{color:dkd_palette.soft,fontSize:12,fontWeight:'700',marginTop:5},modalBackdrop:{flex:1,backgroundColor:'rgba(1,4,12,.82)',alignItems:'center',justifyContent:'center',padding:22},modalCard:{width:'100%',maxWidth:390,borderRadius:29,padding:21,borderWidth:1,borderColor:'rgba(255,255,255,.12)'},modalIcon:{width:62,height:62,borderRadius:20,alignSelf:'center',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,211,122,.09)'},modalTitle:{color:'#FFF',fontSize:23,fontWeight:'900',textAlign:'center',marginTop:13},modalText:{color:'#AAB8D2',fontSize:14,lineHeight:20,fontWeight:'700',textAlign:'center',marginTop:8},modalButton:{marginTop:15,borderRadius:16,overflow:'hidden'},modalButtonGradient:{minHeight:50,alignItems:'center',justifyContent:'center'},modalButtonText:{color:'#07111F',fontWeight:'900'}
});
