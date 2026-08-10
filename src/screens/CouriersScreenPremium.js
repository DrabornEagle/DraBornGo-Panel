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
  return (
    <View style={styles.moneyInputWrap}>
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
    </View>
  );
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
    dkd_set_saving(true);
    dkd_set_error('');
    try {
      await dkd_panel_set_courier_rate(courier.dkd_courier_user_id, dkd_package, dkd_hourly);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      onSaved();
    } catch (dkd_error_value) {
      dkd_set_error(String(dkd_error_value.message || dkd_error_value));
    } finally {
      dkd_set_saving(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerBackdrop}>
        <LinearGradient colors={['#0B1727', '#111A32', '#201632']} style={styles.dialog}>
          <View style={styles.dialogHead}>
            <LinearGradient colors={['rgba(105,234,255,.22)', 'rgba(122,134,255,.12)']} style={styles.dialogIcon}>
              <MaterialCommunityIcons name="cash-edit" size={24} color={dkd_theme.cyan} />
            </LinearGradient>
            <View style={styles.flexOne}>
              <Text style={styles.dialogKicker}>ÜCRET AYARLA</Text>
              <Text style={styles.dialogTitle}>{courier.dkd_display_name}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={dkd_theme.text} /></Pressable>
          </View>
          <Text style={styles.dialogText}>Yeni ücret yalnızca bundan sonraki çalışma ve paketlere uygulanır. Geçmiş kazançlar eski ücret kaydıyla korunur.</Text>
          <View style={styles.moneyRow}>
            <DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} />
            <DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} />
          </View>
          {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
          <Pressable onPress={dkd_save} disabled={dkd_saving} style={({ pressed }) => pressed && styles.buttonPressed}>
            <LinearGradient colors={['#63E6FF', '#7586FF', '#A877FF']} style={styles.primaryButton}>
              {dkd_saving ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>ÜCRETLERİ GÜNCELLE</Text><MaterialCommunityIcons name="check-decagram" size={21} color="#07121D" /></>}
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
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

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
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
              <Text style={styles.earningsLabel}>TOPLAM KAZANÇ</Text>
              <Text style={styles.earningsValue}>{dkd_money(dkd_period_data.dkd_earnings_tl)}</Text>
              <Text style={styles.earningsSub}>{dkd_period_data.dkd_completed_jobs || 0} paket • {dkd_duration(dkd_period_data.dkd_online_seconds)}</Text>
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
    </Modal>
  );
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
    if (dkd_query.trim().length < 3 && dkd_query.replace(/\D/g, '').length !== 11) {
      dkd_set_error('Ad, plaka veya e-posta için en az 3 karakter; TC için 11 hane yaz.');
      return;
    }
    dkd_set_loading(true);
    dkd_set_error('');
    try {
      dkd_set_results(await dkd_panel_search_couriers(dkd_query));
    } catch (dkd_error_value) {
      dkd_set_error(String(dkd_error_value.message || dkd_error_value));
    } finally {
      dkd_set_loading(false);
    }
  };

  const dkd_add = async () => {
    if (!dkd_selected) return;
    dkd_set_loading(true);
    dkd_set_error('');
    try {
      await dkd_panel_link_courier(dkd_selected.dkd_courier_user_id, dkd_package, dkd_hourly);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      onAdded();
    } catch (dkd_error_value) {
      dkd_set_error(String(dkd_error_value.message || dkd_error_value));
    } finally {
      dkd_set_loading(false);
    }
  };

  const dkd_reset_close = () => {
    dkd_set_query('');
    dkd_set_results([]);
    dkd_set_selected(null);
    dkd_set_error('');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={dkd_reset_close}>
      <View style={styles.sheetBackdrop}>
        <LinearGradient colors={['#081321', '#0B1729', '#15152B']} style={[styles.sheet, styles.addSheet]}>
          <View style={styles.sheetHandle} />
          <View style={styles.dialogHead}>
            <View style={styles.dialogIcon}><MaterialCommunityIcons name="account-plus-outline" size={24} color={dkd_theme.cyan} /></View>
            <View style={styles.flexOne}><Text style={styles.dialogKicker}>KURYE EKLE</Text><Text style={styles.dialogTitle}>DraBornGo kuryesi ara</Text></View>
            <Pressable onPress={dkd_reset_close} style={styles.closeButton}><MaterialCommunityIcons name="close" size={21} color={dkd_theme.text} /></Pressable>
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
              return (
                <Pressable key={dkd_item.dkd_courier_user_id} disabled={dkd_item.dkd_already_linked} onPress={() => dkd_set_selected(dkd_item)} style={[styles.searchResult, dkd_active && styles.searchResultActive, dkd_item.dkd_already_linked && styles.disabled]}>
                  <View style={styles.avatar}><MaterialCommunityIcons name="motorbike" size={22} color={dkd_theme.cyan} /></View>
                  <View style={styles.flexOne}><Text style={styles.resultName}>{dkd_item.dkd_display_name}</Text><Text style={styles.resultSub}>{dkd_item.dkd_plate_no || 'Plaka yok'} • {dkd_item.dkd_email_masked || 'E-posta gizli'}</Text></View>
                  {dkd_item.dkd_tc_exact_match && <DkdStatusPill text="TC EŞLEŞTİ" tone="green" />}
                  {dkd_item.dkd_already_linked ? <DkdStatusPill text="BAĞLI" tone="yellow" /> : <MaterialCommunityIcons name={dkd_active ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={dkd_active ? dkd_theme.cyan : '#4B5D74'} />}
                </Pressable>
              );
            })}
          </ScrollView>
          {dkd_selected && <View style={styles.rateBlock}>
            <Text style={styles.rateTitle}>Başlangıç Ücretleri</Text>
            <View style={styles.moneyRow}><DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} /><DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} /></View>
            <Pressable onPress={dkd_add} disabled={dkd_loading} style={({ pressed }) => pressed && styles.buttonPressed}>
              <LinearGradient colors={['#66E8FF', '#7887FF', '#A96BFF']} style={styles.primaryButton}>{dkd_loading ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>KURYENİN İŞLETMEYE BAĞLANTISINI OLUŞTUR</Text><MaterialCommunityIcons name="link-variant" size={21} color="#07121D" /></>}</LinearGradient>
            </Pressable>
          </View>}
        </LinearGradient>
      </View>
    </Modal>
  );
}

