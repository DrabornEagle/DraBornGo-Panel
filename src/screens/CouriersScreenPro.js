import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dkd_theme } from '../lib/theme';
import { DkdEmptyState, DkdPeriodTabs, DkdStatusPill, dkd_duration, dkd_money } from '../components/PanelComponents';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import {
  dkd_panel_fetch_courier_earnings,
  dkd_panel_fetch_couriers,
  dkd_panel_force_courier_offline,
  dkd_panel_link_courier,
  dkd_panel_search_couriers,
  dkd_panel_set_courier_rate,
  dkd_panel_unlink_courier,
} from '../services/panelService';

function DkdMoneyInput({ label, value, onChangeText }) {
  return <View style={styles.moneyInputWrap}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.moneyInputShell}>
      <TextInput
        value={value}
        onChangeText={(dkd_value) => onChangeText(dkd_value.replace(',', '.').replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#52647B"
        style={styles.moneyInput}
      />
      <Text style={styles.tl}>TL</Text>
    </View>
  </View>;
}

function DkdRateModal({ courier, onClose, onSaved }) {
  const [dkd_package, dkd_set_package] = useState(String(courier?.dkd_package_fee_tl ?? '0'));
  const [dkd_hourly, dkd_set_hourly] = useState(String(courier?.dkd_hourly_rate_tl ?? '0'));
  const [dkd_saving, dkd_set_saving] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');

  useEffect(() => {
    if (!courier) return;
    dkd_set_package(String(courier.dkd_package_fee_tl ?? '0'));
    dkd_set_hourly(String(courier.dkd_hourly_rate_tl ?? '0'));
    dkd_set_error('');
  }, [courier]);

  if (!courier) return null;

  const dkd_save = async () => {
    dkd_set_saving(true); dkd_set_error('');
    try {
      await dkd_panel_set_courier_rate(courier.dkd_courier_user_id, dkd_package, dkd_hourly);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      onSaved();
    } catch (dkd_error_value) {
      dkd_set_error(String(dkd_error_value.message || dkd_error_value));
    } finally { dkd_set_saving(false); }
  };

  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.centerBackdrop}>
      <LinearGradient colors={['#0B1727', '#111A32', '#201632']} style={styles.dialog}>
        <View style={styles.dialogHead}>
          <View style={styles.dialogIcon}><MaterialCommunityIcons name="cash-edit" size={24} color={dkd_theme.cyan} /></View>
          <View style={styles.flexOne}><Text style={styles.dialogKicker}>ÜCRET AYARLA</Text><Text style={styles.dialogTitle}>{courier.dkd_display_name}</Text></View>
          <Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={dkd_theme.text} /></Pressable>
        </View>
        <Text style={styles.dialogText}>Yeni ücret yalnızca bundan sonraki çalışma ve paketlere uygulanır. Geçmiş kazançlar eski ücret kaydıyla korunur.</Text>
        <View style={styles.moneyRow}><DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} /><DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} /></View>
        {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
        <Pressable onPress={dkd_save} disabled={dkd_saving} style={({ pressed }) => pressed && styles.buttonPressed}>
          <LinearGradient colors={['#63E6FF', '#7586FF', '#A877FF']} style={styles.primaryButton}>
            {dkd_saving ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>ÜCRETLERİ GÜNCELLE</Text><MaterialCommunityIcons name="check-decagram" size={21} color="#07121D" /></>}
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  </Modal>;
}

