import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/session/context';

export default function EmailLoginScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.avoider}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: theme.hero }]}>
            <ThemedText type="title" style={[styles.markText, { color: theme.lime }]}>
              SavariGo
            </ThemedText>
          </View>
          <ThemedText type="body" themeColor="textSecondary">
            Cars, bikes and vans by the day. Sign in to book one.
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
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={fieldErrors.password}
          />

          {formError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {formError}
            </ThemedText>
          ) : null}

          <Button title="Sign in" onPress={() => void submit()} loading={busy} />

          <View style={styles.links}>
            <Link href="/(auth)/forgot-password" asChild>
              <ThemedText type="link" themeColor="brand">
                Forgot password?
              </ThemedText>
            </Link>
            <Link href="/(auth)/register" asChild>
              <ThemedText type="link" themeColor="brand">
                Create an account
              </ThemedText>
            </Link>
          </View>

          <Link href="/(auth)/login" asChild>
            <ThemedText type="link" themeColor="brand" style={styles.phoneLink}>
              Use my mobile number instead
            </ThemedText>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  avoider: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.five },
  brand: { gap: Spacing.two },
  mark: { alignSelf: 'flex-start', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.card },
  markText: {},
  form: { gap: Spacing.three },
  links: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  phoneLink: { textAlign: 'center' },
});
