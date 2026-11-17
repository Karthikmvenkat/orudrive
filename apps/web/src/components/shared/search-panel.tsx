"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, ChevronDown, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { pickupLocations, vehicleTypeOptions } from "@/lib/data/categories";

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function SearchPanel({ className }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const [city, setCity] = useState("Puducherry");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    setFrom(todayISO(1));
    setTo(todayISO(2));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "car") {
      const carParams = new URLSearchParams();
      if (city) carParams.set("city", city);
      if (from) carParams.set("from", from);
      if (to) carParams.set("to", to);
      router.push(`/cars${carParams.size ? `?${carParams}` : ""}`);
      return;
    }
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (city) params.set("city", city);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/bikes-scooters${params.size ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl border border-line bg-surface p-2.5 shadow-lift sm:p-3",
        className,
      )}
    >
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-[1.1fr_0.95fr_0.95fr_1.05fr_auto]">
        <Field label="Pick-up City">
          <MapPin className="size-4 shrink-0 text-brand-600" />
          <select
            aria-label="Pick-up city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          >
            {pickupLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </Field>

        <Field label="Pick-up Date">
          <CalendarDays className="size-4 shrink-0 text-brand-600" />
          <input
            id={`${id}-from`}
            type="date"
            aria-label="Pick-up date"
            value={from}
            min={todayISO()}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          />
        </Field>

        <Field label="Return Date">
          <CalendarDays className="size-4 shrink-0 text-brand-600" />
          <input
            id={`${id}-to`}
            type="date"
            aria-label="Return date"
            value={to}
            min={from || todayISO()}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          />
        </Field>

        <Field label="Vehicle Type">
          <Car className="size-4 shrink-0 text-brand-600" />
          <select
            aria-label="Vehicle type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full appearance-none bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          >
            {vehicleTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </Field>

        <Button type="submit" size="lg" className="h-[52px] w-full lg:h-full lg:px-6">
          <Search className="size-4" />
          Search Rides
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-[52px] cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface px-3 transition focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-100 hover:border-brand-200">
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium leading-none text-muted">
          {label}
        </span>
        <span className="mt-1 flex items-center gap-2">{children}</span>
      </span>
    </label>
  );
}
