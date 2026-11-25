/* eslint-disable no-console */
import { randomBytes, scryptSync } from "node:crypto";
import { Prisma, PrismaClient, PartnerStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Development-only password. Replace with real credentials in production.
const DEMO_PASSWORD = "SavariGo@2026";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const permissionGroups: Record<string, string[]> = {
  users: ["users:read", "users:write"],
  vehicles: ["vehicles:read", "vehicles:write", "vehicles:verify"],
  drivers: ["drivers:read", "drivers:verify"],
  bookings: ["bookings:read", "bookings:write", "bookings:cancel"],
  payments: ["payments:read", "payments:refund"],
  coupons: ["coupons:read", "coupons:write"],
  reviews: ["reviews:write", "reviews:moderate"],
  notifications: ["notifications:send"],
  settings: ["settings:manage"],
  audit: ["audit:read"],
};

const rolePermissions: Record<string, string[]> = {
  CUSTOMER: ["vehicles:read", "bookings:read", "bookings:write", "bookings:cancel", "reviews:write"],
  DRIVER: ["vehicles:read", "bookings:read"],
  VENDOR: ["vehicles:read", "vehicles:write", "bookings:read", "payments:read"],
  SUPPORT: ["users:read", "bookings:read", "payments:read", "reviews:moderate", "notifications:send"],
  ADMIN: [...Object.values(permissionGroups).flat()],
};

const categories = [
  {
    slug: "scooter",
    name: "Scooters",
    tagline: "Quick, easy and economical city rides.",
    description: "Light, automatic and perfect for White Town lanes and beach runs.",
    imageUrl: "/images/categories/scooter.jpg",
    sortOrder: 1,
  },
  {
    slug: "motorcycle",
    name: "Motorcycles",
    tagline: "Power and freedom for every journey.",
    description: "Cruisers, roadsters and commuters for the open ECR highway.",
    imageUrl: "/images/categories/motorcycle.jpg",
    sortOrder: 2,
  },
  {
    slug: "car",
    name: "Cars",
    tagline: "Comfortable rides for work, travel and weekend trips.",
    description: "Hatchbacks, sedans and SUVs with doorstep delivery.",
    imageUrl: "/images/categories/car.jpg",
    sortOrder: 3,
  },
  {
    slug: "van",
    name: "Vans",
    tagline: "Space for the whole crew and everything they carry.",
    description: "People movers, cargo vans and minibuses for groups, shoots and outstation trips.",
    imageUrl: "/images/categories/van.jpg",
    sortOrder: 4,
  },
];

const locations = [
  {
    slug: "white-town",
    name: "White Town Hub",
    addressLine1: "12, Rue Suffren",
    addressLine2: "White Town",
    postalCode: "605001",
    latitude: 11.9325,
    longitude: 79.8358,
    phone: "+91 98765 43210",
  },
  {
    slug: "auroville",
    name: "Auroville Hub",
    addressLine1: "Kottakarai Junction",
    addressLine2: "Auroville Main Road",
    postalCode: "605101",
    latitude: 12.0054,
    longitude: 79.8106,
    phone: "+91 98765 43211",
  },
  {
    slug: "airport-road",
    name: "Airport Road Hub",
    addressLine1: "Lawspet Main Road",
    addressLine2: "Near Puducherry Airport",
    postalCode: "605008",
    latitude: 11.9683,
    longitude: 79.8125,
    phone: "+91 98765 43212",
  },
];

type SeedVehicle = {
  slug: string;
  name: string;
  brand: string;
  category: "scooter" | "motorcycle" | "car" | "van";
  registrationNumber: string;
  year: number;
  transmission: "MANUAL" | "AUTOMATIC";
  fuelType: "PETROL" | "DIESEL" | "ELECTRIC";
  seats: number;
  engine: string;
  mileage: string;
  pricePerDay: number;
  deposit: number;
  mileageLimitKm: number | null;
  extraKmRate: number;
  luggageCapacity?: number;
  ac?: boolean;
  popular?: boolean;
  description: string;
};

const vehicles: SeedVehicle[] = [
  {
    slug: "honda-activa-6g",
    name: "Honda Activa 6G",
    brand: "Honda",
    category: "scooter",
    registrationNumber: "PY01AA1001",
    year: 2023,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    seats: 2,
    engine: "109.5 cc",
    mileage: "50 km/l",
    pricePerDay: 499,
    deposit: 1000,
    mileageLimitKm: 160,
    extraKmRate: 6,
    popular: true,
    description: "The dependable everyday scooter — light, automatic and easy through White Town lanes.",
  },
  {
    slug: "royal-enfield-classic-350",
    name: "Royal Enfield Classic 350",
    brand: "Royal Enfield",
    category: "motorcycle",
    registrationNumber: "PY01AA1002",
    year: 2022,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 2,
    engine: "349 cc",
    mileage: "35 km/l",
    pricePerDay: 1299,
    deposit: 2000,
    mileageLimitKm: 150,
    extraKmRate: 8,
    popular: true,
    description: "A relaxed cruiser for the ECR — thumping, comfortable and built for long coastal runs.",
  },
  {
    slug: "hyundai-i20",
    name: "Hyundai i20",
    brand: "Hyundai",
    category: "car",
    registrationNumber: "PY01AA1003",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 5,
    engine: "1.2 L",
    mileage: "19 km/l",
    pricePerDay: 2799,
    deposit: 5000,
    mileageLimitKm: null,
    extraKmRate: 12,
    popular: true,
    description: "A premium hatchback with a big boot, cool cabin and effortless highway manners.",
  },
  {
    slug: "tvs-jupiter-125",
    name: "TVS Jupiter 125",
    brand: "TVS",
    category: "scooter",
    registrationNumber: "PY01AA1004",
    year: 2023,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    seats: 2,
    engine: "124.8 cc",
    mileage: "48 km/l",
    pricePerDay: 599,
    deposit: 1000,
    mileageLimitKm: 160,
    extraKmRate: 6,
    popular: true,
    description: "Extra legroom, a large underseat bay and a smooth 125 cc engine for two-up city rides.",
  },
  {
    slug: "royal-enfield-hunter-350",
    name: "Royal Enfield Hunter 350",
    brand: "Royal Enfield",
    category: "motorcycle",
    registrationNumber: "PY01AA1005",
    year: 2024,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 2,
    engine: "349 cc",
    mileage: "36 km/l",
    pricePerDay: 1199,
    deposit: 2000,
    mileageLimitKm: 150,
    extraKmRate: 8,
    description: "A nimble roadster that handles town traffic as happily as the open highway.",
  },
  {
    slug: "ola-s1-pro",
    name: "Ola S1 Pro",
    brand: "Ola Electric",
    category: "scooter",
    registrationNumber: "PY01EV1006",
    year: 2024,
    transmission: "AUTOMATIC",
    fuelType: "ELECTRIC",
    seats: 2,
    engine: "4 kW",
    mileage: "135 km range",
    pricePerDay: 699,
    deposit: 1500,
    mileageLimitKm: 180,
    extraKmRate: 6,
    popular: true,
    description: "Silent, quick and fully charged at handover. The easiest way to explore quietly.",
  },
  {
    slug: "honda-city",
    name: "Honda City",
    brand: "Honda",
    category: "car",
    registrationNumber: "PY01AA1007",
    year: 2023,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    seats: 5,
    engine: "1.5 L",
    mileage: "18 km/l",
    pricePerDay: 3299,
    deposit: 5000,
    mileageLimitKm: null,
    extraKmRate: 12,
    description: "A comfortable automatic sedan for families, airport runs and day trips to Chennai.",
  },
  {
    slug: "maruti-swift",
    name: "Maruti Suzuki Swift",
    brand: "Maruti Suzuki",
    category: "car",
    registrationNumber: "PY01AA1008",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 5,
    engine: "1.2 L",
    mileage: "22 km/l",
    pricePerDay: 2499,
    deposit: 4000,
    mileageLimitKm: null,
    extraKmRate: 12,
    description: "Light, frugal and easy to park — the practical choice for a couple's weekend.",
  },
  {
    slug: "yamaha-fz-s-fi",
    name: "Yamaha FZ-S FI",
    brand: "Yamaha",
    category: "motorcycle",
    registrationNumber: "PY01AA1009",
    year: 2022,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 2,
    engine: "149 cc",
    mileage: "45 km/l",
    pricePerDay: 899,
    deposit: 1500,
    mileageLimitKm: 160,
    extraKmRate: 8,
    description: "A sharp 150 cc commuter with confident brakes and a comfortable upright stance.",
  },
  {
    slug: "bajaj-chetak",
    name: "Bajaj Chetak",
    brand: "Bajaj",
    category: "scooter",
    registrationNumber: "PY01EV1010",
    year: 2023,
    transmission: "AUTOMATIC",
    fuelType: "ELECTRIC",
    seats: 2,
    engine: "3.8 kW",
    mileage: "108 km range",
    pricePerDay: 649,
    deposit: 1500,
    mileageLimitKm: 100,
    extraKmRate: 6,
    description: "A calm electric scooter with a metal body, smooth delivery and zero fuel stops.",
  },
  {
    slug: "tata-nexon",
    name: "Tata Nexon",
    brand: "Tata",
    category: "car",
    registrationNumber: "PY01AA1011",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "DIESEL",
    seats: 5,
    engine: "1.5 L",
    mileage: "21 km/l",
    pricePerDay: 3499,
    deposit: 6000,
    mileageLimitKm: null,
    extraKmRate: 12,
    description: "A five-star safety rated compact SUV with a torquey diesel and generous ground clearance.",
  },
  {
    slug: "honda-dio-125",
    name: "Honda Dio 125",
    brand: "Honda",
    category: "scooter",
    registrationNumber: "PY01AA1012",
    year: 2024,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    seats: 2,
    engine: "123.9 cc",
    mileage: "48 km/l",
    pricePerDay: 549,
    deposit: 1000,
    mileageLimitKm: 160,
    extraKmRate: 6,
    description: "Sporty styling, a peppy 125 cc engine and a comfortable ride for two.",
  },
  {
    slug: "mahindra-thar",
    name: "Mahindra Thar",
    brand: "Mahindra",
    category: "car",
    registrationNumber: "PY01AA1013",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "DIESEL",
    seats: 4,
    engine: "1.5 L",
    mileage: "15 km/l",
    pricePerDay: 4999,
    deposit: 8000,
    mileageLimitKm: null,
    extraKmRate: 12,
    description: "A proper off-roader for beach tracks and country roads. Big presence, bigger views.",
  },
  {
    slug: "ktm-duke-200",
    name: "KTM Duke 200",
    brand: "KTM",
    category: "motorcycle",
    registrationNumber: "PY01AA1014",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 2,
    engine: "199.5 cc",
    mileage: "35 km/l",
    pricePerDay: 1599,
    deposit: 2500,
    mileageLimitKm: 150,
    extraKmRate: 8,
    description: "Sharp, light and quick — a weekend toy for riders who like their roads twisty.",
  },
  {
    slug: "maruti-suzuki-eeco",
    name: "Maruti Suzuki Eeco",
    brand: "Maruti Suzuki",
    category: "van",
    registrationNumber: "PY01AA1015",
    year: 2024,
    transmission: "MANUAL",
    fuelType: "PETROL",
    seats: 5,
    engine: "1196 cc",
    mileage: "20 km/l",
    pricePerDay: 1899,
    deposit: 3000,
    mileageLimitKm: 200,
    extraKmRate: 12,
    luggageCapacity: 3,
    ac: true,
    popular: true,
    description: "The honest little van — five seats, a sliding door and a flat load floor for market runs, kit and crew.",
  },
  {
    slug: "toyota-innova-crysta",
    name: "Toyota Innova Crysta",
    brand: "Toyota",
    category: "van",
    registrationNumber: "PY01AA1016",
    year: 2023,
    transmission: "MANUAL",
    fuelType: "DIESEL",
    seats: 7,
    engine: "2393 cc",
    mileage: "15 km/l",
    pricePerDay: 3499,
    deposit: 5000,
    mileageLimitKm: 250,
    extraKmRate: 14,
    luggageCapacity: 4,
    ac: true,
    popular: true,
    description: "Seven proper seats with captain chairs and a cold AC — the default choice for family and airport runs.",
  },
  {
    slug: "force-traveller",
    name: "Force Traveller 3350",
    brand: "Force",
    category: "van",
    registrationNumber: "PY01AA1017",
    year: 2022,
    transmission: "MANUAL",
    fuelType: "DIESEL",
    seats: 12,
    engine: "2596 cc",
    mileage: "12 km/l",
    pricePerDay: 4999,
    deposit: 8000,
    mileageLimitKm: 300,
    extraKmRate: 16,
    luggageCapacity: 6,
    ac: true,
    description: "Twelve seats, high roof and a long luggage bay — built for crew moves, weddings and outstation groups.",
  },
];

const coupons = [
  {
    code: "SAVARI20",
    title: "20% off bike & scooter rentals",
    description: "Flat 20% off your first two-wheeler booking. Applies to scooters and motorcycles.",
    type: "PERCENT" as const,
    value: 20,
    maxDiscount: 300,
    minOrderAmount: 499,
    validTill: new Date("2026-11-30T23:59:59+05:30"),
    categories: ["scooter", "motorcycle"],
  },
  {
    code: "CAR15",
    title: "15% off car rentals",
    description: "Save on hatchbacks, sedans and SUVs booked for two days or more.",
    type: "PERCENT" as const,
    value: 15,
    maxDiscount: 700,
    minOrderAmount: 2499,
    validTill: new Date("2026-12-15T23:59:59+05:30"),
    categories: ["car"],
  },
  {
    code: "WELCOME100",
    title: "₹100 off your first booking",
    description: "New to SavariGo? Take ₹100 off any vehicle, any duration.",
    type: "FLAT" as const,
    value: 100,
    maxDiscount: null,
    minOrderAmount: 399,
    validTill: new Date("2026-12-31T23:59:59+05:30"),
    categories: [] as string[],
  },
];

async function seedAccess() {
  const permissions: Record<string, string> = {};
  for (const [group, keys] of Object.entries(permissionGroups)) {
    for (const key of keys) {
      const permission = await prisma.permission.upsert({
        where: { key },
        update: { group },
        create: { key, group },
      });
      permissions[key] = permission.id;
    }
  }

  const roles: Record<string, string> = {};
  for (const [name, keys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
    roles[name] = role.id;
    for (const key of keys) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissions[key] } },
        update: {},
        create: { roleId: role.id, permissionId: permissions[key] },
      });
    }
  }

  return { roles, permissions };
}

