import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiVehicle } from '@/lib/api/types';
import { formatMoney, ratingLine, vehicleSpecLabel, vehicleStatusLabel } from '@/features/search/labels';

export function VehicleCard({ vehicle, onPress }: { vehicle: ApiVehicle; onPress?: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);

  return (
    <Card onPress={onPress}>
      <View style={styles.media}>
        {image ? (
          <Image
            source={{ uri: image }}
            alt={vehicle.primaryImage?.alt || `${vehicle.name} for rent`}
            style={styles.image}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={styles.mediaOverlay}>
          <Badge
            text={vehicle.status === 'AVAILABLE' ? vehicleSpecLabel(vehicle) : vehicleStatusLabel(vehicle.status)}
            tone={vehicle.status === 'AVAILABLE' ? 'brand' : 'neutral'}
          />
        </View>
      </View>

      <View style={styles.head}>
        <View style={styles.headText}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {vehicle.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {vehicle.brand} · {vehicle.year} · {vehicle.location.city}
          </ThemedText>
        </View>
        <View style={styles.price}>
          <ThemedText type="price">{formatMoney(vehicle.pricePerDay)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            per day
          </ThemedText>
        </View>
      </View>

      <Row label="Specs" value={vehicleSpecLabel(vehicle)} />
      <Row label="Rating" value={ratingLine(vehicle.rating, vehicle.reviewCount)} />
      <Row label="Deposit" value={formatMoney(vehicle.depositAmount)} />

      {vehicle.pricing.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {vehicle.pricing.length} rate plan{vehicle.pricing.length === 1 ? '' : 's'} · minimum{' '}
          {vehicle.pricing[0].minDays} day{vehicle.pricing[0].minDays === 1 ? '' : 's'}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  media: { margin: -Spacing.three, marginBottom: Spacing.two },
  image: { width: '100%', height: 168, backgroundColor: '#e5eae1' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  mediaOverlay: { position: 'absolute', right: Spacing.three, bottom: -Spacing.two },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  headText: { flex: 1, gap: 2 },
  price: { alignItems: 'flex-end', gap: 0 },
});
