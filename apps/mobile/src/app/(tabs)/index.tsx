import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageSource } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { MenuRow, Sheet } from '@/components/kit';
import { PageGlow } from '@/components/ui';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { HomeRideCard } from '@/features/catalogue/ride-card';
import { FaqRail, TrendingCarousel, TrustStrip } from '@/features/home/home-sections';
import type { ServiceSlug } from '@/features/services/content';
import { useTheme } from '@/hooks/use-theme';
import { bookingApi, catalogueApi } from '@/lib/api/endpoints';
import { describeApiError } from '@/lib/api/errors';
import type { ApiCoupon, ApiLocation, ApiVehicle } from '@/lib/api/types';
import { formatDayYear, formatMoney } from '@/lib/format';
import { distanceKm } from '@/lib/geo';

type IconName = keyof typeof Ionicons.glyphMap;
type SheetName = 'city' | 'refer' | 'help' | null;

/** Every tile ends on a surface the app really has: a filter, a page, a tab or an honest sheet. */
type TileAction =
  | { kind: 'category'; slug: string }
  | { kind: 'service'; slug: ServiceSlug }
  | { kind: 'van' }
  | { kind: 'offers' }
  | { kind: 'explore' }
  | { kind: 'recent' }
  | { kind: 'reviews' }
  | { kind: 'sheet'; sheet: Exclude<SheetName, null> };

type ServiceTile = { title: string; subtitle: string; image: ImageSource; tint: string; action: TileAction };

type QuickService = { title: string; subtitle: string; image: ImageSource; tint: string; action: TileAction };

/** Soft card fills from the reference; the glyph on them is always charcoal. */
const TINT = {
  bike: '#fef1ce',
  car: '#ebf3fe',
  van: '#eee2f8',
  peach: '#fcebd8',
  butter: '#fde8bb',
  lilac: '#f1ecfb',
} as const;

const HERO_PHOTO = require('../../../assets/images/home/banner-hero-photo.png');
const PACKAGES_GIFT = require('../../../assets/images/home/packages-gift.png');

/** The supplied campaign banners; each opens the surface it advertises. */
const BANNERS: { image: ImageSource; alt: string; label: string; action: TileAction }[] = [
  {
    image: require('../../../assets/images/home/banner-bike.png'),
    alt: 'Bike Rental. Freedom to Ride, Anytime',
    label: 'Bike rental. Book now',
    action: { kind: 'category', slug: 'motorcycle,scooter' },
  },
  {
    image: require('../../../assets/images/home/banner-car.png'),
    alt: 'Car Rental. Comfortable Rides for Every Journey',
    label: 'Car rental. Book now',
    action: { kind: 'category', slug: 'car' },
  },
  {
    image: require('../../../assets/images/home/banner-van.png'),
    alt: 'Van Rental. Spacious Group Travel',
    label: 'Van rental. Book now',
    action: { kind: 'van' },
  },
  {
    image: require('../../../assets/images/home/banner-puncture.png'),
    alt: 'Puncture Service. On-Spot Help, Anytime, Anywhere',
    label: 'Puncture service. Request help',
    action: { kind: 'service', slug: 'puncture' },
  },
  {
    image: require('../../../assets/images/home/banner-tow.png'),
    alt: 'Tow Vehicle Service. Breakdown Recovery and Roadside Assistance',
    label: 'Tow vehicle service. Request tow',
    action: { kind: 'service', slug: 'tow' },
  },
];
const SLIDE_COUNT = BANNERS.length + 1;

const RENTAL_TILES: { label: string; image: ImageSource; tint: string; action: TileAction }[] = [
  {
    label: 'Bike\nRental',
    image: require('../../../assets/images/home/cat-bike.png'),
    tint: TINT.bike,
    action: { kind: 'category', slug: 'motorcycle,scooter' },
  },
  {
    label: 'Car\nRental',
    image: require('../../../assets/images/home/cat-car.png'),
    tint: TINT.car,
    action: { kind: 'category', slug: 'car' },
  },
  {
    label: 'Van\nRental',
    image: require('../../../assets/images/home/cat-van.png'),
    tint: TINT.van,
    action: { kind: 'van' },
  },
];

