import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuRow, PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { catalogueApi } from '@/lib/api/endpoints';
import { formatMoney } from '@/lib/format';
import { useAsyncList } from '@/lib/use-async';

const WHATSAPP_TEXT = 'Hi SavariGo, I would like to rent a van. My dates and group size are:';

/**
 * The home screen's Van Rental tile lands here. No van is in the catalogue, so
 * the page says exactly that and points at what the hubs really have today.
 */
export default function VanRentalScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locations = useAsyncList(() => catalogueApi.locations());
  const fleet = useAsyncList(() => catalogueApi.vehicles({ category: 'car', limit: 100 }).then((page) => page.items));

  const cars = fleet.items.filter((vehicle) => vehicle.status === 'AVAILABLE');
  const carFrom = cars.reduce<number | null>(
    (best, vehicle) => (best === null || vehicle.pricePerDay < best ? vehicle.pricePerDay : best),
    null,
  );

  const phone = locations.items.find((entry) => entry.isActive && entry.phone)?.phone ?? null;
  const digits = phone ? phone.replace(/\D/g, '') : null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <PageHeader title="Van rental" subtitle="Group trips and cargo" onBack={() => router.back()} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, CardShadow]}>
            <LinearGradient
              colors={['#3a3a3a', '#1d1d1d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name="bus"
              size={150}
              color="rgba(255,255,255,0.10)"
              style={styles.heroWatermark}
            />
            <ThemedText type="display" style={styles.heroTitle}>
              {'Vans aren\u2019t\nlisted yet.'}
            </ThemedText>
            <ThemedText type="small" style={styles.heroIntro}>
              SavariGo's hubs rent scooters, motorcycles and cars. When a partner lists a van it
              will show up here — we don't show a placeholder fleet.
            </ThemedText>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.line },
            ]}>
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, { backgroundColor: theme.brandSoft }]}>
                <Ionicons name="car-sport" size={18} color={theme.brandStrong} />
              </View>
              <View style={styles.cardText}>
                <ThemedText type="smallBold">What the hubs have today</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {fleet.status === 'loading'
                    ? 'Checking the fleet…'
                    : cars.length === 0
                      ? 'No cars are open at the hubs right now.'
                      : `${cars.length} car${cars.length === 1 ? '' : 's'} available${
                          carFrom !== null ? ` · from ${formatMoney(carFrom)}/day` : ''
                        }`}
                </ThemedText>
              </View>
            </View>
            <Button
              title="Browse cars"
              icon={<Ionicons name="car-outline" size={16} color={theme.onBrand} />}
              onPress={() =>
                router.push({ pathname: '/(tabs)/explore', params: { category: 'car' } })
              }
            />
          </View>

          {digits ? (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.backgroundElement, borderColor: theme.line },
              ]}>
              <ThemedText type="smallBold">Need a van for a group trip?</ThemedText>
              <MenuRow
                icon="call-outline"
                label="Call the hub"
                meta={phone ?? undefined}
                onPress={() => void Linking.openURL(`tel:+${digits}`)}
              />
              <MenuRow
                icon="logo-whatsapp"
                label="WhatsApp the hub"
                last
                onPress={() =>
                  void Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_TEXT)}`)
                }
              />
            </View>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            The hub will tell you whether a van and driver can be arranged for your dates before
            anything is charged.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  body: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#242424',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: 8,
  },
  heroWatermark: { position: 'absolute', right: -18, bottom: -22 },
  heroTitle: { color: '#ffffff' },
  heroIntro: { color: 'rgba(255,255,255,0.82)', lineHeight: 18, maxWidth: '85%' },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  note: { lineHeight: 18, paddingHorizontal: 2 },
});
