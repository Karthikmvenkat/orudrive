import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/session/context';

/** Mirrors the API's own password rule so a rejection never arrives as a surprise. */
function passwordProblem(value: string): string | null {
  if (value.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(value)) return 'Include at least one letter.';
  if (!/\d/.test(value)) return 'Include at least one number.';
  if (value.length > 72) return 'Keep the password under 72 characters.';
  return null;
}

const INDIAN_MOBILE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export default function RegisterScreen() {
  const theme = useTheme();
  const { signUp } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next: Record<string, string> = {};
    const trimmedEmail = email.trim();
    if (fullName.trim().length < 2) next.fullName = 'Tell us what to call you.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) next.email = 'Enter a valid e-mail address.';
    if (phone.trim() && !INDIAN_MOBILE.test(phone.trim())) next.phone = 'Use a 10-digit Indian mobile number.';
    const passwordIssue = passwordProblem(password);
    if (passwordIssue) next.password = passwordIssue;
    setErrors(next);

    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFormError(null);
    try {
      await signUp({
        email: trimmedEmail,
        password,
        fullName: fullName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
      });
      router.replace({ pathname: '/(auth)/verify-email', params: { email: trimmedEmail } });
    } catch (cause) {
      setFormError(describeApiError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.avoider}>
        <View style={styles.header}>
          <ThemedText type="heading">Create your account</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            One account for bookings, payments and the driver updates on your trips.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" error={errors.fullName} />
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
          <Field
            label="Mobile (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="9876543210"
            autoComplete="tel"
            error={errors.phone}
          />
          <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Puducherry" error={errors.city} />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />

          {formError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {formError}
            </ThemedText>
          ) : null}

          <Button title="Create account" onPress={() => void submit()} loading={busy} />

          <Link href="/(auth)/login" asChild>
            <ThemedText type="link" themeColor="brand" style={styles.already}>
              I already have an account
            </ThemedText>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  avoider: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.one },
  form: { gap: Spacing.three },
  already: { textAlign: 'center' },
});
