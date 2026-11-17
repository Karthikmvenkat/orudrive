import { apiRequest, ApiError } from "./http";
import type {
  ApiCategory,
  ApiCoupon,
  ApiLocation,
  ApiVehicle,
  Paginated,
} from "./types";

const CATALOGUE_REVALIDATE = 60;

export interface VehicleQuery {
  category?: string;
  location?: string;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating" | "popular";
  fuelType?: string;
  transmission?: string;
  limit?: number;
  page?: number;
}

export async function fetchVehicles(query: VehicleQuery = {}): Promise<ApiVehicle[]> {
  const result = await apiRequest<Paginated<ApiVehicle>>("/vehicles", {
    query: { limit: 48, ...query },
    revalidate: CATALOGUE_REVALIDATE,
  });
  return result.data;
}

export async function safeVehicles(query: VehicleQuery = {}): Promise<ApiVehicle[]> {
  try {
    return await fetchVehicles(query);
  } catch (error) {
    if (!(error instanceof ApiError)) console.error("[catalogue]", error);
    else console.error(`[catalogue] vehicles unavailable: ${error.message}`);
    return [];
  }
}

export async function fetchVehicle(slug: string): Promise<ApiVehicle | null> {
  try {
    return await apiRequest<ApiVehicle>(`/vehicles/${encodeURIComponent(slug)}`, {
      revalidate: 30,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function safeVehicle(slug: string): Promise<ApiVehicle | null> {
  try {
    return await fetchVehicle(slug);
  } catch (error) {
    console.error("[catalogue] vehicle lookup failed", error);
    return null;
  }
}

export async function safeCategories(): Promise<ApiCategory[]> {
  try {
    return await apiRequest<ApiCategory[]>("/categories", {
      revalidate: CATALOGUE_REVALIDATE,
    });
  } catch (error) {
    console.error("[catalogue] categories unavailable", error);
    return [];
  }
}

export async function safeLocations(): Promise<ApiLocation[]> {
  try {
    return await apiRequest<ApiLocation[]>("/locations", {
      revalidate: CATALOGUE_REVALIDATE,
    });
  } catch (error) {
    console.error("[catalogue] locations unavailable", error);
    return [];
  }
}

export async function safeCoupons(): Promise<ApiCoupon[]> {
  try {
    return await apiRequest<ApiCoupon[]>("/coupons", {
      revalidate: CATALOGUE_REVALIDATE,
    });
  } catch (error) {
    console.error("[catalogue] coupons unavailable", error);
    return [];
  }
}

export async function validateCoupon(body: {
  code: string;
  vehicleId: string;
  pickupAt?: string;
  returnAt?: string;
}) {
  return apiRequest<{
    valid: boolean;
    discount: number;
    coupon?: { code: string; title: string; type: string; value: number };
    message?: string;
  }>("/coupons/validate", { method: "POST", body, cache: "no-store" });
}
