"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import { vendorRequest } from "@/lib/api/server";

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

function isoDate(formData: FormData, key: string, endOfDay = false) {
  const raw = text(formData, key);
  if (!raw) return undefined;
  return `${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+05:30`;
}

function safePath(formData: FormData) {
  const raw = String(formData.get("redirectTo") ?? "/partner");
  return raw.startsWith("/partner") ? raw : "/partner";
}

function withMessage(path: string, key: "notice" | "error", message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("notice");
  params.delete("error");
  params.set(key, message);
  return `${pathname}?${params.toString()}`;
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
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : failureMessage;
    redirect(withMessage(path, "error", message || failureMessage));
  }
  redirect(withMessage(path, "notice", successMessage));
}

// ------------------------------------------------------------------- fleet

/**
 * Partners always submit as DRAFT: the API rejects an AVAILABLE status from a
 * VENDOR token, so approval can only ever come from the Master Admin portal.
 */
export async function submitVehicleForApproval(formData: FormData) {
  const name = text(formData, "name");
  const depositAmount = number(formData, "depositAmount") ?? 0;
  const mileageLimitKm = number(formData, "mileageLimitKm");
  const slug = text(formData, "slug");

  // Step 3 collects up to ten photo links; the first one becomes the gallery hero.
  const photos = formData.getAll("photo").filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );

  await run(
    formData,
    () =>
      vendorRequest("/vehicles", {
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
          status: "DRAFT",
          ...(mileageLimitKm === undefined ? {} : { mileageLimitKm }),
          depositAmount,
          ...(photos.length > 0
            ? {
                images: photos.map((url, index) => ({
                  url: url.trim(),
                  alt: `${name} photo ${index + 1}`,
                  sortOrder: index,
                  isPrimary: index === 0,
                })),
              }
            : {}),
          pricing: {
            name: text(formData, "planName") ?? "Standard",
            baseDayRate: number(formData, "baseDayRate") ?? 0,
            extraKmRate: number(formData, "extraKmRate") ?? 0,
            depositAmount,
            minDays: number(formData, "minDays") ?? 1,
            ...(mileageLimitKm === undefined ? {} : { mileageLimitKm }),
            ...percentField(formData, "weeklyDiscountPercent"),
            ...percentField(formData, "monthlyDiscountPercent"),
            ...(isoDate(formData, "validFrom")
              ? { validFrom: isoDate(formData, "validFrom") }
              : {}),
            ...(isoDate(formData, "validTo", true)
              ? { validTo: isoDate(formData, "validTo", true) }
              : {}),
          },
        },
      }),
    "Submitted for Master Admin approval",
    "Could not submit this vehicle",
  );
}

/** Discount percentages are optional, and 0 is a valid answer worth sending. */
function percentField(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (raw === undefined) return {};
  const value = Number(raw);
  return Number.isFinite(value) ? { [key]: value } : {};
}

/** Going offline is always allowed; coming back online needs the admin. */
export async function setOwnVehicleStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  await run(
    formData,
    () => vendorRequest(`/vehicles/${id}`, { method: "PATCH", body: { status } }),
    `Vehicle marked ${status?.toLowerCase()}`,
    "Could not update this vehicle",
  );
}

export async function updateOwnVehicle(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      vendorRequest(`/vehicles/${id}`, {
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
        },
      }),
    "Vehicle updated",
    "Could not update this vehicle",
  );
}

export async function retireOwnVehicle(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () => vendorRequest(`/vehicles/${id}`, { method: "DELETE" }),
    "Vehicle retired from your fleet",
    "Could not retire this vehicle",
  );
}

// ----------------------------------------------------------------- documents

export async function uploadDocument(formData: FormData) {
  const vehicleId = text(formData, "vehicleId");
  await run(
    formData,
    () =>
      vendorRequest("/vendor/documents", {
        method: "POST",
        body: {
          kind: text(formData, "kind"),
          title: text(formData, "title"),
          url: text(formData, "url"),
          reference: text(formData, "reference"),
          ...(isoDate(formData, "expiresAt", true)
            ? { expiresAt: isoDate(formData, "expiresAt", true) }
            : {}),
          ...(vehicleId ? { vehicleId } : {}),
        },
      }),
    "Document submitted for verification",
    "Could not submit this document",
  );
}

