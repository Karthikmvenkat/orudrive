import { BookingItemKind } from "@prisma/client";
import {
  calculateBookingPricing,
  PricingPlanInput,
  rentalDays,
} from "./booking-pricing";

const plan: PricingPlanInput = {
  baseDayRate: 1500,
  depositAmount: 2000,
  mileageLimitKm: 300,
  minDays: 1,
  weeklyDiscountPercent: 10,
  monthlyDiscountPercent: 20,
};

describe("calculateBookingPricing", () => {
  it("charges the day rate with no extras", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 3,
      addOns: [],
    });
    expect(result.rentalAmount).toBe(4500);
    expect(result.extrasAmount).toBe(0);
    expect(result.subtotal).toBe(4500);
    expect(result.depositAmount).toBe(2000);
    expect(result.items).toHaveLength(1);
  });

  it("applies the weekly discount from day seven", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 7,
      addOns: [],
    });
    expect(result.grossRentalAmount).toBe(10500);
    expect(result.durationDiscount).toBe(1050);
    expect(result.rentalAmount).toBe(9450);
  });

  it("prefers the monthly discount for 30 days or more", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 30,
      addOns: [],
    });
    expect(result.durationDiscount).toBe(9000);
    expect(result.rentalAmount).toBe(36000);
  });

  it("prices per-day and flat add-ons", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 7,
      addOns: [
        BookingItemKind.HELMET,
        BookingItemKind.DELIVERY,
        BookingItemKind.INSURANCE,
      ],
    });
    expect(result.extrasAmount).toBe(1235);
    expect(result.items.map((item) => item.kind)).toEqual([
      BookingItemKind.VEHICLE_RENTAL,
      BookingItemKind.HELMET,
      BookingItemKind.DELIVERY,
      BookingItemKind.INSURANCE,
    ]);
    expect(result.subtotal).toBe(10685);
  });

  it("adds a professional driver at the daily rate", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 2,
      addOns: [],
      driverDailyRate: 800,
    });
    expect(result.extrasAmount).toBe(1600);
    expect(result.subtotal).toBe(4600);
    expect(result.items.at(-1)?.kind).toBe(BookingItemKind.DRIVER);
  });

  it("applies tax on the subtotal and rounds to paise", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 3,
      addOns: [],
      taxPercent: 18,
    });
    expect(result.taxAmount).toBe(810);
  });

  it("caps a booking at 90 days", () => {
    const result = calculateBookingPricing({
      plan,
      durationDays: 200,
      addOns: [],
    });
    expect(result.durationDays).toBe(90);
    expect(result.grossRentalAmount).toBe(135000);
  });
});

describe("rentalDays", () => {
  it("counts any started 24-hour block", () => {
    const start = new Date("2026-12-01T09:00:00Z");
    expect(rentalDays(start, new Date("2026-12-02T09:00:00Z"))).toBe(1);
    expect(rentalDays(start, new Date("2026-12-02T09:00:01Z"))).toBe(2);
    expect(rentalDays(start, new Date("2026-12-08T09:00:00Z"))).toBe(7);
  });

  it("returns zero for an empty window", () => {
    const date = new Date("2026-12-01T09:00:00Z");
    expect(rentalDays(date, date)).toBe(0);
  });
});
