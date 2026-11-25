import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Button, Screen, StateView } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import { formatDateTime, formatMoney } from '@/lib/format';
import { readRecentlyViewed, type RecentRide } from '@/lib/recently-viewed';

export default function RecentlyViewedScreen() {
  const theme = useTheme();
  const [rides, setRides] = useState<RecentRide[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      readRecentlyViewed().then((entries) => {
        if (active) setRides(entries);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const empty = rides !== null && rides.length === 0;

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Recently viewed"
        subtitle="Rides you opened on this device"
        onBack={() => router.back()}
      />
      {rides === null ? (
        <StateView state="loading" />
      ) : empty ? (
        <StateView state="empty" message="Open a ride and it stays here for quick access." />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(ride) => ride.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <RecentRow ride={item} />}
          ListFooterComponent={
            <Button title="Browse rides" variant="secondary" onPress={() => router.push('/(tabs)/explore')} />
          }
        />
      )}
      {empty ? (
        <Button title="Browse rides" onPress={() => router.push('/(tabs)/explore')} />
      ) : null}
    </Screen>
  );
}

function RecentRow({ ride }: { ride: RecentRide }) {
  const theme = useTheme();
  const image = resolveMediaUrl(ride.image);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${ride.name}`}
      onPress={() => router.push({ pathname: '/vehicles/[slug]', params: { slug: ride.slug } })}
      style={({ pressed }) => [
        styles.row,
        CardShadow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.94 : 1 },
      ]}>
      {image ? (
        <Image
          source={{ uri: image }}
          alt={ride.name}
          style={styles.image}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {ride.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            {ride.city} · viewed {formatDateTime(ride.viewedAt)}
          </Text>
        </View>
        <ThemedText type="smallBold" style={{ color: theme.brandStrong }}>
          {formatMoney(ride.pricePerDay)}/day
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two, paddingBottom: Spacing.five },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.two,
    paddingRight: Spacing.three,
  },
  image: { width: 68, height: 68, borderRadius: Radius.field },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontSize: 11.5 },
});