const QUICK_SERVICES: QuickService[] = [
  {
    title: 'Puncture\nService',
    subtitle: 'On-Spot Help',
    image: require('../../../assets/images/home/service-quick-tyre.png'),
    tint: TINT.peach,
    action: { kind: 'service', slug: 'puncture' },
  },
  {
    title: 'Tow Vehicle\nService',
    subtitle: 'Breakdown Support',
    image: require('../../../assets/images/home/service-quick-tow.png'),
    tint: TINT.butter,
    action: { kind: 'service', slug: 'tow' },
  },
];

const SERVICE_TILES: ServiceTile[] = [
  {
    title: 'Puncture\nService',
    subtitle: 'Get Help',
    image: require('../../../assets/images/home/service-puncture.png'),
    tint: TINT.peach,
    action: { kind: 'service', slug: 'puncture' },
  },
  {
    title: 'Tow Vehicle\nService',
    subtitle: 'Get Help',
    image: require('../../../assets/images/home/service-tow.png'),
    tint: TINT.butter,
    action: { kind: 'service', slug: 'tow' },
  },
  {
    title: 'Weekend\nDeals',
    subtitle: 'Special Offers',
    image: require('../../../assets/images/home/service-deals.png'),
    tint: TINT.car,
    action: { kind: 'offers' },
  },
  {
    title: 'Refer & Earn',
    subtitle: 'Invite Friends',
    image: require('../../../assets/images/home/service-refer.png'),
    tint: TINT.lilac,
    action: { kind: 'sheet', sheet: 'refer' },
  },
];

const SERVICE_PILLS: { label: string; subtitle: string; icon: IconName; action: TileAction }[] = [
  { label: 'Recently Viewed', subtitle: 'Quick Access', icon: 'time', action: { kind: 'recent' } },
  { label: 'Customer Reviews', subtitle: 'Trusted by Riders', icon: 'star', action: { kind: 'reviews' } },
  { label: 'Emergency Help', subtitle: 'One-Tap Support', icon: 'headset', action: { kind: 'sheet', sheet: 'help' } },
];

/** The booking questions riders ask before they tap Reserve. */
const FAQS = [
  {
    question: 'How to book a vehicle?',
    answer:
      'Search with your pick-up city and dates, choose a ride, then confirm your details and reserve. You get a booking code and the hub contact number as soon as it is confirmed.',
  },
  {
    question: 'What documents are needed?',
    answer:
      'For two-wheelers: a valid driving licence and one government photo ID. For cars: a four-wheeler licence plus a second ID. Add them under Licence in the app before pick-up.',
  },
  {
    question: 'Is there a security deposit?',
    answer:
      'Yes. Each ride shows its refundable deposit on the detail screen. It is collected at pick-up or pre-authorised online and released within 3 working days of return.',
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      'Free cancellation up to 24 hours before pick-up. Between 24 and 6 hours, 50% of the rental is charged. Under 6 hours, or a no-show, the first day is non-refundable.',
  },
  {
    question: 'What if the vehicle breaks down?',
    answer:
      'Call the 24/7 support line from this app. The hub arranges roadside assistance or a replacement, and mechanical failures that are not your fault are covered at no cost.',
  },
  {
    question: 'Can it be delivered to my hotel?',
    answer:
      'Doorstep delivery can be requested at checkout for rides in Puducherry city limits, and the hub confirms the slot for your dates.',
  },
];

/** "20% OFF" / "₹500 OFF" — the headline a coupon ticket carries. */
function couponHeadline(coupon: ApiCoupon): string {
  return coupon.type === 'PERCENT'
    ? `${coupon.value}% OFF`
    : `${formatMoney(coupon.value)} OFF`;
}

function couponLimit(coupon: ApiCoupon): string {
  return coupon.minOrderAmount > 0
    ? `On bookings above ${formatMoney(coupon.minOrderAmount)}`
    : 'On any booking';
}

