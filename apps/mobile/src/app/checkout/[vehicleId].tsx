import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CircleButton, Notice, Sheet } from '@/components/kit';
import { Button, Card, Field, Screen, StateView } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useQuote } from '@/features/booking/use-quote';
import { useRentalWindow } from '@/features/search/window-context';
import { isWindowInFuture } from '@/features/search/window';
import { useTheme } from '@/hooks/use-theme';
import { resolveMediaUrl } from '@/lib/api/config';
import { bookingApi, catalogueApi, type BookingInput } from '@/lib/api/endpoints';
import { ApiError, describeApiError } from '@/lib/api/errors';
import type { ApiLocation } from '@/lib/api/types';
import { formatMoney, formatWeekdayDay } from '@/lib/format';
import { useSession } from '@/lib/session/context';
import { useAsyncList, useAsyncResource } from '@/lib/use-async';

const PAY_METHODS = [
  { id: 'UPI', icon: 'phone-portrait-outline', label: 'UPI', note: 'Pay with any UPI app' },
  { id: 'CARD', icon: 'card-outline', label: 'Credit or debit card', note: 'Visa, Mastercard' },
  { id: 'NETBANKING', icon: 'wallet-outline', label: 'Net banking & wallets', note: 'Secured by Razorpay' },
] as const;

type PayMethod = (typeof PAY_METHODS)[number]['id'];

