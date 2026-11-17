import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi, catalogueApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';

const HERO_CIRCLES = [
  { size: 320, top: -120, right: -90, opacity: 0.09 },
  { size: 220, top: 120, right: -60, opacity: 0.06 },
];

export default function LoginScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ next?: string }>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ vehicles: number; rating: number | null } | null>(null);

  // The hero numbers come from the live catalogue rather than a fixed marketing
  // claim, so what the customer reads is what the API can actually back.
  useEffect(() => {
    let active = true;
    catalogueApi
      .vehicles({ limit: 100 })
      .then((page) => {
        if (!active) return;
        const rated = page.items
          .map((vehicle) => Number(vehicle.rating))
          .filter((rating) => Number.isFinite(rating) && rating > 0);
        setStats({
          vehicles: page.meta.total,
          rating: rated.length ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length : null,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const heroStats = [
    { value: stats ? String(stats.vehicles) : '—', label: 'Vehicles ready' },
    { value: stats?.rating ? stats.rating.toFixed(1) : '—', label: 'Fleet rating' },
    { value: '24/7', label: 'Support' },
  ];

  async function submit() {
    const digits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Enter the 10-digit mobile number you ride with.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sent = await authApi.requestPhoneCode(`+91${digits}`);
      router.push({
        pathname: '/(auth)/verify',
        params: {
          phone: digits,
          ...(sent.devCode ? { devCode: sent.devCode } : {}),
          ...(typeof params.next === 'string' && params.next.startsWith('/') ? { next: params.next } : {}),
        },
      });
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.hero }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.hero}>
              {HERO_CIRCLES.map((circle) => (
                <View
                  key={circle.size}
                  pointerEvents="none"
                  style={[
                    styles.heroCircle,
                    {
                      width: circle.size,
                      height: circle.size,
                      borderRadius: circle.size / 2,
                      top: circle.top,
                      right: circle.right,
                      backgroundColor: `rgba(201,241,107,${circle.opacity})`,
                    },
                  ]}
                />
              ))}

              <View style={styles.heroTop}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>S</Text>
                </View>
                <View style={styles.brandRow}>
                  <Text style={styles.brandName}>Savari</Text>
                  <Text style={styles.brandNameGo}>Go</Text>
                </View>
                <View style={styles.language}>
                  <Ionicons name="globe-outline" size={16} color="#ffffff" />
                  <Text style={styles.languageText}>English</Text>
                </View>
              </View>

              <View style={styles.trustPill}>
                <View style={styles.trustDot} />
                <Text style={styles.trustText}>Puducherry's trusted rental platform</Text>
              </View>

              <View style={styles.headline}>
                <Text style={styles.headlineText}>Your ride.</Text>
                <Text style={styles.headlineText}>Your city.</Text>
                <Text style={[styles.headlineText, { color: theme.lime }]}>Your freedom.</Text>
              </View>

              <View style={styles.stats}>
                {heroStats.map((stat) => (
                  <View key={stat.label} style={styles.statTile}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="display">Log in or sign up</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                We'll text you a one-time code. No password needed.
              </ThemedText>

              <View
                style={[
                  styles.phoneShell,
                  { borderColor: error ? theme.danger : theme.brand, backgroundColor: theme.backgroundElement },
                ]}>
                <View style={styles.dial}>
                  <Text style={[styles.dialText, { color: theme.text }]}>+91</Text>
                  <Ionicons name="chevron-down" size={15} color={theme.text} />
                </View>
                <View style={[styles.dialDivider, { backgroundColor: theme.line }]} />
                <TextInput
                  value={phone}
                  onChangeText={(next) => {
                    setPhone(next.replace(/\D/g, '').slice(0, 10));
                    if (error) setError(null);
                  }}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={10}
                  placeholder="Mobile number"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Mobile number"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  style={[styles.phoneInput, { color: theme.text }]}
                />
              </View>

              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: busy }}
                disabled={busy}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.continue,
                  { backgroundColor: theme.brand, opacity: busy ? 0.7 : pressed ? 0.92 : 1 },
                ]}>
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.continueText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </Pressable>

              <View style={styles.assurance}>
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.brandStrong} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.assuranceText}>
                  Verified vehicles, free cancellation up to 24h before pick-up
                </ThemedText>
              </View>

              <View style={styles.sheetSpacer} />

              <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} hitSlop={8}>
                <Text style={[styles.explore, { color: theme.brand }]}>Explore without an account</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/email')} hitSlop={8}>
                <Text style={[styles.emailLink, { color: theme.brandStrong }]}>
                  Sign in with e-mail and password
                </Text>
              </Pressable>

              <Text style={[styles.terms, { color: theme.textSecondary }]}>
                By continuing you agree to our <Text style={styles.termsBold}>Terms</Text> and{' '}
                <Text style={styles.termsBold}>Privacy Policy</Text>.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  heroCircle: { position: 'absolute' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#37b24d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', flex: 1 },
  brandName: { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  brandNameGo: { color: '#c9f16b', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  languageText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  trustPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(201,241,107,0.14)',
    marginTop: Spacing.two,
  },
  trustDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c9f16b' },
  trustText: { color: '#c9f16b', fontSize: 13, fontWeight: '600' },
  headline: { gap: 2, marginTop: Spacing.two },
  headlineText: {
    color: '#ffffff',
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  stats: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  statTile: {
    flex: 1,
    borderRadius: Radius.tile,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sheet: {
    flexGrow: 1,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  phoneShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: Radius.field,
    minHeight: 62,
    marginTop: Spacing.one,
  },
  dial: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three },
  dialText: { fontSize: 17, fontWeight: '700' },
  dialDivider: { width: 1, alignSelf: 'stretch', marginVertical: 14 },
  phoneInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingHorizontal: Spacing.three, paddingVertical: 12 },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: Radius.field,
  },
  continueText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assuranceText: { flex: 1 },
  sheetSpacer: { flexGrow: 1, minHeight: Spacing.four },
  explore: { textAlign: 'center', fontSize: 15, fontWeight: '800' },
  emailLink: { textAlign: 'center', fontSize: 13, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: 13, lineHeight: 19 },
  termsBold: { fontWeight: '700', color: '#1f7a3a' },
});
