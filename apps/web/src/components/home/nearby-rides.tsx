"use client";

import { useEffect, useState } from "react";
import { VehicleCarousel } from "@/components/vehicles/vehicle-carousel";
import { toVehicle } from "@/lib/api/adapters";
import type { ApiVehicle, Paginated } from "@/lib/api/types";
import { detectUserLocation, distanceKm, hubBySlug } from "@/lib/geo";
import type { Vehicle } from "@/types";

export function NearbyRides({ fallback }: { fallback: Vehicle[] }) {
  const [vehicles, setVehicles] = useState(fallback);
  const [hubLabel, setHubLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    detectUserLocation().then(async (point) => {
      if (!active || !point) return;
      try {
        const response = await fetch("/api/proxy/vehicles?sort=popular&limit=48", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as Paginated<ApiVehicle>;
        const ranked = payload.data
          .map((vehicle) => {
            const hub = hubBySlug(vehicle.location.slug);
            return {
              vehicle,
              km: hub ? distanceKm(point, hub) : Number.POSITIVE_INFINITY,
            };
          })
          .sort((a, b) => a.km - b.km)
          .slice(0, 8);
        if (!active || ranked.length === 0) return;
        setVehicles(ranked.map((entry) => toVehicle(entry.vehicle)));
        setHubLabel(hubBySlug(ranked[0].vehicle.location.slug)?.label ?? null);
      } catch {
        // Keep the server-rendered popular list if the refetch fails.
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <VehicleCarousel
      vehicles={vehicles}
      title="Popular rides near you"
      description={
        hubLabel
          ? `Top-rated rides closest to you, starting at our ${hubLabel} hub.`
          : "Top-rated and most booked vehicles in Pondicherry."
      }
      href="/vehicles"
    />
  );
}
