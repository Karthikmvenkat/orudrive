"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types";
import { cn, discountPercent, inr } from "@/lib/utils";
import { Rating } from "@/components/shared/rating";

export function VehicleCard({
  vehicle,
  className,
  priority = false,
  defaultSaved = false,
}: {
  vehicle: Vehicle;
  className?: string;
  priority?: boolean;
  defaultSaved?: boolean;
}) {
  const [saved, setSaved] = useState(defaultSaved);
  const off = vehicle.originalPrice
    ? discountPercent(vehicle.originalPrice, vehicle.pricePerDay)
    : 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-page">
        <Link href={`/vehicles/${vehicle.slug}`} aria-label={vehicle.name}>
          <Image
            src={vehicle.image}
            alt={vehicle.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {off > 0 && (
              <span className="pointer-events-auto rounded-full bg-brand-500 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-sm">
                Save {off}%
              </span>
            )}
            {vehicle.fuel === "Electric" && (
              <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-forest/90 px-2.5 py-1 text-[10.5px] font-semibold text-white">
                <Zap className="size-2.5" /> EV
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={saved ? `Remove ${vehicle.name} from saved` : `Save ${vehicle.name}`}
            aria-pressed={saved}
            onClick={() => {
              setSaved((v) => !v);
              toast.success(saved ? "Removed from saved vehicles" : "Saved to your vehicles");
            }}
            className={cn(
              "grid size-8 place-items-center rounded-full border backdrop-blur transition",
              saved
                ? "border-transparent bg-white text-red-500"
                : "border-white/70 bg-white/85 text-ink-soft hover:text-red-500",
            )}
          >
            <Heart className={cn("size-4", saved && "fill-red-500")} />
          </button>
        </div>

        {!vehicle.available && (
          <div className="absolute inset-0 grid place-items-center bg-forest/45">
            <span className="rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-ink shadow">
              Booked out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] font-bold leading-snug text-ink">
            <Link href={`/vehicles/${vehicle.slug}`} className="hover:text-brand-700">
              {vehicle.name}
            </Link>
          </h3>
          <Rating value={vehicle.rating} />
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
          <MapPin className="size-3" />
          {vehicle.location}
          <span className="text-line-strong">·</span>
          <span>
            {vehicle.transmission} · {vehicle.engine}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[19px] font-extrabold leading-none text-ink">
                {inr(vehicle.pricePerDay)}
              </span>
              <span className="text-[11.5px] text-muted">/day</span>
            </div>
            {vehicle.originalPrice && (
              <span className="text-[11px] text-muted line-through">
                {inr(vehicle.originalPrice)}
              </span>
            )}
          </div>
          <Link
            href={vehicle.available ? `/checkout?vehicle=${vehicle.slug}` : `/vehicles/${vehicle.slug}`}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-4 text-[12.5px] font-semibold transition",
              vehicle.available
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "border border-line-strong text-ink-soft hover:bg-page",
            )}
          >
            {vehicle.available ? "Book Now" : "View details"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="aspect-[4/3] animate-pulse bg-page" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-page" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-page" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-20 animate-pulse rounded bg-page" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-page" />
        </div>
      </div>
    </div>
  );
}
