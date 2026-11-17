import { BookingItemKind } from "@prisma/client";

export const ADD_ON_RATES = {
  HELMET: 49,
  DELIVERY: 199,
  INSURANCE: 99,
} as const;

export const MAX_BOOKING_DAYS = 90;

export interface PricingPlanInput {
  baseDayRate: number;
  depositAmount: number;
  mileageLimitKm: number | null;
  minDays: number;
  weeklyDiscountPercent: number | null;
  monthlyDiscountPercent: number | null;
}

export interface BookingPricingInput {
  plan: PricingPlanInput;
  durationDays: number;
  addOns: BookingItemKind[];
  driverDailyRate?: number | null;
  taxPercent?: number;
}

export interface BookingPricingItem {
  kind: BookingItemKind;
  label: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

export interface BookingPricingResult {
  durationDays: number;
  grossRentalAmount: number;
  durationDiscount: number;
  rentalAmount: number;
  extrasAmount: number;
  taxAmount: number;
  depositAmount: number;
  subtotal: number;
  items: BookingPricingItem[];
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function rentalDays(pickupAt: Date, returnAt: Date): number {
  const ms = returnAt.getTime() - pickupAt.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

function durationDiscountPercent(
  days: number,
  plan: PricingPlanInput,
): number {
  if (days >= 30 && plan.monthlyDiscountPercent !== null) {
    return plan.monthlyDiscountPercent;
  }
  if (days >= 7 && plan.weeklyDiscountPercent !== null) {
    return plan.weeklyDiscountPercent;
  }
  return 0;
}

export function calculateBookingPricing(
  input: BookingPricingInput,
): BookingPricingResult {
  const days = Math.max(1, Math.min(MAX_BOOKING_DAYS, Math.round(input.durationDays)));
  const items: BookingPricingItem[] = [];

  const grossRentalAmount = money(input.plan.baseDayRate * days);
  const percent = durationDiscountPercent(days, input.plan);
  const durationDiscount = money((grossRentalAmount * percent) / 100);
  const rentalAmount = money(grossRentalAmount - durationDiscount);

  items.push({
    kind: BookingItemKind.VEHICLE_RENTAL,
    label:
      percent > 0
        ? `Vehicle rental · ${days} day${days === 1 ? "" : "s"} (${percent}% long-stay discount)`
        : `Vehicle rental · ${days} day${days === 1 ? "" : "s"}`,
    quantity: days,
    unitAmount: money(input.plan.baseDayRate),
    totalAmount: rentalAmount,
  });

  let extrasAmount = 0;
  const addOns = new Set(input.addOns);

  if (addOns.has(BookingItemKind.HELMET)) {
    const total = money(ADD_ON_RATES.HELMET * days);
    extrasAmount += total;
    items.push({
      kind: BookingItemKind.HELMET,
      label: "Helmet rental",
      quantity: days,
      unitAmount: ADD_ON_RATES.HELMET,
      totalAmount: total,
    });
  }
  if (addOns.has(BookingItemKind.DELIVERY)) {
    extrasAmount += ADD_ON_RATES.DELIVERY;
    items.push({
      kind: BookingItemKind.DELIVERY,
      label: "Doorstep delivery & pickup",
      quantity: 1,
      unitAmount: ADD_ON_RATES.DELIVERY,
      totalAmount: ADD_ON_RATES.DELIVERY,
    });
  }
  if (addOns.has(BookingItemKind.INSURANCE)) {
    const total = money(ADD_ON_RATES.INSURANCE * days);
    extrasAmount += total;
    items.push({
      kind: BookingItemKind.INSURANCE,
      label: "Damage protection cover",
      quantity: days,
      unitAmount: ADD_ON_RATES.INSURANCE,
      totalAmount: total,
    });
  }
  if (input.driverDailyRate && input.driverDailyRate > 0) {
    const total = money(input.driverDailyRate * days);
    extrasAmount += total;
    items.push({
      kind: BookingItemKind.DRIVER,
      label: "Professional driver",
      quantity: days,
      unitAmount: money(input.driverDailyRate),
      totalAmount: total,
    });
  }

  extrasAmount = money(extrasAmount);
  const subtotal = money(rentalAmount + extrasAmount);
  const taxPercent = input.taxPercent ?? 0;
  const taxAmount = money((subtotal * taxPercent) / 100);
  const depositAmount = money(input.plan.depositAmount);

  return {
    durationDays: days,
    grossRentalAmount,
    durationDiscount,
    rentalAmount,
    extrasAmount,
    taxAmount,
    depositAmount,
    subtotal,
    items,
  };
}
