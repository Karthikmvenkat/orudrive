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

export type TransmissionValue = "AUTOMATIC" | "MANUAL";
export type FuelValue = "PETROL" | "DIESEL" | "ELECTRIC" | "CNG" | "HYBRID";
export type VehicleStatusValue =
  | "DRAFT"
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "MAINTENANCE"
  | "RETIRED";

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
  luggageCapacity: number | null;
  ac: boolean | null;
  depositAmount: number;
  pricePerDay: number;
  category: CatalogRef;
  location: CatalogRef & { city: string; address: string };
  primaryImage: ApiVehicleImage | null;
  images: ApiVehicleImage[];
  pricing: ApiPricingPlan[];
  registrationNumber?: string;
  owner?: { id: string; email: string };
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

export type RoleName = "CUSTOMER" | "DRIVER" | "VENDOR" | "SUPPORT" | "ADMIN";

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
  tokenType: "Bearer";
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
    purpose: "EMAIL_VERIFICATION";
    expiresInMinutes: number;
    devCode?: string;
  };
}

export interface ApiOtpVerificationResponse {
  success?: boolean;
  message?: string;
  user?: SessionUser;
  [key: string]: unknown;
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

export type ApiBookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ApiPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface ApiBookingAmounts {
  rentalAmount: number;
  extrasAmount: number;
  taxAmount: number;
  depositAmount: number;
  discountAmount: number;
  totalAmount: number;
  subtotal: number;
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
  dropLocation: ApiBooking["pickupLocation"] | null;
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

export interface ApiPayment {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  bookingStatus?: string;
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
    processedAt: string | null;
    createdAt: string;
  }[];
}

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
  pickupLocation: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    phone: string | null;
  };
  dropLocationId: string | null;
  driver: { id: string | null; fullName?: string; dailyRate?: number; requested?: boolean } | null;
  pricing: {
    baseDayRate: number;
    grossRentalAmount: number;
    durationDiscount: number;
    rentalAmount: number;
    extrasAmount: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    depositAmount: number;
    totalAmount: number;
    durationDays: number;
    coupon: { code: string; discount: number } | null;
  };
}

export interface ApiCoupon {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  appliesTo?: string | null;
  [key: string]: unknown;
}

export interface ApiReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
  customer?: { fullName: string | null; avatarUrl: string | null };
  vehicle?: { id: string; name: string; slug: string };
  booking?: { code: string };
  [key: string]: unknown;
}

export interface ApiNotification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface ApiOrderResponse {
  paymentId: string;
  bookingId: string;
  bookingCode: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId?: string;
  order: {
    id: string | null;
    amount: number;
    currency: string;
    status: ApiPaymentStatus;
  };
}

export interface AdminOverview {
  users: { total: number; customers: number; drivers: number; verifiedDrivers: number };
  vehicles: { total: number; byStatus: Record<string, number> };
  bookings: { total: number; byStatus: Record<string, number> };
  revenue: { collected: number; refunded: number; net: number; currency: string };
  partners: { total: number; byStatus: Record<string, number> };
  attention: {
    pendingDriverVerification: number;
    pendingLicenceChecks: number;
    pendingPayments: number;
    pendingPartnerApprovals: number;
    pendingDocuments: number;
    openTickets: number;
  };
  monthly: { month: string; revenue: number; bookings: number }[];
  recentBookings: {
    id: string;
    code: string;
    status: ApiBookingStatus;
    paymentStatus: ApiPaymentStatus;
    totalAmount: number;
    pickupAt: string;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    vehicleName: string;
  }[];
  recentPartners: {
    id: string;
    userId: string;
    partnerCode: string;
    tradingName: string;
    city: string;
    status: PartnerStatusValue;
    email: string;
    vehicles: number;
    createdAt: string;
  }[];
}

