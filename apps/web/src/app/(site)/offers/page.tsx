import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Sparkles, Ticket } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { CouponsGrid } from "@/components/offers/coupons-grid";

export const metadata: Metadata = {
  title: "Offers & Coupons",
  description:
    "Save on your next ride with live SavariGo coupons for bike, scooter and car rentals in Puducherry. Copy a code and use it at checkout.",
};

const steps = [
  {
    icon: Ticket,
    title: "Copy a code",
    detail: "Tap copy on any live coupon above.",
  },
  {
    icon: CalendarDays,
    title: "Book as usual",
    detail: "Apply it in the payment step before you pay.",
  },
  {
    icon: BadgeCheck,
    title: "Save instantly",
    detail: "The discount is deducted from your total.",
  },
];

export default function OffersPage() {
  return (
    <>
      <PageHero
        eyebrow="Offers & coupons"
        title={
          <>
            Good rides,
            <br />
            better prices.
          </>
        }
        description="Live coupons for two-wheelers, cars and first bookings. One offer per booking — the best one is applied automatically at checkout."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
        actions={[{ label: "Start a booking", href: "/bikes-scooters" }]}
      >
        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface/90 px-4 py-3 backdrop-blur"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <step.icon className="size-4" />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-ink">
                  {i + 1}. {step.title}
                </p>
                <p className="text-[11.5px] text-muted">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </PageHero>

      <section className="container-page py-12 lg:py-16">
        <div className="mb-7 flex items-center gap-2 text-[12px] text-muted">
          <Sparkles className="size-4 text-brand-600" />
          Codes refresh every month. Offers can&apos;t be combined with other promotions.
        </div>
        <CouponsGrid />
      </section>

      <section className="container-page pb-14">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-panel border border-line bg-surface p-6">
            <h2 className="text-[18px] font-extrabold text-ink">The fine print, briefly</h2>
            <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-muted">
              <li>One coupon per booking. Only the highest-value eligible offer applies.</li>
              <li>Discounts apply to the rental amount, not the refundable security deposit.</li>
              <li>Minimum order values are calculated before taxes and fees.</li>
              <li>Cancelled bookings release the coupon back to your account.</li>
              <li>SavariGo may withdraw or change an offer at any time without notice.</li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-panel bg-forest p-6 text-white">
            <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-brand-500/20 blur-2xl" />
            <p className="label-overline mb-2 text-brand-300">Coming soon</p>
            <h2 className="font-display text-[22px] font-extrabold leading-tight">
              Refer a friend, both ride free
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">
              Invite a friend to SavariGo and you&apos;ll both get ₹200 in ride credit after
              their first completed booking. Rolling out to all accounts this quarter.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-300 hover:underline"
            >
              Ask to join the early list →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
