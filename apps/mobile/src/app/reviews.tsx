import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen, StateView } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { catalogueApi } from '@/lib/api/endpoints';
import { resolveMediaUrl } from '@/lib/api/config';
import type { ApiVehicle } from '@/lib/api/types';
import { formatDayYear, formatMoney } from '@/lib/format';
import { useAsyncResource } from '@/lib/use-async';

type PublishedReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string;
  createdAt: string;
  vehicleName: string;
  slug: string;
};

type ReviewsData = {
  rides: ApiVehicle[];
  reviews: PublishedReview[];
  average: number;
  total: number;
};

export default function CustomerReviewsScreen() {
  const theme = useTheme();
  const data = useAsyncResource<ReviewsData>('customer-reviews', async () => {
    const page = await catalogueApi.vehicles({ limit: 100, sort: 'rating' });
    const rides = page.items
      .filter((vehicle) => vehicle.rating > 0)
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

    // The catalogue carries the rating totals; the per-ride endpoint has the
    // written reviews, so only the top rides are asked for them.
    const top = rides.slice(0, 5);
    const settled = await Promise.allSettled(
      top.map((vehicle) => catalogueApi.reviews(vehicle.slug, { limit: 3 })),
    );
    const reviews = settled
      .flatMap((result, index) =>
        result.status === 'fulfilled'
          ? result.value.data.map((review) => ({
              id: review.id,
              rating: review.rating,
              title: review.title,
              comment: review.comment,
              customerName: review.customerName,
              createdAt: review.createdAt,
              vehicleName: top[index].name,
              slug: top[index].slug,
            }))
          : [],
      )
      .filter((review) => review.comment || review.title)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = rides.reduce((sum, vehicle) => sum + vehicle.reviewCount, 0);
    const weighted = rides.reduce((sum, vehicle) => sum + vehicle.rating * vehicle.reviewCount, 0);
    return { rides, reviews, total, average: total > 0 ? weighted / total : 0 };
  });

  if (data.status === 'loading') {
    return (
      <Screen tabBarSpace={false}>
        <PageHeader title="Customer reviews" onBack={() => router.back()} />
        <StateView state="loading" />
      </Screen>
    );
  }

  if (data.status === 'error' || !data.data) {
    return (
      <Screen tabBarSpace={false}>
        <PageHeader title="Customer reviews" onBack={() => router.back()} />
        <StateView state="error" message={data.error} onRetry={data.reload} />
      </Screen>
    );
  }

  const { rides, reviews, average, total } = data.data;

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Customer reviews"
        subtitle="Ratings riders gave after a trip"
        onBack={() => router.back()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={data.reload} tintColor={theme.brandStrong} />
        }>
        <View style={[styles.summary, CardShadow, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.summaryScore}>
            <Text style={[styles.score, { color: theme.text }]}>
              {average > 0 ? average.toFixed(1) : '—'}
            </Text>
            <Stars value={average} size={14} />
            <ThemedText type="small" themeColor="textSecondary">
              {total > 0 ? `${total} ride reviews` : 'No reviews yet'}
            </ThemedText>
          </View>
          <Text style={[styles.summaryNote, { color: theme.textSecondary }]}>
            Ratings are collected from riders after a ride is returned and are shown on each
            vehicle's page.
          </Text>
        </View>

        {reviews.length > 0 ? (
          <View style={styles.block}>
            <ThemedText type="label" themeColor="textSecondary">
              Published reviews
            </ThemedText>
            {reviews.map((review) => (
              <View
                key={review.id}
                style={[styles.reviewCard, CardShadow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.reviewHead}>
                  <ThemedText type="smallBold">{review.customerName}</ThemedText>
                  <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>
                    {formatDayYear(review.createdAt)}
                  </Text>
                </View>
                <Stars value={review.rating} size={12} />
                {review.title ? (
                  <Text style={[styles.reviewTitle, { color: theme.text }]}>{review.title}</Text>
                ) : null}
                {review.comment ? (
                  <Text style={[styles.reviewBody, { color: theme.textSecondary }]}>
                    {review.comment}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/vehicles/[slug]', params: { slug: review.slug } })
                  }>
                  <Text style={[styles.reviewRide, { color: theme.brandStrong }]}>
                    {review.vehicleName} →
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No written reviews are published yet. The rating on each ride still comes from riders
            who completed a booking.
          </ThemedText>
        )}

        <View style={styles.block}>
          <ThemedText type="label" themeColor="textSecondary">
            Ratings by ride
          </ThemedText>
          {rides.map((vehicle) => (
            <RideRatingRow key={vehicle.id} vehicle={vehicle} />
          ))}
        </View>

        <Button title="Explore rides" onPress={() => router.push('/(tabs)/explore')} />
      </ScrollView>
    </Screen>
  );
}

function Stars({ value, size }: { value: number; size: number }) {
  const theme = useTheme();
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Ionicons
          key={step}
          name={value >= step - 0.25 ? 'star' : value >= step - 0.75 ? 'star-half' : 'star-outline'}
          size={size}
          color={theme.brandStrong}
        />
      ))}
    </View>
  );
}

function RideRatingRow({ vehicle }: { vehicle: ApiVehicle }) {
  const theme = useTheme();
  const image = resolveMediaUrl(vehicle.primaryImage?.url);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/vehicles/[slug]', params: { slug: vehicle.slug } })}
      style={({ pressed }) => [
        styles.rideRow,
        CardShadow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.94 : 1 },
      ]}>
      {image ? (
        <Image
          source={{ uri: image }}
          alt={vehicle.name}
          style={styles.rideImage}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.rideImage, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.rideText}>
        <Text style={[styles.rideName, { color: theme.text }]} numberOfLines={1}>
          {vehicle.name}
        </Text>
        <View style={styles.rideMeta}>
          <Ionicons name="star" size={11} color={theme.brandStrong} />
          <Text style={[styles.rideRating, { color: theme.text }]}>{vehicle.rating.toFixed(1)}</Text>
          <Text style={[styles.rideCount, { color: theme.textSecondary }]}>
            ({vehicle.reviewCount})
          </Text>
          <Text style={[styles.rideCount, { color: theme.textSecondary }]}>·</Text>
          <Text style={[styles.rideCount, { color: theme.textSecondary }]}>
            {formatMoney(vehicle.pricePerDay)}/day
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: Spacing.five },
  summary: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  summaryScore: { alignItems: 'center', gap: 4 },
  score: { fontSize: 40, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 2 },
  summaryNote: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  block: { gap: Spacing.two },
  reviewCard: { borderRadius: Radius.card, padding: Spacing.three, gap: 6 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  reviewDate: { fontSize: 11 },
  reviewTitle: { fontSize: 14, fontWeight: '800' },
  reviewBody: { fontSize: 12.5, lineHeight: 18 },
  reviewRide: { fontSize: 12, fontWeight: '700', paddingTop: 2 },
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
    padding: Spacing.two,
    paddingRight: Spacing.three,
  },
  rideImage: { width: 54, height: 54, borderRadius: Radius.field },
  rideText: { flex: 1, gap: 3 },
  rideName: { fontSize: 14, fontWeight: '800' },
  rideMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  rideRating: { fontSize: 12, fontWeight: '800' },
  rideCount: { fontSize: 11 },
});
