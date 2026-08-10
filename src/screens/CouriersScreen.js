import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dkd_theme } from '../lib/theme';
import { DkdEmptyState, DkdPeriodTabs, DkdStatusPill, dkd_duration, dkd_money } from '../components/PanelComponents';
import {
  dkd_panel_fetch_courier_earnings, dkd_panel_fetch_couriers, dkd_panel_link_courier,
  dkd_panel_search_couriers, dkd_panel_set_courier_rate, dkd_panel_unlink_courier,
} from '../services/panelService';

function DkdMoneyInput({ label, value, onChangeText }) {
  return (
    <View style={styles.moneyInputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.moneyInputShell}><TextInput value={value} onChangeText={(dkd_value) => onChangeText(dkd_value.replace(',', '.').replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#52647B" style={styles.moneyInput} /><Text style={styles.tl}>TL</Text></View>
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
    dkd_set_saving(true); dkd_set_error('');
    try { await dkd_panel_set_courier_rate(courier.dkd_courier_user_id, dkd_package, dkd_hourly); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null); onSaved(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_saving(false); }
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerBackdrop}><View style={styles.dialog}>
        <View style={styles.dialogHead}><View style={styles.dialogIcon}><MaterialCommunityIcons name="cash-edit" size={22} color={dkd_theme.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.dialogKicker}>ÜCRET AYARLA</Text><Text style={styles.dialogTitle}>{courier.dkd_display_name}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={19} color={dkd_theme.text} /></Pressable></View>
        <Text style={styles.dialogText}>Yeni ücret yalnızca bundan sonraki çalışma ve paketlere uygulanır. Eski kazançlar geçmiş ücret kaydıyla korunur.</Text>
        <View style={styles.moneyRow}><DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} /><DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} /></View>
        {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
        <Pressable onPress={dkd_save} disabled={dkd_saving}><LinearGradient colors={['#63E6FF', '#7586FF']} style={styles.primaryButton}>{dkd_saving ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>ÜCRETLERİ GÜNCELLE</Text><MaterialCommunityIcons name="check" size={19} color="#07121D" /></>}</LinearGradient></Pressable>
      </View></View>
    </Modal>
  );
}

