import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Notice } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/session/context';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskPhone(digits: string): string {
  const tail = digits.slice(-4).padStart(4, '•');
  return `+91 •••• •${tail}`;
}

export default function VerifyScreen() {
  const theme = useTheme();
  const { signInWithPhone } = useSession();
  const params = useLocalSearchParams<{ phone?: string; devCode?: string; next?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone.replace(/\D/g, '') : '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [devCode, setDevCode] = useState(
    typeof params.devCode === 'string' ? params.devCode : null,
  );

  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function verify(candidate?: string) {
    const value = candidate ?? code;
    if (!/^\d{6}$/.test(value)) {
      setError('Enter the 6 digits from the text message.');
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await signInWithPhone({ phone: `+91${phone}`, code: value });
      // `next` only ever holds an in-app path, so a crafted link cannot steer a
      // sign-in anywhere else.
      const target =
        typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/(tabs)';
      router.replace(target as never);
    } catch (cause) {
      setError(describeApiError(cause));
      setBusy(false);
      submitting.current = false;
    }
  }

  function onChange(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === CODE_LENGTH) void verify(digits);
  }

  async function resend() {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const sent = await authApi.requestPhoneCode(`+91${phone}`);
      if (sent.devCode) setDevCode(sent.devCode);
      setCode('');
      setSeconds(RESEND_SECONDS);
      input.current?.focus();
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setResending(false);
    }
  }

  const active = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <View style={styles.body}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.back,
                { backgroundColor: theme.backgroundElement, borderColor: theme.line, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.step}>
              Step 2 of 2
            </ThemedText>
            <View style={styles.back} />
          </View>

          <View style={[styles.iconTile, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name="phone-portrait-outline" size={26} color={theme.brandStrong} />
          </View>

          <ThemedText type="title">Verify your number</ThemedText>
          <View style={styles.subtitle}>
            <ThemedText type="body" themeColor="textSecondary">
              Enter the 6-digit code sent to{' '}
              <ThemedText type="body" style={styles.masked}>
                {maskPhone(phone)}
              </ThemedText>
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="link" style={{ color: theme.brand }}>
                Edit
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="none"
            onPress={() => input.current?.focus()}
            style={styles.codeRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const digit = code[index] ?? '';
              const isActive = !busy && index === active;
              return (
                <View
                  key={index}
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: digit ? theme.brandSoft : theme.backgroundElement,
                      borderColor: isActive ? theme.brand : digit ? theme.brandSoft : theme.line,
                      borderWidth: isActive ? 2 : 1,
                    },
                    isActive && styles.codeBoxActive,
                  ]}>
                  <Text style={[styles.codeDigit, { color: theme.text }]}>{digit}</Text>
                </View>
              );
            })}
            <TextInput
              ref={input}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={CODE_LENGTH}
              autoFocus
              caretHidden
              editable={!busy}
              style={styles.hiddenInput}
              accessibilityLabel="6-digit verification code"
            />
          </Pressable>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          {devCode && !busy ? (
            <Notice
              icon="construct-outline"
              text={`No SMS gateway is connected to this API, so the code is shown here: ${devCode}`}
            />
          ) : null}

          <View style={styles.resendRow}>
            <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
            {seconds > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Resend code in{' '}
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  0:{String(seconds).padStart(2, '0')}
                </ThemedText>
              </ThemedText>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => void resend()} hitSlop={8} disabled={resending}>
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  {resending ? 'Sending a fresh code…' : 'Resend code'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Verify & continue"
            loading={busy}
            disabled={code.length !== CODE_LENGTH}
            onPress={() => void verify()}
          />
          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              We only use your number for booking updates.
            </ThemedText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { flex: 1, textAlign: 'center' },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: Radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  subtitle: { gap: Spacing.one, marginBottom: Spacing.two },
  masked: { fontWeight: '800' },
  codeRow: { flexDirection: 'row', gap: Spacing.two },
  codeBox: {
    flex: 1,
    height: 62,
    borderRadius: Radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: {
    shadowColor: '#1f7a3a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  codeDigit: { fontSize: 26, fontWeight: '800' },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 62,
    opacity: 0.02,
    color: 'transparent',
  },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
