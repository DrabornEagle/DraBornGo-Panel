const fs = require('fs');

function dkd_read(dkd_path){ return fs.readFileSync(dkd_path,'utf8'); }
function dkd_write(dkd_path,dkd_value){ fs.writeFileSync(dkd_path,dkd_value); }
function dkd_replace(dkd_source,dkd_old,dkd_new,dkd_label){
  if(dkd_source.includes(dkd_new)) return dkd_source;
  if(!dkd_source.includes(dkd_old)) throw new Error(`Missing ${dkd_label}`);
  return dkd_source.replace(dkd_old,dkd_new);
}

const dkd_detail_screen = `import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const dkd_palette={bg:'#050816',text:'#F8FAFF',soft:'#96A5C5',muted:'#687895',cyan:'#5EEBFF',blue:'#718AFF',mint:'#63EDC2',purple:'#A66BFF',pink:'#FF76B7'};
const dkd_money=(dkd_value)=>\`${'${'}Number(dkd_value || 0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} TL\`;
const dkd_earning=(dkd_value)=>Number(dkd_value?.dkd_earnings_tl || 0);

function DkdMetric({label,value,icon,colors,delay=0}){
  const dkd_anim=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(dkd_anim,{toValue:1,duration:520,delay,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();},[dkd_anim,delay]);
  return <Animated.View style={[styles.metricWrap,{opacity:dkd_anim,transform:[{translateY:dkd_anim.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}]}><LinearGradient colors={colors} style={styles.metric}><View style={styles.metricIcon}><MaterialCommunityIcons name={icon} size={21} color="#07111F"/></View><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text></LinearGradient></Animated.View>;
}

function DkdChart({rows,keyName,valueName,color}){
  const dkd_values=Array.isArray(rows)?rows:[];
  const dkd_max=Math.max(1,...dkd_values.map((dkd_row)=>Number(dkd_row?.[valueName] || 0)));
  if(!dkd_values.length)return <View style={styles.empty}><MaterialCommunityIcons name="chart-timeline-variant" size={26} color={dkd_palette.muted}/><Text style={styles.emptyText}>Henüz kazanç verisi yok.</Text></View>;
  return <View style={styles.chartList}>{dkd_values.map((dkd_row,dkd_index)=>{const dkd_value=Number(dkd_row?.[valueName] || 0);const dkd_width=Math.max(3,Math.min(100,(dkd_value/dkd_max)*100));return <View key={\`${'${'}dkd_row?.[keyName] || dkd_index}-${'${'}dkd_index}\`} style={styles.chartRow}><Text style={styles.chartLabel}>{String(dkd_row?.[keyName] ?? '')}</Text><View style={styles.chartTrack}><View style={[styles.chartFill,{width:\`${'${'}dkd_width}%\`,backgroundColor:color}]}/></View><Text style={styles.chartMoney}>{dkd_money(dkd_value)}</Text></View>;})}</View>;
}

export default function AdminCourierDetailScreen({detail,onBack}){
  const dkd_enter=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(dkd_enter,{toValue:1,duration:560,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();},[dkd_enter]);
  const dkd_business=detail?.dkd_business || {};
  const dkd_daily=useMemo(()=>Array.isArray(detail?.dkd_daily_earnings)?detail.dkd_daily_earnings:[],[detail]);
  const dkd_hourly=useMemo(()=>Array.isArray(detail?.dkd_hourly_earnings)?detail.dkd_hourly_earnings:[],[detail]);
  return <View style={styles.root}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Animated.View style={{opacity:dkd_enter,transform:[{translateY:dkd_enter.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}}><LinearGradient colors={['#0C4560','#243C7D','#562F78']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}><View style={styles.heroGlow}/><View style={styles.heroTop}><Pressable onPress={onBack} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={23} color="#FFF"/></Pressable><View style={styles.heroBadge}><View style={styles.liveDot}/><Text style={styles.heroBadgeText}>KURYE DETAYI</Text></View></View><View style={styles.heroMain}><View style={styles.avatar}><MaterialCommunityIcons name="bike-fast" size={31} color="#07111F"/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.heroTitle}>{detail?.dkd_display_name || 'Kurye'}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={styles.heroSub}>{detail?.dkd_dbg_id || 'DBG ID yok'} • {dkd_business?.dkd_business_name || 'Bağlı işletme yok'}</Text></View></View></LinearGradient></Animated.View>

    <View style={styles.metricGrid}><DkdMetric label="BUGÜN" value={dkd_money(dkd_earning(detail?.dkd_today))} icon="calendar-today" colors={['#5EEBFF','#68A0FF']} delay={40}/><DkdMetric label="HAFTA" value={dkd_money(dkd_earning(detail?.dkd_week))} icon="calendar-week" colors={['#63EDC2','#46C8A5']} delay={90}/><DkdMetric label="AY" value={dkd_money(dkd_earning(detail?.dkd_month))} icon="calendar-month" colors={['#A66BFF','#FF76B7']} delay={140}/></View>

    <Text style={styles.eyebrow}>BAĞLI İŞLETME</Text><LinearGradient colors={['#0B1E33','#111B39']} style={styles.businessCard}><View style={styles.businessIcon}><MaterialCommunityIcons name="storefront-outline" size={23} color={dkd_palette.mint}/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.businessName}>{dkd_business?.dkd_business_name || 'Bağlı işletme yok'}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={styles.businessSub}>{dkd_business?.dkd_city || ''} {dkd_business?.dkd_district || ''}</Text></View><MaterialCommunityIcons name="shield-check" size={22} color={dkd_palette.mint}/></LinearGradient>

    <Text style={styles.eyebrow}>SON 31 GÜN</Text><Text style={styles.sectionTitle}>Gün Gün Kazanç</Text><View style={styles.panel}><DkdChart rows={dkd_daily} keyName="dkd_day" valueName="dkd_earnings_tl" color={dkd_palette.cyan}/></View>
    <Text style={styles.eyebrow}>BUGÜN</Text><Text style={styles.sectionTitle}>Saatlik Kazanç</Text><View style={styles.panel}><DkdChart rows={dkd_hourly} keyName="dkd_hour" valueName="dkd_earnings_tl" color={dkd_palette.blue}/></View>
    <View style={{height:28}}/>
  </ScrollView></View>;
}

const styles=StyleSheet.create({root:{flex:1,backgroundColor:dkd_palette.bg},content:{padding:16,paddingTop:18},hero:{borderRadius:30,padding:17,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.13)'},heroGlow:{position:'absolute',width:210,height:210,borderRadius:999,right:-90,top:-105,backgroundColor:'rgba(94,235,255,.14)'},heroTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},backButton:{width:46,height:46,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(5,10,24,.28)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},heroBadge:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:11,paddingVertical:8,borderRadius:999,backgroundColor:'rgba(5,10,24,.25)'},liveDot:{width:8,height:8,borderRadius:99,backgroundColor:dkd_palette.mint},heroBadgeText:{color:'#EAF9FF',fontSize:10.5,fontWeight:'900',letterSpacing:1},heroMain:{flexDirection:'row',alignItems:'center',gap:13,marginTop:18},avatar:{width:64,height:64,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:dkd_palette.cyan},heroTitle:{color:'#FFF',fontSize:28,fontWeight:'900'},heroSub:{color:'rgba(239,245,255,.76)',fontSize:13,fontWeight:'800',marginTop:5},metricGrid:{flexDirection:'row',gap:8,marginTop:14},metricWrap:{flex:1},metric:{minHeight:114,borderRadius:22,padding:11,justifyContent:'flex-end'},metricIcon:{position:'absolute',top:10,right:10,width:38,height:38,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.42)'},metricLabel:{color:'rgba(5,12,25,.66)',fontSize:9.5,fontWeight:'900'},metricValue:{color:'#07111F',fontSize:15,fontWeight:'900',marginTop:4},eyebrow:{color:dkd_palette.cyan,fontSize:10.5,fontWeight:'900',letterSpacing:1.35,marginTop:22},sectionTitle:{color:dkd_palette.text,fontSize:22,fontWeight:'900',marginTop:4,marginBottom:10},businessCard:{minHeight:82,borderRadius:22,padding:12,flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:'rgba(99,237,194,.13)',marginTop:9},businessIcon:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(99,237,194,.08)'},businessName:{color:dkd_palette.text,fontSize:16,fontWeight:'900'},businessSub:{color:dkd_palette.soft,fontSize:12,fontWeight:'700',marginTop:4},panel:{borderRadius:23,padding:13,backgroundColor:'#0C142B',borderWidth:1,borderColor:'rgba(112,144,207,.13)'},chartList:{gap:9},chartRow:{flexDirection:'row',alignItems:'center',gap:7},chartLabel:{width:72,color:dkd_palette.soft,fontSize:10,fontWeight:'800'},chartTrack:{flex:1,height:10,borderRadius:999,overflow:'hidden',backgroundColor:'rgba(255,255,255,.055)'},chartFill:{height:'100%',borderRadius:999},chartMoney:{width:84,color:dkd_palette.text,fontSize:10,fontWeight:'900',textAlign:'right'},empty:{alignItems:'center',padding:22},emptyText:{color:dkd_palette.soft,fontSize:12,fontWeight:'700',marginTop:7}});
`;

