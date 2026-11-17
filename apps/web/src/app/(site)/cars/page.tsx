import type { Metadata } from "next";
import { BrowseHeader, VehicleBrowse } from "@/components/vehicles/browse";
import { Breadcrumbs } from "@/components/shared/section";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { vehicles as fixtures } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Car Rentals in Puducherry",
  description:
    "Self-drive car rentals in Puducherry from ₹2,499/day. Hatchbacks, sedans and SUVs with doorstep delivery and unlimited kilometres.",
};

const typeOptions = [
  { value: "hatchback", label: "Hatchback" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
];

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const apiVehicles = await safeVehicles({ category: "car", limit: 48 });
  const cars = apiVehicles.length
    ? apiVehicles.map(toVehicle)
    : fixtures.filter((vehicle) => vehicle.category === "car");

  return (
    <>
      <BrowseHeader
        title="Car Rentals"
        description="Comfortable self-drive cars for work, family travel and weekend trips — delivered to your doorstep with a full tank."
        count={cars.filter((v) => v.available).length}
      >
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Car Rental" },
          ]}
        />
      </BrowseHeader>

      <VehicleBrowse
        vehicles={cars}
        typeOptions={typeOptions}
        initialFilters={{ types: type ? [type] : [] }}
        query={{ city, from, to }}
        emptyMessage="No cars match these filters. Try increasing your budget or checking another body type."
        pageSize={6}
      />
    </>
  );
}
