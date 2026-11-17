import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";
import {
  AdminPage,
  AdminPanel,
  adminButton,
  firstParam,
  when,
} from "@/components/admin/ui";
import { RankedList } from "@/components/portal/charts";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { VendorReviews } from "@/lib/api/types";

export const metadata: Metadata = { title: "Reviews & Ratings" };

export default async function PartnerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reviews = await vendorRequest<VendorReviews>("/vendor/reviews");

  const maxSpread = Math.max(...reviews.spread.map((row) => row.count), 1);
  const worst = [...reviews.perVehicle].sort((a, b) => a.average - b.average)[0];

  return (
    <AdminPage
      title="Reviews & Ratings"
      description="Only published rider reviews on your own vehicles. SavariGo moderates submissions, so this list matches what customers see on the listing page."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/vehicles" className={adminButton}>
          <MessageSquare className="size-4" /> My vehicles
        </Link>
      }
    >
      <StatGrid columns={4}>
        <StatCard
          label="Published reviews"
          value={String(reviews.summary.count)}
          hint="Across your whole fleet"
          icon={MessageSquare}
        />
        <StatCard
          label="Average rating"
          value={reviews.summary.count > 0 ? `${reviews.summary.average.toFixed(2)} ★` : "—"}
          hint="Five-star scale"
          icon={Star}
          tint="butter"
        />
        <StatCard
          label="Vehicles rated"
          value={String(reviews.perVehicle.length)}
          hint="Listings with at least one review"
          icon={Star}
          tint="sky"
        />
        <StatCard
          label="Lowest rated"
          value={worst ? `${worst.average.toFixed(2)} ★` : "—"}
          hint={worst ? worst.name : "Nothing to fix yet"}
          icon={MessageSquare}
          tint={worst && worst.average < 3.5 ? "peach" : "mint"}
        />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <AdminPanel title="Star spread" description="How riders rate your service overall.">
          <div className="space-y-2.5 p-5">
            {reviews.spread
              .slice()
              .reverse()
              .map((row) => (
                <div key={row.stars} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-[12px] font-semibold text-ink-soft tabular-nums">
                    {row.stars} ★
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-page">
                    <span
                      className="block h-full rounded-full bg-brand-400"
                      style={{ width: `${Math.round((row.count / maxSpread) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[12px] font-bold tabular-nums text-ink">
                    {row.count}
                  </span>
                </div>
              ))}
            {reviews.summary.count === 0 && (
              <p className="text-[12.5px] text-muted">
                No published review has reached your fleet yet. Ratings appear after a rental is
                completed and the rider leaves feedback.
              </p>
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Vehicle performance"
          description="Most reviewed listings first — useful when deciding which vehicle to service or re-price."
        >
          <RankedList
            rows={reviews.perVehicle.map((row) => ({
              title: row.name,
              subtitle: `${row.count} review${row.count === 1 ? "" : "s"}`,
              value: `${row.average.toFixed(2)} ★`,
              share: row.count,
            }))}
          />
        </AdminPanel>
      </div>

      <AdminPanel
        title={`${reviews.items.length} most recent review${reviews.items.length === 1 ? "" : "s"}`}
        description="Newest first, with the booking that produced it."
      >
        {reviews.items.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            Nothing published yet.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.items.map((item) => (
              <li key={item.id} className="flex flex-wrap gap-4 px-5 py-4">
                <div className="flex w-24 shrink-0 flex-col items-center rounded-xl bg-page px-2 py-3">
                  <span className="text-[20px] font-extrabold tabular-nums text-ink">
                    {item.rating}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    stars
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-ink">
                    {item.title ?? "Rating without a title"}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                    {item.comment}
                  </p>
                  <p className="mt-2 text-[11px] text-muted">
                    {item.customerName} · {when(item.createdAt)} · booking{" "}
                    <span className="font-mono">{item.bookingCode}</span>
                  </p>
                </div>
                <Link
                  href={`/vehicles/${item.vehicleSlug}`}
                  className="w-40 shrink-0 text-right text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  {item.vehicleName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
