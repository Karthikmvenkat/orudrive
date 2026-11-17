import { api } from '@/lib/api/client';
import type {
  ApiAvailability,
  ApiAuthResponse,
  ApiBooking,
  ApiBookingStatus,
  ApiCategory,
  ApiCoupon,
  ApiCustomerProfile,
  ApiLocation,
  ApiMe,
  ApiNotification,
  ApiPayment,
  ApiPaymentStatus,
  ApiQuote,
  ApiRegisterResponse,
  ApiVehicle,
  ApiVehicleReviews,
  BookingItemKind,
  FuelValue,
  Paginated,
  TransmissionValue,
  VehicleSort,
} from '@/lib/api/types';

export type BookingInput = {
  vehicleId: string;
  pickupLocationId: string;
  dropLocationId?: string;
  pickupAt: string;
  returnAt: string;
  couponCode?: string;
  driverId?: string;
  requestDriver?: boolean;
  addOns?: BookingItemKind[];
  specialRequests?: string;
};

export type VehicleQuery = {
  q?: string;
  /** One category slug, or several separated by commas. */
  category?: string;
  location?: string;
  brand?: string;
  minRating?: number;
  availableNow?: boolean;
  minPrice?: number;
  maxPrice?: number;
  seats?: number;
  transmission?: TransmissionValue;
  fuelType?: FuelValue;
  popular?: boolean;
  sort?: VehicleSort;
  page?: number;
  limit?: number;
};

type Query = Record<string, string | number | boolean | undefined>;

export const authApi = {
  /** `devCode` is present when the API has no SMS gateway (non-production). */
  requestPhoneCode: (phone: string) =>
    api.request<{ message: string; expiresInMinutes: number; devCode?: string }>(
      '/auth/phone/request',
      { method: 'POST', body: { phone }, auth: false },
    ),

  verifyPhoneCode: (input: { phone: string; code: string }) =>
    api.request<ApiAuthResponse>('/auth/phone/verify', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  login: (input: { email: string; password: string }) =>
    api.request<ApiAuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),

  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    city?: string;
  }) =>
    api.request<ApiRegisterResponse>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  /** Called directly by the client on a 401; exposed so sign-out can revoke the token. */
  logout: (refreshToken: string) =>
    api.request<{ message?: string }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),

  verifyOtp: (input: {
    email: string;
    purpose: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION';
    code: string;
  }) =>
    api.request<{ message: string; success?: boolean }>('/auth/verify-otp', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  resendOtp: (input: { email: string; purpose: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' }) =>
    api.request<{ message: string }>('/auth/resend-otp', { method: 'POST', body: input, auth: false }),

  /** `devCode` is only present when the API runs with OTP delivery disabled. */
  forgotPassword: (email: string) =>
    api.request<{ message: string; devCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
    }),

  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    api.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) => api.request<{ message: string }>('/auth/change-password', { method: 'POST', body: input }),
};

export const accountApi = {
  me: () => api.request<ApiMe>('/users/me'),

  /** `PATCH /users/me` only accepts the phone the login is keyed to. */
  updateMe: (input: { phone?: string }) =>
    api.request<ApiMe>('/users/me', { method: 'PATCH', body: input }),

  profile: () => api.request<ApiCustomerProfile>('/customers/me'),

  updateProfile: (input: {
    fullName?: string;
    city?: string;
    dateOfBirth?: string;
    licenceNumber?: string;
    licenceExpiry?: string;
  }) => api.request<ApiCustomerProfile>('/customers/me', { method: 'PATCH', body: input }),
};

export const catalogueApi = {
  categories: () => api.request<ApiCategory[]>('/categories'),
  locations: () => api.request<ApiLocation[]>('/locations'),

  vehicles: (query: VehicleQuery = {}) =>
    api.requestPaged<ApiVehicle>('/vehicles', { query: query as Query }),

  vehicle: (idOrSlug: string) => api.request<ApiVehicle>(`/vehicles/${encodeURIComponent(idOrSlug)}`),

  availability: (vehicleId: string, window: { from?: string; to?: string } = {}) =>
    api.request<ApiAvailability>(`/vehicles/${encodeURIComponent(vehicleId)}/availability`, {
      query: window as Query,
    }),

  reviews: (idOrSlug: string, query: { page?: number; limit?: number } = {}) =>
    api.request<ApiVehicleReviews>(`/reviews/vehicle/${encodeURIComponent(idOrSlug)}`, {
      query: { limit: 20, ...query } as Query,
    }),
};

export const bookingApi = {
  /** Public: currently valid coupon codes, for the home banner and offers screen. */
  coupons: () => api.request<ApiCoupon[]>('/coupons', { auth: false }),

  quote: (input: BookingInput) =>
    api.request<ApiQuote>('/bookings/quote', { method: 'POST', body: input }),

  create: (input: BookingInput) => api.request<ApiBooking>('/bookings', { method: 'POST', body: input }),

  mine: (query: { status?: ApiBookingStatus; page?: number; limit?: number } = {}) =>
    api.requestPaged<ApiBooking>('/bookings/me', { query: query as Query }),

  detail: (idOrCode: string) =>
    api.request<ApiBooking>(`/bookings/me/${encodeURIComponent(idOrCode)}`),

  cancel: (id: string, reason?: string) =>
    api.request<ApiBooking>(`/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: reason ? { reason } : {},
    }),

  /** Throws on a coupon that does not apply; there is no `valid: false` body. */
  validateCoupon: (input: {
    code: string;
    vehicleId: string;
    durationDays?: number;
    subtotal?: number;
  }) =>
    api.request<{
      code: string;
      coupon: ApiCoupon;
      subtotal: number;
      discount: number;
      estimatedTotal: number;
    }>('/coupons/validate', { method: 'POST', body: input }),
};

export const paymentApi = {
  /**
   * Read-only on mobile: card and UPI capture happens on the web checkout,
   * which loads the gateway's own browser SDK. A native booking is reserved
   * with `paymentStatus: PENDING` and settled at the counter or from the site.
   */
  history: (query: { page?: number; limit?: number; status?: ApiPaymentStatus } = {}) =>
    api.request<Paginated<ApiPayment>>('/payments', { query: query as Query }),
};

export const notificationApi = {
  list: (query: { unread?: boolean; type?: string; page?: number; limit?: number } = {}) =>
    api.requestPaged<ApiNotification>('/notifications', { query: query as Query }),

  unreadCount: () => api.request<{ unread: number }>('/notifications/unread-count'),

  markAllRead: () =>
    api.request<{ success: boolean; updated: number }>('/notifications/read-all', { method: 'PATCH' }),

  markRead: (id: string) =>
    api.request<{ success: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    }),

  remove: (id: string) =>
    api.request<{ success: boolean }>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
