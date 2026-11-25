import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CircleButton, MenuRow, Notice, Segmented, Sheet, SpecTile } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import {
  compactMileage,
  includedFeatures,
  isBookedOut,
  mileageLabel,
  mileageLimitLabel,
} from '@/features/catalogue/copy';
import { RideTile } from '@/features/catalogue/ride-card';
import { useRentalWindow } from '@/features/search/window-context';
import { useTheme } from '@/hooks/use-theme';
import { catalogueApi } from '@/lib/api/endpoints';
import { mediaBaseUrl, resolveMediaUrl } from '@/lib/api/config';
import type {
  ApiAvailability,
  ApiVehicle,
  ApiVehicleImage,
  ApiVehicleReviews,
} from '@/lib/api/types';
import { formatMoney, formatWeekdayDay } from '@/lib/format';
import { useFavorites } from '@/lib/favorites';
import { recordRecentlyViewed } from '@/lib/recently-viewed';
import { useAsyncResource } from '@/lib/use-async';

type Detail = {
  vehicle: ApiVehicle;
  availability: ApiAvailability | null;
  reviews: ApiVehicleReviews | null;
  similar: ApiVehicle[];
};

type Tab = 'overview' | 'specs' | 'plans' | 'reviews';

const DURATIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30];

function reviewCountLabel(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(count);
}