// ------------------------------------------------------------------ bookings

/**
 * A partner only moves their own bookings; the API re-checks fleet ownership
 * and the legal status transitions before anything is written.
 */
export async function updateOwnBookingStatus(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  const note = text(formData, "note");
  const labels: Record<string, string> = {
    CONFIRMED: "Booking request accepted",
    ONGOING: "Rental started",
    COMPLETED: "Rental marked complete",
    NO_SHOW: "Booking marked as no-show",
  };
  await run(
    formData,
    () =>
      vendorRequest(`/bookings/${id}/status`, {
        method: "PATCH",
        body: { status, ...(note ? { note } : {}) },
      }),
    labels[status ?? ""] ?? "Booking updated",
    "Could not update this booking",
  );
}

/** Declining a request goes through the cancel endpoint so refunds stay correct. */
export async function declineOwnBooking(formData: FormData) {
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  await run(
    formData,
    () =>
      vendorRequest(`/bookings/${id}/cancel`, {
        method: "POST",
        body: { ...(reason ? { reason } : {}) },
      }),
    "Booking request declined and the rider refunded",
    "Could not decline this booking",
  );
}

// ---------------------------------------------------------------- availability

export async function createAvailabilityBlock(formData: FormData) {
  const vehicleId = text(formData, "vehicleId");
  const startsAt = isoDate(formData, "startsAt");
  const endsAt = isoDate(formData, "endsAt", true);
  const note = text(formData, "note");
  if (!startsAt || !endsAt) {
    redirect(
      withMessage(
        safePath(formData),
        "error",
        "Pick both a from date and a to date",
      ),
    );
  }
  await run(
    formData,
    () =>
      vendorRequest(`/vehicles/${vehicleId}/availability`, {
        method: "POST",
        body: {
          startsAt,
          endsAt,
          status: text(formData, "status") ?? "BLOCKED",
          ...(note ? { note } : {}),
        },
      }),
    "Dates blocked for this vehicle",
    "Could not block these dates",
  );
}

export async function removeAvailabilityBlock(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () => vendorRequest(`/availability/${id}`, { method: "DELETE" }),
    "Block removed",
    "Could not remove this block (booked dates follow the rental)",
  );
}

// -------------------------------------------------------------- notifications

export async function markNotificationRead(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () => vendorRequest(`/notifications/${id}/read`, { method: "PATCH" }),
    "Marked as read",
    "Could not update this notification",
  );
}

export async function markAllNotificationsRead(formData: FormData) {
  await run(
    formData,
    () => vendorRequest("/notifications/read-all", { method: "PATCH" }),
    "All notifications marked as read",
    "Could not update your notifications",
  );
}

export async function deleteNotification(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () => vendorRequest(`/notifications/${id}`, { method: "DELETE" }),
    "Notification removed",
    "Could not remove this notification",
  );
}

// ------------------------------------------------------------------- support

export async function createTicket(formData: FormData) {
  const bookingRef = text(formData, "bookingRef");
  await run(
    formData,
    () =>
      vendorRequest("/support/tickets", {
        method: "POST",
        body: {
          subject: text(formData, "subject"),
          message: text(formData, "message"),
          category: text(formData, "category") ?? "PARTNER",
          priority: text(formData, "priority") ?? "NORMAL",
          ...(bookingRef ? { bookingRef } : {}),
        },
      }),
    "Ticket raised",
    "Could not raise this ticket",
  );
}

export async function replyTicket(formData: FormData) {
  const id = text(formData, "id");
  await run(
    formData,
    () =>
      vendorRequest(`/support/tickets/${id}/replies`, {
        method: "POST",
        body: { body: text(formData, "body") },
      }),
    "Reply sent",
    "Could not send your reply",
  );
}

// ------------------------------------------------------------------- profile

export async function updatePartnerProfile(formData: FormData) {
  await run(
    formData,
    () =>
      vendorRequest("/vendor/profile", {
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
    "Profile saved",
    "Could not save your profile",
  );
}
