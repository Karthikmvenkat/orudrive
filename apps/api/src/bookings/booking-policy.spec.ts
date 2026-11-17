import { calculateCancellationRefund } from "./booking-policy";

const now = new Date("2026-12-01T00:00:00Z");

function inHours(hours: number): Date {
  return new Date(now.getTime() + hours * 3_600_000);
}

const base = {
  durationDays: 3,
  rentalAmount: 4500,
  depositAmount: 2000,
};

describe("calculateCancellationRefund", () => {
  it("refunds the full rental and deposit when cancelled over 24h ahead", () => {
    const result = calculateCancellationRefund(
      { ...base, pickupAt: inHours(48) },
      now,
    );
    expect(result.rentalRefundPercent).toBe(100);
    expect(result.rentalRefund).toBe(4500);
    expect(result.depositRefund).toBe(2000);
    expect(result.totalRefund).toBe(6500);
  });

  it("refunds half the rental between 6 and 24 hours", () => {
    const result = calculateCancellationRefund(
      { ...base, pickupAt: inHours(12) },
      now,
    );
    expect(result.rentalRefundPercent).toBe(50);
    expect(result.rentalRefund).toBe(2250);
    expect(result.totalRefund).toBe(4250);
  });

  it("keeps the first rental day when cancelled under 6 hours", () => {
    const result = calculateCancellationRefund(
      { ...base, pickupAt: inHours(3) },
      now,
    );
    expect(result.rentalRefund).toBe(3000);
    expect(result.depositRefund).toBe(2000);
    expect(result.totalRefund).toBe(5000);
    expect(result.policy).toContain("first rental day");
  });

  it("never refunds a negative rental amount", () => {
    const result = calculateCancellationRefund(
      {
        pickupAt: inHours(1),
        durationDays: 1,
        rentalAmount: 1500,
        depositAmount: 0,
      },
      now,
    );
    expect(result.rentalRefund).toBe(0);
    expect(result.totalRefund).toBe(0);
  });

  it("always returns the deposit", () => {
    const result = calculateCancellationRefund(
      { ...base, pickupAt: inHours(0.5) },
      now,
    );
    expect(result.depositRefund).toBe(2000);
  });
});