export default function CouriersScreenPremium({ refreshSignal = 0 }) {
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_add_open, dkd_set_add_open] = useState(false);
  const [dkd_rate_courier, dkd_set_rate_courier] = useState(null);
  const [dkd_earnings_courier, dkd_set_earnings_courier] = useState(null);
  const [dkd_error, dkd_set_error] = useState('');
  const dkd_intro_value = useRef(new Animated.Value(0)).current;
  const dkd_pulse_value = useRef(new Animated.Value(0)).current;

  const dkd_load = useCallback(async () => {
    dkd_set_refreshing(true);
    dkd_set_error('');
    try {
      dkd_set_couriers(await dkd_panel_fetch_couriers());
    } catch (dkd_error_value) {
      dkd_set_error(String(dkd_error_value.message || dkd_error_value));
    } finally {
      dkd_set_loading(false);
      dkd_set_refreshing(false);
    }
  }, []);

  useEffect(() => { dkd_load(); }, [dkd_load, refreshSignal]);
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
  const dkd_intro_translate_value = dkd_intro_value.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const dkd_pulse_scale_value = dkd_pulse_value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });

  const dkd_unlink = (dkd_courier) => Alert.alert('Kurye bağlantısını kaldır', `${dkd_courier.dkd_display_name} işletmeden ayrılsın mı? Geçmiş kazanç kayıtları korunur.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Bağlantıyı Kaldır', style: 'destructive', onPress: async () => {
      try { await dkd_panel_unlink_courier(dkd_courier.dkd_courier_user_id); await dkd_load(); }
      catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    } },
  ]);

  const dkd_force_offline = (dkd_courier) => Alert.alert(
    'Kuryeyi çevrimdışı yap',
    `${dkd_courier.dkd_display_name} şimdi çevrimdışı yapılsın mı? Saatlik çalışma sayacı bu anda durur. Kabul edilmiş aktif teslimat varsa iptal edilmez.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çevrimdışı Yap', style: 'destructive', onPress: async () => {
        try {
          await dkd_panel_force_courier_offline(dkd_courier.dkd_courier_user_id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
          await dkd_load();
        } catch (dkd_error_value) {
          dkd_set_error(String(dkd_error_value.message || dkd_error_value));
        }
      } },
    ],
  );

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator color={dkd_theme.cyan} size="large" /></View>;

  return (
    <View style={styles.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={dkd_load} tintColor={dkd_theme.cyan} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: dkd_intro_value, transform: [{ translateY: dkd_intro_translate_value }] }}>
          <LinearGradient colors={['#09233A', '#102C59', '#2A1850']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroGlowOne} /><View style={styles.heroGlowTwo} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}><MaterialCommunityIcons name="account-group" size={31} color="#07121D" /></View>
              <View style={styles.heroCopy}><Text style={styles.pageKicker}>EKİP YÖNETİMİ</Text><Text style={styles.pageTitle}>Kuryeler</Text></View>
              <Pressable onPress={() => dkd_set_add_open(true)} style={({ pressed }) => [styles.addButtonWrap, pressed && styles.buttonPressed]}><LinearGradient colors={['#69EAFF', '#7CC8FF', '#A78BFA']} style={styles.addButton}><MaterialCommunityIcons name="account-plus" size={23} color="#07121D" /><Text style={styles.addButtonText}>Kurye Ekle</Text></LinearGradient></Pressable>
            </View>
            <Text style={styles.pageSub}>Bağlı ekibini, çalışma durumunu ve ücretlerini tek ekrandan yönet.</Text>
            <View style={styles.heroStatRow}>
              <View style={styles.heroStat}><Animated.View style={[styles.onlineDot, { transform: [{ scale: dkd_pulse_scale_value }] }]} /><View><Text style={styles.heroStatLabel}>ÇEVRİMİÇİ</Text><Text style={styles.heroStatValue}>{dkd_online}</Text></View></View>
              <View style={styles.heroStat}><View style={styles.totalDot}><MaterialCommunityIcons name="motorbike" size={17} color="#BFD5FF" /></View><View><Text style={styles.heroStatLabel}>BAĞLI KURYE</Text><Text style={styles.heroStatValue}>{dkd_couriers.length}</Text></View></View>
            </View>
          </LinearGradient>

          {!!dkd_error && <View style={styles.errorCard}><MaterialCommunityIcons name="alert-circle-outline" size={21} color="#FF9EAA" /><Text style={styles.errorText}>{dkd_error}</Text></View>}

          {dkd_couriers.length === 0 ? <DkdEmptyState icon="account-group-outline" title="Henüz bağlı kurye yok" text="Kurye Ekle ile DraBornGo kullanıcılarını ad, plaka, e-posta veya tam TC eşleşmesiyle bulabilirsin." /> : dkd_couriers.map((dkd_courier) => (
            <LinearGradient key={dkd_courier.dkd_courier_user_id} colors={dkd_courier.dkd_is_online ? ['#0A2631', '#111E3C', '#261B49'] : ['#111A2A', '#111827', '#17172D']} style={styles.courierCard}>
              <View style={[styles.cardAccent, { backgroundColor: dkd_courier.dkd_is_online ? '#62F0B6' : '#6F8FB8' }]} />
              <View style={styles.courierTop}>
                <LinearGradient colors={dkd_courier.dkd_is_online ? ['#5DE8FF', '#61F0B5'] : ['#31405B', '#263047']} style={styles.avatarLarge}><MaterialCommunityIcons name="motorbike" size={29} color={dkd_courier.dkd_is_online ? '#06151B' : '#B6C7DE'} /></LinearGradient>
                <View style={styles.courierCopy}>
                  <View style={styles.nameRow}><Text style={styles.courierName}>{dkd_courier.dkd_display_name}</Text><DkdStatusPill text={dkd_courier.dkd_is_online ? 'ONLINE' : 'OFFLINE'} tone={dkd_courier.dkd_is_online ? 'green' : 'blue'} /></View>
                  <Text style={styles.courierSub}>{dkd_courier.dkd_plate_no || 'Plaka yok'} • {dkd_courier.dkd_email_masked || ''}</Text>
                  <Text style={styles.courierTiny}>{dkd_courier.dkd_city || 'Bölge yok'} • Bağlandı {new Date(dkd_courier.dkd_linked_at).toLocaleDateString('tr-TR')}</Text>
                </View>
              </View>

              <View style={styles.rateGrid}>
                <LinearGradient colors={['rgba(255,194,92,.17)', 'rgba(255,132,78,.07)']} style={styles.rateTile}><MaterialCommunityIcons name="package-variant-closed" size={20} color="#FFD071" /><Text style={styles.rateLabel}>PAKET BAŞI</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_package_fee_tl)}</Text></LinearGradient>
                <LinearGradient colors={['rgba(91,222,255,.18)', 'rgba(70,124,255,.08)']} style={styles.rateTile}><MaterialCommunityIcons name="timer-outline" size={20} color="#77EAFF" /><Text style={styles.rateLabel}>SAATLİK SABİT</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_hourly_rate_tl)}</Text></LinearGradient>
                <LinearGradient colors={['rgba(115,240,178,.18)', 'rgba(72,199,144,.07)']} style={styles.rateTile}><MaterialCommunityIcons name="cash-fast" size={20} color="#72F0B2" /><Text style={styles.rateLabel}>BUGÜN</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_today?.dkd_earnings_tl)}</Text></LinearGradient>
              </View>

              {dkd_courier.dkd_is_online ? <Pressable onPress={() => dkd_force_offline(dkd_courier)} style={({ pressed }) => [styles.offlinePressable, pressed && styles.buttonPressed]}><LinearGradient colors={['rgba(255,184,77,.18)', 'rgba(255,91,126,.12)']} style={styles.offlineButton}><View style={styles.offlineIcon}><MaterialCommunityIcons name="power" size={24} color="#FFD18B" /></View><View style={styles.flexOne}><Text style={styles.offlineButtonTitle}>Çevrimdışı Yap</Text><Text style={styles.offlineButtonSub}>Mesai sayacını şimdi durdur</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color="#FFD18B" /></LinearGradient></Pressable> : <View style={styles.offlineInfo}><MaterialCommunityIcons name="weather-night" size={20} color="#8EA7C9" /><Text style={styles.offlineInfoText}>Kurye şu anda mesaide değil</Text></View>}

              <View style={styles.actionRow}>
                <Pressable onPress={() => dkd_set_earnings_courier(dkd_courier)} style={({ pressed }) => [styles.actionButton, styles.actionEarn, pressed && styles.buttonPressed]}><MaterialCommunityIcons name="chart-line" size={22} color="#62F0B6" /><Text style={styles.actionText}>Kazanç</Text></Pressable>
                <Pressable onPress={() => dkd_set_rate_courier(dkd_courier)} style={({ pressed }) => [styles.actionButton, styles.actionRate, pressed && styles.buttonPressed]}><MaterialCommunityIcons name="cash-edit" size={22} color="#6DEBFF" /><Text style={styles.actionText}>Ücret</Text></Pressable>
                <Pressable onPress={() => dkd_unlink(dkd_courier)} style={({ pressed }) => [styles.actionButton, styles.actionUnlink, pressed && styles.buttonPressed]}><MaterialCommunityIcons name="link-variant-off" size={22} color="#FF8FA3" /><Text style={[styles.actionText, styles.actionTextDanger]}>Ayır</Text></Pressable>
              </View>
            </LinearGradient>
          ))}
        </Animated.View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <DkdAddCourierModal visible={dkd_add_open} onClose={() => dkd_set_add_open(false)} onAdded={() => { dkd_set_add_open(false); dkd_load(); }} />
      <DkdRateModal courier={dkd_rate_courier} onClose={() => dkd_set_rate_courier(null)} onSaved={() => { dkd_set_rate_courier(null); dkd_load(); }} />
      <DkdEarningsModal courier={dkd_earnings_courier} onClose={() => dkd_set_earnings_courier(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  root: { flex: 1, backgroundColor: '#030812' },
  content: { padding: 15, paddingTop: 16 },
  loader: { flex: 1, backgroundColor: '#030812', alignItems: 'center', justifyContent: 'center' },
  modalLoader: { margin: 30 },
  bottomSpacer: { height: 120 },
  heroCard: { borderRadius: 30, padding: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(128,229,255,.17)' },
  heroGlowOne: { position: 'absolute', width: 190, height: 190, borderRadius: 999, right: -80, top: -90, backgroundColor: 'rgba(105,234,255,.11)' },
  heroGlowTwo: { position: 'absolute', width: 160, height: 160, borderRadius: 999, left: -90, bottom: -100, backgroundColor: 'rgba(167,139,250,.11)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#6DEBFF', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  pageKicker: { color: '#9EF4FF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  pageTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 2, letterSpacing: -.8 },
  pageSub: { color: '#B7C8DF', fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 13 },
  addButtonWrap: { borderRadius: 18, overflow: 'hidden' },
  addButton: { minHeight: 52, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addButtonText: { color: '#07121D', fontSize: 14, fontWeight: '900' },
  heroStatRow: { flexDirection: 'row', gap: 10, marginTop: 17 },
  heroStat: { flex: 1, minHeight: 64, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(2,10,24,.30)', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)' },
  onlineDot: { width: 13, height: 13, borderRadius: 99, backgroundColor: '#62F0B6' },
  totalDot: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(141,165,255,.12)' },
  heroStatLabel: { color: '#91A5BF', fontSize: 12.5, fontWeight: '900', letterSpacing: .7 },
  heroStatValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 1 },
  errorCard: { minHeight: 50, paddingHorizontal: 13, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,93,119,.09)', borderWidth: 1, borderColor: 'rgba(255,113,139,.18)', marginBottom: 12 },
  errorText: { flex: 1, color: '#FFB0BA', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  courierCard: { borderRadius: 28, padding: 15, marginBottom: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(151,200,255,.13)' },
  cardAccent: { position: 'absolute', left: 0, top: 24, bottom: 24, width: 4, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  courierTop: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  avatarLarge: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  courierCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courierName: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '900', flex: 1 },
  courierSub: { color: '#B9C9DF', fontSize: 14.5, lineHeight: 20, fontWeight: '700', marginTop: 4 },
  courierTiny: { color: '#8295AF', fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 3 },
  rateGrid: { flexDirection: 'row', gap: 8, marginTop: 15 },
  rateTile: { flex: 1, minHeight: 92, borderRadius: 19, padding: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', overflow: 'hidden' },
  rateLabel: { color: '#B0BED0', fontSize: 12.5, fontWeight: '900', letterSpacing: .45, marginTop: 8 },
  rateValue: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 4 },
  offlinePressable: { marginTop: 12, borderRadius: 19, overflow: 'hidden' },
  offlineButton: { minHeight: 68, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(255,193,116,.18)' },
  offlineIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,195,106,.12)' },
  offlineButtonTitle: { color: '#FFE2AE', fontSize: 15.5, lineHeight: 20, fontWeight: '900' },
  offlineButtonSub: { color: '#D3B992', fontSize: 13.5, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  offlineInfo: { minHeight: 48, marginTop: 12, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(121,149,190,.07)', borderWidth: 1, borderColor: 'rgba(121,149,190,.10)' },
  offlineInfoText: { color: '#8EA7C9', fontSize: 13.5, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.09)' },
  actionButton: { flex: 1, minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1 },
  actionEarn: { backgroundColor: 'rgba(98,240,182,.08)', borderColor: 'rgba(98,240,182,.12)' },
  actionRate: { backgroundColor: 'rgba(109,235,255,.08)', borderColor: 'rgba(109,235,255,.12)' },
  actionUnlink: { backgroundColor: 'rgba(255,95,126,.07)', borderColor: 'rgba(255,95,126,.12)' },
  actionText: { color: '#D7E5F6', fontSize: 14, fontWeight: '900' },
  actionTextDanger: { color: '#FF9EAA' },
  buttonPressed: { opacity: .72, transform: [{ scale: .985 }] },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.68)' },
  sheet: { backgroundColor: '#08111E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16, maxHeight: '88%', borderWidth: 1, borderColor: dkd_theme.border },
  addSheet: { maxHeight: '92%' },
  sheetHandle: { width: 46, height: 5, backgroundColor: '#35445A', borderRadius: 9, alignSelf: 'center', marginBottom: 14 },
  centerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,.70)' },
  dialog: { width: '100%', borderRadius: 27, padding: 16, backgroundColor: '#0A1423', borderWidth: 1, borderColor: dkd_theme.border },
  dialogHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  dialogIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(102,232,255,.09)' },
  dialogKicker: { color: dkd_theme.cyan, fontSize: 13.5, fontWeight: '900', letterSpacing: 1 },
  dialogTitle: { color: dkd_theme.text, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 2 },
  dialogText: { color: dkd_theme.textSoft, fontSize: 14, lineHeight: 20, fontWeight: '700', marginVertical: 13 },
  closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' },
  moneyRow: { flexDirection: 'row', gap: 9 },
  moneyInputWrap: { flex: 1 },
  inputLabel: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: .6, marginBottom: 6 },
  moneyInputShell: { minHeight: 54, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,.04)', borderWidth: 1, borderColor: dkd_theme.border },
  moneyInput: { flex: 1, color: dkd_theme.text, fontSize: 16, fontWeight: '900', paddingVertical: 0 },
  tl: { color: dkd_theme.cyan, fontSize: 13.5, fontWeight: '900' },
  primaryButton: { minHeight: 56, borderRadius: 18, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  primaryButtonText: { color: '#07121D', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  searchShell: { flex: 1, minHeight: 54, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,.04)', borderWidth: 1, borderColor: dkd_theme.border },
  searchInput: { flex: 1, color: dkd_theme.text, fontSize: 15, fontWeight: '700' },
  searchButton: { width: 55, height: 55, borderRadius: 18, backgroundColor: dkd_theme.cyan, alignItems: 'center', justifyContent: 'center' },
  searchHint: { color: dkd_theme.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 8 },
  searchResultsScroll: { maxHeight: 330 },
  searchResult: { minHeight: 74, borderRadius: 19, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border },
  searchResultActive: { borderColor: 'rgba(102,232,255,.55)', backgroundColor: 'rgba(102,232,255,.06)' },
  disabled: { opacity: .45 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(102,232,255,.08)', alignItems: 'center', justifyContent: 'center' },
  resultName: { color: dkd_theme.text, fontSize: 15, fontWeight: '900' },
  resultSub: { color: dkd_theme.textSoft, fontSize: 13.5, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  rateBlock: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: dkd_theme.border },
  rateTitle: { color: dkd_theme.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
  earningsHero: { minHeight: 135, borderRadius: 23, marginTop: 11, padding: 16, borderWidth: 1, borderColor: 'rgba(102,232,255,.12)' },
  earningsLabel: { color: '#88DAE7', fontSize: 13.5, fontWeight: '900', letterSpacing: .8 },
  earningsValue: { color: dkd_theme.text, fontSize: 31, lineHeight: 38, fontWeight: '900', marginTop: 8 },
  earningsSub: { color: dkd_theme.textSoft, fontSize: 14, fontWeight: '700', marginTop: 6 },
  earningGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  earningTile: { width: '48.5%', minHeight: 102, borderRadius: 19, padding: 12, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border },
  earningTileLabel: { color: dkd_theme.muted, fontSize: 13.5, fontWeight: '900', marginTop: 7 },
  earningTileValue: { color: dkd_theme.text, fontSize: 16, fontWeight: '900', marginTop: 5 },
  note: { color: dkd_theme.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '700', marginTop: 11, marginBottom: 20 },
});
