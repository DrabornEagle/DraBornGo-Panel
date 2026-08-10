import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dkd_panel_sign_in, dkd_panel_sign_up } from '../services/panelService';
import { dkd_theme } from '../lib/theme';

const dkd_initial_form = {
  ownerFullName: '', businessName: '', businessType: 'Restoran / İşletme',
  email: '', phone: '', city: '', district: '', address: '', password: '',
};

function DkdInput({ icon, label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize = 'sentences', placeholder }) {
  const [dkd_focused, dkd_set_focused] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputShell, dkd_focused && styles.inputShellFocused]}>
        <MaterialCommunityIcons name={icon} size={18} color={dkd_focused ? dkd_theme.cyan : '#6F86A4'} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          placeholderTextColor="#51627A"
          onFocus={() => dkd_set_focused(true)}
          onBlur={() => dkd_set_focused(false)}
          style={styles.input}
        />
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const [dkd_mode, dkd_set_mode] = useState('login');
  const [dkd_form, dkd_set_form] = useState(dkd_initial_form);
  const [dkd_loading, dkd_set_loading] = useState(false);
  const [dkd_error, dkd_set_error] = useState('');
  const [dkd_notice, dkd_set_notice] = useState('');
  const dkd_intro = useRef(new Animated.Value(0)).current;
  const dkd_float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dkd_intro, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(dkd_float, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(dkd_float, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ])).start();
  }, [dkd_float, dkd_intro]);

  const dkd_set = (dkd_key, dkd_value) => dkd_set_form((dkd_prev) => ({ ...dkd_prev, [dkd_key]: dkd_value }));

  const dkd_submit = async () => {
    dkd_set_error(''); dkd_set_notice('');
    if (!dkd_form.email.trim() || !dkd_form.password) return dkd_set_error('E-posta ve şifre zorunlu.');
    if (dkd_mode === 'register' && (!dkd_form.businessName.trim() || !dkd_form.ownerFullName.trim())) {
      return dkd_set_error('İşletme adı ve işletme sahibi adı zorunlu.');
    }
    if (dkd_form.password.length < 6) return dkd_set_error('Şifre en az 6 karakter olmalı.');
    dkd_set_loading(true);
    try {
      Haptics.selectionAsync().catch(() => null);
      if (dkd_mode === 'login') {
        await dkd_panel_sign_in(dkd_form.email, dkd_form.password);
      } else {
        const dkd_result = await dkd_panel_sign_up(dkd_form);
        if (!dkd_result?.session) {
          dkd_set_notice('Kayıt oluşturuldu. Supabase e-posta doğrulaması açıksa gelen kutundan doğrula ve ardından giriş yap. Admin onayı gerekmez.');
          dkd_set_mode('login');
        }
      }
    } catch (dkd_submit_error) {
      dkd_set_error(String(dkd_submit_error.message || dkd_submit_error));
    } finally {
      dkd_set_loading(false);
    }
  };

  const dkd_translate = dkd_intro.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const dkd_orb_translate = dkd_float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <LinearGradient colors={['#040913', '#071526', '#0B1020']} style={styles.root}>
      <Animated.View style={[styles.orbOne, { transform: [{ translateY: dkd_orb_translate }] }]} />
      <View style={styles.orbTwo} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: dkd_intro, transform: [{ translateY: dkd_translate }] }}>
            <View style={styles.brandRow}>
              <LinearGradient colors={['#77ECFF', '#76A5FF']} style={styles.brandIcon}>
                <MaterialCommunityIcons name="storefront-outline" size={30} color="#05111E" />
              </LinearGradient>
              <View>
                <Text style={styles.brandKicker}>DRABORNGO</Text>
                <Text style={styles.brandTitle}>İşletme Paneli</Text>
              </View>
            </View>
            <Text style={styles.headline}>Sipariş, kurye ve kazancı tek merkezden yönet.</Text>
            <Text style={styles.lead}>DraBornGo ile aynı Supabase altyapısında çalışan bağımsız işletme uygulaması.</Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: dkd_intro, transform: [{ translateY: dkd_translate }] }]}>
            <View style={styles.modeTabs}>
              {['login', 'register'].map((dkd_item) => {
                const dkd_active = dkd_mode === dkd_item;
                return (
                  <Pressable key={dkd_item} onPress={() => { dkd_set_mode(dkd_item); dkd_set_error(''); dkd_set_notice(''); }} style={[styles.modeTab, dkd_active && styles.modeTabActive]}>
                    <Text style={[styles.modeText, dkd_active && styles.modeTextActive]}>{dkd_item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
                  </Pressable>
                );
              })}
            </View>

            {dkd_mode === 'register' && (
              <>
                <View style={styles.quickInfo}>
                  <MaterialCommunityIcons name="flash-outline" size={18} color="#91F0C5" />
                  <Text style={styles.quickInfoText}>İşletme kaydı doğrudan açılır; admin onayı yok.</Text>
                </View>
                <DkdInput icon="account-tie-outline" label="İŞLETME SAHİBİ" value={dkd_form.ownerFullName} onChangeText={(v) => dkd_set('ownerFullName', v)} placeholder="Ad Soyad" />
                <DkdInput icon="store-outline" label="İŞLETME ADI" value={dkd_form.businessName} onChangeText={(v) => dkd_set('businessName', v)} placeholder="Örn. DraBorn Burger" />
                <DkdInput icon="shape-outline" label="İŞLETME TÜRÜ" value={dkd_form.businessType} onChangeText={(v) => dkd_set('businessType', v)} placeholder="Restoran, market, mağaza..." />
                <DkdInput icon="phone-outline" label="TELEFON" value={dkd_form.phone} onChangeText={(v) => dkd_set('phone', v)} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
                <View style={styles.row}>
                  <View style={styles.half}><DkdInput icon="city-variant-outline" label="ŞEHİR" value={dkd_form.city} onChangeText={(v) => dkd_set('city', v)} placeholder="Ankara" /></View>
                  <View style={styles.half}><DkdInput icon="map-marker-radius-outline" label="İLÇE" value={dkd_form.district} onChangeText={(v) => dkd_set('district', v)} placeholder="Çankaya" /></View>
                </View>
                <DkdInput icon="map-marker-outline" label="ADRES" value={dkd_form.address} onChangeText={(v) => dkd_set('address', v)} placeholder="İşletme adresi (opsiyonel)" />
              </>
            )}

            <DkdInput icon="email-outline" label="E-POSTA" value={dkd_form.email} onChangeText={(v) => dkd_set('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="isletme@ornek.com" />
            <DkdInput icon="lock-outline" label="ŞİFRE" value={dkd_form.password} onChangeText={(v) => dkd_set('password', v)} secureTextEntry autoCapitalize="none" placeholder="En az 6 karakter" />

            {!!dkd_error && <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={17} color="#FF9DA8" /><Text style={styles.errorText}>{dkd_error}</Text></View>}
            {!!dkd_notice && <View style={styles.noticeBox}><MaterialCommunityIcons name="email-check-outline" size={17} color="#9AF1C9" /><Text style={styles.noticeText}>{dkd_notice}</Text></View>}

            <Pressable onPress={dkd_submit} disabled={dkd_loading} style={styles.submitPressable}>
              <LinearGradient colors={['#65E7FF', '#668BFF', '#A46AFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
                {dkd_loading ? <ActivityIndicator color="#05111B" /> : <>
                  <Text style={styles.submitText}>{dkd_mode === 'login' ? 'PANELE GİR' : 'İŞLETMEMİ OLUŞTUR'}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#05111B" />
                </>}
              </LinearGradient>
            </Pressable>
            <Text style={styles.legal}>Kayıt olarak işletme hesabının DraBornGo ortak veri altyapısını kullanmasını kabul etmiş olursun.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, flex: { flex: 1 }, scroll: { padding: 20, paddingTop: 64, paddingBottom: 42 },
  orbOne: { position: 'absolute', width: 240, height: 240, borderRadius: 999, backgroundColor: 'rgba(82,207,255,.10)', top: -80, right: -95 },
  orbTwo: { position: 'absolute', width: 260, height: 260, borderRadius: 999, backgroundColor: 'rgba(176,92,255,.08)', bottom: 80, left: -160 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brandKicker: { color: '#9DEFFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 }, brandTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 2 },
  headline: { color: '#F7FAFF', fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 27, maxWidth: 350 }, lead: { color: '#95A8C2', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 10, maxWidth: 350 },
  card: { marginTop: 26, borderRadius: 28, padding: 15, backgroundColor: 'rgba(10,20,35,.92)', borderWidth: 1, borderColor: 'rgba(158,219,255,.12)' },
  modeTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,.035)', padding: 5, borderRadius: 17, marginBottom: 14 }, modeTab: { flex: 1, minHeight: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, modeTabActive: { backgroundColor: '#15304E' }, modeText: { color: '#70829B', fontSize: 10, fontWeight: '900' }, modeTextActive: { color: '#D5F8FF' },
  quickInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: 'rgba(91,224,163,.08)', borderWidth: 1, borderColor: 'rgba(91,224,163,.11)', padding: 10, marginBottom: 12 }, quickInfoText: { flex: 1, color: '#A8E9CC', fontSize: 9.5, fontWeight: '800' },
  inputWrap: { marginBottom: 11 }, inputLabel: { color: '#7187A4', fontSize: 8, fontWeight: '900', letterSpacing: .8, marginBottom: 6, marginLeft: 3 }, inputShell: { minHeight: 50, borderRadius: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: 'rgba(165,205,255,.10)', backgroundColor: 'rgba(255,255,255,.035)' }, inputShellFocused: { borderColor: 'rgba(102,232,255,.45)', backgroundColor: 'rgba(102,232,255,.05)' }, input: { flex: 1, color: '#F5F9FF', fontSize: 12, fontWeight: '700', paddingVertical: 0 },
  row: { flexDirection: 'row', gap: 9 }, half: { flex: 1 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,107,124,.08)', borderRadius: 14, padding: 10, marginBottom: 10 }, errorText: { color: '#FFB3BC', fontSize: 9.5, lineHeight: 14, fontWeight: '800', flex: 1 }, noticeBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(91,224,163,.08)', borderRadius: 14, padding: 10, marginBottom: 10 }, noticeText: { color: '#B5F0D4', fontSize: 9.5, lineHeight: 14, fontWeight: '800', flex: 1 },
  submitPressable: { marginTop: 4 }, submit: { minHeight: 54, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, submitText: { color: '#06111D', fontSize: 11, fontWeight: '900', letterSpacing: .8 }, legal: { color: '#52647C', fontSize: 8.5, lineHeight: 13, textAlign: 'center', fontWeight: '700', marginTop: 12, paddingHorizontal: 10 },
});