function DkdEarningsModal({ courier, onClose }) {
  const [dkd_data, dkd_set_data] = useState({});
  const [dkd_period, dkd_set_period] = useState('daily');
  const [dkd_loading, dkd_set_loading] = useState(true);
  useEffect(() => {
    if (!courier) return;
    dkd_panel_fetch_courier_earnings(courier.dkd_courier_user_id).then(dkd_set_data).finally(() => dkd_set_loading(false));
  }, [courier]);
  if (!courier) return null;
  const dkd_period_data = dkd_data?.[dkd_period] || {};
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}><View style={styles.sheet}>
        <View style={styles.sheetHandle} /><View style={styles.dialogHead}><View style={styles.dialogIcon}><MaterialCommunityIcons name="chart-box-outline" size={22} color={dkd_theme.green} /></View><View style={{ flex: 1 }}><Text style={styles.dialogKicker}>KURYE KAZANÇ TABLOSU</Text><Text style={styles.dialogTitle}>{courier.dkd_display_name}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons name="close" size={19} color={dkd_theme.text} /></Pressable></View>
        {dkd_loading ? <ActivityIndicator color={dkd_theme.cyan} style={{ margin: 28 }} /> : <ScrollView showsVerticalScrollIndicator={false}>
          <DkdPeriodTabs value={dkd_period} onChange={dkd_set_period} />
          <View style={styles.earningsHero}><Text style={styles.earningsLabel}>TOPLAM KAZANÇ</Text><Text style={styles.earningsValue}>{dkd_money(dkd_period_data.dkd_earnings_tl)}</Text><Text style={styles.earningsSub}>{dkd_period_data.dkd_completed_jobs || 0} paket • {dkd_duration(dkd_period_data.dkd_online_seconds)}</Text></View>
          <View style={styles.earningGrid}>
            <View style={styles.earningTile}><MaterialCommunityIcons name="package-variant" size={18} color={dkd_theme.yellow} /><Text style={styles.earningTileLabel}>Paket Kazancı</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_package_earnings_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="timer-outline" size={18} color={dkd_theme.cyan} /><Text style={styles.earningTileLabel}>Saatlik Kazanç</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_hourly_earnings_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="cash" size={18} color={dkd_theme.violet} /><Text style={styles.earningTileLabel}>Paket Ücreti</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_package_fee_tl || courier.dkd_package_fee_tl)}</Text></View>
            <View style={styles.earningTile}><MaterialCommunityIcons name="clock-fast" size={18} color={dkd_theme.green} /><Text style={styles.earningTileLabel}>Saatlik Sabit</Text><Text style={styles.earningTileValue}>{dkd_money(dkd_period_data.dkd_fixed_hourly_rate_tl || courier.dkd_hourly_rate_tl)}</Text></View>
          </View>
          <Text style={styles.note}>Bu değerler DraBornGo uygulamasındaki kurye Kazanç Tablosu ile aynı Supabase hesaplamasını kullanır.</Text>
        </ScrollView>}
      </View></View>
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
    if (dkd_query.trim().length < 3 && dkd_query.replace(/\D/g, '').length !== 11) return dkd_set_error('Ad, plaka veya e-posta için en az 3 karakter; TC için 11 hane yaz.');
    dkd_set_loading(true); dkd_set_error('');
    try { dkd_set_results(await dkd_panel_search_couriers(dkd_query)); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  };
  const dkd_add = async () => {
    if (!dkd_selected) return;
    dkd_set_loading(true); dkd_set_error('');
    try { await dkd_panel_link_courier(dkd_selected.dkd_courier_user_id, dkd_package, dkd_hourly); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null); onAdded(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); }
  };
  const dkd_reset_close = () => { dkd_set_query(''); dkd_set_results([]); dkd_set_selected(null); dkd_set_error(''); onClose(); };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={dkd_reset_close}>
      <View style={styles.sheetBackdrop}><View style={[styles.sheet, { maxHeight: '92%' }]}>
        <View style={styles.sheetHandle} /><View style={styles.dialogHead}><View style={styles.dialogIcon}><MaterialCommunityIcons name="account-plus-outline" size={22} color={dkd_theme.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.dialogKicker}>KURYE EKLE</Text><Text style={styles.dialogTitle}>DraBornGo kuryesi ara</Text></View><Pressable onPress={dkd_reset_close} style={styles.closeButton}><MaterialCommunityIcons name="close" size={19} color={dkd_theme.text} /></Pressable></View>
        <View style={styles.searchRow}><View style={styles.searchShell}><MaterialCommunityIcons name="magnify" size={19} color={dkd_theme.cyan} /><TextInput value={dkd_query} onChangeText={dkd_set_query} onSubmitEditing={dkd_search} placeholder="Ad, plaka, e-posta veya TC" placeholderTextColor="#53657C" autoCapitalize="none" style={styles.searchInput} /></View><Pressable onPress={dkd_search} style={styles.searchButton}>{dkd_loading ? <ActivityIndicator color="#07121D" size="small" /> : <MaterialCommunityIcons name="arrow-right" size={20} color="#07121D" />}</Pressable></View>
        <Text style={styles.searchHint}>TC yalnızca 11 haneli tam eşleşmede kullanılır; kimlik numarası işletme panelinde gösterilmez veya arama sonucuna döndürülmez.</Text>
        {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 330 }}>
          {dkd_results.map((dkd_item) => {
            const dkd_active = dkd_selected?.dkd_courier_user_id === dkd_item.dkd_courier_user_id;
            return <Pressable key={dkd_item.dkd_courier_user_id} disabled={dkd_item.dkd_already_linked} onPress={() => dkd_set_selected(dkd_item)} style={[styles.searchResult, dkd_active && styles.searchResultActive, dkd_item.dkd_already_linked && { opacity: .45 }]}><View style={styles.avatar}><MaterialCommunityIcons name="motorbike" size={19} color={dkd_theme.cyan} /></View><View style={{ flex: 1 }}><Text style={styles.resultName}>{dkd_item.dkd_display_name}</Text><Text style={styles.resultSub}>{dkd_item.dkd_plate_no || 'Plaka yok'} • {dkd_item.dkd_email_masked || 'E-posta gizli'}</Text></View>{dkd_item.dkd_tc_exact_match && <DkdStatusPill text="TC EŞLEŞTİ" tone="green" />}{dkd_item.dkd_already_linked ? <DkdStatusPill text="BAĞLI" tone="yellow" /> : <MaterialCommunityIcons name={dkd_active ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={dkd_active ? dkd_theme.cyan : '#4B5D74'} />}</Pressable>;
          })}
        </ScrollView>
        {dkd_selected && <View style={styles.rateBlock}><Text style={styles.rateTitle}>Başlangıç Ücretleri</Text><View style={styles.moneyRow}><DkdMoneyInput label="PAKET BAŞI" value={dkd_package} onChangeText={dkd_set_package} /><DkdMoneyInput label="SAATLİK SABİT" value={dkd_hourly} onChangeText={dkd_set_hourly} /></View><Pressable onPress={dkd_add} disabled={dkd_loading}><LinearGradient colors={['#66E8FF', '#7887FF', '#A96BFF']} style={styles.primaryButton}>{dkd_loading ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.primaryButtonText}>KURYENİN İŞLETMEYE BAĞLANTISINI OLUŞTUR</Text><MaterialCommunityIcons name="link-variant" size={19} color="#07121D" /></>}</LinearGradient></Pressable></View>}
      </View></View>
    </Modal>
  );
}

