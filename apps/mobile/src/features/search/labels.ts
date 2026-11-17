import type { ApiVehicle } from '@/lib/api/types';
import { fuelLabel } from '@/lib/format';

/** The website uses the same three-part summary, so both surfaces say the same thing. */
export function vehicleSpecLabel(vehicle: Pick<ApiVehicle, 'seats' | 'transmission' | 'fuelType'>): string {
  return `${vehicle.seats} seats · ${vehicle.transmission.toLowerCase()} · ${fuelLabel(vehicle.fuelType)}`;
}

export { formatMoney, ratingLine, vehicleStatusLabel } from '@/lib/format';
