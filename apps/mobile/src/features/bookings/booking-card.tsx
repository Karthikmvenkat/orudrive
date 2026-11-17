import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Row } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiBooking } from '@/lib/api/types';
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatDateTime,
  formatMoney,
  paymentStatusLabel,
} from '@/lib/format';

export function BookingCard({ booking, onPress }: { booking: ApiBooking; onPress?: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(booking.vehicle.image);

  return (
    <Card onPress={onPress}>
      <View style={styles.head}>
        {image ? (
          <Image
            source={{ uri: image }}
            alt={`${booking.vehicle.name} booking`}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={styles.headText}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {booking.vehicle.name}
          </ThemedText>
          <ThemedText type="code" themeColor="textSecondary">
            {booking.code}
          </ThemedText>
          <View style={styles.badges}>
            <Badge text={bookingStatusLabel(booking.status)} tone={bookingStatusTone(booking.status)} />
            <Badge text={paymentStatusLabel(booking.paymentStatus)} tone="neutral" />
          </View>
        </View>
      </View>

      <Row label="Pick-up" value={formatDateTime(booking.pickupAt)} />
      <Row label="Return" value={formatDateTime(booking.returnAt)} />
      <Row label="Branch" value={`${booking.pickupLocation.name}, ${booking.pickupLocation.city}`} />
      <Row label="Total" value={formatMoney(booking.amounts.totalAmount)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  thumb: { width: 84, height: 62, borderRadius: Radius.field },
  headText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.one },
});
