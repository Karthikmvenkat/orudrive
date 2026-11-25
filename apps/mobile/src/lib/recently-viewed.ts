import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ApiVehicle } from '@/lib/api/types';

const KEY = 'savarigo.recently-viewed';
const LIMIT = 12;

/** A snapshot taken when the ride page opens, so the list works offline too. */
export type RecentRide = {
  id: string;
  slug: string;
  name: string;
  pricePerDay: number;
  city: string;
  image: string | null;
  viewedAt: string;
};

async function readRaw(): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? window.localStorage.getItem(KEY)
        : null
      : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(raw: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(KEY, raw);
}

export async function readRecentlyViewed(): Promise<RecentRide[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is RecentRide =>
            entry !== null &&
            typeof entry === 'object' &&
            typeof entry.id === 'string' &&
            typeof entry.slug === 'string' &&
            typeof entry.name === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export async function recordRecentlyViewed(vehicle: ApiVehicle): Promise<void> {
  const current = await readRecentlyViewed();
  const entry: RecentRide = {
    id: vehicle.id,
    slug: vehicle.slug,
    name: vehicle.name,
    pricePerDay: vehicle.pricePerDay,
    city: vehicle.location.city,
    image: vehicle.primaryImage?.url ?? null,
    viewedAt: new Date().toISOString(),
  };
  const next = [entry, ...current.filter((ride) => ride.id !== vehicle.id)].slice(0, LIMIT);
  try {
    await writeRaw(JSON.stringify(next));
  } catch {
    // A full key store should not break the ride page.
  }
}
