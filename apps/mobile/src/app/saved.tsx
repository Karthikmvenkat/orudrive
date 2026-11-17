import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Button, Screen, StateView } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { RideCard } from '@/features/catalogue/ride-card';
import { catalogueApi } from '@/lib/api/endpoints';
import type { ApiVehicle } from '@/lib/api/types';
import { useFavorites } from '@/lib/favorites';
import { useAsyncResource } from '@/lib/use-async';

export default function SavedVehiclesScreen() {
  const router = useRouter();
  const { ids } = useFavorites();
  const key = useMemo(() => [...ids].sort().join(','), [ids]);

  const saved = useAsyncResource<ApiVehicle[]>(key, async () => {
    const found = await Promise.all(
      [...ids].map((id) => catalogueApi.vehicle(id).catch(() => null)),
    );
    return found.filter((vehicle): vehicle is ApiVehicle => vehicle !== null);
  });

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Saved vehicles"
        subtitle="Your shortlist lives on this device"
        onBack={() => router.back()}
      />
      <FlatList
        data={saved.data ?? []}
        keyExtractor={(vehicle) => vehicle.id}
        renderItem={({ item }) => (
          <RideCard
            vehicle={item}
            onPress={() => router.push({ pathname: '/vehicles/[slug]', params: { slug: item.slug } })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          saved.status === 'loading' ? (
            <StateView state="loading" />
          ) : saved.status === 'error' ? (
            <StateView state="error" message={saved.error} onRetry={saved.reload} />
          ) : (
            <StateView state="empty" message="Tap the heart on any ride to keep it here." />
          )
        }
        ListFooterComponent={
          saved.status === 'ready' && (saved.data ?? []).length > 0 ? (
            <Button title="Explore more rides" variant="secondary" onPress={() => router.push('/(tabs)/explore')} />
          ) : saved.status !== 'loading' ? (
            <Button title="Explore rides" onPress={() => router.push('/(tabs)/explore')} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three, paddingBottom: Spacing.five },
});
