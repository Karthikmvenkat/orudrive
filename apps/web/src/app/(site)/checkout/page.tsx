import type { Metadata } from "next";
import { CheckoutForm } from "@/components/booking/checkout-form";
import { Breadcrumbs } from "@/components/shared/section";
import { vehicles, vehicleBySlug } from "@/lib/data/vehicles";
import { toCheckoutLocation, toVehicle } from "@/lib/api/adapters";
import { safeLocations, safeVehicle } from "@/lib/api/catalogue";
import { requireUser } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Confirm Your Booking",
  description: "Review your ride, add your details and pay securely.",
};

const steps = ["Choose ride", "Your details", "Payment", "Confirmed"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const slug = typeof sp.vehicle === "string" ? sp.vehicle : "";
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const locationId = typeof sp.locationId === "string" ? sp.locationId : undefined;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") query.set(key, value);
  }
  const nextPath = `/checkout${query.size ? `?${query.toString()}` : ""}`;
  const user = await requireUser(undefined, nextPath);

  const [apiVehicle, locations] = await Promise.all([
    slug ? safeVehicle(slug) : Promise.resolve(null),
    safeLocations(),
  ]);
  const vehicle = apiVehicle ? toVehicle(apiVehicle) : vehicleBySlug(slug) ?? vehicles[0];
  const checkoutLocations = locations.map(toCheckoutLocation);
  const contact = {
    fullName: user.customerProfile?.fullName ?? user.email.split("@")[0],
    email: user.email,
    phone: user.customerProfile?.phone ?? user.phone ?? "",
  };

  return (
    <>
      <section className="border-b border-line bg-linear-to-b from-brand-50/60 to-white">
        <div className="container-page py-6 lg:py-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Book Ride", href: `/vehicles/${vehicle.slug}` },
              { label: "Checkout" },
            ]}
          />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
                Confirm Your Booking
              </h1>
              <p className="mt-1.5 text-[13px] text-muted">
                One last step — check your dates and rider details.
              </p>
            </div>
            <ol className="hidden items-center gap-1.5 md:flex">
              {steps.map((step, i) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span
                    className={
                      i <= 1
                        ? "grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-ink"
                        : "grid size-5 place-items-center rounded-full bg-line text-[10px] font-bold text-muted"
                    }
                  >
                    {i + 1}
                  </span>
                  <span
                    className={
                      i <= 1
                        ? "text-[11px] font-semibold text-ink"
                        : "text-[11px] text-muted"
                    }
                  >
                    {step}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="mx-1 h-px w-5 bg-line" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="container-page py-7 lg:py-9">
        <CheckoutForm
          vehicle={vehicle}
          vehicleId={apiVehicle?.id}
          contact={contact}
          locations={checkoutLocations}
          initialFrom={from}
          initialTo={to}
          initialCity={city}
          initialLocationId={locationId}
        />
      </div>
    </>
  );
}