dkd_write('src/screens/AdminCourierDetailScreen.js',dkd_detail_screen);

let dkd_admin=dkd_read('src/screens/AdminCenterScreen.js');
dkd_admin=dkd_replace(dkd_admin,"import { LinearGradient } from 'expo-linear-gradient';","import { LinearGradient } from 'expo-linear-gradient';\nimport AdminCourierDetailScreen from './AdminCourierDetailScreen';",'admin detail import');
dkd_admin=dkd_replace(dkd_admin,"  const [dkd_businesses,dkd_set_businesses] = useState([]);","  const [dkd_businesses,dkd_set_businesses] = useState([]);\n  const [dkd_business_limit,dkd_set_business_limit] = useState(5);",'business limit state');
dkd_admin=dkd_replace(dkd_admin,"  useEffect(()=>{dkd_set_courier_limit(5);},[dkd_courier_query]);","  useEffect(()=>{dkd_set_business_limit(5);},[dkd_business_query]);\n  useEffect(()=>{dkd_set_courier_limit(5);},[dkd_courier_query]);",'business limit reset');
dkd_admin=dkd_replace(dkd_admin,"  const dkd_visible_business_couriers=dkd_business_courier_values.slice(0,dkd_business_courier_limit);\n  const dkd_visible_network_couriers=(dkd_couriers || []).slice(0,dkd_courier_limit);","  const dkd_visible_business_couriers=dkd_business_courier_values.slice(0,dkd_business_courier_limit);\n  const dkd_visible_businesses=(dkd_businesses || []).slice(0,dkd_business_limit);\n  const dkd_visible_network_couriers=(dkd_couriers || []).slice(0,dkd_courier_limit);\n\n  if(dkd_courier_detail)return <AdminCourierDetailScreen detail={dkd_courier_detail} onBack={()=>dkd_set_courier_detail(null)}/>;",'business visible and detail page');
if(!dkd_admin.includes("{dkd_visible_businesses.map(")){
  dkd_admin=dkd_admin.replace("{(dkd_businesses || []).map((dkd_business)=>", "{dkd_visible_businesses.map((dkd_business)=>");
  const dkd_business_line_regex=/^(\s*)\{dkd_visible_businesses\.map\(\(dkd_business\)=>.*<\/LinearGradient><\/Pressable>\)\}$/m;
  const dkd_match=dkd_admin.match(dkd_business_line_regex);
  if(!dkd_match) throw new Error('Missing business list line');
  const dkd_more=`${dkd_match[0]}${dkd_match[1]}{(dkd_businesses || []).length>dkd_business_limit&&<Pressable onPress={()=>dkd_set_business_limit((dkd_value)=>dkd_value+5)} style={styles.moreButton}><MaterialCommunityIcons name="chevron-double-down" size={19} color="#07111F"/><Text style={styles.moreButtonText}>DAHA FAZLA • 5 İŞLETME</Text></Pressable>}`;
  dkd_admin=dkd_admin.replace(dkd_match[0],dkd_more);
}
dkd_write('src/screens/AdminCenterScreen.js',dkd_admin);

