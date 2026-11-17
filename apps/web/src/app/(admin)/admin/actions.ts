"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import { staffRequest } from "@/lib/api/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function number(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function bool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function isoDate(formData: FormData, key: string, endOfDay = false) {
  const raw = text(formData, key);
  if (!raw) return undefined;
  return `${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+05:30`;
}

function safePath(formData: FormData) {
  const raw = String(formData.get("redirectTo") ?? "/admin");
  return raw.startsWith("/admin") ? raw : "/admin";
}

function withMessage(path: string, key: "notice" | "error", message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("notice");
  params.delete("error");
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

async function run(
  formData: FormData,
  action: () => Promise<unknown>,
  successMessage = "Changes saved",
  failureMessage = "Could not save changes",
) {
  const path = safePath(formData);
  try {
    await action();
    revalidatePath(path.split("?")[0]);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(withMessage(path, "error", errorMessage(error) || failureMessage));
  }
  redirect(withMessage(path, "notice", successMessage));
}

// ---------------------------------------------------------------- bookings

export async function updateBookingStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(formData, () =>
    staffRequest(`/bookings/${id}/status`, {
      method: "PATCH",
      body: { status, note: text(formData, "note") },
    }),
  "Booking status updated",
  "Could not update booking status",
  );
}

export async function assignBookingDriver(formData: FormData) {
  const id = text(formData, "id");
  const driverId = text(formData, "driverId") ?? null;
  await run(formData, () =>
    staffRequest(`/bookings/${id}/driver`, {
      method: "PATCH",
      body: { driverId },
    }),
  driverId ? "Driver assigned" : "Driver assignment cleared",
  "Could not assign driver",
  );
}

export async function cancelManagedBooking(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/bookings/${id}/cancel`, {
      method: "POST",
      body: { reason: text(formData, "reason") },
    }),
  "Booking cancelled",
  "Could not cancel booking",
  );
}

// ---------------------------------------------------------------- vehicles

export async function createVehicle(formData: FormData) {
  const name = text(formData, "name");
  const depositAmount = number(formData, "depositAmount") ?? 0;
  // The cap is stored on both the vehicle and the plan: the detail page reads
  // the vehicle, the plans tab reads the plan, and they must not disagree.
  const mileageLimitKm = number(formData, "mileageLimitKm");
  const weeklyDiscountPercent = number(formData, "weeklyDiscountPercent");
  const monthlyDiscountPercent = number(formData, "monthlyDiscountPercent");
  const slug = text(formData, "slug");
  const imageUrl = text(formData, "imageUrl");
  const imageAlt = text(formData, "imageAlt");

  await run(
    formData,
    () =>
      staffRequest("/vehicles", {
        method: "POST",
        body: {
          ...(slug ? { slug } : {}),
          name,
          brand: text(formData, "brand"),
          categoryId: text(formData, "categoryId"),
          locationId: text(formData, "locationId"),
          registrationNumber: text(formData, "registrationNumber"),
          year: number(formData, "year") ?? new Date().getFullYear(),
          transmission: text(formData, "transmission") ?? "AUTOMATIC",
          fuelType: text(formData, "fuelType") ?? "PETROL",
          seats: number(formData, "seats") ?? 2,
          engine: text(formData, "engine"),
          mileage: text(formData, "mileage"),
          description: text(formData, "description"),
          status: text(formData, "status") ?? "DRAFT",
          popular: bool(formData, "popular"),
          ...(mileageLimitKm === undefined ? {} : { mileageLimitKm }),
          depositAmount,
          ...(imageUrl
            ? { images: [{ url: imageUrl, alt: imageAlt ?? `${name} photo`, isPrimary: true }] }
            : {}),
          pricing: {
            name: text(formData, "planName") ?? "Standard",
            baseDayRate: number(formData, "baseDayRate") ?? 0,
            extraKmRate: number(formData, "extraKmRate") ?? 0,
            depositAmount,
            minDays: number(formData, "minDays") ?? 1,
            ...(mileageLimitKm === undefined ? {} : { mileageLimitKm }),
            ...(weeklyDiscountPercent === undefined ? {} : { weeklyDiscountPercent }),
            ...(monthlyDiscountPercent === undefined ? {} : { monthlyDiscountPercent }),
            ...(isoDate(formData, "validFrom") ? { validFrom: isoDate(formData, "validFrom") } : {}),
            ...(isoDate(formData, "validTo", true)
              ? { validTo: isoDate(formData, "validTo", true) }
              : {}),
          },
        },
      }),
    "Vehicle created",
    "Could not create vehicle",
  );
}

export async function updateVehicle(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      staffRequest(`/vehicles/${id}`, {
        method: "PATCH",
        body: {
          name: text(formData, "name"),
          brand: text(formData, "brand"),
          year: number(formData, "year"),
          seats: number(formData, "seats"),
          engine: text(formData, "engine"),
          mileage: text(formData, "mileage"),
          description: text(formData, "description"),
          depositAmount: number(formData, "depositAmount"),
          status: text(formData, "status"),
        },
      }),
    "Vehicle updated",
    "Could not update vehicle",
  );
}

export async function setVehicleStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(formData, () =>
    staffRequest(`/vehicles/${id}`, { method: "PATCH", body: { status } }),
  `Vehicle marked ${status?.toLowerCase()}`,
  "Could not update vehicle status",
  );
}

export async function updateVehiclePricing(formData: FormData) {
  const id = text(formData, "pricingId");
  await run(
    formData,
    () =>
      staffRequest(`/pricing/${id}`, {
        method: "PATCH",
        body: {
          baseDayRate: number(formData, "baseDayRate"),
          extraKmRate: number(formData, "extraKmRate"),
          depositAmount: number(formData, "depositAmount"),
          minDays: number(formData, "minDays"),
          weeklyDiscountPercent: number(formData, "weeklyDiscountPercent"),
          monthlyDiscountPercent: number(formData, "monthlyDiscountPercent"),
        },
      }),
    "Pricing updated",
    "Could not update pricing",
  );
}

export async function retireVehicle(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/vehicles/${id}`, { method: "DELETE" }),
  "Vehicle retired",
  "Could not retire vehicle",
  );
}

