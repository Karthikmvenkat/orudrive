"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { pickupLocations } from "@/lib/data/categories";
import { detectUserLocation, nearestHub } from "@/lib/geo";

export function BookingBar() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setMinDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate(),
      ).padStart(2, "0")}`,
    );
  }, []);

  useEffect(() => {
    let active = true;
    detectUserLocation().then((point) => {
      const hub = point ? nearestHub(point) : null;
      if (active && hub) setLocation((current) => current || hub.label);
    });
    return () => {
      active = false;
    };
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("city", location.trim());
    if (date) {
      params.set("from", date);
      const next = new Date(`${date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      params.set("to", next.toISOString().slice(0, 10));
    }
    if (time) params.set("time", time);
    router.push(`/vehicles${params.size ? `?${params}` : ""}`);
  }

  return (
    <section
      id="book"
      className="relative scroll-mt-24 overflow-hidden bg-page pb-10 pt-5 lg:pb-12 lg:pt-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 hidden w-16 bg-[radial-gradient(#e6d9b8_1.3px,transparent_1.4px)] [background-size:11px_11px] opacity-70 [mask-image:linear-gradient(to_right,black,transparent)] lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-6 right-0 hidden w-16 bg-[radial-gradient(#e6d9b8_1.3px,transparent_1.4px)] [background-size:11px_11px] opacity-70 [mask-image:linear-gradient(to_left,black,transparent)] lg:block"
      />

      <form
        onSubmit={submit}
        className="relative mx-auto flex w-[calc(100%-1rem)] max-w-[1240px] flex-col gap-3 rounded-[26px] bg-[#242424] p-3 shadow-lift lg:flex-row lg:items-center lg:gap-4 lg:p-4"
      >
        <div className="flex items-center gap-3 px-2 lg:w-[228px] lg:shrink-0 lg:px-0">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10">
            <MapPin className="size-5 text-white" />
          </span>
          <div>
            <p className="font-display text-[18px] font-extrabold leading-tight text-white lg:text-[19px]">
              Book Your Service
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium text-white/60">
              Quick • Easy • Reliable
            </p>
          </div>
        </div>

        <div className="grid flex-1 divide-y divide-line overflow-hidden rounded-2xl bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Field label="Pickup Location" icon={MapPin}>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              list="service-locations"
              placeholder="Enter location"
              aria-label="Pickup location"
              className="w-full bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted"
            />
          </Field>

          <Field label="Select Date" icon={CalendarDays}>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Select date"
              className="w-full cursor-pointer bg-transparent text-[13px] font-medium text-ink outline-none"
            />
          </Field>

          <Field label="Select Time" icon={Clock3}>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Select time"
              className="w-full cursor-pointer bg-transparent text-[13px] font-medium text-ink outline-none"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="inline-flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-[16px] bg-brand-500 px-7 text-[15px] font-bold text-ink transition hover:bg-brand-600"
        >
          Find Service
          <ArrowRight className="size-4" />
        </button>

        <datalist id="service-locations">
          {pickupLocations.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
      </form>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-[62px] cursor-pointer items-center gap-3 px-4">
      <Icon className="size-[18px] shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold leading-none text-ink-soft">
          {label}
        </span>
        <span className="mt-1.5 block">{children}</span>
      </span>
    </label>
  );
}
