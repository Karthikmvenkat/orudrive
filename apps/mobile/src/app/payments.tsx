import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/kit';
import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Screen, StateView } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { paymentApi } from '@/lib/api/endpoints';
import type { ApiPayment } from '@/lib/api/types';
import {
  formatDateTime,
  formatMoney,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/format';
import { useAsyncResource } from '@/lib/use-async';

export default function PaymentsScreen() {
  const router = useRouter();
  const history = useAsyncResource('payments', () => paymentApi.history({ limit: 50 }));
  const payments = history.data?.data ?? [];

  return (
    <Screen tabBarSpace={false}>
      <PageHeader
        title="Payments & refunds"
        subtitle="Every charge and refund on your account"
        onBack={() => router.back()}
      />
      <FlatList
        data={payments}
        keyExtractor={(payment) => payment.id}
        renderItem={({ item }) => <PaymentRow payment={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={history.status === 'loading'} onRefresh={history.reload} />
        }
        ListEmptyComponent={
          history.status === 'loading' ? (
            <StateView state="loading" />
          ) : history.status === 'error' ? (
            <StateView state="error" message={history.error} onRetry={history.reload} />
          ) : (
            <StateView state="empty" message="No payments yet. Rent a ride and the receipt appears here." />
          )
        }
      />
    </Screen>
  );
}

function PaymentRow({ payment }: { payment: ApiPayment }) {
  const theme = useTheme();
  const method = payment.method ?? payment.provider;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <ThemedText type="smallBold">{payment.bookingCode ?? 'Ride payment'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(payment.createdAt)} · {method}
          </ThemedText>
        </View>
        <View style={styles.amountBlock}>
          <ThemedText type="subtitle">{formatMoney(payment.amount)}</ThemedText>
          <Badge text={paymentStatusLabel(payment.status)} tone={paymentStatusTone(payment.status)} />
        </View>
      </View>

      {payment.failureMessage ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {payment.failureMessage}
        </ThemedText>
      ) : null}

      {payment.refunds?.map((refund) => (
        <View key={refund.id} style={[styles.refund, { borderColor: theme.line }]}>
          <Ionicons name="return-down-back-outline" size={16} color={theme.brand} />
          <ThemedText type="small" style={styles.refundText}>
            Refund {formatMoney(refund.amount)} · {refund.status.toLowerCase()}
            {refund.reason ? ` · ${refund.reason}` : ''}
          </ThemedText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three, paddingBottom: Spacing.five },
  card: { gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headText: { flex: 1, gap: 2 },
  amountBlock: { alignItems: 'flex-end', gap: Spacing.one },
  refund: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    borderRadius: Radius.field,
  },
  refundText: { flex: 1 },
});
