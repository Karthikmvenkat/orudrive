import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, Screen, StateView } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import { bookingApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import { formatMoney, formatWeekdayDayYear } from '@/lib/format';
import { useAsyncResource } from '@/lib/use-async';

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED', 'ONGOING']);

export default function BookingTicketScreen() {
  const theme = useTheme();
  const router = useRouter();
  const code = String(useLocalSearchParams<{ code: string }>().code ?? '');

  const booking = useAsyncResource(code, () => bookingApi.detail(code));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (booking.status === 'loading') {
    return (
      <Screen tabBarSpace={false}>
        <StateView state="loading" />
      </Screen>
    );
  }

  if (booking.status === 'error' || !booking.data) {
    return (
      <Screen tabBarSpace={false}>
        <StateView state="error" message={booking.error} onRetry={booking.reload} />
      </Screen>
    );
  }

  const row = booking.data;
  const cancelled = row.status === 'CANCELLED' || row.status === 'NO_SHOW';
  const completed = row.status === 'COMPLETED';
  const image = resolveMediaUrl(row.vehicle.image);
  const paid = row.payments.find((payment) => payment.status === 'PAID');
  const canCancel = CANCELLABLE.has(row.status);

  const title = cancelled ? 'Booking cancelled' : completed ? 'Ride completed' : 'Booking confirmed';
  const copy = cancelled
    ? 'This ride is no longer active. Any refund appears in your payment history.'
    : completed
      ? `Your ${row.vehicle.name} trip is complete. Thanks for riding with SavariGo.`
      : `Your ${row.vehicle.name} is reserved. The details are saved in My bookings.`;
  const statusBadge = cancelled ? 'Cancelled' : completed ? 'Completed' : 'Upcoming';

  const directions = () => {
    const query = `${row.pickupLocation.name}, ${row.pickupLocation.address}, ${row.pickupLocation.city}`;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await bookingApi.cancel(row.id, reason.trim() || undefined);
      setCancelOpen(false);
      setReason('');
      booking.reload();
    } catch (cause) {
      setError(describeApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabBarSpace={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={[styles.ring, { backgroundColor: cancelled ? theme.backgroundSelected : theme.brandSoft }]}>
            <View style={[styles.circle, { backgroundColor: cancelled ? theme.danger : theme.brand }]}>
              <Ionicons name={cancelled ? 'close' : 'checkmark'} size={34} color="#ffffff" />
            </View>
          </View>
          <ThemedText type="display" style={styles.heroTitle}>
            {title}
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.heroCopy}>
            {copy}
          </ThemedText>
        </View>

        <View style={[styles.ticket, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.ticketHead}>
            {image ? (
              <Image
                source={{ uri: image }}
                alt={`${row.vehicle.name} booking`}
                style={styles.thumb}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.headText}>
              <ThemedText type="subtitle" numberOfLines={2}>
                {row.vehicle.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Booking <ThemedText type="code">#{row.code}</ThemedText>
              </ThemedText>
            </View>
            <Badge
              text={statusBadge}
              tone={cancelled ? 'bad' : completed ? 'neutral' : 'info'}
            />
          </View>

          <View style={styles.perforation}>
            <View style={[styles.dash, { borderColor: theme.lineStrong }]} />
            <View style={[styles.notch, styles.notchLeft, { backgroundColor: theme.background }]} />
            <View style={[styles.notch, styles.notchRight, { backgroundColor: theme.background }]} />
          </View>

          <View style={styles.grid}>
            <Fact label="Pick-up" value={formatWeekdayDayYear(row.pickupAt)} />
            <Fact label="Return" value={formatWeekdayDayYear(row.returnAt)} />
            <Fact label="Location" value={row.pickupLocation.name} />
            <Fact
              label={paid ? 'Paid' : 'Payment'}
              value={paid ? `${formatMoney(paid.amount)} · ${paid.method ?? paid.provider}` : 'Pay at pick-up'}
            />
          </View>

          <View style={[styles.codeBlock, { backgroundColor: theme.background }]}>
            <View style={styles.codeBox}>
              <QRCode value={row.code} size={88} color="#0F1A14" backgroundColor="#ffffff" />
            </View>
            <View style={styles.codeCopy}>
              <ThemedText type="smallBold" style={styles.codeTitle}>
                Show this at pick-up
              </ThemedText>
              <ThemedText type="code">{row.code}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Bring your driving licence and one government photo ID.
              </ThemedText>
            </View>
          </View>
        </View>

        {row.cancellationReason ? (
          <ThemedText type="small" themeColor="textSecondary">
            Cancelled: {row.cancellationReason}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Directions"
            variant="secondary"
            icon={<Ionicons name="navigate-outline" size={17} color={theme.text} />}
            onPress={directions}
            style={styles.action}
          />
          <Button
            title="My bookings"
            icon={<Ionicons name="ticket-outline" size={17} color="#ffffff" />}
            onPress={() => router.push('/(tabs)/bookings')}
            style={styles.action}
          />
        </View>

        <Button title="Back to home" variant="ghost" onPress={() => router.replace('/(tabs)')} />

        {canCancel ? (
          <Button
            title="Cancel this booking"
            variant="ghost"
            onPress={() => setCancelOpen(true)}
            style={styles.cancelLink}
          />
        ) : null}
      </ScrollView>

      <Sheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel booking"
        subtitle={`${row.vehicle.name} · #${row.code}`}
        footer={
          <>
            <Button title="Confirm cancellation" variant="danger" loading={busy} onPress={cancel} />
            <Button title="Keep booking" variant="ghost" onPress={() => setCancelOpen(false)} />
          </>
        }>
        <Field
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          placeholder="Plans changed"
          multiline
        />
        {error ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {error}
          </ThemedText>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.factValue} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.five },
  hero: { alignItems: 'center', gap: Spacing.two },
  ring: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { textAlign: 'center' },
  heroCopy: { textAlign: 'center', paddingHorizontal: Spacing.three },
  ticket: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three },
  ticketHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  thumb: { width: 80, height: 70, borderRadius: Radius.field },
  headText: { flex: 1, gap: 3 },
  perforation: { justifyContent: 'center', marginHorizontal: -Spacing.three },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', marginHorizontal: Spacing.three },
  notch: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  notchLeft: { left: -11 },
  notchRight: { right: -11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  fact: { width: '50%', gap: 3, paddingRight: Spacing.two },
  factValue: { fontSize: 15, lineHeight: 20 },
  codeBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.field, padding: Spacing.three },
  codeBox: {
    width: 104,
    height: 104,
    borderRadius: Radius.field,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: Spacing.two,
  },
  codeCopy: { flex: 1, gap: 3 },
  codeTitle: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  cancelLink: { alignSelf: 'center', paddingVertical: Spacing.one },
});