export default function VehicleDetailScreen() {
  const theme = useTheme();
  const { window, days, dayKey, setDayKey, durationDays, setDurationDays } = useRentalWindow();
  const slug = String(useLocalSearchParams<{ slug: string }>().slug ?? '');
  const { isSaved, toggle } = useFavorites();

  const [tab, setTab] = useState<Tab>('overview');
  const [tripSheet, setTripSheet] = useState<'pickup' | 'return' | null>(null);
  const [galleryWidth, setGalleryWidth] = useState(Dimensions.get('window').width);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const gallery = useRef<FlatList<ApiVehicleImage>>(null);

  const detail = useAsyncResource<Detail>(`${slug}|${window.pickupAt}`, async () => {
    const vehicle = await catalogueApi.vehicle(slug);
    const [availability, reviews, related] = await Promise.all([
      catalogueApi.availability(vehicle.id, { from: window.pickupAt, to: window.returnAt }).catch(
        () => null,
      ),
      catalogueApi.reviews(vehicle.slug).catch(() => null),
      catalogueApi.vehicles({ category: vehicle.category.slug, limit: 8 }).catch(() => null),
    ]);
    const similar = (related?.items ?? [])
      .filter((entry) => entry.id !== vehicle.id && entry.category.slug === vehicle.category.slug)
      .slice(0, 3);
    return { vehicle, availability, reviews, similar };
  });

  // Snapshot once per ride so "Recently viewed" has something real to list.
  const recordedSlug = useRef<string | null>(null);
  useEffect(() => {
    const vehicle = detail.data?.vehicle;
    if (!vehicle || recordedSlug.current === vehicle.slug) return;
    recordedSlug.current = vehicle.slug;
    void recordRecentlyViewed(vehicle);
  }, [detail.data]);

  if (detail.status === 'loading') {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Loading this ride…</Text>
      </View>
    );
  }

  if (detail.status === 'error' || !detail.data) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">That ride did not load</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
          {detail.error ?? 'Try again in a moment.'}
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={detail.reload} style={styles.retry}>
          <Text style={[styles.retryText, { color: theme.brandStrong }]}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { vehicle, availability, reviews, similar } = detail.data;
  const bookedOut = isBookedOut(vehicle);
  const images =
    vehicle.images.length > 0 ? vehicle.images : vehicle.primaryImage ? [vehicle.primaryImage] : [];
  const saved = isSaved(vehicle.id);
  const returnAt = new Date(new Date(window.pickupAt).getTime() + durationDays * 86_400_000).toISOString();
  const plan = vehicle.pricing[0] ?? null;

  function onGalleryScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(galleryWidth, 1));
    if (index !== galleryIndex) setGalleryIndex(index);
  }

  function jumpTo(index: number) {
    setGalleryIndex(index);
    gallery.current?.scrollToIndex({ index, animated: true });
  }

  // The website hosts the ride page, so the shared link is a real one a friend
  // can open; the browser has no share sheet, so the link is copied instead.
  async function shareRide() {
    const link = `${mediaBaseUrl()}/vehicles/${vehicle.slug}`;
    const message = `${vehicle.name} on SavariGo — ${link}`;
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
      return;
    }
    await Share.share({ message });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.gallery}>
          {images.length > 0 ? (
            <FlatList
              ref={gallery}
              data={images}
              keyExtractor={(image) => image.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onGalleryScroll}
              scrollEventThrottle={16}
              onLayout={(event) => setGalleryWidth(event.nativeEvent.layout.width)}
              renderItem={({ item: image }) => {
                const uri = resolveMediaUrl(image.url);
                return uri ? (
                  <Image
                    source={{ uri }}
                    alt={image.alt || `${vehicle.name} for rent`}
                    style={[styles.galleryImage, { width: galleryWidth }]}
                    contentFit="cover"
                    transition={180}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.galleryImage, styles.galleryFallback, { width: galleryWidth }]} />
                );
              }}
            />
          ) : (
            <View style={[styles.galleryImage, styles.galleryFallback]} />
          )}
          <SafeAreaView edges={['top']} style={styles.galleryTop} pointerEvents="box-none">
            <CircleButton icon="chevron-back" label="Go back" onPress={() => router.back()} />
            <View style={styles.galleryActions}>
              <CircleButton
                icon={linkCopied ? 'checkmark' : 'share-outline'}
                label={linkCopied ? 'Link copied' : 'Share this ride'}
                onPress={() => void shareRide()}
              />
              <CircleButton
                icon={saved ? 'heart' : 'heart-outline'}
                label={saved ? 'Remove from saved vehicles' : 'Save this vehicle'}
                onPress={() => toggle(vehicle.id)}
              />
            </View>
          </SafeAreaView>

          <View style={styles.galleryStatus}>
            <View style={[styles.statusPill, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: bookedOut
                      ? theme.danger
                      : availability?.isAvailable === false
                        ? theme.warning
                        : theme.success,
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: theme.text }]}>
                {bookedOut
                  ? 'Booked out'
                  : availability?.isAvailable === false
                    ? 'Busy on your dates'
                    : 'Available'}
              </Text>
            </View>
          </View>

          {images.length > 1 ? (
            <>
              <View style={styles.galleryDots} pointerEvents="none">
                {images.map((image, index) => (
                  <View
                    key={image.id}
                    style={[styles.galleryDot, index === galleryIndex && styles.galleryDotActive]}
                  />
                ))}
              </View>
              <View style={styles.galleryCounter}>
                <Text style={styles.galleryCounterText}>
                  {galleryIndex + 1}/{images.length}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
            style={styles.thumbsTrack}>
            {images.map((image, index) => {
              const uri = resolveMediaUrl(image.url);
              return (
                <Pressable
                  key={image.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Show photo ${index + 1}`}
                  onPress={() => jumpTo(index)}
                  style={[
                    styles.thumb,
                    { borderColor: index === galleryIndex ? theme.brandStrong : 'transparent' },
                  ]}>
                  {uri ? (
                    <Image
                      source={{ uri }}
                      alt={image.alt || `${vehicle.name} photo ${index + 1}`}
                      style={styles.thumbImage}
                      contentFit="cover"
                      transition={120}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.thumbImage, styles.galleryFallback]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.pad}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>
              {vehicle.name}
            </ThemedText>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color={theme.accentGold} />
            <ThemedText type="smallBold">{vehicle.rating.toFixed(1)}</ThemedText>
            <Text style={[styles.ratingMeta, { color: theme.textSecondary }]}>
              ({reviewCountLabel(vehicle.reviewCount)} reviews)
            </Text>
            <Text style={[styles.ratingMeta, { color: theme.textSecondary }]}>•</Text>
            <Text style={[styles.ratingMeta, { color: theme.textSecondary }]}>{vehicle.location.city}</Text>
          </View>

          <View style={styles.specRow}>
            <SpecTile icon="cog-outline" value={vehicle.engine || '—'} label="Engine" />
            <SpecTile
              icon="speedometer-outline"
              value={vehicle.mileage ? compactMileage(vehicle.mileage, mileageLabel(vehicle.fuelType)) : '—'}
              label={mileageLabel(vehicle.fuelType)}
            />
            <SpecTile
              icon={vehicle.fuelType === 'ELECTRIC' ? 'flash-outline' : 'water-outline'}
              value={vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase()}
              label="Fuel"
            />
            <SpecTile icon="people-outline" value={`${vehicle.seats} seats`} label="Capacity" />
          </View>

          <View style={[styles.tripCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.tripHead}>
              <ThemedText type="subtitle">Your Trip</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTripSheet('pickup')}
                hitSlop={8}>
                <Text style={[styles.edit, { color: theme.brandStrong }]}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.tripDates}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTripSheet('pickup')}
                style={styles.tripDate}>
                <View style={styles.tripCellHead}>
                  <Text style={[styles.tripLabel, { color: theme.textSecondary }]}>Pick-up</Text>
                </View>
                <Text style={[styles.tripValue, { color: theme.text }]}>{formatWeekdayDay(window.pickupAt)}</Text>
              </Pressable>
              <View style={[styles.tripDivider, { backgroundColor: theme.line }]} />
              <Pressable
                accessibilityRole="button"
                onPress={() => setTripSheet('return')}
                style={styles.tripDate}>
                <View style={styles.tripCellHead}>
                  <Text style={[styles.tripLabel, { color: theme.textSecondary }]}>Return</Text>
                </View>
                <Text style={[styles.tripValue, { color: theme.text }]}>{formatWeekdayDay(returnAt)}</Text>
              </Pressable>
            </View>
            <View style={[styles.tripPlace, { borderTopColor: theme.line }]}>
              <Ionicons name="location-outline" size={15} color={theme.textSecondary} />
              <View style={styles.tripPlaceText}>
                <Text style={[styles.tripLabel, { color: theme.textSecondary }]}>Pick-up location</Text>
                <Text style={[styles.tripValue, { color: theme.text }]}>{vehicle.location.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </View>

          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'specs', label: 'Specs' },
              { value: 'plans', label: 'Plans' },
              { value: 'reviews', label: 'Reviews' },
            ]}
          />

          {tab === 'overview' ? (
            <View style={styles.tabBody}>
              <ThemedText type="heading">About this {vehicle.category.name.replace(/s$/i, '').toLowerCase()}</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                {vehicle.description}
              </ThemedText>

              <ThemedText type="heading" style={styles.tabHeading}>
                What&apos;s included
              </ThemedText>
              <View style={styles.terms}>
                {includedFeatures(vehicle.category.slug).map((feature) => (
                  <CheckLine key={feature} text={feature} />
                ))}
              </View>

              <ThemedText type="heading" style={styles.tabHeading}>
                Why book with SavariGo
              </ThemedText>
              <View style={styles.includeRow}>
                <Include
                  icon="construct-outline"
                  title="Well maintained vehicles"
                  note="Serviced and sanitised before every trip."
                />
                <Include
                  icon="ribbon-outline"
                  title="Free helmet"
                  note="ISI-marked helmets at no extra cost."
                />
                <Include
                  icon="receipt-outline"
                  title="No hidden charges"
                  note="Deposit refunded within 3 working days."
                />
                <Include
                  icon="headset-outline"
                  title="24/7 support"
                  note="Call, WhatsApp or chat — we pick up."
                />
              </View>

              <ThemedText type="heading" style={styles.tabHeading}>
                Rental terms
              </ThemedText>
              <View style={styles.terms}>
                <Term
                  text={
                    vehicle.mileageLimitKm === null
                      ? 'Unlimited kilometres on this ride.'
                      : `${mileageLimitLabel(vehicle.mileageLimitKm)}${
                          plan?.extraKmRate ? `, billed at ${formatMoney(plan.extraKmRate)} per extra km.` : '.'
                        }`
                  }
                />
                <Term text={`Refundable security deposit of ${formatMoney(vehicle.depositAmount)} collected at pick-up.`} />
                <Term text="Valid driving licence and one government photo ID required." />
                <Term text="Free cancellation up to 24 hours before pick-up." />
                <Term
                  text={
                    vehicle.fuelType === 'ELECTRIC'
                      ? 'Charge level at pick-up must be matched at return.'
                      : 'Fuel level at pick-up must be matched at return.'
                  }
                />
              </View>

              <View style={[styles.vendor, { backgroundColor: theme.brandSoft }]}>
                <View style={styles.vendorText}>
                  <Text style={[styles.vendorTitle, { color: theme.brandStrong }]}>Served by {vehicle.location.name}</Text>
                  <Text style={[styles.vendorNote, { color: theme.textSecondary }]}>
                    {vehicle.location.address || 'Puducherry'}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={20} color={theme.brandStrong} />
              </View>
            </View>
          ) : null}

          {tab === 'specs' ? (
            <View style={styles.tabBody}>
              <SpecRow label="Brand" value={vehicle.brand} />
              <SpecRow label="Engine" value={vehicle.engine || '—'} />
              <SpecRow
                label={mileageLabel(vehicle.fuelType)}
                value={
                  vehicle.mileage ? compactMileage(vehicle.mileage, mileageLabel(vehicle.fuelType)) : '—'
                }
              />
              <SpecRow label="Transmission" value={vehicle.transmission === 'MANUAL' ? 'Manual' : 'Automatic'} />
              <SpecRow label="Fuel" value={vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase()} />
              <SpecRow label="Seats" value={String(vehicle.seats)} />
              <SpecRow label="Year" value={String(vehicle.year)} />
              <SpecRow label="Mileage limit" value={mileageLimitLabel(vehicle.mileageLimitKm)} />
              <SpecRow label="Security deposit" value={formatMoney(vehicle.depositAmount)} />
              <SpecRow label="Pick-up hub" value={`${vehicle.location.name} · ${vehicle.location.city}`} />
            </View>
          ) : null}

          {tab === 'plans' ? (
            <View style={styles.tabBody}>
              {vehicle.pricing.length > 0 ? (
                vehicle.pricing.map((entry) => (
                  <View key={entry.id} style={[styles.plan, { borderColor: theme.line }]}>
                    <View style={styles.planHead}>
                      <ThemedText type="subtitle">{entry.name}</ThemedText>
                      <ThemedText type="price">{formatMoney(entry.baseDayRate)}</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {entry.minDays} day minimum
                      {entry.mileageLimitKm ? ` · ${entry.mileageLimitKm} km included` : ''}
                      {entry.extraKmRate ? ` · ${formatMoney(entry.extraKmRate)} per extra km` : ''}
                      {entry.weeklyDiscountPercent ? ` · ${entry.weeklyDiscountPercent}% off from 7 days` : ''}
                      {entry.monthlyDiscountPercent ? ` · ${entry.monthlyDiscountPercent}% off from 30 days` : ''}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText type="body" themeColor="textSecondary">
                  The hub prices this ride per day at {formatMoney(vehicle.pricePerDay)}.
                </ThemedText>
              )}
              <Notice
                text={`Your ${durationDays}-day window quotes at ${formatMoney(vehicle.pricePerDay * durationDays)} before deposit and taxes.`}
              />
            </View>
          ) : null}

          {tab === 'reviews' ? (
            <View style={styles.tabBody}>
              {reviews && reviews.summary.total > 0 ? (
                <>
                  <View style={styles.reviewSummary}>
                    <Text style={[styles.reviewScore, { color: theme.text }]}>
                      {reviews.summary.average.toFixed(1)}
                    </Text>
                    <View style={styles.reviewSummaryText}>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= Math.round(reviews.summary.average) ? 'star' : 'star-outline'}
                            size={14}
                            color={theme.brandStrong}
                          />
                        ))}
                      </View>
                      <Text style={[styles.ratingMeta, { color: theme.textSecondary }]}>
                        {reviews.summary.total} review{reviews.summary.total === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                  {reviews.data.map((review) => (
                    <View key={review.id} style={[styles.review, { borderColor: theme.line }]}>
                      <View style={styles.reviewHead}>
                        <ThemedText type="smallBold">{review.customerName}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {review.rating.toFixed(1)} ★
                        </ThemedText>
                      </View>
                      {review.title ? <ThemedText type="body">{review.title}</ThemedText> : null}
                      {review.comment ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {review.comment}
                        </ThemedText>
                      ) : null}
                    </View>
                  ))}
                </>
              ) : (
                <ThemedText type="body" themeColor="textSecondary">
                  No rider reviews for this vehicle yet.
                </ThemedText>
              )}
            </View>
          ) : null}

          {similar.length > 0 ? (
            <View style={styles.similar}>
              <View style={styles.similarHead}>
                <ThemedText type="heading">Similar vehicles</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/explore', params: { category: vehicle.category.slug } })
                  }>
                  <Text style={[styles.similarAll, { color: theme.brandStrong }]}>View all</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarRail}>
                {similar.map((item) => (
                  <RideTile
                    key={item.id}
                    vehicle={item}
                    onPress={() => router.push({ pathname: '/vehicles/[slug]', params: { slug: item.slug } })}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.cta, { backgroundColor: theme.backgroundElement, borderTopColor: theme.line }]}>
        <View style={styles.ctaText}>
          <View style={styles.ctaPriceRow}>
            <Text style={[styles.ctaPrice, { color: theme.text }]}>{formatMoney(vehicle.pricePerDay)}</Text>
            <Text style={[styles.ctaPerDay, { color: theme.textSecondary }]}>/ Day</Text>
          </View>
          <Text style={[styles.ctaNote, { color: theme.textSecondary }]}>
            {formatMoney(vehicle.depositAmount)} refundable deposit
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={bookedOut}
          onPress={() => router.push({ pathname: '/checkout/[vehicleId]', params: { vehicleId: vehicle.id } })}
          style={({ pressed }) => [
            styles.ctaButton,
            {
              backgroundColor: bookedOut ? theme.backgroundSelected : theme.brand,
              opacity: bookedOut ? 0.7 : pressed ? 0.92 : 1,
            },
          ]}>
          <Text style={[styles.ctaButtonText, { color: bookedOut ? theme.textSecondary : theme.onBrand }]}>
            {bookedOut ? 'Booked Out' : 'Book This Ride'}
          </Text>
        </Pressable>
      </SafeAreaView>

      <Sheet visible={tripSheet === 'pickup'} onClose={() => setTripSheet(null)} title="Pick-up day">
        {days.slice(0, 14).map((day, index) => (
          <MenuRow
            key={day.key}
            icon="calendar-outline"
            label={`${day.label} · ${day.sublabel}`}
            meta={day.key === dayKey ? 'Selected' : undefined}
            last={index === 13}
            onPress={() => {
              setDayKey(day.key);
              setTripSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={tripSheet === 'return'}
        onClose={() => setTripSheet(null)}
        title="Rental length"
        subtitle={`Returning ${formatWeekdayDay(returnAt)}`}>
        {DURATIONS.map((count, index) => (
          <MenuRow
            key={count}
            icon="time-outline"
            label={`${count} day${count === 1 ? '' : 's'}`}
            meta={count === durationDays ? 'Selected' : undefined}
            last={index === DURATIONS.length - 1}
            onPress={() => {
              setDurationDays(count);
              setTripSheet(null);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

function Include({ icon, title, note }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.include, { borderColor: theme.line }]}>
      <Ionicons name={icon} size={18} color={theme.brandStrong} />
      <View style={styles.includeText}>
        <Text style={[styles.includeTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.includeNote, { color: theme.textSecondary }]}>{note}</Text>
      </View>
    </View>
  );
}

function Term({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.term}>
      <Ionicons name="ellipse" size={5} color={theme.textSecondary} style={styles.termDot} />
      <Text style={[styles.termText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

function CheckLine({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.term}>
      <Ionicons name="checkmark-circle-outline" size={16} color={theme.brandStrong} style={styles.checkDot} />
      <Text style={[styles.termText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.specLine, { borderBottomColor: theme.line }]}>
      <Text style={[styles.specLineLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.specLineValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  retry: { padding: Spacing.two },
  retryText: { fontSize: 15, fontWeight: '800' },
  body: { paddingBottom: 120 },
  gallery: { position: 'relative' },
  galleryImage: { height: 300, backgroundColor: '#f1e7d2' },
  galleryFallback: { width: '100%' },
  galleryTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  galleryCounter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    backgroundColor: 'rgba(36,36,36,0.68)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  galleryCounterText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  galleryDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  galleryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  galleryDotActive: { width: 16, backgroundColor: '#ffc400' },
  galleryActions: { flexDirection: 'row', gap: Spacing.two },
  galleryStatus: { position: 'absolute', left: Spacing.three, bottom: Spacing.three },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  thumbsTrack: { flexGrow: 0 },
  thumbs: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  thumb: {
    width: 52,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%', backgroundColor: '#f1e7d2' },
  tripCellHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pad: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingTop: Spacing.three },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  titleRow: { gap: 2 },
  title: { fontSize: 26, lineHeight: 32 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  ratingMeta: { fontSize: 13, fontWeight: '500' },
  specRow: { flexDirection: 'row', gap: Spacing.two },
  tripCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tripHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  edit: { fontSize: 13, fontWeight: '800' },
  tripDates: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.three },
  tripDate: { flex: 1, gap: 2 },
  tripLabel: { fontSize: 11, fontWeight: '600' },
  tripValue: { fontSize: 15, fontWeight: '800' },
  tripDivider: { width: 1 },
  tripPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  tripPlaceText: { flex: 1, gap: 1 },
  tabBody: { gap: Spacing.three },
  tabHeading: { marginTop: Spacing.one },
  includeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  include: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.field,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
  },
  includeText: { gap: 1 },
  includeTitle: { fontSize: 14, fontWeight: '800' },
  includeNote: { fontSize: 11, lineHeight: 15 },
  terms: { gap: Spacing.two },
  term: { flexDirection: 'row', gap: Spacing.two },
  termDot: { marginTop: 7 },
  checkDot: { marginTop: 3 },
  termText: { flex: 1, fontSize: 13, lineHeight: 19 },
  vendor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.field,
    padding: Spacing.three,
  },
  vendorText: { flex: 1, gap: 2 },
  vendorTitle: { fontSize: 14, fontWeight: '800' },
  vendorNote: { fontSize: 12 },
  specLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  specLineLabel: { fontSize: 14, fontWeight: '500' },
  specLineValue: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  plan: { borderWidth: 1, borderRadius: Radius.field, padding: Spacing.three, gap: 4 },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reviewScore: { fontSize: 40, fontWeight: '800' },
  reviewSummaryText: { gap: 3 },
  stars: { flexDirection: 'row', gap: 2 },
  review: { borderWidth: 1, borderRadius: Radius.field, padding: Spacing.three, gap: 4 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  similar: { gap: Spacing.three },
  similarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  similarAll: { fontSize: 13, fontWeight: '800' },
  similarRail: { gap: Spacing.three, paddingRight: Spacing.three },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaText: { flex: 1, gap: 1 },
  ctaPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  ctaPrice: { fontSize: 22, fontWeight: '800' },
  ctaPerDay: { fontSize: 13, fontWeight: '600' },
  ctaNote: { fontSize: 12 },
  ctaButton: { borderRadius: Radius.field, paddingHorizontal: 28, paddingVertical: 16 },
  ctaButtonText: { color: '#242424', fontSize: 15, fontWeight: '800' },
});