async function seedUsers(roles: Record<string, string>) {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@savarigo.com" },
    update: {},
    create: {
      email: "admin@savarigo.com",
      phone: "+919876543200",
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date("2026-01-05T10:00:00+05:30"),
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@savarigo.com" },
    update: {},
    create: {
      email: "vendor@savarigo.com",
      phone: "+919876543201",
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date("2026-01-10T10:00:00+05:30"),
    },
  });

  const riderSeed = [
    {
      email: "karthik@email.com",
      phone: "+919876543210",
      fullName: "Karthik M",
      city: "Puducherry",
      memberSince: new Date("2024-03-12T10:00:00+05:30"),
    },
    {
      email: "ananya@example.com",
      phone: "+919876543220",
      fullName: "Ananya R.",
      city: "Bengaluru",
      memberSince: new Date("2025-11-02T10:00:00+05:30"),
    },
    {
      email: "rahul@example.com",
      phone: "+919876543221",
      fullName: "Rahul Menon",
      city: "Chennai",
      memberSince: new Date("2025-06-19T10:00:00+05:30"),
    },
  ];

  const riders: Record<string, string> = {};
  for (const rider of riderSeed) {
    const user = await prisma.user.upsert({
      where: { email: rider.email },
      update: {},
      create: {
        email: rider.email,
        phone: rider.phone,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: rider.memberSince,
        createdAt: rider.memberSince,
      },
    });
    riders[rider.email] = user.id;

    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: rider.fullName,
        city: rider.city,
        licenceNumber: `DL-PY-${user.id.slice(0, 8).toUpperCase()}`,
        licenceExpiry: new Date("2031-03-31"),
        licenceVerifiedAt: rider.memberSince,
        avatarUrl: null,
        preferences: { language: "en", currency: "INR" },
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.CUSTOMER } },
      update: {},
      create: { userId: user.id, roleId: roles.CUSTOMER },
    });
  }

  const drivers = [
    {
      email: "suresh@drivers.savarigo.com",
      phone: "+919876543230",
      fullName: "Suresh Kumar",
      licenceNumber: "DL-PY-2019-4471",
      experienceYears: 11,
      languages: ["English", "Tamil", "Hindi", "French"],
      hourlyRate: 299,
      dailyRate: 1499,
    },
    {
      email: "meena@drivers.savarigo.com",
      phone: "+919876543231",
      fullName: "Meena Lakshmi",
      licenceNumber: "DL-PY-2020-8812",
      experienceYears: 7,
      languages: ["English", "Tamil", "Hindi"],
      hourlyRate: 299,
      dailyRate: 1499,
    },
  ];

  for (const driver of drivers) {
    const user = await prisma.user.upsert({
      where: { email: driver.email },
      update: {},
      create: {
        email: driver.email,
        phone: driver.phone,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date("2026-02-01T10:00:00+05:30"),
      },
    });
    await prisma.driverProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: driver.fullName,
        licenceNumber: driver.licenceNumber,
        licenceExpiry: new Date("2032-08-31"),
        experienceYears: driver.experienceYears,
        languages: driver.languages,
        bio: "Verified SavariGo driver based in Puducherry.",
        verificationStatus: "VERIFIED",
        rating: 4.9,
        totalTrips: 240,
        hourlyRate: driver.hourlyRate,
        dailyRate: driver.dailyRate,
        isAvailable: true,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.DRIVER } },
      update: {},
      create: { userId: user.id, roleId: roles.DRIVER },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.ADMIN } },
    update: {},
    create: { userId: admin.id, roleId: roles.ADMIN },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: vendor.id, roleId: roles.VENDOR } },
    update: {},
    create: { userId: vendor.id, roleId: roles.VENDOR },
  });

  await prisma.address.deleteMany({ where: { userId: riders["karthik@email.com"] } });
  await prisma.address.create({
    data: {
      userId: riders["karthik@email.com"],
      label: "Home",
      line1: "18, Rue Dumas",
      line2: "White Town",
      postalCode: "605001",
      latitude: 11.9331,
      longitude: 79.8341,
      isDefault: true,
    },
  });

  console.log("Users ready.");
  return { admin, vendor, riders };
}

