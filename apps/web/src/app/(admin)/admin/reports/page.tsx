import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  CalendarCheck,
  CarFront,
  Coins,
  Gauge,
  Percent,
  Users,
} from "lucide-react";
import {
  AdminEmpty,
  AdminPanel,
  AdminTable,
  adminButtonSoft,
  firstParam,
} from "@/components/admin/ui";
import { PartnerStatusBadge } from "@/components/portal/badges";
import { BarChart, ChartLegend, DonutChart, LineChart, RankedList } from "@/components/portal/charts";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { staffRequest } from "@/lib/api/server";
import type { AdminReportSummary } from "@/lib/api/types";
import { bucketLabel, cn, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports & Analytics" };

const RANGES = [
  { days: 7, label: "7 days", group: "day", labelEvery: 1 },
  { days: 30, label: "30 days", group: "day", labelEvery: 5 },
  { days: 90, label: "90 days", group: "week", labelEvery: 1 },
  { days: 180, label: "6 months", group: "month", labelEvery: 1 },
  { days: 365, label: "12 months", group: "month", labelEvery: 1 },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = Number(firstParam(params.range) ?? "30");
  const range = RANGES.find((entry) => entry.days === requested) ?? RANGES[1];
  const group = range.group;

  const report = await staffRequest<AdminReportSummary>(
    `/admin/reports?days=${range.days}&group=${group}`,
  );

  const maxCityCollected = Math.max(...report.cityPerformance.map((row) => row.collected), 1);
  const seriesLabel = group === "month" ? "month" : group === "week" ? "week" : "day";

  const totals = [
    {
      label: "Bookings in range",
      value: report.totals.bookings.toLocaleString("en-IN"),
      hint: `${report.totals.cancelled} cancelled or no-show`,
      icon: CalendarCheck,
      tint: "mint" as const,
    },
    {
      label: "Collected",
      value: inr(report.totals.collected, { compact: true }),
      hint: `${inr(report.totals.refunded, { compact: true })} refunded`,
      icon: Coins,
      tint: "lilac" as const,
    },
    {
      label: "Net revenue",
      value: inr(report.totals.net, { compact: true }),
      hint: "Collected minus refunds",
      icon: Gauge,
      tint: "sky" as const,
    },
    {
      label: "Average booking",
      value: inr(report.totals.averageBookingValue),
      hint: `${inr(report.totals.rentalValue, { compact: true })} rental value`,
      icon: Percent,
      tint: "peach" as const,
    },
    {
      label: "Fleet",
      value: report.totals.vehicles.toLocaleString("en-IN"),
      hint: `${report.totals.availableVehicles} available`,
      icon: CarFront,
      tint: "butter" as const,
    },
    {
      label: "People",
      value: (report.totals.customers + report.totals.drivers).toLocaleString("en-IN"),
      hint: `${report.totals.customers} riders · ${report.totals.drivers} drivers`,
      icon: Users,
      tint: "mint" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-overline mb-1.5">Admin</p>
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
            Reports &amp; Analytics
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {new Date(report.range.from).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            to{" "}
            {new Date(report.range.to).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            . Cancelled and no-show bookings never count as revenue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1">
          {RANGES.map((entry) => (
            <Link
              key={entry.days}
              href={`/admin/reports?range=${entry.days}&group=${entry.group}`}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition",
                entry.days === range.days
                  ? "bg-forest text-white"
                  : "text-muted hover:bg-page hover:text-ink",
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </div>

      <StatGrid columns={6}>
        {totals.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel title="Revenue Analytics" description={`Collected per ${seriesLabel}`}>
          <div className="px-5 pb-5 pt-4">
            <LineChart
              ariaLabel="Amount collected per bucket"
              labelEvery={range.labelEvery}
              format={(value) => inr(value)}
              points={report.series.map((point) => ({
                label: bucketLabel(point.label),
                value: point.collected,
              }))}
            />
          </div>
        </AdminPanel>

        <AdminPanel title="Category mix" description="Share of bookings by vehicle category">
          <div className="p-5">
            <DonutChart
              format={(value) => `${value} bookings`}
              slices={report.categoryMix.map((row) => ({
                label: row.category,
                value: row.bookings,
              }))}
            />
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <AdminPanel title="Booking Overview" description={`Bookings created per ${seriesLabel}`}>
          <div className="px-5 pb-5 pt-4">
            <BarChart
              format={(value) => `${value} bookings`}
              labelEvery={range.labelEvery}
              points={report.series.map((point) => ({
                label: bucketLabel(point.label),
                value: point.bookings,
              }))}
            />
          </div>
        </AdminPanel>

        <AdminPanel
          title="Top Performing Cities"
          description="Ranked by amount collected in range"
          action={
            <Link href="/admin/locations" className={panelLink}>
              Manage hubs
            </Link>
          }
        >
          <RankedList
            rows={report.cityPerformance.slice(0, 8).map((row) => ({
              title: row.city,
              subtitle: `${row.bookings} bookings · ${row.vehicles} vehicles`,
              value: inr(row.collected, { compact: true }),
              share: row.collected / maxCityCollected,
            }))}
          />
        </AdminPanel>
      </div>

      <AdminPanel
        title="Partner performance"
        description="Payout is the partner share after the commission you set. Only Master Admin can change it."
        action={
          <Link href="/admin/partners" className={panelLink}>
            Manage partners
          </Link>
        }
      >
        <AdminTable
          minWidth={1080}
          head={["Partner", "City", "Status", "Fleet", "Live", "Bookings", "Collected", "Partner payout", "Commission"]}
        >
          {report.partnerPerformance.length === 0 && (
            <AdminEmpty colSpan={9}>No rental partners have taken a booking yet.</AdminEmpty>
          )}
          {report.partnerPerformance.map((row) => (
            <tr key={row.ownerId} className="transition hover:bg-page/60">
              <td className="px-5 py-3.5">
                {row.partnerCode ? (
                  <Link
                    href={`/admin/partners?q=${encodeURIComponent(row.tradingName)}`}
                    className="font-semibold text-ink hover:text-brand-700"
                  >
                    {row.tradingName}
                  </Link>
                ) : (
                  <p className="font-semibold text-ink">{row.tradingName}</p>
                )}
                <p className="text-[11px] text-muted">
                  {row.partnerCode ?? "Direct SavariGo fleet"}
                </p>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">{row.city ?? "—"}</td>
              <td className="px-5 py-3.5">
                {row.status ? <PartnerStatusBadge status={row.status} /> : <span className="text-[12px] text-muted">In-house</span>}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">{row.vehicles}</td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">{row.available}</td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">{row.bookings}</td>
              <td className="whitespace-nowrap px-5 py-3.5 tabular-nums font-semibold text-ink">
                {inr(row.collected)}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-brand-700">
                {inr(row.payout)}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">{row.commissionPercent}%</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminPanel
        title="Most booked vehicles"
        description="Rating is the published average from rider reviews."
        action={
          <Link href="/admin/vehicles" className={panelLink}>
            Vehicle management
          </Link>
        }
      >
        <AdminTable minWidth={820} head={["Vehicle", "Bookings", "Collected", "Rating"]}>
          {report.vehiclePopularity.length === 0 && (
            <AdminEmpty colSpan={4}>No vehicle has been booked in this range.</AdminEmpty>
          )}
          {report.vehiclePopularity.slice(0, 12).map((row) => (
            <tr key={row.slug} className="transition hover:bg-page/60">
              <td className="px-5 py-3.5">
                <Link
                  href={`/vehicles/${row.slug}`}
                  className="font-semibold text-ink hover:text-brand-700"
                >
                  {row.name}
                </Link>
              </td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">{row.bookings}</td>
              <td className="whitespace-nowrap px-5 py-3.5 tabular-nums font-semibold text-ink">
                {inr(row.collected)}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-ink-soft">
                {row.rating > 0 ? `${row.rating.toFixed(2)} ★` : "No ratings"}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <div className="flex flex-wrap items-center gap-4">
        <ChartLegend items={[{ label: `Collected per ${seriesLabel}`, tone: "primary" }]} />
        <Link href="/admin/bookings" className={adminButtonSoft}>
          <Ban className="size-4" /> Audit bookings
        </Link>
      </div>
    </div>
  );
}

const panelLink = "text-[12px] font-semibold text-brand-700 hover:underline";
