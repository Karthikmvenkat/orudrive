/**
 * Response contract of the SavariGo API, as the mobile client consumes it.
 * Mirrors `apps/web/src/lib/api/types.ts` (same field names, same optionality)
 * so a screen cannot disagree with the website about what the server sent.
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type TransmissionValue = 'AUTOMATIC' | 'MANUAL';
export type FuelValue = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'CNG' | 'HYBRID';
export type VehicleStatusValue =
  | 'DRAFT'
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'MAINTENANCE'
  | 'RETIRED';

export type VehicleSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface ApiVehicleImage {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CatalogRef {
  id: string;
  slug: string;
  name: string;
}

export interface ApiPricingPlan {
  id: string;
  name: string;
  baseDayRate: number;
  extraKmRate: number;
  depositAmount: number;
  mileageLimitKm: number | null;
  minDays: number;
  weeklyDiscountPercent: number | null;
  monthlyDiscountPercent: number | null;
  currency: string;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
}

export interface ApiVehicle {
  id: string;
  slug: string;
  name: string;
  brand: string;
  year: number;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  seats: number;
  engine: string;
  mileage: string;
  description: string;
  status: VehicleStatusValue;
  rating: number;
  reviewCount: number;
  popular: boolean;
  mileageLimitKm: number | null;
  depositAmount: number;
  pricePerDay: number;
  category: CatalogRef;
  location: CatalogRef & { city: string; address: string };
  primaryImage: ApiVehicleImage | null;
  images: ApiVehicleImage[];
  pricing: ApiPricingPlan[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  vehicleCount: number;
  fromPrice: number;
}

export interface ApiLocation {
  id: string;
  name: string;
  slug: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  opensAt: string;
  closesAt: string;
  isActive: boolean;
  vehicleCount: number;
  fromPrice: number;
}

export type BookingItemKind =
  | 'VEHICLE_RENTAL'
  | 'DELIVERY'
  | 'HELMET'
  | 'DRIVER'
  | 'INSURANCE'
  | 'OTHER';

export type RoleName = 'CUSTOMER' | 'DRIVER' | 'VENDOR' | 'SUPPORT' | 'ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  fullName: string | null;
  roles: RoleName[];
  createdAt: string;
}

export interface ApiAuthResponse {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: SessionUser;
}

export interface ApiRegisterResponse {
  user: SessionUser;
  message: string;
  verification: {
    purpose: 'EMAIL_VERIFICATION';
    expiresInMinutes: number;
    devCode?: string;
  };
}

export interface ApiMe {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: RoleName[];
  customerProfile: ApiCustomerProfile | null;
  driverProfile: {
    id: string;
    verificationStatus: string;
    rating: number;
    totalTrips: number;
    isAvailable: boolean;
  } | null;
  addresses: {
    id: string;
    label: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
  }[];
}

export interface ApiCustomerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  dateOfBirth: string | null;
  licenceNumber: string | null;
  licenceExpiry: string | null;
  licenceVerifiedAt: string | null;
  avatarUrl: string | null;
  city: string | null;
  preferences: unknown;
  totalBookings: number;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

export type ApiBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ApiPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface ApiBookingAmounts {
  rentalAmount: number;
  extrasAmount: number;
  taxAmount: number;
  depositAmount: number;
  discountAmount: number;
  totalAmount: number;
  subtotal: number;
}

/**
 * Shared by `GET /payments` (full row) and the `payments` array embedded in a
 * booking (which omits the back-references). The optional fields are the ones
 * only the standalone endpoint sends.
 */
export interface ApiPayment {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  bookingStatus?: ApiBookingStatus;
  provider: string;
  method: string | null;
  amount: number;
  currency?: string;
  status: ApiPaymentStatus;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  failureCode?: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt?: string;
  refunds?: {
    id: string;
    amount: number;
    status: string;
    reason: string | null;
    providerRefundId?: string | null;
    processedAt: string | null;
    createdAt: string;
  }[];
}

export interface ApiBooking {
  id: string;
  code: string;
  status: ApiBookingStatus;
  paymentStatus: ApiPaymentStatus;
  pickupAt: string;
  returnAt: string;
  durationDays: number;
  currency: string;
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    licenceNumber: string | null;
    licenceVerified: boolean;
  };
  vehicle: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    category: string;
    image: string | null;
    location: { id: string; name: string; city: string };
  };
  pickupLocation: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    phone: string | null;
  };
  dropLocation: ApiBooking['pickupLocation'] | null;
  driver: {
    id: string;
    fullName: string;
    rating: number;
    totalTrips: number;
    phone: string | null;
  } | null;
  coupon: { code: string; title: string; type: string; value: number } | null;
  amounts: ApiBookingAmounts;
  items: {
    id: string;
    kind: string;
    label: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
  payments: ApiPayment[];
  review: { id: string; rating: number } | null;
  specialRequests: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `BookingsService.quote()` in `apps/api/src/bookings/bookings.service.ts`. */
export interface ApiQuote {
  vehicle: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    category: string;
    image: string | null;
  };
  pickupAt: string;
  returnAt: string;
  durationDays: number;
  pickupLocation: { id: string; name: string; address: string };
  dropLocationId: string | null;
  driver: {
    id: string | null;
    fullName?: string;
    dailyRate?: number;
    requested?: boolean;
  } | null;
  pricing: {
    baseDayRate: number;
    grossRentalAmount: number;
    durationDiscount: number;
    rentalAmount: number;
    extrasAmount: number;
    subtotal: number;
    coupon: { code: string; discount: number } | null;
    discountAmount: number;
    taxPercent: number;
    taxAmount: number;
    depositAmount: number;
    totalAmount: number;
    currency: string;
  };
  items: {
    kind: BookingItemKind;
    label: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
}

/** `GET /vehicles/:id/availability` answers with the whole window, not a row list. */
export interface ApiAvailability {
  vehicleId: string;
  from: string;
  to: string;
  isAvailable: boolean;
  ranges: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    note: string | null;
  }[];
}

/** What `POST /coupons/validate` echoes back — the preview shape, not the admin row. */
export interface ApiCoupon {
  id: string;
  code: string;
  title: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  validTill: string;
}

export interface ApiNotification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: string;
}

/** Public row from `ReviewsService.serialize()`; the staff-only fields are absent. */
export interface ApiReview {
  id: string;
  bookingId: string;
  vehicleId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isPublished: boolean;
  customerName: string;
  customerAvatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiVehicleReviews {
  vehicle: { id: string; slug: string; name: string };
  summary: {
    average: number;
    total: number;
    distribution: Record<string, number>;
  };
  data: ApiReview[];
  meta: PageMeta;
}
