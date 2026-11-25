import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Notice, Sheet } from '@/components/kit';
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
      <ScreenFrame title="Review & Pay" onBack={() => router.back()}>
        <StateView state="loading" />
      </ScreenFrame>
    );
  }

  if (vehicle.status === 'error' || !vehicle.data) {
    return (
      <ScreenFrame title="Review & Pay" onBack={() => router.back()}>
        <StateView state="error" message={vehicle.error} onRetry={vehicle.reload} />
      </ScreenFrame>
    );
  }

  const car = vehicle.data;
  const image = resolveMediaUrl(car.primaryImage?.url ?? car.images[0]?.url ?? null);
  const pickupName = openLocations.find((entry) => entry.id === pickupLocationId)?.name ?? car.location.name;
  const returnYear = new Date(window.returnAt).getFullYear();

  return (
    <ScreenFrame title="Review & Pay" onBack={() => router.back()}>
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
              {[car.engine, car.fuelType.charAt(0) + car.fuelType.slice(1).toLowerCase()]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={theme.accentGold} />
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

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Trip Details</ThemedText>

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="calendar" size={19} color={theme.accentGold} />
            </View>
            <View style={styles.tripText}>
              <View style={styles.tripLabelRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Pick-up → Return
                </ThemedText>
                <View style={[styles.dayPill, { backgroundColor: theme.successSoft }]}>
                  <ThemedText type="small" style={{ fontWeight: '700', color: theme.success }}>
                    ({durationDays} day{durationDays === 1 ? '' : 's'})
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="smallBold" style={styles.tripValue}>
                {formatWeekdayDay(window.pickupAt)} → {formatWeekdayDay(window.returnAt)}
                {new Date(window.pickupAt).getFullYear() === returnYear ? '' : ` ${returnYear}`}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.hairline, { backgroundColor: theme.line }]} />

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="location" size={19} color={theme.accentGold} />
            </View>
            <View style={styles.tripText}>
              <ThemedText type="small" themeColor="textSecondary">
                Pick-up Location
              </ThemedText>
              <ThemedText type="smallBold" style={styles.tripValue}>
                {pickupName}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLocationSheet(true)}
              hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.accentGold }}>
                Change
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.hairline, { backgroundColor: theme.line }]} />

          <View style={styles.tripRow}>
            <View style={[styles.tripIcon, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="car-sport" size={19} color={theme.accentGold} />
            </View>
            <View style={styles.tripText}>
              <ThemedText type="smallBold" style={styles.tripValue}>
                Doorstep Delivery
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
        </View>

        {appliedCode ? (
          <View
            style={[
              styles.couponApplied,
              { borderColor: theme.brand, backgroundColor: theme.brandSoft },
            ]}>
            <View style={[styles.couponIcon, { backgroundColor: theme.brand }]}>
              <Ionicons name="pricetag" size={18} color={theme.onBrand} />
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
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Have a Coupon?
            </ThemedText>
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
                loading={couponBusy}
                onPress={applyCoupon}
                style={styles.applyButton}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Price Details
          </ThemedText>
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
              <PriceRow label="Refundable Deposit" value={formatMoney(pricing.depositAmount)} />
              <PriceRow
                label={`GST (${pricing.taxPercent}%)`}
                value={formatMoney(pricing.taxAmount)}
              />
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
              <View style={styles.totalRow}>
                <ThemedText type="subtitle">Total Payable</ThemedText>
                <ThemedText type="price" style={{ color: theme.brandStrong, fontSize: 24 }}>
                  {formatMoney(total)}
                </ThemedText>
              </View>
              {stale ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Repricing…
                </ThemedText>
              ) : null}
            </>
          ) : (
            <>
              <PriceRow label={`${formatMoney(car.pricePerDay)} × ${durationDays} days`} value={formatMoney(car.pricePerDay * durationDays)} />
              <PriceRow label="Refundable Deposit" value={formatMoney(car.depositAmount)} />
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
              <View style={styles.totalRow}>
                <ThemedText type="subtitle">Total Payable</ThemedText>
                <ThemedText type="price" style={{ color: theme.brandStrong, fontSize: 24 }}>
                  {formatMoney(total)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {quoteError ? 'Showing the catalogue estimate.' : 'Getting the live price…'}
              </ThemedText>
            </>
          )}
        </View>

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
              ? 'Reserve Ride'
              : 'Sign in to reserve'
          }
          disabled={!input}
          loading={submitting}
          onPress={submit}
          icon={<Ionicons name="arrow-forward" size={17} color={theme.onBrand} />}
        />
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
              {active ? <Ionicons name="checkmark-circle" size={20} color={theme.brandStrong} /> : null}
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
  const theme = useTheme();
  return (
    <Screen tabBarSpace={false}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={onBack}
          style={({ pressed }) => [styles.headerBack, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
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
      <ThemedText themeColor="textSecondary" style={styles.priceLabel}>
        {label}
      </ThemedText>
      <ThemedText
        style={[styles.priceValue, { color: tone === 'good' ? theme.success : theme.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerBack: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { width: 42 },
  body: { gap: Spacing.two, paddingBottom: Spacing.four },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumb: { width: 84, height: 64, borderRadius: Radius.field },
  vehicleText: { flex: 1, gap: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tripLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tripIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tripText: { flex: 1, gap: 2 },
  tripValue: { fontSize: 15, lineHeight: 20 },
  dayPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
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
  couponRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  couponField: { flex: 1 },
  applyButton: { minHeight: 56, marginTop: 0, paddingHorizontal: Spacing.four },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  priceLabel: { flexShrink: 1, fontSize: 14.5, lineHeight: 20 },
  priceValue: { fontSize: 14.5, lineHeight: 20, fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
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
