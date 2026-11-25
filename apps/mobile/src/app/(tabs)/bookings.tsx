import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Screen, StateView } from '@/components/ui';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { useMyBookings } from '@/features/bookings/use-my-bookings';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiBooking } from '@/lib/api/types';
import { formatDayYear, formatMoney, pluralize } from '@/lib/format';
import { useSession } from '@/lib/session/context';

const HEADER_PHOTO = require('../../../assets/images/home/bookings-header-road.png');

type Tab = 'upcoming' | 'completed' | 'cancelled';

const UPCOMING = new Set(['PENDING', 'CONFIRMED', 'ONGOING']);

function tabOf(booking: ApiBooking): Tab {
  if (UPCOMING.has(booking.status)) return 'upcoming';
  return booking.status === 'COMPLETED' ? 'completed' : 'cancelled';
}

function rentalLabel(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('scooter') || c.includes('motorcycle') || c.includes('bike')) return 'Bike Rental';
  if (c.includes('car')) return 'Car Rental';
  if (c.includes('van') || c.includes('tempo')) return 'Van Rental';
  return `${category.charAt(0).toUpperCase()}${category.slice(1)} Rental`;
}

function tripLine(booking: ApiBooking): string {
  return `${formatDayYear(booking.pickupAt)} – ${formatDayYear(booking.returnAt)} (${pluralize(booking.durationDays, 'Day')})`;
}

function refundTotal(booking: ApiBooking): number {
  return booking.payments
    .flatMap((payment) => payment.refunds ?? [])
    .reduce((sum, refund) => sum + refund.amount, 0);
}

function openDirections(booking: ApiBooking) {
  const query = `${booking.pickupLocation.name}, ${booking.pickupLocation.address}, ${booking.pickupLocation.city}`;
  void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
}

