import type { Metadata } from "next";
import { BrowseHeader, VehicleBrowse } from "@/components/vehicles/browse";
import { Breadcrumbs } from "@/components/shared/section";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { vehicles as fixtures } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "All Vehicles for Rent in Puducherry",
  description:
    "Browse every scooter, motorcycle and car available on SavariGo in Puducherry. Transparent daily pricing, verified vendors and free cancellation up to 24 hours.",
};

const typeOptions = [
  { value: "scooter", label: "Scooter" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "hatchback", label: "Hatchback" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
];

export default async function AllVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const apiVehicles = await safeVehicles({ limit: 48 });
  const allVehicles = apiVehicles.length ? apiVehicles.map(toVehicle) : fixtures;

  return (
    <>
      <BrowseHeader
        title="All Vehicles"
        description="Every scooter, motorcycle and self-drive car available on SavariGo — filter by type, fuel, seats and budget."
        count={allVehicles.filter((vehicle) => vehicle.available).length}
      >
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "All Vehicles" }]}
        />
      </BrowseHeader>

      <VehicleBrowse
        vehicles={allVehicles}
        typeOptions={typeOptions}
        initialFilters={{ types: type ? [type] : [] }}
        query={{ city, from, to }}
      />
    </>
  );
}
