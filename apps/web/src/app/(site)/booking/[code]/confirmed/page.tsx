import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Headset,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/section";
import { formatDate, inr, nightsBetween } from "@/lib/utils";
import { vehicles, vehicleBySlug } from "@/lib/data/vehicles";
import { getAccessToken, requireUser } from "@/lib/api/server";
import { apiRequest } from "@/lib/api/http";
import type { ApiBooking } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Booking Confirmed",
};

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") query.set(key, value);
  }
  const nextPath = `/booking/${code}/confirmed${query.size ? `?${query.toString()}` : ""}`;
  await requireUser(undefined, nextPath);

  let booking: ApiBooking | null = null;
  const token = await getAccessToken();
  if (token) {
    try {
      booking = await apiRequest<ApiBooking>(
        `/bookings/me/${encodeURIComponent(code)}`,
        { token, cache: "no-store" },
      );
    } catch {
      booking = null;
    }
  }

  const slug = booking?.vehicle.slug ?? (typeof sp.vehicle === "string" ? sp.vehicle : "");
  const vehicle = vehicleBySlug(slug) ?? vehicles[0];
  const from = booking?.pickupAt ?? (typeof sp.from === "string" ? sp.from : new Date().toISOString());
  const to = booking?.returnAt ?? (typeof sp.to === "string" ? sp.to : new Date().toISOString());
  const city =
    booking?.pickupLocation.name ??
    (typeof sp.city === "string" ? sp.city : "Puducherry");
  const payment = typeof sp.payment === "string" ? sp.payment : "upi";
  const days = booking?.durationDays ?? nightsBetween(from, to);
  const total = booking
    ? booking.amounts.totalAmount
    : typeof sp.total === "string"
      ? Number(sp.total)
      : vehicle.pricePerDay * days + vehicle.deposit;
  const paid = booking
    ? booking.paymentStatus === "PAID"
    : payment !== "pay_at_pickup";
  const email = booking?.customer.email ?? "";
  const vehicleName = booking?.vehicle.name ?? vehicle.name;
  const vehicleImage = booking?.vehicle.image ?? vehicle.image;
  const pickupCity = booking?.pickupLocation.name ?? city;

  const nextSteps = [
    {
      title: "Vendor confirmation",
      copy: "You'll get a WhatsApp message with the vendor's number within 10 minutes.",
      icon: MessageCircle,
    },
    {
      title: "Documents at pick-up",
      copy: "Carry your driving licence and one government photo ID.",
      icon: ShieldCheck,
    },
    {
      title: "Collect & ride",
      copy: `Reach ${city} at the scheduled time. Helmet and keys are ready.`,
      icon: MapPin,
    },
  ];

  return (
    <div className="bg-page/50">
      <div className="container-page py-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "My Bookings", href: "/dashboard/bookings" },
            { label: `Booking ${code}` },
          ]}
        />
      </div>

      <div className="container-page pb-14">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-panel border border-brand-200 bg-white p-6 text-center shadow-soft sm:p-8">
            <div className="pointer-events-none absolute -left-10 -top-10 size-32 rounded-full bg-brand-100/60 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full bg-tint-mint blur-2xl" />

            <div className="relative mx-auto grid size-16 place-items-center rounded-full bg-brand-500 text-white shadow-[0_16px_32px_-16px_rgba(76,175,43,0.9)]">
              <Check className="size-8" strokeWidth={3} />
            </div>
            <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Payment {paid ? "successful" : "pending at pick-up"}
            </p>
            <h1 className="relative mt-1.5 text-[26px] font-extrabold leading-tight text-ink sm:text-[32px]">
              {paid ? "Your ride is booked!" : "Your ride is reserved!"}
            </h1>
            <p className="relative mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
              Booking <span className="font-semibold text-ink">#{code}</span>{" "}
              {paid ? "is confirmed" : "is held for you"}. We&apos;ve emailed the
              details{email ? ` to ${email}` : ""} and sent a copy on WhatsApp.
            </p>

            <div className="relative mx-auto mt-5 max-w-md rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4 text-left">
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image
                    src={vehicleImage}
                    alt={vehicleName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">
                    {vehicleName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <CalendarDays className="size-3" />
                    {formatDate(from, { day: "2-digit", month: "short" })} →{" "}
                    {formatDate(to, { day: "2-digit", month: "short", year: "numeric" })}
                    <span className="text-line-strong">·</span>
                    {days} day{days > 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="size-3" /> {pickupCity}
                  </p>
                </div>
                <p className="font-display text-[17px] font-extrabold text-brand-700">
                  {inr(total)}
                </p>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <Button asChild>
                <Link href={`/dashboard/bookings/${code.toLowerCase()}`}>
                  View booking details <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/bikes-scooters">Book another ride</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <div key={step.title} className="card-base p-4">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <step.icon className="size-4" />
                </span>
                <p className="mt-2.5 text-[12.5px] font-bold text-ink">{step.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{step.copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-panel border border-line bg-white px-4 py-3.5 sm:flex-row">
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <Headset className="size-4 text-brand-600" />
              Need to change something? Support is available 24/7.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="soft" size="sm">
                <Link href="/dashboard/bookings">Modify booking</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/contact">Contact support</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
