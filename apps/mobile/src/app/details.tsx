import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { accountApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/session/context';

export default function PersonalDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { me, user, refreshMe } = useSession();
  const profile = me?.customerProfile ?? null;
  // Phone-first accounts get a synthetic address; showing it would confuse the rider.
  const shownEmail = me?.email && !me.email.endsWith('@phone.savarigo.app') ? me.email : null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? user?.fullName ?? '');
    setPhone(me?.phone ?? '');
    setCity(profile?.city ?? '');
    setDateOfBirth(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
  }, [me, profile, user]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await accountApi.updateProfile({
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(dateOfBirth.trim() ? { dateOfBirth: dateOfBirth.trim() } : {}),
      });
      if (phone.trim() && phone.trim() !== (me?.phone ?? '')) {
        await accountApi.updateMe({ phone: phone.trim() });
      }
      await refreshMe();
      setFeedback('Saved.');
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen tabBarSpace={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <PageHeader
          title="Personal details"
          subtitle="Used on your bookings and at pick-up"
          onBack={() => router.back()}
        />

        <Section title="Contact">
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <Field
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="9876543210"
          />
          {shownEmail ? (
            <ThemedText type="small" themeColor="textSecondary">
              {shownEmail}
            </ThemedText>
          ) : null}
        </Section>

        <Section title="About you">
          <Field label="City" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Puducherry" />
          <Field
            label="Date of birth"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-04-18"
            inputMode="numeric"
          />
        </Section>

        {feedback ? (
          <ThemedText type="small" style={{ color: theme.brandStrong }}>
            {feedback}
          </ThemedText>
        ) : null}
        {error ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {error}
          </ThemedText>
        ) : null}

        <Button title="Save changes" loading={saving} onPress={save} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.five },
});