export default function CouriersScreen({ refreshSignal = 0 }) {
  const [dkd_couriers, dkd_set_couriers] = useState([]);
  const [dkd_loading, dkd_set_loading] = useState(true);
  const [dkd_refreshing, dkd_set_refreshing] = useState(false);
  const [dkd_add_open, dkd_set_add_open] = useState(false);
  const [dkd_rate_courier, dkd_set_rate_courier] = useState(null);
  const [dkd_earnings_courier, dkd_set_earnings_courier] = useState(null);
  const [dkd_error, dkd_set_error] = useState('');

  const dkd_load = useCallback(async () => {
    dkd_set_refreshing(true); dkd_set_error('');
    try { dkd_set_couriers(await dkd_panel_fetch_couriers()); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_loading(false); dkd_set_refreshing(false); }
  }, []);
  useEffect(() => { dkd_load(); }, [dkd_load, refreshSignal]);

  const dkd_online = useMemo(() => dkd_couriers.filter((dkd_item) => dkd_item.dkd_is_online).length, [dkd_couriers]);
  const dkd_unlink = (dkd_courier) => Alert.alert('Kurye bağlantısını kaldır', `${dkd_courier.dkd_display_name} işletmeden ayrılsın mı? Geçmiş kazanç kayıtları korunur.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Bağlantıyı Kaldır', style: 'destructive', onPress: async () => { try { await dkd_panel_unlink_courier(dkd_courier.dkd_courier_user_id); dkd_load(); } catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); } } },
  ]);

  if (dkd_loading) return <View style={styles.loader}><ActivityIndicator color={dkd_theme.cyan} size="large" /></View>;
  return (
    <View style={styles.root}><ScrollView refreshControl={<RefreshControl refreshing={dkd_refreshing} onRefresh={dkd_load} tintColor={dkd_theme.cyan} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHead}><View><Text style={styles.pageKicker}>EKİP YÖNETİMİ</Text><Text style={styles.pageTitle}>Kuryeler</Text><Text style={styles.pageSub}>{dkd_online} çevrimiçi • {dkd_couriers.length} bağlı kurye</Text></View><Pressable onPress={() => dkd_set_add_open(true)} style={styles.addButton}><MaterialCommunityIcons name="plus" size={20} color="#07121D" /><Text style={styles.addButtonText}>Kurye Ekle</Text></Pressable></View>
      {!!dkd_error && <Text style={styles.errorText}>{dkd_error}</Text>}
      {dkd_couriers.length === 0 ? <DkdEmptyState icon="account-group-outline" title="Henüz bağlı kurye yok" text="Kurye Ekle ile DraBornGo kullanıcılarını ad, plaka, e-posta veya tam TC eşleşmesiyle bulabilirsin." /> : dkd_couriers.map((dkd_courier) => (
        <View key={dkd_courier.dkd_courier_user_id} style={styles.courierCard}>
          <View style={styles.courierTop}><View style={styles.avatarLarge}><MaterialCommunityIcons name="motorbike" size={24} color={dkd_theme.cyan} /></View><View style={styles.courierCopy}><View style={styles.nameRow}><Text style={styles.courierName}>{dkd_courier.dkd_display_name}</Text><DkdStatusPill text={dkd_courier.dkd_is_online ? 'ONLINE' : 'OFFLINE'} tone={dkd_courier.dkd_is_online ? 'green' : 'blue'} /></View><Text style={styles.courierSub}>{dkd_courier.dkd_plate_no || 'Plaka yok'} • {dkd_courier.dkd_email_masked || ''}</Text><Text style={styles.courierTiny}>{dkd_courier.dkd_city || 'Bölge yok'} • Bağlandı {new Date(dkd_courier.dkd_linked_at).toLocaleDateString('tr-TR')}</Text></View></View>
          <View style={styles.rateGrid}><View style={styles.rateTile}><Text style={styles.rateLabel}>PAKET BAŞI</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_package_fee_tl)}</Text></View><View style={styles.rateTile}><Text style={styles.rateLabel}>SAATLİK SABİT</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_hourly_rate_tl)}</Text></View><View style={styles.rateTile}><Text style={styles.rateLabel}>BUGÜN</Text><Text style={styles.rateValue}>{dkd_money(dkd_courier.dkd_today?.dkd_earnings_tl)}</Text></View></View>
          <View style={styles.actionRow}><Pressable onPress={() => dkd_set_earnings_courier(dkd_courier)} style={styles.actionButton}><MaterialCommunityIcons name="chart-line" size={17} color={dkd_theme.green} /><Text style={styles.actionText}>Kazanç</Text></Pressable><Pressable onPress={() => dkd_set_rate_courier(dkd_courier)} style={styles.actionButton}><MaterialCommunityIcons name="cash-edit" size={17} color={dkd_theme.cyan} /><Text style={styles.actionText}>Ücret</Text></Pressable><Pressable onPress={() => dkd_unlink(dkd_courier)} style={styles.actionButton}><MaterialCommunityIcons name="link-variant-off" size={17} color={dkd_theme.red} /><Text style={[styles.actionText, { color: '#FF9EAA' }]}>Ayır</Text></Pressable></View>
        </View>
      ))}
      <View style={{ height: 110 }} />
    </ScrollView>
    <DkdAddCourierModal visible={dkd_add_open} onClose={() => dkd_set_add_open(false)} onAdded={() => { dkd_set_add_open(false); dkd_load(); }} />
    <DkdRateModal courier={dkd_rate_courier} onClose={() => dkd_set_rate_courier(null)} onSaved={() => { dkd_set_rate_courier(null); dkd_load(); }} />
    <DkdEarningsModal courier={dkd_earnings_courier} onClose={() => dkd_set_earnings_courier(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dkd_theme.background }, content: { padding: 14, paddingTop: 16, gap: 10 }, loader: { flex: 1, backgroundColor: dkd_theme.background, alignItems: 'center', justifyContent: 'center' },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }, pageKicker: { color: dkd_theme.cyan, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4 }, pageTitle: { color: dkd_theme.text, fontSize: 27, fontWeight: '900', marginTop: 3 }, pageSub: { color: dkd_theme.textSoft, fontSize: 10, fontWeight: '700', marginTop: 3 }, addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: dkd_theme.cyan, minHeight: 43, paddingHorizontal: 12, borderRadius: 15 }, addButtonText: { color: '#07121D', fontSize: 9.5, fontWeight: '900' }, errorText: { color: '#FFB0BA', fontSize: 9.5, fontWeight: '800', padding: 7 },
  courierCard: { borderRadius: 23, padding: 13, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, courierTop: { flexDirection: 'row', gap: 11, alignItems: 'center' }, avatarLarge: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(102,232,255,.08)', alignItems: 'center', justifyContent: 'center' }, courierCopy: { flex: 1 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, courierName: { color: dkd_theme.text, fontSize: 13, fontWeight: '900', flex: 1 }, courierSub: { color: dkd_theme.textSoft, fontSize: 9, fontWeight: '700', marginTop: 4 }, courierTiny: { color: dkd_theme.muted, fontSize: 8, fontWeight: '700', marginTop: 4 }, rateGrid: { flexDirection: 'row', gap: 7, marginTop: 12 }, rateTile: { flex: 1, minHeight: 68, borderRadius: 15, padding: 9, backgroundColor: 'rgba(255,255,255,.028)', borderWidth: 1, borderColor: 'rgba(176,214,255,.06)' }, rateLabel: { color: dkd_theme.muted, fontSize: 7, fontWeight: '900', letterSpacing: .5 }, rateValue: { color: dkd_theme.text, fontSize: 11, fontWeight: '900', marginTop: 7 }, actionRow: { flexDirection: 'row', gap: 7, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(176,214,255,.07)' }, actionButton: { flex: 1, minHeight: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, actionText: { color: '#C0CFDF', fontSize: 8.5, fontWeight: '900' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.65)' }, sheet: { backgroundColor: '#08111E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 14, maxHeight: '86%', borderWidth: 1, borderColor: dkd_theme.border }, sheetHandle: { width: 42, height: 4, backgroundColor: '#35445A', borderRadius: 9, alignSelf: 'center', marginBottom: 12 }, centerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,.68)' }, dialog: { width: '100%', borderRadius: 25, padding: 14, backgroundColor: '#0A1423', borderWidth: 1, borderColor: dkd_theme.border }, dialogHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dialogIcon: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(102,232,255,.08)' }, dialogKicker: { color: dkd_theme.cyan, fontSize: 7.5, fontWeight: '900', letterSpacing: 1 }, dialogTitle: { color: dkd_theme.text, fontSize: 17, fontWeight: '900', marginTop: 2 }, dialogText: { color: dkd_theme.textSoft, fontSize: 9, lineHeight: 14, fontWeight: '700', marginVertical: 12 }, closeButton: { width: 39, height: 39, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' },
  moneyRow: { flexDirection: 'row', gap: 8 }, moneyInputWrap: { flex: 1 }, inputLabel: { color: dkd_theme.muted, fontSize: 7.5, fontWeight: '900', letterSpacing: .6, marginBottom: 5 }, moneyInputShell: { minHeight: 48, borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,.035)', borderWidth: 1, borderColor: dkd_theme.border }, moneyInput: { flex: 1, color: dkd_theme.text, fontSize: 14, fontWeight: '900', paddingVertical: 0 }, tl: { color: dkd_theme.cyan, fontSize: 9, fontWeight: '900' }, primaryButton: { minHeight: 52, borderRadius: 16, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, primaryButtonText: { color: '#07121D', fontSize: 9.5, fontWeight: '900', textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: 7, marginTop: 13 }, searchShell: { flex: 1, minHeight: 48, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.035)', borderWidth: 1, borderColor: dkd_theme.border }, searchInput: { flex: 1, color: dkd_theme.text, fontSize: 11, fontWeight: '700' }, searchButton: { width: 49, height: 49, borderRadius: 16, backgroundColor: dkd_theme.cyan, alignItems: 'center', justifyContent: 'center' }, searchHint: { color: dkd_theme.muted, fontSize: 8, lineHeight: 12, fontWeight: '700', marginTop: 7 }, searchResult: { minHeight: 66, borderRadius: 17, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 7, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, searchResultActive: { borderColor: 'rgba(102,232,255,.55)', backgroundColor: 'rgba(102,232,255,.06)' }, avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(102,232,255,.08)', alignItems: 'center', justifyContent: 'center' }, resultName: { color: dkd_theme.text, fontSize: 10.5, fontWeight: '900' }, resultSub: { color: dkd_theme.textSoft, fontSize: 8.5, fontWeight: '700', marginTop: 3 }, rateBlock: { marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: dkd_theme.border }, rateTitle: { color: dkd_theme.text, fontSize: 12, fontWeight: '900', marginBottom: 9 },
  earningsHero: { minHeight: 125, borderRadius: 21, marginTop: 10, padding: 15, backgroundColor: '#10283A', borderWidth: 1, borderColor: 'rgba(102,232,255,.12)' }, earningsLabel: { color: '#88DAE7', fontSize: 8, fontWeight: '900', letterSpacing: .8 }, earningsValue: { color: dkd_theme.text, fontSize: 28, fontWeight: '900', marginTop: 8 }, earningsSub: { color: dkd_theme.textSoft, fontSize: 9.5, fontWeight: '700', marginTop: 6 }, earningGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 }, earningTile: { width: '48.5%', minHeight: 94, borderRadius: 18, padding: 11, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, earningTileLabel: { color: dkd_theme.muted, fontSize: 7.5, fontWeight: '900', marginTop: 7 }, earningTileValue: { color: dkd_theme.text, fontSize: 12, fontWeight: '900', marginTop: 5 }, note: { color: dkd_theme.muted, fontSize: 8.5, lineHeight: 13, fontWeight: '700', marginTop: 10, marginBottom: 20 },
});
