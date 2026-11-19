import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Gauge,
  MapPin,
  Wrench,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Mobile Puncher",
  description:
    "On-the-spot tyre puncture repair for bikes, scooters and cars in Puducherry. A technician brings a portable compressor and repair kit to wherever you are parked.",
};

const highlights = [
  {
    icon: Wrench,
    title: "Repair at your spot",
    detail: "No need to push the vehicle to a garage — the technician comes to you.",
  },
  {
    icon: Gauge,
    title: "Portable compressor",
    detail: "Tubeless punctures are plugged and inflated on location.",
  },
  {
    icon: Bike,
    title: "Bikes and cars",
    detail: "Scooters, motorcycles, hatchbacks, sedans and SUVs are all covered.",
  },
  {
    icon: MapPin,
    title: "Across Puducherry",
    detail: "White Town, Auroville, Lawspet, Villianur and nearby areas.",
  },
];

const steps = [
  {
    title: "Call or WhatsApp support",
    detail: "Tell us the vehicle, the tyre and your live location.",
  },
  {
    title: "We confirm the technician",
    detail: "You get the technician's details and the confirmed charge before anyone rides out.",
  },
  {
    title: "Repair and ride on",
    detail: "The puncture is repaired on the spot and the tyre is inflated to the correct pressure.",
  },
];

export default function MobilePuncherPage() {
  return (
    <>
      <PageHero
        eyebrow="Mobile puncher"
        title={
          <>
            Flat tyre?
            <br />
            We come to you.
          </>
        }
        description="On-the-spot puncture repair for bikes, scooters and cars anywhere in Puducherry. One call sends a technician with a portable compressor and repair kit to your location."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Mobile Puncher" }]}
        actions={[
          { label: "Request a puncher", href: "/contact" },
          { label: "How it works", href: "#how-it-works", variant: "outline" },
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

      <section
        id="how-it-works"
        className="container-page scroll-mt-24 py-12 lg:py-16"
      >
        <SectionHeading
          eyebrow="How it works"
          title="From flat tyre to moving again"
          description="The same crew that runs our tow service handles puncher calls, so you deal with one support line for both."
          action={{ label: "Talk to support", href: "/contact" }}
        />
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 80}>
              <div className="h-full rounded-panel border border-line bg-surface p-5">
                <span className="grid size-9 place-items-center rounded-full border border-brand-200 bg-white text-[12px] font-bold text-brand-700">
                  {index + 1}
                </span>
                <p className="mt-3 text-[14px] font-bold text-ink">{step.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="relative overflow-hidden rounded-panel bg-forest px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-[24px] font-extrabold text-white sm:text-[28px]">
                Stuck with a flat right now?
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] text-white/70">
                Share your live location on WhatsApp and we will send the nearest technician.
              </p>
            </div>
            <Button asChild size="lg" className="bg-white text-forest hover:bg-brand-50">
              <Link href="/contact">
                Book a puncher <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