// ---------------------------------------------------------------- categories

export async function createCategory(formData: FormData) {
  await run(
    formData,
    () =>
      staffRequest("/categories", {
        method: "POST",
        body: {
          name: text(formData, "name"),
          tagline: text(formData, "tagline"),
          description: text(formData, "description"),
          imageUrl: text(formData, "imageUrl"),
          sortOrder: number(formData, "sortOrder") ?? 0,
          isActive: bool(formData, "isActive"),
        },
      }),
    "Category created",
    "Could not create category",
  );
}

export async function setCategoryActive(formData: FormData) {
  const id = text(formData, "id");
  const isActive = bool(formData, "active");
  await run(formData, () =>
    staffRequest(`/categories/${id}`, { method: "PATCH", body: { isActive } }),
  isActive ? "Category activated" : "Category deactivated",
  "Could not update category",
  );
}

export async function deleteCategory(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/categories/${id}`, { method: "DELETE" }),
  "Category deleted",
  "Could not delete category",
  );
}

// ---------------------------------------------------------------- locations

export async function createLocation(formData: FormData) {
  await run(
    formData,
    () =>
      staffRequest("/locations", {
        method: "POST",
        body: {
          name: text(formData, "name"),
          addressLine1: text(formData, "addressLine1"),
          addressLine2: text(formData, "addressLine2"),
          city: text(formData, "city"),
          state: text(formData, "state"),
          postalCode: text(formData, "postalCode"),
          phone: text(formData, "phone"),
          opensAt: text(formData, "opensAt"),
          closesAt: text(formData, "closesAt"),
          isActive: bool(formData, "isActive"),
        },
      }),
    "Hub created",
    "Could not create hub",
  );
}

export async function setLocationActive(formData: FormData) {
  const id = text(formData, "id");
  const isActive = bool(formData, "active");
  await run(formData, () =>
    staffRequest(`/locations/${id}`, { method: "PATCH", body: { isActive } }),
  isActive ? "Hub activated" : "Hub deactivated",
  "Could not update hub",
  );
}

export async function deleteLocation(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/locations/${id}`, { method: "DELETE" }),
  "Hub deleted",
  "Could not delete hub",
  );
}

// ---------------------------------------------------------------- payments

export async function refundPayment(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/payments/${id}/refund`, {
      method: "POST",
      body: {
        amount: number(formData, "amount"),
        reason: text(formData, "reason"),
      },
    }),
  "Refund queued",
  "Could not refund payment",
  );
}

// ---------------------------------------------------------------- coupons

export async function createCoupon(formData: FormData) {
  const usageLimit = number(formData, "usageLimit");
  await run(
    formData,
    () =>
      staffRequest("/coupons", {
        method: "POST",
        body: {
          code: text(formData, "code"),
          title: text(formData, "title"),
          description: text(formData, "description"),
          type: text(formData, "type") ?? "FLAT",
          value: number(formData, "value") ?? 0,
          maxDiscount: number(formData, "maxDiscount"),
          minOrderAmount: number(formData, "minOrderAmount"),
          validFrom: isoDate(formData, "validFrom"),
          validTill: isoDate(formData, "validTill", true),
          usageLimit,
          perUserLimit: number(formData, "perUserLimit") ?? 1,
          isActive: bool(formData, "isActive"),
          categoryIds: formData
            .getAll("categoryIds")
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        },
      }),
    "Coupon created",
    "Could not create coupon",
  );
}

export async function updateCoupon(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      staffRequest(`/coupons/${id}`, {
        method: "PATCH",
        body: {
          title: text(formData, "title"),
          value: number(formData, "value"),
          minOrderAmount: number(formData, "minOrderAmount"),
          maxDiscount: number(formData, "maxDiscount"),
          validTill: isoDate(formData, "validTill", true),
          isActive: bool(formData, "isActive"),
        },
      }),
    "Coupon updated",
    "Could not update coupon",
  );
}

export async function deleteCoupon(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/coupons/${id}`, { method: "DELETE" }),
  "Coupon deactivated",
  "Could not deactivate coupon",
  );
}

