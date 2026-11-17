import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CarFront,
  ClipboardList,
  FileCheck2,
  Plus,
  Star,
  Ticket,
  Wallet,
} from "lucide-react";
import { AdminEmpty, AdminPanel, AdminTable, inr, whenTime } from "@/components/admin/ui";
import { AdminBookingStatus, AdminPaymentStatus } from "@/components/admin/status-badge";
import { PartnerStatusBadge } from "@/components/portal/badges";
import { BarChart, LineChart } from "@/components/portal/charts";
import { AttentionStrip, QuickActions, StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type {
  Paginated,
  VendorBookingItem,
  VendorEarnings,
  VendorOverview,
} from "@/lib/api/types";
import { bucketLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Partner dashboard" };

const DAY_MS = 86_400_000;

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function PartnerDashboardPage() {
  const [overview, earnings, bookings] = await Promise.all([
    vendorRequest<VendorOverview>("/vendor/overview"),
    vendorRequest<VendorEarnings>("/vendor/earnings"),
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { limit: 100 },
    }),
  ]);

  const today = dayKey(new Date().toISOString());
  const windowStart = Date.now() - 29 * DAY_MS;
  const trend = new Map<string, number>();
  for (let index = 29; index >= 0; index -= 1) {
    trend.set(dayKey(new Date(Date.now() - index * DAY_MS).toISOString()), 0);
  }
  for (const booking of bookings.data) {
    const key = dayKey(booking.pickupAt);
    if (new Date(booking.pickupAt).getTime() >= windowStart && trend.has(key)) {
      trend.set(key, (trend.get(key) ?? 0) + 1);
    }
  }

  const pendingDocuments = overview.pendingApprovals;
  const maxMonthGross = Math.max(...earnings.monthly.map((row) => row.gross), 1);

  const stats = [
    {
      label: "My vehicles",
      value: overview.vehicles.total.toLocaleString("en-IN"),
      hint: `${overview.vehicles.available} live on the site`,
      icon: CarFront,
      tint: "mint" as const,
      href: "/partner/vehicles",
    },
    {
      label: "Total bookings",
      value: overview.bookings.total.toLocaleString("en-IN"),
      hint: `${overview.bookings.completed} completed`,
      icon: CalendarCheck,
      tint: "sky" as const,
      href: "/partner/history",
    },
    {
      label: "Booking requests",
      value: overview.bookings.pending.toLocaleString("en-IN"),
      hint: "Awaiting payment or confirmation",
      icon: Ticket,
      tint: "peach" as const,
      href: "/partner/bookings",
    },
    {
      label: "Active rentals",
      value: overview.bookings.active.toLocaleString("en-IN"),
      hint: "Confirmed and on trip",
      icon: ClipboardList,
      tint: "lilac" as const,
      href: "/partner/active",
    },
    {
      label: "Net earnings",
      value: inr(overview.earnings.totalNet, { compact: true }),
      hint: `${overview.earnings.commissionPercent}% platform commission`,
      icon: Wallet,
      tint: "butter" as const,
      href: "/partner/earnings",
    },
    {
      label: "Pending approvals",
      value: pendingDocuments.toLocaleString("en-IN"),
      hint: "Vehicles waiting on Master Admin",
      icon: FileCheck2,
      tint: "peach" as const,
      href: "/partner/vehicles?status=DRAFT",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-overline mb-1.5">Rental partner</p>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
            {overview.partner.tradingName}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {overview.partner.partnerCode} · {overview.partner.city}. You only see your own fleet,
            bookings, documents and earnings here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PartnerStatusBadge status={overview.partner.status} />
          <Link
            href="/partner/vehicles/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-5 text-[13px] font-semibold text-white transition hover:bg-brand-900"
          >
            <Plus className="size-4" /> Add vehicle
          </Link>
        </div>
      </div>

      {overview.partner.status !== "APPROVED" && (
        <div className="rounded-panel border border-amber-200 bg-tint-butter px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
          Your partner account is {overview.partner.status.toLowerCase()}. Vehicles you list stay
          pending and never appear on the SavariGo website or app until Master Admin approves both
          the partner and each vehicle.
        </div>
      )}

      <StatGrid columns={6}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </StatGrid>

      <AttentionStrip
        items={[
          {
            label: "vehicles awaiting approval",
            value: overview.pendingApprovals,
            href: "/partner/vehicles?status=DRAFT",
          },
          {
            label: "booking requests to review",
            value: overview.bookings.pending,
            href: "/partner/bookings",
          },
          {
            label: "ratings on your fleet",
            value: overview.reviews.count,
            href: "/partner/reviews",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="Booking Overview"
          description={`Pickup days across your last ${bookings.data.length} bookings`}
        >
          <div className="px-5 pb-5 pt-4">
            <LineChart
              ariaLabel="Bookings per day"
              labelEvery={5}
              format={(value) => `${value} bookings`}
              points={[...trend.entries()].map(([key, value]) => ({
                label: bucketLabel(key),
                value,
              }))}
            />
            <p className="mt-3 text-[11px] text-muted">
              Today ({bucketLabel(today)}) has {trend.get(today) ?? 0} scheduled pickup
              {trend.get(today) === 1 ? "" : "s"}.
            </p>
          </div>
        </AdminPanel>

        <QuickActions
          actions={[
            {
              label: "Add New Vehicle",
              href: "/partner/vehicles/new",
              icon: Plus,
              description: "Five steps, then Master Admin approval",
            },
            {
              label: "Check Availability",
              href: "/partner/availability",
              icon: CalendarCheck,
              description: "Blocked dates across your fleet",
            },
            {
              label: "Upload a Document",
              href: "/partner/documents",
              icon: FileCheck2,
              description: "RC, insurance, GST or KYC",
            },
            {
              label: "Raise a Ticket",
              href: "/partner/support",
              icon: Ticket,
              description: "Ask the SavariGo team",
            },
          ]}
        />
      </div>

      <AdminPanel
        title="Revenue Analytics"
        description="Collected, platform commission and your payout for the last six months"
        action={
          <Link href="/partner/earnings" className="text-[12px] font-semibold text-brand-700 hover:underline">
            Earnings detail
          </Link>
        }
      >
        <div className="px-5 pb-5 pt-4">
          <BarChart
            format={(value) => inr(value)}
            secondaryFormat={(value) => inr(value)}
            points={earnings.monthly.map((row) => ({
              label: bucketLabel(row.month),
              value: row.gross,
              secondary: row.net,
            }))}
          />
          <div className="mt-4 grid gap-3 border-t border-line pt-4 text-[12px] sm:grid-cols-4">
            <div>
              <p className="text-muted">Gross (6 months)</p>
              <p className="font-bold text-ink">
                {inr(earnings.monthly.reduce((sum, row) => sum + row.gross, 0))}
              </p>
            </div>
            <div>
              <p className="text-muted">Commission kept</p>
              <p className="font-bold text-ink">
                {inr(earnings.monthly.reduce((sum, row) => sum + row.commission, 0))}
              </p>
            </div>
            <div>
              <p className="text-muted">Best month</p>
              <p className="font-bold text-ink">
                {
                  earnings.monthly
                    .slice()
                    .sort((a, b) => b.gross - a.gross)
                    .slice(0, 2)
                    .map((row) => `${bucketLabel(row.month)} ${inr(row.gross, { compact: true })}`)
                    .join(" · ") || "—"
                }
              </p>
            </div>
            <div>
              <p className="text-muted">Lifetime payout</p>
              <p className="font-bold text-brand-700">{inr(earnings.lifetime.net)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Share of the strongest month: {Math.round((maxMonthGross / Math.max(earnings.lifetime.gross, 1)) * 100)}%
            of lifetime collections landed inside it.
          </p>
        </div>
      </AdminPanel>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="Recent bookings"
          action={
            <Link href="/partner/history" className="text-[12px] font-semibold text-brand-700 hover:underline">
              Rental history
            </Link>
          }
        >
          <AdminTable
            head={["Booking", "Rider", "Vehicle", "Pickup", "Status", "Payment", "Your share"]}
            minWidth={760}
          >
            {overview.recentBookings.length === 0 && (
              <AdminEmpty colSpan={7}>No booking has touched your fleet yet.</AdminEmpty>
            )}
            {overview.recentBookings.map((booking) => (
              <tr key={booking.id} className="transition hover:bg-page/60">
                <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">
                  {booking.code}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-ink">{booking.customerName}</p>
                  <p className="text-[11px] text-muted">{booking.customerEmail}</p>
                </td>
                <td className="px-3 py-3 text-ink-soft">{booking.vehicle.name}</td>
                <td className="whitespace-nowrap px-3 py-3 text-muted">
                  {whenTime(booking.pickupAt)}
                </td>
                <td className="px-3 py-3">
                  <AdminBookingStatus status={booking.status} />
                </td>
                <td className="px-3 py-3">
                  <AdminPaymentStatus status={booking.paymentStatus} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-ink">
                  {inr(
                    Math.round(
                      booking.paidAmount *
                        (1 - overview.earnings.commissionPercent / 100) *
                        100,
                    ) / 100,
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminPanel>

        <AdminPanel
          title="Rider rating"
          description="Published reviews on your own vehicles"
          action={
            <Link href="/partner/reviews" className="text-[12px] font-semibold text-brand-700 hover:underline">
              All reviews
            </Link>
          }
        >
          <div className="space-y-4 p-5">
            <div className="flex items-end gap-3">
              <p className="font-display text-[38px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
                {overview.reviews.count > 0 ? overview.reviews.average.toFixed(2) : "—"}
              </p>
              <p className="pb-1 text-[12.5px] text-muted">
                {overview.reviews.count} review{overview.reviews.count === 1 ? "" : "s"}
              </p>
              <Star className="mb-1 ml-auto size-5 text-amber-500" />
            </div>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {[
                { label: "Vehicles live", value: `${overview.vehicles.available} of ${overview.vehicles.total}` },
                { label: "On trip now", value: String(overview.vehicles.byStatus.ON_TRIP ?? 0) },
                { label: "In maintenance", value: String(overview.vehicles.byStatus.MAINTENANCE ?? 0) },
                { label: "This month", value: inr(overview.earnings.monthNet) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[12.5px] text-ink-soft">{row.label}</dt>
                  <dd className="text-[13px] font-bold text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
