import type {
  Booking,
  Category,
  Customer,
  PaymentRecord,
  Vehicle,
  VehicleCategory,
} from "@/types";
import type {
  ApiBooking,
  ApiCategory,
  ApiCustomerProfile,
  ApiLocation,
  ApiMe,
  ApiPayment,
  ApiVehicle,
} from "./types";

const CATEGORY_TINTS: Record<string, Category["tint"]> = {
  scooter: "mint",
  motorcycle: "peach",
  car: "sky",
};

const FEATURES: Record<VehicleCategory, string[]> = {
  scooter: [
    "Well maintained vehicles",
    "Free helmet",
    "24/7 support",
    "Flexible rental plans",
  ],
  motorcycle: [
    "Serviced regularly",
    "2 helmets included",
    "Roadside assistance",
    "Saddle bag on request",
  ],
  car: [
    "Doorstep delivery",
    "Comprehensive insurance",
    "24/7 roadside support",
    "Clean, sanitised cabin",
  ],
};

const SUV_HINTS = ["thar", "nexon", "suv", "creta", "seltos", "xuv", "hector"];
const SEDAN_HINTS = ["city", "verna", "sedan", "dzire", "amaze", "ciaz"];

function categoryOf(value: string): VehicleCategory {
  if (value === "car" || value === "motorcycle" || value === "scooter") return value;
  return "scooter";
}

function carBody(name: string): Vehicle["body"] {
  const lowered = name.toLowerCase();
  if (SUV_HINTS.some((hint) => lowered.includes(hint))) return "suv";
  if (SEDAN_HINTS.some((hint) => lowered.includes(hint))) return "sedan";
  return "hatchback";
}

function fuelOf(value: string): Vehicle["fuel"] {
  if (value === "DIESEL") return "Diesel";
  if (value === "ELECTRIC") return "Electric";
  return "Petrol";
}

export function toVehicle(vehicle: ApiVehicle): Vehicle {
  const category = categoryOf(vehicle.category.slug);
  const image =
    vehicle.primaryImage?.url ??
    vehicle.images[0]?.url ??
    `/images/vehicles/${vehicle.slug}.jpg`;
  const gallery =
    vehicle.images.length > 1
      ? vehicle.images.map((img) => img.url)
      : [
          image,
          `/images/lifestyle/${category}-ride-1.jpg`,
          `/images/lifestyle/${category}-ride-2.jpg`,
        ];

  const tags: string[] = [];
  if (vehicle.popular) tags.push("Most booked");
  if (vehicle.rating >= 4.8) tags.push("Top rated");
  if (vehicle.fuelType === "ELECTRIC") tags.push("Electric");

  const mileageLabel = vehicle.fuelType === "ELECTRIC" ? "Range" : "Mileage";

  return {
    id: vehicle.id,
    slug: vehicle.slug,
    name: vehicle.name,
    brand: vehicle.brand,
    category,
    ...(category === "car" ? { body: carBody(vehicle.name) } : {}),
    transmission: vehicle.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
    fuel: fuelOf(vehicle.fuelType),
    seats: vehicle.seats,
    engine: vehicle.engine,
    mileage: vehicle.mileage,
    pricePerDay: vehicle.pricePerDay,
    rating: vehicle.rating,
    reviewCount: vehicle.reviewCount,
    location: vehicle.location.city,
    image,
    gallery,
    tags,
    available: vehicle.status === "AVAILABLE",
    description: vehicle.description,
    features: FEATURES[category],
    specs: [
      { label: "Engine", value: vehicle.engine },
      { label: mileageLabel, value: vehicle.mileage },
      {
        label: "Transmission",
        value: vehicle.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
      },
      { label: "Fuel", value: fuelOf(vehicle.fuelType) },
      { label: "Seats", value: String(vehicle.seats) },
      { label: "Year", value: String(vehicle.year) },
    ],
    mileageLimit:
      vehicle.mileageLimitKm === null
        ? "Unlimited kilometres"
        : `${vehicle.mileageLimitKm} km/day included`,
    deposit: vehicle.depositAmount,
    year: vehicle.year,
    popular: vehicle.popular,
  };
}

