"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BadgeCheck, Heart } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types";
import { cn } from "@/lib/utils";

export function VehicleGallery({ vehicle }: { vehicle: Vehicle }) {
  const images = vehicle.gallery.length ? vehicle.gallery : [vehicle.image];
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  const move = (dir: number) =>
    setIndex((prev) => (prev + dir + images.length) % images.length);

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-panel border border-line bg-page">
        <Image
          key={images[index]}
          src={images[index]}
          alt={`${vehicle.name} photo ${index + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 62vw"
          className="object-cover"
        />

        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
            vehicle.available ? "bg-white text-brand-700" : "bg-forest text-white",
          )}
        >
          {vehicle.available ? (
            <>
              <BadgeCheck className="size-3.5" /> Available
            </>
          ) : (
            "Booked out"
          )}
        </span>

        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save this vehicle"}
          aria-pressed={saved}
          onClick={() => {
            setSaved((v) => !v);
            toast.success(saved ? "Removed from saved vehicles" : "Saved to your vehicles");
          }}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-white/70 bg-white/90 text-ink-soft backdrop-blur transition hover:text-red-500"
        >
          <Heart className={cn("size-4", saved && "fill-red-500 text-red-500")} />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100"
            >
              <ArrowRight className="size-4" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-forest/70 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {images.map((image, i) => (
          <button
            key={`${image}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition",
              i === index
                ? "border-brand-500"
                : "border-transparent opacity-80 hover:opacity-100",
            )}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="120px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