function DkdEarningsModal({ courier, onClose }) {
  const [dkd_data, dkd_set_data] = useState({});
  const [dkd_period, dkd_set_period] = useState('daily');
  const [dkd_loading, dkd_set_loading] = useState(true);

  useEffect(() => {
    if (!courier) return;
    dkd_set_loading(true);
    dkd_panel_fetch_courier_earnings(courier.dkd_courier_user_id).then(dkd_set_data).finally(() => dkd_set_loading(false));
  }, [courier]);

  if (!courier) return null;
  const dkd_period_data = dkd_data?.[dkd_period] || {};

  return <Modal transparent visible animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetBackdrop}>
      <LinearGradient colors={['#081321', '#0B1729', '#15152B']} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.dialogHead}>
          <View style={styles.dialogIcon}><MaterialCommunityIcons name="chart-box-outline" size={24} color={dkd_theme.green} /></View>
          <View style={styles.flexOne}><Text style={styles.dialogKicker}>KURYE KAZANÇ TABLOSU</Text><Text style={styles.dialogTitle}>{courier.dkd_display_name}</Text></View>
          <Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={dkd_theme.text} /></Pressable>
        </View>
        {dkd_loading ? <ActivityIndicator color={dkd_theme.cyan} style={styles.modalLoader} /> : <ScrollView showsVerticalScrollIndicator={false}>
          <DkdPeriodTabs value={dkd_period} onChange={dkd_set_period} />
          <LinearGradient colors={['rgba(72,215,255,.20)', 'rgba(99,102,241,.13)', 'rgba(168,85,247,.12)']} style={styles.earningsHero}>
            <Text style={styles.earningsLabel}>TOPLAM KAZANÇ</Text><Text style={styles.earningsValue}>{dkd_money(dkd_period_data.dkd_earnings_tl)}</Text><Text style={styles.earningsSub}>{dkd_period_data.dkd_completed_jobs || 0} paket • {dkd_duration(dkd_period_data.dkd_online_seconds)}</Text>
          </LinearGradient>
          <View style={styles.earningGrid}>
            <View style={styles.earningTile}><MaterialCommunityIcons name="package-variant" size={21} color={dkd_theme.yellow} /><Text style={styles.earningTileLabel}>Paket Kazancı</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_package_earnings_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="timer-outline" size={21} color={dkd_theme.cyan} /><Text style={styles.earningTileLabel}>Saatlik Kazanç</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_hourly_earnings_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="cash" size={21} color={dkd_theme.violet} /><Text style={styles.earningTileLabel}>Paket Ücreti</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_package_fee_tl || courier.dkd_package_fee_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="clock-fast" size={21} color={dkd_theme.green} /><Text style={styles.earningTileLabel}>Saatlik Sabit</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_fixed_hourly_rate_tl || courier.dkd_hourly_rate_tl)}</Text></View>
          </View>
          <Text style={styles.note}>Bu değerler DraBornGo kurye uygulamasındaki Kazanç Tablosu ile aynı Supabase hesabını kullanır.</Text>
        </ScrollView>}
      </LinearGradient>
    </View>
  </Modal>;
}

function DkdAddCourierModal({ visible, onClose, onAdded }) {
  const [dkd_query, dkd_set_query] = useState('');
  const [dkd_results, dkd_set_results] = useState([]);
  const [dkd_selected, dkd_set_selected] = useState(null);
  const [dkd_package, dkd_set_package] = useState('0');
  const [dkd_hourly, dkd_set_hourly] = useState('0');
  const [dkd_loading, dkd_set_loading] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');

  const dkd_search = async () => {
    if (dkd_query.trim().length < 3 && dkd_query.replace(/\D/g, '').length !== 11) return dkd_set_error('Ad, plaka veya e-posta için en az 3 karakter; TC için 11 hane yaz.');
    dkd_set_loading(true); dkd_set_error('');
    try { dkd_set_results(await dkd_panel_search_couriers(dkd_query)); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  };

  const dkd_add = async () => {
    if (!dkd_selected) return;
    dkd_set_loading(true); dkd_set_error('');
    try {
      await dkd_panel_link_courier(dkd_selected.dkd_courier_user_id, dkd_package, dkd_hourly);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      onAdded();
    } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  };

  const dkd_close = () => { dkd_set_query(''); dkd_set_results([]); dkd_set_selected(null); dkd_set_error(''); onClose(); };

  return <Modal transparent visible={visible} animationType="slide" onRequestClose={dkd_close}>
    <View style={styles.sheetBackdrop}>
      <LinearGradient colors={['#081321', '#0B1729', '#15152B']} style={[styles.sheet, styles.addSheet]}>
        <View style={styles.sheetHandle} />
        <View style={styles.dialogHead}>
          <View style={styles.dialogIcon}><MaterialCommunityIcons name="account-plus-outline" size={24} color={dkd_theme.cyan} /></View>
          <View style={styles.flexOne}><Text style={styles.dialogKicker}>KURYE EKLE</Text><Text style={styles.dialogTitle}>DraBornGo kuryesi ara</Text></View>
          <Pressable onPress={dkd_close} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={dkd_theme.text} /></Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchShell}><MaterialCommunityIcons name="magnify" size={21} color={dkd_theme.cyan} /><TextInput value={dkd_query} onChangeText={dkd_set_query} onSubmitEditing={dkd_search} placeholder="Ad, plaka, e-posta veya TC" placeholderTextColor="#53657C" autoCapitalize="none" style={styles.searchInput} /></View>
          <Pressable onPress={dkd_search} style={({ pressed }) => [styles.searchButton, pressed && styles.buttonPressed]}>{dkd_loading ? <ActivityIndicator color="#07121D" size="small" /> : <MaterialCommunityIcons name="arrow-right" size={22} color="#07121D" />}</Pressable>
        </View>
        <Text style={styles.searchHint}>TC yalnızca 11 haneli tam eşleşmede kullanılır; kimlik numarası panelde gösterilmez.</Text>
        {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.searchResultsScroll}>
          {dkd_results.map((dkd_item) => {
            const dkd_active = dkd_selected?.dkd_courier_user_id === dkd_item.dkd_courier_user_id;
            return <Pressable key={dkd_item.dkd_courier_user_id} disabled={dkd_item.dkd_already_linked} onPress={() => dkd_set_selected(dkd_item)} style={[styles.searchResult, dkd_active && styles.searchResultActive, dkd_item.dkd_already_linked && styles.disabled]}>
              <View style={styles.avatar}><RacingMotorcycle color={dkd_theme.cyan} accentColor="#F5FAFF" size={40} /></View>
              <View style={styles.flexOne}><Text style={styles.resultName}>{dkd_item.dkd_display_name}</Text><Text style={styles.resultSub}>{dkd_item.dkd_plate_no || 'Plaka yok'} • {dkd_item.dkd_email_masked || 'E-posta gizli'}</Text></View>
              {dkd_item.dkd_tc_exact_match && <DkdStatusPill text="TC EŞLEŞTİ" tone="green" />}
              {dkd_item.dkd_already_linked ? <DkdStatusPill text="BAĞLI" tone="yellow" /> : <MaterialCommunityIcons name={dkd_active ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={dkd_active ? dkd_theme.cyan : '#4B5D74'} />}
            </Pressable>;
          })}
        </ScrollView>
        {dkd_selected && <View style={styles.rateBlock}>
          <Text style={styles.rateTitle}>Başlangıç Ücretleri</Text>
          <View style={styles.moneyRow}><DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} /><DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} /></View>
          <Pressable onPress={dkd_add} disabled={dkd_loading}><LinearGradient colors={['#66E8FF', '#7887FF', '#A96BFF']} style={styles.primaryButton}>{dkd_loading ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>KURYENİN İŞLETMEYE BAĞLANTISINI OLUŞTUR</Text><MaterialCommunityIcons name="link-variant" size={21} color="#07121D" /></>}</LinearGradient></Pressable>
        </View>}
      </LinearGradient>
    </View>
  </Modal>;
}