export default function HomeScreen() {
  const theme = useTheme();

  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [fleet, setFleet] = useState<ApiVehicle[]>([]);
  const [fleetTotal, setFleetTotal] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [citySlug, setCitySlug] = useState<string | undefined>();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [faqSheet, setFaqSheet] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  const heroWidth = windowWidth - Spacing.three * 2;
  const heroRef = useRef<ScrollViewInstance>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (slide + 1) % SLIDE_COUNT;
      heroRef.current?.scrollTo({ x: next * heroWidth, animated: true });
      setSlide(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [slide, heroWidth]);

  useEffect(() => {
    let active = true;
    setError(null);

    // Settled, not all: one slow endpoint must not blank the other sections.
    Promise.allSettled([
      catalogueApi.locations(),
      catalogueApi.vehicles({ limit: 100, sort: 'popular' }),
      bookingApi.coupons(),
    ]).then(([locationsResult, vehiclesResult, couponsResult]) => {
      if (!active) return;

      if (locationsResult.status === 'fulfilled') {
        setLocations(locationsResult.value.filter((entry) => entry.isActive));
      }
      if (vehiclesResult.status === 'fulfilled') {
        setFleet(vehiclesResult.value.items);
        setFleetTotal(vehiclesResult.value.meta.total);
      }
      // Coupons are a bonus strip; a failure there must not raise the page error.
      if (couponsResult.status === 'fulfilled') {
        setCoupons(couponsResult.value);
      }

      const failed = [locationsResult, vehiclesResult].find(
        (result) => result.status === 'rejected',
      );
      if (failed?.status === 'rejected') setError(describeApiError(failed.reason));
      setRefreshing(false);
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Km badges need the rider's position; without permission they fall back to the hub city.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
        const position =
          last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (active) {
          setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch {
        // No fix available; the city badge already covers this.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function reload() {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }

  const activeCity =
    locations.find((entry) => entry.slug === citySlug)?.city ?? locations[0]?.city ?? 'All hubs';
  const fleetReady = fleetTotal !== null;

  const hubCoords: Record<string, { latitude: number; longitude: number }> = {};
  for (const hub of locations) {
    if (hub.latitude !== null && hub.longitude !== null) {
      hubCoords[hub.slug] = { latitude: hub.latitude, longitude: hub.longitude };
    }
  }

  function kmTo(vehicle: ApiVehicle): number | null {
    const hub = hubCoords[vehicle.location.slug];
    if (!coords || !hub) return null;
    return distanceKm(coords, hub);
  }

  const available = fleet.filter((entry) => entry.status === 'AVAILABLE');
  const nearby = [...available]
    .sort(
      (a, b) => (kmTo(a) ?? Number.POSITIVE_INFINITY) - (kmTo(b) ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 3);

  const popularFleet = fleet.filter((entry) => entry.popular);
  const trendingSource = popularFleet.length
    ? popularFleet
    : [...fleet].sort((a, b) => b.rating - a.rating);
  const trending = trendingSource.slice(0, 4);
  const cheapestId =
    trending.length > 1
      ? trending.reduce((best, entry) => (entry.pricePerDay < best.pricePerDay ? entry : best)).id
      : null;
  const topRatedId =
    trending.length > 1
      ? trending.reduce((best, entry) => (entry.rating > best.rating ? entry : best)).id
      : null;

  function trendingTag(vehicle: ApiVehicle): string {
    if (vehicle.id === cheapestId) return 'Best Value';
    if (vehicle.id === topRatedId) return 'Top Choice';
    return 'Popular';
  }

  const activePlans = fleet.flatMap((vehicle) => vehicle.pricing.filter((plan) => plan.isActive));
  const maxWeekly = activePlans.reduce(
    (best, plan) => Math.max(best, plan.weeklyDiscountPercent ?? 0),
    0,
  );
  const maxMonthly = activePlans.reduce(
    (best, plan) => Math.max(best, plan.monthlyDiscountPercent ?? 0),
    0,
  );
  const planBits = [
    maxWeekly > 0 ? `Weekly ${maxWeekly}% off` : null,
    maxMonthly > 0 ? `Monthly ${maxMonthly}% off` : null,
  ].filter((bit): bit is string => bit !== null);

  const hubPhone = locations.find((entry) => entry.phone)?.phone ?? null;

  function openCategory(slug: string) {
    router.push({
      pathname: '/(tabs)/explore',
      params: {
        category: slug,
        ...(citySlug ? { location: citySlug } : {}),
      },
    });
  }

  function openVehicle(vehicle: ApiVehicle) {
    router.push({ pathname: '/vehicles/[slug]', params: { slug: vehicle.slug } });
  }

  function openService(slug: ServiceSlug) {
    router.push({ pathname: '/service/[slug]', params: { slug } });
  }

  function run(action: TileAction) {
    switch (action.kind) {
      case 'category':
        openCategory(action.slug);
        return;
      case 'service':
        openService(action.slug);
        return;
      case 'van':
        router.push('/rentals/van');
        return;
      case 'offers':
        router.push('/offers');
        return;
      case 'explore':
        router.push('/(tabs)/explore');
        return;
      case 'recent':
        router.push('/recent');
        return;
      case 'reviews':
        router.push('/reviews');
        return;
      case 'sheet':
        setSheet(action.sheet);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <PageGlow />
      <SafeAreaView edges={['top']} style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={reload}
              colors={[theme.brandStrong]}
              tintColor={theme.brandStrong}
              progressBackgroundColor={theme.backgroundElement}
            />
          }>
          <View style={styles.header}>
            <BrandLogo scale={0.82} style={styles.brand} />

            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Pick-up city: ${activeCity}. Change city`}
                onPress={() => setSheet('city')}
                style={({ pressed }) => [
                  styles.cityPill,
                  CardShadow,
                  {
                    backgroundColor: theme.backgroundElement,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Ionicons name="location" size={15} color={theme.accentGold} />
                <Text style={[styles.cityText, { color: theme.text }]} numberOfLines={1}>
                  {activeCity}
                </Text>
                <Ionicons name="chevron-down" size={13} color={theme.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
                style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="notifications" size={23} color={theme.accentGold} />
                <View style={[styles.bellDot, { borderColor: theme.background }]} />
              </Pressable>
            </View>
          </View>

          <View style={styles.searchRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search vehicles and services"
              onPress={() => router.push('/(tabs)/explore')}
              style={({ pressed }) => [
                styles.searchField,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.line,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <Text style={[styles.searchPlaceholder, { color: theme.textSecondary }]} numberOfLines={1}>
                Search vehicles, services...
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              onPress={() => router.push('/(tabs)/explore')}
              style={({ pressed }) => [
                styles.filterButton,
                { backgroundColor: theme.brand, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Ionicons name="options-outline" size={20} color={theme.onBrand} />
            </Pressable>
          </View>

          <TrustStrip
            onExplore={() => router.push('/(tabs)/explore')}
            onOffers={() => router.push('/offers')}
            onReviews={() => router.push('/reviews')}
            onSupport={() => setSheet('help')}
          />

          {error ? (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.line },
              ]}>
              <Ionicons name="cloud-offline-outline" size={18} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={reload}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: theme.brand, opacity: pressed ? 0.9 : 1 },
                ]}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.hero, CardShadow]}>
            <ScrollView
              ref={heroRef}
              horizontal
              pagingEnabled
              style={styles.heroPager}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width;
                if (width > 0) setSlide(Math.round(event.nativeEvent.contentOffset.x / width));
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rent Vehicles Your Way. Book now"
                onPress={() => router.push('/(tabs)/explore')}
                style={({ pressed }) => [
                  styles.heroSlide,
                  { width: heroWidth, opacity: pressed ? 0.97 : 1 },
                ]}>
                <Image
                  source={HERO_PHOTO}
                  alt="SavariGo ride on a sunset road"
                  style={styles.heroPhoto}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.heroRim} />
                <View style={styles.heroPanel} />
                <View style={styles.heroPanelCopy}>
                  <Text style={styles.heroTitle}>Rent Vehicles</Text>
                  <Text style={[styles.heroTitle, styles.heroTitleAccent]}>Your Way</Text>
                  <Text style={styles.heroSub} numberOfLines={2}>
                    Bikes, Cars, Vans and more — flexible, affordable & hassle-free.
                  </Text>
                  <View style={styles.heroCta}>
                    <Text style={styles.heroCtaText}>Book Now</Text>
                    <Ionicons name="arrow-forward" size={12} color="#242424" />
                  </View>
                </View>
              </Pressable>
              {BANNERS.map((banner) => (
                <Pressable
                  key={banner.alt}
                  accessibilityRole="button"
                  accessibilityLabel={banner.label}
                  onPress={() => run(banner.action)}
                  style={({ pressed }) => [
                    styles.heroSlide,
                    { width: heroWidth, opacity: pressed ? 0.97 : 1 },
                  ]}>
                  <Image
                    source={banner.image}
                    alt={banner.alt}
                    style={styles.heroImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.rentalRow}>
            {RENTAL_TILES.map((tile) => (
              <Pressable
                key={tile.label}
                accessibilityRole="button"
                accessibilityLabel={tile.label.replace('\n', ' ')}
                onPress={() => run(tile.action)}
                style={({ pressed }) => [
                  styles.rentalTile,
                  { backgroundColor: tile.tint, opacity: pressed ? 0.94 : 1 },
                ]}>
                <Image
                  source={tile.image}
                  alt={tile.label.replace('\n', ' ')}
                  style={styles.rentalImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <View style={styles.rentalCopy}>
                  <Text style={[styles.rentalTitle, { color: theme.text }]}>{tile.label} →</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.quickRow}>
            {QUICK_SERVICES.map((service) => (
              <Pressable
                key={service.title}
                accessibilityRole="button"
                accessibilityLabel={`${service.title.replace('\n', ' ')}. ${service.subtitle}`}
                onPress={() => run(service.action)}
                style={({ pressed }) => [
                  styles.quickTile,
                  { backgroundColor: service.tint, opacity: pressed ? 0.94 : 1 },
                ]}>
                <Image
                  source={service.image}
                  alt={service.title.replace('\n', ' ')}
                  style={styles.quickImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
                <View style={styles.quickText}>
                  <Text style={[styles.quickTitle, { color: theme.text }]}>{service.title}</Text>
                  <Text style={[styles.quickSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {service.subtitle}
                  </Text>
                </View>
                <View style={styles.quickArrow}>
                  <Ionicons name="arrow-forward" size={12} color={theme.text} />
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <SectionHead
              icon="location"
              iconColor={theme.accentGold}
              title="Nearby Vehicles"
              subtitle="Find available vehicles near you"
              actionLabel="View Nearby"
              onAction={() => router.push('/(tabs)/explore')}
            />
            {nearby.length > 0 ? (
              <View style={styles.railRow}>
                {nearby.map((vehicle) => (
                  <HomeRideCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    compact
                    distanceKm={kmTo(vehicle)}
                    onPress={() => openVehicle(vehicle)}
                  />
                ))}
              </View>
            ) : (
              <Text style={[styles.railNote, { color: theme.textSecondary }]}>
                {fleetReady || error
                  ? 'No rides are open at the hubs right now. Pull down to refresh.'
                  : 'Loading rides at the hubs…'}
              </Text>
            )}
          </View>

          {trending.length > 0 ? (
            <View style={styles.sectionBlock}>
              <SectionHead
                icon="flame"
                iconColor={theme.accentGold}
                title="Trending Rides"
                subtitle="Most booked vehicles this week"
                actionLabel="View All"
                onAction={() => router.push('/(tabs)/explore')}
              />
              <TrendingCarousel vehicles={trending} tagOf={trendingTag} onOpen={openVehicle} />
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <SectionHead
              icon="settings"
              title="Our Services"
              subtitle="More than just rentals"
              actionLabel="View All"
              onAction={() => setSheet('help')}
            />
            <View style={styles.serviceRow}>
              {SERVICE_TILES.map((service) => (
                <Pressable
                  key={service.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${service.title.replace('\n', ' ')}. ${service.subtitle}`}
                  onPress={() => run(service.action)}
                  style={({ pressed }) => [
                    styles.serviceTile,
                    { backgroundColor: service.tint, opacity: pressed ? 0.94 : 1 },
                  ]}>
                  <Image
                    source={service.image}
                    alt={service.title.replace('\n', ' ')}
                    style={styles.serviceImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <Text style={[styles.serviceTitle, { color: theme.text }]}>{service.title}</Text>
                  <View style={styles.serviceSubRow}>
                    <Text style={[styles.serviceSub, { color: theme.brandStrong }]} numberOfLines={1}>
                      {service.subtitle}
                    </Text>
                    <Ionicons name="arrow-forward" size={9} color={theme.brandStrong} />
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.pillRow}>
              {SERVICE_PILLS.map((pill) => (
                <Pressable
                  key={pill.label}
                  accessibilityRole="button"
                  onPress={() => run(pill.action)}
                  style={({ pressed }) => [
                    styles.pill,
                    { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.9 : 1 },
                  ]}>
                  <Ionicons name={pill.icon} size={12} color={theme.accentGold} />
                  <View style={styles.pillText}>
                    <Text style={[styles.pillLabel, { color: theme.text }]} numberOfLines={1}>
                      {pill.label}
                    </Text>
                    <View style={styles.pillSubRow}>
                      <Text style={[styles.pillSub, { color: theme.textSecondary }]} numberOfLines={1}>
                        {pill.subtitle}
                      </Text>
                      <Ionicons name="arrow-forward" size={9} color={theme.brandStrong} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.plans, CardShadow, { backgroundColor: theme.brand }]}>
            <View style={styles.plansGiftWrap}>
              <Image
                source={PACKAGES_GIFT}
                alt="Rental packages gift"
                style={styles.plansGift}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
              <View style={styles.plansPercent}>
                <Text style={styles.plansPercentText}>%</Text>
              </View>
            </View>
            <View style={styles.plansWedge} />
            <View style={styles.plansSpark} />
            <View style={styles.plansSparkTwo} />
            <View style={styles.plansSparkThree} />
            <View style={styles.plansCopy}>
              <Text style={styles.plansTitle}>Rental Packages</Text>
              <Text style={styles.plansText} numberOfLines={2}>
                {planBits.length ? planBits.join('\n') : 'Daily, Weekly & Monthly Deals'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/explore')}
              style={({ pressed }) => [styles.plansCta, { opacity: pressed ? 0.9 : 1 }]}>
              <Text style={styles.plansCtaText}>Explore Plans</Text>
              <Ionicons name="arrow-forward" size={12} color="#242424" />
            </Pressable>
          </View>

          {coupons.length > 0 ? (
            <View style={styles.sectionBlock}>
              <SectionHead
                icon="pricetag"
                title="Offers for you"
                subtitle="Coupon codes you can use at checkout"
                actionLabel="View All"
                onAction={() => router.push('/offers')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.couponRail}
                snapToInterval={246}
                decelerationRate="fast">
                {coupons.slice(0, 5).map((coupon) => (
                  <Pressable
                    key={coupon.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${couponHeadline(coupon)} with code ${coupon.code}. Open offers`}
                    onPress={() => router.push('/offers')}
                    style={({ pressed }) => [
                      styles.coupon,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.line,
                        opacity: pressed ? 0.94 : 1,
                      },
                    ]}>
                    <View style={styles.couponTop}>
                      <View style={[styles.couponIcon, { backgroundColor: theme.brandSoft }]}>
                        <Ionicons name="pricetag" size={15} color={theme.brandStrong} />
                      </View>
                      <View style={styles.couponCopy}>
                        <Text style={[styles.couponHeadline, { color: theme.brandStrong }]}>
                          {couponHeadline(coupon)}
                        </Text>
                        <Text style={[styles.couponTitle, { color: theme.text }]} numberOfLines={2}>
                          {coupon.title}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.couponMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {couponLimit(coupon)} · till {formatDayYear(coupon.validTill)}
                    </Text>
                    <View style={[styles.couponDivider, { borderColor: theme.line }]} />
                    <View style={styles.couponFoot}>
                      <View style={[styles.couponCodeChip, { borderColor: theme.brandStrong }]}>
                        <Text style={[styles.couponCode, { color: theme.brandStrong }]}>{coupon.code}</Text>
                      </View>
                      <View style={styles.couponCta}>
                        <Text style={[styles.couponCtaText, { color: theme.brandStrong }]}>Use offer</Text>
                        <Ionicons name="arrow-forward" size={11} color={theme.brandStrong} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <FaqRail
            questions={FAQS.map((entry) => entry.question)}
            onOpen={(index) => {
              setFaqOpen(index ?? 0);
              setFaqSheet(true);
            }}
          />
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

      <Sheet
        visible={sheet === 'refer'}
        onClose={() => setSheet(null)}
        title="Refer & Earn"
        subtitle="No referral programme yet"
        scroll={false}>
        <Text style={[styles.sheetText, { color: theme.textSecondary }]}>
          There is no referral programme to share yet. When one goes live it will appear here; the
          offers that exist today are real discount codes you can copy from the offers screen.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setSheet(null);
            router.push('/offers');
          }}
          style={({ pressed }) => [
            styles.sheetButton,
            { backgroundColor: theme.brand, opacity: pressed ? 0.9 : 1 },
          ]}>
          <Ionicons name="pricetag-outline" size={16} color={theme.onBrand} />
          <Text style={styles.sheetButtonText}>See current offers</Text>
        </Pressable>
      </Sheet>

      <Sheet
        visible={sheet === 'help'}
        onClose={() => setSheet(null)}
        title="Emergency help"
        subtitle="Roadside and hub contacts"
        scroll={false}>
        <Text style={[styles.sheetText, { color: theme.textSecondary }]}>
          If the ride breaks down, stop somewhere safe and call the hub first. Puncture and towing
          are handled by SavariGo's roadside pages.
        </Text>
        {hubPhone ? (
          <MenuRow
            icon="call-outline"
            label="Call the hub"
            meta={hubPhone}
            onPress={() => {
              setSheet(null);
              void Linking.openURL(`tel:${hubPhone}`);
            }}
          />
        ) : null}
        <MenuRow
          icon="flash-outline"
          label="Puncture service"
          meta="In app"
          onPress={() => {
            setSheet(null);
            openService('puncture');
          }}
        />
        <MenuRow
          icon="construct-outline"
          label="Tow vehicle"
          meta="In app"
          last
          onPress={() => {
            setSheet(null);
            openService('tow');
          }}
        />
      </Sheet>

      <Sheet
        visible={faqSheet}
        onClose={() => setFaqSheet(false)}
        title="Questions Riders Ask"
        subtitle="Quick answers to common doubts">
        <View style={styles.faq}>
          {FAQS.map((entry, index) => {
            const expanded = faqOpen === index;
            return (
              <Pressable
                key={entry.question}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setFaqOpen(expanded ? null : index)}
                style={[styles.faqItem, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
                <View style={styles.faqHead}>
                  <Text style={[styles.faqQuestion, { color: theme.text }]}>{entry.question}</Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textSecondary}
                  />
                </View>
                {expanded ? (
                  <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{entry.answer}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

function SectionHead({
  icon,
  iconColor,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={20} color={iconColor ?? theme.brandStrong} />
      <View style={styles.sectionText}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.sectionActionRow}>
          <Text style={[styles.sectionAction, { color: theme.accentGold }]}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={12} color={theme.accentGold} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  brand: { flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 150,
  },
  cityText: { fontSize: 12.5, fontWeight: '800', flexShrink: 1 },
  bell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: '#d6392b',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchPlaceholder: { flex: 1, fontSize: 13, fontWeight: '500' },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  retryText: { color: '#242424', fontSize: 12, fontWeight: '800' },
  hero: {
    width: '100%',
    aspectRatio: 1774 / 887,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#242424',
  },
  heroImage: { width: '100%', height: '100%' },
  heroPager: { width: '100%', height: '100%' },
  heroSlide: { height: '100%', flexDirection: 'row', alignItems: 'center' },
  heroPhoto: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%' },
  heroRim: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '47%',
    backgroundColor: '#ffc400',
    borderTopRightRadius: 150,
    borderBottomRightRadius: 150,
  },
  heroPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    backgroundColor: '#242424',
    borderTopRightRadius: 150,
    borderBottomRightRadius: 150,
  },
  heroPanelCopy: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 3,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: -0.3,
  },
  heroTitleAccent: { color: '#ffc400' },
  heroSub: { color: '#d8d3ca', fontSize: 8.5, lineHeight: 11, fontWeight: '600', marginTop: 2 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffc400',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  heroCtaText: { color: '#242424', fontSize: 10, fontWeight: '800' },
  rentalRow: { flexDirection: 'row', gap: Spacing.two },
  rentalTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.tile,
    paddingLeft: 4,
    paddingRight: 5,
    paddingVertical: 6,
    minHeight: 54,
  },
  rentalImage: { width: 40, height: 44 },
  rentalCopy: { flex: 1 },
  rentalTitle: { fontSize: 10, lineHeight: 13, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.card,
    paddingLeft: 3,
    paddingRight: 7,
    paddingVertical: 6,
    minHeight: 60,
  },
  quickImage: { width: 50, height: 42 },
  quickText: { flex: 1, gap: 1 },
  quickTitle: { fontSize: 11, lineHeight: 13.5, fontWeight: '800' },
  quickSub: { fontSize: 7.5, lineHeight: 10, fontWeight: '600' },
  quickArrow: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  sectionBlock: { gap: 5 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionText: { flex: 1, gap: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  sectionSub: { fontSize: 11, fontWeight: '500' },
  sectionActionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionAction: { fontSize: 12, fontWeight: '800' },
  railRow: { flexDirection: 'row', gap: Spacing.two },
  railNote: { fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  couponRail: { flexDirection: 'row', gap: 10, paddingRight: 4 },
  coupon: {
    width: 236,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
  },
  couponTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  couponIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  couponCopy: { flex: 1, gap: 1 },
  couponHeadline: { fontSize: 14.5, lineHeight: 18, fontWeight: '800', letterSpacing: -0.2 },
  couponTitle: { fontSize: 10.5, lineHeight: 14, fontWeight: '600' },
  couponMeta: { fontSize: 9.5, lineHeight: 13, fontWeight: '500' },
  couponDivider: { borderTopWidth: 1, marginTop: 2 },
  couponFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  couponCodeChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  couponCode: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  couponCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  couponCtaText: { fontSize: 10, fontWeight: '800' },
  serviceRow: { flexDirection: 'row', gap: 6 },
  serviceTile: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.tile,
    paddingHorizontal: 3,
    paddingTop: 7,
    paddingBottom: 6,
    gap: 2,
    minHeight: 70,
  },
  serviceImage: { width: '100%', height: 28 },
  serviceTitle: { fontSize: 9.5, lineHeight: 11.5, fontWeight: '800', textAlign: 'center' },
  serviceSubRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  serviceSub: { fontSize: 7, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  pillRow: { flexDirection: 'row', gap: 6, paddingTop: 2 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.field,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  pillText: { flex: 1, gap: 1 },
  pillLabel: { fontSize: 8, fontWeight: '800' },
  pillSubRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  pillSub: { fontSize: 7, fontWeight: '500', flexShrink: 1 },
  plans: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.card,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    minHeight: 72,
  },
  plansGiftWrap: { width: 56, height: 50, alignItems: 'center', justifyContent: 'center' },
  plansGift: { width: 54, height: 46 },
  plansPercent: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef7f1a',
    borderWidth: 2,
    borderColor: '#ffc400',
  },
  plansPercentText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  plansWedge: {
    position: 'absolute',
    right: -26,
    top: -34,
    width: 132,
    height: 170,
    backgroundColor: '#242424',
    transform: [{ rotate: '14deg' }],
  },
  plansSpark: { position: 'absolute', left: '58%', top: 5, width: 2.5, height: 8, borderRadius: 2, backgroundColor: '#ffc400', transform: [{ rotate: '-24deg' }] },
  plansSparkTwo: { position: 'absolute', left: '61%', top: 1, width: 2.5, height: 10, borderRadius: 2, backgroundColor: '#ffc400', transform: [{ rotate: '-8deg' }] },
  plansSparkThree: { position: 'absolute', left: '64%', top: 5, width: 2.5, height: 8, borderRadius: 2, backgroundColor: '#ffc400', transform: [{ rotate: '14deg' }] },
  plansCopy: { flex: 1, gap: 1, zIndex: 1 },
  plansTitle: { color: '#242424', fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  plansText: { color: '#4a3a00', fontSize: 8.5, lineHeight: 11, fontWeight: '700' },
  plansCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#ffc400',
    zIndex: 1,
  },
  plansCtaText: { color: '#242424', fontSize: 8.5, fontWeight: '800' },
  sheetText: { fontSize: 12.5, lineHeight: 19, marginBottom: Spacing.two },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    marginTop: Spacing.two,
  },
  sheetButtonText: { color: '#242424', fontSize: 13, fontWeight: '800' },
  faq: { gap: Spacing.two },
  faqItem: {
    borderRadius: Radius.field,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700' },
  faqAnswer: { fontSize: 12.5, lineHeight: 19 },
});
