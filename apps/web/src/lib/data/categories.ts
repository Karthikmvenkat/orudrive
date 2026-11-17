import type { Category } from "@/types";

export const categories: Category[] = [
  {
    slug: "scooters",
    name: "Scooters",
    tagline: "Quick, easy and economical city rides.",
    description: "Light, automatic and perfect for White Town lanes and beach runs.",
    count: 48,
    from: 449,
    href: "/bikes-scooters?type=scooter",
    image: "/images/categories/scooter.jpg",
    tint: "mint",
  },
  {
    slug: "motorcycles",
    name: "Motorcycles",
    tagline: "Power and freedom for every journey.",
    description: "Cruisers, roadsters and commuters for the open ECR highway.",
    count: 36,
    from: 899,
    href: "/bikes-scooters?type=motorcycle",
    image: "/images/categories/motorcycle.jpg",
    tint: "sky",
  },
  {
    slug: "cars",
    name: "Cars",
    tagline: "Comfortable rides for work, travel and weekend trips.",
    description: "Hatchbacks, sedans and SUVs with doorstep delivery.",
    count: 24,
    from: 2499,
    href: "/cars",
    image: "/images/categories/car.jpg",
    tint: "peach",
  },
  {
    slug: "monthly",
    name: "Monthly Rentals",
    tagline: "Long-term rentals at budget-friendly rates.",
    description: "Keep the same scooter, bike or car for weeks or months at discounted rates.",
    count: 0,
    from: 5999,
    href: "/bikes-scooters",
    icon: "calendar",
    eyebrow: "Save up to 30%",
    tint: "lilac",
  },
  {
    slug: "tow-vehicle",
    name: "Tow Vehicle",
    tagline: "24×7 breakdown towing for bikes and cars.",
    description: "Flat-rate towing to your garage or doorstep, anywhere in Puducherry.",
    count: 0,
    from: 299,
    href: "/tow-vehicle",
    icon: "tow",
    eyebrow: "24×7 assistance",
    tint: "sky",
  },
  {
    slug: "acting-driver",
    name: "Acting Driver",
    tagline: "A verified driver for your own car.",
    description: "Hire a professional chauffeur by the hour, day or for outstation trips.",
    count: 0,
    from: 299,
    href: "/driver-on-demand",
    icon: "driver",
    eyebrow: "By the hour or day",
    tint: "peach",
  },
];

export const vehicleTypeOptions = [
  { value: "all", label: "All Vehicles" },
  { value: "scooter", label: "Scooter" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car" },
];

export const pickupLocations = [
  "Puducherry",
  "White Town",
  "Auroville",
  "Lawspet",
  "Villianur",
  "Gorimedu",
  "Saram",
  "Mudaliarpet",
  "Kottakuppam",
];

export const popularDestinations = [
  {
    name: "Auroville",
    distance: "12 km from White Town",
    description: "Matrimandir, quiet cafés and tree-lined roads.",
    image: "/images/destinations/auroville.jpg",
  },
  {
    name: "Paradise Beach",
    distance: "8 km · ferry from Chunnambar",
    description: "Golden sand reached by a short backwater ferry.",
    image: "/images/destinations/paradise-beach.jpg",
  },
  {
    name: "Rock Beach",
    distance: "1 km from White Town",
    description: "The promenade, sunrise walks and French-quarter streets.",
    image: "/images/destinations/rock-beach.jpg",
  },
  {
    name: "Serenity Beach",
    distance: "5 km from town",
    description: "Surf schools, shacks and the best sunrise on the coast.",
    image: "/images/destinations/serenity-beach.jpg",
  },
];
