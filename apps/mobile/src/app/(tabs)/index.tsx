import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MenuRow, Notice, SectionHeading, Sheet } from '@/components/kit';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { RideTile } from '@/features/catalogue/ride-card';
import { useRentalWindow } from '@/features/search/window-context';
import { useTheme } from '@/hooks/use-theme';
import { bookingApi, catalogueApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiCategory, ApiCoupon, ApiLocation, ApiVehicle } from '@/lib/api/types';
import { formatMoney, formatWeekdayDay, initials } from '@/lib/format';
import { useSession } from '@/lib/session/context';

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'motorcycle', label: 'Bikes' },
  { key: 'scooter', label: 'Scooters' },
  { key: 'car', label: 'Cars' },
] as const;

const SERVICES = [
  { icon: 'calendar-outline', title: 'Monthly rentals', note: 'Save up to 30%', tint: 'brand' },
  { icon: 'car-outline', title: 'Tow vehicle', note: '24/7 assistance', tint: 'blue' },
  { icon: 'person-outline', title: 'Acting driver', note: 'By hour or day', tint: 'warm' },
] as const;

const DURATIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30];

type SheetName = 'city' | 'pickup' | 'return' | null;

export default function HomeScreen() {
  const theme = useTheme();
  const { status: sessionStatus, user } = useSession();
  const { days, dayKey, setDayKey, durationDays, setDurationDays, window } = useRentalWindow();

  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [fleet, setFleet] = useState<ApiVehicle[]>([]);
  const [fleetTotal, setFleetTotal] = useState<number | null>(null);
  const [coupon, setCoupon] = useState<ApiCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TYPE_TABS)[number]['key']>('all');
  const [citySlug, setCitySlug] = useState<string | undefined>();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      catalogueApi.locations(),
      catalogueApi.categories(),
      bookingApi.coupons(),
      catalogueApi.vehicles({ limit: 100, sort: 'popular' }),
    ])
      .then(([nextLocations, nextCategories, nextCoupons, page]) => {
        if (!active) return;
        setLocations(nextLocations.filter((entry) => entry.isActive));
        setCategories(nextCategories.filter((entry) => entry.isActive));
        setCoupon(nextCoupons[0] ?? null);
        setFleet(page.items);
        setFleetTotal(page.meta.total);
      })
      .catch((cause) => {
        if (active) setError(describeApiError(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  const activeCity = locations.find((entry) => entry.slug === citySlug)?.city ?? locations[0]?.city ?? 'Puducherry';
  const rated = fleet.map((entry) => entry.rating).filter((rating) => rating > 0);
  const rating = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : null;
  const popular = fleet.filter((entry) => entry.popular).slice(0, 8);

  const stats = [
    { value: fleetTotal === null ? '—' : String(fleetTotal), label: 'Vehicles' },
    { value: locations.length ? String(locations.length) : '—', label: 'Pick-up hubs' },
    { value: rating ? rating.toFixed(1) : '—', label: 'Fleet rating' },
  ];

  const returnAt = new Date(new Date(window.pickupAt).getTime() + durationDays * 86_400_000).toISOString();

  function search() {
    router.push({
      pathname: '/(tabs)/explore',
      params: {
        ...(type === 'all' ? {} : { category: type }),
        ...(citySlug ? { location: citySlug } : {}),
      },
    });
  }

  async function copyCode() {
    if (!coupon) return;
    await Clipboard.setStringAsync(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const offerLine = coupon
    ? coupon.type === 'PERCENT'
      ? `Get ${coupon.value}% off${coupon.maxDiscount ? `, up to ${formatMoney(coupon.maxDiscount)}` : ''}, on bookings over ${formatMoney(coupon.minOrderAmount)}.`
      : `Get ${formatMoney(coupon.value)} off bookings over ${formatMoney(coupon.minOrderAmount)}.`
    : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose pick-up city"
              onPress={() => setSheet('city')}
              style={styles.cityButton}>
              <View style={[styles.mark, { backgroundColor: theme.brand }]}>
                <Text style={styles.markText}>S</Text>
              </View>
              <View style={styles.cityText}>
                <Text style={[styles.cityLabel, { color: theme.textSecondary }]}>Pick-up city</Text>
                <View style={styles.cityValueRow}>
                  <Ionicons name="location" size={14} color={theme.brand} />
                  <Text style={[styles.cityValue, { color: theme.text }]} numberOfLines={1}>
                    {activeCity}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={theme.text} />
                </View>
              </View>
            </Pressable>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [
                  styles.circle,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.line, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="notifications-outline" size={19} color={theme.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sessionStatus === 'signed-in' ? 'Account' : 'Sign in'}
                onPress={() =>
                  sessionStatus === 'signed-in' ? router.push('/(tabs)/profile') : router.push('/(auth)/login')
                }
                style={({ pressed }) => [
                  styles.avatar,
                  { backgroundColor: theme.brandSoft, opacity: pressed ? 0.85 : 1 },
                ]}>
                {sessionStatus === 'signed-in' ? (
                  <Text style={[styles.avatarText, { color: theme.brandStrong }]}>
                    {initials(user?.fullName ?? user?.email)}
                  </Text>
                ) : (
                  <Ionicons name="person-outline" size={19} color={theme.brandStrong} />
                )}
              </Pressable>
            </View>
          </View>

          <View style={[styles.trust, { backgroundColor: theme.brandSoft }]}>
            <View style={[styles.trustDot, { backgroundColor: theme.brand }]} />
            <Text style={[styles.trustText, { color: theme.brandStrong }]}>
              Puducherry's trusted rental platform
            </Text>
          </View>

          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Your ride. Your city.{'\n'}
            <Text style={{ color: theme.brand }}>Your freedom.</Text>
          </Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            Book bikes, scooters and cars for everyday rides and weekend escapes.
          </Text>

          <View style={[styles.searchCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.dateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change pick-up date"
                onPress={() => setSheet('pickup')}
                style={[styles.dateTile, { backgroundColor: theme.backgroundSelected, borderColor: theme.line }]}>
                <View style={styles.dateLabelRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Pick-up</Text>
                </View>
                <Text style={[styles.dateValue, { color: theme.text }]}>{formatWeekdayDay(window.pickupAt)}</Text>
              </Pressable>
              <View style={[styles.dateDivider, { backgroundColor: theme.line }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change return date"
                onPress={() => setSheet('return')}
                style={[styles.dateTile, { backgroundColor: theme.backgroundSelected, borderColor: theme.line }]}>
                <View style={styles.dateLabelRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>Return</Text>
                </View>
                <Text style={[styles.dateValue, { color: theme.text }]}>{formatWeekdayDay(returnAt)}</Text>
              </Pressable>
            </View>

            <View style={styles.typeRow}>
              {TYPE_TABS.map((tab) => {
                const active = type === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setType(tab.key)}
                    style={({ pressed }) => [
                      styles.typeChip,
                      {
                        backgroundColor: active ? theme.brandSoft : theme.backgroundElement,
                        borderColor: active ? theme.brand : theme.line,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}>
                    <Text style={[styles.typeText, { color: active ? theme.brandStrong : theme.text }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={search}
              style={({ pressed }) => [
                styles.searchButton,
                { backgroundColor: theme.brand, opacity: pressed ? 0.92 : 1 },
              ]}>
              <Ionicons name="search" size={20} color="#ffffff" />
              <Text style={styles.searchText}>Search rides</Text>
            </Pressable>
          </View>

          <View style={[styles.statsCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
            {stats.map((stat, index) => (
              <View key={stat.label} style={styles.stat}>
                {index > 0 ? <View style={[styles.statDivider, { backgroundColor: theme.line }]} /> : null}
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <SectionHeading
            eyebrow="Pick your ride"
            title="Find your perfect ride"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/explore')}
          />

          <View style={styles.categoryRow}>
            {categories.map((category) => {
              const image = resolveMediaUrl(category.imageUrl);
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/explore', params: { category: category.slug } })
                  }
                  style={({ pressed }) => [styles.categoryTile, { opacity: pressed ? 0.92 : 1 }]}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      alt={category.name}
                      style={styles.categoryImage}
                      contentFit="cover"
                      transition={180}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[styles.categoryImage, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                  <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                    {category.vehicleCount} vehicles
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.serviceRow}>
            {SERVICES.map((service) => {
              const background =
                service.tint === 'brand'
                  ? theme.brandSoft
                  : service.tint === 'blue'
                    ? theme.accentBlue
                    : theme.backgroundSelected;
              const foreground =
                service.tint === 'brand'
                  ? theme.brand
                  : service.tint === 'blue'
                    ? theme.accentBlueText
                    : theme.warning;
              return (
                <View key={service.title} style={[styles.serviceTile, { backgroundColor: background }]}>
                  <View style={[styles.serviceIcon, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name={service.icon} size={18} color={foreground} />
                  </View>
                  <Text style={[styles.serviceTitle, { color: theme.text }]} numberOfLines={2}>
                    {service.title}
                  </Text>
                  <Text style={[styles.serviceNote, { color: theme.textSecondary }]} numberOfLines={2}>
                    {service.note}
                  </Text>
                </View>
              );
            })}
          </View>

          {coupon ? (
            <View style={[styles.offer, { backgroundColor: theme.hero }]}>
              <View pointerEvents="none" style={[styles.offerCircle, styles.offerCircleLarge]} />
              <View pointerEvents="none" style={[styles.offerCircle, styles.offerCircleSmall]} />
              <View style={[styles.offerTag, { backgroundColor: theme.brandSoft }]}>
                <Text style={[styles.offerTagText, { color: theme.brandStrong }]}>Limited time offer</Text>
              </View>
              <Text style={styles.offerTitle}>{coupon.title}</Text>
              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Use code</Text>
                  <Text style={styles.codeValue}>{coupon.code}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void copyCode()}
                  style={({ pressed }) => [styles.copyButton, { opacity: pressed ? 0.9 : 1 }]}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={theme.brandStrong} />
                  <Text style={[styles.copyText, { color: theme.brandStrong }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
              {offerLine ? <Text style={styles.offerLine}>{offerLine}</Text> : null}
            </View>
          ) : null}

          {popular.length > 0 ? (
            <View style={styles.rail}>
              <SectionHeading
                eyebrow="Near you"
                title="Popular rides"
                actionLabel="View all"
                onAction={() => router.push('/(tabs)/explore')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.railContent}>
                {popular.map((vehicle) => (
                  <RideTile
                    key={vehicle.id}
                    vehicle={vehicle}
                    onPress={() =>
                      router.push({ pathname: '/vehicles/[slug]', params: { slug: vehicle.slug } })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <SectionHeading eyebrow="Where to next" title="Ride out from Puducherry" />
          <Text style={[styles.destinationsSub, { color: theme.textSecondary }]}>
            Short rides, long weekends and everything in between.
          </Text>
          <View style={styles.destinationRow}>
            {['Auroville', 'Paradise Beach', 'Rock Beach', 'Serenity Beach'].map((place) => (
              <View
                key={place}
                style={[styles.destination, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
                <Ionicons name="location-outline" size={14} color={theme.brand} />
                <Text style={[styles.destinationText, { color: theme.text }]}>{place}</Text>
              </View>
            ))}
          </View>

          {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={sheet === 'city'} onClose={() => setSheet(null)} title="Pick-up city" subtitle="Choose the hub you collect the ride from">
        <MenuRow
          icon="globe-outline"
          label="Any hub"
          meta={citySlug ? undefined : 'Selected'}
          onPress={() => {
            setCitySlug(undefined);
            setSheet(null);
          }}
        />
        {locations.map((location, index) => (
          <MenuRow
            key={location.id}
            icon="location-outline"
            label={`${location.name} · ${location.city}`}
            meta={citySlug === location.slug ? 'Selected' : `${location.vehicleCount}`}
            last={index === locations.length - 1}
            onPress={() => {
              setCitySlug(location.slug);
              setSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'pickup'} onClose={() => setSheet(null)} title="Pick-up day" subtitle="The hour is 9:30am unless changed at checkout">
        {days.slice(0, 14).map((day, index) => (
          <MenuRow
            key={day.key}
            icon="calendar-outline"
            label={`${day.label} · ${day.sublabel}`}
            meta={day.key === dayKey ? 'Selected' : undefined}
            last={index === 13}
            onPress={() => {
              setDayKey(day.key);
              setSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet === 'return'} onClose={() => setSheet(null)} title="Rental length" subtitle={`Returning ${formatWeekdayDay(returnAt)}`}>
        {DURATIONS.map((count, index) => (
          <MenuRow
            key={count}
            icon="time-outline"
            label={`${count} day${count === 1 ? '' : 's'}`}
            meta={count === durationDays ? 'Selected' : undefined}
            last={index === DURATIONS.length - 1}
            onPress={() => {
              setDurationDays(count);
              setSheet(null);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  cityButton: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  cityText: { gap: 1, flex: 1 },
  cityLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  cityValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cityValue: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  trust: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  trustDot: { width: 7, height: 7, borderRadius: 4 },
  trustText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  heroSub: { fontSize: 15, lineHeight: 22 },
  searchCard: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three },
  dateRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.three },
  dateTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.field,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 4,
  },
  dateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateLabel: { fontSize: 12, fontWeight: '600' },
  dateValue: { fontSize: 15, fontWeight: '800' },
  dateDivider: { width: 1, marginVertical: 6 },
  typeRow: { flexDirection: 'row', gap: Spacing.two },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.field,
    paddingVertical: 10,
  },
  typeText: { fontSize: 14, fontWeight: '700' },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 54,
    borderRadius: Radius.field,
  },
  searchText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  statsCard: { flexDirection: 'row', borderRadius: Radius.tile, paddingVertical: Spacing.three },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { position: 'absolute', left: 0, top: 4, bottom: 4, width: 1 },
  statValue: { fontSize: 21, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  categoryRow: { flexDirection: 'row', gap: Spacing.two },
  categoryTile: { flex: 1, gap: 4 },
  categoryImage: { width: '100%', height: 92, borderRadius: Radius.field },
  categoryName: { fontSize: 14, fontWeight: '800' },
  categoryCount: { fontSize: 12, fontWeight: '500' },
  serviceRow: { flexDirection: 'row', gap: Spacing.two },
  serviceTile: { flex: 1, borderRadius: Radius.field, padding: 12, gap: 6, minHeight: 116 },
  serviceIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 13, fontWeight: '800', lineHeight: 17 },
  serviceNote: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  offer: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.three, overflow: 'hidden' },
  offerCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  offerCircleLarge: { width: 220, height: 220, right: -70, top: -90 },
  offerCircleSmall: { width: 120, height: 120, right: 40, top: 40, backgroundColor: 'rgba(255,255,255,0.04)' },
  offerTag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.pill },
  offerTagText: { fontSize: 11, fontWeight: '800' },
  offerTitle: { color: '#ffffff', fontSize: 22, lineHeight: 28, fontWeight: '800' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  codeBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 1,
  },
  codeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  codeValue: { color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  copyText: { fontSize: 13, fontWeight: '800' },
  offerLine: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
  rail: { gap: Spacing.three },
  railContent: { gap: Spacing.three, paddingRight: Spacing.three },
  destinationsSub: { fontSize: 14, lineHeight: 20, marginTop: -Spacing.two },
  destinationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  destinationText: { fontSize: 13, fontWeight: '600' },
});
