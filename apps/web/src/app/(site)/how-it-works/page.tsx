import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CalendarCheck,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { FaqSection } from "@/components/home/faq-section";
import { Button } from "@/components/ui/button";
import { howItWorks, faqs } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "From search to return — see how booking a bike, scooter, car, bike taxi or driver works on SavariGo, what documents you need and what happens at pickup.",
};

const icons = {
  search: Search,
  calendar: CalendarCheck,
  key: KeyRound,
  check: CheckCircle2,
} as const;

const stepDetails = [
  {
    title: "Search and compare",
    body: "Enter your pickup city and dates, then filter by vehicle type, transmission or fuel. Every listing shows the real all-in price — deposit and helmet included.",
    points: ["Live availability", "Transparent totals", "Save favourites"],
  },
  {
    title: "Book and pay securely",
    body: "Pick your dates, add any extras and confirm. Pay online via UPI or card, or choose pay-at-pickup where available. Your booking code arrives instantly.",
    points: ["UPI, card or cash at pickup", "Instant confirmation", "Free cancellation up to 24h"],
  },
  {
    title: "Pick up and ride",
    body: "Collect at the hub or have the vehicle delivered to your hotel. We do a quick joint inspection, hand over helmets and keys, and you're off.",
    points: ["10-minute handover", "Helmets included", "Fuel level recorded"],
  },
  {
    title: "Return with ease",
    body: "Drop the vehicle at the agreed point. We check it over, release your deposit within 3 working days and email a GST invoice for your records.",
    points: ["No long queues", "Deposit within 3 days", "GST invoice emailed"],
  },
];

const checklists = [
  {
    icon: FileText,
    title: "Before you ride",
    items: [
      "Original driving licence (digital is accepted)",
      "One government photo ID — Aadhaar, passport or voter ID",
      "International Driving Permit for foreign licences",
      "Minimum age: 18 for two-wheelers, 21 for cars",
    ],
  },
  {
    icon: Clock,
    title: "At pickup",
    items: [
      "Joint inspection with photos in the app",
      "Fuel or charge level noted on the handover slip",
      "Helmets and a portable charger for EVs",
      "24/7 support number saved to your phone",
    ],
  },
  {
    icon: KeyRound,
    title: "At return",
    items: [
      "Return at the same fuel level to avoid refuelling charges",
      "Late returns billed hourly, capped at one day's rent",
      "Deposit refund initiated on the spot",
      "Invoice and trip summary emailed within minutes",
    ],
  },
];

const modes = [
  {
    icon: Bike,
    title: "Bike & scooter rental",
    detail: "Self-drive two-wheelers from ₹349/day.",
    href: "/bikes-scooters",
    tint: "bg-mint",
  },
  {
    icon: CarFront,
    title: "Car rental",
    detail: "Hatchbacks to SUVs from ₹1,499/day.",
    href: "/cars",
    tint: "bg-sky",
  },
  {
    icon: Smartphone,
    title: "Bike taxi",
    detail: "Fixed-fare point-to-point rides.",
    href: "/bike-taxi",
    tint: "bg-peach",
  },
  {
    icon: UserRound,
    title: "Driver on demand",
    detail: "Professional drivers from ₹299/hour.",
    href: "/driver-on-demand",
    tint: "bg-lilac",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            From first search
            <br />
            to final drop.
          </>
        }
        description="Four steps, a ten-minute handover and no paperwork at the counter. Here's exactly what happens when you book with SavariGo."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "How It Works" }]}
        actions={[
          { label: "Browse vehicles", href: "/bikes-scooters" },
          { label: "Read the FAQs", href: "/faq", variant: "outline" },
        ]}
      />

      <section className="container-page py-12 lg:py-16">
        <div className="relative grid gap-6 lg:grid-cols-4 lg:gap-5">
          <div
            className="absolute left-[10%] right-[10%] top-7 hidden border-t border-dashed border-brand-200 lg:block"
            aria-hidden
          />
          {howItWorks.map((step, i) => {
            const Icon = icons[step.icon as keyof typeof icons];
            return (
              <Reveal key={step.step} delay={i * 0.08} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative grid size-14 place-items-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-[0_10px_24px_-16px_rgba(76,175,43,0.8)]">
                    <Icon className="size-6" strokeWidth={1.8} />
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-500 text-[9px] font-bold text-white">
                      {step.step}
                    </span>
                  </div>
                  <h2 className="mt-3.5 text-[14.5px] font-bold text-ink">{step.title}</h2>
                  <p className="mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {stepDetails.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.04}>
              <div className="flex h-full gap-4 rounded-panel border border-line bg-surface p-5 sm:p-6">
                <span className="font-display text-[26px] font-extrabold leading-none text-brand-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {step.points.map((point) => (
                      <li
                        key={point}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-soft"
                      >
                        <Check className="size-3.5 text-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page">
          <SectionHeading
            eyebrow="Know before you go"
            title="Documents, handover and return"
            description="Everything you need in your pocket — nothing you'll have to print."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {checklists.map((block) => (
              <div key={block.title} className="rounded-panel border border-line bg-surface p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <block.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-3.5 text-[14.5px] font-bold text-ink">{block.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" />
            <p className="text-[12.5px] leading-relaxed text-brand-900">
              A refundable security deposit is collected at pickup or pre-authorised online. Card
              details are never stored on our servers — payments are handled by our PCI-DSS
              compliant partner.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading
          eyebrow="Four ways to move"
          title="Pick the mode that fits your day"
          description="One account, one dashboard — for rentals, rides and drivers alike."
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((mode) => (
            <Link
              key={mode.title}
              href={mode.href}
              className="group rounded-panel border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
            >
              <span className={`grid size-11 place-items-center rounded-xl ${mode.tint} text-forest`}>
                <mode.icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="mt-4 flex items-center gap-1 text-[14px] font-bold text-ink">
                {mode.title}
                <ArrowRight className="size-3.5 text-brand-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{mode.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="border-t border-line">
        <FaqSection
          items={[faqs[0], faqs[1], faqs[2], faqs[3], faqs[7]]}
          title="Booking questions"
          description="The five things first-time riders ask us most."
        />
      </div>

      <section className="container-page pb-14">
        <div className="relative overflow-hidden rounded-panel bg-forest px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-[24px] font-extrabold text-white sm:text-[28px]">
                Ready when you are.
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] text-white/70">
                Browse live availability in Puducherry and book in under two minutes.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-forest hover:bg-brand-50">
              <Link href="/bikes-scooters">
                Find your ride <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