export default function BookingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [tab, setTab] = useState<Tab>('upcoming');
  const list = useMyBookings('all');
  const { reload } = list;

  useFocusEffect(
    useCallback(() => {
      if (sessionStatus === 'signed-in') reload();
    }, [sessionStatus, reload]),
  );

  const buckets = useMemo(() => {
    return {
      upcoming: list.items
        .filter((booking) => tabOf(booking) === 'upcoming')
        .sort((a, b) => new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime()),
      completed: list.items
        .filter((booking) => tabOf(booking) === 'completed')
        .sort((a, b) => new Date(b.returnAt).getTime() - new Date(a.returnAt).getTime()),
      cancelled: list.items
        .filter((booking) => tabOf(booking) === 'cancelled')
        .sort(
          (a, b) =>
            new Date(b.cancelledAt ?? b.updatedAt).getTime() -
            new Date(a.cancelledAt ?? a.updatedAt).getTime(),
        ),
    };
  }, [list.items]);

  const chips: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar', count: buckets.upcoming.length },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle', count: buckets.completed.length },
    { key: 'cancelled', label: 'Cancelled', icon: 'close-circle', count: buckets.cancelled.length },
  ];

  const openTicket = (booking: ApiBooking) =>
    router.push({ pathname: '/booking/[code]', params: { code: booking.code } });

  const rows = buckets[tab];

  if (sessionStatus === 'signed-out') {
    return (
      <Screen tabBarSpace={false}>
        <BrandLogo scale={0.82} style={styles.brand} />
        <ThemedText type="display" style={styles.pageTitle}>
          My Bookings
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.pageSub}>
          Manage all your vehicle rentals
        </ThemedText>
        <View style={styles.signedOut}>
          <StateView state="empty" message="Sign in to see the bookings on your account." />
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen tabBarSpace={false}>
      <View pointerEvents="none" style={styles.headerArt}>
        <Image source={HEADER_PHOTO} style={styles.headerArtPhoto} contentFit="cover" />
        <View style={styles.headerArtRim} />
      </View>

      <View style={styles.brandRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <BrandLogo scale={0.82} style={styles.brand} />
      </View>
      <ThemedText type="display" style={styles.pageTitle}>
        My Bookings
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary" style={styles.pageSub}>
        Manage all your vehicle rentals
      </ThemedText>

      <View style={styles.chips}>
        {chips.map((chip) => {
          const active = chip.key === tab;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(chip.key)}
              style={[
                styles.chip,
                active
                  ? [styles.chipActive, { backgroundColor: theme.brand }]
                  : [styles.chipIdle, { backgroundColor: theme.backgroundElement }],
              ]}>
              <Ionicons name={chip.icon} size={14} color={active ? theme.onBrand : theme.text} />
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={[styles.chipText, { color: active ? theme.onBrand : theme.text }]}>
                {`${chip.label} (${chip.count})`}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={list.status === 'loading'} onRefresh={reload} />
        }
        onScroll={() => list.loadMore()}
        scrollEventThrottle={200}>
        {list.status === 'error' && rows.length === 0 ? (
          <StateView state="error" message={list.error} onRetry={reload} />
        ) : rows.length === 0 && list.status !== 'loading' ? (
          <StateView state="empty" message={EMPTY_COPY[tab]} />
        ) : (
          rows.map((booking) =>
            tab === 'upcoming' ? (
              <UpcomingCard
                key={booking.id}
                booking={booking}
                onTicket={() => openTicket(booking)}
                onDirections={() => openDirections(booking)}
              />
            ) : tab === 'completed' ? (
              <CompletedCard
                key={booking.id}
                booking={booking}
                onOpen={() => openTicket(booking)}
              />
            ) : (
              <CancelledCard
                key={booking.id}
                booking={booking}
                onOpen={() => openTicket(booking)}
                onRefunds={() => router.push('/payments')}
              />
            ),
          )
        )}

        {tab === 'upcoming' && buckets.completed.length > 0 ? (
          <View style={styles.pastBlock}>
            <View style={styles.pastHead}>
              <Ionicons name="time" size={18} color={theme.accentGold} />
              <ThemedText type="subtitle" style={styles.pastTitle}>
                Past Bookings
              </ThemedText>
              <View style={[styles.pastRule, { backgroundColor: theme.line }]} />
            </View>
            {buckets.completed.map((booking) => (
              <PastCard key={booking.id} booking={booking} onOpen={() => openTicket(booking)} />
            ))}
          </View>
        ) : null}

        {list.status === 'paginating' ? <StateView state="loading" /> : null}
      </ScrollView>
    </Screen>
  );
}

const EMPTY_COPY: Record<Tab, string> = {
  upcoming: 'No rides booked yet. Explore the fleet and your next trip will appear here.',
  completed: 'Completed rides will collect here after you return the vehicle.',
  cancelled: 'Cancelled and uncollected bookings will show here.',
};

function StatusPill({ booking }: { booking: ApiBooking }) {
  const theme = useTheme();
  const tab = tabOf(booking);
  const icon =
    tab === 'upcoming' ? 'calendar' : tab === 'completed' ? 'checkmark-circle' : 'close-circle';
  const label = tab === 'upcoming' ? 'Upcoming' : tab === 'completed' ? 'Completed' : 'Cancelled';
  const good = tab !== 'cancelled';
  return (
    <View style={[styles.pill, { backgroundColor: good ? theme.successSoft : '#fdecea' }]}>
      <Ionicons name={icon} size={8} color={good ? theme.success : theme.danger} />
      <ThemedText
        style={[styles.pillText, { color: good ? theme.success : theme.danger }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.9}>
        {label}
      </ThemedText>
    </View>
  );
}

function Thumb({ booking, width, height }: { booking: ApiBooking; width: number; height: number }) {
  const theme = useTheme();
  const image = resolveMediaUrl(booking.vehicle.image);
  return (
    <View style={[styles.thumb, { width, height, backgroundColor: theme.background }]}>
      {image ? (
        <Image
          source={{ uri: image }}
          alt={`${booking.vehicle.name} booking`}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

function Amount({ booking }: { booking: ApiBooking }) {
  const theme = useTheme();
  return (
    <View style={styles.amountCol}>
      <ThemedText style={[styles.amount, { color: theme.text }]}>
        {formatMoney(booking.amounts.totalAmount)}
      </ThemedText>
      <ThemedText style={[styles.amountNote, { color: theme.textSecondary }]}>
        Total Amount
      </ThemedText>
    </View>
  );
}

function Facts({ booking }: { booking: ApiBooking }) {
  const theme = useTheme();
  return (
    <View style={styles.facts}>
      <View style={styles.factRow}>
        <Ionicons name="calendar" size={9} color={theme.text} style={styles.factIcon} />
        <ThemedText
          style={[styles.factText, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}>
          {tripLine(booking)}
        </ThemedText>
      </View>
      <View style={styles.factRow}>
        <Ionicons name="location" size={9} color={theme.textSecondary} style={styles.factIcon} />
        <ThemedText style={[styles.factMuted, { color: theme.textSecondary }]} numberOfLines={1}>
          {booking.pickupLocation.city}
        </ThemedText>
      </View>
    </View>
  );
}

function UpcomingCard({
  booking,
  onTicket,
  onDirections,
}: {
  booking: ApiBooking;
  onTicket: () => void;
  onDirections: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        CardShadow,
        { backgroundColor: theme.backgroundElement, borderColor: '#f3dc9a' },
      ]}>
      <View style={styles.cardTop}>
        <Thumb booking={booking} width={104} height={68} />
        <View style={styles.cardCentre}>
          <ThemedText
            style={[styles.name, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {booking.vehicle.name}
          </ThemedText>
          <ThemedText style={[styles.kind, { color: theme.textSecondary }]}>
            {rentalLabel(booking.vehicle.category)}
          </ThemedText>
          <Facts booking={booking} />
        </View>
        <View style={styles.cardSide}>
          <StatusPill booking={booking} />
          <Amount booking={booking} />
        </View>
      </View>
      <View style={[styles.strip, { backgroundColor: '#faf4e8' }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onTicket}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="ticket" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            View Ticket
          </ThemedText>
        </Pressable>
        <View style={[styles.stripDivider, { backgroundColor: theme.line }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onDirections}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="location" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            Get Directions
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onTicket}
          style={({ pressed }) => [
            styles.stripPill,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            style={[styles.stripPillText, { color: theme.onBrand }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}>
            Manage Booking
          </ThemedText>
          <Ionicons name="arrow-forward" size={10} color={theme.onBrand} />
        </Pressable>
      </View>
    </View>
  );
}

function PastCard({ booking, onOpen }: { booking: ApiBooking; onOpen: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardTop}>
        <Thumb booking={booking} width={96} height={66} />
        <View style={styles.cardCentre}>
          <ThemedText
            style={[styles.nameSm, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {booking.vehicle.name}
          </ThemedText>
          <ThemedText style={[styles.kind, { color: theme.textSecondary }]}>
            {rentalLabel(booking.vehicle.category)}
          </ThemedText>
          <Facts booking={booking} />
        </View>
        <View style={styles.cardSide}>
          <StatusPill booking={booking} />
          <Amount booking={booking} />
        </View>
      </View>
      <View style={[styles.strip, { backgroundColor: '#faf4e8' }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="information-circle-outline" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            View Details
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.stripSegRight, pressed && styles.pressed]}>
          <Ionicons name="star-outline" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            Rate Your Ride
          </ThemedText>
          <Ionicons name="chevron-forward" size={10} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function CompletedCard({ booking, onOpen }: { booking: ApiBooking; onOpen: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardTop}>
        <View style={styles.leftCol}>
          <StatusPill booking={booking} />
          <Thumb booking={booking} width={96} height={66} />
        </View>
        <View style={styles.cardCentre}>
          <ThemedText
            style={[styles.nameSm, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {booking.vehicle.name}
          </ThemedText>
          <ThemedText style={[styles.kind, { color: theme.textSecondary }]}>
            {rentalLabel(booking.vehicle.category)}
          </ThemedText>
          <Facts booking={booking} />
        </View>
        <Amount booking={booking} />
      </View>
      <View style={[styles.strip, { backgroundColor: '#faf4e8' }]}>
        <View style={styles.stripSeg}>
          <Ionicons
            name="star"
            size={11}
            color={booking.review ? theme.accentGold : theme.lineStrong}
          />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {booking.review ? `You rated ${booking.review.rating.toFixed(1)}` : 'Not rated yet'}
          </ThemedText>
        </View>
        <View style={[styles.stripDivider, { backgroundColor: theme.line }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="document-text-outline" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            View Details
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.stripPill,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="star-outline" size={10} color={theme.onBrand} />
          <ThemedText style={[styles.stripPillText, { color: theme.onBrand }]}>
            Rate Again
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function CancelledCard({
  booking,
  onOpen,
  onRefunds,
}: {
  booking: ApiBooking;
  onOpen: () => void;
  onRefunds: () => void;
}) {
  const theme = useTheme();
  const refunded = refundTotal(booking);
  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardTop}>
        <View style={styles.leftCol}>
          <StatusPill booking={booking} />
          <Thumb booking={booking} width={96} height={66} />
        </View>
        <View style={styles.cardCentre}>
          <ThemedText
            style={[styles.nameSm, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {booking.vehicle.name}
          </ThemedText>
          <ThemedText style={[styles.kind, { color: theme.textSecondary }]}>
            {rentalLabel(booking.vehicle.category)}
          </ThemedText>
          <Facts booking={booking} />
        </View>
        <Amount booking={booking} />
      </View>
      {booking.cancelledAt ? (
        <View style={[styles.notice, { backgroundColor: '#fdecea' }]}>
          <Ionicons name="information-circle" size={11} color={theme.danger} />
          <ThemedText style={[styles.noticeText, { color: theme.text }]} numberOfLines={1}>
            {`This booking was cancelled on ${formatDayYear(booking.cancelledAt)}.`}
          </ThemedText>
        </View>
      ) : null}
      <View style={[styles.strip, { backgroundColor: '#faf4e8' }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="document-text-outline" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            View Details
          </ThemedText>
        </Pressable>
        <View style={[styles.stripDivider, { backgroundColor: theme.line }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onRefunds}
          style={({ pressed }) => [styles.stripSeg, pressed && styles.pressed]}>
          <Ionicons name="refresh" size={11} color={theme.text} />
          <ThemedText
            style={[styles.stripText, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            Refund Status
          </ThemedText>
        </Pressable>
        <View
          style={[
            styles.refundBox,
            { backgroundColor: refunded > 0 ? theme.successSoft : theme.backgroundSelected },
          ]}>
          <Ionicons
            name={refunded > 0 ? 'checkmark-circle' : 'help-circle-outline'}
            size={10}
            color={refunded > 0 ? theme.success : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.refundText,
              { color: refunded > 0 ? theme.success : theme.textSecondary },
            ]}>
            {refunded > 0 ? formatMoney(refunded) : 'No refund'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerArt: {
    position: 'absolute',
    top: -36,
    right: -18,
    width: 205,
    height: 148,
    borderBottomLeftRadius: 205,
    overflow: 'hidden',
    backgroundColor: '#f6d78b',
  },
  headerArtPhoto: { width: '100%', height: '100%' },
  headerArtRim: {
    position: 'absolute',
    top: -118,
    left: -66,
    width: 245,
    height: 190,
    borderRadius: 110,
    backgroundColor: '#ffc400',
    borderWidth: 3,
    borderColor: 'rgba(255,249,237,0.85)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {
    width: 30,
    height: 30,
    marginLeft: -6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { alignSelf: 'flex-start', flexShrink: 1 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 },
  pageSub: { fontSize: 14, marginTop: 1 },
  signedOut: { gap: Spacing.three, marginTop: Spacing.three },
  chips: { flexDirection: 'row', gap: 7, marginTop: 14 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  chipActive: {
    shadowColor: '#242424',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  chipIdle: {
    borderWidth: 1,
    borderColor: '#f0ead8',
    shadowColor: '#242424',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  chipText: { fontSize: 12 },
  list: { gap: 12, paddingTop: 14, paddingBottom: BottomTabInset + Spacing.four },
  card: { borderRadius: 16, borderWidth: 1, borderColor: 'transparent', padding: 7, gap: 4 },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardCentre: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'flex-start' },
  cardSide: { alignItems: 'flex-end', gap: 10, flexShrink: 0 },
  leftCol: { gap: 4, alignItems: 'flex-start', flexShrink: 0 },
  thumb: { borderRadius: 10, overflow: 'hidden' },
  name: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  nameSm: { fontSize: 10.5, lineHeight: 13, fontWeight: '800' },
  kind: { fontSize: 8, lineHeight: 10, fontWeight: '600' },
  facts: { gap: 3 },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factIcon: { width: 10 },
  factText: { fontSize: 8, lineHeight: 11, fontWeight: '700', flexShrink: 1 },
  factMuted: { fontSize: 8, lineHeight: 11, fontWeight: '600', flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  pillText: { fontSize: 7, lineHeight: 10, fontWeight: '700' },
  amountCol: { alignItems: 'flex-end', gap: 1 },
  amount: { fontSize: 12, lineHeight: 15, fontWeight: '800', letterSpacing: -0.3 },
  amountNote: { fontSize: 7, lineHeight: 9, fontWeight: '600' },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingLeft: 6,
    paddingRight: 4,
    minHeight: 32,
    gap: 3,
  },
  stripSeg: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  stripSegRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    justifyContent: 'flex-end',
  },
  stripDivider: { width: 1, height: 14 },
  stripText: { fontSize: 8, lineHeight: 11, fontWeight: '700', flexShrink: 1 },
  stripPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stripPillText: { fontSize: 8, lineHeight: 11, fontWeight: '800', flexShrink: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noticeText: { fontSize: 8, lineHeight: 11, fontWeight: '600', flex: 1 },
  refundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  refundText: { fontSize: 8, lineHeight: 11, fontWeight: '800' },
  pastBlock: { gap: 10, marginTop: 6 },
  pastHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pastTitle: { fontSize: 17, fontWeight: '800' },
  pastRule: { flex: 1, height: 1 },
  pressed: { opacity: 0.85 },
});
