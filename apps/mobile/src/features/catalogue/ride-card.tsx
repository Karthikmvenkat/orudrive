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
import { isBookedOut } from '@/features/catalogue/copy';

function specLine(vehicle: ApiVehicle): string {
  const gearbox = vehicle.transmission === 'MANUAL' ? 'Manual' : 'Automatic';
  return `${vehicle.location.city} · ${gearbox} · ${vehicle.engine}`;
}

function HeartButton({
  vehicleId,
  style,
  size = 18,
}: {
  vehicleId: string;
  style?: object;
  size?: number;
}) {
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
        size={size}
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
      <View style={[styles.flagDot, { backgroundColor: theme.success }]} />
      <Text style={[styles.flagText, { color: theme.text }]}>Available now</Text>
    </View>
  );
}

function ElectricFlag({ show }: { show: boolean }) {
  const theme = useTheme();
  if (!show) return null;
  return (
    <View style={[styles.flag, { backgroundColor: theme.hero }]}>
      <Ionicons name="flash" size={11} color={theme.lime} />
      <Text style={[styles.flagText, { color: theme.lime }]}>EV</Text>
    </View>
  );
}

/** Same treatment as the website card: the photo is dimmed and the ride says it is taken. */
function BookedOutVeil({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View style={styles.bookedVeil} pointerEvents="none">
      <View style={styles.bookedPill}>
        <Text style={styles.bookedText}>Booked out</Text>
      </View>
    </View>
  );
}

function Rating({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.rating}>
      <Ionicons name="star" size={12} color={theme.brandStrong} />
      <ThemedText type="smallBold">{value.toFixed(1)}</ThemedText>
    </View>
  );
}

