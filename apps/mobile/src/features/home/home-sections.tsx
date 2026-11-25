import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';

import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiVehicle } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';

type IconName = keyof typeof Ionicons.glyphMap;

const TRUST_ITEMS: { icon: IconName; label: string; action: 'explore' | 'offers' | 'reviews' | 'support' }[] = [
  { icon: 'flash', label: 'Quick\nBooking', action: 'explore' },
  { icon: 'calendar', label: 'Flexible\nRental', action: 'offers' },
  { icon: 'shield-checkmark', label: 'Verified\nVehicles', action: 'reviews' },
  { icon: 'headset', label: '24×7\nSupport', action: 'support' },
];

/** The reassurance bar under the search field; every tile opens a real surface. */
export function TrustStrip({
  onExplore,
  onOffers,
  onReviews,
  onSupport,
}: {
  onExplore: () => void;
  onOffers: () => void;
  onReviews: () => void;
  onSupport: () => void;
}) {
  const theme = useTheme();
  const handlers = { explore: onExplore, offers: onOffers, reviews: onReviews, support: onSupport };
  return (
    <View style={[styles.trust, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      {TRUST_ITEMS.map((item) => (
        <Pressable
          key={item.action}
          accessibilityRole="button"
          accessibilityLabel={item.label.replace('\n', ' ')}
          onPress={handlers[item.action]}
          style={({ pressed }) => [styles.trustItem, { opacity: pressed ? 0.8 : 1 }]}>
          <View style={[styles.trustIcon, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name={item.icon} size={16} color={theme.accentGold} />
          </View>
          <Text style={[styles.trustLabel, { color: theme.text }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function countLabel(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(count);
}

const CARD_HEIGHT = 152;
const GAP = 12;

/**
 * Focused carousel from the reference: the centred ride gets the golden
 * featured card, neighbours peek as photo cards, dots track the real index.
 * The rail loops by cloning the end cards and jumping silently at the edges.
 */
export function TrendingCarousel({
  vehicles,
  tagOf,
  onOpen,
}: {
  vehicles: ApiVehicle[];
  tagOf: (vehicle: ApiVehicle) => string;
  onOpen: (vehicle: ApiVehicle) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // The rail lives inside the page's horizontal padding, so its viewport is narrower than the window.
  const avail = width - Spacing.three * 2;
  const peek = Math.round(avail * 0.075);
  const cardWidth = avail - 2 * (peek + GAP);
  const step = cardWidth + GAP;

  const count = vehicles.length;
  const loop = count > 1;
  const slides = loop ? [vehicles[count - 1], ...vehicles, vehicles[0]] : vehicles;
  const firstCenter = loop ? 1 : 0;

  const railRef = useRef<ScrollViewInstance>(null);
  const [center, setCenter] = useState(firstCenter);

  useEffect(() => {
    railRef.current?.scrollTo({ x: firstCenter * step, animated: false });
    setCenter(firstCenter);
  }, [count, step, firstCenter]);

  function settle(offsetX: number) {
    if (!loop) return;
    const index = Math.round(offsetX / step);
    if (index === 0) {
      railRef.current?.scrollTo({ x: count * step, animated: false });
      setCenter(count);
    } else if (index === count + 1) {
      railRef.current?.scrollTo({ x: step, animated: false });
      setCenter(1);
    }
  }

  const activeReal = loop ? (center - 1 + count) % count : center;

  return (
    <View style={styles.carousel}>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="center"
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentOffset={{ x: firstCenter * step, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: peek + GAP / 2 }}
        onScroll={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / step);
          setCenter(Math.max(0, Math.min(slides.length - 1, index)));
        }}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.x)}>
        {slides.map((vehicle, index) => {
          const image = resolveMediaUrl(vehicle.primaryImage?.url);
          const featured = index === center;
          if (!featured) {
            return (
              <Pressable
                key={`${vehicle.id}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Show ${vehicle.name} in trending rides`}
                onPress={() => railRef.current?.scrollTo({ x: index * step, animated: true })}
                style={({ pressed }) => [
                  styles.slideSlot,
                  { width: step, opacity: pressed ? 0.94 : 1 },
                ]}>
                <View style={[styles.sideCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      alt={vehicle.primaryImage?.alt || `${vehicle.name} for rent`}
                      style={styles.sideImage}
                      contentFit="cover"
                      transition={180}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.sideImage, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                </View>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={`${vehicle.id}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${vehicle.name}, ${formatMoney(vehicle.pricePerDay)} per day. Open details`}
              onPress={() => onOpen(vehicle)}
              style={({ pressed }) => [styles.slideSlot, { width: step, opacity: pressed ? 0.96 : 1 }]}>
              <LinearGradient
                colors={['#fdeeb2', '#fcc63d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featured}>
                <View style={[styles.featuredTag, { backgroundColor: theme.brand }]}>
                  <Ionicons name="star" size={9} color={theme.onBrand} />
                  <Text style={[styles.featuredTagText, { color: theme.onBrand }]} numberOfLines={1}>
                    {tagOf(vehicle)}
                  </Text>
                </View>
                <View style={styles.featuredRow}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      alt={vehicle.primaryImage?.alt || `${vehicle.name} for rent`}
                      style={styles.featuredImage}
                      contentFit="contain"
                      transition={180}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.featuredImage} />
                  )}
                  <View style={styles.featuredCopy}>
                    <Text style={[styles.featuredName, { color: theme.text }]} numberOfLines={1}>
                      {vehicle.name}
                    </Text>
                    <View style={styles.featuredRating}>
                      <Ionicons name="star" size={11} color={theme.accentGold} />
                      <Text style={[styles.featuredRatingText, { color: theme.text }]} numberOfLines={1}>
                        {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : 'New'}
                        {vehicle.reviewCount > 0 ? ` (${countLabel(vehicle.reviewCount)} reviews)` : ''}
                      </Text>
                    </View>
                    <View style={styles.featuredPriceRow}>
                      <View style={[styles.featuredPrice, { backgroundColor: theme.backgroundElement }]}>
                        <Text style={[styles.featuredPriceText, { color: theme.text }]} numberOfLines={1}>
                          {formatMoney(vehicle.pricePerDay)}
                        </Text>
                        <Text style={[styles.featuredPer, { color: theme.textSecondary }]}>/ Day</Text>
                      </View>
                      <View style={[styles.featuredGo, { backgroundColor: theme.brand }]}>
                        <Ionicons name="arrow-forward" size={13} color={theme.onBrand} />
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.dots}>
        {vehicles.map((vehicle, index) => (
          <View
            key={vehicle.id}
            style={[styles.dot, { backgroundColor: index === activeReal ? theme.brand : theme.lineStrong }]}
          />
        ))}
      </View>
    </View>
  );
}

const FAQ_ICONS: IconName[] = [
  'calendar',
  'id-card',
  'shield-outline',
  'close-circle-outline',
  'construct-outline',
  'home-outline',
];

/** Question cards from the reference; tapping one opens its answer sheet. */
export function FaqRail({
  questions,
  onOpen,
}: {
  questions: string[];
  onOpen: (index: number | null) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - Spacing.three * 2 - 3 * 8) / 4);
  return (
    <View style={styles.faqBlock}>
      <View style={styles.faqHead}>
        <View style={[styles.faqHeadIcon, { backgroundColor: theme.brand }]}>
          <Ionicons name="help" size={13} color="#ffffff" />
        </View>
        <View style={styles.faqHeadText}>
          <Text style={[styles.faqTitle, { color: theme.text }]}>Questions Riders Ask</Text>
          <Text style={[styles.faqSub, { color: theme.textSecondary }]} numberOfLines={1}>
            Quick answers to common doubts
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(null)}
          hitSlop={8}
          style={styles.faqActionRow}>
          <Text style={[styles.faqAction, { color: theme.accentGold }]}>See All FAQs</Text>
          <Ionicons name="arrow-forward" size={12} color={theme.accentGold} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.faqRail}
        snapToInterval={cardWidth + 8}
        decelerationRate="fast">
        {questions.map((question, index) => (
          <Pressable
            key={question}
            accessibilityRole="button"
            accessibilityLabel={question}
            onPress={() => onOpen(index)}
            style={({ pressed }) => [
              styles.faqCard,
              CardShadow,
              {
                width: cardWidth,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.line,
                opacity: pressed ? 0.92 : 1,
              },
            ]}>
            <Ionicons name={FAQ_ICONS[index % FAQ_ICONS.length]} size={18} color={theme.accentGold} />
            <Text
              style={[styles.faqQuestion, { color: theme.text }]}
              numberOfLines={3}
              textBreakStrategy="simple">
              {question}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  trustIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: { fontSize: 10.5, lineHeight: 13, fontWeight: '800' },
  carousel: { gap: 8 },
  slideSlot: { paddingHorizontal: GAP / 2 },
  sideCard: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  sideImage: { width: '100%', height: '100%' },
  featured: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: Radius.card,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  featuredTag: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredTagText: { fontSize: 9.5, fontWeight: '800' },
  featuredRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  featuredImage: { width: '46%', height: '100%' },
  featuredCopy: { flex: 1, gap: 5 },
  featuredName: { fontSize: 14.5, lineHeight: 17, fontWeight: '800', letterSpacing: -0.2 },
  featuredRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  featuredRatingText: { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  featuredPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredPrice: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredPriceText: { fontSize: 13.5, fontWeight: '800' },
  featuredPer: { fontSize: 8.5, fontWeight: '600' },
  featuredGo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  faqBlock: { gap: 8 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqHeadIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqHeadText: { flex: 1, gap: 1 },
  faqTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  faqSub: { fontSize: 11, fontWeight: '500' },
  faqActionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  faqAction: { fontSize: 12, fontWeight: '800' },
  faqRail: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  faqCard: {
    borderRadius: Radius.field,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 9,
    gap: 6,
  },
  faqQuestion: { fontSize: 9.5, lineHeight: 12.5, fontWeight: '800' },
});