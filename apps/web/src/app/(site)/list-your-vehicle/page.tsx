import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { EarningsCalculator } from "@/components/shared/earnings-calculator";
import { PartnerApplicationForm } from "@/components/shared/partner-application-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "List Your Vehicle",
  description:
    "Rent out your fleet in Puducherry through SavariGo. Apply with your GSTIN, get verified by our team, then list and price your own vehicles.",
};

const benefits = [
  {
    icon: Banknote,
    title: "One commission, no surprises",
    detail:
      "Your partner account carries a single commission rate. Every booking shows gross rent, platform share and your net.",
  },
  {
    icon: ShieldCheck,
    title: "Paperwork checked, not guessed",
    detail:
      "A vehicle goes live only after its RC and insurance are uploaded and verified. Riders pay a deposit before handover.",
  },
  {
    icon: Wrench,
    title: "You run the fleet",
    detail:
      "Add, edit and retire vehicles from the partner portal. Master Admin never has to touch your catalogue.",
  },
  {
    icon: CalendarCheck,
    title: "You set availability",
    detail: "Block dates from the partner dashboard. The vehicle is never booked without your say.",
  },
];

const process = [
  {
    icon: ClipboardCheck,
    title: "Apply",
    detail: "Submit your business details and GSTIN. This creates a pending partner login.",
  },
  {
    icon: BadgeCheck,
    title: "Get verified",
    detail:
      "Upload your GST certificate and KYC proof, then Master Admin approves the account and sets your commission.",
  },
  {
    icon: Banknote,
    title: "Earn",
    detail:
      "List each vehicle with its RC and insurance, price it your way, and track bookings and earnings as they land.",
  },
];

const requirements = [
  "A GSTIN registered to your business — one GSTIN, one partner account",
  "GST certificate and KYC proof, uploaded to your pending partner account",
  "A valid RC for every vehicle you list",
  "Insurance for every vehicle, valid on the dates it is bookable",
  "Master Admin approval before any of your vehicles appear in search",
];

const faqs = [
  {
    question: "How much can I really earn?",
    answer:
      "A well-maintained scooter booked 20 days a month earns roughly ₹5,600 at the example rates in the calculator above. Cars and motorcycles earn more. Your own figures depend on the rates you set and the commission on your account.",
  },
  {
    question: "Who pays for fuel and cleaning?",
    answer:
      "Riders return vehicles at the same fuel level, so fuel is effectively covered by them. Cleaning and routine servicing stay with you as the fleet owner — price your vehicles to cover it.",
  },
  {
    question: "What if the vehicle is damaged?",
    answer:
      "Every booking holds a security deposit at checkout, and a vehicle is only bookable while its insurance is uploaded and verified. Damage beyond normal wear is recovered from that deposit first.",
  },
  {
    question: "Can I take my vehicle off the platform?",
    answer:
      "Any time. Switch it to unavailable or block future dates in the partner portal and complete your existing bookings. There is no lock-in and no exit fee.",
  },
];

export default function ListYourVehiclePage() {
  return (
    <>
      <PageHero
        eyebrow="Partner with us"
        title={
          <>
            Your vehicle.
            <br />
            Someone else&apos;s ride.
          </>
        }
        description="Turn idle scooters, motorcycles and cars into booked rentals. You own the fleet and its paperwork; we bring verified riders and take a commission per trip."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "List Your Vehicle" }]}
        actions={[
          { label: "Apply to list", href: "#apply" },
          { label: "Estimate earnings", href: "#earnings", variant: "outline" },
        ]}
      />

      <section className="container-page py-12 lg:py-16">
        <SectionHeading
          eyebrow="Why list with SavariGo"
          title="A rental business without the admin"
          description="You own the vehicles. We bring verified riders, hold their deposits and take care of booking, billing and support."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-panel border border-line bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <benefit.icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="mt-3.5 text-[14px] font-bold text-ink">{benefit.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{benefit.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="earnings" className="scroll-mt-24 border-y border-line bg-page/60 py-12 lg:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <EarningsCalculator />
          <div className="flex flex-col justify-center">
            <p className="label-overline mb-2.5">The maths</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
              One commission, set on your account
            </h2>
            <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-muted">
              Commission is the only charge, and Master Admin fixes it on your partner account when
              the account is approved. The calculator uses an example 20% so you can see the shape
              of a month. There are no joining fees, monthly fees or listing fees.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {[
                "Gross, commission and net per booking",
                "Rider deposit collected at checkout",
                "RC and insurance verified before go-live",
                "Availability and pricing you control",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[12.5px] text-ink-soft">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="apply" className="container-page scroll-mt-24 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          <div>
            <SectionHeading
              eyebrow="How it works"
              title="Partner in three steps"
              description="Approval is manual. Master Admin checks every GSTIN and document set before a vehicle is bookable."
            />
            <ol className="mt-7 space-y-5">
              {process.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-brand-700">
                    <step.icon className="size-4.5" strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">
                      {i + 1}. {step.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 rounded-panel border border-line bg-surface p-5">
              <p className="text-[13px] font-bold text-ink">What your vehicle needs</p>
              <ul className="mt-3 grid gap-2">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-muted">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <PartnerApplicationForm />
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid gap-8 rounded-panel border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <p className="label-overline mb-2.5">Partner FAQs</p>
            <h2 className="text-[24px] font-extrabold leading-tight text-ink">
              Questions owners ask us
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              Something we missed?{" "}
              <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
                Talk to the partner team
              </Link>
              .
            </p>
          </div>
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`partner-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
