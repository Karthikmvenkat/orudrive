"use client";

import { Check, Star, ThumbsUp } from "lucide-react";
import type { Vehicle } from "@/types";
import { inr } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const reviewSamples = [
  {
    name: "Ananya R.",
    initials: "AR",
    date: "2 weeks ago",
    rating: 5,
    title: "Spotless and ready on time",
    text: "Picked it up near Rock Beach. The scooter was clean, tank half full and the helmet was new. Handover took under five minutes.",
  },
  {
    name: "Vikram S.",
    initials: "VS",
    date: "1 month ago",
    rating: 5,
    title: "Exactly as described",
    text: "Booked for three days for Auroville and ECR. No hidden charges, deposit refunded in two days. Would rent again.",
  },
  {
    name: "Meera J.",
    initials: "MJ",
    date: "1 month ago",
    rating: 4,
    title: "Great value",
    text: "Slightly older model than the photos but ran perfectly. Support answered on WhatsApp within minutes when I asked for a charger.",
  },
];

const plans = [
  { label: "1 day", days: 1, discount: 0 },
  { label: "3 days", days: 3, discount: 0.05 },
  { label: "7 days", days: 7, discount: 0.12 },
];

export function VehicleTabs({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Tabs defaultValue="overview" className="mt-7">
      <div className="no-scrollbar overflow-x-auto">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="plans">Rental Plans</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({vehicle.reviewCount})</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <div>
          <h2 className="text-[17px] font-bold text-ink">About this {vehicle.category}</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {vehicle.description}
          </p>
        </div>

        <div>
          <h3 className="text-[14px] font-bold text-ink">What&apos;s included</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {vehicle.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 rounded-lg border border-line bg-page/50 px-3 py-2.5 text-[12.5px] text-ink-soft"
              >
                <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-ink">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-page/50 p-4">
          <h3 className="text-[13px] font-bold text-ink">Rental terms</h3>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted">
            <li>• {vehicle.mileageLimit}. Extra kilometres billed at ₹4/km.</li>
            <li>• Refundable security deposit of {inr(vehicle.deposit)} collected at pickup.</li>
            <li>• Valid driving licence and one government photo ID required.</li>
            <li>• Free cancellation up to 24 hours before pickup.</li>
            <li>• Fuel level at pickup must be matched at return.</li>
          </ul>
        </div>
      </TabsContent>

      <TabsContent value="specs">
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <tbody className="divide-y divide-line">
              {vehicle.specs.map((spec, i) => (
                <tr key={spec.label} className={i % 2 ? "bg-page/40" : "bg-white"}>
                  <th className="w-1/2 px-4 py-3 font-medium text-muted">{spec.label}</th>
                  <td className="px-4 py-3 font-semibold text-ink">{spec.value}</td>
                </tr>
              ))}
              <tr className="bg-page/40">
                <th className="px-4 py-3 font-medium text-muted">Mileage limit</th>
                <td className="px-4 py-3 font-semibold text-ink">{vehicle.mileageLimit}</td>
              </tr>
              <tr>
                <th className="px-4 py-3 font-medium text-muted">Security deposit</th>
                <td className="px-4 py-3 font-semibold text-ink">{inr(vehicle.deposit)}</td>
              </tr>
              <tr className="bg-page/40">
                <th className="px-4 py-3 font-medium text-muted">Pickup location</th>
                <td className="px-4 py-3 font-semibold text-ink">{vehicle.location}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="plans">
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan, i) => {
            const total = Math.round(vehicle.pricePerDay * plan.days * (1 - plan.discount));
            return (
              <div
                key={plan.label}
                className={
                  i === 1
                    ? "relative rounded-xl border-2 border-brand-500 bg-brand-50/60 p-4"
                    : "relative rounded-xl border border-line bg-white p-4"
                }
              >
                {i === 1 && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-brand-500 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink">
                    Most popular
                  </span>
                )}
                <p className="text-[12px] font-semibold text-muted">{plan.label}</p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-ink">
                  {inr(total)}
                </p>
                <p className="text-[11px] text-muted">
                  {inr(Math.round(total / plan.days))}/day
                  {plan.discount > 0 && ` · save ${Math.round(plan.discount * 100)}%`}
                </p>
                <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-muted">
                  + {inr(vehicle.deposit)} refundable deposit
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Longer rentals available on request — call +91 98765 43210 for monthly plans.
        </p>
      </TabsContent>

      <TabsContent value="reviews" className="space-y-5">
        <div className="grid gap-5 rounded-xl border border-line bg-page/40 p-4 sm:grid-cols-[150px_1fr]">
          <div className="text-center sm:border-r sm:border-line">
            <p className="font-display text-[40px] font-extrabold leading-none text-ink">
              {vehicle.rating.toFixed(1)}
            </p>
            <div className="mt-1.5 flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={
                    i < Math.round(vehicle.rating)
                      ? "size-3.5 fill-brand-500 text-brand-500"
                      : "size-3.5 fill-line text-line"
                  }
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {vehicle.reviewCount.toLocaleString("en-IN")} reviews
            </p>
          </div>
          <div className="space-y-1.5">
            {[
              { stars: 5, pct: 78 },
              { stars: 4, pct: 15 },
              { stars: 3, pct: 4 },
              { stars: 2, pct: 2 },
              { stars: 1, pct: 1 },
            ].map((row) => (
              <div key={row.stars} className="flex items-center gap-2 text-[11px] text-muted">
                <span className="w-6">{row.stars}★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </span>
                <span className="w-8 text-right">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {reviewSamples.map((review) => (
            <article key={review.name} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                    {review.initials}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{review.name}</p>
                    <p className="text-[10.5px] text-muted">Verified booking · {review.date}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < review.rating
                          ? "size-3 fill-brand-500 text-brand-500"
                          : "size-3 fill-line text-line"
                      }
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2.5 text-[13px] font-semibold text-ink">{review.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{review.text}</p>
              <button className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-brand-700">
                <ThumbsUp className="size-3.5" /> Helpful
              </button>
            </article>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
