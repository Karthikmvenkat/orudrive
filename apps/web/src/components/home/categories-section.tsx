import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Truck, UserRound } from "lucide-react";
import { categories } from "@/lib/data/categories";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";

const tints = {
  mint: "bg-tint-mint",
  sky: "bg-tint-sky",
  peach: "bg-tint-peach",
  lilac: "bg-tint-lilac",
} as const;

const labels: Record<string, string> = {
  scooters: "Explore Scooters",
  motorcycles: "Explore Bikes",
  cars: "Explore Cars",
  monthly: "Rent Monthly",
  "tow-vehicle": "Get a tow",
  "acting-driver": "Hire a driver",
};

const iconCards: Record<string, React.ElementType> = {
  calendar: CalendarDays,
  tow: Truck,
  driver: UserRound,
};

export function CategoriesSection() {
  return (
    <section className="container-page py-12 lg:py-16">
      <SectionHeading
        eyebrow="Pick your ride"
        title={
          <>
            Find Your <span className="text-brand-500">Perfect Ride</span>
          </>
        }
        description="Choose from a wide range of bikes, scooters, cars and flexible rental plans."
        action={{ label: "See all vehicles", href: "/bikes-scooters" }}
      />

      <div className="mt-7 grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-5">
        {categories.map((category, i) => (
          <Reveal key={category.slug} delay={i * 0.06}>
            <Link
              href={category.href}
              className={`group relative flex h-full min-h-[196px] flex-col overflow-hidden rounded-panel p-5 transition-transform duration-300 hover:-translate-y-1 lg:min-h-[214px] ${tints[category.tint]}`}
            >
              <div className="relative z-10">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-700/70">
                  {category.eyebrow ?? `${category.count}+ vehicles`}
                </p>
                <h3 className="mt-1.5 text-[18px] font-extrabold leading-tight text-ink">
                  {category.name}
                </h3>
                <p className="mt-1.5 max-w-[62%] text-[11.5px] leading-snug text-ink-soft/75">
                  {category.tagline}
                </p>
              </div>

              <span className="relative z-10 mt-auto inline-flex w-fit items-center gap-1 rounded-full border border-ink/10 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-ink transition group-hover:border-brand-400 group-hover:bg-white group-hover:text-brand-700">
                {labels[category.slug]}
                <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>

              {category.icon ? (
                <div className="absolute -bottom-4 -right-4 grid size-32 place-items-center rounded-full bg-white/70 lg:size-36">
                  <span className="grid size-20 place-items-center rounded-2xl bg-brand-500 text-white shadow-lift lg:size-24">
                    {(() => {
                      const Icon = iconCards[category.icon];
                      return <Icon className="size-10 lg:size-12" strokeWidth={1.6} />;
                    })()}
                  </span>
                </div>
              ) : (
                <div className="absolute -bottom-2 -right-2 h-[80%] w-[54%] overflow-hidden rounded-tl-[56px] rounded-br-[14px]">
                  <Image
                    src={category.image!}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 45vw, 220px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
