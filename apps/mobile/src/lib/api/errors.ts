import type { PageMeta } from './types';

/** Body shape written by `apps/api/src/common/filters/all-exceptions.filter.ts`. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor(input: { statusCode: number; code: string; message: string; details?: unknown }) {
    super(input.message);
    this.name = 'ApiError';
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.details = input.details;
  }

  /** Field-level messages from a `class-validator` rejection, when present. */
  get validationMessages(): string[] {
    return Array.isArray(this.details) ? this.details.filter((line) => typeof line === 'string') : [];
  }
}

/**
 * The API words its errors for humans already, but several codes describe a
 * business rule rather than a fault, and a customer reading "Vehicle is not
 * available for the selected period" learns less than they should. Only codes
 * the API actually emits are mapped — see `code: "..."` literals under
 * `apps/api/src`.
 */
const FRIENDLY: Record<string, string> = {
  AVAILABILITY_BOOKED: 'That vehicle is already reserved for part of the dates you picked.',
  AVAILABILITY_OVERLAP: 'Those dates overlap an existing block on this vehicle.',
  VEHICLE_NOT_AVAILABLE: 'That vehicle cannot be booked any more. Try another one.',
  VEHICLE_NOT_FOUND: 'That vehicle is no longer listed. Try another one.',
  VEHICLE_HAS_NO_PRICING: 'That vehicle has no published rates yet, so it cannot be priced.',
  MIN_RENTAL_DAYS: 'The minimum rental for that vehicle is longer than your dates.',
  BOOKING_TOO_LONG: 'Those dates are longer than that vehicle allows.',
  INVALID_DATE_RANGE: 'The return date has to be after the pickup date.',
  PICKUP_IN_PAST: 'Pick-up has to be later than right now. Choose a fresh date.',
  PICKUP_LOCATION_UNAVAILABLE: 'That pick-up location is closed for your dates.',
  DROP_LOCATION_UNAVAILABLE: 'That drop-off location is not open for your return date.',
  INVALID_ADD_ON: 'That extra is not offered on this booking.',
  DRIVER_NOT_VERIFIED: 'That driver is not verified, so they cannot be assigned.',
  DRIVER_NOT_AVAILABLE: 'That driver is not available for your dates.',
  DRIVER_ID_REQUIRED: 'Pick a driver or ask SavariGo to assign one.',
  BOOKING_NOT_FOUND: 'We cannot find that booking on your account.',
  BOOKING_ALREADY_CANCELLED: 'That booking is already cancelled.',
  BOOKING_ALREADY_PAID: 'That booking is already paid.',
  INVALID_BOOKING_STATUS: 'That booking can no longer be changed.',
  BOOKING_CLOSED: 'That booking has finished, so it can no longer be changed.',
  COUPON_INVALID: 'That coupon code is not valid for this booking.',
  COUPON_NOT_FOUND: 'No coupon matches that code.',
  COUPON_NOT_APPLICABLE: 'That coupon does not apply to this vehicle or duration.',
  COUPON_MIN_ORDER: 'That booking is too small for this coupon.',
  COUPON_EXPIRED: 'That coupon has expired.',
  COUPON_LIMIT_REACHED: 'That coupon has been used up.',
  COUPON_USER_LIMIT: 'You have already used that coupon.',
  COUPON_NO_BENEFIT: 'That coupon would not reduce this booking at all.',
  INVALID_COUPON_WINDOW: 'That coupon does not cover your dates.',

  PAYMENT_AMOUNT_MISMATCH: 'The amount charged does not match the booking total.',
  PAYMENT_PROVIDER_NOT_CONFIGURED:
    'Online payment is not switched on for this API yet. The booking is reserved — pay at pick-up.',
  PAYMENT_GATEWAY_UNREACHABLE: 'The payment gateway could not be reached. Your booking stays reserved.',
  PAYMENT_GATEWAY_ERROR: 'The payment gateway refused that attempt. Your booking stays reserved.',
  IDEMPOTENCY_KEY_REUSED: 'That payment attempt was already made with a different amount.',
  INVALID_CREDENTIALS: 'That e-mail and password do not match an account.',
  INVALID_PASSWORD: 'That current password is not right.',
  EMAIL_NOT_VERIFIED: 'Verify your e-mail address before booking.',
  EMAIL_TAKEN: 'An account already exists with that e-mail address.',
  INVALID_OTP: 'That code is not right or has expired.',
  INVALID_REFRESH_TOKEN: 'Your session has ended. Sign in again.',
  REFRESH_TOKEN_REUSED: 'Your session was signed in elsewhere. Sign in again.',
  ACCOUNT_INACTIVE: 'This account is not active. Contact SavariGo support.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Contact SavariGo support.',
  RATE_LIMITED: 'Too many attempts. Wait a moment before trying again.',
  UNAUTHORIZED: 'Sign in to continue.',
  FORBIDDEN: 'You do not have access to that.',
  NOT_FOUND: 'We could not find what you were looking for.',
  VALIDATION_ERROR: 'Check the highlighted fields.',
};

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const friendly = FRIENDLY[error.code];
    if (friendly) return friendly;
    const firstInvalid = error.validationMessages[0];
    return firstInvalid ?? error.message;
  }
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError when the request never got a response.
    return 'Cannot reach the SavariGo API. Check that the app and the API are on the same network.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export function isPaginated<T>(value: unknown): value is { data: T[]; meta: PageMeta } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { data?: unknown }).data) &&
    typeof (value as { meta?: unknown }).meta === 'object'
  );
}
