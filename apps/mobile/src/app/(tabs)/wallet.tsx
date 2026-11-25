import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen, StateView } from '@/components/ui';
import { BottomTabInset, CardShadow, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { paymentApi } from '@/lib/api/endpoints';
import type { ApiPayment } from '@/lib/api/types';
import {
  formatDateTime,
  formatMoney,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/format';
import { useSession } from '@/lib/session/context';
import { useAsyncResource } from '@/lib/use-async';

export default function WalletScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useSession();
  const history = useAsyncResource('wallet', () => paymentApi.history({ limit: 100 }));

  if (status !== 'signed-in') {
    return (
      <Screen tabBarSpace={false}>
        <ThemedText type="title">Wallet</ThemedText>
        <Card>
          <ThemedText type="body">
            Sign in to see every payment and refund on your bookings.
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

  const payments = history.data?.data ?? [];
  const paid = payments.filter((payment) => payment.status === 'PAID');
  const refunds = payments.flatMap((payment) => payment.refunds ?? []);
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amount, 0);
  const refundTotal = refunds.reduce((sum, refund) => sum + refund.amount, 0);

  return (
    <Screen tabBarSpace={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={history.status === 'loading'}
            onRefresh={history.reload}
            colors={[theme.brandStrong]}
            tintColor={theme.brandStrong}
          />
        }>
        <ThemedText type="title">Wallet</ThemedText>
        <ThemedText style={[styles.intro, { color: theme.text }]}>
          SavariGo does not hold a stored balance. This is the ledger of payments and refunds on
          your bookings.
        </ThemedText>

        <View style={styles.summaryRow}>
          <SummaryTile label="Paid" value={formatMoney(paidTotal)} note={`${paid.length} payments`} />
          <SummaryTile
            label="Refunded"
            value={formatMoney(refundTotal)}
            note={`${refunds.length} refund${refunds.length === 1 ? '' : 's'}`}
          />
        </View>

        {history.status === 'loading' ? (
          <StateView state="loading" />
        ) : history.status === 'error' ? (
          <StateView state="error" message={history.error} onRetry={history.reload} />
        ) : payments.length === 0 ? (
          <StateView
            state="empty"
            message="No payments yet. Reserve a ride and the receipt appears here."
          />
        ) : (
          <View style={[styles.ledger, CardShadow, { backgroundColor: theme.backgroundElement }]}>
            {payments.map((payment, index) => (
              <View key={payment.id}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: theme.line }]} />
                ) : null}
                <PaymentRow payment={payment} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryTile({ label, value, note }: { label: string; value: string; note: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryTile, CardShadow, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.tileLabel, { color: theme.text }]}>{label}</ThemedText>
      <ThemedText style={[styles.tileValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.tileNote, { color: theme.textSecondary }]}>{note}</ThemedText>
    </View>
  );
}

function PaymentRow({ payment }: { payment: ApiPayment }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.rowText}>
          <ThemedText style={[styles.rowCode, { color: theme.text }]}>
            {payment.bookingCode ?? 'Ride payment'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(payment.createdAt)} · {payment.method ?? payment.provider}
          </ThemedText>
        </View>
        <View style={styles.amountBlock}>
          <ThemedText style={[styles.rowAmount, { color: theme.text }]}>
            {formatMoney(payment.amount)}
          </ThemedText>
          <Badge text={paymentStatusLabel(payment.status)} tone={paymentStatusTone(payment.status)} />
        </View>
      </View>
      {payment.refunds?.map((refund) => (
        <View key={refund.id} style={[styles.refund, { borderColor: theme.line }]}>
          <Ionicons name="return-down-back-outline" size={15} color={theme.accentGold} />
          <ThemedText type="small" themeColor="textSecondary">
            Refund {formatMoney(refund.amount)} · {refund.status.toLowerCase()}
            {refund.reason ? ` · ${refund.reason}` : ''}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  intro: { fontSize: 15, lineHeight: 22 },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryTile: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: 2,
  },
  tileLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  tileValue: { fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  tileNote: { fontSize: 14, lineHeight: 19 },
  ledger: { borderRadius: Radius.card, paddingHorizontal: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth },
  row: { paddingVertical: Spacing.three, gap: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  rowText: { flex: 1, gap: 2 },
  rowCode: { fontSize: 16, fontWeight: '800' },
  rowAmount: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  amountBlock: { alignItems: 'flex-end', gap: 5 },
  refund: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
});
