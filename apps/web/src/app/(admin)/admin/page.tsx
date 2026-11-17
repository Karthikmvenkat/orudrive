import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CarFront,
  Coins,
  FileCheck2,
  Plus,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { AdminEmpty, AdminPanel, AdminTable, inr, when } from "@/components/admin/ui";
import { AdminBookingStatus, AdminPaymentStatus } from "@/components/admin/status-badge";
import { PartnerStatusBadge } from "@/components/portal/badges";
import { BarChart, LineChart, RankedList } from "@/components/portal/charts";
import { AttentionStrip, QuickActions, StatCard, StatGrid } from "@/components/portal/ui";
import { staffRequest } from "@/lib/api/server";
import type { AdminOverview, AdminReportSummary } from "@/lib/api/types";
import { cn, bucketLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Master Admin dashboard" };

const RANGES = [
  { days: 7, label: "Last 7 days", group: "day", labelEvery: 1 },
  { days: 30, label: "Last 30 days", group: "day", labelEvery: 5 },
  { days: 90, label: "Last 90 days", group: "week", labelEvery: 2 },
] as const;

export default async function AdminDashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const requested = Number(params.range ?? "30");
  const range = RANGES.find((entry) => entry.days === requested) ?? RANGES[1];

  const [overview, report] = await Promise.all([
    staffRequest<AdminOverview>("/admin/overview"),
    staffRequest<AdminReportSummary>(`/admin/reports?days=${range.days}&group=${range.group}`),
  ]);

  const activeRentals =
    (overview.bookings.byStatus.CONFIRMED ?? 0) + (overview.bookings.byStatus.ONGOING ?? 0);
  const pendingApprovals =
    overview.attention.pendingPartnerApprovals + overview.attention.pendingDocuments;

  const stats = [
    {
      label: "Total Vehicles",
      value: overview.vehicles.total.toLocaleString("en-IN"),
      hint: `${overview.vehicles.byStatus.AVAILABLE ?? 0} bookable now`,
      icon: CarFront,
      tint: "mint" as const,
      href: "/admin/vehicles",
    },
    {
      label: "Total Bookings",
      value: overview.bookings.total.toLocaleString("en-IN"),
      hint: `${overview.bookings.byStatus.PENDING ?? 0} awaiting payment`,
      icon: CalendarCheck,
      tint: "sky" as const,
      href: "/admin/bookings",
    },
    {
      label: "Rental Partners",
      value: overview.partners.total.toLocaleString("en-IN"),
      hint: `${overview.partners.byStatus.APPROVED ?? 0} approved`,
      icon: Users,
      tint: "peach" as const,
      href: "/admin/partners",
    },
    {
      label: "Total Revenue",
      value: inr(overview.revenue.net, { compact: true }),
      hint: `${inr(overview.revenue.refunded, { compact: true })} refunded`,
      icon: Coins,
      tint: "lilac" as const,
      href: "/admin/payments",
    },
    {
      label: "Active Rentals",
      value: activeRentals.toLocaleString("en-IN"),
      hint: "Confirmed and on trip",
      icon: Ticket,
      tint: "butter" as const,
      href: "/admin/bookings?status=ONGOING",
    },
    {
      label: "Pending Approvals",
      value: pendingApprovals.toLocaleString("en-IN"),
      hint: `${overview.attention.pendingPartnerApprovals} partners · ${overview.attention.pendingDocuments} documents`,
      icon: FileCheck2,
      tint: "peach" as const,
      href: "/admin/partners?status=PENDING",
    },
  ];

  const maxCityCollected = Math.max(...report.cityPerformance.map((row) => row.collected), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-overline mb-1.5">Master Admin</p>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {report.totals.bookings} bookings created and {inr(report.totals.collected)} collected
            in the last {range.days} days.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          {RANGES.map((entry) => (
            <Link
              key={entry.days}
              href={`/admin?range=${entry.days}`}
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
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </StatGrid>

      <AttentionStrip
        items={[
          {
            label: "partner approvals",
            value: overview.attention.pendingPartnerApprovals,
            href: "/admin/partners?status=PENDING",
          },
          {
            label: "documents to verify",
            value: overview.attention.pendingDocuments,
            href: "/admin/documents?status=PENDING",
          },
          { label: "open tickets", value: overview.attention.openTickets, href: "/admin/support" },
          {
            label: "driver verifications",
            value: overview.attention.pendingDriverVerification,
            href: "/admin/users?tab=drivers",
          },
          {
            label: "licence checks",
            value: overview.attention.pendingLicenceChecks,
            href: "/admin/users?tab=customers",
          },
          {
            label: "unpaid bookings",
            value: overview.attention.pendingPayments,
            href: "/admin/bookings?status=PENDING",
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel
          title="Booking Overview"
          description={`Bookings created per ${range.group === "week" ? "week" : "day"}`}
        >
          <div className="px-5 pb-5 pt-4">
            <LineChart
              ariaLabel="Bookings created per bucket"
              labelEvery={range.labelEvery}
              format={(value) => `${value} bookings`}
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
            <Link
              href="/admin/reports"
              className="text-[12px] font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          <RankedList
            rows={report.cityPerformance.slice(0, 6).map((row) => ({
              title: row.city,
              subtitle: `${row.bookings} bookings · ${row.vehicles} vehicles`,
              value: inr(row.collected, { compact: true }),
              share: row.collected / maxCityCollected,
            }))}
          />
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AdminPanel title="Revenue Analytics" description="Amount collected per month">
          <div className="px-5 pb-5 pt-4">
            <BarChart
              format={(value) => inr(value)}
              points={overview.monthly.map((row) => ({
                label: bucketLabel(row.month),
                value: row.revenue,
              }))}
            />
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[12px]">
              <div>
                <dt className="text-muted">Collected</dt>
                <dd className="font-bold text-ink">{inr(overview.revenue.collected)}</dd>
              </div>
              <div>
                <dt className="text-muted">Refunded</dt>
                <dd className="font-bold text-ink">{inr(overview.revenue.refunded)}</dd>
              </div>
              <div>
                <dt className="text-muted">Net</dt>
                <dd className="font-bold text-brand-700">{inr(overview.revenue.net)}</dd>
              </div>
            </dl>
          </div>
        </AdminPanel>

        <QuickActions
          actions={[
            {
              label: "Add Partner",
              href: "/admin/partners?new=1",
              icon: Plus,
              description: "Create a rental partner login",
            },
            {
              label: "Add Vehicle",
              href: "/admin/vehicles/new",
              icon: CarFront,
              description: "Publish a new fleet entry",
            },
            {
              label: "Create Coupon",
              href: "/admin/coupons?new=1",
              icon: Ticket,
              description: "Flat or percentage discount",
            },
            {
              label: "View Reports",
              href: "/admin/reports",
              icon: Star,
              description: "City, partner and vehicle analytics",
            },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel
          title="Recent Bookings"
          action={
            <Link
              href="/admin/bookings"
              className="text-[12px] font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          <AdminTable
            head={["Booking", "Customer", "Vehicle", "Pickup", "Status", "Payment", "Amount"]}
            minWidth={680}
          >
            {overview.recentBookings.length === 0 ? (
              <AdminEmpty colSpan={7}>No bookings recorded yet.</AdminEmpty>
            ) : (
              overview.recentBookings.map((booking) => (
                <tr key={booking.id} className="transition hover:bg-page/60">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">
                    {booking.code}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{booking.customerName}</p>
                    <p className="text-[11px] text-muted">{booking.customerEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{booking.vehicleName}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    {when(booking.pickupAt)}
                  </td>
                  <td className="px-3 py-3">
                    <AdminBookingStatus status={booking.status} />
                  </td>
                  <td className="px-3 py-3">
                    <AdminPaymentStatus status={booking.paymentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-ink">
                    {inr(booking.totalAmount)}
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminPanel>

        <AdminPanel
          title="Recent Partner Registrations"
          action={
            <Link
              href="/admin/partners"
              className="text-[12px] font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          <AdminTable head={["Code", "Partner", "City", "Fleet", "Status", "Joined"]} minWidth={560}>
            {overview.recentPartners.length === 0 ? (
              <AdminEmpty colSpan={6}>No rental partners have registered yet.</AdminEmpty>
            ) : (
              overview.recentPartners.map((partner) => (
                <tr key={partner.id} className="transition hover:bg-page/60">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">
                    {partner.partnerCode}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      className="font-medium text-ink hover:text-brand-700"
                    >
                      {partner.tradingName}
                    </Link>
                    <p className="text-[11px] text-muted">{partner.email}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{partner.city}</td>
                  <td className="px-3 py-3 tabular-nums text-muted">{partner.vehicles}</td>
                  <td className="px-3 py-3">
                    <PartnerStatusBadge status={partner.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{when(partner.createdAt)}</td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminPanel>
      </div>
    </div>
  );
}
