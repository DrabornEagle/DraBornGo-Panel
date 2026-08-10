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

function DkdInput({
  icon, label, value, onChangeText, secureTextEntry, keyboardType,
  autoCapitalize = 'sentences', placeholder, inputKey, onFocusField, onLayoutField,
}) {
  const [dkd_focused, dkd_set_focused] = useState(false);
  const [dkd_secure_visible, dkd_set_secure_visible] = useState(false);
  const dkd_is_password = Boolean(secureTextEntry);

  return (
    <View
      style={styles.inputWrap}
      onLayout={(dkd_event) => onLayoutField?.(inputKey, dkd_event.nativeEvent.layout.y)}
    >
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputShell, dkd_focused && styles.inputShellFocused]}>
        <View style={[styles.inputIconBox, dkd_focused && styles.inputIconBoxFocused]}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={dkd_focused ? '#DDFBFF' : '#7790B2'}
          />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={dkd_is_password && !dkd_secure_visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor="#5E718D"
          onFocus={() => {
            dkd_set_focused(true);
            onFocusField?.(inputKey);
          }}
          onBlur={() => dkd_set_focused(false)}
          style={styles.input}
          selectionColor={dkd_theme.cyan}
        />
        {dkd_is_password && (
          <Pressable
            hitSlop={12}
            onPress={() => dkd_set_secure_visible((dkd_value) => !dkd_value)}
            style={styles.eyeButton}
          >
            <MaterialCommunityIcons
              name={dkd_secure_visible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#8DA1BE"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function DkdFeature({ icon, title, color }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={18} color="#06111E" />
      </View>
      <Text style={styles.featureText}>{title}</Text>
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
  const dkd_scroll_ref = useRef(null);
  const dkd_field_positions_ref = useRef({});

  useEffect(() => {
    Animated.timing(dkd_intro, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(dkd_float, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(dkd_float, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ])).start();
  }, [dkd_float, dkd_intro]);

  const dkd_set = (dkd_key, dkd_value) => dkd_set_form((dkd_prev) => ({ ...dkd_prev, [dkd_key]: dkd_value }));

  const dkd_register_field_position = (dkd_key, dkd_y_value) => {
    if (!dkd_key) return;
    dkd_field_positions_ref.current[dkd_key] = dkd_y_value;
  };

  const dkd_focus_field = (dkd_key) => {
    const dkd_y_value = dkd_field_positions_ref.current[dkd_key];
    if (typeof dkd_y_value !== 'number') return;
    setTimeout(() => {
      dkd_scroll_ref.current?.scrollTo({ y: Math.max(0, dkd_y_value - 112), animated: true });
    }, Platform.OS === 'android' ? 260 : 120);
  };

  const dkd_change_mode = (dkd_next_mode) => {
    Haptics.selectionAsync().catch(() => null);
    dkd_set_mode(dkd_next_mode);
    dkd_set_error('');
    dkd_set_notice('');
    dkd_scroll_ref.current?.scrollTo({ y: 0, animated: true });
  };

  const dkd_submit = async () => {
    dkd_set_error('');
    dkd_set_notice('');
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
          dkd_set_notice('İşletme hesabın oluşturuldu. E-posta doğrulaması açıksa gelen kutundaki bağlantıyı doğrula, sonra giriş yap. Admin onayı gerekmez.');
          dkd_set_mode('login');
          dkd_scroll_ref.current?.scrollTo({ y: 0, animated: true });
        }
      }
    } catch (dkd_submit_error) {
      dkd_set_error(String(dkd_submit_error.message || dkd_submit_error));
    } finally {
      dkd_set_loading(false);
    }
  };

  const dkd_translate = dkd_intro.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const dkd_orb_translate = dkd_float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <LinearGradient colors={['#020812', '#06172B', '#0A1024']} style={styles.root}>
      <Animated.View style={[styles.orbOne, { transform: [{ translateY: dkd_orb_translate }] }]} />
      <View style={styles.orbTwo} />
      <View style={styles.orbThree} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={dkd_scroll_ref}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <Animated.View style={{ opacity: dkd_intro, transform: [{ translateY: dkd_translate }] }}>
            <View style={styles.brandRow}>
              <LinearGradient colors={['#72F1FF', '#7397FF', '#B56FFF']} style={styles.brandIcon}>
                <MaterialCommunityIcons name="storefront-outline" size={34} color="#04101D" />
              </LinearGradient>
              <View style={styles.brandCopy}>
                <Text style={styles.brandKicker}>DRABORNGO • BUSINESS</Text>
                <Text style={styles.brandTitle}>İşletme Paneli</Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>CANLI</Text>
              </View>
            </View>

            <Text style={styles.headline}>İşletmeni tek ekrandan yönet.</Text>
            <Text style={styles.lead}>
              Siparişleri izle, kuryelerini yönet, ücretleri belirle ve kazancını anlık takip et.
            </Text>

            <View style={styles.featureRail}>
              <DkdFeature icon="package-variant-closed" title="Siparişler" color="#67E8FF" />
              <DkdFeature icon="motorbike" title="Kuryeler" color="#8FA0FF" />
              <DkdFeature icon="chart-line" title="Kazanç" color="#C67BFF" />
            </View>
          </Animated.View>

          <Animated.View style={[styles.cardShadow, { opacity: dkd_intro, transform: [{ translateY: dkd_translate }] }]}>
            <LinearGradient
              colors={['rgba(104,232,255,.55)', 'rgba(119,135,255,.30)', 'rgba(190,104,255,.48)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardBorder}
            >
              <View style={styles.card}>
                <View style={styles.modeTabs}>
                  {['login', 'register'].map((dkd_item) => {
                    const dkd_active = dkd_mode === dkd_item;
                    return (
                      <Pressable
                        key={dkd_item}
                        onPress={() => dkd_change_mode(dkd_item)}
                        style={[styles.modeTab, dkd_active && styles.modeTabActive]}
                      >
                        {dkd_active && <View style={styles.modeGlow} />}
                        <MaterialCommunityIcons
                          name={dkd_item === 'login' ? 'login-variant' : 'store-plus-outline'}
                          size={20}
                          color={dkd_active ? '#DFFBFF' : '#71849F'}
                        />
                        <Text style={[styles.modeText, dkd_active && styles.modeTextActive]}>
                          {dkd_item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.formHeader}>
                  <Text style={styles.formEyebrow}>{dkd_mode === 'login' ? 'HOŞ GELDİN' : 'YENİ İŞLETME'}</Text>
                  <Text style={styles.formTitle}>{dkd_mode === 'login' ? 'Paneline giriş yap' : 'İşletme hesabını oluştur'}</Text>
                  <Text style={styles.formDescription}>
                    {dkd_mode === 'login'
                      ? 'DraBornGo operasyonlarını kaldığın yerden yönet.'
                      : 'Kayıt anında açılır. Herhangi bir admin onayı beklemezsin.'}
                  </Text>
                </View>

                {dkd_mode === 'register' && (
                  <>
                    <View style={styles.quickInfo}>
                      <View style={styles.quickInfoIcon}>
                        <MaterialCommunityIcons name="flash" size={20} color="#06140F" />
                      </View>
                      <View style={styles.quickInfoCopy}>
                        <Text style={styles.quickInfoTitle}>Anında işletme hesabı</Text>
                        <Text style={styles.quickInfoText}>DraBornGo ortak altyapısına doğrudan bağlanır; admin onayı yok.</Text>
                      </View>
                    </View>

                    <DkdInput inputKey="ownerFullName" icon="account-tie-outline" label="İŞLETME SAHİBİ" value={dkd_form.ownerFullName} onChangeText={(dkd_value) => dkd_set('ownerFullName', dkd_value)} placeholder="Ad Soyad" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                    <DkdInput inputKey="businessName" icon="store-outline" label="İŞLETME ADI" value={dkd_form.businessName} onChangeText={(dkd_value) => dkd_set('businessName', dkd_value)} placeholder="Örn. DraBorn Burger" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                    <DkdInput inputKey="businessType" icon="shape-outline" label="İŞLETME TÜRÜ" value={dkd_form.businessType} onChangeText={(dkd_value) => dkd_set('businessType', dkd_value)} placeholder="Restoran, market, mağaza..." onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                    <DkdInput inputKey="phone" icon="phone-outline" label="TELEFON" value={dkd_form.phone} onChangeText={(dkd_value) => dkd_set('phone', dkd_value)} keyboardType="phone-pad" placeholder="05xx xxx xx xx" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                    <View style={styles.row}>
                      <View style={styles.half}><DkdInput inputKey="city" icon="city-variant-outline" label="ŞEHİR" value={dkd_form.city} onChangeText={(dkd_value) => dkd_set('city', dkd_value)} placeholder="Ankara" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} /></View>
                      <View style={styles.half}><DkdInput inputKey="district" icon="map-marker-radius-outline" label="İLÇE" value={dkd_form.district} onChangeText={(dkd_value) => dkd_set('district', dkd_value)} placeholder="Çankaya" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} /></View>
                    </View>
                    <DkdInput inputKey="address" icon="map-marker-outline" label="ADRES" value={dkd_form.address} onChangeText={(dkd_value) => dkd_set('address', dkd_value)} placeholder="İşletme adresi (opsiyonel)" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                  </>
                )}

                <DkdInput inputKey="email" icon="email-outline" label="E-POSTA" value={dkd_form.email} onChangeText={(dkd_value) => dkd_set('email', dkd_value)} keyboardType="email-address" autoCapitalize="none" placeholder="isletme@ornek.com" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />
                <DkdInput inputKey="password" icon="lock-outline" label="ŞİFRE" value={dkd_form.password} onChangeText={(dkd_value) => dkd_set('password', dkd_value)} secureTextEntry autoCapitalize="none" placeholder="En az 6 karakter" onFocusField={dkd_focus_field} onLayoutField={dkd_register_field_position} />

                {!!dkd_error && (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#FF9DA8" />
                    <Text style={styles.errorText}>{dkd_error}</Text>
                  </View>
                )}
                {!!dkd_notice && (
                  <View style={styles.noticeBox}>
                    <MaterialCommunityIcons name="email-check-outline" size={22} color="#9AF1C9" />
                    <Text style={styles.noticeText}>{dkd_notice}</Text>
                  </View>
                )}

                <Pressable onPress={dkd_submit} disabled={dkd_loading} style={styles.submitPressable}>
                  <LinearGradient colors={['#62E9FF', '#6F91FF', '#B86AFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
                    {dkd_loading ? (
                      <ActivityIndicator color="#05111B" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitText}>{dkd_mode === 'login' ? 'PANELE GİR' : 'İŞLETMEMİ OLUŞTUR'}</Text>
                        <View style={styles.submitArrow}>
                          <MaterialCommunityIcons name="arrow-right" size={22} color="#07111C" />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.securityRow}>
                  <MaterialCommunityIcons name="shield-check-outline" size={17} color="#79E6D1" />
                  <Text style={styles.securityText}>DraBornGo ortak Supabase altyapısı • Güvenli oturum</Text>
                </View>
                <Text style={styles.legal}>Kayıt olarak işletme hesabının DraBornGo ortak veri altyapısını kullanmasını kabul etmiş olursun.</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 42, paddingBottom: 230 },
  orbOne: { position: 'absolute', width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(73,214,255,.12)', top: -100, right: -120 },
  orbTwo: { position: 'absolute', width: 300, height: 300, borderRadius: 999, backgroundColor: 'rgba(166,79,255,.10)', bottom: 50, left: -180 },
  orbThree: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(86,111,255,.08)', top: 380, right: -110 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  brandCopy: { flex: 1 },
  brandIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  brandKicker: { color: '#9DEFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.45 },
  brandTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 3, letterSpacing: -.4 },
  livePill: { minHeight: 30, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(94,236,170,.10)', borderWidth: 1, borderColor: 'rgba(94,236,170,.20)' },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#67EEAB' },
  liveText: { color: '#A9F6CF', fontSize: 14, fontWeight: '900', letterSpacing: .7 },
  headline: { color: '#F8FBFF', fontSize: 35, lineHeight: 40, fontWeight: '900', marginTop: 28, maxWidth: 380, letterSpacing: -1 },
  lead: { color: '#A5B7D0', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 11, maxWidth: 390 },
  featureRail: { marginTop: 20, flexDirection: 'row', gap: 8 },
  featureItem: { flex: 1, minHeight: 66, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.045)', borderWidth: 1, borderColor: 'rgba(174,219,255,.10)', padding: 10, justifyContent: 'space-between' },
  featureIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#D8E4F4', fontSize: 14.5, fontWeight: '900' },
  cardShadow: { marginTop: 24 },
  cardBorder: { borderRadius: 31, padding: 1 },
  card: { borderRadius: 30, padding: 17, backgroundColor: 'rgba(7,17,32,.985)' },
  modeTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,.04)', padding: 5, borderRadius: 19, marginBottom: 20, gap: 5 },
  modeTab: { flex: 1, minHeight: 52, borderRadius: 15, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  modeTabActive: { backgroundColor: '#153453', borderWidth: 1, borderColor: 'rgba(118,231,255,.25)' },
  modeGlow: { position: 'absolute', width: 110, height: 70, borderRadius: 999, backgroundColor: 'rgba(91,220,255,.08)' },
  modeText: { color: '#7F91A9', fontSize: 14, fontWeight: '900' },
  modeTextActive: { color: '#E8FCFF' },
  formHeader: { marginBottom: 18, paddingHorizontal: 2 },
  formEyebrow: { color: '#78EFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  formTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 6 },
  formDescription: { color: '#91A6C1', fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 5 },
  quickInfo: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, backgroundColor: 'rgba(91,224,163,.09)', borderWidth: 1, borderColor: 'rgba(91,224,163,.18)', padding: 12, marginBottom: 16 },
  quickInfoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#70EBAE', alignItems: 'center', justifyContent: 'center' },
  quickInfoCopy: { flex: 1 },
  quickInfoTitle: { color: '#C8F7E0', fontSize: 15, fontWeight: '900' },
  quickInfoText: { color: '#99CBB4', fontSize: 14.5, lineHeight: 16, fontWeight: '700', marginTop: 2 },
  inputWrap: { marginBottom: 15 },
  inputLabel: { color: '#8CA1BF', fontSize: 14, fontWeight: '900', letterSpacing: .95, marginBottom: 8, marginLeft: 4 },
  inputShell: { minHeight: 64, borderRadius: 20, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(165,205,255,.13)', backgroundColor: 'rgba(255,255,255,.04)' },
  inputShellFocused: { borderColor: 'rgba(102,232,255,.68)', backgroundColor: 'rgba(54,197,255,.075)' },
  inputIconBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(113,142,184,.08)' },
  inputIconBoxFocused: { backgroundColor: 'rgba(92,220,255,.16)' },
  input: { flex: 1, color: '#F7FAFF', fontSize: 16, fontWeight: '800', paddingVertical: 0, minHeight: 54 },
  eyeButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  errorBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,107,124,.10)', borderWidth: 1, borderColor: 'rgba(255,107,124,.16)', borderRadius: 17, padding: 13, marginBottom: 13 },
  errorText: { color: '#FFC1C8', fontSize: 14.5, lineHeight: 18, fontWeight: '800', flex: 1 },
  noticeBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(91,224,163,.09)', borderWidth: 1, borderColor: 'rgba(91,224,163,.16)', borderRadius: 17, padding: 13, marginBottom: 13 },
  noticeText: { color: '#C2F5DC', fontSize: 14.5, lineHeight: 18, fontWeight: '800', flex: 1 },
  submitPressable: { marginTop: 4 },
  submit: { minHeight: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  submitText: { color: '#06111D', fontSize: 15, fontWeight: '900', letterSpacing: .65 },
  submitArrow: { width: 35, height: 35, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.30)', alignItems: 'center', justifyContent: 'center' },
  securityRow: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  securityText: { color: '#7899A3', fontSize: 14, fontWeight: '800' },
  legal: { color: '#61748D', fontSize: 14, lineHeight: 16, textAlign: 'center', fontWeight: '700', marginTop: 10, paddingHorizontal: 10 },
});
