import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!PASSWORD_RULE.test(next)) {
      setError('Use at least 8 characters with a letter and a number.');
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword({
        currentPassword: current,
        newPassword: next,
        ...(revokeOthers ? { revokeOtherSessions: true } : {}),
      });
      setDone(true);
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabBarSpace={false} style={styles.body}>
      <ThemedText type="title">Change password</ThemedText>

      {done ? (
        <Card>
          <ThemedText type="subtitle">Password updated.</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {revokeOthers
              ? 'Other devices were signed out and need the new password.'
              : 'Your other devices stay signed in.'}
          </ThemedText>
          <Button title="Back to account" onPress={() => router.replace('/(tabs)/profile')} />
        </Card>
      ) : (
        <>
          <Field
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label="New password"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 8 characters, one letter, one number"
          />
          <Field
            label="Repeat new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            title={revokeOthers ? 'Sign out other devices: on' : 'Sign out other devices: off'}
            variant="secondary"
            onPress={() => setRevokeOthers((value) => !value)}
          />
          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}
          <Button
            title="Update password"
            loading={busy}
            disabled={!current || !next || !confirm}
            onPress={submit}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
});
