"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cog, Fuel, Heart, Star } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types";
import { cn, inr } from "@/lib/utils";

export function BikeCard({
  vehicle,
  layout = "grid",
  priority = false,
}: {
  vehicle: Vehicle;
  layout?: "grid" | "list";
  priority?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const href = vehicle.available
    ? `/checkout?vehicle=${vehicle.slug}`
    : `/vehicles/${vehicle.slug}`;

  const heart = (
    <button
      type="button"
      aria-label={saved ? `Remove ${vehicle.name} from saved` : `Save ${vehicle.name}`}
      aria-pressed={saved}
      onClick={() => {
        setSaved((value) => !value);
        toast.success(saved ? "Removed from saved vehicles" : "Saved to your vehicles");
      }}
      className={cn(
        "absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-full border backdrop-blur transition",
        saved
          ? "border-transparent bg-white text-red-500"
          : "border-white/70 bg-white/90 text-ink-soft hover:text-red-500",
      )}
    >
      <Heart className={cn("size-4", saved && "fill-red-500")} />
    </button>
  );

  const badges = (
    <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
      {vehicle.popular && (
        <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
          Popular
        </span>
      )}
      {!vehicle.available && (
        <span className="rounded-full bg-forest px-2.5 py-1 text-[10px] font-semibold text-white">
          Booked out
        </span>
      )}
    </div>
  );

  const rating = (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-ink shadow-sm">
      <Star className="size-3 fill-brand-500 text-brand-500" />
      {vehicle.rating.toFixed(1)}
    </span>
  );

  const price = (
    <div className="flex items-baseline gap-1">
      <span className="text-[18px] font-extrabold leading-none text-ink">
        {inr(vehicle.pricePerDay)}
      </span>
      <span className="text-[11px] font-medium text-muted">/day</span>
    </div>
  );

  const book = (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-4 text-[12px] font-semibold transition",
        vehicle.available
          ? "bg-brand-500 text-white hover:bg-brand-600"
          : "border border-line-strong text-ink-soft hover:bg-page",
      )}
    >
      {vehicle.available ? "Book Now" : "View details"}
      <ArrowRight className="size-3.5" />
    </Link>
  );

  const title = (
    <h3 className="text-[15px] font-bold leading-snug text-ink">
      <Link href={`/vehicles/${vehicle.slug}`} className="hover:text-brand-700">
        {vehicle.name}
      </Link>
    </h3>
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
      <Fuel className="size-3.5" />
      {vehicle.fuel}
      <span className="text-line-strong">·</span>
      <Cog className="size-3.5" />
      {vehicle.transmission}
    </div>
  );

  if (layout === "list") {
    return (
      <article className="group relative flex overflow-hidden rounded-[16px] border border-line bg-surface p-2 transition hover:border-brand-200 hover:shadow-lift">
        <div className="relative h-[132px] w-[150px] shrink-0 overflow-hidden rounded-[11px] bg-page sm:h-[140px] sm:w-[210px]">
          <Link href={`/vehicles/${vehicle.slug}`} aria-label={vehicle.name}>
            <Image
              src={vehicle.image}
              alt={vehicle.name}
              fill
              sizes="210px"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </Link>
          {badges}
          {heart}
          <div className="absolute bottom-2.5 right-2.5">{rating}</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 px-3 py-1.5 sm:px-4">
          <div>
            {title}
            <div className="mt-1.5">{meta}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {price}
            {book}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col rounded-[16px] border border-line bg-surface p-2 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[11px] bg-page">
        <Link href={`/vehicles/${vehicle.slug}`} aria-label={vehicle.name}>
          <Image
            src={vehicle.image}
            alt={vehicle.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 30vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </Link>
        {badges}
        {heart}
        <div className="absolute bottom-2.5 right-2.5">{rating}</div>
      </div>
      <div className="px-1.5 pb-1 pt-3">
        {title}
        <div className="mt-1.5">{meta}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {price}
          {book}
        </div>
      </div>
    </article>
  );
}