// ---------------------------------------------------------------- drivers

export async function setDriverVerification(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(formData, () =>
    staffRequest(`/drivers/${id}/verification`, {
      method: "PATCH",
      body: { status },
    }),
  `Driver marked ${status?.toLowerCase()}`,
  "Could not update driver",
  );
}

// ---------------------------------------------------------------- reviews

export async function moderateReview(formData: FormData) {
  const id = text(formData, "id");
  const isPublished = bool(formData, "published");
  await run(formData, () =>
    staffRequest(`/reviews/${id}`, {
      method: "PATCH",
      body: { isPublished },
    }),
  isPublished ? "Review published" : "Review hidden",
  "Could not moderate review",
  );
}

export async function deleteReview(formData: FormData) {
  const id = text(formData, "id");
  await run(formData, () =>
    staffRequest(`/reviews/${id}`, { method: "DELETE" }),
  "Review deleted",
  "Could not delete review",
  );
}

// ---------------------------------------------------------------- settings

function parsedSetting(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export async function updateSetting(formData: FormData) {
  const key = text(formData, "key");
  const raw = text(formData, "value") ?? "";
  await run(
    formData,
    () =>
      staffRequest(`/admin/settings/${encodeURIComponent(key ?? "")}`, {
        method: "PUT",
        body: { value: parsedSetting(raw), description: text(formData, "description") },
      }),
    "Setting saved",
    "Could not save setting",
  );
}

// ---------------------------------------------------------------- partners

export async function createPartner(formData: FormData) {
  const commissionPercent = number(formData, "commissionPercent");
  await run(
    formData,
    () =>
      staffRequest("/admin/partners", {
        method: "POST",
        body: {
          tradingName: text(formData, "tradingName"),
          email: text(formData, "email"),
          password: text(formData, "password"),
          legalName: text(formData, "legalName"),
          phone: text(formData, "phone"),
          city: text(formData, "city"),
          state: text(formData, "state"),
          addressLine1: text(formData, "addressLine1"),
          gstin: text(formData, "gstin"),
          logoUrl: text(formData, "logoUrl"),
          ...(commissionPercent === undefined ? {} : { commissionPercent }),
        },
      }),
    "Rental partner created",
    "Could not create rental partner",
  );
}

export async function updatePartner(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      staffRequest(`/admin/partners/${id}`, {
        method: "PATCH",
        body: {
          tradingName: text(formData, "tradingName"),
          legalName: text(formData, "legalName"),
          phone: text(formData, "phone"),
          city: text(formData, "city"),
          state: text(formData, "state"),
          addressLine1: text(formData, "addressLine1"),
          gstin: text(formData, "gstin"),
          logoUrl: text(formData, "logoUrl"),
        },
      }),
    "Partner details updated",
    "Could not update partner details",
  );
}

export async function setPartnerStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(
    formData,
    () =>
      staffRequest(`/admin/partners/${id}/status`, {
        method: "PATCH",
        body: { status, note: text(formData, "note") },
      }),
    `Partner marked ${status?.toLowerCase()}`,
    "Could not update partner status",
  );
}

export async function setPartnerCommission(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      staffRequest(`/admin/partners/${id}/commission`, {
        method: "PATCH",
        body: { percent: number(formData, "percent") },
      }),
    "Commission updated",
    "Could not update commission",
  );
}

// ---------------------------------------------------------------- documents

export async function verifyDocument(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(
    formData,
    () =>
      staffRequest(`/admin/documents/${id}`, {
        method: "PATCH",
        body: { status, note: text(formData, "note") },
      }),
    `Document marked ${status?.toLowerCase()}`,
    "Could not verify document",
  );
}

// ---------------------------------------------------------------- support

export async function replyTicket(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      staffRequest(`/admin/tickets/${id}/replies`, {
        method: "POST",
        body: { body: text(formData, "body") },
      }),
    "Reply sent",
    "Could not send reply",
  );
}

export async function updateTicket(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(
    formData,
    () =>
      staffRequest(`/admin/tickets/${id}`, {
        method: "PATCH",
        body: { status, priority: text(formData, "priority") },
      }),
    `Ticket marked ${status?.toLowerCase()}`,
    "Could not update ticket",
  );
}

// ---------------------------------------------------------------- notifications

export async function broadcastNotification(formData: FormData) {
  const audience = text(formData, "role");
  await run(
    formData,
    () =>
      staffRequest("/notifications/broadcast", {
        method: "POST",
        body: {
          ...(audience ? { role: audience } : {}),
          title: text(formData, "title"),
          body: text(formData, "body"),
          type: text(formData, "type") ?? "SYSTEM",
          channel: text(formData, "channel") ?? "IN_APP",
        },
      }),
    "Notification sent",
    "Could not send notification",
  );
}