export function toCategory(category: ApiCategory): Category {
  return {
    slug: category.slug,
    name: category.name,
    tagline: category.tagline,
    description: category.description,
    count: category.vehicleCount,
    from: category.fromPrice,
    href: category.slug === "car" ? "/cars" : "/bikes-scooters",
    ...(category.imageUrl ? { image: category.imageUrl } : {}),
    tint: CATEGORY_TINTS[category.slug] ?? "mint",
  };
}

const BOOKING_STATUS: Record<ApiBooking["status"], Booking["status"]> = {
  PENDING: "upcoming",
  CONFIRMED: "upcoming",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "cancelled",
};

const PAYMENT_STATUS: Record<ApiBooking["paymentStatus"], Booking["paymentStatus"]> = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

function displayMethod(payment: ApiPayment | undefined): Booking["paymentMethod"] {
  if (!payment) return "Pay at pickup";
  const method = (payment.method ?? "").toUpperCase();
  if (method === "CARD") return "Card";
  if (method === "CASH") return "Pay at pickup";
  return "UPI";
}

export function toBooking(booking: ApiBooking): Booking {
  return {
    id: booking.id,
    code: booking.code,
    vehicleSlug: booking.vehicle.slug,
    vehicleName: booking.vehicle.name,
    vehicleImage:
      booking.vehicle.image ??
      `/images/vehicles/${booking.vehicle.slug}.jpg`,
    pickupDate: booking.pickupAt.slice(0, 10),
    returnDate: booking.returnAt.slice(0, 10),
    pickupLocation: booking.pickupLocation.name,
    dropLocation: booking.dropLocation?.name ?? booking.pickupLocation.name,
    duration: booking.durationDays,
    rentalAmount: booking.amounts.rentalAmount,
    deposit: booking.amounts.depositAmount,
    total: booking.amounts.totalAmount,
    status: BOOKING_STATUS[booking.status],
    paymentStatus: PAYMENT_STATUS[booking.paymentStatus],
    paymentMethod: displayMethod(
      booking.payments.find((payment) => payment.status === "PAID") ??
        booking.payments[0],
    ),
    createdAt: booking.createdAt.slice(0, 10),
  };
}

const RECORD_STATUS: Record<string, PaymentRecord["status"]> = {
  PAID: "Paid",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  PENDING: "Pending",
};

export function toPaymentRecord(
  payment: ApiPayment,
  vehicleName?: string,
): PaymentRecord {
  const method = (payment.method ?? "").toLowerCase();
  const label =
    method === "card" ? "Card" : method === "upi" ? "UPI" : method || "Online";
  return {
    id: payment.id,
    bookingCode: payment.bookingCode ?? "—",
    vehicle: vehicleName ?? "—",
    amount: payment.amount,
    method: `${label} · Razorpay`,
    status: RECORD_STATUS[payment.status] ?? "Pending",
    date: (payment.paidAt ?? payment.createdAt).slice(0, 10),
  };
}

export function toCustomer(
  user: ApiMe,
  profile: ApiCustomerProfile | null,
  stats: { bookings: number; completed: number; upcoming: number },
): Customer {
  return {
    name: profile?.fullName ?? user.email.split("@")[0],
    email: user.email,
    phone: profile?.phone ?? user.phone ?? "",
    city: profile?.city ?? "Puducherry",
    memberSince: new Date(profile?.memberSince ?? user.createdAt).toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" },
    ),
    bookings: stats.bookings,
    completed: stats.completed,
    upcoming: stats.upcoming,
    savedVehicles: 0,
  };
}

export interface CheckoutLocation {
  id: string;
  name: string;
  city: string;
  address: string;
}

export function toCheckoutLocation(location: ApiLocation): CheckoutLocation {
  return {
    id: location.id,
    name: location.name,
    city: location.city,
    address: [location.addressLine1, location.addressLine2]
      .filter(Boolean)
      .join(", "),
  };
}