async function seedFleet(vendorId: string) {
  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const row = await prisma.vehicleCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    categoryIds[category.slug] = row.id;
  }

  const locationIds: Record<string, string> = {};
  for (const location of locations) {
    const row = await prisma.vehicleLocation.upsert({
      where: { slug: location.slug },
      update: location,
      create: { ...location, city: "Puducherry", state: "Puducherry" },
    });
    locationIds[location.slug] = row.id;
  }

  const vehicleIds: Record<string, string> = {};
  const hubFor = (category: string) =>
    category === "car" || category === "van"
      ? locationIds["airport-road"]
      : locationIds["white-town"];

  for (const vehicle of vehicles) {
    const row = await prisma.vehicle.upsert({
      where: { slug: vehicle.slug },
      update: {
        name: vehicle.name,
        brand: vehicle.brand,
        categoryId: categoryIds[vehicle.category],
        locationId: hubFor(vehicle.category),
        status: "AVAILABLE",
        popular: vehicle.popular ?? false,
        depositAmount: vehicle.deposit,
        fromPrice: vehicle.pricePerDay,
        rating: vehicle.popular ? 4.8 : 4.6,
        reviewCount: vehicle.popular ? 120 : 48,
        luggageCapacity: vehicle.luggageCapacity ?? null,
        ac: vehicle.ac ?? null,
      },
      create: {
        slug: vehicle.slug,
        name: vehicle.name,
        brand: vehicle.brand,
        categoryId: categoryIds[vehicle.category],
        ownerId: vendorId,
        locationId: hubFor(vehicle.category),
        registrationNumber: vehicle.registrationNumber,
        year: vehicle.year,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        seats: vehicle.seats,
        engine: vehicle.engine,
        mileage: vehicle.mileage,
        description: vehicle.description,
        status: "AVAILABLE",
        rating: vehicle.popular ? 4.8 : 4.6,
        reviewCount: vehicle.popular ? 120 : 48,
        popular: vehicle.popular ?? false,
        mileageLimitKm: vehicle.mileageLimitKm,
        luggageCapacity: vehicle.luggageCapacity ?? null,
        ac: vehicle.ac ?? null,
        depositAmount: vehicle.deposit,
        fromPrice: vehicle.pricePerDay,
      },
    });
    vehicleIds[vehicle.slug] = row.id;

    await prisma.vehicleImage.deleteMany({ where: { vehicleId: row.id } });
    await prisma.vehicleImage.createMany({
      data: [
        {
          vehicleId: row.id,
          url: `/images/vehicles/${vehicle.slug}.jpg`,
          alt: `${vehicle.name} available for rent in Puducherry`,
          sortOrder: 0,
          isPrimary: true,
        },
        {
          vehicleId: row.id,
          url: `/images/lifestyle/${vehicle.category}-ride-1.jpg`,
          alt: `${vehicle.name} on a ride near Puducherry`,
          sortOrder: 1,
        },
        {
          vehicleId: row.id,
          url: `/images/lifestyle/${vehicle.category}-ride-2.jpg`,
          alt: `${vehicle.name} at a coastal stop`,
          sortOrder: 2,
        },
      ],
    });

    const validFrom = new Date("2026-01-01T00:00:00+05:30");
    await prisma.pricing.upsert({
      where: {
        vehicleId_name_validFrom: { vehicleId: row.id, name: "Standard", validFrom },
      },
      update: {
        baseDayRate: vehicle.pricePerDay,
        extraKmRate: vehicle.extraKmRate,
        depositAmount: vehicle.deposit,
        mileageLimitKm: vehicle.mileageLimitKm,
      },
      create: {
        vehicleId: row.id,
        name: "Standard",
        baseDayRate: vehicle.pricePerDay,
        extraKmRate: vehicle.extraKmRate,
        depositAmount: vehicle.deposit,
        mileageLimitKm: vehicle.mileageLimitKm,
        minDays: 1,
        weeklyDiscountPercent: 10,
        monthlyDiscountPercent: 20,
        validFrom,
        isActive: true,
      },
    });
  }

  const couponIds: Record<string, string> = {};
  for (const coupon of coupons) {
    const row = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        validTill: coupon.validTill,
        isActive: true,
      },
      create: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderAmount: coupon.minOrderAmount,
        validFrom: new Date("2026-10-01T00:00:00+05:30"),
        validTill: coupon.validTill,
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true,
      },
    });
    couponIds[coupon.code] = row.id;

    await prisma.couponCategory.deleteMany({ where: { couponId: row.id } });
    for (const categorySlug of coupon.categories) {
      await prisma.couponCategory.create({
        data: { couponId: row.id, categoryId: categoryIds[categorySlug] },
      });
    }
  }

  return { categoryIds, locationIds, vehicleIds, couponIds };
}