export default function CouriersScreenPro({ refreshSignal = 0 }) {
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_add_open, dkd_set_add_open] = useState(false);
  const [dkd_rate_courier, dkd_set_rate_courier] = useState(null);
  const [dkd_earnings_courier, dkd_set_earnings_courier] = useState(null);
  const [dkd_error, dkd_set_error] = useState('');
  const [dkd_courier_search, dkd_set_courier_search] = useState('');
  const [dkd_visible_count, dkd_set_visible_count] = useState(5);
  const [dkd_package_counts, dkd_set_package_counts] = useState({});
  const dkd_intro_value = useRef(new Animated.Value(0)).current;
  const dkd_pulse_value = useRef(new Animated.Value(0)).current;

  const dkd_load = useCallback(async () => {
    dkd_set_refreshing(true); dkd_set_error('');
    try {
      dkd_set_couriers(await dkd_panel_fetch_couriers());
      dkd_set_package_counts({});
    }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); dkd_set_refreshing(false); }
  }, []);

  useEffect(() => { dkd_load(); }, [dkd_load, refreshSignal]);
  useEffect(() => { dkd_set_visible_count(5); }, [dkd_courier_search]);
  useEffect(() => {
    Animated.timing(dkd_intro_value, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const dkd_loop_value = Animated.loop(Animated.sequence([
      Animated.timing(dkd_pulse_value, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(dkd_pulse_value, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_intro_value, dkd_pulse_value]);

  const dkd_online = useMemo(() => dkd_couriers.filter((dkd_item) => dkd_item.dkd_is_online).length, [dkd_couriers]);
  const dkd_filtered_couriers = useMemo(() => {
    const dkd_query_value = dkd_courier_search.trim().toLocaleLowerCase('tr-TR');
    if (!dkd_query_value) return dkd_couriers;
    const dkd_compact_query_value = dkd_query_value.replace(/[^a-z0-9çğıöşü]/gi, '');
    return dkd_couriers.filter((dkd_item) => {
      const dkd_name_value = String(dkd_item.dkd_display_name || '').toLocaleLowerCase('tr-TR');
      const dkd_plate_value = String(dkd_item.dkd_plate_no || '').toLocaleLowerCase('tr-TR');
      const dkd_compact_plate_value = dkd_plate_value.replace(/[^a-z0-9çğıöşü]/gi, '');
      return dkd_name_value.includes(dkd_query_value) || dkd_plate_value.includes(dkd_query_value) || (!!dkd_compact_query_value && dkd_compact_plate_value.includes(dkd_compact_query_value));
    });
  }, [dkd_courier_search, dkd_couriers]);
  const dkd_visible_couriers = useMemo(() => dkd_filtered_couriers.slice(0, dkd_visible_count), [dkd_filtered_couriers, dkd_visible_count]);

  useEffect(() => {
    let dkd_active_value = true;
    const dkd_missing_value = dkd_visible_couriers.filter((dkd_item) => dkd_package_counts[dkd_item.dkd_courier_user_id] == null);
    if (!dkd_missing_value.length) return () => { dkd_active_value = false; };

    Promise.all(dkd_missing_value.map(async (dkd_item) => {
      try {
        const dkd_summary_value = await dkd_panel_fetch_courier_earnings(dkd_item.dkd_courier_user_id);
        return [dkd_item.dkd_courier_user_id, {
          dkd_daily_packages: Number(dkd_summary_value?.daily?.dkd_completed_jobs || 0),
          dkd_monthly_packages: Number(dkd_summary_value?.monthly?.dkd_completed_jobs || 0),
        }];
      } catch {
        return [dkd_item.dkd_courier_user_id, {
          dkd_daily_packages: Number(dkd_item?.dkd_today?.dkd_completed_jobs || 0),
          dkd_monthly_packages: 0,
        }];
      }
    })).then((dkd_entries_value) => {
      if (!dkd_active_value) return;
      dkd_set_package_counts((dkd_previous_value) => ({ ...dkd_previous_value, ...Object.fromEntries(dkd_entries_value) }));
    });

    return () => { dkd_active_value = false; };
  }, [dkd_visible_couriers, dkd_package_counts]);

  const dkd_translate_value = dkd_intro_value.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const dkd_pulse_scale_value = dkd_pulse_value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });

  const dkd_unlink = (dkd_courier) => Alert.alert('Kurye bağlantısını kaldır', `${dkd_courier.dkd_display_name} işletmeden ayrılsın mı? Geçmiş kazanç kayıtları korunur.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Bağlantıyı Kaldır', style: 'destructive', onPress: async () => { try { await dkd_panel_unlink_courier(dkd_courier.dkd_courier_user_id); await dkd_load(); } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } } },
  ]);

  const dkd_force_offline = (dkd_courier) => Alert.alert('Kuryeyi çevrimdışı yap', `${dkd_courier.dkd_display_name} şimdi çevrimdışı yapılsın mı? Saatlik çalışma sayacı bu anda durur. Kabul edilmiş aktif teslimat varsa iptal edilmez.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çevrimdışı Yap', style: 'destructive', onPress: async () => { try { await dkd_panel_force_courier_offline(dkd_courier.dkd_courier_user_id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null); await dkd_load(); } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } } },
  ]);

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator color={dkd_theme.cyan} size="large" /></View>;

  return <View style={styles.root}>
    <ScrollView refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={dkd_load} tintColor={dkd_theme.cyan} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={{ opacity: dkd_intro_value, transform: [{ translateY: dkd_translate_value }] }}>
        <LinearGradient colors={['#09233A', '#102C59', '#2A1850']} style={styles.heroCard}>
          <View style={styles.heroGlowOne} /><View style={styles.heroGlowTwo} />
          <View style={styles.heroTopRow}>
            <LinearGradient colors={['#071D30', '#102D49']} style={styles.heroIcon}><RacingMotorcycle color="#68EAFF" accentColor="#F5FAFF" size={54} /></LinearGradient>
            <View style={styles.heroCopy}><Text style={styles.pageKicker}>EKİP YÖNETİMİ</Text><Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>Kuryeler</Text></View>
            <Pressable onPress={() => dkd_set_add_open(true)} style={({ pressed }) => [styles.addButtonWrap, pressed && styles.buttonPressed]}><LinearGradient colors={['#69EAFF', '#7CC8FF', '#A78BFA']} style={styles.addButton}><MaterialCommunityIcons name="account-plus" size={22} color="#07121D" /><Text style={styles.addButtonText}>Kurye Ekle</Text></LinearGradient></Pressable>
          </View>
          <Text style={styles.pageSub}>Bağlı ekibini, çalışma durumunu ve ücretlerini tek ekrandan yönet.</Text>
          <View style={styles.heroStatRow}>
            <View style={styles.heroStat}><Animated.View style={[styles.onlineDot, { transform: [{ scale: dkd_pulse_scale_value }] }]} /><View><Text style={styles.heroStatLabel}>ÇEVRİMİÇİ</Text><Text style={styles.heroStatValue}>{dkd_online}</Text></View></View>
            <View style={styles.heroStat}><View style={styles.totalDot}><RacingMotorcycle color="#8EDBFF" accentColor="#F5FAFF" size={31} /></View><View><Text style={styles.heroStatLabel}>BAĞLI KURYE</Text><Text style={styles.heroStatValue}>{dkd_couriers.length}</Text></View></View>
          </View>
        </LinearGradient>

        <LinearGradient colors={['rgba(20,42,72,.97)', 'rgba(20,28,53,.97)']} style={styles.teamSearchCard}>
          <View style={styles.teamSearchIcon}><MaterialCommunityIcons name="account-search-outline" size={23} color="#70EAFF" /></View>
          <TextInput value={dkd_courier_search} onChangeText={dkd_set_courier_search} placeholder="Kurye adı veya plaka ara" placeholderTextColor="#7186A4" autoCapitalize="none" autoCorrect={false} style={styles.teamSearchInput} />
          {!!dkd_courier_search && <Pressable onPress={() => dkd_set_courier_search('')} style={styles.teamSearchClear}><MaterialCommunityIcons name="close" size={19} color="#B8CBE2" /></Pressable>}
        </LinearGradient>
        <View style={styles.listMetaRow}><Text style={styles.listMetaText}>{dkd_filtered_couriers.length} kurye bulundu</Text><Text style={styles.listMetaText}>Gösterilen {Math.min(dkd_visible_count, dkd_filtered_couriers.length)}/{dkd_filtered_couriers.length}</Text></View>

        {!!dkd_error && <View style={styles.errorCard}><MaterialCommunityIcons name="alert-circle-outline" size={21} color="#FF9EAA" /><Text style={styles.errorText}>{dkd_error}</Text></View>}

        {dkd_filtered_couriers.length === 0 ? <DkdEmptyState icon="account-search-outline" title={dkd_courier_search ? 'Kurye bulunamadı' : 'Henüz bağlı kurye yok'} text={dkd_courier_search ? 'Bu isim veya plakayla eşleşen bağlı kurye bulunamadı.' : 'Kurye Ekle ile DraBornGo kullanıcılarını işletmene bağlayabilirsin.'} /> : dkd_visible_couriers.map((dkd_courier) => {
          const dkd_counts_value = dkd_package_counts[dkd_courier.dkd_courier_user_id] || {};
          return <LinearGradient key={dkd_courier.dkd_courier_user_id} colors={dkd_courier.dkd_is_online ? ['#0A2631', '#111E3C', '#261B49'] : ['#111A2A', '#111827', '#17172D']} style={styles.courierCard}>
            <View style={[styles.cardAccent, { backgroundColor: dkd_courier.dkd_is_online ? '#62F0B6' : '#6F8FB8' }]} />
            <View style={styles.courierTop}>
              <LinearGradient colors={dkd_courier.dkd_is_online ? ['#0B2D39', '#15304A'] : ['#202B3E', '#182235']} style={styles.avatarLarge}><RacingMotorcycle color={dkd_courier.dkd_is_online ? '#62F0D0' : '#7895B8'} accentColor="#F5FAFF" size={57} /></LinearGradient>
              <View style={styles.courierCopy}><View style={styles.nameRow}><Text style={styles.courierName}>{dkd_courier.dkd_display_name}</Text><DkdStatusPill text={dkd_courier.dkd_is_online ? 'ONLINE' : 'OFFLINE'} tone={dkd_courier.dkd_is_online ? 'green' : 'blue'} /></View><Text style={styles.courierSub}>{dkd_courier.dkd_plate_no || 'Plaka yok'} • {dkd_courier.dkd_email_masked || ''}</Text><Text style={styles.courierTiny}>{dkd_courier.dkd_city || 'Bölge yok'} • Bağlandı {new Date(dkd_courier.dkd_linked_at).toLocaleDateString('tr-TR')}</Text></View>
            </View>
            <View style={styles.rateGrid}>
              <LinearGradient colors={['rgba(255,194,92,.17)', 'rgba(255,132,78,.07)']} style={styles.rateTile}><MaterialCommunityIcons name="package-variant-closed-check" size={20} color="#FFD071" /><Text style={styles.rateLabel}>GÜNLÜK PAKET</Text><Text style={styles.rateValue}>{dkd_counts_value.dkd_daily_packages ?? Number(dkd_courier?.dkd_today?.dkd_completed_jobs || 0)}</Text></LinearGradient>
              <LinearGradient colors={['rgba(91,222,255,.18)', 'rgba(70,124,255,.08)']} style={styles.rateTile}><MaterialCommunityIcons name="calendar-month-outline" size={20} color="#77EAFF" /><Text style={styles.rateLabel}>AYLIK PAKET</Text><Text style={styles.rateValue}>{dkd_counts_value.dkd_monthly_packages ?? 0}</Text></LinearGradient>
              <LinearGradient colors={['rgba(115,240,178,.18)', 'rgba(72,199,144,.07)']} style={styles.rateTile}><MaterialCommunityIcons name="cash-fast" size={20} color="#72F0B2" /><Text style={styles.rateLabel}>BUGÜN</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_today?.dkd_earnings_tl)}</Text></LinearGradient>
            </View>
            {dkd_courier.dkd_is_online ? <Pressable onPress={() => dkd_force_offline(dkd_courier)} style={({ pressed }) => [styles.offlinePressable, pressed && styles.buttonPressed]}><LinearGradient colors={['rgba(255,184,77,.18)', 'rgba(255,91,126,.12)']} style={styles.offlineButton}><View style={styles.offlineIcon}><MaterialCommunityIcons name="power" size={24} color="#FFD18B" /></View><View style={styles.flexOne}><Text style={styles.offlineButtonTitle}>Çevrimdışı Yap</Text><Text style={styles.offlineButtonSub}>Mesai sayacını şimdi durdur</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color="#FFD18B" /></LinearGradient></Pressable> : <View style={styles.offlineInfo}><MaterialCommunityIcons name="weather-night" size={20} color="#8EA7C9" /><Text style={styles.offlineInfoText}>Kurye şu anda mesaide değil</Text></View>}
            <View style={styles.actionRow}>
              <Pressable onPress={() => dkd_set_earnings_courier(dkd_courier)} style={[styles.actionButton, styles.actionEarn]}><MaterialCommunityIcons name="chart-line" size={22} color="#62F0B6" /><Text style={styles.actionText}>Kazanç</Text></Pressable>
              <Pressable onPress={() => dkd_set_rate_courier(dkd_courier)} style={[styles.actionButton, styles.actionRate]}><MaterialCommunityIcons name="cash-edit" size={22} color="#6DEBFF" /><Text style={styles.actionText}>Ücret</Text></Pressable>
              <Pressable onPress={() => dkd_unlink(dkd_courier)} style={[styles.actionButton, styles.actionUnlink]}><MaterialCommunityIcons name="link-variant-off" size={22} color="#FF8FA3" /><Text style={[styles.actionText, styles.actionTextDanger]}>Ayır</Text></Pressable>
            </View>
          </LinearGradient>;
        })}

        {dkd_filtered_couriers.length > dkd_visible_count && <Pressable onPress={() => { Haptics.selectionAsync().catch(() => null); dkd_set_visible_count((dkd_value) => dkd_value + 5); }} style={({ pressed }) => [styles.moreButtonWrap, pressed && styles.buttonPressed]}><LinearGradient colors={['rgba(93,232,255,.18)', 'rgba(119,134,255,.16)', 'rgba(168,107,255,.14)']} style={styles.moreButton}><MaterialCommunityIcons name="chevron-double-down" size={23} color="#87EDFF" /><View style={styles.flexOne}><Text style={styles.moreButtonTitle}>Daha Fazla</Text><Text style={styles.moreButtonSub}>5 kurye daha göster</Text></View><Text style={styles.moreRemaining}>{Math.max(0, dkd_filtered_couriers.length - dkd_visible_count)} kaldı</Text></LinearGradient></Pressable>}
      </Animated.View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
    <DkdAddCourierModal visible={dkd_add_open} onClose={() => dkd_set_add_open(false)} onAdded={() => { dkd_set_add_open(false); dkd_load(); }} />
    <DkdRateModal courier={dkd_rate_courier} onClose={() => dkd_set_rate_courier(null)} onSaved={() => { dkd_set_rate_courier(null); dkd_load(); }} />
    <DkdEarningsModal courier={dkd_earnings_courier} onClose={() => dkd_set_earnings_courier(null)} />
  </View>;
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 }, root: { flex: 1, backgroundColor: '#030812' }, content: { padding: 15, paddingTop: 16 }, loader: { flex: 1, backgroundColor: '#030812', alignItems: 'center', justifyContent: 'center' }, modalLoader: { margin: 30 }, bottomSpacer: { height: 120 },
  heroCard: { borderRadius: 30, padding: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(128,229,255,.17)' }, heroGlowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 999, right: -80, top: -90, backgroundColor: 'rgba(105,234,255,.11)' }, heroGlowTwo: { position: 'absolute', width: 160, height: 160, borderRadius: 999, left: -90, bottom: -100, backgroundColor: 'rgba(167,139,250,.11)' }, heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, heroIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, heroCopy: { flex: 1, minWidth: 0 }, pageKicker: { color: '#9EF4FF', fontSize: 13.5, fontWeight: '900', letterSpacing: 1.3 }, pageTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '900', marginTop: 2, letterSpacing: -.65 }, pageSub: { color: '#B7C8DF', fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 13 }, addButtonWrap: { borderRadius: 18, overflow: 'hidden' }, addButton: { minHeight: 52, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, addButtonText: { color: '#07121D', fontSize: 14, fontWeight: '900' }, heroStatRow: { flexDirection: 'row', gap: 10, marginTop: 17 }, heroStat: { flex: 1, minHeight: 64, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(2,10,24,.30)', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)' }, onlineDot: { width: 13, height: 13, borderRadius: 99, backgroundColor: '#62F0B6' }, totalDot: { width: 38, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(141,165,255,.12)', overflow: 'visible' }, heroStatLabel: { color: '#91A5BF', fontSize: 12.5, fontWeight: '900', letterSpacing: .7 }, heroStatValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 1 },
  teamSearchCard: { minHeight: 60, borderRadius: 20, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(109,232,255,.15)' }, teamSearchIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(105,234,255,.09)' }, teamSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 15.5, fontWeight: '800', paddingVertical: 0 }, teamSearchClear: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.05)' }, listMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 11 }, listMetaText: { color: '#8195B0', fontSize: 12.5, fontWeight: '800' },
  errorCard: { minHeight: 50, paddingHorizontal: 13, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,93,119,.09)', borderWidth: 1, borderColor: 'rgba(255,113,139,.18)', marginBottom: 12 }, errorText: { flex: 1, color: '#FFB0BA', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  courierCard: { borderRadius: 28, padding: 15, marginBottom: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(151,200,255,.13)' }, cardAccent: { position: 'absolute', left: 0, top: 24, bottom: 24, width: 4, borderTopRightRadius: 6, borderBottomRightRadius: 6 }, courierTop: { flexDirection: 'row', gap: 13, alignItems: 'center' }, avatarLarge: { width: 70, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, courierCopy: { flex: 1, minWidth: 0 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, courierName: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '900', flex: 1 }, courierSub: { color: '#B9C9DF', fontSize: 14.5, lineHeight: 20, fontWeight: '700', marginTop: 4 }, courierTiny: { color: '#8295AF', fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 3 }, rateGrid: { flexDirection: 'row', gap: 8, marginTop: 15 }, rateTile: { flex: 1, minHeight: 92, borderRadius: 19, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', overflow: 'hidden' }, rateLabel: { color: '#B0BED0', fontSize: 12.5, fontWeight: '900', letterSpacing: .45, marginTop: 8 }, rateValue: { color: '#FFFFFF', fontSize: 20, lineHeight: 24, fontWeight: '900', marginTop: 4 },
  offlinePressable: { marginTop: 12, borderRadius: 19, overflow: 'hidden' }, offlineButton: { minHeight: 68, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(255,193,116,.18)' }, offlineIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,195,106,.12)' }, offlineButtonTitle: { color: '#FFE2AE', fontSize: 15.5, lineHeight: 20, fontWeight: '900' }, offlineButtonSub: { color: '#D3B992', fontSize: 13.5, lineHeight: 18, fontWeight: '700', marginTop: 2 }, offlineInfo: { minHeight: 48, marginTop: 12, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(121,149,190,.07)', borderWidth: 1, borderColor: 'rgba(121,149,190,.10)' }, offlineInfoText: { color: '#8EA7C9', fontSize: 13.5, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.09)' }, actionButton: { flex: 1, minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1 }, actionEarn: { backgroundColor: 'rgba(98,240,182,.08)', borderColor: 'rgba(98,240,182,.12)' }, actionRate: { backgroundColor: 'rgba(109,235,255,.08)', borderColor: 'rgba(109,235,255,.12)' }, actionUnlink: { backgroundColor: 'rgba(255,95,126,.07)', borderColor: 'rgba(255,95,126,.12)' }, actionText: { color: '#D7E5F6', fontSize: 14, fontWeight: '900' }, actionTextDanger: { color: '#FF9EAA' },
  moreButtonWrap: { borderRadius: 20, overflow: 'hidden', marginTop: 2, marginBottom: 12 }, moreButton: { minHeight: 64, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(118,229,255,.16)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15 }, moreButtonTitle: { color: '#E8FAFF', fontSize: 15, fontWeight: '900' }, moreButtonSub: { color: '#8EA6C4', fontSize: 12.5, fontWeight: '700', marginTop: 2 }, moreRemaining: { color: '#99EFFF', fontSize: 12.5, fontWeight: '900' }, buttonPressed: { opacity: .72, transform: [{ scale: .985 }] },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.68)' }, sheet: { backgroundColor: '#08111E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16, maxHeight: '88%', borderWidth: 1, borderColor: dkd_theme.border }, addSheet: { maxHeight: '92%' }, sheetHandle: { width: 46, height: 5, backgroundColor: '#35445A', borderRadius: 9, alignSelf: 'center', marginBottom: 14 }, centerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,.70)' }, dialog: { width: '100%', borderRadius: 27, padding: 16, backgroundColor: '#0A1423', borderWidth: 1, borderColor: dkd_theme.border }, dialogHead: { flexDirection: 'row', alignItems: 'center', gap: 11 }, dialogIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(102,232,255,.09)' }, dialogKicker: { color: dkd_theme.cyan, fontSize: 13.5, fontWeight: '900', letterSpacing: 1 }, dialogTitle: { color: dkd_theme.text, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 2 }, dialogText: { color: dkd_theme.textSoft, fontSize: 14, lineHeight: 20, fontWeight: '700', marginVertical: 13 }, closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' }, moneyRow: { flexDirection: 'row', gap: 9 }, moneyInputWrap: { flex: 1 }, inputLabel: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: .6, marginBottom: 6 }, moneyInputShell: { minHeight: 54, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,.04)', borderWidth: 1, borderColor: dkd_theme.border }, moneyInput: { flex: 1, color: dkd_theme.text, fontSize: 16, fontWeight: '900', paddingVertical: 0 }, tl: { color: dkd_theme.cyan, fontSize: 13.5, fontWeight: '900' }, primaryButton: { minHeight: 56, borderRadius: 18, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 }, primaryButtonText: { color: '#07121D', fontSize: 14, fontWeight: '900', textAlign: 'center' }, searchRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, searchShell: { flex: 1, minHeight: 54, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,.04)', borderWidth: 1, borderColor: dkd_theme.border }, searchInput: { flex: 1, color: dkd_theme.text, fontSize: 15, fontWeight: '700' }, searchButton: { width: 55, height: 55, borderRadius: 18, backgroundColor: dkd_theme.cyan, alignItems: 'center', justifyContent: 'center' }, searchHint: { color: dkd_theme.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 8 }, searchResultsScroll: { maxHeight: 330 }, searchResult: { minHeight: 74, borderRadius: 19, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, searchResultActive: { borderColor: 'rgba(102,232,255,.55)', backgroundColor: 'rgba(102,232,255,.06)' }, disabled: { opacity: .45 }, avatar: { width: 48, height: 44, borderRadius: 15, backgroundColor: 'rgba(102,232,255,.08)', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, resultName: { color: dkd_theme.text, fontSize: 15, fontWeight: '900' }, resultSub: { color: dkd_theme.textSoft, fontSize: 13.5, lineHeight: 18, fontWeight: '700', marginTop: 3 }, rateBlock: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: dkd_theme.border }, rateTitle: { color: dkd_theme.text, fontSize: 16, fontWeight: '900', marginBottom: 10 }, earningsHero: { minHeight: 135, borderRadius: 23, marginTop: 11, padding: 16, borderWidth: 1, borderColor: 'rgba(102,232,255,.12)' }, earningsLabel: { color: '#88DAE7', fontSize: 13.5, fontWeight: '900', letterSpacing: .8 }, earningsValue: { color: dkd_theme.text, fontSize: 31, lineHeight: 38, fontWeight: '900', marginTop: 8 }, earningsSub: { color: dkd_theme.textSoft, fontSize: 14, fontWeight: '700', marginTop: 6 }, earningGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 }, earningTile: { width: '48.5%', minHeight: 102, borderRadius: 19, padding: 12, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, earningTileLabel: { color: dkd_theme.muted, fontSize: 13.5, fontWeight: '900', marginTop: 7 }, earningTileValue: { color: dkd_theme.text, fontSize: 16, fontWeight: '900', marginTop: 5 }, note: { color: dkd_theme.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 11, marginBottom: 20 },
});
