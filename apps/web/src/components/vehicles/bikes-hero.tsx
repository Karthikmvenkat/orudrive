import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/shared/section";

export function BikesHero({ count }: { count: number }) {
  const availability = (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-soft">
      <span className="size-1.5 rounded-full bg-brand-500" />
      {count} vehicle{count === 1 ? "" : "s"} available today
    </span>
  );

  return (
    <section className="relative overflow-hidden bg-[#f7f4ec]">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[57%] lg:block">
        <div
          aria-hidden
          className="absolute -left-24 top-1/2 size-[500px] -translate-y-1/2 rounded-full bg-brand-200/60"
        />
        <div
          aria-hidden
          className="absolute -left-8 top-1/2 size-[300px] -translate-y-1/2 rounded-full bg-brand-300/30"
        />
        <div className="absolute inset-0 overflow-hidden rounded-tl-[320px]">
          <Image
            src="/images/hero/bike-rentals-hero.jpg"
            alt="Rider on a motorcycle on a mountain highway"
            fill
            priority
            sizes="57vw"
            className="object-cover"
          />
        </div>
        <div className="absolute right-6 top-5">{availability}</div>
      </div>

      <div className="container-page relative py-9 lg:py-16">
        <div className="max-w-[520px]">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Bike Rentals" }]} />
          <h1 className="mt-5 text-[42px] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[54px]">
            Bike &amp; Scooter
            <br />
            Rentals
          </h1>
          <p className="mt-4 max-w-[420px] text-[13.5px] leading-relaxed text-ink-soft/85">
            Choose from a wide range of well-maintained bikes and scooters —
            helmets, insurance and roadside assistance included.
          </p>
          <Link
            href="#bikes"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brand-500 px-6 text-[14px] font-bold text-ink transition hover:bg-brand-600"
          >
            Explore Rentals
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="container-page pb-9 lg:hidden">
        <div className="relative h-[210px] overflow-hidden rounded-3xl">
          <Image
            src="/images/hero/bike-rentals-hero.jpg"
            alt="Rider on a motorcycle on a mountain highway"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 0vw"
            className="object-cover"
          />
          <div className="absolute left-3 top-3">{availability}</div>
        </div>
      </div>
    </section>
  );
}