async function seedBookings(context: {
  vehicleIds: Record<string, string>;
  locationIds: Record<string, string>;
  couponIds: Record<string, string>;
  riders: Record<string, string>;
}) {
  const karthik = context.riders["karthik@email.com"];
  const ananya = context.riders["ananya@example.com"];
  const rahul = context.riders["rahul@example.com"];
  const hub = context.locationIds["white-town"];

  const bookingSeeds = [
    {
      code: "SVR8842",
      customerId: karthik,
      vehicleSlug: "honda-activa-6g",
      pickupAt: new Date("2026-11-10T09:00:00+05:30"),
      returnAt: new Date("2026-11-11T09:00:00+05:30"),
      status: "CONFIRMED" as const,
      paymentStatus: "PAID" as const,
      rentalAmount: 499,
      deposit: 1000,
      couponCode: null,
      payment: { method: "UPI" as const, provider: "UPI" as const, status: "PAID" as const },
    },
    {
      code: "SVR7315",
      customerId: karthik,
      vehicleSlug: "royal-enfield-classic-350",
      pickupAt: new Date("2026-10-20T09:00:00+05:30"),
      returnAt: new Date("2026-10-22T09:00:00+05:30"),
      status: "COMPLETED" as const,
      paymentStatus: "PAID" as const,
      rentalAmount: 2598,
      deposit: 2000,
      couponCode: null,
      payment: { method: "CARD" as const, provider: "RAZORPAY" as const, status: "PAID" as const },
    },
    {
      code: "SVR6201",
      customerId: karthik,
      vehicleSlug: "hyundai-i20",
      pickupAt: new Date("2026-10-18T09:00:00+05:30"),
      returnAt: new Date("2026-10-20T09:00:00+05:30"),
      status: "COMPLETED" as const,
      paymentStatus: "PAID" as const,
      rentalAmount: 5598,
      deposit: 5000,
      couponCode: null,
      payment: { method: "UPI" as const, provider: "UPI" as const, status: "PAID" as const },
    },
    {
      code: "SVR5920",
      customerId: karthik,
      vehicleSlug: "tvs-jupiter-125",
      pickupAt: new Date("2026-09-02T09:00:00+05:30"),
      returnAt: new Date("2026-09-03T09:00:00+05:30"),
      status: "CANCELLED" as const,
      paymentStatus: "REFUNDED" as const,
      rentalAmount: 599,
      deposit: 1000,
      couponCode: null,
      payment: { method: "UPI" as const, provider: "UPI" as const, status: "REFUNDED" as const },
    },
    {
      code: "SVR5711",
      customerId: karthik,
      vehicleSlug: "yamaha-fz-s-fi",
      pickupAt: new Date("2026-08-11T09:00:00+05:30"),
      returnAt: new Date("2026-08-12T09:00:00+05:30"),
      status: "CANCELLED" as const,
      paymentStatus: "FAILED" as const,
      rentalAmount: 899,
      deposit: 0,
      couponCode: null,
      payment: { method: "CARD" as const, provider: "RAZORPAY" as const, status: "FAILED" as const },
    },
    {
      code: "SVR7410",
      customerId: ananya,
      vehicleSlug: "honda-activa-6g",
      pickupAt: new Date("2026-08-02T09:00:00+05:30"),
      returnAt: new Date("2026-08-04T09:00:00+05:30"),
      status: "COMPLETED" as const,
      paymentStatus: "PAID" as const,
      rentalAmount: 998,
      deposit: 1000,
      couponCode: "SAVARI20",
      payment: { method: "UPI" as const, provider: "UPI" as const, status: "PAID" as const },
    },
    {
      code: "SVR7333",
      customerId: rahul,
      vehicleSlug: "hyundai-i20",
      pickupAt: new Date("2026-09-12T09:00:00+05:30"),
      returnAt: new Date("2026-09-14T09:00:00+05:30"),
      status: "COMPLETED" as const,
      paymentStatus: "PAID" as const,
      rentalAmount: 5598,
      deposit: 5000,
      couponCode: null,
      payment: { method: "CARD" as const, provider: "RAZORPAY" as const, status: "PAID" as const },
    },
  ];

  const bookingIds: Record<string, string> = {};

  for (const seed of bookingSeeds) {
    const existing = await prisma.booking.findUnique({ where: { code: seed.code } });
    if (existing) {
      bookingIds[seed.code] = existing.id;
      continue;
    }

    const discount = seed.couponCode === "SAVARI20" ? 199 : 0;
    const total = seed.rentalAmount + seed.deposit - discount;
    const booking = await prisma.booking.create({
      data: {
        code: seed.code,
        customerId: seed.customerId,
        vehicleId: context.vehicleIds[seed.vehicleSlug],
        pickupLocationId: hub,
        dropLocationId: hub,
        couponId: seed.couponCode ? context.couponIds[seed.couponCode] : null,
        pickupAt: seed.pickupAt,
        returnAt: seed.returnAt,
        durationDays: Math.max(
          1,
          Math.round((seed.returnAt.getTime() - seed.pickupAt.getTime()) / 86_400_000),
        ),
        status: seed.status,
        paymentStatus: seed.paymentStatus,
        rentalAmount: seed.rentalAmount,
        depositAmount: seed.deposit,
        discountAmount: discount,
        totalAmount: total,
        currency: "INR",
        cancelledAt: seed.status === "CANCELLED" ? seed.pickupAt : null,
        cancellationReason: seed.status === "CANCELLED" ? "Plans changed" : null,
        items: {
          create: [
            {
              kind: "VEHICLE_RENTAL",
              label: "Vehicle rental",
              quantity: 1,
              unitAmount: seed.rentalAmount,
              totalAmount: seed.rentalAmount,
            },
            {
              kind: "HELMET",
              label: "Helmets (2)",
              quantity: 2,
              unitAmount: 0,
              totalAmount: 0,
            },
            {
              kind: "INSURANCE",
              label: "Third-party insurance",
              quantity: 1,
              unitAmount: 0,
              totalAmount: 0,
            },
          ],
        },
        payments: {
          create: {
            provider: seed.payment.provider,
            method: seed.payment.method,
            amount: total,
            status: seed.payment.status,
            providerOrderId: `seed_order_${seed.code}`,
            providerPaymentId:
              seed.payment.status === "FAILED" ? null : `seed_pay_${seed.code}`,
            failureCode: seed.payment.status === "FAILED" ? "card_declined" : null,
            failureMessage:
              seed.payment.status === "FAILED" ? "The bank declined this transaction." : null,
            paidAt: seed.payment.status === "PAID" ? seed.pickupAt : null,
            createdAt: new Date(seed.pickupAt.getTime() - 3 * 86_400_000),
            refunds:
              seed.payment.status === "REFUNDED"
                ? {
                    create: {
                      amount: total,
                      reason: "Booking cancelled outside 24 hours",
                      status: "COMPLETED",
                      providerRefundId: `seed_refund_${seed.code}`,
                      processedAt: new Date(seed.pickupAt.getTime() - 2 * 86_400_000),
                    },
                  }
                : undefined,
          },
        },
      },
    });
    bookingIds[seed.code] = booking.id;
  }

  await prisma.vehicleAvailability.deleteMany({
    where: { bookingId: { in: Object.values(bookingIds) } },
  });

  const availabilitySeeds = [
    { code: "SVR8842", vehicleSlug: "honda-activa-6g", status: "BOOKED" as const },
    { code: "SVR7315", vehicleSlug: "royal-enfield-classic-350", status: "BOOKED" as const },
    { code: "SVR6201", vehicleSlug: "hyundai-i20", status: "BOOKED" as const },
    { code: "SVR7410", vehicleSlug: "honda-activa-6g", status: "BOOKED" as const },
    { code: "SVR7333", vehicleSlug: "hyundai-i20", status: "BOOKED" as const },
  ];

  for (const item of availabilitySeeds) {
    const booking = await prisma.booking.findUnique({ where: { code: item.code } });
    if (!booking) continue;
    await prisma.vehicleAvailability.create({
      data: {
        vehicleId: context.vehicleIds[item.vehicleSlug],
        bookingId: booking.id,
        startsAt: booking.pickupAt,
        endsAt: booking.returnAt,
        status: item.status,
        note: `Held for booking ${item.code}`,
      },
    });
  }

  await prisma.vehicleAvailability.deleteMany({
    where: { vehicleId: context.vehicleIds["mahindra-thar"], bookingId: null },
  });
  await prisma.vehicleAvailability.create({
    data: {
      vehicleId: context.vehicleIds["mahindra-thar"],
      startsAt: new Date("2026-11-12T08:00:00+05:30"),
      endsAt: new Date("2026-11-13T18:00:00+05:30"),
      status: "MAINTENANCE",
      note: "Scheduled service and tyre rotation",
    },
  });

  await prisma.vehicleAvailability.deleteMany({
    where: { vehicleId: context.vehicleIds["ktm-duke-200"], bookingId: null },
  });
  await prisma.vehicleAvailability.create({
    data: {
      vehicleId: context.vehicleIds["ktm-duke-200"],
      startsAt: new Date("2026-11-15T08:00:00+05:30"),
      endsAt: new Date("2026-11-16T20:00:00+05:30"),
      status: "BLOCKED",
      note: "Owner hold",
    },
  });

  const reviewSeeds = [
    {
      bookingCode: "SVR7315",
      vehicleSlug: "royal-enfield-classic-350",
      customerId: karthik,
      rating: 5,
      title: "Perfect for the ECR",
      comment:
        "The Classic was serviced, spotless and ready on time. Rode it to Auroville and back — zero fuss, and the deposit was back in two days.",
    },
    {
      bookingCode: "SVR7410",
      vehicleSlug: "honda-activa-6g",
      customerId: ananya,
      rating: 5,
      title: "Zero paperwork drama",
      comment:
        "Picked up an Activa at 8am near Rock Beach and returned it two days later. Helmet included and the scooter was genuinely well maintained.",
    },
    {
      bookingCode: "SVR7333",
      vehicleSlug: "hyundai-i20",
      customerId: rahul,
      rating: 5,
      title: "Delivered to the hotel",
      comment:
        "Booked the i20 for a family weekend. It arrived with a full tank and the deposit came back quickly. This is how rentals should work.",
    },
  ];

  for (const review of reviewSeeds) {
    const bookingId = bookingIds[review.bookingCode];
    if (!bookingId) continue;
    await prisma.review.upsert({
      where: { bookingId },
      update: {},
      create: {
        bookingId,
        vehicleId: context.vehicleIds[review.vehicleSlug],
        customerId: review.customerId,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isPublished: true,
      },
    });
  }

  return { bookingIds, karthik };
}

