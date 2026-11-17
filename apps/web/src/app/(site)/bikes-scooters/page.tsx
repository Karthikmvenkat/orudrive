import type { Metadata } from "next";
import { BrowseHeader, VehicleBrowse } from "@/components/vehicles/browse";
import { Breadcrumbs } from "@/components/shared/section";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { vehicles as fixtures } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Bike & Scooter Rentals in Puducherry",
  description:
    "Rent scooters and motorcycles in Puducherry from ₹449/day. Helmets included, verified vehicles and free cancellation up to 24 hours.",
};

const typeOptions = [
  { value: "scooter", label: "Scooter" },
  { value: "motorcycle", label: "Motorcycle" },
];

export default async function BikesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const fuel = typeof sp.fuel === "string" ? sp.fuel : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const apiVehicles = await safeVehicles({ limit: 48 });
  const twoWheelers = apiVehicles.length
    ? apiVehicles
        .filter((vehicle) => vehicle.category.slug !== "car")
        .map(toVehicle)
    : fixtures.filter((vehicle) => vehicle.category !== "car");

  return (
    <>
      <BrowseHeader
        title="Bike & Scooter Rentals"
        description="Choose from a wide range of well-maintained bikes and scooters — helmets, insurance and roadside assistance included."
        count={twoWheelers.filter((v) => v.available).length}
      >
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Bike Rentals" },
          ]}
        />
      </BrowseHeader>

      <VehicleBrowse
        vehicles={twoWheelers}
        typeOptions={typeOptions}
        initialFilters={{
          types: type ? [type] : [],
          fuels: fuel === "Electric" ? ["Electric"] : [],
        }}
        query={{ city, from, to }}
      />
    </>
  );
}
