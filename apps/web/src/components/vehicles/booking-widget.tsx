"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Fuel,
  Gauge,
  MapPin,
  Settings2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { Vehicle } from "@/types";
import type { CheckoutLocation } from "@/lib/api/adapters";
import { inr, nightsBetween } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { pickupLocations } from "@/lib/data/categories";

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function BookingWidget({
  vehicle,
  initialFrom,
  initialTo,
  locations,
}: {
  vehicle: Vehicle;
  initialFrom?: string;
  initialTo?: string;
  locations?: CheckoutLocation[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");
  const locationOptions =
    locations && locations.length > 0
      ? locations.map((loc) => ({ value: loc.name, id: loc.id, city: loc.city }))
      : pickupLocations.map((loc) => ({ value: loc, id: undefined, city: loc }));
  const [location, setLocation] = useState(
    locationOptions.some((option) => option.value === vehicle.location)
      ? vehicle.location
      : (locationOptions[0]?.value ?? vehicle.location),
  );

  useEffect(() => {
    if (!initialFrom) setFrom(iso(1));
    if (!initialTo) setTo(iso(2));
  }, [initialFrom, initialTo]);

  const days = from && to ? nightsBetween(from, to) : 1;
  const rental = vehicle.pricePerDay * days;
  const total = rental + vehicle.deposit;

  const specs = [
    { icon: Settings2, value: vehicle.engine, label: "Engine" },
    { icon: Gauge, value: vehicle.mileage, label: vehicle.fuel === "Electric" ? "Range" : "Mileage" },
    { icon: vehicle.fuel === "Electric" ? Zap : Fuel, value: vehicle.fuel, label: "Fuel" },
    { icon: Users, value: `${vehicle.seats} seats`, label: "Capacity" },
  ];

  return (
    <div id="book" className="card-base overflow-hidden">
      <div className="border-b border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[30px] font-extrabold leading-none text-ink">
                {inr(vehicle.pricePerDay)}
              </span>
              <span className="text-[12px] text-muted">/ day</span>
            </div>
            {vehicle.originalPrice && (
              <p className="mt-1 text-[11.5px] text-muted">
                <span className="line-through">{inr(vehicle.originalPrice)}</span>{" "}
                <span className="font-semibold text-brand-600">
                  Save {inr(vehicle.originalPrice - vehicle.pricePerDay)}
                </span>
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700">
            <span className="size-1.5 rounded-full bg-brand-500" />
            {vehicle.available ? "Available" : "Waitlist"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="rounded-lg bg-page/70 px-1.5 py-2 text-center"
            >
              <spec.icon className="mx-auto size-3.5 text-brand-600" />
              <p className="mt-1 truncate text-[10px] font-semibold text-ink">{spec.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand-400">
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <CalendarDays className="size-3" /> Pick-up
            </span>
            <input
              type="date"
              value={from}
              min={iso(0)}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-0.5 w-full bg-transparent text-[12.5px] font-semibold text-ink outline-none"
              aria-label="Pick-up date"
            />
          </label>
          <label className="rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand-400">
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <CalendarDays className="size-3" /> Return
            </span>
            <input
              type="date"
              value={to}
              min={from || iso(0)}
              onChange={(e) => setTo(e.target.value)}
              className="mt-0.5 w-full bg-transparent text-[12.5px] font-semibold text-ink outline-none"
              aria-label="Return date"
            />
          </label>
        </div>

        <label className="block rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand-400">
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <MapPin className="size-3" /> Pick-up location
          </span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-label="Pick-up location"
            className="mt-0.5 w-full appearance-none bg-transparent text-[12.5px] font-semibold text-ink outline-none"
          >
            {locationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            ))}
          </select>
        </label>

        <dl className="space-y-2 rounded-xl bg-page/60 p-3.5 text-[12px]">
          <div className="flex justify-between text-muted">
            <dt>
              {inr(vehicle.pricePerDay)} × {days} day{days > 1 ? "s" : ""}
            </dt>
            <dd className="font-medium text-ink">{inr(rental)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Refundable deposit</dt>
            <dd className="font-medium text-ink">{inr(vehicle.deposit)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-[13px]">
            <dt className="font-bold text-ink">Total payable</dt>
            <dd className="font-display font-extrabold text-brand-700">{inr(total)}</dd>
          </div>
        </dl>

        <Button
          size="lg"
          className="w-full"
          disabled={!vehicle.available}
          onClick={() => {
            const params = new URLSearchParams({
              vehicle: vehicle.slug,
              from,
              to,
              city: location,
            });
            const locationId = locationOptions.find(
              (option) => option.value === location,
            )?.id;
            if (locationId) params.set("locationId", locationId);
            router.push(`/checkout?${params.toString()}`);
          }}
        >
          {vehicle.available ? "Book This Vehicle" : "Join the waitlist"}
        </Button>

        <p className="text-center text-[10.5px] text-muted">
          Free cancellation up to 24h before pick-up
        </p>

        <ul className="space-y-2 border-t border-line pt-3.5">
          {[
            "Verified vehicle & insured ride",
            "Helmet included with every rental",
            "24/7 roadside assistance",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[11.5px] text-ink-soft">
              <span className="grid size-4 place-items-center rounded-full bg-brand-100 text-brand-700">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2.5 border-t border-line bg-page/50 px-5 py-3.5">
        <span className="grid size-8 place-items-center rounded-full bg-white text-brand-700 shadow-soft">
          <ShieldCheck className="size-4" />
        </span>
        <div className="text-[11px] leading-tight">
          <p className="font-semibold text-ink">Served by Pondy Rides</p>
          <p className="text-muted">Verified vendor · 4.9 rating · 6 yrs</p>
        </div>
      </div>
    </div>
  );
}

export function MobileBookingBar({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="leading-tight">
          <p className="font-display text-[18px] font-extrabold text-ink">
            {inr(vehicle.pricePerDay)}
            <span className="text-[11px] font-medium text-muted"> /day</span>
          </p>
          <p className="text-[10px] text-muted">+ {inr(vehicle.deposit)} deposit</p>
        </div>
        <Button asChild className="ml-auto" size="md">
          <a href="#book">Book this vehicle</a>
        </Button>
      </div>
    </div>
  );
}
