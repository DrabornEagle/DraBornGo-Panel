import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { dkd_gradients, dkd_theme } from '../lib/theme';

export function dkd_money(dkd_value) {
  const dkd_number_value = Number(dkd_value || 0);
  return `${(Number.isFinite(dkd_number_value) ? dkd_number_value : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function dkd_duration(dkd_seconds) {
  const dkd_value = Math.max(0, Number(dkd_seconds || 0));
  const dkd_hours = Math.floor(dkd_value / 3600);
  const dkd_minutes = Math.floor((dkd_value % 3600) / 60);
  return dkd_hours > 0 ? `${dkd_hours} sa ${dkd_minutes} dk` : `${dkd_minutes} dk`;
}

export function DkdAnimatedCard({ children, style, delay = 0 }) {
  const dkd_opacity = useRef(new Animated.Value(0)).current;
  const dkd_translate = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(dkd_opacity, { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.spring(dkd_translate, { toValue: 0, delay, speed: 18, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [delay, dkd_opacity, dkd_translate]);
  return <Animated.View style={[style, { opacity: dkd_opacity, transform: [{ translateY: dkd_translate }] }]}>{children}</Animated.View>;
}

export function DkdHero({ businessName, subtitle, onRefresh, refreshing }) {
  return (
    <LinearGradient colors={dkd_gradients.hero} style={styles.hero}>
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      <View style={styles.heroTop}>
        <View style={styles.brandIcon}><MaterialCommunityIcons name="storefront-outline" size={27} color="#06131F" /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>DRABORNGO PANEL • v0.0.3</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>{businessName || 'İşletme Paneli'}</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text>
        </View>
        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => null); onRefresh?.(); }} disabled={refreshing} style={styles.refreshButton}>
          <MaterialCommunityIcons name={refreshing ? 'progress-clock' : 'refresh'} size={21} color="#E8F7FF" />
        </Pressable>
      </View>
      <View style={styles.heroBadgeRow}>
        <View style={styles.heroBadge}><View style={styles.liveDot} /><Text style={styles.heroBadgeText}>Canlı Supabase</Text></View>
        <View style={styles.heroBadge}><MaterialCommunityIcons name="shield-check-outline" size={13} color="#99F0D0" /><Text style={styles.heroBadgeText}>RLS korumalı</Text></View>
      </View>
    </LinearGradient>
  );
}

export function DkdSectionTitle({ icon, title, subtitle, actionLabel, onAction }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionIcon}><MaterialCommunityIcons name={icon} size={18} color={dkd_theme.cyan} /></View><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text>{!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}</View>{!!actionLabel && <Pressable onPress={onAction} style={styles.sectionAction}><Text style={styles.sectionActionText}>{actionLabel}</Text></Pressable>}</View>;
}

export function DkdMetricCard({ icon, label, value, sub, gradient = dkd_gradients.cyanBlue, delay = 0 }) {
  return <DkdAnimatedCard delay={delay} style={styles.metricFlex}><LinearGradient colors={gradient} style={styles.metricCard}><View style={styles.metricIcon}><MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" /></View><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>{!!sub && <Text style={styles.metricSub}>{sub}</Text>}</LinearGradient></DkdAnimatedCard>;
}

export function DkdPeriodTabs({ value, onChange }) {
  const dkd_items = [['hourly', 'Saatlik'], ['daily', 'Günlük'], ['weekly', 'Haftalık'], ['monthly', 'Aylık']];
  return <View style={styles.periodWrap}>{dkd_items.map(([dkd_key, dkd_label]) => { const dkd_active = value === dkd_key; return <Pressable key={dkd_key} onPress={() => { Haptics.selectionAsync().catch(() => null); onChange(dkd_key); }} style={[styles.periodChip, dkd_active && styles.periodChipActive]}><Text style={[styles.periodText, dkd_active && styles.periodTextActive]}>{dkd_label}</Text></Pressable>; })}</View>;
}

export function DkdStatusPill({ text, tone = 'blue' }) {
  const dkd_map = { green: { bg: 'rgba(91,224,163,.14)', fg: '#7CF2BC' }, red: { bg: 'rgba(255,107,124,.14)', fg: '#FF9EAA' }, yellow: { bg: 'rgba(255,214,107,.14)', fg: '#FFE08A' }, blue: { bg: 'rgba(102,232,255,.12)', fg: '#99F2FF' }, violet: { bg: 'rgba(169,107,255,.14)', fg: '#C89FFF' } };
  const dkd_style = dkd_map[tone] || dkd_map.blue;
  const dkd_status_key_value = String(text || '').trim().toUpperCase();
  const dkd_status_label_value = ({
    ACCEPTED: 'KABUL EDİLDİ',
    ASSIGNED: 'KABUL EDİLDİ',
    TO_PICKUP: 'ALIM NOKTASINA GİDİYOR',
    PICKED_UP: 'TESLİMATTA',
    TO_CUSTOMER: 'TESLİMATTA',
    DELIVERING: 'TESLİMATTA',
    OPEN: 'BEKLİYOR',
    READY: 'HAZIR',
    PUBLISHED: 'YAYINDA',
    WAITING: 'BEKLİYOR',
    PENDING: 'BEKLİYOR',
    DKD_ASSIGNED_OFFER: 'KABUL BEKLİYOR',
    ASSIGNED_OFFER: 'KABUL BEKLİYOR',
    COURIER_OFFER: 'KABUL BEKLİYOR',
    AUTO_ASSIGNED: 'KABUL BEKLİYOR',
    COMPLETED: 'TAMAMLANDI',
    DELIVERED: 'TESLİM EDİLDİ',
    CANCELLED: 'İPTAL',
    CANCELED: 'İPTAL',
  })[dkd_status_key_value] || text;
  return <View style={[styles.pill, { backgroundColor: dkd_style.bg }]}><Text style={[styles.pillText, { color: dkd_style.fg }]}>{dkd_status_label_value}</Text></View>;
}

export function DkdEmptyState({ icon = 'inbox-outline', title, text }) {
  return <View style={styles.emptyCard}><View style={styles.emptyIcon}><MaterialCommunityIcons name={icon} size={28} color={dkd_theme.cyan} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(159,224,255,.18)', minHeight: 172 },
  heroGlowOne: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(102,232,255,.12)', top: -90, right: -70 },
  heroGlowTwo: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: 'rgba(255,109,178,.10)', bottom: -135, left: -110 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#7EEBFF', alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1 },
  kicker: { color: '#BAF4FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.3 }, heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 3 }, heroSubtitle: { color: 'rgba(241,248,255,.68)', fontSize: 14, fontWeight: '700', marginTop: 4, lineHeight: 16 },
  refreshButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.09)', alignItems: 'center', justifyContent: 'center' }, heroBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 18 }, heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 29, borderRadius: 12, backgroundColor: 'rgba(4,13,25,.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' }, heroBadgeText: { color: '#D8E8F7', fontSize: 13, fontWeight: '800' }, liveDot: { width: 7, height: 7, borderRadius: 9, backgroundColor: '#5BE0A3' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, marginBottom: 10 }, sectionIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: 'rgba(102,232,255,.09)', alignItems: 'center', justifyContent: 'center' }, sectionCopy: { flex: 1 }, sectionTitle: { color: dkd_theme.text, fontSize: 16, fontWeight: '900' }, sectionSubtitle: { color: dkd_theme.textSoft, fontSize: 13.5, fontWeight: '700', marginTop: 2 }, sectionAction: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(91,140,255,.12)' }, sectionActionText: { color: '#AFC7FF', fontSize: 13.5, fontWeight: '900' },
  metricFlex: { flex: 1, minWidth: '47%' }, metricCard: { minHeight: 126, borderRadius: 22, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', overflow: 'hidden' }, metricIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.10)', alignItems: 'center', justifyContent: 'center' }, metricLabel: { color: 'rgba(255,255,255,.68)', fontSize: 13, fontWeight: '900', letterSpacing: .5, marginTop: 11 }, metricValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 4 }, metricSub: { color: 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: '700', marginTop: 5 },
  periodWrap: { flexDirection: 'row', gap: 7, backgroundColor: 'rgba(255,255,255,.035)', padding: 5, borderRadius: 17, borderWidth: 1, borderColor: dkd_theme.border }, periodChip: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 13 }, periodChipActive: { backgroundColor: '#132F50' }, periodText: { color: dkd_theme.muted, fontSize: 13.5, fontWeight: '900' }, periodTextActive: { color: '#C8F7FF' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, pillText: { fontSize: 13, fontWeight: '900', letterSpacing: .35 }, emptyCard: { alignItems: 'center', padding: 26, borderRadius: 23, backgroundColor: dkd_theme.surface, borderWidth: 1, borderColor: dkd_theme.border }, emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(102,232,255,.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 11 }, emptyTitle: { color: dkd_theme.text, fontSize: 15, fontWeight: '900' }, emptyText: { color: dkd_theme.textSoft, fontSize: 14, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginTop: 5 },
});
