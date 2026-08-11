import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
  dkd_panel_fetch_platform_fee_profile,
  dkd_panel_set_platform_schedule,
  dkd_panel_ack_platform_notice,
  dkd_panel_upload_platform_receipt,
  dkd_panel_submit_platform_payment,
} from '../services/adminService';

const dkd_weekdays=[{v:1,l:'Pzt'},{v:2,l:'Sal'},{v:3,l:'Çar'},{v:4,l:'Per'},{v:5,l:'Cum'},{v:6,l:'Cmt'},{v:7,l:'Paz'}];
const dkd_money=(dkd_value)=>`${Number(dkd_value || 0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} TL`;
const dkd_palette={bg:'#050816',panel:'#0C1226',text:'#F8FAFF',soft:'#97A5C4',muted:'#687796',cyan:'#5EEBFF',blue:'#6F87FF',purple:'#A66BFF',pink:'#FF76B7',mint:'#63EDC2',gold:'#FFD37A',red:'#FF7188'};

function DkdGlow({ style, colors }){
  const dkd_spin=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const dkd_loop=Animated.loop(Animated.timing(dkd_spin,{toValue:1,duration:10000,easing:Easing.linear,useNativeDriver:true}));dkd_loop.start();return()=>dkd_loop.stop();},[dkd_spin]);
  return <Animated.View pointerEvents="none" style={[styles.glow,style,{transform:[{rotate:dkd_spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}]}><LinearGradient colors={colors} style={StyleSheet.absoluteFillObject}/></Animated.View>;
}

function DkdMetric({ icon, label, value, colors, delay=0 }){
  const dkd_anim=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(dkd_anim,{toValue:1,duration:520,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();},[dkd_anim,delay]);
  return <Animated.View style={[styles.metricWrap,{opacity:dkd_anim,transform:[{translateY:dkd_anim.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}]}><LinearGradient colors={colors} style={styles.metricCard}><View style={styles.metricIcon}><MaterialCommunityIcons name={icon} size={20} color="#07111F"/></View><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text></LinearGradient></Animated.View>;
}

function DkdSection({ eyebrow, title, subtitle, icon }){
  return <View style={styles.sectionHead}><View style={styles.sectionTitleRow}>{icon?<View style={styles.sectionIcon}><MaterialCommunityIcons name={icon} size={18} color={dkd_palette.cyan}/></View>:null}<View style={{flex:1}}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View></View>{subtitle?<Text style={styles.sectionSub}>{subtitle}</Text>:null}</View>;
}

function DkdStatusPill({ status }){
  const dkd_config=status==='approved'?['Onaylandı',dkd_palette.mint,'check-circle']:status==='rejected'?['Reddedildi',dkd_palette.red,'close-circle']:['İnceleniyor',dkd_palette.gold,'clock-outline'];
  return <View style={[styles.statusPill,{borderColor:`${dkd_config[1]}33`,backgroundColor:`${dkd_config[1]}12`}]}><MaterialCommunityIcons name={dkd_config[2]} size={14} color={dkd_config[1]}/><Text style={[styles.statusText,{color:dkd_config[1]}]}>{dkd_config[0]}</Text></View>;
}

function DkdFeedbackModal({ value, onClose }){
  if(!value)return null;
  const dkd_is_error=value.dkd_tone==='error';
  const dkd_is_warn=value.dkd_tone==='warn';
  const dkd_icon_color=dkd_is_error?dkd_palette.red:dkd_is_warn?dkd_palette.gold:dkd_palette.mint;
  const dkd_colors=dkd_is_error?['#321526','#1C1530','#111A31']:dkd_is_warn?['#342716','#22203A','#121B33']:['#0D2C33','#17334D','#261B49'];
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><View style={styles.feedbackBackdrop}><LinearGradient colors={dkd_colors} style={styles.feedbackCard}><View style={[styles.feedbackIcon,{borderColor:dkd_icon_color+'55'}]}><MaterialCommunityIcons name={value.dkd_icon || (dkd_is_error?'alert-circle-outline':dkd_is_warn?'alert-outline':'check-decagram-outline')} size={34} color={dkd_icon_color}/></View><Text style={styles.feedbackTitle}>{value.dkd_title}</Text><Text style={styles.feedbackText}>{value.dkd_text}</Text><Pressable onPress={onClose} style={styles.feedbackPress}><LinearGradient colors={dkd_is_error?['#FF7B92','#FF9D79']:dkd_is_warn?['#FFD277','#FFAD67']:['#61ECC4','#66DFF5']} style={styles.feedbackButton}><Text style={styles.feedbackButtonText}>TAMAM</Text></LinearGradient></Pressable></LinearGradient></View></Modal>;
}

export default function PlatformFeeScreen(){
  const[dkd_data,dkd_set_data]=useState(null);
  const[dkd_loading,dkd_set_loading]=useState(true);
  const[dkd_busy,dkd_set_busy]=useState(false);
  const[dkd_error,dkd_set_error]=useState('');
  const[dkd_cycle,dkd_set_cycle]=useState('weekly');
  const[dkd_weekday,dkd_set_weekday]=useState(1);
  const[dkd_month_day,dkd_set_month_day]=useState(1);
  const[dkd_amount,dkd_set_amount]=useState('0');
  const[dkd_receipt,dkd_set_receipt]=useState(null);
  const[dkd_feedback,dkd_set_feedback]=useState(null);
  const dkd_hero=useRef(new Animated.Value(0)).current;
  const dkd_pulse=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    Animated.timing(dkd_hero,{toValue:1,duration:620,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
    const dkd_loop=Animated.loop(Animated.sequence([
      Animated.timing(dkd_pulse,{toValue:1,duration:1450,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(dkd_pulse,{toValue:0,duration:1450,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
    ]));
    dkd_loop.start();return()=>dkd_loop.stop();
  },[dkd_hero,dkd_pulse]);

  const dkd_load=useCallback(async()=>{
    dkd_set_error('');
    try{
      const dkd_value=await dkd_panel_fetch_platform_fee_profile();
      dkd_set_data(dkd_value || {});
      dkd_set_cycle(dkd_value?.dkd_payment_cycle || 'weekly');
      dkd_set_weekday(Number(dkd_value?.dkd_weekday || 1));
      dkd_set_month_day(Number(dkd_value?.dkd_month_day || 1));
      dkd_set_amount(String(Number(dkd_value?.dkd_outstanding_tl || 0).toFixed(2)));
    }catch(dkd_error_value){dkd_set_error(String(dkd_error_value.message || dkd_error_value));}
    finally{dkd_set_loading(false);}
  },[]);
  useEffect(()=>{dkd_load();},[dkd_load]);

  const dkd_show_feedback=(dkd_tone,dkd_title,dkd_text,dkd_icon)=>dkd_set_feedback({dkd_tone,dkd_title,dkd_text,dkd_icon});
  const dkd_copy_iban=async()=>{
    const dkd_iban_value=String(dkd_data?.dkd_iban || '').trim();
    if(!dkd_iban_value){dkd_show_feedback('warn','IBAN Bulunamadı','Yönetim Merkezi henüz bir tahsilat IBAN’ı tanımlamadı.','bank-alert');return;}
    try{const dkd_clipboard_value=await import('expo-clipboard');await dkd_clipboard_value.setStringAsync(dkd_iban_value);dkd_show_feedback('success','IBAN Kopyalandı','Tahsilat IBAN’ı panoya kopyalandı. Banka uygulamana yapıştırabilirsin.','content-copy');}
    catch(dkd_copy_error){dkd_show_feedback('warn','Kopyalama Hazır Değil','Tek dokunuşla kopyalama için güncel Developer APK gerekir. IBAN metnini basılı tutarak da seçebilirsin.','cellphone-arrow-down');}
  };
  const dkd_save_schedule=async()=>{dkd_set_busy(true);dkd_set_error('');try{await dkd_panel_set_platform_schedule(dkd_cycle,dkd_weekday,dkd_month_day);await dkd_load();const dkd_label_value=dkd_cycle==='weekly'?(dkd_weekdays.find((dkd_item)=>dkd_item.v===dkd_weekday)?.l || 'seçili gün'):`Ayın ${dkd_month_day}. günü`;dkd_show_feedback('success','Ödeme Günü Kaydedildi',`${dkd_label_value} ödeme planın aktif edildi. Seçili günde Panel seni bilgilendirecek.`,'calendar-check-outline');}catch(dkd_error_value){const dkd_message_value=String(dkd_error_value.message || dkd_error_value);dkd_set_error(dkd_message_value);dkd_show_feedback('error','Ödeme Günü Kaydedilemedi',dkd_message_value,'calendar-remove-outline');}finally{dkd_set_busy(false);}};
  const dkd_pick_receipt=async()=>{const dkd_value=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp','application/pdf'],copyToCacheDirectory:true,multiple:false});if(!dkd_value.canceled&&dkd_value.assets?.[0])dkd_set_receipt(dkd_value.assets[0]);};
  const dkd_submit=async()=>{
    const dkd_amount_value=Number(String(dkd_amount).replace(',','.'));
    if(!(dkd_amount_value>0)){dkd_show_feedback('warn','Ödeme Tutarını Gir','Ödemeyi bildirmeden önce 0 TL’den büyük bir ödeme tutarı yaz.','cash-edit');return;}
    if(!dkd_receipt?.uri){dkd_show_feedback('warn','Önce Dekont Seç','Ödemeyi Bildir butonunu kullanmadan önce Dekont Seç kartından ödeme dekontunu eklemelisin.','file-upload-outline');return;}
    dkd_set_busy(true);dkd_set_error('');
    try{const dkd_path_value=await dkd_panel_upload_platform_receipt(dkd_receipt);await dkd_panel_submit_platform_payment(dkd_amount_value,dkd_path_value);dkd_set_receipt(null);await dkd_load();dkd_show_feedback('success','Ödeme Bildirildi',`${dkd_money(dkd_amount_value)} tutarındaki ödeme ve dekont Yönetim Merkezi’ne gönderildi.`,'send-check-outline');}
    catch(dkd_error_value){const dkd_message_value=String(dkd_error_value.message || dkd_error_value);dkd_set_error(dkd_message_value);dkd_show_feedback('error','Ödeme Bildirilemedi',dkd_message_value,'send-alert-outline');}
    finally{dkd_set_busy(false);}
  };
  const dkd_ack_popup=async()=>{const dkd_key_value=dkd_data?.dkd_popup?.dkd_notice_key;if(dkd_key_value)await dkd_panel_ack_platform_notice(dkd_key_value).catch(()=>null);dkd_set_data((dkd_prev)=>({...(dkd_prev || {}),dkd_popup:null}));};

  if(dkd_loading)return <View style={styles.loading}><ActivityIndicator size="large" color={dkd_palette.cyan}/><Text style={styles.loadingText}>Ödeme merkezi hazırlanıyor…</Text></View>;

  const dkd_fee_text=dkd_data?.dkd_fee_mode==='percentage'?`%${Number(dkd_data?.dkd_fee_value || 0)}`:dkd_money(dkd_data?.dkd_fee_value);
  const dkd_due_text=dkd_cycle==='weekly'?(dkd_weekdays.find((dkd_item)=>dkd_item.v===dkd_weekday)?.l || 'Pzt'):`Ayın ${dkd_month_day}. günü`;
  const dkd_balance=Number(dkd_data?.dkd_outstanding_tl || 0);

  return <View style={styles.root}>
    <DkdGlow style={styles.glowOne} colors={['rgba(94,235,255,.32)','rgba(111,135,255,.02)']}/><DkdGlow style={styles.glowTwo} colors={['rgba(255,118,183,.24)','rgba(166,107,255,.02)']}/>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={{opacity:dkd_hero,transform:[{translateY:dkd_hero.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}>
        <LinearGradient colors={['#112E59','#40225D','#6A245B']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
          <View style={styles.heroTop}><View style={styles.heroBadge}><View style={styles.liveDot}/><Text style={styles.heroBadgeText}>ÖDEME & ANLAŞMA</Text></View><Animated.View style={[styles.heroIcon,{opacity:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.55,1]}),transform:[{scale:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.94,1.08]})}]}]}><MaterialCommunityIcons name="hand-coin" size={27} color="#FFF"/></Animated.View></View>
          <Text style={styles.heroTitle}>Platform Hizmet Bedeli</Text><Text style={styles.heroSub}>Anlaşmanı, ödeme gününü, güncel bakiyeni ve dekont bildirimlerini tek premium finans ekranından yönet.</Text>
          <View style={styles.balancePanel}><View><Text style={styles.balanceLabel}>GÜNCEL BAKİYE</Text><Text style={styles.balanceValue}>{dkd_money(dkd_balance)}</Text><Text style={styles.balanceHint}>{dkd_balance>0?'Ödeme bekleyen tutar':'Şu anda ödenecek bakiye yok'}</Text></View><View style={styles.balanceIcon}><MaterialCommunityIcons name={dkd_balance>0?'cash-clock':'check-decagram'} size={30} color={dkd_balance>0?dkd_palette.gold:dkd_palette.mint}/></View></View>
        </LinearGradient>
      </Animated.View>

      {!!dkd_error&&<View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle" size={19} color={dkd_palette.red}/><Text style={styles.errorText}>{dkd_error}</Text></View>}

      <View style={styles.metricGrid}>
        <DkdMetric icon="handshake-outline" label="ANLAŞMAN" value={dkd_fee_text} colors={['#5EEBFF','#6598FF']} delay={50}/>
        <DkdMetric icon="calendar-clock" label="ÖDEME GÜNÜ" value={dkd_due_text} colors={['#FFD37A','#FF9F6F']} delay={100}/>
        <DkdMetric icon="cash-check" label="BİLDİRİLEN/ÖDENEN" value={dkd_money(dkd_data?.dkd_submitted_or_paid_tl)} colors={['#63EDC2','#4BCFA8']} delay={150}/>
        <DkdMetric icon="cash-multiple" label="TOPLAM HİZMET BEDELİ" value={dkd_money(dkd_data?.dkd_total_fee_tl)} colors={['#A66BFF','#FF76B7']} delay={200}/>
      </View>

      <DkdSection eyebrow="TAHSİLAT BİLGİSİ" title="Ödeme Hesabı" subtitle="Ödeme yaparken aşağıdaki alıcı ve IBAN bilgisini kullan." icon="bank-outline"/>
      <LinearGradient colors={['#131C38','#17142F','#24143A']} style={styles.bankCard}>
        <View style={styles.bankHeader}><View style={styles.bankLogo}><MaterialCommunityIcons name="bank" size={25} color={dkd_palette.gold}/></View><View style={{flex:1}}><Text style={styles.bankBrand}>Doğancan Kartal</Text><Text style={styles.bankSub}>Platform tahsilat hesabı</Text></View><MaterialCommunityIcons name="shield-check" size={23} color={dkd_palette.mint}/></View>
        <View style={styles.bankDivider}/><Text style={styles.bankLabel}>ALICI</Text><Text style={styles.bankValue}>{dkd_data?.dkd_account_name || 'Doğancan Kartal'}</Text><Text style={styles.bankLabel}>IBAN</Text><View style={styles.ibanRow}><Text selectable selectionColor={dkd_palette.cyan} numberOfLines={1} adjustsFontSizeToFit style={[styles.bankValue,styles.ibanValue]}>{dkd_data?.dkd_iban || 'IBAN henüz Yönetim Merkezi tarafından tanımlanmadı.'}</Text><Pressable onPress={dkd_copy_iban} style={({pressed})=>[styles.ibanCopyButton,pressed&&{transform:[{scale:.94}]}]}><MaterialCommunityIcons name="content-copy" size={20} color="#07111F"/></Pressable></View>
      </LinearGradient>

      <DkdSection eyebrow="PLANLAMA" title="Ödeme Gününü Seç" subtitle="Haftalık veya aylık ödeme düzenini belirle. Seçtiğin günde bildirim ve tek seferlik popup açılır." icon="calendar-edit"/>
      <View style={styles.scheduleCard}>
        <View style={styles.cycleSwitch}>{[['weekly','Haftalık','calendar-week'],['monthly','Aylık','calendar-month']].map(([dkd_value,dkd_label,dkd_icon])=><Pressable key={dkd_value} onPress={()=>dkd_set_cycle(dkd_value)} style={[styles.cycleButton,dkd_cycle===dkd_value&&styles.cycleActive]}><MaterialCommunityIcons name={dkd_icon} size={19} color={dkd_cycle===dkd_value?'#07111F':dkd_palette.soft}/><Text style={[styles.cycleText,dkd_cycle===dkd_value&&styles.cycleTextActive]}>{dkd_label}</Text></Pressable>)}</View>
        {dkd_cycle==='weekly'?<View style={styles.dayGrid}>{dkd_weekdays.map((dkd_day)=><Pressable key={dkd_day.v} onPress={()=>dkd_set_weekday(dkd_day.v)} style={[styles.dayButton,dkd_weekday===dkd_day.v&&styles.dayActive]}><Text style={[styles.dayText,dkd_weekday===dkd_day.v&&styles.dayTextActive]}>{dkd_day.l}</Text></Pressable>)}</View>:<><Text style={styles.fieldLabel}>AYIN GÜNÜ</Text><View style={styles.monthGrid}>{Array.from({length:31},(_,dkd_index)=>dkd_index+1).map((dkd_day)=><Pressable key={dkd_day} onPress={()=>dkd_set_month_day(dkd_day)} style={[styles.monthDay,dkd_month_day===dkd_day&&styles.dayActive]}><Text style={[styles.dayText,dkd_month_day===dkd_day&&styles.dayTextActive]}>{dkd_day}</Text></Pressable>)}</View></>}
        <Pressable disabled={dkd_busy} onPress={dkd_save_schedule} style={styles.primaryPress}><LinearGradient colors={['#5EEBFF','#6D8DFF']} style={styles.primaryGradient}>{dkd_busy?<ActivityIndicator color="#07111F"/>:<><MaterialCommunityIcons name="content-save-check" size={20} color="#07111F"/><Text style={styles.primaryText}>ÖDEME GÜNÜNÜ KAYDET</Text></>}</LinearGradient></Pressable>
      </View>

      <DkdSection eyebrow="ÖDEME BİLDİRİMİ" title="Dekont Gönder" subtitle="Ödemeyi yaptıktan sonra tutarı gir ve dekontunu yükle. Yönetim Merkezi anında bilgilendirilir." icon="receipt-text-arrow-right"/>
      <LinearGradient colors={['#101A34','#14172E']} style={styles.paymentForm}>
        <Text style={styles.fieldLabel}>ÖDEME TUTARI</Text><View style={styles.amountWrap}><MaterialCommunityIcons name="currency-try" size={22} color={dkd_palette.gold}/><TextInput keyboardType="decimal-pad" value={dkd_amount} onChangeText={dkd_set_amount} style={styles.amountInput}/></View>
        <Animated.View style={[styles.receiptMotion,{transform:[{scale:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[1,1.018]})}]}]}><Pressable onPress={dkd_pick_receipt}><LinearGradient colors={dkd_receipt?['rgba(99,237,194,.22)','rgba(57,157,183,.12)','rgba(166,107,255,.12)']:['rgba(94,235,255,.20)','rgba(91,120,255,.13)','rgba(166,107,255,.13)']} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.receiptPicker,dkd_receipt&&styles.receiptPickerSelected]}><Animated.View pointerEvents="none" style={[styles.receiptShine,{opacity:dkd_pulse.interpolate({inputRange:[0,1],outputRange:[.08,.32]})}]}/><View style={[styles.receiptIcon,dkd_receipt&&styles.receiptIconSelected]}><MaterialCommunityIcons name={dkd_receipt?'file-check':'file-upload-outline'} size={26} color={dkd_receipt?dkd_palette.mint:dkd_palette.cyan}/></View><View style={{flex:1}}><Text style={styles.receiptEyebrow}>{dkd_receipt?'DEKONT HAZIR':'GÜVENLİ DOSYA YÜKLEME'}</Text><Text style={styles.receiptName}>{dkd_receipt?.name || 'Dekont Seç'}</Text><Text style={styles.receiptMeta}>{dkd_receipt?'Dosya hazır • değiştirmek için dokun':'JPG, PNG, WEBP veya PDF • en fazla 10 MB'}</Text></View><View style={styles.receiptArrow}><MaterialCommunityIcons name={dkd_receipt?'check':'arrow-right'} size={20} color={dkd_receipt?dkd_palette.mint:dkd_palette.cyan}/></View></LinearGradient></Pressable></Animated.View>
        <Pressable disabled={dkd_busy} onPress={dkd_submit} style={styles.submitPress}><LinearGradient colors={['#63EDC2','#55D8AE']} style={styles.submitGradient}>{dkd_busy?<ActivityIndicator color="#07111F"/>:<><MaterialCommunityIcons name="send-check" size={20} color="#07111F"/><Text style={styles.submitText}>ÖDEMEYİ BİLDİR</Text></>}</LinearGradient></Pressable>
      </LinearGradient>

      <DkdSection eyebrow="ÖDEME GEÇMİŞİ" title="Son Bildirimler" subtitle="Gönderdiğin ödemelerin inceleme durumları." icon="history"/>
      {(dkd_data?.dkd_recent_payments || []).length?(dkd_data.dkd_recent_payments || []).map((dkd_payment)=><View key={dkd_payment.dkd_id} style={styles.historyCard}><View style={styles.historyIcon}><MaterialCommunityIcons name="receipt-text" size={20} color={dkd_palette.cyan}/></View><View style={{flex:1}}><Text style={styles.historyAmount}>{dkd_money(dkd_payment.dkd_amount_tl)}</Text><Text style={styles.historyDate}>{new Date(dkd_payment.dkd_submitted_at).toLocaleString('tr-TR')}</Text></View><DkdStatusPill status={dkd_payment.dkd_status}/></View>):<View style={styles.emptyCard}><MaterialCommunityIcons name="receipt-text-outline" size={29} color={dkd_palette.muted}/><Text style={styles.emptyTitle}>Henüz ödeme bildirimi yok</Text><Text style={styles.emptyText}>İlk dekont gönderiminden sonra geçmiş burada oluşacak.</Text></View>}

      <DkdSection eyebrow="PAKET HAREKETLERİ" title="Son Hizmet Bedelleri" subtitle="Tamamlanan paketlere ait son platform hizmet bedeli kayıtları." icon="package-variant-closed-check"/>
      {(dkd_data?.dkd_recent_ledger || []).length?(dkd_data.dkd_recent_ledger || []).map((dkd_item)=><View key={dkd_item.dkd_job_id} style={styles.ledgerCard}><View style={styles.ledgerIcon}><MaterialCommunityIcons name="package-variant" size={19} color={dkd_palette.purple}/></View><View style={{flex:1}}><Text style={styles.ledgerTitle}>Paket #{dkd_item.dkd_job_id}</Text><Text style={styles.historyDate}>{new Date(dkd_item.dkd_completed_at).toLocaleString('tr-TR')}</Text></View><Text style={styles.ledgerMoney}>{dkd_money(dkd_item.dkd_platform_fee_tl)}</Text></View>):<View style={styles.emptyCard}><MaterialCommunityIcons name="package-variant-closed" size={29} color={dkd_palette.muted}/><Text style={styles.emptyTitle}>Henüz paket kaydı yok</Text><Text style={styles.emptyText}>Tamamlanan paketler burada listelenecek.</Text></View>}
      <View style={{height:115}}/>
    </ScrollView>

    <DkdFeedbackModal value={dkd_feedback} onClose={()=>dkd_set_feedback(null)}/><Modal transparent visible={Boolean(dkd_data?.dkd_popup)} animationType="fade" onRequestClose={dkd_ack_popup}><View style={styles.modalBackdrop}><LinearGradient colors={['#172A53','#28183F','#451A45']} style={styles.modalCard}><View style={styles.modalIcon}><MaterialCommunityIcons name="calendar-alert" size={33} color={dkd_palette.gold}/></View><Text style={styles.modalTitle}>{dkd_data?.dkd_popup?.dkd_title}</Text><Text style={styles.modalText}>{dkd_data?.dkd_popup?.dkd_body}</Text><Text style={styles.modalAmount}>{dkd_money(dkd_data?.dkd_popup?.dkd_amount_tl)}</Text><Pressable onPress={dkd_ack_popup} style={styles.modalPress}><LinearGradient colors={['#5EEBFF','#6D8DFF']} style={styles.modalGradient}><Text style={styles.modalButtonText}>OKUDUM, ANLADIM</Text></LinearGradient></Pressable></LinearGradient></View></Modal>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:dkd_palette.bg},content:{padding:16,paddingTop:18},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:11,backgroundColor:dkd_palette.bg},loadingText:{color:dkd_palette.soft,fontWeight:'800'},glow:{position:'absolute',borderRadius:999,overflow:'hidden',opacity:.62},glowOne:{width:250,height:250,top:-120,right:-120},glowTwo:{width:280,height:280,bottom:120,left:-170},hero:{borderRadius:30,padding:18,borderWidth:1,borderColor:'rgba(255,255,255,.12)',overflow:'hidden'},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heroBadge:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:'rgba(5,10,24,.26)'},liveDot:{width:8,height:8,borderRadius:8,backgroundColor:dkd_palette.mint},heroBadgeText:{color:'#E7F8FF',fontSize:10,fontWeight:'900',letterSpacing:1.1},heroIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.11)'},heroTitle:{color:'#FFF',fontSize:31,fontWeight:'900',letterSpacing:-.7,marginTop:19},heroSub:{color:'rgba(238,244,255,.78)',fontSize:14,lineHeight:20,fontWeight:'700',marginTop:7},balancePanel:{marginTop:18,borderRadius:20,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(4,9,24,.28)',borderWidth:1,borderColor:'rgba(255,255,255,.09)'},balanceLabel:{color:'rgba(238,244,255,.58)',fontSize:10,fontWeight:'900',letterSpacing:1},balanceValue:{color:'#FFF',fontSize:25,fontWeight:'900',marginTop:4},balanceHint:{color:'rgba(238,244,255,.64)',fontSize:11.5,fontWeight:'700',marginTop:3},balanceIcon:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.08)'},errorBox:{flexDirection:'row',gap:8,alignItems:'center',padding:12,borderRadius:17,marginTop:12,backgroundColor:'rgba(255,113,136,.08)',borderWidth:1,borderColor:'rgba(255,113,136,.17)'},errorText:{flex:1,color:'#FFC2CC',fontSize:13,fontWeight:'800'},metricGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:14},metricWrap:{width:'47%',flexGrow:1},metricCard:{minHeight:126,borderRadius:23,padding:13,justifyContent:'flex-end',overflow:'hidden'},metricIcon:{position:'absolute',top:12,right:12,width:39,height:39,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.42)'},metricLabel:{color:'rgba(5,12,25,.64)',fontSize:10,fontWeight:'900',letterSpacing:.45},metricValue:{color:'#07111F',fontSize:18,fontWeight:'900',marginTop:4},sectionHead:{marginTop:24,marginBottom:10},sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:9},sectionIcon:{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(94,235,255,.08)'},sectionEyebrow:{color:dkd_palette.cyan,fontSize:10,fontWeight:'900',letterSpacing:1.25},sectionTitle:{color:dkd_palette.text,fontSize:22,fontWeight:'900',marginTop:3},sectionSub:{color:dkd_palette.soft,fontSize:13,lineHeight:18,fontWeight:'700',marginTop:6},bankCard:{borderRadius:25,padding:15,borderWidth:1,borderColor:'rgba(255,211,122,.12)'},bankHeader:{flexDirection:'row',alignItems:'center',gap:10},bankLogo:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,211,122,.09)'},bankBrand:{color:dkd_palette.text,fontSize:17,fontWeight:'900'},bankSub:{color:dkd_palette.soft,fontSize:11.5,fontWeight:'700',marginTop:3},bankDivider:{height:1,backgroundColor:'rgba(255,255,255,.07)',marginVertical:9},bankLabel:{color:dkd_palette.muted,fontSize:10,fontWeight:'900',letterSpacing:.8,marginTop:4},bankValue:{color:dkd_palette.text,fontSize:15,fontWeight:'900',marginTop:3},ibanRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2},ibanValue:{flex:1,minWidth:0,color:dkd_palette.cyan,lineHeight:21},ibanCopyButton:{width:43,height:43,borderRadius:14,backgroundColor:dkd_palette.cyan,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.42)'},scheduleCard:{borderRadius:25,padding:14,backgroundColor:'#0B1329',borderWidth:1,borderColor:'rgba(112,144,207,.13)'},cycleSwitch:{flexDirection:'row',gap:8},cycleButton:{flex:1,minHeight:52,borderRadius:16,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},cycleActive:{backgroundColor:dkd_palette.cyan,borderColor:dkd_palette.cyan},cycleText:{color:dkd_palette.soft,fontWeight:'900'},cycleTextActive:{color:'#07111F'},dayGrid:{flexDirection:'row',gap:6,marginTop:12},dayButton:{flex:1,minHeight:42,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},dayActive:{backgroundColor:dkd_palette.gold,borderColor:dkd_palette.gold},dayText:{color:dkd_palette.soft,fontSize:11.5,fontWeight:'900'},dayTextActive:{color:'#07111F'},fieldLabel:{color:dkd_palette.muted,fontSize:10,fontWeight:'900',letterSpacing:.8,marginTop:14,marginBottom:7},monthGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},monthDay:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},primaryPress:{borderRadius:16,overflow:'hidden',marginTop:13},primaryGradient:{minHeight:51,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center'},primaryText:{color:'#07111F',fontSize:13,fontWeight:'900'},paymentForm:{borderRadius:25,padding:14,borderWidth:1,borderColor:'rgba(112,144,207,.12)'},amountWrap:{minHeight:54,borderRadius:16,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,backgroundColor:'rgba(255,255,255,.035)',borderWidth:1,borderColor:'rgba(255,255,255,.07)'},amountInput:{flex:1,color:dkd_palette.text,fontSize:20,fontWeight:'900'},receiptMotion:{marginTop:11,borderRadius:21},receiptPicker:{minHeight:84,borderRadius:21,padding:12,flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:'rgba(94,235,255,.24)',overflow:'hidden'},receiptPickerSelected:{borderColor:'rgba(99,237,194,.30)'},receiptShine:{position:'absolute',width:120,height:120,borderRadius:999,backgroundColor:'#FFFFFF',right:-55,top:-58},receiptIcon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(94,235,255,.10)',borderWidth:1,borderColor:'rgba(94,235,255,.16)'},receiptIconSelected:{backgroundColor:'rgba(99,237,194,.10)',borderColor:'rgba(99,237,194,.22)'},receiptEyebrow:{color:dkd_palette.cyan,fontSize:9,fontWeight:'900',letterSpacing:1},receiptName:{color:dkd_palette.text,fontSize:14.5,fontWeight:'900',marginTop:2},receiptMeta:{color:dkd_palette.soft,fontSize:11,fontWeight:'700',marginTop:3},receiptArrow:{width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,10,24,.28)'},submitPress:{borderRadius:16,overflow:'hidden',marginTop:12},submitGradient:{minHeight:51,flexDirection:'row',gap:7,alignItems:'center',justifyContent:'center'},submitText:{color:'#07111F',fontSize:13,fontWeight:'900'},historyCard:{minHeight:68,borderRadius:20,padding:11,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.12)',marginTop:8},historyIcon:{width:43,height:43,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(94,235,255,.07)'},historyAmount:{color:dkd_palette.text,fontSize:14.5,fontWeight:'900'},historyDate:{color:dkd_palette.soft,fontSize:10.5,fontWeight:'700',marginTop:3},statusPill:{minHeight:31,borderRadius:999,paddingHorizontal:9,flexDirection:'row',gap:4,alignItems:'center',borderWidth:1},statusText:{fontSize:10.5,fontWeight:'900'},ledgerCard:{minHeight:66,borderRadius:19,padding:11,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.11)',marginTop:8},ledgerIcon:{width:41,height:41,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(166,107,255,.08)'},ledgerTitle:{color:dkd_palette.text,fontSize:13.5,fontWeight:'900'},ledgerMoney:{color:'#BBA4FF',fontSize:14,fontWeight:'900'},emptyCard:{alignItems:'center',padding:23,borderRadius:21,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.11)'},emptyTitle:{color:dkd_palette.text,fontSize:14.5,fontWeight:'900',marginTop:8},emptyText:{color:dkd_palette.soft,fontSize:11.5,fontWeight:'700',textAlign:'center',marginTop:4},modalBackdrop:{flex:1,backgroundColor:'rgba(1,4,12,.84)',alignItems:'center',justifyContent:'center',padding:22},modalCard:{width:'100%',maxWidth:390,borderRadius:30,padding:21,borderWidth:1,borderColor:'rgba(255,255,255,.12)'},modalIcon:{width:64,height:64,borderRadius:21,alignSelf:'center',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,211,122,.09)'},modalTitle:{color:'#FFF',fontSize:23,fontWeight:'900',textAlign:'center',marginTop:13},modalText:{color:'#AAB8D2',fontSize:14,lineHeight:20,fontWeight:'700',textAlign:'center',marginTop:8},modalAmount:{color:dkd_palette.gold,fontSize:27,fontWeight:'900',textAlign:'center',marginTop:11},modalPress:{borderRadius:16,overflow:'hidden',marginTop:15},modalGradient:{minHeight:51,alignItems:'center',justifyContent:'center'},modalButtonText:{color:'#07111F',fontWeight:'900'},feedbackBackdrop:{flex:1,backgroundColor:'rgba(1,4,12,.86)',alignItems:'center',justifyContent:'center',padding:22},feedbackCard:{width:'100%',maxWidth:390,borderRadius:30,padding:21,borderWidth:1,borderColor:'rgba(255,255,255,.13)'},feedbackIcon:{width:66,height:66,borderRadius:22,alignSelf:'center',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.06)',borderWidth:1},feedbackTitle:{color:'#FFF',fontSize:22,fontWeight:'900',textAlign:'center',marginTop:14},feedbackText:{color:'#AAB8D2',fontSize:13.5,lineHeight:20,fontWeight:'700',textAlign:'center',marginTop:8},feedbackPress:{borderRadius:17,overflow:'hidden',marginTop:16},feedbackButton:{minHeight:52,alignItems:'center',justifyContent:'center'},feedbackButtonText:{color:'#07111F',fontSize:13,fontWeight:'900',letterSpacing:.5}
});
