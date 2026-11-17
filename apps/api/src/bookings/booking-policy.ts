import { money } from "./booking-pricing";

export interface CancellationPolicyInput {
  pickupAt: Date;
  durationDays: number;
  rentalAmount: number;
  depositAmount: number;
}

export interface CancellationRefund {
  hoursBeforePickup: number;
  rentalRefundPercent: number;
  rentalRefund: number;
  depositRefund: number;
  totalRefund: number;
  policy: string;
}

/**
 * Mirrors the rental terms published on the website:
 * - more than 24 hours before pickup: full rental refund
 * - 6 to 24 hours before pickup: 50% of rental
 * - under 6 hours: the first rental day is non-refundable
 * Add-ons are non-refundable. The security deposit is always returned.
 */
export function calculateCancellationRefund(
  input: CancellationPolicyInput,
  now: Date = new Date(),
): CancellationRefund {
  const hoursBeforePickup =
    (input.pickupAt.getTime() - now.getTime()) / 3_600_000;

  let rentalRefundPercent: number;
  let rentalRefund: number;
  let policy: string;

  if (hoursBeforePickup > 24) {
    rentalRefundPercent = 100;
    rentalRefund = input.rentalAmount;
    policy = "Cancelled more than 24 hours before pickup: full rental refund";
  } else if (hoursBeforePickup >= 6) {
    rentalRefundPercent = 50;
    rentalRefund = money(input.rentalAmount * 0.5);
    policy = "Cancelled 6-24 hours before pickup: 50% rental refund";
  } else {
    const dayRate = money(
      input.rentalAmount / Math.max(1, input.durationDays),
    );
    rentalRefundPercent = Math.max(
      0,
      Math.round(
        ((input.rentalAmount - dayRate) / Math.max(1, input.rentalAmount)) * 100,
      ),
    );
    rentalRefund = money(Math.max(0, input.rentalAmount - dayRate));
    policy =
      "Cancelled under 6 hours before pickup: the first rental day is non-refundable";
  }

  const depositRefund = money2(input.depositAmount);

  return {
    hoursBeforePickup: Math.round(hoursBeforePickup * 100) / 100,
    rentalRefundPercent,
    rentalRefund: money2(rentalRefund),
    depositRefund,
    totalRefund: money2(rentalRefund + depositRefund),
    policy,
  };
}

function money2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