export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type DriverVerification =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export interface AdminDriverItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  accountStatus: string;
  licenceNumber: string;
  licenceExpiry: string;
  experienceYears: number;
  languages: string[];
  bio: string | null;
  verificationStatus: DriverVerification;
  rating: number;
  totalTrips: number;
  hourlyRate: number;
  dailyRate: number;
  isAvailable: boolean;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewItem {
  id: string;
  bookingId: string;
  vehicleId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isPublished: boolean;
  customerName: string;
  customerAvatar: string | null;
  bookingCode: string;
  vehicle: { id: string; slug: string; name: string; image: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  validFrom: string | null;
  validTill: string;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  remainingUses: number | null;
  isActive: boolean;
  appliesTo: CatalogRef[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentItem extends ApiPayment {
  customerEmail: string | null;
}

export interface AdminSettingItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface AdminRoleItem {
  id: string;
  name: RoleName;
  description: string | null;
  isSystem: boolean;
  users: number;
  permissions: {
    id: string;
    key: string;
    group: string;
    description: string | null;
  }[];
}

export interface ApiDriver {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email?: string;
  city: string | null;
  licenceNumber: string;
  verificationStatus: string;
  rating: number;
  totalTrips: number;
  dailyRate: number;
  experienceYears: number;
  isAvailable: boolean;
  createdAt: string;
  [key: string]: unknown;
}

// -------------------------------------------------------------- partner portal

export type PartnerStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type DocumentKindValue =
  | "KYC"
  | "BUSINESS_REGISTRATION"
  | "GST"
  | "VEHICLE_RC"
  | "INSURANCE"
  | "PERMISSION"
  | "OTHER";

export type DocumentStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type TicketStatusValue = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type TicketPriorityValue = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TicketCategoryValue =
  | "BOOKING"
  | "PAYMENT"
  | "VEHICLE"
  | "PARTNER"
  | "ACCOUNT"
  | "OTHER";

export interface AdminPartnerItem {
  id: string;
  userId: string;
  partnerCode: string;
  tradingName: string;
  legalName: string | null;
  logoUrl: string | null;
  phone: string | null;
  city: string;
  state: string;
  addressLine1: string | null;
  gstin: string | null;
  commissionPercent: number;
  status: PartnerStatusValue;
  decisionNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  userStatus: string | null;
  lastLoginAt: string | null;
  joinedAt: string | null;
  vehicles: number;
  available: number;
  bookings: number;
  revenue: number;
}

export interface AdminPartnerVehicle {
  id: string;
  name: string;
  slug: string;
  registrationNumber: string | null;
  status: VehicleStatusValue;
  category: string;
  location: string;
  city: string;
  fromPrice: number;
}

export interface AdminPartnerDocument {
  id: string;
  kind: DocumentKindValue;
  title: string;
  status: DocumentStatusValue;
  url: string;
  expiresAt: string | null;
}

export interface AdminPartnerDetail extends Omit<AdminPartnerItem, "vehicles"> {
  openTickets: number;
  vehicles: AdminPartnerVehicle[];
  documents: AdminPartnerDocument[];
}

export interface AdminDocumentItem {
  id: string;
  kind: DocumentKindValue;
  title: string;
  reference: string | null;
  url: string;
  hasFile: boolean;
  fileName: string | null;
  fileMediaType: string | null;
  fileSizeBytes: number | null;
  status: DocumentStatusValue;
  expiresAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  createdAt: string;
  vendorId: string;
  partnerCode: string;
  vendorName: string;
  vendorCity: string;
  vendorEmail: string;
  vehicleId: string | null;
  vehicleName: string | null;
  registrationNumber: string | null;
}

export interface SupportTicketMessage {
  id: string;
  body: string;
  isFromStaff: boolean;
  authorEmail: string | null;
  createdAt: string;
}

export interface AdminTicketItem {
  id: string;
  code: string;
  subject: string;
  category: TicketCategoryValue;
  priority: TicketPriorityValue;
  status: TicketStatusValue;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  customerName: string | null;
  customerEmail: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  bookingId: string | null;
  bookingCode: string | null;
  messageCount: number;
  lastMessage: string;
  messages: SupportTicketMessage[];
}

export interface SupportTicketCounts {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byStatus: Record<string, number>;
}

export interface AdminReportSummary {
  range: { days: number; group: string; from: string; to: string };
  settlement: {
    partnerEarnings: number;
    platformCommission: number;
    pendingSettlement: number;
    settled: number;
  };
  totals: {
    bookings: number;
    collected: number;
    refunded: number;
    net: number;
    rentalValue: number;
    averageBookingValue: number;
    cancelled: number;
    vehicles: number;
    availableVehicles: number;
    customers: number;
    drivers: number;
    partners: number;
  };
  series: { label: string; bookings: number; collected: number }[];
  cityPerformance: { city: string; bookings: number; collected: number; vehicles: number }[];
  partnerPerformance: {
    ownerId: string;
    partnerCode: string | null;
    tradingName: string;
    city: string | null;
    status: PartnerStatusValue | null;
    commissionPercent: number;
    vehicles: number;
    available: number;
    bookings: number;
    collected: number;
    payout: number;
    openPayout: number;
  }[];
  vehiclePopularity: {
    name: string;
    slug: string;
    bookings: number;
    collected: number;
    rating: number;
  }[];
  categoryMix: { category: string; bookings: number; collected: number }[];
}

export interface VendorOverview {
  partner: {
    id: string;
    partnerCode: string;
    tradingName: string;
    status: PartnerStatusValue;
    commissionPercent: number;
    city: string;
  };
  vehicles: { total: number; available: number; byStatus: Record<string, number> };
  bookings: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    byStatus: Record<string, number>;
  };
  earnings: {
    currency: string;
    commissionPercent: number;
    monthGross: number;
    monthCommission: number;
    monthNet: number;
    totalGross: number;
    totalNet: number;
  };
  reviews: { count: number; average: number };
  pendingApprovals: number;
  recentBookings: VendorBookingItem[];
}

export interface VendorBookingItem {
  id: string;
  code: string;
  status: ApiBookingStatus;
  paymentStatus: ApiPaymentStatus;
  pickupAt: string;
  returnAt: string;
  durationDays: number;
  rentalAmount: number;
  taxAmount: number;
  depositAmount: number;
  discountAmount: number;
  totalAmount: number;
  specialRequests: string | null;
  createdAt: string;
  cancelledAt: string | null;
  customerName: string;
  customerEmail: string;
  vehicle: {
    id: string;
    name: string;
    slug: string;
    registrationNumber: string | null;
    category: string;
  };
  pickupLocation: string;
  dropLocation: string | null;
  driverName: string | null;
  couponCode: string | null;
  paidAmount: number;
}

export interface VendorEarnings {
  currency: string;
  partner: { partnerCode: string; tradingName: string; commissionPercent: number };
  lifetime: { gross: number; commission: number; net: number; refunded: number };
  monthly: { month: string; gross: number; commission: number; net: number }[];
  transactions: {
    id: string;
    bookingId: string;
    bookingCode: string;
    vehicleName: string;
    amount: number;
    bookingTotal: number;
    provider: string;
    method: string;
    paidAt: string | null;
  }[];
}

export interface VendorAvailability {
  from: string;
  to: string;
  vehicles: { id: string; name: string; slug: string; status: VehicleStatusValue }[];
  rows: {
    id: string;
    vehicleId: string;
    startsAt: string;
    endsAt: string;
    status: string;
    note: string | null;
    bookingId: string | null;
  }[];
}

export interface VendorProfile {
  id: string;
  partnerCode: string;
  tradingName: string;
  legalName: string | null;
  logoUrl: string | null;
  phone: string | null;
  city: string;
  state: string;
  addressLine1: string | null;
  gstin: string | null;
  commissionPercent: number;
  status: PartnerStatusValue;
  decisionNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  email: string;
  roles: string[];
}

export type NotificationTypeValue =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_RECEIVED"
  | "REFUND_PROCESSED"
  | "PICKUP_REMINDER"
  | "OFFER"
  | "SYSTEM";

export type NotificationChannelValue = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export interface VendorReviews {
  summary: { count: number; average: number };
  spread: { stars: number; count: number }[];
  perVehicle: { id: string; name: string; slug: string; count: number; average: number }[];
  items: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
    bookingCode: string;
    vehicleName: string;
    vehicleSlug: string;
    customerName: string;
  }[];
}

export interface AdminNotificationItem {
  id: string;
  type: NotificationTypeValue;
  channel: NotificationChannelValue;
  title: string;
  body: string;
  status: string;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
  userEmail: string;
  metadata: Record<string, unknown> | null;
}
