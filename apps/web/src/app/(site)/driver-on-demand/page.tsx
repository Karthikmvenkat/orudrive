import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Coffee,
  Fuel,
  Languages,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { driverPlans } from "@/lib/data/content";
import { inr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Driver On-Demand",
  description:
    "Hire a professional, verified driver in Puducherry by the hour, day or for outstation trips. Sit back while a local expert handles the roads.",
};

const included = [
  { icon: BadgeCheck, label: "Licence & background verified" },
  { icon: Languages, label: "English, Tamil, Hindi & French" },
  { icon: Route, label: "Knows ECR, Auroville & French Quarter" },
  { icon: Coffee, label: "Meal and rest breaks covered" },
  { icon: ShieldCheck, label: "Insured on every assignment" },
  { icon: Fuel, label: "Fuel at actuals — no markup" },
];

const steps = [
  {
    title: "Pick a plan",
    detail: "Hourly for errands, full day for sightseeing, outstation for longer road trips.",
  },
  {
    title: "Share your itinerary",
    detail: "Tell us pickup time, stops and whether you're driving your own car or renting ours.",
  },
  {
    title: "Meet your driver",
    detail: "We assign a vetted local driver with a photo ID, at least 12 hours before pickup.",
  },
];

export default function DriverOnDemandPage() {
  return (
    <>
      <PageHero
        eyebrow="Driver on demand"
        title={
          <>
            You enjoy the view.
            <br />
            We&apos;ll handle the road.
          </>
        }
        description="Hire a professional driver in Puducherry by the hour, day or for outstation trips. Use your own car or pair a driver with one of ours."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Driver On-Demand" }]}
        actions={[
          { label: "Request a driver", href: "/contact" },
          { label: "See plans", href: "#plans", variant: "outline" },
        ]}
      />

      <section id="plans" className="container-page scroll-mt-24 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Plans & pricing"
          title="Pick the hours, not the hassle"
          description="Transparent driver charges. Fuel, tolls and parking are billed at actuals, always with a receipt."
        />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {driverPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-panel border p-5 transition ${
                plan.popular
                  ? "border-brand-300 bg-linear-to-b from-brand-50/80 to-white shadow-lift"
                  : "border-line bg-surface hover:border-brand-200"
              }`}
            >
              {plan.popular && (
                <Badge
                  variant="solid"
                  size="sm"
                  className="absolute -top-2.5 left-5 gap-1 uppercase tracking-wide"
                >
                  <Sparkles className="size-3" /> Most booked
                </Badge>
              )}
              <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-brand-700">
                {plan.name}
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                  {inr(plan.price)}
                </span>
                <span className="text-[12.5px] text-muted">/ {plan.unit}</span>
              </div>
              <p className="mt-1 text-[12px] font-medium text-ink-soft">{plan.minimum}</p>
              <ul className="mt-4 flex-1 space-y-2 border-t border-line pt-4">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                    <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.popular ? "primary" : "outline"}
                className="mt-5 w-full"
              >
                <Link href="/contact">
                  Request {plan.name.toLowerCase()} driver
                </Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11.5px] text-muted">
          Driver charges exclude fuel, tolls and parking. Outstation trips include a ₹500 daily
          driver allowance already baked into the price.
        </p>
      </section>

      <section className="border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="label-overline mb-2.5">What you get</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              A driver who knows the coast
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              Every SavariGo driver has at least three years of experience on Pondicherry roads.
              They know which beach is quietest at sunset and where the parking actually is.
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {included.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5"
                >
                  <item.icon className="size-4 shrink-0 text-brand-600" />
                  <span className="text-[12px] font-medium text-ink-soft">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-panel">
              <Image
                src="/images/services/driver-service.jpg"
                alt="Professional SavariGo driver with a car in Puducherry"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
                <CalendarClock className="size-5 text-brand-600" />
                <div>
                  <p className="text-[12px] font-bold text-ink">Confirmed 12 hours ahead</p>
                  <p className="text-[11px] text-muted">Driver name and photo sent before pickup</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading
          eyebrow="Simple process"
          title="From request to ride in three steps"
          align="center"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-panel border border-line bg-surface p-5">
              <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                {i + 1}
              </span>
              <p className="mt-3 text-[14px] font-bold text-ink">{step.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="relative overflow-hidden rounded-panel bg-forest px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-[24px] font-extrabold text-white sm:text-[28px]">
                Planning an outstation trip?
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] text-white/70">
                Chennai, Mahabalipuram, Thanjavur — tell us the route and we&apos;ll send a quote
                within an hour.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-forest hover:bg-brand-50">
              <Link href="/contact">
                Get a quote <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
