import { apiRequest } from "./http";
import type {
  ApiBooking,
  ApiCustomerProfile,
  ApiNotification,
  ApiPayment,
  Paginated,
} from "./types";

export async function myBookings(token: string, limit = 50): Promise<ApiBooking[]> {
  const page = await apiRequest<Paginated<ApiBooking>>("/bookings/me", {
    token,
    query: { limit },
    cache: "no-store",
  });
  return page.data;
}

export async function myBooking(token: string, idOrCode: string): Promise<ApiBooking | null> {
  try {
    return await apiRequest<ApiBooking>(
      `/bookings/me/${encodeURIComponent(idOrCode)}`,
      { token, cache: "no-store" },
    );
  } catch {
    return null;
  }
}

export async function myPayments(token: string, limit = 100): Promise<ApiPayment[]> {
  const page = await apiRequest<Paginated<ApiPayment>>("/payments", {
    token,
    query: { limit },
    cache: "no-store",
  });
  return page.data;
}

export async function myNotifications(
  token: string,
  limit = 6,
): Promise<ApiNotification[]> {
  const page = await apiRequest<Paginated<ApiNotification>>("/notifications", {
    token,
    query: { limit },
    cache: "no-store",
  });
  return page.data;
}

export async function myCustomerProfile(
  token: string,
): Promise<ApiCustomerProfile | null> {
  try {
    return await apiRequest<ApiCustomerProfile>("/customers/me", {
      token,
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function cancelMyBooking(
  token: string,
  id: string,
  reason?: string,
): Promise<void> {
  await apiRequest(`/bookings/${id}/cancel`, {
    method: "POST",
    token,
    body: reason ? { reason } : {},
    cache: "no-store",
  });
}

export async function updateMyProfile(
  token: string,
  input: {
    fullName?: string;
    city?: string;
    licenceNumber?: string;
    phone?: string;
    preferences?: Record<string, unknown>;
  },
): Promise<void> {
  const { phone, ...profile } = input;
  if (Object.keys(profile).length > 0) {
    await apiRequest("/customers/me", {
      method: "PATCH",
      token,
      body: profile,
      cache: "no-store",
    });
  }
  if (phone) {
    await apiRequest("/users/me", {
      method: "PATCH",
      token,
      body: { phone },
      cache: "no-store",
    });
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiRequest("/notifications/read-all", {
    method: "PATCH",
    token,
    cache: "no-store",
  });
}
