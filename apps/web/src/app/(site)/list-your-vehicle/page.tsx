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
import { ListingForm } from "@/components/shared/listing-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "List Your Vehicle",
  description:
    "Earn from your idle scooter, motorcycle or car in Puducherry. SavariGo handles bookings, insurance and servicing — you keep 80% of every rental.",
};

const benefits = [
  {
    icon: Banknote,
    title: "80% of every rental",
    detail: "Transparent 20% platform fee. Payouts every Friday to your bank or UPI ID.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance built in",
    detail: "Every trip is covered. We verify riders and collect deposits before handover.",
  },
  {
    icon: Wrench,
    title: "Servicing handled",
    detail: "Our White Town bay takes care of routine maintenance and pre-rental checks.",
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
    detail: "Share the vehicle details through the form. Two minutes, no documents yet.",
  },
  {
    icon: BadgeCheck,
    title: "Inspect",
    detail: "We check the vehicle and paperwork, then agree a daily rate together.",
  },
  {
    icon: Banknote,
    title: "Earn",
    detail: "We photograph, list and book it. You hand over the keys; payouts land weekly.",
  },
];

const requirements = [
  "RC in your name and valid insurance",
  "Vehicle year 2015 or newer",
  "Clean service history and working lights, brakes and horn",
  "Two helmets for two-wheelers",
  "Pollution certificate valid for at least 3 months",
  "Original ID and a cancelled cheque or UPI ID for payouts",
];

const faqs = [
  {
    question: "How much can I really earn?",
    answer:
      "A well-maintained scooter booked 20 days a month earns roughly ₹5,600 after the platform fee at current rates. Cars and motorcycles earn more; the calculator above uses live Puducherry averages.",
  },
  {
    question: "Who pays for fuel and cleaning?",
    answer:
      "Riders return vehicles at the same fuel level, so fuel is effectively covered by them. We include a cleaning and inspection after every booking, paid from the platform fee.",
  },
  {
    question: "What if the vehicle is damaged?",
    answer:
      "Every booking carries a security deposit and insurance. Damage beyond normal wear is recovered from the deposit first, and our team manages the claim with you end to end.",
  },
  {
    question: "Can I take my vehicle off the platform?",
    answer:
      "Any time. Block future dates in the partner dashboard and complete your existing bookings. There is no lock-in and no exit fee.",
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
        description="Turn an idle scooter, motorcycle or car into weekly income. SavariGo handles the bookings, insurance, cleaning and servicing — you keep 80%."
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
          description="You own the vehicle. We bring verified riders, collect deposits and keep it road-ready."
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
              You keep four rupees of every five
            </h2>
            <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-muted">
              The 20% platform fee covers listing, verification, insurance administration, payment
              processing, cleaning and routine servicing. There are no joining fees, monthly fees or
              hidden deductions.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {[
                "Weekly payouts, every Friday",
                "Deposit held and released for you",
                "Rider verification and support",
                "Damage claims managed end to end",
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
              title="Listed in three steps"
              description="Most vehicles are live within 72 hours of inspection."
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

          <ListingForm />
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
