import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Field, PageGlow } from '@/components/ui';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <PageGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
              style={styles.back}>
              <Ionicons name="arrow-back" size={23} color={theme.text} />
            </Pressable>
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              Create Account
            </ThemedText>
          </View>

          <View style={styles.copy}>
            <ThemedText type="display" style={styles.title}>
              Create your account
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              One account for bookings, payments and the driver updates on your trips.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Field label="Full Name" value={fullName} onChangeText={setFullName} autoComplete="name" error={errors.fullName} />
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email}
            />
            <Field
              label="Mobile (Optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="9876543210"
              autoComplete="tel"
              error={errors.phone}
            />
            <Field label="City (Optional)" value={city} onChangeText={setCity} placeholder="Puducherry" error={errors.city} />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              placeholder="At least 8 characters, one letter, one number"
              error={errors.password}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  onPress={() => setShowPassword((shown) => !shown)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              }
            />

            {formError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {formError}
              </ThemedText>
            ) : null}

            <Button
              title="Create Account"
              onPress={() => void submit()}
              loading={busy}
              icon={<Ionicons name="arrow-forward" size={17} color={theme.onBrand} />}
            />

            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.replace('/(auth)/login')}>
              <ThemedText style={[styles.already, { color: theme.accentGold }]}>
                I already have an account
              </ThemedText>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary" style={styles.terms}>
              By continuing you agree to SavariGo's rental terms and privacy policy.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', marginLeft: -6 },
  headerTitle: { fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 },
  copy: { gap: Spacing.two, marginTop: Spacing.three },
  title: { fontSize: 26, lineHeight: 31 },
  form: { gap: Spacing.three, marginTop: Spacing.one },
  already: { textAlign: 'center', fontSize: 14, fontWeight: '700' },
  terms: { textAlign: 'center', lineHeight: 17 },
});