async function seedNotifications(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.notification.createMany({
    data: [
      {
        userId,
        type: "BOOKING_CONFIRMED",
        channel: "IN_APP",
        title: "Your Activa is confirmed",
        body: "Booking SVR8842 is confirmed for 10 Nov, 9:00 am at White Town Hub.",
        status: "SENT",
        sentAt: new Date("2026-11-05T11:30:00+05:30"),
        metadata: { bookingCode: "SVR8842" },
      },
      {
        userId,
        type: "REFUND_PROCESSED",
        channel: "EMAIL",
        title: "Refund completed",
        body: "₹1,599 for SVR5920 was refunded to your original payment method.",
        status: "SENT",
        sentAt: new Date("2026-08-31T09:15:00+05:30"),
        metadata: { bookingCode: "SVR5920", amount: 1599 },
      },
      {
        userId,
        type: "OFFER",
        channel: "IN_APP",
        title: "20% off two-wheelers this month",
        body: "Use SAVARI20 before 30 Nov on any scooter or motorcycle booking.",
        status: "QUEUED",
        metadata: { coupon: "SAVARI20" },
      },
      {
        userId,
        type: "PICKUP_REMINDER",
        channel: "WHATSAPP",
        title: "Pickup tomorrow at 9:00 am",
        body: "Bring your driving licence and one photo ID for SVR8842.",
        status: "QUEUED",
        metadata: { bookingCode: "SVR8842" },
      },
    ],
  });
}

