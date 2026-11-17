import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CarFront,
  Compass,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "SavariGo is Puducherry's homegrown mobility platform — bike, scooter and car rentals, bike taxis and professional drivers, built around transparent pricing and local support.",
};

const stats = [
  { value: "14", label: "Vehicle models" },
  { value: "10,000+", label: "Happy riders" },
  { value: "4.8", label: "Average rating" },
  { value: "3", label: "Pickup hubs" },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Verified, not just listed",
    detail:
      "Every vehicle passes a 32-point inspection before it joins the fleet, and again before each rental. If a light or a brake feels wrong, it doesn't go out.",
  },
  {
    icon: HeartHandshake,
    title: "Local people, local answers",
    detail:
      "Our support team sits in White Town, not in a queue somewhere else. They know the roads, the mechanics and which beach is worth the detour.",
  },
  {
    icon: Sparkles,
    title: "The price you see",
    detail:
      "No surge meters, no mystery fees at drop-off. Deposits, helmets and taxes are shown before you confirm — the receipt always matches the quote.",
  },
  {
    icon: Sprout,
    title: "Lighter on the coast",
    detail:
      "A growing share of our fleet is electric. We offset every rental kilometre and keep our own maintenance bay to extend vehicle life.",
  },
];

const milestones = [
  { year: "2023", title: "First six scooters", detail: "Launched from a single garage on Rue Suffren." },
  { year: "2024", title: "Cars and bike taxis", detail: "Added self-drive cars and point-to-point rides." },
  { year: "2025", title: "Driver on demand", detail: "Hourly and outstation drivers joined the platform." },
  { year: "2026", title: "Three hubs", detail: "White Town, Auroville and the airport road." },
];

const fleetIcons = [Bike, CarFront, Compass];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title={
          <>
            Built in Puducherry.
            <br />
            Built for the way you move.
          </>
        }
        description="SavariGo started with six scooters, a garage near Rock Beach and a simple frustration: renting a vehicle here took longer than the trip itself."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About Us" }]}
        actions={[
          { label: "See our fleet", href: "/bikes-scooters" },
          { label: "Work with us", href: "#careers", variant: "outline" },
        ]}
      />

      <section className="container-page py-12 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-panel">
                <Image
                  src="/images/lifestyle/scooter-ride-1.jpg"
                  alt="Riding a scooter along the Puducherry coast"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -right-3 w-[190px] rounded-panel border border-line bg-surface p-4 shadow-lift sm:right-6">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Started with
                </p>
                <p className="font-display text-[26px] font-extrabold leading-tight text-ink">
                  6 scooters
                </p>
                <p className="mt-0.5 text-[11px] text-muted">One garage, one promise.</p>
              </div>
            </div>
          </Reveal>

          <div>
            <p className="label-overline mb-2.5">Why we exist</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              Rentals should feel like borrowing from a friend
            </h2>
            <div className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-muted">
              <p>
                The old way meant calling three numbers, haggling over a daily rate and hoping the
                helmet fit. We wanted the opposite: real photos, honest prices and a vehicle that
                starts on the first try.
              </p>
              <p>
                So we built the fleet we&apos;d want to rent from — serviced locally, insured
                properly, and handed over by people who actually ride. Today SavariGo covers
                two-wheelers, cars, bike taxis and professional drivers, but the brief hasn&apos;t
                changed.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Puducherry-owned", "Locally serviced", "Insured rides", "GST invoiced"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-ink-soft"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 rounded-panel border border-line bg-surface p-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl px-4 py-5 text-center">
              <p className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11.5px] font-medium text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="What we stand for"
            title="Four promises we don't break"
            description="They show up in the inspection sheet, the receipt and the phone call at 11pm."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {values.map((value) => (
              <div key={value.title} className="rounded-panel border border-line bg-surface p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <value.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-3.5 text-[15px] font-bold text-ink">{value.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{value.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="label-overline mb-2.5">The journey</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              From one garage to three hubs
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
              Every step funded by rides, not billboards. We&apos;ve grown slowly on purpose —
              adding a vehicle only when we can maintain it properly.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[12px] text-muted">
              {fleetIcons.map((Icon, i) => (
                <span
                  key={i}
                  className="grid size-9 place-items-center rounded-full border border-line bg-surface text-brand-700"
                >
                  <Icon className="size-4" />
                </span>
              ))}
              <span className="ml-1">Two-wheelers, cars and drivers — one platform.</span>
            </div>
          </div>

          <ol className="relative space-y-5 border-l border-line pl-6">
            {milestones.map((milestone) => (
              <li key={milestone.year} className="relative">
                <span className="absolute -left-[31px] top-1 size-2.5 rounded-full border-2 border-brand-500 bg-white" />
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
                  {milestone.year}
                </p>
                <p className="mt-0.5 text-[14px] font-bold text-ink">{milestone.title}</p>
                <p className="text-[12.5px] leading-relaxed text-muted">{milestone.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div id="reviews" className="scroll-mt-24 border-t border-line">
        <TestimonialsSection />
      </div>

      <section id="careers" className="container-page scroll-mt-24 pb-14 pt-2">
        <div className="grid gap-6 rounded-panel border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="label-overline mb-2">Careers</p>
            <h2 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[28px]">
              Help us keep the coast moving
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
              We hire mechanics, hub coordinators and support folks who like solving real problems
              for real riders. No cover letters — just tell us what you&apos;d fix first.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Fleet mechanic", "Hub coordinator", "Customer support"].map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-page px-3 py-1 text-[11.5px] font-medium text-ink-soft"
                >
                  {role} · open
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="flex items-center gap-1.5 text-[12px] text-muted">
              <MapPin className="size-3.5 text-brand-600" /> White Town, Puducherry
            </p>
            <Button asChild size="lg">
              <Link href="mailto:careers@savarigo.com">
                Say hello <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Link href="/contact" className="text-[12px] font-semibold text-brand-700 hover:underline">
              Or message our team →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
