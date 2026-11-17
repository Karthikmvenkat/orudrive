import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
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
      <View style={styles.wrap}>
        <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="mail-open-outline" size={28} color={theme.brandStrong} />
        </View>
        <ThemedText type="heading">Confirm your e-mail</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
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
            <Link href="/(auth)/email" asChild>
              <ThemedText type="link" themeColor="brand" style={styles.skip}>
                Skip for now, sign in
              </ThemedText>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  icon: { width: 52, height: 52, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  skip: { textAlign: 'center' },
});
