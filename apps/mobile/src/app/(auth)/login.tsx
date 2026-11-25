import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

import { PageGlow } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';

const PERKS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Verified vehicles, free cancellation up to 24h' },
  { icon: 'flash-outline' as const, label: 'Quick & easy booking' },
  { icon: 'headset-outline' as const, label: '24/7 customer support' },
];

export default function LoginScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ next?: string }>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <PageGlow />
      <StatusBar style="dark" />
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              style={styles.back}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>

            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>Log in or sign up</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                We'll text you a one-time code. No password needed.
              </Text>
            </View>

            <View
              style={[
                styles.phoneShell,
                {
                  borderColor: error ? theme.danger : theme.brand,
                  backgroundColor: theme.backgroundElement,
                },
              ]}>
                <View style={styles.dial}>
                  <Text style={[styles.dialText, { color: theme.text }]}>+91</Text>
                  <Ionicons name="chevron-down" size={15} color={theme.textSecondary} />
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
                <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
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
                  <ActivityIndicator color={theme.onBrand} />
                ) : (
                  <>
                    <Text style={[styles.continueText, { color: theme.onBrand }]}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={theme.onBrand} />
                  </>
                )}
              </Pressable>

              <View style={styles.perks}>
                {PERKS.map((perk) => (
                  <View key={perk.label} style={styles.perk}>
                    <Ionicons name={perk.icon} size={22} color={theme.accentGold} />
                    <Text style={[styles.perkText, { color: theme.text }]}>{perk.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.spacer} />

              <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} hitSlop={8}>
                <Text style={[styles.explore, { color: theme.accentGold }]}>Explore without an account</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/email')} hitSlop={8}>
                <Text style={[styles.emailLink, { color: theme.accentGold }]}>
                  Sign in with e-mail and password
                </Text>
              </Pressable>

              <Text style={[styles.terms, { color: theme.textSecondary }]}>
                By continuing you agree to our <Text style={[styles.termsBold, { color: theme.brandStrong }]}>Terms</Text> and{' '}
                <Text style={[styles.termsBold, { color: theme.brandStrong }]}>Privacy Policy</Text>.
              </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  copy: { gap: 8, marginTop: Spacing.four },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, lineHeight: 21, fontWeight: '500', maxWidth: '94%' },
  phoneShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.field,
    minHeight: 60,
    marginTop: Spacing.four,
  },
  dial: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three },
  dialText: { fontSize: 16, fontWeight: '700' },
  dialDivider: { width: 1, alignSelf: 'stretch', marginVertical: 14 },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  error: { fontSize: 13, fontWeight: '600', marginTop: Spacing.two },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: Radius.field,
    marginTop: Spacing.three,
  },
  continueText: { fontSize: 17, fontWeight: '800' },
  perks: { gap: 16, marginTop: Spacing.five },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  spacer: { flexGrow: 1, minHeight: Spacing.five },
  explore: { textAlign: 'center', fontSize: 14, fontWeight: '800', paddingVertical: 6 },
  emailLink: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 4 },
  terms: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: Spacing.three },
  termsBold: { fontWeight: '700' },
});
