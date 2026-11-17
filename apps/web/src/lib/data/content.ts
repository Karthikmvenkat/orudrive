import type { Coupon, Faq, Testimonial } from "@/types";

export const coupons: Coupon[] = [
  {
    code: "SAVARI20",
    title: "20% off bike & scooter rentals",
    description: "Flat 20% off your first two-wheeler booking. Applies to scooters and motorcycles.",
    type: "percent",
    value: 20,
    maxDiscount: 300,
    minOrder: 499,
    appliesTo: ["scooter", "motorcycle"],
    validTill: "30 Nov 2026",
    highlight: "Most used",
    accent: "brand",
  },
  {
    code: "CAR15",
    title: "15% off car rentals",
    description: "Save on hatchbacks, sedans and SUVs booked for two days or more.",
    type: "percent",
    value: 15,
    maxDiscount: 700,
    minOrder: 2499,
    appliesTo: ["car"],
    validTill: "15 Dec 2026",
    highlight: "Weekend special",
    accent: "forest",
  },
  {
    code: "WELCOME100",
    title: "₹100 off your first booking",
    description: "New to SavariGo? Take ₹100 off any vehicle, any duration.",
    type: "flat",
    value: 100,
    minOrder: 399,
    appliesTo: "all",
    validTill: "31 Dec 2026",
    accent: "amber",
  },
];

export const faqs: Faq[] = [
  {
    question: "How do I book a vehicle?",
    answer:
      "Search with your pickup city and dates, choose a vehicle, then confirm your details and pay online. You'll receive a booking code and the vendor's contact details instantly.",
  },
  {
    question: "What documents are required?",
    answer:
      "For two-wheelers: a valid driving licence and one government photo ID (Aadhaar, passport or voter ID). For cars: a valid four-wheeler licence plus a second ID. International riders can use a valid IDP.",
  },
  {
    question: "Is there a security deposit?",
    answer:
      "Yes. Scooters and motorcycles carry a refundable deposit of ₹1,000–₹2,500; cars ₹4,000–₹8,000. It is collected at pickup or pre-authorised online and released within 3 working days of return.",
  },
  {
    question: "Can I cancel my booking?",
    answer:
      "Free cancellation up to 24 hours before pickup. Between 24 and 6 hours, 50% of the rental is charged. Under 6 hours or a no-show, the first day's rent is non-refundable.",
  },
  {
    question: "How do I get a refund?",
    answer:
      "Refunds are processed to the original payment method within 5–7 working days of approval. You can track the status under Dashboard → Payment History.",
  },
  {
    question: "What happens if the vehicle breaks down?",
    answer:
      "Call our 24/7 support line. We arrange roadside assistance or a replacement vehicle. Mechanical failures that aren't your fault are covered at no cost.",
  },
  {
    question: "Can I take the vehicle outside Puducherry?",
    answer:
      "Yes, within Tamil Nadu and the Union Territory. Trips beyond 150 km from Puducherry need a quick intimation so we can extend insurance coverage.",
  },
  {
    question: "Is fuel included in the rental?",
    answer:
      "Vehicles are handed over with a set fuel level and should be returned at the same level. Electric vehicles come charged to 100% with a portable charger.",
  },
  {
    question: "Do you deliver the vehicle to my hotel?",
    answer:
      "Yes. Free doorstep delivery within Puducherry city limits for cars and for bookings of 2+ days on two-wheelers. Elsewhere, a small delivery fee applies.",
  },
  {
    question: "What is the minimum age to rent?",
    answer:
      "18 years with a valid two-wheeler licence for scooters and motorcycles, and 21 years with a four-wheeler licence for cars. Aadhaar or passport verification is mandatory.",
  },
];

export const testimonials: Testimonial[] = [
  {
    name: "Ananya R.",
    city: "Bengaluru",
    rating: 5,
    quote:
      "Picked up an Activa at 8am near Rock Beach and returned it two days later. Zero paperwork drama, helmet included, and the scooter was genuinely well maintained.",
    initials: "AR",
  },
  {
    name: "Rahul Menon",
    city: "Chennai",
    rating: 5,
    quote:
      "Booked the i20 for a family weekend. It was delivered to our hotel with a full tank and the deposit came back in two days. This is how rentals should work.",
    initials: "RM",
  },
  {
    name: "Sophie L.",
    city: "Paris",
    rating: 4,
    quote:
      "I needed an IDP-friendly scooter and a driver for the Auroville trip. Support answered on WhatsApp in minutes and both were sorted the same evening.",
    initials: "SL",
  },
  {
    name: "Karthik M.",
    city: "Puducherry",
    rating: 5,
    quote:
      "I rent the Classic 350 almost every month for ECR runs. Prices are transparent and the bikes are always ready on time. My default now.",
    initials: "KM",
  },
];

export const howItWorks = [
  {
    step: "01",
    title: "Choose Your Ride",
    description: "Select bikes, scooters, cars or a professional driver.",
    icon: "search",
  },
  {
    step: "02",
    title: "Book Securely",
    description: "Pick your dates and confirm your booking.",
    icon: "calendar",
  },
  {
    step: "03",
    title: "Pick Up & Ride",
    description: "Collect your vehicle at the scheduled time and enjoy your ride.",
    icon: "key",
  },
  {
    step: "04",
    title: "Return with Ease",
    description: "Drop the vehicle at the agreed location and you're done!",
    icon: "check",
  },
];

export const driverPlans = [
  {
    name: "Hourly",
    price: 299,
    unit: "hour",
    minimum: "Minimum 4 hours",
    perks: ["Within Puducherry city", "Up to 40 km included", "Fuel by customer"],
    popular: false,
  },
  {
    name: "Full Day",
    price: 1499,
    unit: "day",
    minimum: "Up to 10 hours",
    perks: ["Up to 150 km included", "Night allowance included", "Fuel by customer"],
    popular: true,
  },
  {
    name: "Outstation",
    price: 2499,
    unit: "day",
    minimum: "Minimum 2 days",
    perks: ["Unlimited kilometres", "Driver stay allowance included", "Interstate permits handled"],
    popular: false,
  },
];

export const bikeTaxiFares = [
  { route: "White Town → Rock Beach", distance: "2.4 km", fare: 39 },
  { route: "Puducherry → Auroville", distance: "12 km", fare: 149 },
  { route: "Puducherry → Serenity Beach", distance: "5 km", fare: 69 },
  { route: "Puducherry → Paradise Beach", distance: "8 km", fare: 99 },
  { route: "Puducherry → Marakkanam", distance: "38 km", fare: 399 },
];

export const trustPoints = [
  {
    title: "Verified Vehicles",
    description: "Every vehicle is inspected and serviced before each rental.",
    icon: "shield",
  },
  {
    title: "Transparent Pricing",
    description: "The price you see is the price you pay. No hidden charges.",
    icon: "receipt",
  },
  {
    title: "24/7 Support",
    description: "Real humans on call, WhatsApp and chat — day or night.",
    icon: "headset",
  },
  {
    title: "Flexible Cancellation",
    description: "Change of plan? Cancel free up to 24 hours before pickup.",
    icon: "refresh",
  },
];

export const appFeatures = [
  "Faster Bookings",
  "Exclusive App Offers",
  "Manage Your Rides",
  "Real-time Notifications",
];
