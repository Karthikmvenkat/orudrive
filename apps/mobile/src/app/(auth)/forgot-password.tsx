import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Field, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api/endpoints';
import { ApiError, describeApiError } from '@/lib/api/errors';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.forgotPassword(email.trim());
      setMessage(result.message);
      // The API only returns the code when mail delivery is switched off, which
      // is how the development database runs.
      setDevCode(result.devCode ?? null);
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!PASSWORD_RULE.test(password)) {
      setError('Use at least 8 characters with a letter and a number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.resetPassword({ email: email.trim(), code: code.trim(), newPassword: password });
      setMessage(result.message);
      router.replace({ pathname: '/(auth)/login', params: { next: '/(tabs)/profile' } });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : describeApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabBarSpace={false} style={styles.screen}>
      <ThemedText type="title">Reset password</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        We send a six-digit code to the e-mail on your account.
      </ThemedText>

      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
        returnKeyType="send"
        onSubmitEditing={sendCode}
      />
      <Button title="Send code" loading={busy && !code} disabled={!email.trim()} onPress={sendCode} />

      {message ? (
        <ThemedText type="small" themeColor="brandStrong">
          {message}
        </ThemedText>
      ) : null}
      {devCode ? (
        <ThemedText type="code" themeColor="textSecondary">
          Development code: {devCode}
        </ThemedText>
      ) : null}

      <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="482913" />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="At least 8 characters, one letter, one number"
      />
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
      <Button
        title="Set new password"
        variant="secondary"
        loading={busy && Boolean(code)}
        disabled={!code.trim() || !password}
        onPress={reset}
      />
      <Button title="Back to sign in" variant="ghost" style={styles.back} onPress={() => router.replace('/(auth)/login')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: Spacing.three },
  back: { marginTop: Spacing.one },
});
