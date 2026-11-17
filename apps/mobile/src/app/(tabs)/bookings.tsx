import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, Screen, StateView } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useMyBookings } from '@/features/bookings/use-my-bookings';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiBooking } from '@/lib/api/types';
import { formatDay, formatDayYear, formatMoney, formatMoneyCompact } from '@/lib/format';
import { useSession } from '@/lib/session/context';

type Tab = 'upcoming' | 'completed' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const UPCOMING = new Set(['PENDING', 'CONFIRMED', 'ONGOING']);

function tabOf(booking: ApiBooking): Tab {
  if (UPCOMING.has(booking.status)) return 'upcoming';
  return booking.status === 'COMPLETED' ? 'completed' : 'cancelled';
}

function pickupPhrase(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return 'Pick-up today';
  if (diff === 1) return 'Pick-up tomorrow';
  return `Pick-up ${formatDay(iso)}`;
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const list = useMyBookings('all');
  const { reload } = list;

  useFocusEffect(
    useCallback(() => {
      if (sessionStatus === 'signed-in') reload();
    }, [sessionStatus, reload]),
  );

  const buckets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? list.items.filter(
          (booking) =>
            booking.vehicle.name.toLowerCase().includes(needle) ||
            booking.code.toLowerCase().includes(needle),
        )
      : list.items;
    return {
      upcoming: matching
        .filter((booking) => tabOf(booking) === 'upcoming')
        .sort((a, b) => new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime()),
      completed: matching.filter((booking) => tabOf(booking) === 'completed'),
      cancelled: matching.filter((booking) => tabOf(booking) === 'cancelled'),
    };
  }, [list.items, query]);

  const rows = buckets[tab];
  const nextRide = tab === 'upcoming' ? (rows[0] ?? null) : null;
  const rest = nextRide ? rows.slice(1) : rows;

  if (sessionStatus === 'signed-out') {
    return (
      <Screen>
        <View style={styles.signedOut}>
          <StateView state="empty" message="Sign in to see the bookings on your account." />
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.head}>
        <ThemedText type="title">My bookings</ThemedText>
        <CircleButton
          icon={searchOpen ? 'close' : 'search'}
          label={searchOpen ? 'Close search' : 'Search bookings'}
          onPress={() => {
            setSearchOpen((open) => !open);
            if (searchOpen) setQuery('');
          }}
        />
      </View>

      {searchOpen ? (
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search by vehicle or booking code"
          autoFocus
          autoCapitalize="characters"
        />
      ) : null}

      <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
        {TABS.map((entry) => {
          const active = entry.key === tab;
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(entry.key)}
              style={[
                styles.segment,
                active && [styles.segmentActive, { backgroundColor: theme.backgroundElement }],
              ]}>
              <ThemedText
                type="smallBold"
                style={[styles.segmentText, { color: active ? theme.brand : theme.textSecondary }]}>
                {entry.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingRow
            booking={item}
            onPress={() => router.push({ pathname: '/booking/[code]', params: { code: item.code } })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={list.status === 'loading'} onRefresh={list.reload} />
        }
        ListHeaderComponent={
          nextRide ? (
            <View style={styles.nextBlock}>
              <NextRideCard
                booking={nextRide}
                onDirections={() => openDirections(nextRide)}
                onTicket={() =>
                  router.push({ pathname: '/booking/[code]', params: { code: nextRide.code } })
                }
              />
              {rest.length > 0 ? (
                <ThemedText type="label" themeColor="textSecondary">
                  Coming up
                </ThemedText>
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          nextRide ? undefined : list.status === 'loading' ? (
            <StateView state="loading" />
          ) : list.status === 'error' ? (
            <StateView state="error" message={list.error} onRetry={list.reload} />
          ) : (
            <StateView state="empty" message={EMPTY_COPY[tab]} />
          )
        }
        ListFooterComponent={list.status === 'paginating' ? <StateView state="loading" /> : undefined}
      />
    </Screen>
  );
}

const EMPTY_COPY: Record<Tab, string> = {
  upcoming: 'No rides booked yet. Explore the fleet and your next trip will appear here.',
  completed: 'Completed rides will collect here after you return the vehicle.',
  cancelled: 'Cancelled and uncollected bookings will show here.',
};

function NextRideCard({
  booking,
  onDirections,
  onTicket,
}: {
  booking: ApiBooking;
  onDirections: () => void;
  onTicket: () => void;
}) {
  const theme = useTheme();
  const image = resolveMediaUrl(booking.vehicle.image);

  return (
    <View style={[styles.nextCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.nextBand, { backgroundColor: theme.hero }]}>
        <View style={styles.bandLeft}>
          <View style={[styles.liveDot, { backgroundColor: theme.lime }]} />
          <ThemedText type="smallBold" style={[styles.bandLabel, { color: theme.onHero }]}>
            Your next ride
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.onHeroMuted, fontWeight: '600' }}>
          {pickupPhrase(booking.pickupAt)}
        </ThemedText>
      </View>

      <View style={styles.nextBody}>
        <View style={styles.nextHead}>
          {image ? (
            <Image
              source={{ uri: image }}
              alt={`${booking.vehicle.name} booking`}
              style={styles.nextThumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.nextThumb, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.nextTitle}>
            <ThemedText type="subtitle" numberOfLines={2}>
              {booking.vehicle.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Booking <ThemedText type="code">#{booking.code}</ThemedText>
            </ThemedText>
          </View>
          <View style={styles.nextAmount}>
            <ThemedText type="small" themeColor="textSecondary">
              {booking.paymentStatus === 'PAID' ? 'Paid' : 'Pay at pick-up'}
            </ThemedText>
            <ThemedText type="subtitle">{formatMoney(booking.amounts.totalAmount)}</ThemedText>
          </View>
        </View>

        <View style={[styles.nextFacts, { backgroundColor: theme.background }]}>
          <View style={styles.factRow}>
            <Ionicons name="calendar-outline" size={17} color={theme.brand} />
            <ThemedText type="small" style={styles.factText}>
              {formatDayYear(booking.pickupAt)} – {formatDayYear(booking.returnAt)}
            </ThemedText>
          </View>
          <View style={styles.factRow}>
            <Ionicons name="location-outline" size={17} color={theme.brand} />
            <ThemedText type="small" style={styles.factText}>
              {booking.pickupLocation.name}
            </ThemedText>
          </View>
        </View>

        <View style={styles.nextActions}>
          <Button
            title="Directions"
            variant="secondary"
            icon={<Ionicons name="navigate-outline" size={16} color={theme.text} />}
            onPress={onDirections}
            style={styles.nextAction}
          />
          <Button
            title="View ticket"
            icon={<Ionicons name="chevron-forward" size={16} color="#ffffff" />}
            onPress={onTicket}
            style={styles.nextAction}
          />
        </View>
      </View>
    </View>
  );
}

function BookingRow({ booking, onPress }: { booking: ApiBooking; onPress: () => void }) {
  const theme = useTheme();
  const image = resolveMediaUrl(booking.vehicle.image);
  const tab = tabOf(booking);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.vehicle.name}, booking ${booking.code}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        CardShadow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.94 : 1 },
      ]}>
      {image ? (
        <Image
          source={{ uri: image }}
          alt={`${booking.vehicle.name} booking`}
          style={styles.rowThumb}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.rowThumb, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>
          {booking.vehicle.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          #{booking.code} · {formatDay(booking.pickupAt)}
        </ThemedText>
      </View>
      <View style={styles.rowSide}>
        <Badge
          text={tab === 'upcoming' ? 'Upcoming' : tab === 'completed' ? 'Completed' : 'Cancelled'}
          tone={tab === 'upcoming' ? 'info' : tab === 'completed' ? 'neutral' : 'bad'}
        />
        <ThemedText type="subtitle" style={styles.rowAmount}>
          {formatMoneyCompact(booking.amounts.totalAmount)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  signedOut: { gap: Spacing.three },
  segmented: { flexDirection: 'row', padding: 5, borderRadius: Radius.pill, gap: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.pill },
  segmentActive: {
    shadowColor: '#0d2e1b',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  segmentText: { fontSize: 14 },
  list: { gap: Spacing.three, paddingBottom: Spacing.six },
  nextBlock: { gap: Spacing.three },
  nextCard: { borderRadius: Radius.card, overflow: 'hidden' },
  nextBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  bandLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bandLabel: { letterSpacing: 1.2, textTransform: 'uppercase' },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  nextBody: { padding: Spacing.three, gap: Spacing.three },
  nextHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  nextThumb: { width: 76, height: 64, borderRadius: Radius.field },
  nextTitle: { flex: 1, gap: 3 },
  nextAmount: { alignItems: 'flex-end', gap: 1 },
  nextFacts: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  factText: { fontWeight: '600' },
  nextActions: { flexDirection: 'row', gap: Spacing.two },
  nextAction: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  rowThumb: { width: 64, height: 64, borderRadius: Radius.field },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontSize: 15 },
  rowSide: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { fontSize: 16 },
});
