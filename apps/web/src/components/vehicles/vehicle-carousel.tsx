"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { Vehicle } from "@/types";
import { VehicleCard } from "@/components/vehicles/vehicle-card";

export function VehicleCarousel({
  vehicles,
  title,
  description,
  href,
  linkLabel = "View All Vehicles",
}: {
  vehicles: Vehicle[];
  title: string;
  description?: string;
  href: string;
  linkLabel?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 280), behavior: "smooth" });
  };

  return (
    <section className="container-page py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-overline mb-2">{title}</p>
          <h2 className="text-[26px] font-extrabold leading-tight text-ink sm:text-[30px]">
            Popular Rides Near You
          </h2>
          {description && (
            <p className="mt-2 max-w-xl text-[13.5px] text-muted">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"
          >
            {linkLabel}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="ml-2 hidden gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous vehicles"
              className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next vehicles"
              className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="w-[268px] shrink-0 snap-start sm:w-[300px] lg:w-[calc(25%-12px)]"
          >
            <VehicleCard vehicle={vehicle} />
          </div>
        ))}
      </div>
    </section>
  );
}