/** The stacked card from the Explore result list. */
export function RideCard({ vehicle, onPress }: { vehicle: ApiVehicle; onPress: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);
  const bookedOut = isBookedOut(vehicle);

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
            <View style={styles.flagRow}>
              <AvailableFlag show={!bookedOut} />
              <ElectricFlag show={vehicle.fuelType === 'ELECTRIC'} />
            </View>
          </View>
          <BookedOutVeil show={bookedOut} />
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
            bookedOut
              ? { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.backgroundSelected }
              : { backgroundColor: theme.brand },
            { opacity: pressed ? 0.9 : 1 },
          ]}>
          <Text style={[styles.bookText, { color: bookedOut ? theme.text : theme.onBrand }]}>
            {bookedOut ? 'View details' : 'Book now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The narrower card used in the "Popular rides" rail on home. */
export function RideTile({ vehicle, onPress }: { vehicle: ApiVehicle; onPress: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);
  const bookedOut = isBookedOut(vehicle);

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
            <ElectricFlag show={vehicle.fuelType === 'ELECTRIC'} />
            <View />
          </View>
          <BookedOutVeil show={bookedOut} />
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
            <View
              style={[
                styles.tileBook,
                bookedOut
                  ? { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.backgroundSelected }
                  : { backgroundColor: theme.brand },
              ]}>
              <Text style={[styles.tileBookText, { color: bookedOut ? theme.text : theme.onBrand }]}>
                {bookedOut ? 'Details' : 'Book'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      <HeartButton vehicleId={vehicle.id} style={styles.tileHeart} />
    </View>
  );
}

function reviewCountLabel(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(count);
}

/** The badge glyphs the reference uses for each tag. */
function tagIcon(tag: string): keyof typeof Ionicons.glyphMap {
  if (/best value/i.test(tag)) return 'flash';
  if (/top choice/i.test(tag)) return 'star';
  return 'trophy';
}

/**
 * The card used on home: hub badge (or the measured distance), review count
 * and real tags. `compact` fits three cards across, as in the design.
 */
export function HomeRideCard({
  vehicle,
  onPress,
  tags = [],
  distanceKm,
  compact = false,
}: {
  vehicle: ApiVehicle;
  onPress: () => void;
  tags?: string[];
  distanceKm?: number | null;
  compact?: boolean;
}) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);
  const bookedOut = isBookedOut(vehicle);
  // On the compact trending card the tag takes the image badge, like the design.
  const tag = compact ? tags[0] : undefined;
  const badge = distanceKm != null ? `${distanceKm.toFixed(1)} km` : vehicle.location.city;
  const solidBadge = tag != null;

  return (
    <View
      style={[
        styles.homeCard,
        compact && styles.homeCardCompact,
        CardShadow,
        { backgroundColor: compact ? '#fff6e9' : theme.backgroundElement },
      ]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
        <View style={styles.homeMedia}>
          {image ? (
            <Image
              source={{ uri: image }}
              alt={vehicle.primaryImage?.alt || `${vehicle.name} for rent`}
              style={[styles.homeImage, compact && styles.homeImageCompact]}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={[
                styles.homeImage,
                compact && styles.homeImageCompact,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
          )}
          {!compact || tag ? (
            <View
              style={[
                styles.hubBadge,
                compact ? styles.hubBadgeCompact : styles.hubBadgeFull,
                { backgroundColor: solidBadge ? theme.brand : theme.backgroundElement },
              ]}>
              <Ionicons
                name={tag ? tagIcon(tag) : 'location'}
                size={compact ? 9 : 11}
                color={solidBadge ? theme.onBrand : theme.brandStrong}
              />
              {!compact ? (
                <Text style={[styles.hubText, { color: theme.text }]} numberOfLines={1}>
                  {badge}
                </Text>
              ) : null}
            </View>
          ) : null}
          <BookedOutVeil show={bookedOut} />
        </View>

        <View style={[styles.homeBody, compact && styles.homeBodyCompact]}>
          <Text
            style={[styles.homeName, compact && styles.homeNameCompact, { color: theme.text }]}
            numberOfLines={1}>
            {vehicle.name}
          </Text>
          {!compact || !tag ? (
            <View style={styles.homeRatingRow}>
              <Ionicons name="star" size={compact ? 9 : 11} color={theme.accentGold} />
              <Text
                style={[
                  styles.homeRating,
                  compact && styles.homeRatingCompact,
                  { color: theme.text },
                ]}>
                {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : 'New'}
              </Text>
              {vehicle.reviewCount > 0 ? (
                <Text
                  style={[
                    styles.homeReviews,
                    compact && styles.homeReviewsCompact,
                    { color: theme.textSecondary },
                  ]}
                  numberOfLines={1}>
                  ({reviewCountLabel(vehicle.reviewCount)} reviews)
                </Text>
              ) : null}
            </View>
          ) : null}
          {compact ? (
            <View style={styles.homePriceLine}>
              <Text style={[styles.homePriceCompact, { color: theme.text }]} numberOfLines={1}>
                {formatMoney(vehicle.pricePerDay)} / Day
              </Text>
              {!tag ? (
                <View style={[styles.homeGo, { backgroundColor: theme.brand }]}>
                  <Ionicons name="arrow-forward" size={11} color={theme.onBrand} />
                </View>
              ) : null}
            </View>
          ) : (
            <>
              {tags.length > 0 ? (
                <View style={styles.homeTagRow}>
                  {tags.slice(0, 2).map((entry) => (
                    <View key={entry} style={[styles.homeTag, { backgroundColor: theme.brandSoft }]}>
                      <Text style={[styles.homeTagText, { color: theme.brandStrong }]} numberOfLines={1}>
                        {entry}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.homePriceRow}>
                <Text style={[styles.homePrice, { color: theme.text }]}>
                  {formatMoney(vehicle.pricePerDay)}
                </Text>
                <Text style={[styles.homePer, { color: theme.textSecondary }]}>/ Day</Text>
              </View>
            </>
          )}
        </View>
      </Pressable>
      {!compact ? (
        <HeartButton vehicleId={vehicle.id} style={styles.homeHeart} size={18} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: 'hidden' },
  media: { position: 'relative' },
  image: { width: '100%', height: 178, backgroundColor: '#f1e7d2' },
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
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
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
  bookedVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36,36,36,0.48)',
  },
  bookedPill: { backgroundColor: '#ffffff', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  bookedText: { color: '#242424', fontSize: 12, fontWeight: '800' },
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
  bookText: { color: '#242424', fontSize: 14, fontWeight: '800' },
  tile: { width: 214, borderRadius: Radius.card, overflow: 'hidden' },
  tileMedia: { position: 'relative' },
  tileBody: { padding: Spacing.three, gap: 3 },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  tileBook: { borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 9 },
  tileBookText: { color: '#242424', fontSize: 13, fontWeight: '800' },
  homeCard: { width: 196, borderRadius: Radius.card, overflow: 'hidden' },
  homeCardCompact: { width: 'auto', flex: 1, borderRadius: 16 },
  homeMedia: { position: 'relative' },
  homeImage: { width: '100%', height: 112 },
  homeImageCompact: { height: 78 },
  homeHeart: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  hubBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  hubBadgeFull: {
    left: Spacing.two,
    bottom: Spacing.two,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 150,
  },
  hubText: { fontSize: 10.5, fontWeight: '700', flexShrink: 1 },
  hubBadgeCompact: {
    left: 6,
    top: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  homeBody: { padding: Spacing.three, gap: 3 },
  homeBodyCompact: { paddingHorizontal: 7, paddingTop: 6, paddingBottom: 8, gap: 3 },
  homeName: { fontSize: 14.5, fontWeight: '800' },
  homeNameCompact: { fontSize: 11.5, lineHeight: 14 },
  homeRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  homeRating: { fontSize: 12, fontWeight: '800' },
  homeRatingCompact: { fontSize: 8, fontWeight: '800' },
  homeReviews: { fontSize: 11.5, fontWeight: '500' },
  homeReviewsCompact: { fontSize: 7, fontWeight: '500', flexShrink: 1 },
  homeTagRow: { flexDirection: 'row', gap: 5, marginTop: 2 },
  homeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, maxWidth: 108 },
  homeTagText: { fontSize: 10, fontWeight: '700' },
  homePriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  homePrice: { fontSize: 17, fontWeight: '800' },
  homePer: { fontSize: 11.5, fontWeight: '500' },
  homePriceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 1,
  },
  homePriceCompact: { fontSize: 9.5, fontWeight: '800', flexShrink: 1 },
  homeGo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
