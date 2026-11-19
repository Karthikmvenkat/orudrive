import type { Metadata } from "next";
import { BikesBrowse } from "@/components/vehicles/bikes-browse";
import { BikesHero } from "@/components/vehicles/bikes-hero";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { vehicles as fixtures } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Bike & Scooter Rentals in Puducherry",
  description:
    "Rent scooters and motorcycles in Puducherry from ₹449/day. Helmets included, verified vehicles and free cancellation up to 24 hours.",
};

export default async function BikesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const fuel = typeof sp.fuel === "string" ? sp.fuel : "";

  const apiVehicles = await safeVehicles({ limit: 48 });
  const twoWheelers = apiVehicles.length
    ? apiVehicles
        .filter((vehicle) => vehicle.category.slug !== "car")
        .map(toVehicle)
    : fixtures.filter((vehicle) => vehicle.category !== "car");

  const initialType =
    type === "scooter" || type === "motorcycle" ? type : ("all" as const);

  return (
    <>
      <BikesHero count={twoWheelers.filter((vehicle) => vehicle.available).length} />
      <BikesBrowse vehicles={twoWheelers} initialType={initialType} initialFuel={fuel} />
    </>
  );
}
