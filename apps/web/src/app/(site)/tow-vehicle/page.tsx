import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  LifeBuoy,
  ShieldCheck,
  Smartphone,
  Truck,
  Wallet,
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
import { inr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tow Vehicle Support",
  description:
    "24x7 breakdown towing for bikes, scooters and cars in Puducherry. Flat rates, trained crew, damage-free loading and live trip tracking.",
};

const highlights = [
  {
    icon: Clock,
    title: "24×7 dispatch",
    detail: "Crews on rotation across Puducherry, average arrival under 30 minutes.",
  },
  {
    icon: Wallet,
    title: "Flat upfront rates",
    detail: "The quote you approve before we roll is the price you pay at drop.",
  },
  {
    icon: Truck,
    title: "Damage-free loading",
    detail: "Hydraulic ramps, wheel straps and blankets for bikes and cars alike.",
  },
  {
    icon: ShieldCheck,
    title: "Insured while towing",
    detail: "Your vehicle is covered by our transit insurance from pickup to drop.",
  },
];

const rates = [
  { vehicle: "Scooter / Moped", note: "Activa, Jupiter, Access and similar", price: 299 },
  { vehicle: "Motorcycle", note: "Classic, Bullet, RC and similar", price: 349 },
  { vehicle: "Car — hatchback & sedan", note: "i20, City, Nexon and similar", price: 499 },
  { vehicle: "Car — SUV & MUV", note: "Ertiga, Creta and similar", price: 599 },
];

const steps = [
  {
    title: "Call or WhatsApp us",
    detail: "Tell us what happened — breakdown, puncture, accident or battery. Share your live location.",
  },
  {
    title: "Approve the quote",
    detail: "We confirm the flat rate and crew details on WhatsApp before anyone rolls out.",
  },
  {
    title: "We load and go",
    detail: "The crew secures your vehicle on the flatbed and shares live tracking with you.",
  },
  {
    title: "Pay after drop",
    detail: "UPI, card or cash — pay only after your vehicle reaches the garage or your doorstep.",
  },
];

const faqItems = [
  {
    question: "How fast does a tow truck reach me?",
    answer:
      "Inside Puducherry city limits our average arrival is under 30 minutes, day or night. Outskirts like Auroville or Villianur usually take 40–50 minutes. You'll get an ETA on WhatsApp as soon as the crew is assigned.",
  },
  {
    question: "Which areas do you cover?",
    answer:
      "All of Puducherry — White Town, Lawspet, Villianur, Gorimedu, Mudaliarpet, Kottakuppam and Auroville. Outstation tows toward Chennai, Cuddalore or Chidambaram are charged per kilometre.",
  },
  {
    question: "Can I ride along with my vehicle?",
    answer:
      "Yes, one person can ride in the tow cab on in-city tows at no extra charge. For outstation tows a small return-fuel fee applies for the second seat.",
  },
  {
    question: "What if my vehicle was in an accident?",
    answer:
      "Choose 'Accident recovery' when you call. We coordinate with your insurer, photograph the vehicle before loading and tow directly to a partner garage or the workshop you choose.",
  },
  {
    question: "Do you tow vehicles that won't start at all?",
    answer:
      "Yes. Dead battery, seized engine, flooded streets or a locked wheel — the hydraulic flatbed loads non-running vehicles without dragging them.",
  },
];

export default function TowVehiclePage() {
  return (
    <>
      <PageHero
        eyebrow="Tow vehicle support"
        title={
          <>
            Stranded? We&apos;ll
            <br />
            tow you home.
          </>
        }
        description="24×7 breakdown towing for bikes, scooters and cars anywhere in Puducherry. Flat rates, trained crews and your vehicle tracked from pickup to drop."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tow Vehicle" }]}
        actions={[
          { label: "Request a tow", href: "/contact" },
          { label: "See rates", href: "#rates", variant: "outline" },
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

      <section id="rates" className="container-page scroll-mt-24 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Flat rates"
          title="Towing rates you can count on"
          description="In-city rates cover any pickup and drop within Puducherry municipal limits. Outstation tows are billed at ₹18 per km beyond the first 15 km."
          action={{ label: "Request a tow", href: "/contact" }}
        />
        <div className="mt-7 overflow-hidden rounded-panel border border-line bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-page/60 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Includes</th>
                <th className="px-5 py-3 text-right">In-city tow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rates.map((rate) => (
                <tr key={rate.vehicle} className="text-[13px] transition hover:bg-page/50">
                  <td className="px-5 py-3.5 font-semibold text-ink">
                    <span className="inline-flex items-center gap-2">
                      <Truck className="size-3.5 text-brand-500" />
                      {rate.vehicle}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{rate.note}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-ink">
                    {inr(rate.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Rates include loading, unloading and 30 minutes of waiting time. Night dispatch (11 pm –
          6 am) carries a ₹100 surcharge. Accident recovery documentation is free.
        </p>
      </section>

      <section className="border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-panel">
              <Image
                src="/images/services/tow-service.jpg"
                alt="SavariGo tow crew loading a scooter onto a flatbed truck in Puducherry"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Average arrival
                </p>
                <p className="font-display text-[20px] font-extrabold text-ink">Under 30 min</p>
              </div>
            </div>
          </Reveal>

          <div>
            <p className="label-overline mb-2.5">How it works</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
              From stranded to safe in four steps
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
              <LifeBuoy className="size-5 text-brand-700" />
              <p className="text-[12px] leading-relaxed text-brand-900">
                Save our support line — one call reaches a human, 24×7, with WhatsApp location
                support.
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
              Towing FAQs
            </h2>
            <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-muted">
              Breakdowns don&apos;t wait, and neither do we. Still unsure about something? Our
              team replies on WhatsApp in under two minutes.
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
                Stuck on the road right now?
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] text-white/70">
                A tow crew is on rotation right now — average arrival under 30 minutes anywhere in
                Puducherry.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-forest hover:bg-brand-50">
              <Link href="/contact">
                Get a tow <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
