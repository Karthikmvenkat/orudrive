import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Fuel, Gauge, MapPin, Settings2, Users } from "lucide-react";
import { vehicles, vehicleBySlug } from "@/lib/data/vehicles";
import { toCheckoutLocation, toVehicle } from "@/lib/api/adapters";
import { safeLocations, safeVehicle, safeVehicles } from "@/lib/api/catalogue";
import { Breadcrumbs } from "@/components/shared/section";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/shared/rating";
import { VehicleGallery } from "@/components/vehicles/vehicle-gallery";
import { VehicleTabs } from "@/components/vehicles/vehicle-tabs";
import { BookingWidget, MobileBookingBar } from "@/components/vehicles/booking-widget";
import { VehicleCard } from "@/components/vehicles/vehicle-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const apiVehicle = await safeVehicle(slug);
  const vehicle = apiVehicle ? toVehicle(apiVehicle) : vehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle not found" };
  return {
    title: `Rent ${vehicle.name} in ${vehicle.location} — ₹${vehicle.pricePerDay}/day`,
    description: vehicle.description,
  };
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const [apiVehicle, locations] = await Promise.all([
    safeVehicle(slug),
    safeLocations(),
  ]);
  const vehicle = apiVehicle ? toVehicle(apiVehicle) : vehicleBySlug(slug);
  if (!vehicle) notFound();

  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const checkoutLocations = locations.map(toCheckoutLocation);

  const relatedRows = apiVehicle
    ? (await safeVehicles({ category: apiVehicle.category.slug, limit: 8 })).map(
        toVehicle,
      )
    : vehicles;
  const similar = relatedRows
    .filter((v) => v.category === vehicle.category && v.id !== vehicle.id)
    .slice(0, 3);

  const quickSpecs = [
    { icon: Settings2, label: vehicle.engine },
    { icon: Gauge, label: vehicle.mileage },
    { icon: Fuel, label: vehicle.fuel },
    { icon: Users, label: `${vehicle.seats} seats` },
  ];

  return (
    <>
      <div className="container-page pb-4 pt-5">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            {
              label: vehicle.category === "car" ? "Car Rental" : "Bike Rentals",
              href: vehicle.category === "car" ? "/cars" : "/bikes-scooters",
            },
            { label: vehicle.name },
          ]}
        />
      </div>

      <div className="container-page grid gap-8 pb-28 lg:grid-cols-[1fr_372px] lg:pb-10">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" size="sm">
                  {vehicle.category === "car"
                    ? "Self-drive car"
                    : vehicle.category === "scooter"
                      ? "Scooter"
                      : "Motorcycle"}
                </Badge>
                {vehicle.tags.map((tag) => (
                  <Badge key={tag} variant="brand" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
                {vehicle.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Rating value={vehicle.rating} count={vehicle.reviewCount} size="md" />
                <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                  <MapPin className="size-3.5" />
                  {vehicle.location}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700">
                  <BadgeCheck className="size-3.5" /> Verified vendor
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <VehicleGallery vehicle={vehicle} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickSpecs.map((spec) => (
              <span
                key={spec.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page/60 px-3 py-1.5 text-[11.5px] font-medium text-ink-soft"
              >
                <spec.icon className="size-3.5 text-brand-600" />
                {spec.label}
              </span>
            ))}
          </div>

          <VehicleTabs vehicle={vehicle} />

          <div className="mt-8 rounded-panel border border-line bg-page/50 p-5">
            <h2 className="text-[15px] font-bold text-ink">Why book with SavariGo</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Well maintained vehicles", "Serviced and sanitised before every trip."],
                ["Free helmet", "ISI-marked helmets at no extra cost."],
                ["No hidden charges", "Deposit refunded within 3 working days."],
                ["24/7 support", "Call, WhatsApp or chat — we pick up."],
              ].map(([title, copy]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                    <BadgeCheck className="size-3" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{title}</p>
                    <p className="text-[11.5px] text-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 lg:hidden">
            <BookingWidget
              vehicle={vehicle}
              initialFrom={from}
              initialTo={to}
              locations={checkoutLocations}
            />
          </div>

          {similar.length > 0 && (
            <div className="mt-9">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-[19px] font-extrabold text-ink">Similar vehicles</h2>
                <Link
                  href={vehicle.category === "car" ? "/cars" : "/bikes-scooters"}
                  className="text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {similar.map((item) => (
                  <VehicleCard key={item.id} vehicle={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <BookingWidget
              vehicle={vehicle}
              initialFrom={from}
              initialTo={to}
              locations={checkoutLocations}
            />
          </div>
        </aside>
      </div>

      <MobileBookingBar vehicle={vehicle} />
    </>
  );
}
