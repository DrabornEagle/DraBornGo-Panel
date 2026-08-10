import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dkd_theme } from '../lib/theme';
import { dkd_panel_sign_out, dkd_panel_update_business_profile } from '../services/panelService';

function DkdField({ label, value, onChangeText, placeholder }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#51647C" style={styles.input} /></View>;
}

export default function SettingsScreen({ business, onProfileUpdated }) {
  const [dkd_form, dkd_set_form] = useState({ businessName: '', ownerFullName: '', phone: '', businessType: '', city: '', district: '', address: '' });
  const [dkd_saving, dkd_set_saving] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');
  const [dkd_saved, dkd_set_saved] = useState(false);

  useEffect(() => {
    setTimeout(() => dkd_set_saved(false), 2500);
  }, [dkd_saved]);
  useEffect(() => {
    dkd_set_form({
      businessName: business?.dkd_business_name || '', ownerFullName: business?.dkd_owner_full_name || '', phone: business?.dkd_phone || '',
      businessType: business?.dkd_business_type || 'İşletme', city: business?.dkd_city || '', district: business?.dkd_district || '', address: business?.dkd_address_text || '',
    });
  }, [business]);
  const dkd_set = (dkd_key, dkd_value) => dkd_set_form((dkd_prev) => ({ ...dkd_prev, [dkd_key]: dkd_value }));
  const dkd_save = async () => {
    if (!dkd_form.businessName.trim()) return dkd_set_error('İşletme adı boş bırakılamaz.');
    dkd_set_saving(true); dkd_set_error('');
    try { await dkd_panel_update_business_profile(dkd_form); dkd_set_saved(true); onProfileUpdated?.(); }
    catch (dkd_error_value) { dkd_set_error(String(dkd_error_value.message || dkd_error_value)); }
    finally { dkd_set_saving(false); }
  };
  return <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.kicker}>PANEL AYARLARI</Text><Text style={styles.title}>İşletme Profili</Text><Text style={styles.subtitle}>Giriş hesabı ve işletme bilgilerinin yönetimi</Text>
    <View style={styles.infoCard}><View style={styles.infoIcon}><MaterialCommunityIcons name="database-check-outline" size={21} color={dkd_theme.green} /></View><View style={{ flex: 1 }}><Text style={styles.infoTitle}>DraBornGo Ortak Supabase</Text><Text style={styles.infoText}>Panel ve ana uygulama aynı kurye, sipariş, konum ve kazanç altyapısını kullanır.</Text></View></View>
    <View style={styles.formCard}>
      <DkdField label="İŞLETME ADI" value={dkd_form.businessName} onChangeText={(v) => dkd_set('businessName', v)} />
      <DkdField label="İŞLETME SAHİBİ" value={dkd_form.ownerFullName} onChangeText={(v) => dkd_set('ownerFullName', v)} />
      <DkdField label="İŞLETME TÜRÜ" value={dkd_form.businessType} onChangeText={(v) => dkd_set('businessType', v)} />
      <DkdField label="TELEFON" value={dkd_form.phone} onChangeText={(v) => dkd_set('phone', v)} />
      <View style={styles.row}><View style={{ flex: 1 }}><DkdField label="ŞEHİR" value={dkd_form.city} onChangeText={(v) => dkd_set('city', v)} /></View><View style={{ flex: 1 }}><DkdField label="İLÇE" value={dkd_form.district} onChangeText={(v) => dkd_set('district', v)} /></View></View>
      <DkdField label="ADRES" value={dkd_form.address} onChangeText={(v) => dkd_set('address', v)} />
      {!!dkd_error && <Text style={styles.error}>{dkd_error}</Text>}{dkd_saved && <Text style={styles.saved}>İşletme bilgileri güncellendi.</Text>}
      <Pressable onPress={dkd_save} disabled={dkd_saving}><LinearGradient colors={['#62E7FF', '#738AFF']} style={styles.saveButton}>{dkd_saving ? <ActivityIndicator color="#07121D" /> : <><Text style={styles.saveText}>BİLGİLERİ KAYDET</Text><MaterialCommunityIcons name="content-save-outline" size={18} color="#07121D" /></>}</LinearGradient></Pressable>
    </View>
    <View style={styles.securityCard}><MaterialCommunityIcons name="shield-lock-outline" size={24} color={dkd_theme.cyan} /><View style={{ flex: 1 }}><Text style={styles.securityTitle}>Gizlilik ve Yetkilendirme</Text><Text style={styles.securityText}>İşletme yalnızca kendi bağlı kuryelerini ve kendi siparişlerini görür. TC araması yalnızca tam eşleşme ile çalışır; kimlik numarası panel istemcisine veya arama sonucuna döndürülmez.</Text></View></View>
    <Pressable onPress={dkd_panel_sign_out} style={styles.logout}><MaterialCommunityIcons name="logout" size={19} color="#FF9DA8" /><Text style={styles.logoutText}>Hesaptan Çıkış Yap</Text></Pressable>
    <Text style={styles.version}>DraBornGo Panel v0.0.1 • Expo SDK 57</Text><View style={{ height: 110 }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dkd_theme.background }, content: { padding: 14, paddingTop: 18 }, kicker: { color: dkd_theme.cyan, fontSize: 13, fontWeight: '900', letterSpacing: 1.4 }, title: { color: dkd_theme.text, fontSize: 27, fontWeight: '900', marginTop: 3 }, subtitle: { color: dkd_theme.textSoft, fontSize: 14, fontWeight: '700', marginTop: 3, marginBottom: 16 },
  infoCard: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 20, backgroundColor: 'rgba(91,224,163,.07)', borderWidth: 1, borderColor: 'rgba(91,224,163,.12)' }, infoIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: 'rgba(91,224,163,.10)', alignItems: 'center', justifyContent: 'center' }, infoTitle: { color: '#D7F8E8', fontSize: 14, fontWeight: '900' }, infoText: { color: '#9EC8B7', fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 4 },
  formCard: { marginTop: 12, padding: 13, borderRadius: 23, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, field: { marginBottom: 10 }, label: { color: dkd_theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: .7, marginBottom: 5 }, input: { minHeight: 48, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.035)', borderWidth: 1, borderColor: dkd_theme.border, paddingHorizontal: 12, color: dkd_theme.text, fontSize: 14, fontWeight: '700' }, row: { flexDirection: 'row', gap: 8 }, error: { color: '#FFB0BA', fontSize: 13, fontWeight: '800', marginBottom: 8 }, saved: { color: '#A6EDCC', fontSize: 13, fontWeight: '800', marginBottom: 8 }, saveButton: { minHeight: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, saveText: { color: '#07121D', fontSize: 14, fontWeight: '900', letterSpacing: .5 },
  securityCard: { marginTop: 12, padding: 13, borderRadius: 21, flexDirection: 'row', gap: 10, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, securityTitle: { color: dkd_theme.text, fontSize: 14, fontWeight: '900' }, securityText: { color: dkd_theme.textSoft, fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 4 }, logout: { marginTop: 12, height: 49, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,124,.18)', backgroundColor: 'rgba(255,107,124,.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, logoutText: { color: '#FFAFB8', fontSize: 14, fontWeight: '900' }, version: { textAlign: 'center', color: '#53647B', fontSize: 13, fontWeight: '700', marginTop: 16 },
});