export default function CheckoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const vehicleId = String(useLocalSearchParams<{ vehicleId: string }>().vehicleId ?? '');
  const { window, durationDays } = useRentalWindow();
  const { status: sessionStatus } = useSession();

  const vehicle = useAsyncResource(vehicleId, () => catalogueApi.vehicle(vehicleId));
  const locations = useAsyncList<ApiLocation>(() => catalogueApi.locations());

  const [pickupLocationId, setPickupLocationId] = useState<string | null>(null);
  const [locationSheet, setLocationSheet] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [method, setMethod] = useState<PayMethod>('UPI');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const id = vehicle.data?.location.id;
    if (id && !pickupLocationId) setPickupLocationId(id);
  }, [pickupLocationId, vehicle.data?.location.id]);

  const openLocations = useMemo(
    () => locations.items.filter((entry) => entry.isActive),
    [locations.items],
  );

  const windowUsable = isWindowInFuture(window);

  const input: BookingInput | null =
    vehicleId && pickupLocationId && windowUsable
      ? {
          vehicleId,
          pickupLocationId,
          pickupAt: window.pickupAt,
          returnAt: window.returnAt,
          ...(appliedCode ? { couponCode: appliedCode } : {}),
          ...(delivery ? { addOns: ['DELIVERY' as const] } : {}),
        }
      : null;

  const { quote, stale, error: quoteError } = useQuote(input);

  const pricing = quote?.pricing;
  const discount = appliedCode ? (pricing?.discountAmount ?? couponDiscount) : 0;
  const total = pricing
    ? pricing.totalAmount
    : vehicle.data
      ? vehicle.data.pricePerDay * durationDays + vehicle.data.depositAmount
      : 0;

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code || !vehicle.data || !input) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const result = await bookingApi.validateCoupon({
        code,
        vehicleId: vehicle.data.id,
        durationDays,
        ...(quote ? { subtotal: quote.pricing.subtotal } : {}),
      });
      setAppliedCode(result.coupon.code);
      setCouponCode(result.coupon.code);
      setCouponDiscount(result.discount);
    } catch (cause) {
      setAppliedCode(null);
      setCouponDiscount(0);
      setCouponError(describeApiError(cause));
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCode(null);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponError(null);
  };

  const submit = async () => {
    if (!input) return;
    if (sessionStatus !== 'signed-in') {
      router.push({ pathname: '/(auth)/login', params: { next: `/checkout/${vehicleId}` } });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await bookingApi.create(input);
      router.replace({ pathname: '/booking/[code]', params: { code: booking.code } });
    } catch (cause) {
      setSubmitError(
        cause instanceof ApiError && cause.code === 'BOOKING_CONFLICT'
          ? 'Those dates were just taken. Pick another window and try again.'
          : describeApiError(cause),
      );
      setSubmitting(false);
    }
  };

  if (vehicle.status === 'loading') {
    return (
      <ScreenFrame title="Review & pay" onBack={() => router.back()}>
        <StateView state="loading" />
      </ScreenFrame>
    );
  }

  if (vehicle.status === 'error' || !vehicle.data) {
    return (
      <ScreenFrame title="Review & pay" onBack={() => router.back()}>
        <StateView state="error" message={vehicle.error} onRetry={vehicle.reload} />
      </ScreenFrame>
    );
  }

  const car = vehicle.data;
  const image = resolveMediaUrl(car.primaryImage?.url ?? car.images[0]?.url ?? null);
  const pickupName = openLocations.find((entry) => entry.id === pickupLocationId)?.name ?? car.location.name;
  const methodLabel = PAY_METHODS.find((entry) => entry.id === method)?.label ?? 'UPI';
  const returnYear = new Date(window.returnAt).getFullYear();

  return (
    <ScreenFrame title="Review & pay" onBack={() => router.back()}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}>
        <Card style={styles.vehicleCard}>
          {image ? (
            <Image
              source={{ uri: image }}
              alt={`${car.name} for rent`}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.vehicleText}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {car.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[
                car.transmission.charAt(0) + car.transmission.slice(1).toLowerCase(),
                car.engine,
                car.fuelType.charAt(0) + car.fuelType.slice(1).toLowerCase(),
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={theme.brand} />
              <ThemedText type="small" style={{ fontWeight: '700' }}>
                {car.rating.toFixed(1)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                · {car.location.name}
              </ThemedText>
            </View>
          </View>
        </Card>

        {!windowUsable ? (
          <Notice
            icon="alert-circle-outline"
            tone="danger"
            text="Your pick-up time is in the past. Go back and choose a fresh window."
          />
        ) : null}

        <Card style={styles.tripCard}>
          <ThemedText type="subtitle">Trip details</ThemedText>

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.brand} />
            </View>
            <View style={styles.tripText}>
              <ThemedText type="small" themeColor="textSecondary">
                Pick-up → Return
              </ThemedText>
              <ThemedText type="smallBold" style={styles.tripValue}>
                {formatWeekdayDay(window.pickupAt)} → {formatWeekdayDay(window.returnAt)} {returnYear}
              </ThemedText>
            </View>
            <View style={[styles.dayPill, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" style={{ fontWeight: '700' }}>
                {durationDays} day{durationDays === 1 ? '' : 's'}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.hairline, { backgroundColor: theme.line }]} />

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="location-outline" size={18} color={theme.brand} />
            </View>
            <View style={styles.tripText}>
              <ThemedText type="small" themeColor="textSecondary">
                Pick-up location
              </ThemedText>
              <ThemedText type="smallBold" style={styles.tripValue}>
                {pickupName}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLocationSheet(true)}
              hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.brand }}>
                Change
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.hairline, { backgroundColor: theme.line }]} />

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="cube-outline" size={18} color={theme.brand} />
            </View>
            <View style={styles.tripText}>
              <ThemedText type="smallBold" style={styles.tripValue}>
                Doorstep delivery
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Handed over at your address, added to the total
              </ThemedText>
            </View>
            <Switch
              value={delivery}
              onValueChange={setDelivery}
              trackColor={{ false: theme.lineStrong, true: theme.brand }}
              thumbColor="#ffffff"
              accessibilityLabel="Doorstep delivery"
            />
          </View>
        </Card>

        {appliedCode ? (
          <View
            style={[
              styles.couponApplied,
              { borderColor: theme.brand, backgroundColor: theme.brandSoft },
            ]}>
            <View style={[styles.couponIcon, { backgroundColor: theme.brand }]}>
              <Ionicons name="pricetag" size={18} color="#ffffff" />
            </View>
            <View style={styles.couponText}>
              <ThemedText type="smallBold" style={{ color: theme.brandStrong }}>
                {appliedCode} applied
              </ThemedText>
              {discount > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  You save {formatMoney(discount)} on this ride
                </ThemedText>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" onPress={removeCoupon} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.brandStrong, textDecorationLine: 'underline' }}>
                Remove
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Card style={styles.couponCard}>
            <ThemedText type="subtitle">Have a coupon?</ThemedText>
            <View style={styles.couponRow}>
              <View style={styles.couponField}>
                <Field
                  value={couponCode}
                  onChangeText={(next) => {
                    setCouponCode(next.toUpperCase());
                    setCouponError(null);
                  }}
                  error={couponError}
                  autoCapitalize="characters"
                  placeholder="SAVARI20"
                  onSubmitEditing={applyCoupon}
                  returnKeyType="done"
                />
              </View>
              <Button
                title="Apply"
                variant="secondary"
                loading={couponBusy}
                onPress={applyCoupon}
                style={styles.applyButton}
              />
            </View>
          </Card>
        )}

        <Card style={styles.priceCard}>
          <ThemedText type="subtitle">Price details</ThemedText>
          {quoteError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {quoteError}
            </ThemedText>
          ) : null}

          {pricing ? (
            <>
              <PriceRow
                label={`${formatMoney(pricing.baseDayRate)} × ${durationDays} day${durationDays === 1 ? '' : 's'}`}
                value={formatMoney(pricing.grossRentalAmount)}
              />
              {pricing.durationDiscount > 0 ? (
                <PriceRow
                  label="Long rental discount"
                  value={`−${formatMoney(pricing.durationDiscount)}`}
                  tone="good"
                />
              ) : null}
              {quote?.items
                .filter((item) => item.kind !== 'VEHICLE_RENTAL')
                .map((item) => (
                  <PriceRow
                    key={`${item.kind}-${item.label}`}
                    label={`${item.label} × ${item.quantity}`}
                    value={formatMoney(item.totalAmount)}
                  />
                ))}
              {discount > 0 ? (
                <PriceRow
                  label={`Coupon${appliedCode ? ` (${appliedCode})` : ''}`}
                  value={`−${formatMoney(discount)}`}
                  tone="good"
                />
              ) : null}
              <PriceRow label="Refundable deposit" value={formatMoney(pricing.depositAmount)} />
              <PriceRow
                label={`GST (${pricing.taxPercent}%)`}
                value={formatMoney(pricing.taxAmount)}
              />
              <View style={[styles.dashed, { borderColor: theme.lineStrong }]} />
              <View style={styles.totalRow}>
                <ThemedText type="subtitle">Total payable</ThemedText>
                <ThemedText type="price" style={{ color: theme.brand, fontSize: 24 }}>
                  {formatMoney(total)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {stale ? 'Repricing… · ' : ''}Deposit refunded within 3 working days of return.
              </ThemedText>
            </>
          ) : (
            <>
              <PriceRow label={`${formatMoney(car.pricePerDay)} × ${durationDays} days`} value={formatMoney(car.pricePerDay * durationDays)} />
              <PriceRow label="Refundable deposit" value={formatMoney(car.depositAmount)} />
              <View style={[styles.dashed, { borderColor: theme.lineStrong }]} />
              <View style={styles.totalRow}>
                <ThemedText type="subtitle">Total payable</ThemedText>
                <ThemedText type="price" style={{ color: theme.brand, fontSize: 24 }}>
                  {formatMoney(total)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {quoteError ? 'Showing the catalogue estimate.' : 'Getting the live price…'}
              </ThemedText>
            </>
          )}
        </Card>

        <View style={styles.payHead}>
          <ThemedText type="subtitle">Pay with</ThemedText>
        </View>

        {PAY_METHODS.map((entry) => {
          const active = entry.id === method;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={entry.label}
              onPress={() => setMethod(entry.id)}
              style={({ pressed }) => [
                styles.payCard,
                {
                  borderColor: active ? theme.brand : theme.line,
                  backgroundColor: active ? theme.brandSoft : theme.backgroundElement,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <View
                style={[
                  styles.radio,
                  { borderColor: active ? theme.brand : theme.lineStrong },
                ]}>
                {active ? <View style={[styles.radioDot, { backgroundColor: theme.brand }]} /> : null}
              </View>
              <View style={styles.payText}>
                <ThemedText type="smallBold">{entry.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.note}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        <Notice
          icon="information-circle-outline"
          text="Carry your driving licence and one government photo ID at pick-up."
        />

        <Notice
          icon="lock-closed-outline"
          text={`SavariGo does not charge in the app yet. Pay by ${methodLabel} at the hub when you collect the vehicle.`}
        />

        {submitError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {submitError}
          </ThemedText>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.line, backgroundColor: theme.background }]}>
        <Button
          title={
            sessionStatus === 'signed-in'
              ? `Reserve · ${formatMoney(total)}`
              : 'Sign in to reserve'
          }
          disabled={!input}
          loading={submitting}
          onPress={submit}
          icon={<Ionicons name="lock-closed" size={16} color="#ffffff" />}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.footerNote}>
          Free cancellation up to 24h before pick-up
        </ThemedText>
      </View>

      <Sheet
        visible={locationSheet}
        onClose={() => setLocationSheet(false)}
        title="Pick-up location"
        subtitle="Your ride is handed over here">
        {openLocations.map((entry) => {
          const active = entry.id === pickupLocationId;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setPickupLocationId(entry.id);
                setLocationSheet(false);
              }}
              style={[styles.locationRow, { borderColor: active ? theme.brand : theme.line }]}>
              <View style={styles.locationText}>
                <ThemedText type="smallBold">{entry.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.addressLine1}, {entry.city}
                </ThemedText>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={20} color={theme.brand} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </ScreenFrame>
  );
}

function ScreenFrame({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <Screen tabBarSpace={false}>
      <View style={styles.header}>
        <CircleButton icon="chevron-back" onPress={onBack} label="Go back" />
        <ThemedText type="heading" style={styles.headerTitle}>
          {title}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>
      {children}
    </Screen>
  );
}

function PriceRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good';
}) {
  const theme = useTheme();
  return (
    <View style={styles.priceRow}>
      <ThemedText type="body" themeColor="textSecondary" style={styles.priceLabel}>
        {label}
      </ThemedText>
      <ThemedText
        type="body"
        style={{ fontWeight: '600', color: tone === 'good' ? theme.brand : theme.text }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 42 },
  body: { gap: Spacing.three, paddingBottom: Spacing.four },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 84, height: 64, borderRadius: Radius.field },
  vehicleText: { flex: 1, gap: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripCard: { gap: Spacing.three },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tripIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripText: { flex: 1, gap: 2 },
  tripValue: { fontSize: 15, lineHeight: 20 },
  dayPill: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  hairline: { height: StyleSheet.hairlineWidth },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.field,
    padding: Spacing.three,
  },
  couponIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  couponText: { flex: 1, gap: 1 },
  couponCard: { gap: Spacing.two },
  couponRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  couponField: { flex: 1 },
  applyButton: { minHeight: 56, marginTop: 0 },
  priceCard: { gap: Spacing.two },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  priceLabel: { flexShrink: 1 },
  dashed: { height: 0, borderTopWidth: 1, borderStyle: 'dashed', marginVertical: Spacing.one },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  payHead: { paddingTop: Spacing.one },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Radius.field,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  payText: { flex: 1, gap: 1 },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  footerNote: { textAlign: 'center' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.field,
    padding: Spacing.three,
  },
  locationText: { flex: 1, gap: 2 },
});
