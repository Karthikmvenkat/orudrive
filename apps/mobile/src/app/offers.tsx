import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Notice, PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Screen, StateView } from '@/components/ui';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bookingApi } from '@/lib/api/endpoints';
import type { ApiCoupon } from '@/lib/api/types';
import { formatDayYear, formatMoney } from '@/lib/format';
import { useAsyncList } from '@/lib/use-async';

export default function OffersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const coupons = useAsyncList<ApiCoupon>(() => bookingApi.coupons());
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(code);
  };

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Offers & coupons"
        subtitle="Copy a code and apply it at checkout"
        onBack={() => router.back()}
      />
      <FlatList
        data={coupons.items}
        keyExtractor={(coupon) => coupon.id}
        renderItem={({ item }) => (
          <CouponCard
            coupon={item}
            copied={copied === item.code}
            onCopy={() => void copy(item.code)}
            onExplore={() => router.push('/(tabs)/explore')}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          coupons.status === 'loading' ? (
            <StateView state="loading" />
          ) : coupons.status === 'error' ? (
            <StateView state="error" message={coupons.error} onRetry={coupons.reload} />
          ) : (
            <StateView state="empty" message="No live offers right now. Check back before your next trip." />
          )
        }
        ListFooterComponent={
          coupons.items.length > 0 ? (
            <Notice
              icon="information-circle-outline"
              text="One code per booking. The discount is checked against the ride and the rental window, so the saving you see at checkout is final."
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

function CouponCard({
  coupon,
  copied,
  onCopy,
  onExplore,
}: {
  coupon: ApiCoupon;
  copied: boolean;
  onCopy: () => void;
  onExplore: () => void;
}) {
  const theme = useTheme();
  const value =
    coupon.type === 'PERCENT'
      ? `${coupon.value}% off${coupon.maxDiscount ? ` up to ${formatMoney(coupon.maxDiscount)}` : ''}`
      : `${formatMoney(coupon.value)} off`;

  return (
    <View style={[styles.card, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <ThemedText type="subtitle">{coupon.title}</ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.brand }}>
            {value}
          </ThemedText>
        </View>
        <View style={[styles.tag, { backgroundColor: theme.brandSoft }]}>
          <Ionicons name="pricetag" size={16} color={theme.brand} />
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {coupon.minOrderAmount > 0
          ? `On orders above ${formatMoney(coupon.minOrderAmount)} · `
          : 'No minimum order · '}
        Valid till {formatDayYear(coupon.validTill)}
      </ThemedText>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy code ${coupon.code}`}
          onPress={onCopy}
          style={({ pressed }) => [
            styles.code,
            { borderColor: theme.brand, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="code" style={{ color: theme.brandStrong, fontWeight: '700' }}>
            {coupon.code}
          </ThemedText>
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={16}
            color={theme.brand}
          />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onExplore} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: theme.brand }}>
            Find a ride
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three, paddingBottom: Spacing.five },
  card: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headText: { flex: 1, gap: 2 },
  tag: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.field,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
