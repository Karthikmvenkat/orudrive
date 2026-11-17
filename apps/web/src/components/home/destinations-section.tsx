import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Navigation } from "lucide-react";
import { popularDestinations } from "@/lib/data/categories";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section";

export function DestinationsSection() {
  return (
    <section className="bg-page py-12 lg:py-16">
      <div className="container-page">
        <SectionHeading
          eyebrow="Where to next"
          title="Popular destinations from Puducherry"
          description="Short rides, long weekends and everything in between. Each route is a favourite with our riders."
          action={{ label: "Plan a trip", href: "/contact" }}
        />

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularDestinations.map((place, i) => (
            <Reveal key={place.name} delay={i * 0.05}>
              <Link
                href="/bikes-scooters"
                className="group relative block aspect-[4/3.4] overflow-hidden rounded-panel"
              >
                <Image
                  src={place.image}
                  alt={place.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-forest/85 via-forest/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-brand-200">
                    <Navigation className="size-3" />
                    {place.distance}
                  </div>
                  <h3 className="text-base font-bold text-white">{place.name}</h3>
                  <p className="mt-1 text-[11.5px] leading-snug text-white/70">
                    {place.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    Find a ride <ArrowUpRight className="size-3" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
