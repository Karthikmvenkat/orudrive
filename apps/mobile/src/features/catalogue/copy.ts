import type { ApiVehicle, FuelValue } from '@/lib/api/types';

export type RideCategoryKey = 'car' | 'motorcycle' | 'scooter';

/** The same four inclusions the website lists under "What's included". */
const FEATURES: Record<RideCategoryKey, string[]> = {
  scooter: [
    'Well maintained vehicles',
    'Free helmet',
    '24/7 support',
    'Flexible rental plans',
  ],
  motorcycle: [
    'Serviced regularly',
    '2 helmets included',
    'Roadside assistance',
    'Saddle bag on request',
  ],
  car: ['Doorstep delivery', 'Comprehensive insurance', '24/7 roadside support', 'Clean, sanitised cabin'],
};

/** Mirrors `categoryOf()` in `apps/web/src/lib/api/adapters.ts`. */
export function categoryKey(slug: string | undefined): RideCategoryKey {
  return slug === 'car' || slug === 'motorcycle' ? slug : 'scooter';
}

export function includedFeatures(slug: string | undefined): string[] {
  return FEATURES[categoryKey(slug)];
}

export function isBookedOut(vehicle: ApiVehicle): boolean {
  return vehicle.status !== 'AVAILABLE';
}

/** The website only calls the distance figure "Range" once the ride is electric. */
export function mileageLabel(fuelType: FuelValue): string {
  return fuelType === 'ELECTRIC' ? 'Range' : 'Mileage';
}

/** Drop a trailing unit word the label beside it already states, so tiles stay on one line. */
export function compactMileage(value: string, label: string): string {
  const trimmed = value.replace(new RegExp(`\\s+${label}\\s*$`, 'i'), '').trim();
  return trimmed || value;
}

export function mileageLimitLabel(kmLimit: number | null): string {
  return kmLimit === null ? 'Unlimited kilometres' : `${kmLimit} km/day included`;
}

/** Same three badges, same 4.8 threshold, same order as the website's `tags`. */
export function rideTags(vehicle: ApiVehicle): string[] {
  const tags: string[] = [];
  if (vehicle.popular) tags.push('Most booked');
  if (vehicle.rating >= 4.8) tags.push('Top rated');
  if (vehicle.fuelType === 'ELECTRIC') tags.push('Electric');
  return tags;
}
