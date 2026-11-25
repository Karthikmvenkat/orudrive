import { Prisma } from "@prisma/client";

export const vehicleInclude = {
  category: true,
  location: true,
  images: { orderBy: { sortOrder: "asc" } },
  pricing: {
    where: { isActive: true },
    orderBy: { baseDayRate: "asc" },
  },
  owner: { select: { id: true, email: true } },
} satisfies Prisma.VehicleInclude;

export type VehicleWithRelations = Prisma.VehicleGetPayload<{
  include: typeof vehicleInclude;
}>;

export interface SerializeVehicleOptions {
  staff?: boolean;
}

export function serializeVehicle(
  vehicle: VehicleWithRelations,
  options: SerializeVehicleOptions = {},
) {
  const images = vehicle.images.map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  }));
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  return {
    id: vehicle.id,
    slug: vehicle.slug,
    name: vehicle.name,
    brand: vehicle.brand,
    year: vehicle.year,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    seats: vehicle.seats,
    engine: vehicle.engine,
    mileage: vehicle.mileage,
    description: vehicle.description,
    status: vehicle.status,
    rating: Number(vehicle.rating),
    reviewCount: vehicle.reviewCount,
    popular: vehicle.popular,
    mileageLimitKm: vehicle.mileageLimitKm,
    luggageCapacity: vehicle.luggageCapacity,
    ac: vehicle.ac,
    depositAmount: Number(vehicle.depositAmount),
    pricePerDay: Number(vehicle.fromPrice),
    category: {
      id: vehicle.category.id,
      slug: vehicle.category.slug,
      name: vehicle.category.name,
    },
    location: {
      id: vehicle.location.id,
      slug: vehicle.location.slug,
      name: vehicle.location.name,
      city: vehicle.location.city,
      address: vehicle.location.addressLine1,
    },
    primaryImage: primary ?? null,
    images,
    pricing: vehicle.pricing.map((plan) => ({
      id: plan.id,
      name: plan.name,
      baseDayRate: Number(plan.baseDayRate),
      extraKmRate: Number(plan.extraKmRate),
      depositAmount: Number(plan.depositAmount),
      mileageLimitKm: plan.mileageLimitKm,
      minDays: plan.minDays,
      weeklyDiscountPercent:
        plan.weeklyDiscountPercent === null
          ? null
          : Number(plan.weeklyDiscountPercent),
      monthlyDiscountPercent:
        plan.monthlyDiscountPercent === null
          ? null
          : Number(plan.monthlyDiscountPercent),
      currency: plan.currency,
      validFrom: plan.validFrom,
      validTo: plan.validTo,
      isActive: plan.isActive,
    })),
    ...(options.staff
      ? {
          registrationNumber: vehicle.registrationNumber,
          owner: vehicle.owner,
          createdAt: vehicle.createdAt,
          updatedAt: vehicle.updatedAt,
        }
      : {}),
  };
}
