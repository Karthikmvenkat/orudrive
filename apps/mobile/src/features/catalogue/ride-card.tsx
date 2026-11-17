import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiVehicle } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import { useFavorites } from '@/lib/favorites';

function specLine(vehicle: ApiVehicle): string {
  const gearbox = vehicle.transmission === 'MANUAL' ? 'Manual' : 'Automatic';
  return `${vehicle.location.city} · ${gearbox} · ${vehicle.engine}`;
}

function HeartButton({ vehicleId, style }: { vehicleId: string; style?: object }) {
  const theme = useTheme();
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(vehicleId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved vehicles' : 'Save this vehicle'}
      accessibilityState={{ selected: saved }}
      hitSlop={6}
      onPress={() => toggle(vehicleId)}
      style={({ pressed }) => [
        styles.heart,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={18}
        color={saved ? theme.danger : theme.text}
      />
    </Pressable>
  );
}

function AvailableFlag({ show }: { show: boolean }) {
  const theme = useTheme();
  if (!show) return null;
  return (
    <View style={[styles.flag, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.flagDot, { backgroundColor: theme.brand }]} />
      <Text style={[styles.flagText, { color: theme.text }]}>Available now</Text>
    </View>
  );
}

function Rating({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.rating}>
      <Ionicons name="star" size={12} color={theme.brand} />
      <ThemedText type="smallBold">{value.toFixed(1)}</ThemedText>
    </View>
  );
}

/** The stacked card from the Explore result list. */
export function RideCard({ vehicle, onPress }: { vehicle: ApiVehicle; onPress: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);

  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
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
            <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.mediaTop}>
            <AvailableFlag show={vehicle.status === 'AVAILABLE'} />
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" numberOfLines={1} style={styles.title}>
              {vehicle.name}
            </ThemedText>
            <Rating value={vehicle.rating} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
              {specLine(vehicle)}
            </ThemedText>
          </View>
        </View>
      </Pressable>

      <HeartButton vehicleId={vehicle.id} style={styles.cardHeart} />

      <View style={[styles.footer, { borderTopColor: theme.line }]}>
        <View style={styles.priceRow}>
          <ThemedText type="price">{formatMoney(vehicle.pricePerDay)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            /day
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.book,
            { backgroundColor: theme.brand, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Text style={styles.bookText}>Book now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The narrower card used in the "Popular rides" rail on home. */
export function RideTile({ vehicle, onPress }: { vehicle: ApiVehicle; onPress: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);

  return (
    <View style={[styles.tile, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
        <View style={styles.tileMedia}>
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
            <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.mediaTop}>
            {vehicle.fuelType === 'ELECTRIC' ? (
              <View style={[styles.ev, { backgroundColor: theme.hero }]}>
                <Ionicons name="flash" size={11} color={theme.lime} />
                <Text style={[styles.evText, { color: theme.lime }]}>EV</Text>
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>

        <View style={styles.tileBody}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" numberOfLines={1} style={styles.title}>
              {vehicle.name}
            </ThemedText>
            <Rating value={vehicle.rating} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {specLine(vehicle)}
          </ThemedText>
          <View style={styles.tileFooter}>
            <View style={styles.priceRow}>
              <ThemedText type="price">{formatMoney(vehicle.pricePerDay)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                /day
              </ThemedText>
            </View>
            <View style={[styles.tileBook, { backgroundColor: theme.brand }]}>
              <Text style={styles.tileBookText}>Book</Text>
            </View>
          </View>
        </View>
      </Pressable>
      <HeartButton vehicleId={vehicle.id} style={styles.tileHeart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: 'hidden' },
  media: { position: 'relative' },
  image: { width: '100%', height: 178, backgroundColor: '#e5eae1' },
  mediaTop: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeart: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  tileHeart: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  flagDot: { width: 6, height: 6, borderRadius: 3 },
  flagText: { fontSize: 11, fontWeight: '700' },
  body: { padding: Spacing.three, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  book: { borderRadius: Radius.pill, paddingHorizontal: 22, paddingVertical: 12 },
  bookText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  tile: { width: 214, borderRadius: Radius.card, overflow: 'hidden' },
  tileMedia: { position: 'relative' },
  ev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  evText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tileBody: { padding: Spacing.three, gap: 3 },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  tileBook: { borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 9 },
  tileBookText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