async function seedSettings(adminId: string) {
  const settings = [
    {
      key: "platform.commission_percent",
      value: 20,
      description: "Partner commission on each rental",
    },
    {
      key: "booking.free_cancellation_hours",
      value: 24,
      description: "Hours before pickup for a full refund",
    },
    {
      key: "booking.deposit_refund_days",
      value: 3,
      description: "Working days to release a security deposit",
    },
    {
      key: "support.phone",
      value: "+91 98765 43210",
      description: "Customer support line",
    },
    {
      key: "support.email",
      value: "support@savarigo.com",
      description: "Customer support email",
    },
    {
      key: "app.currency",
      value: "INR",
      description: "Billing currency",
    },
  ];

  for (const setting of settings) {
    await prisma.adminSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, updatedById: adminId },
      create: { ...setting, updatedById: adminId },
    });
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "seed.run",
        entityType: "AdminSetting",
        entityId: null,
        after: { settings: settings.length },
        ipAddress: "127.0.0.1",
        userAgent: "prisma-seed",
      },
    });
  }
}

type PartnerDefinition = {
  email: string;
  partnerCode: string;
  tradingName: string;
  legalName: string;
  city: string;
  state: string;
  addressLine1: string;
  gstin?: string;
  commissionPercent: number;
  status: PartnerStatus;
  takes: string[];
};

