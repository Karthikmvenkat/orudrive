import type { ApiBookingStatus, ApiPaymentStatus, FuelValue, VehicleStatusValue } from '@/lib/api/types';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Rupee amounts arrive from the API as rupees with paise precision, not paise. */
export function formatMoney(amount: number, options: { exact?: boolean } = {}): string {
  return options.exact ? inrPrecise.format(amount) : inr.format(amount);
}

const dayMonth = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
const weekdayDay = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayMonthYear = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
// en-IN inserts a comma before the year ("Tue, 17 Nov, 2026"); the design
// specifies the single-comma form, which is what en-GB produces.
const weekdayDayYear = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const fullDateTime = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return fullDateTime.format(new Date(iso));
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dayMonth.format(new Date(iso));
}

/** "Tue, 17 Nov" — the trip tiles on home, detail and checkout. */
export function formatWeekdayDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return weekdayDay.format(new Date(iso));
}

/** "17 Nov 2026" — the ticket and booking history rows. */
export function formatDayYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dayMonthYear.format(new Date(iso));
}

/** "Tue, 17 Nov 2026" — the ticket's pick-up and return cells. */
export function formatWeekdayDayYear(iso: string | null | undefined): string {
  if (!iso) return '—';
  return weekdayDayYear.format(new Date(iso));
}

/** "₹10.6k" for narrow amount columns. */
export function formatMoneyCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (amount >= 10000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return formatMoney(amount);
}

export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SG';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** `2026-12-01T09:00` for a `datetime`-ish input the booking form round-trips. */
export function toIsoForApi(localDateTime: string): string {
  const date = new Date(localDateTime);
  if (Number.isNaN(date.getTime())) throw new Error(`Unparseable date: ${localDateTime}`);
  return date.toISOString();
}

export function daysBetween(pickupAt: string, returnAt: string): number {
  const ms = new Date(returnAt).getTime() - new Date(pickupAt).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

const BOOKING_STATUS_COPY: Record<ApiBookingStatus, { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' }> = {
  PENDING: { label: 'Awaiting confirmation', tone: 'warn' },
  CONFIRMED: { label: 'Confirmed', tone: 'good' },
  ONGOING: { label: 'On the road', tone: 'good' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
  NO_SHOW: { label: 'Not collected', tone: 'bad' },
};

export function bookingStatusLabel(status: ApiBookingStatus): string {
  return BOOKING_STATUS_COPY[status]?.label ?? status;
}

export function bookingStatusTone(status: ApiBookingStatus): 'neutral' | 'good' | 'warn' | 'bad' {
  return BOOKING_STATUS_COPY[status]?.tone ?? 'neutral';
}

const PAYMENT_STATUS_COPY: Record<ApiPaymentStatus, string> = {
  PENDING: 'Payment pending',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
};

export function paymentStatusLabel(status: ApiPaymentStatus): string {
  return PAYMENT_STATUS_COPY[status] ?? status;
}

export function paymentStatusTone(status: ApiPaymentStatus): 'neutral' | 'good' | 'warn' | 'bad' {
  switch (status) {
    case 'PAID':
      return 'good';
    case 'PENDING':
      return 'warn';
    case 'FAILED':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function vehicleStatusLabel(status: VehicleStatusValue): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available now';
    case 'UNAVAILABLE':
      return 'Not rentable';
    case 'MAINTENANCE':
      return 'In service';
    case 'RETIRED':
      return 'Retired';
    default:
      return 'Not listed yet';
  }
}

export function fuelLabel(fuel: FuelValue): string {
  return fuel.charAt(0) + fuel.slice(1).toLowerCase();
}

/** Mirrors the web copy: seats, gearbox and fuel are the three filters people actually use. */
export function vehicleSpecLine(input: { seats: number; transmission: string; fuelType: FuelValue }): string {
  return `${input.seats} seats · ${input.transmission.toLowerCase()} · ${fuelLabel(input.fuelType)}`;
}

export function ratingLine(rating: number, reviewCount: number): string {
  return reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : 'No reviews yet';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
