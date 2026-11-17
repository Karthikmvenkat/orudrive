import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHero } from "@/components/dashboard/ui";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { savedVehicleSlugs } from "@/lib/data/account";
import { vehicles } from "@/lib/data/vehicles";

export const metadata: Metadata = { title: "Saved Vehicles" };

export default function SavedVehiclesPage() {
  const saved = vehicles.filter((v) => savedVehicleSlugs.includes(v.slug));

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow={`${saved.length} vehicles`}
        title="Saved Vehicles"
        description="Your shortlist for weekend getaways and daily commutes."
        action={
          <Button asChild variant="outline">
            <Link href="/cars">
              Explore more rides <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {saved.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} defaultSaved />
        ))}
      </div>

      <div className="rounded-panel border border-dashed border-line-strong bg-surface px-5 py-4">
        <p className="text-[12.5px] text-ink-soft">
          Prices update in real time and saved vehicles aren&apos;t reserved — book early on
          weekends to lock in your dates.
        </p>
      </div>
    </div>
  );
}