const partnerDefinitions: PartnerDefinition[] = [
  {
    email: "vendor@savarigo.com",
    partnerCode: "PR001",
    tradingName: "Pondy Rides",
    legalName: "Pondy Rides Pvt Ltd",
    city: "Puducherry",
    state: "Puducherry",
    addressLine1: "5, Beach Road, White Town",
    gstin: "33AABCP1234F1Z5",
    commissionPercent: 20,
    status: "APPROVED",
    takes: [] as string[],
  },
  {
    email: "auroville@rentals.savarigo.com",
    partnerCode: "PR002",
    tradingName: "Auroville Rentals",
    legalName: "Auroville Rentals Co-op",
    city: "Puducherry",
    state: "Tamil Nadu",
    addressLine1: "Front Road, Auroville",
    gstin: "33AACFA5678K1Z2",
    commissionPercent: 18,
    status: "APPROVED",
    takes: ["ola-s1-pro", "tvs-jupiter-125"],
  },
  {
    email: "chennai@wheels.savarigo.com",
    partnerCode: "PR003",
    tradingName: "Chennai Wheels",
    legalName: "Chennai Wheels LLP",
    city: "Chennai",
    state: "Tamil Nadu",
    addressLine1: "12, Anna Salai",
    gstin: "33AACFC9012B1Z9",
    commissionPercent: 15,
    status: "PENDING",
    takes: [],
  },
  {
    email: "beach@rides.savarigo.com",
    partnerCode: "PR004",
    tradingName: "Beach Rides",
    legalName: "Beach Rides Sole Prop",
    city: "Chennai",
    state: "Tamil Nadu",
    addressLine1: "Marina Beach Road",
    commissionPercent: 15,
    status: "SUSPENDED",
    takes: [],
  },
];

