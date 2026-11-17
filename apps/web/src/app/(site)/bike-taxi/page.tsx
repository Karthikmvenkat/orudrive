import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Clock,
  HardHat,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { bikeTaxiFares } from "@/lib/data/content";
import { inr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bike Taxi",
  description:
    "Book a bike taxi in Puducherry with fixed fares, helmet included and verified captains. Beat the traffic for less than a cup of chai.",
};

const highlights = [
  {
    icon: HardHat,
    title: "Helmet for both",
    detail: "A certified pillion helmet is included on every ride.",
  },
  {
    icon: BadgeCheck,
    title: "Verified captains",
    detail: "Background-checked riders with 3+ years of local experience.",
  },
  {
    icon: Banknote,
    title: "Fixed upfront fares",
    detail: "The fare you see at booking is what you pay at drop.",
  },
  {
    icon: Clock,
    title: "Average 3-minute pickup",
    detail: "Captains stationed across White Town, Lawspet and Auroville.",
  },
];

const steps = [
  {
    title: "Set your pickup",
    detail: "Drop a pin or pick a landmark — Rock Beach, Promenade, Auroville visitors' centre.",
  },
  {
    title: "Match with a captain",
    detail: "We find the nearest rider heading your way. You'll see their name, rating and bike.",
  },
  {
    title: "Ride and pay",
    detail: "Pay by UPI, card or cash at drop. No surge, no haggling, no meter surprises.",
  },
];

const faqItems = [
  {
    question: "Is a helmet provided for the passenger?",
    answer:
      "Yes. Every SavariGo captain carries a certified pillion helmet. If a helmet is missing or damaged, refuse the ride and report it in-app — you won't be charged.",
  },
  {
    question: "How is the fare calculated?",
    answer:
      "Bike taxi fares are fixed per route up to 12 km, then ₹9 per additional kilometre. Traffic and weather never change the quoted fare.",
  },
  {
    question: "Can I book a bike taxi for two people?",
    answer:
      "Bike taxis carry one pillion passenger only. For two or more people, book a car with a driver from the Driver On-Demand page.",
  },
  {
    question: "What if I need to cancel?",
    answer:
      "Cancel free within 2 minutes of matching. After your captain starts moving, a ₹20 cancellation fee applies to cover their ride.",
  },
];

export default function BikeTaxiPage() {
  return (
    <>
      <PageHero
        eyebrow="Bike taxi"
        title={
          <>
            Skip the traffic,
            <br />
            not the experience.
          </>
        }
        description="Puducherry in minutes — fixed fares, helmet included and verified captains. Perfect for that quick hop between White Town and the beach."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bike Taxi" }]}
        actions={[
          { label: "Book a bike taxi", href: "/bikes-scooters" },
          { label: "See fares", href: "#fares", variant: "outline" },
        ]}
      >
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-panel border border-line bg-surface/90 p-4 backdrop-blur"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="size-[18px]" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </PageHero>

      <section id="fares" className="container-page scroll-mt-24 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Popular routes"
          title="Fares you can count on"
          description="Sample fares from our most booked routes. Longer trips are charged ₹9 per extra kilometre."
          action={{ label: "Book a ride", href: "/bikes-scooters" }}
        />
        <div className="mt-7 overflow-hidden rounded-panel border border-line bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-page/60 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Distance</th>
                <th className="px-5 py-3 text-right">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bikeTaxiFares.map((fare) => (
                <tr key={fare.route} className="text-[13px] transition hover:bg-page/50">
                  <td className="px-5 py-3.5 font-semibold text-ink">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-3.5 text-brand-500" />
                      {fare.route}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{fare.distance}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-ink">{inr(fare.fare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Fares include 5 minutes of waiting time. Tolls and parking, if any, are billed at actuals.
        </p>
      </section>

      <section className="border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-panel">
              <Image
                src="/images/services/bike-taxi.jpg"
                alt="SavariGo bike taxi captain in Puducherry"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Average pickup
                </p>
                <p className="font-display text-[20px] font-extrabold text-ink">2 min 45 s</p>
              </div>
            </div>
          </Reveal>

          <div>
            <p className="label-overline mb-2.5">How it works</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              Three taps, and you&apos;re moving
            </h2>
            <ol className="mt-7 space-y-5">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-[12px] font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50/70 px-4 py-3">
              <ShieldCheck className="size-5 text-brand-700" />
              <p className="text-[12px] leading-relaxed text-brand-900">
                Every ride is tracked live and insured. Share your trip with family in one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="label-overline mb-2.5">Questions</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              Bike taxi FAQs
            </h2>
            <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-muted">
              Still stuck? Our support team is on WhatsApp 24×7 and answers in under two minutes.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/contact">
                <Smartphone className="size-4" /> Talk to support
              </Link>
            </Button>
          </div>
          <div className="rounded-panel border border-line bg-surface px-5">
            <Accordion type="single" collapsible defaultValue="item-0">
              {faqItems.map((item, i) => (
                <AccordionItem key={item.question} value={`item-${i}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="relative overflow-hidden rounded-panel bg-forest px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-[24px] font-extrabold text-white sm:text-[28px]">
                Going somewhere right now?
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] text-white/70">
                A captain is usually under three minutes away, anywhere in Puducherry.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-forest hover:bg-brand-50">
              <Link href="/bikes-scooters">
                Book a bike taxi <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
