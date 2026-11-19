export type Coordinates = { latitude: number; longitude: number };

export type ServiceHub = Coordinates & {
  slug: string;
  label: string;
};

/** The hubs that actually hold inventory, with their approximate centres. */
export const serviceHubs: ServiceHub[] = [
  { slug: "white-town", label: "White Town", latitude: 11.9325, longitude: 79.8358 },
  { slug: "auroville", label: "Auroville", latitude: 12.0054, longitude: 79.8106 },
  { slug: "airport-road", label: "Lawspet", latitude: 11.9683, longitude: 79.8125 },
];

export function distanceKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function hubBySlug(slug: string): ServiceHub | null {
  return serviceHubs.find((hub) => hub.slug === slug) ?? null;
}

/** Closest hub to the visitor, or null when they are outside the service area. */
export function nearestHub(point: Coordinates, maxKm = 15): ServiceHub | null {
  let best: { hub: ServiceHub; km: number } | null = null;
  for (const hub of serviceHubs) {
    const km = distanceKm(point, hub);
    if (!best || km < best.km) best = { hub, km };
  }
  return best && best.km <= maxKm ? best.hub : null;
}

let detection: Promise<Coordinates | null> | null = null;

/** Shared lookup: the booking bar and the nearby section ask the browser once. */
export function detectUserLocation(): Promise<Coordinates | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  detection ??= new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
  return detection;
}