async function seedPartners(context: {
  roles: Record<string, string>;
  admin: { id: string };
  vendor: { id: string };
  riders: Record<string, string>;
  fleet: { vehicleIds: Record<string, string> };
}) {
  const { roles, admin, riders, fleet } = context;
  const passwordHash = hashPassword(DEMO_PASSWORD);

  for (const definition of partnerDefinitions) {
    const user = await prisma.user.upsert({
      where: { email: definition.email },
      update: { status: "ACTIVE" },
      create: {
        email: definition.email,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date("2026-01-05T09:00:00+05:30"),
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.VENDOR } },
      update: {},
      create: { userId: user.id, roleId: roles.VENDOR },
    });

    const profile = await prisma.vendorProfile.upsert({
      where: { userId: user.id },
      update: {
        partnerCode: definition.partnerCode,
        tradingName: definition.tradingName,
        legalName: definition.legalName,
        city: definition.city,
        state: definition.state,
        addressLine1: definition.addressLine1,
        gstin: definition.gstin ?? null,
        commissionPercent: definition.commissionPercent,
        status: definition.status,
      },
      create: {
        userId: user.id,
        partnerCode: definition.partnerCode,
        tradingName: definition.tradingName,
        legalName: definition.legalName,
        city: definition.city,
        state: definition.state,
        addressLine1: definition.addressLine1,
        gstin: definition.gstin ?? null,
        commissionPercent: definition.commissionPercent,
        status: definition.status,
        approvedAt:
          definition.status === "APPROVED"
            ? new Date("2026-01-08T10:00:00+05:30")
            : null,
        decisionNote:
          definition.status === "SUSPENDED"
            ? "Two expired insurance copies on file."
            : null,
      },
    });

    // Partners with no fleet of their own would leave the list looking empty.
    for (const slug of definition.takes) {
      const vehicleId = fleet.vehicleIds[slug];
      if (vehicleId) {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: { ownerId: user.id },
        });
      }
    }

    await prisma.vendorDocument.deleteMany({ where: { vendorId: profile.id } });

    const owned = await prisma.vehicle.findMany({
      where: { ownerId: user.id },
      select: { id: true, slug: true, registrationNumber: true },
    });

    const documents: Prisma.VendorDocumentCreateManyInput[] = [
      {
        vendorId: profile.id,
        kind: "KYC",
        title: `${definition.tradingName} director KYC`,
        reference: definition.gstin ?? definition.partnerCode,
        url: "",
        status: definition.status === "PENDING" ? "PENDING" : "APPROVED",
        reviewedAt:
          definition.status === "PENDING" ? null : new Date("2026-01-08T10:00:00+05:30"),
        reviewedById: definition.status === "PENDING" ? null : admin.id,
      },
      {
        vendorId: profile.id,
        kind: "GST",
        title: "GST registration certificate",
        reference: definition.gstin ?? null,
        url: "",
        status: "PENDING",
      },
      ...owned.map<Prisma.VendorDocumentCreateManyInput>((vehicle, index) => ({
        vendorId: profile.id,
        vehicleId: vehicle.id,
        kind: index % 2 === 0 ? "VEHICLE_RC" : "INSURANCE",
        title: `${
          index % 2 === 0 ? "Registration certificate" : "Insurance policy"
        } - ${vehicle.registrationNumber}`,
        reference: vehicle.registrationNumber,
        url: "",
        // Leave a few in the queue so verification has real work to do.
        status: index % 3 === 0 ? "PENDING" : "APPROVED",
        reviewedAt:
          index % 3 === 0 ? null : new Date("2026-02-01T11:00:00+05:30"),
        reviewedById: index % 3 === 0 ? null : admin.id,
      })),
    ];

    await prisma.vendorDocument.createMany({ data: documents });
  }

  const seededTickets = ["TCK420118", "TCK420119", "TCK420120"];
  await prisma.supportTicket.deleteMany({ where: { code: { in: seededTickets } } });

  const pondy = await prisma.vendorProfile.findUnique({
    where: { partnerCode: "PR001" },
    select: { id: true },
  });
  const bookingByCode = async (code: string) =>
    prisma.booking.findUnique({ where: { code }, select: { id: true } });

  const depositBooking = await bookingByCode("SVR8842");
  const helmetBooking = await bookingByCode("SVR7315");

  await prisma.supportTicket.create({
    data: {
      code: "TCK420118",
      customerId: riders["karthik@email.com"],
      bookingId: depositBooking?.id ?? null,
      category: "PAYMENT",
      priority: "HIGH",
      subject: "Deposit still held after returning the car",
      status: "IN_PROGRESS",
      messages: {
        create: [
          {
            authorId: riders["karthik@email.com"],
            body: "I returned the i20 on time but the security deposit has not landed back in my UPI.",
            isFromStaff: false,
            createdAt: new Date("2026-11-14T09:20:00+05:30"),
          },
          {
            authorId: admin.id,
            body: "Refund initiated with the gateway, it usually settles within three working days.",
            isFromStaff: true,
            createdAt: new Date("2026-11-14T11:05:00+05:30"),
          },
        ],
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      code: "TCK420119",
      vendorId: pondy?.id ?? null,
      category: "PARTNER",
      priority: "NORMAL",
      subject: "Payout date for November rentals",
      status: "OPEN",
      messages: {
        create: [
          {
            authorId: admin.id,
            body: "Our November fleet has been fully rented. When does the payout for this month land?",
            isFromStaff: false,
            createdAt: new Date("2026-11-16T16:40:00+05:30"),
          },
        ],
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      code: "TCK420120",
      customerId: riders["ananya@example.com"],
      bookingId: helmetBooking?.id ?? null,
      category: "VEHICLE",
      priority: "LOW",
      subject: "Only one helmet supplied for two riders",
      status: "RESOLVED",
      closedAt: new Date("2026-11-12T18:00:00+05:30"),
      messages: {
        create: [
          {
            authorId: riders["ananya@example.com"],
            body: "The booking listed two helmets but the hub handed over one.",
            isFromStaff: false,
            createdAt: new Date("2026-11-11T10:15:00+05:30"),
          },
          {
            authorId: admin.id,
            body: "Apologies - the hub has been reminded and a second helmet was couriered the same day.",
            isFromStaff: true,
            createdAt: new Date("2026-11-12T09:30:00+05:30"),
          },
        ],
      },
    },
  });

  console.log("Partners, documents and support tickets ready.");
}

async function main() {
  console.log("Seeding SavariGo database…");

  const { roles } = await seedAccess();
  const { admin, vendor, riders } = await seedUsers(roles);
  const fleet = await seedFleet(vendor.id);
  const { karthik } = await seedBookings({ ...fleet, riders });
  await seedNotifications(karthik);
  await seedSettings(admin.id);
  await seedPartners({ roles, admin, vendor, riders, fleet });

  console.log("Seed complete.");
  console.log(`Demo logins (password: ${DEMO_PASSWORD})`);
  console.log("  customer  karthik@email.com");
  console.log("  vendor    vendor@savarigo.com");
  console.log("  admin     admin@savarigo.com");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
