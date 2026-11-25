import type { Metadata } from "next";
import { BrowseHeader, VehicleBrowse } from "@/components/vehicles/browse";
import { Breadcrumbs } from "@/components/shared/section";
import { toVehicle } from "@/lib/api/adapters";
import { safeVehicles } from "@/lib/api/catalogue";
import { vehicles as fixtures } from "@/lib/data/vehicles";

export const metadata: Metadata = {
  title: "Van Rentals in Puducherry",
  description:
    "Self-drive van rentals in Puducherry — people movers, cargo vans and minibuses with AC, luggage space and doorstep delivery.",
};

const typeOptions = [
  { value: "people-mover", label: "People Mover" },
  { value: "cargo", label: "Cargo" },
  { value: "minibus", label: "Minibus" },
];

export default async function VansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const apiVehicles = await safeVehicles({ category: "van", limit: 48 });
  const vans = apiVehicles.length
    ? apiVehicles.map(toVehicle)
    : fixtures.filter((vehicle) => vehicle.category === "van");

  return (
    <>
      <BrowseHeader
        title="Van Rentals"
        description="People movers, cargo vans and minibuses for the whole crew — AC cabins, a proper luggage bay and doorstep delivery across Puducherry."
        count={vans.filter((v) => v.available).length}
      >
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Van Rental" },
          ]}
        />
      </BrowseHeader>

      <VehicleBrowse
        vehicles={vans}
        typeOptions={typeOptions}
        initialFilters={{ types: type ? [type] : [] }}
        query={{ city, from, to }}
        emptyMessage="No vans match these filters. Try another body type or widen your budget."
        pageSize={6}
      />
    </>
  );
}