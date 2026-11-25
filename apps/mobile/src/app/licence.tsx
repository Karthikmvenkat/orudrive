import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Notice, PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { accountApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import { formatDayYear } from '@/lib/format';
import { useSession } from '@/lib/session/context';

export default function LicenceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { me, refreshMe } = useSession();
  const profile = me?.customerProfile ?? null;

  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLicenceNumber(profile?.licenceNumber ?? '');
    setLicenceExpiry(profile?.licenceExpiry ? profile.licenceExpiry.slice(0, 10) : '');
  }, [profile]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await accountApi.updateProfile({
        ...(licenceNumber.trim() ? { licenceNumber: licenceNumber.trim().toUpperCase() } : {}),
        ...(licenceExpiry.trim() ? { licenceExpiry: licenceExpiry.trim() } : {}),
      });
      await refreshMe();
      setFeedback('Licence saved.');
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
          title="Driving licence & ID"
          subtitle="The hub checks these before hand-over"
          onBack={() => router.back()}
        />

        <View style={styles.statusRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Verification
          </ThemedText>
          <Badge
            text={profile?.licenceVerifiedAt ? 'Verified' : 'Not verified yet'}
            tone={profile?.licenceVerifiedAt ? 'good' : 'neutral'}
          />
        </View>
        {profile?.licenceVerifiedAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            Verified on {formatDayYear(profile.licenceVerifiedAt)}
          </ThemedText>
        ) : null}

        <Section title="Licence">
          <Field
            label="Licence number"
            value={licenceNumber}
            onChangeText={setLicenceNumber}
            autoCapitalize="characters"
            placeholder="TN-01-20150012345"
          />
          <Field
            label="Valid until"
            value={licenceExpiry}
            onChangeText={setLicenceExpiry}
            placeholder="2030-06-30"
            inputMode="numeric"
          />
        </Section>

        <Notice
          icon="document-text-outline"
          text="Carry the original licence and one government photo ID at pick-up. The hub verifies the number against the original."
        />

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

        <Button title="Save licence" loading={saving} onPress={save} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.five },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
