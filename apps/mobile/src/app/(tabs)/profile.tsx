import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MenuRow, Sheet } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen } from '@/components/ui';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { useMyBookings } from '@/features/bookings/use-my-bookings';
import { useTheme } from '@/hooks/use-theme';
import { bookingApi, catalogueApi, paymentApi } from '@/lib/api/endpoints';
import { formatDay, formatMoney, initials } from '@/lib/format';
import { useFavorites } from '@/lib/favorites';
import { useSession } from '@/lib/session/context';
import { useAsyncList, useAsyncResource } from '@/lib/use-async';

const UPCOMING = new Set(['PENDING', 'CONFIRMED', 'ONGOING']);
const SUPPORT_EMAIL = 'support@savarigo.com';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, user, me, signOut } = useSession();
  const favorites = useFavorites();
  const bookings = useMyBookings('all');
  const payments = useAsyncResource('payments', () => paymentApi.history({ limit: 100 }));
  const coupons = useAsyncList(() => bookingApi.coupons());
  const locations = useAsyncList(() => catalogueApi.locations());

  const [languageOpen, setLanguageOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const reloadBookings = bookings.reload;
  const reloadPayments = payments.reload;
  useFocusEffect(
    useCallback(() => {
      if (status === 'signed-in') {
        reloadBookings();
        reloadPayments();
      }
    }, [status, reloadBookings, reloadPayments]),
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = bookings.items.filter((booking) => UPCOMING.has(booking.status));
    const next = upcoming
      .filter((booking) => new Date(booking.pickupAt).getTime() >= now)
      .sort((a, b) => new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime())[0];
    const paid = (payments.data?.data ?? []).filter((payment) => payment.status === 'PAID');
    const paidBookings = new Set(paid.map((payment) => payment.bookingId ?? payment.id)).size;
    return {
      upcoming: upcoming.length,
      nextPickup: next ? formatDay(next.pickupAt) : null,
      completed: bookings.items.filter((booking) => booking.status === 'COMPLETED').length,
      spent: paid.reduce((sum, payment) => sum + payment.amount, 0),
      paidBookings,
    };
  }, [bookings.items, payments.data]);

  const maxPercent = useMemo(
    () =>
      coupons.items
        .filter((coupon) => coupon.type === 'PERCENT')
        .reduce((best, coupon) => Math.max(best, coupon.value), 0),
    [coupons.items],
  );

  const supportPhone = locations.items.find((entry) => entry.isActive && entry.phone)?.phone ?? null;

  if (status !== 'signed-in') {
    return (
      <Screen tabBarSpace={false}>
        <ThemedText type="title">Account</ThemedText>
        <Card>
          <ThemedText type="body">
            Sign in to see the bookings, profile and payment history on your account.
          </ThemedText>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} />
          <Button
            title="Create an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/register')}
          />
        </Card>
      </Screen>
    );
  }

  const name = me?.customerProfile?.fullName ?? user?.fullName ?? 'SavariGo rider';
  const hasLicence = Boolean(me?.customerProfile?.licenceNumber);

  return (
    <Screen tabBarSpace={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <ThemedText type="title">Account</ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View and edit profile"
          onPress={() => router.push('/details')}
          style={({ pressed }) => [
            styles.profileCard,
            CardShadow,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.94 : 1 },
          ]}>
          <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
            <ThemedText style={[styles.avatarText, { color: theme.brandStrong }]}>
              {initials(name)}
            </ThemedText>
          </View>
          <View style={styles.profileText}>
            <ThemedText style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
              {name}
            </ThemedText>
            <View style={styles.profileLink}>
              <ThemedText style={[styles.profileLinkText, { color: theme.accentGold }]}>
                View and edit profile
              </ThemedText>
              <Ionicons name="arrow-forward" size={14} color={theme.accentGold} />
            </View>
          </View>
        </Pressable>

        <View style={styles.statGrid}>
          <StatTile
            icon="calendar-outline"
            value={String(stats.upcoming)}
            label="Upcoming rides"
            note={stats.nextPickup ? `Next pick-up ${stats.nextPickup}` : 'Nothing booked yet'}
          />
          <StatTile
            icon="checkmark-circle-outline"
            value={String(stats.completed)}
            label="Completed rides"
            note="Across all your trips"
          />
          <StatTile
            icon="heart-outline"
            value={String(favorites.count)}
            label="Saved vehicles"
            note="Your shortlist"
          />
          <StatTile
            icon="card-outline"
            value={formatMoney(stats.spent)}
            label="Total spent"
            note={
              stats.paidBookings > 0
                ? `Across ${stats.paidBookings} booking${stats.paidBookings === 1 ? '' : 's'}`
                : 'Nothing paid yet'
            }
          />
        </View>

        <ThemedText style={[styles.groupTitle, { color: theme.text }]}>Rides</ThemedText>
        <View style={[styles.menuCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
          <MenuRow icon="calendar-outline" label="My Bookings" onPress={() => router.push('/(tabs)/bookings')} />
          <MenuRow icon="heart-outline" label="Saved vehicles" onPress={() => router.push('/saved')} last />
        </View>

        <ThemedText style={[styles.groupTitle, { color: theme.text }]}>Account</ThemedText>
        <View style={[styles.menuCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
          <MenuRow icon="person-outline" label="Personal details" onPress={() => router.push('/details')} />
          <MenuRow
            icon="id-card-outline"
            label="Driving licence & ID"
            meta={hasLicence ? 'On file' : undefined}
            onPress={() => router.push('/licence')}
          />
          <MenuRow icon="card-outline" label="Payments & refunds" onPress={() => router.push('/payments')} />
          <MenuRow
            icon="pricetag-outline"
            label="Offers & coupons"
            meta={maxPercent > 0 ? `Up to ${maxPercent}% off` : undefined}
            onPress={() => router.push('/offers')}
          />
          <MenuRow icon="car-outline" label="List your vehicle" onPress={() => setVehicleOpen(true)} />
          <MenuRow icon="globe-outline" label="Language" meta="English" onPress={() => setLanguageOpen(true)} />
          <MenuRow icon="help-circle-outline" label="Help & support" onPress={() => setSupportOpen(true)} last />
        </View>

        <View style={[styles.supportCard, { backgroundColor: theme.hero }]}>
          <ThemedText type="heading" style={{ color: theme.onHero }}>
            Need a hand?
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.onHeroMuted }}>
            Questions about a ride, deposit or pick-up? Write to the team or call the hub.
          </ThemedText>
          <View style={styles.supportActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              style={({ pressed }) => [
                styles.supportButton,
                styles.supportPrimary,
                { opacity: pressed ? 0.9 : 1 },
              ]}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.hero} />
              <ThemedText type="smallBold" style={{ color: theme.hero }}>
                Email us
              </ThemedText>
            </Pressable>
            {supportPhone ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void Linking.openURL(`tel:${supportPhone}`)}
                style={({ pressed }) => [
                  styles.supportButton,
                  { borderColor: 'rgba(255,255,255,0.4)', opacity: pressed ? 0.9 : 1 },
                ]}>
                <Ionicons name="call-outline" size={18} color={theme.lime} />
                <ThemedText type="smallBold" style={{ color: theme.onHero }}>
                  Call hub
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }) => [
            styles.signOut,
            CardShadow,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.94 : 1 },
          ]}>
          <Ionicons name="log-out-outline" size={19} color={theme.danger} />
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Sign out
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Sheet
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title="Language"
        subtitle="The app is in English today">
        <View style={[styles.languageRow, { borderColor: theme.brand, backgroundColor: theme.brandSoft }]}>
          <ThemedText type="smallBold">English</ThemedText>
          <Ionicons name="checkmark-circle" size={20} color={theme.brandStrong} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Hindi and Tamil are not available in the app yet. Hub staff can help in person.
        </ThemedText>
      </Sheet>

      <Sheet
        visible={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title="List your vehicle"
        subtitle="Put a car, scooter or bike on rent"
        footer={
          <Button
            title={`Email ${SUPPORT_EMAIL}`}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=List%20my%20vehicle`)}
          />
        }>
        <ThemedText type="body">
          Vehicle owners can join SavariGo by writing to the team. The onboarding team verifies the
          papers, sets the day rate and lists the vehicle at your hub.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Include the vehicle model, year, city and a photo in your email.
        </ThemedText>
      </Sheet>

      <Sheet
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Help & support"
        subtitle="We usually reply within one working day"
        footer={
          <Button
            title={`Email ${SUPPORT_EMAIL}`}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        }>
        <ThemedText type="body">
          Write to {SUPPORT_EMAIL} with your booking code if you need help with a ride, a deposit
          refund or a change of plan.
        </ThemedText>
        {supportPhone ? (
          <ThemedText type="small" themeColor="textSecondary">
            Or call the hub on {supportPhone} during opening hours.
          </ThemedText>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function StatTile({
  icon,
  value,
  label,
  note,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  note: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icon} size={22} color={theme.accentGold} />
      <ThemedText style={[styles.statValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.statNote, { color: theme.textSecondary }]} numberOfLines={1}>
        {note}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  profileText: { flex: 1, gap: 4 },
  profileName: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  profileLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  profileLinkText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  groupTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: 3,
  },
  statValue: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  statNote: { fontSize: 13, lineHeight: 17 },
  menuCard: { borderRadius: Radius.card, paddingHorizontal: Spacing.three },
  supportCard: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  supportActions: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.one },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 13,
  },
  supportPrimary: { backgroundColor: '#fff1c2' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.card,
    paddingVertical: Spacing.three,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.field,
    padding: Spacing.three,
  },
});