let dkd_dashboard=dkd_read('src/screens/DashboardScreenPro.js');
dkd_dashboard=dkd_replace(dkd_dashboard,"import React, { useCallback, useEffect, useMemo, useState } from 'react';","import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';",'dashboard useRef');
dkd_dashboard=dkd_replace(dkd_dashboard,"import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';","import { ActivityIndicator, Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';",'dashboard animated imports');
const dkd_hero_start=dkd_dashboard.indexOf('function DkdDashboardHero({ businessName, onOpenSettings }) {');
const dkd_hero_end=dkd_dashboard.indexOf('\n\nexport default function DashboardScreenPro',dkd_hero_start);
if(dkd_hero_start<0||dkd_hero_end<0) throw new Error('Missing dashboard hero function');
const dkd_new_hero=`function DkdDashboardHero({ businessName, onOpenSettings }) {\n  const dkd_settings_anim=useRef(new Animated.Value(0)).current;\n  useEffect(()=>{const dkd_loop=Animated.loop(Animated.sequence([Animated.timing(dkd_settings_anim,{toValue:1,duration:1500,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),Animated.timing(dkd_settings_anim,{toValue:0,duration:1500,easing:Easing.inOut(Easing.quad),useNativeDriver:true})]));dkd_loop.start();return()=>dkd_loop.stop();},[dkd_settings_anim]);\n  return <LinearGradient colors={['#09253A', '#12345B', '#2C1C54']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>\n    <View style={styles.heroGlowOne} /><View style={styles.heroGlowTwo} />\n    <View style={styles.heroTop}>\n      <LinearGradient colors={['#6CEAFF', '#6FF0B6']} style={styles.heroIcon}><MaterialCommunityIcons name=\"storefront-outline\" size={28} color=\"#07131D\" /></LinearGradient>\n      <View style={styles.heroCopy}><Text style={styles.heroKicker} numberOfLines={1} adjustsFontSizeToFit>DRABORNGO PANEL • v0.0.3</Text><Text style={styles.heroTitle} numberOfLines={1} ellipsizeMode=\"tail\">{businessName || 'İşletme Paneli'}</Text><Text style={styles.heroSub}>Kazanç, sipariş ve kurye operasyonunu tek merkezden yönet.</Text></View>\n      <Animated.View style={{transform:[{scale:dkd_settings_anim.interpolate({inputRange:[0,1],outputRange:[.98,1.08]})},{rotate:dkd_settings_anim.interpolate({inputRange:[0,1],outputRange:['-2deg','2deg']})}]}}><Pressable onPress={onOpenSettings} style={({pressed})=>[styles.settingsButton,pressed&&{transform:[{scale:.95}]}]}><LinearGradient colors={['#6FF0D1','#68DFFF','#8A82FF']} style={styles.settingsButtonGradient}><View style={styles.settingsHalo}/><MaterialCommunityIcons name=\"tune-variant\" size={29} color=\"#07131D\" /></LinearGradient></Pressable></Animated.View>\n    </View>\n    <View style={styles.heroBadges}>\n      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>Canlı Takip</Text></View>\n      <View style={styles.secureBadge}><MaterialCommunityIcons name=\"shield-check-outline\" size={16} color=\"#9CF1D2\" /><Text style={styles.secureText}>RLS korumalı</Text></View>\n    </View>\n  </LinearGradient>;\n}`;
dkd_dashboard=dkd_dashboard.slice(0,dkd_hero_start)+dkd_new_hero+dkd_dashboard.slice(dkd_hero_end);
dkd_dashboard=dkd_replace(dkd_dashboard,"settingsButton: { width: 46, height: 46, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(115,235,255,.34)' }, settingsButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },","settingsButton: { width: 58, height: 58, borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(159,245,255,.52)' }, settingsButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' }, settingsHalo:{position:'absolute',width:46,height:46,borderRadius:18,borderWidth:2,borderColor:'rgba(255,255,255,.32)'},",'settings style');
dkd_write('src/screens/DashboardScreenPro.js',dkd_dashboard);

let dkd_fee=dkd_read('src/screens/PlatformFeeScreen.js');
dkd_fee=dkd_replace(dkd_fee,"bankLabel:{color:dkd_palette.muted,fontSize:10,fontWeight:'900',letterSpacing:.8,marginTop:4},bankValue:{color:dkd_palette.text,fontSize:15,fontWeight:'900',marginTop:3},","bankLabel:{color:dkd_palette.muted,fontSize:11.5,fontWeight:'900',letterSpacing:.8,marginTop:4},bankValue:{color:dkd_palette.text,fontSize:17.5,fontWeight:'900',marginTop:3},",'bank text sizes');
dkd_fee=dkd_replace(dkd_fee,"ibanValue:{flex:1,minWidth:0,color:dkd_palette.cyan,lineHeight:21},","ibanValue:{flex:1,minWidth:0,color:dkd_palette.cyan,fontSize:16.5,lineHeight:23},",'iban size');
dkd_write('src/screens/PlatformFeeScreen.js',dkd_fee);

console.log('DraBornGo Panel v0.0.3 admin detail round3 patch applied.');
