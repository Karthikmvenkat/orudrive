import type { Metadata } from "next";
import Link from "next/link";
import { BadgeIndianRupee, Banknote, Landmark, Percent, Scale, Wallet } from "lucide-react";
import {
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  adminButton,
  firstParam,
  inr,
  whenTime,
} from "@/components/admin/ui";
import { BarChart, ChartLegend } from "@/components/portal/charts";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { vendorRequest } from "@/lib/api/server";
import type { Paginated, VendorBookingItem, VendorEarnings } from "@/lib/api/types";
import { bucketLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "My Earnings & Payments" };

export default async function PartnerEarningsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const [earnings, confirmed, ongoing, completed] = await Promise.all([
    vendorRequest<VendorEarnings>("/vendor/earnings"),
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "CONFIRMED", limit: 100 },
    }),
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "ONGOING", limit: 100 },
    }),
    vendorRequest<Paginated<VendorBookingItem>>("/vendor/bookings", {
      query: { status: "COMPLETED", limit: 100 },
    }),
  ]);

  const commission = earnings.partner.commissionPercent;
  const keep = 1 - commission / 100;
  const running = [...confirmed.data, ...ongoing.data];
  const runningCollected = running.reduce((sum, row) => sum + row.paidAmount, 0);
  const pendingSettlement = Math.round(runningCollected * keep * 100) / 100;
  const completedCollected = completed.data.reduce((sum, row) => sum + row.paidAmount, 0);
  const settledFromCompleted = Math.round(completedCollected * keep * 100) / 100;

  return (
    <AdminPage
      title="My Earnings & Payments"
      description="Money collected on your fleet, the platform commission Master Admin set, and what is left for you. Every figure below is computed from recorded payments — nothing is estimated."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <Link href="/partner/history" className={adminButton}>
          <Scale className="size-4" /> Rental history
        </Link>
      }
    >
      <StatGrid columns={5}>
        <StatCard
          label="Collected on your fleet"
          value={inr(earnings.lifetime.gross)}
          hint="All payments ever recorded"
          icon={BadgeIndianRupee}
        />
        <StatCard
          label="Platform commission"
          value={inr(earnings.lifetime.commission)}
          hint={`${commission}% set by Master Admin`}
          icon={Percent}
          tint="peach"
        />
        <StatCard
          label="Net payable to you"
          value={inr(earnings.lifetime.net)}
          hint="Collected minus commission"
          icon={Wallet}
          tint="mint"
        />
        <StatCard
          label="Pending settlement"
          value={inr(pendingSettlement)}
          hint={`From ${running.length} live rental${running.length === 1 ? "" : "s"}`}
          icon={Landmark}
          tint="butter"
        />
        <StatCard
          label="Refunded to riders"
          value={inr(earnings.lifetime.refunded)}
          hint="Completed refunds only"
          icon={Banknote}
          tint="sky"
        />
      </StatGrid>

      <AdminPanel
        title="Earnings overview"
        description="Six most recent months. Dark bar is the amount riders paid; light bar is your share after commission."
      >
        <div className="p-5">
          <ChartLegend
            className="mb-4"
            items={[
              { label: "Gross collected", tone: "primary" },
              { label: `Your share (${Math.round(keep * 100)}%)`, tone: "secondary" },
            ]}
          />
          <BarChart
            height={200}
            points={earnings.monthly.map((month) => ({
              label: bucketLabel(month.month),
              value: month.gross,
              secondary: month.net,
            }))}
            format={(value) => inr(value)}
            secondaryFormat={(value) => inr(value)}
          />
        </div>
        <AdminTable minWidth={720} head={["Month", "Gross collected", "Commission", "Net payable"]}>
          {earnings.monthly.map((month) => (
            <tr key={month.month} className="transition hover:bg-page/60">
              <td className="px-5 py-3 text-[13px] font-semibold text-ink">
                {bucketLabel(month.month)}
                <span className="ml-2 text-[11px] font-normal text-muted">{month.month}</span>
              </td>
              <td className="px-5 py-3 text-[13px] tabular-nums text-ink-soft">{inr(month.gross)}</td>
              <td className="px-5 py-3 text-[13px] tabular-nums text-orange-700">
                − {inr(month.commission)}
              </td>
              <td className="px-5 py-3 text-[13px] font-semibold tabular-nums text-brand-700">
                {inr(month.net)}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <AdminPanel title="Settlement position" description="Derived from live bookings, not a separate payout ledger.">
          <dl className="divide-y divide-line">
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <dt className="text-[12.5px] text-muted">
                Net payable, all time
                <span className="block text-[11px]">
                  {inr(earnings.lifetime.gross)} × {Math.round(keep * 100)}%
                </span>
              </dt>
              <dd className="text-[14px] font-bold tabular-nums text-ink">
                {inr(earnings.lifetime.net)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <dt className="text-[12.5px] text-muted">
                Still inside a live rental
                <span className="block text-[11px]">
                  {inr(runningCollected)} collected on {running.length} booking
                  {running.length === 1 ? "" : "s"} not completed yet
                </span>
              </dt>
              <dd className="text-[14px] font-bold tabular-nums text-amber-700">
                {inr(pendingSettlement)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <dt className="text-[12.5px] text-muted">
                From completed rentals
                <span className="block text-[11px]">
                  {inr(completedCollected)} collected across the {completed.meta.total} most recent
                  completed booking{completed.meta.total === 1 ? "" : "s"}
                </span>
              </dt>
              <dd className="text-[14px] font-bold tabular-nums text-brand-700">
                {inr(settledFromCompleted)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <dt className="text-[12.5px] text-muted">
                Commission rate
                <span className="block text-[11px]">
                  Only Master Admin can change it — see your Profile page
                </span>
              </dt>
              <dd className="text-[14px] font-bold tabular-nums text-ink">{commission}%</dd>
            </div>
          </dl>
          <p className="border-t border-line px-5 py-4 text-[11.5px] leading-relaxed text-muted">
            SavariGo does not keep a payout-bank ledger inside this database yet, so settlement
            amounts are recalculated from recorded payments each time you load this page. Ask
            Master Admin for the transfer against a period, and raise a Support ticket if the
            figure you receive does not match the numbers shown here.
          </p>
        </AdminPanel>

        <AdminPanel
          title="Transaction history"
          description={`${earnings.transactions.length} most recent payments recorded on your fleet.`}
        >
          <AdminTable
            minWidth={780}
            head={["Paid", "Booking", "Vehicle", "Rider paid", "Your share", "Method"]}
          >
            {earnings.transactions.length === 0 && (
              <AdminEmpty colSpan={6}>
                No payment has reached your fleet yet. Money appears here the moment a rider pays.
              </AdminEmpty>
            )}
            {earnings.transactions.map((payment) => (
              <tr key={payment.id} className="align-top transition hover:bg-page/60">
                <td className="px-5 py-3 text-[12px] text-ink-soft">
                  {whenTime(payment.paidAt)}
                </td>
                <td className="px-5 py-3 font-mono text-[12px] font-semibold text-ink">
                  {payment.bookingCode}
                </td>
                <td className="px-5 py-3 text-[12.5px] text-ink-soft">{payment.vehicleName}</td>
                <td className="px-5 py-3 text-[13px] tabular-nums text-ink">
                  {inr(payment.amount)}
                  <p className="text-[11px] text-muted">Booking total {inr(payment.bookingTotal)}</p>
                </td>
                <td className="px-5 py-3 text-[13px] font-semibold tabular-nums text-brand-700">
                  {inr(Math.round(payment.amount * keep * 100) / 100)}
                  <p className="text-[11px] font-normal text-muted">
                    after {commission}% commission
                  </p>
                </td>
                <td className="px-5 py-3 text-[12px] text-ink-soft">
                  {payment.method}
                  <p className="text-[11px] text-muted">{payment.provider}</p>
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
