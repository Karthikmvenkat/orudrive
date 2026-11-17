export type VehicleCategory = "scooter" | "motorcycle" | "car";

export type BookingStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled";

export type PaymentStatus = "paid" | "pending" | "refunded" | "failed";

export interface Vehicle {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: VehicleCategory;
  body?: "hatchback" | "sedan" | "suv";
  transmission: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Electric";
  seats: number;
  engine: string;
  mileage: string;
  pricePerDay: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  location: string;
  image: string;
  gallery: string[];
  tags: string[];
  available: boolean;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  mileageLimit: string;
  deposit: number;
  year: number;
  popular?: boolean;
}

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  count: number;
  from: number;
  href: string;
  image?: string;
  icon?: "calendar" | "tow" | "driver";
  eyebrow?: string;
  tint: "mint" | "sky" | "peach" | "lilac";
}

export interface Booking {
  id: string;
  code: string;
  vehicleSlug: string;
  vehicleName: string;
  vehicleImage: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  dropLocation: string;
  duration: number;
  rentalAmount: number;
  deposit: number;
  total: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "UPI" | "Card" | "Pay at pickup";
  createdAt: string;
}

export interface Coupon {
  code: string;
  title: string;
  description: string;
  type: "percent" | "flat";
  value: number;
  maxDiscount?: number;
  minOrder: number;
  appliesTo: VehicleCategory[] | "all";
  validTill: string;
  highlight?: string;
  accent: "brand" | "forest" | "amber";
}

export interface Testimonial {
  name: string;
  city: string;
  rating: number;
  quote: string;
  initials: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Destination {
  name: string;
  distance: string;
  description: string;
  image: string;
}

export interface PaymentRecord {
  id: string;
  bookingCode: string;
  vehicle: string;
  amount: number;
  method: string;
  status: "Paid" | "Refunded" | "Failed" | "Pending";
  date: string;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  city: string;
  memberSince: string;
  bookings: number;
  completed: number;
  upcoming: number;
  savedVehicles: number;
}
