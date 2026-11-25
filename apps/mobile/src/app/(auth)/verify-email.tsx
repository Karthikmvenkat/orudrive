import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, PageGlow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);

  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your e-mail.');
      return;
    }
    setBusy('verify');
    setError(null);
    try {
      await authApi.verifyOtp({ email: email.trim(), purpose: 'EMAIL_VERIFICATION', code });
      // Verification issues no session, so the customer still has to sign in
      // with the password they chose during registration.
      setDone(true);
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy('resend');
    setError(null);
    try {
      await authApi.resendOtp({ email: email.trim(), purpose: 'EMAIL_VERIFICATION' });
      setResent(true);
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <PageGlow />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/email'))}
          style={styles.back}>
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>

        <ThemedText style={[styles.pageTitle, { color: theme.text }]}>Verify e-mail</ThemedText>

        <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="mail" size={30} color={theme.accentGold} />
        </View>

        <ThemedText style={[styles.heading, { color: theme.text }]}>
          Confirm your e-mail
        </ThemedText>
        <ThemedText style={[styles.lede, { color: theme.textSecondary }]}>
          We sent a 6-digit code to {email.trim() || 'your address'}. Enter it here to activate
          bookings for this account.
        </ThemedText>

        {done ? (
          <View style={styles.form}>
            <Badge text="E-mail confirmed" tone="good" />
            <Button title="Continue to sign in" onPress={() => router.replace('/(auth)/email')} />
          </View>
        ) : (
          <View style={styles.form}>
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field
              label="Code"
              value={code}
              onChangeText={(next) => setCode(next.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              placeholder="000000"
              error={error}
            />
            {resent ? <Badge text="A fresh code is on its way" tone="good" /> : null}

            <Button title="Verify" onPress={() => void verify()} loading={busy === 'verify'} />
            <Button title="Resend code" variant="secondary" onPress={() => void resend()} loading={busy === 'resend'} />
            <Pressable
              accessibilityRole="link"
              style={styles.skipRow}
              onPress={() => router.replace('/(auth)/email')}>
              <ThemedText style={[styles.skip, { color: theme.accentGold }]}>
                Skip for now, sign in
              </ThemedText>
              <Ionicons name="arrow-forward" size={16} color={theme.accentGold} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.five, gap: Spacing.three },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  pageTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.3 },
  lede: { fontSize: 15, lineHeight: 22 },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  skipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  skip: { fontSize: 14, fontWeight: '700' },
});
