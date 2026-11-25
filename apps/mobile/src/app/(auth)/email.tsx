import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, PageGlow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/session/context';

export default function EmailLoginScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = email.trim();
    const nextErrors: typeof fieldErrors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) nextErrors.email = 'Enter a valid e-mail address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setFormError(null);
    try {
      await signIn({ email: trimmed, password });
      // `next` only ever holds an in-app path, so a crafted link cannot steer a
      // sign-in anywhere else.
      const target = params.next?.startsWith('/') ? params.next : '/(tabs)';
      router.replace(target as never);
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
            style={styles.back}>
            <Ionicons name="arrow-back" size={23} color={theme.text} />
          </Pressable>

          <ThemedText style={[styles.pageTitle, { color: theme.text }]}>
            Sign in with e-mail
          </ThemedText>

          <View style={styles.hero}>
            <BrandLogo scale={1.3} align="center" />
            <ThemedText style={[styles.heroCopy, { color: theme.text }]}>
              Cars, bikes and vans by the day.{'\n'}Sign in to book one.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              error={fieldErrors.password}
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

            <Button title="Sign in" onPress={() => void submit()} loading={busy} />

            <View style={styles.links}>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/(auth)/forgot-password')}>
                <ThemedText style={[styles.link, { color: theme.accentGold }]}>
                  Forgot password?
                </ThemedText>
              </Pressable>
              <View style={[styles.linkDivider, { backgroundColor: theme.lineStrong }]} />
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/(auth)/register')}>
                <ThemedText style={[styles.link, { color: theme.accentGold }]}>
                  Create an account
                </ThemedText>
              </Pressable>
            </View>

            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/(auth)/login')}>
              <ThemedText style={[styles.phoneLink, { color: theme.accentGold }]}>
                Use my mobile number instead
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  pageTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  hero: { alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  heroCopy: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  link: { fontSize: 14, fontWeight: '700' },
  linkDivider: { width: 1, height: 14 },
  phoneLink: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
