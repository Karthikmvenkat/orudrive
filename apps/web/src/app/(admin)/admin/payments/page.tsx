import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeIndianRupee,
  HandCoins,
  Landmark,
  RotateCcw,
  Timer,
  Wallet,
} from "lucide-react";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonSoft,
  adminInput,
  firstParam,
  inr,
  when,
  whenTime,
} from "@/components/admin/ui";
import { AdminPaymentStatus } from "@/components/admin/status-badge";
import { BarChart, ChartLegend } from "@/components/portal/charts";
import { StatCard, StatGrid } from "@/components/portal/ui";
import { staffRequest } from "@/lib/api/server";
import type {
  AdminPartnerItem,
  AdminPaymentItem,
  AdminReportSummary,
  ApiPaymentStatus,
  Paginated,
} from "@/lib/api/types";
import { refundPayment } from "../actions";

export const metadata: Metadata = { title: "Payments & Earnings · Admin" };

const STATUSES: ApiPaymentStatus[] = ["PENDING", "PAID", "REFUNDED", "FAILED"];

/** `group` decides how the earnings chart buckets the selected window. */
const WINDOWS = [
  { key: "7", label: "7 days", group: "day" },
  { key: "30", label: "30 days", group: "day" },
  { key: "90", label: "90 days", group: "week" },
  { key: "365", label: "12 months", group: "month" },
] as const;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status);
  const q = firstParam(params.q);
  const page = Number(firstParam(params.page) ?? "1") || 1;
  const window = WINDOWS.find((entry) => entry.key === firstParam(params.days)) ?? WINDOWS[1];

  const [payments, summary, partners] = await Promise.all([
    staffRequest<Paginated<AdminPaymentItem>>("/payments/manage", {
      query: { status, q, page, limit: 20 },
    }),
    staffRequest<AdminReportSummary>("/admin/reports", {
      query: { days: window.key, group: window.group },
    }),
    staffRequest<Paginated<AdminPartnerItem>>("/admin/partners", { query: { limit: 100 } }),
  ]);

  const partnerByOwnerId = new Map(
    partners.data.map((partner) => [partner.userId, partner] as const),
  );

  const pageCollected = payments.data.reduce(
    (sum, payment) => (payment.paidAt ? sum + payment.amount : sum),
    0,
  );
  const pageRefundable = payments.data
    .filter((payment) => payment.status === "PAID")
    .reduce(
      (sum, payment) =>
        sum +
        payment.amount -
        (payment.refunds ?? []).reduce(
          (inner, refund) => (refund.status === "FAILED" ? inner : inner + refund.amount),
          0,
        ),
      0,
    );
  // One blended rate for the chart overlay only; the real split is per partner.
  const blendedKeep = summary.totals.collected
    ? summary.settlement.partnerEarnings / summary.totals.collected
    : 0;

  const query: Record<string, string | undefined> = { days: window.key, status, q };
  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const merged = { ...query, ...overrides };
    const entries = Object.entries(merged).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );
    if (entries.length === 0) return "/admin/payments";
    return `/admin/payments?${new URLSearchParams(entries).toString()}`;
  };
  const redirectTo = hrefFor({});

  return (
    <AdminPage
      title="Payments & Earnings"
      description="Platform revenue, the commission SavariGo keeps and the payout each partner has earned. Every figure is recalculated from recorded payments for the window you pick."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form className="flex flex-wrap items-end gap-2" method="get">
          <input type="hidden" name="days" value={window.key} />
          <Field label="Search" className="w-52">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Booking code or customer"
              className={adminInput}
            />
          </Field>
          <Field label="Status" className="w-40">
            <select name="status" defaultValue={status ?? ""} className={adminInput}>
              <option value="">All statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
        </form>
      }
    >
      <StatGrid>
        <StatCard
          label="Platform revenue"
          value={inr(summary.totals.collected)}
          hint={`Captured in the last ${window.label.toLowerCase()}`}
          icon={Wallet}
        />
        <StatCard
          label="Refunds"
          value={inr(summary.totals.refunded)}
          hint="Completed refund rows"
          icon={RotateCcw}
          tint="peach"
        />
        <StatCard
          label="Net revenue"
          value={inr(summary.totals.net)}
          hint="Revenue after refunds"
          icon={BadgeIndianRupee}
        />
        <StatCard
          label="Partner earnings"
          value={inr(summary.settlement.partnerEarnings)}
          hint="Each partner's share of the same revenue"
          icon={HandCoins}
          tint="sky"
        />
        <StatCard
          label="Platform commission"
          value={inr(summary.settlement.platformCommission)}
          hint="Revenue minus partner earnings"
          icon={Landmark}
          tint="lilac"
        />
        <StatCard
          label="Pending settlements"
          value={inr(summary.settlement.pendingSettlement)}
          hint="Earned on rentals that have not completed"
          icon={Timer}
          tint="butter"
        />
      </StatGrid>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel
          title="Earnings split"
          description={`Collected revenue and the partner share inside it · last ${window.label.toLowerCase()}, per ${window.group}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {WINDOWS.map((entry) => (
                <Link
                  key={entry.key}
                  href={hrefFor({ days: entry.key })}
                  className={
                    entry.key === window.key
                      ? "inline-flex h-8 items-center rounded-full bg-forest px-3 text-[11.5px] font-semibold text-white"
                      : "inline-flex h-8 items-center rounded-full border border-line px-3 text-[11.5px] font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
                  }
                >
                  {entry.label}
                </Link>
              ))}
            </div>
          }
        >
          <div className="px-5 py-5">
            <BarChart
              points={summary.series.map((point) => ({
                label: point.label,
                value: point.collected,
                secondary: Math.round(point.collected * blendedKeep),
              }))}
              format={inr}
              secondaryFormat={inr}
              height={200}
              labelEvery={Math.ceil(summary.series.length / 12) || 1}
            />
            <ChartLegend
              className="mt-3"
              items={[
                { label: "Collected", tone: "primary" },
                { label: "Partner share", tone: "secondary" },
              ]}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              The partner bars apply one blended rate of{" "}
              <span className="font-semibold text-ink-soft">
                {Math.round(blendedKeep * 1000) / 10}%
              </span>{" "}
              because commission is set per partner, not per bucket. Exact per-partner figures are
              in the table on the right.
            </p>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Payout position by partner"
          description={`Per-partner commission applied to ${window.label.toLowerCase()} of captured payments`}
        >
          <AdminTable
            minWidth={760}
            head={["Partner", "Commission", "Revenue", "Payout", "Unsettled"]}
          >
            {summary.partnerPerformance.length === 0 && (
              <AdminEmpty colSpan={5}>No partner earned revenue in this window.</AdminEmpty>
            )}
            {summary.partnerPerformance.map((row) => {
              const profile = partnerByOwnerId.get(row.ownerId);
              return (
                <tr key={row.ownerId} className="align-top">
                  <td className="px-5 py-4">
                    {profile ? (
                      <Link
                        href={`/admin/partners/${profile.id}`}
                        className="font-semibold text-ink hover:text-brand-700"
                      >
                        {row.tradingName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">{row.tradingName}</span>
                    )}
                    <p className="text-[11px] text-muted tabular-nums">
                      {row.partnerCode ?? "No partner code"} · {row.city ?? "City not set"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-[12px] tabular-nums text-ink-soft">
                    {row.commissionPercent}%
                    {profile && (
                      <p className="text-[11px] text-muted">
                        <Link
                          href={`/admin/partners/${profile.id}`}
                          className="text-brand-700 hover:underline"
                        >
                          Change rate
                        </Link>
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[12px] font-semibold tabular-nums text-ink">
                    {inr(row.collected)}
                    <p className="text-[11px] font-normal text-muted">
                      {row.bookings} bookings · {row.vehicles} vehicles
                    </p>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-semibold tabular-nums text-ink">
                    {inr(row.payout)}
                  </td>
                  <td className="px-5 py-4 text-[12px] tabular-nums text-ink-soft">
                    {inr(row.openPayout)}
                    <p className="text-[11px] text-muted">
                      {inr(Math.max(0, row.payout - row.openPayout))} on closed rentals
                    </p>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
          <p className="border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-muted">
            SavariGo records payments, refunds and each partner's commission rate, then recalculates
            the payout from them on every load. There is no payout ledger in this database, so a
            transfer cannot be marked as sent here — settle it in your banking system and treat the
            figures above as the amount owed.
          </p>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Transaction history"
        description={`Newest payments first · ${inr(pageCollected)} captured on this page`}
      >
        <AdminTable
          minWidth={1020}
          head={["Payment", "Booking", "Customer", "Amount", "Status", "Paid", "Actions"]}
        >
          {payments.data.length === 0 && (
            <AdminEmpty colSpan={7}>No payments match these filters.</AdminEmpty>
          )}
          {payments.data.map((payment) => {
            const refunded = (payment.refunds ?? []).reduce(
              (sum, refund) =>
                refund.status === "FAILED" ? sum : sum + refund.amount,
              0,
            );
            const refundable = payment.amount - refunded;
            return (
              <tr key={payment.id} className="align-top">
                <td className="px-5 py-4">
                  <p className="font-mono text-[11px] text-ink-soft">
                    {payment.providerPaymentId ?? payment.id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {payment.provider} · {payment.method ?? "—"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  {payment.bookingCode ? (
                    <Link
                      href={`/booking/${payment.bookingCode}/confirmed`}
                      className="font-semibold text-ink hover:text-brand-700"
                    >
                      {payment.bookingCode}
                    </Link>
                  ) : (
                    "—"
                  )}
                  <p className="text-[11px] text-muted">{payment.bookingStatus ?? ""}</p>
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {payment.customerEmail ?? "—"}
                </td>
                <td className="px-5 py-4 font-semibold text-ink">
                  {inr(payment.amount)}
                  {refunded > 0 && (
                    <p className="text-[11px] font-normal text-muted">
                      Refunded {inr(refunded)}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <AdminPaymentStatus status={payment.status} />
                  {payment.failureMessage && (
                    <p className="mt-1 max-w-[180px] text-[11px] text-red-600">
                      {payment.failureMessage}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-[12px] text-ink-soft">
                  {whenTime(payment.paidAt ?? payment.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <AdminAction>
                    {payment.status === "PAID" && refundable > 0 ? (
                      <AdminDrawer label="Refund">
                        <form action={refundPayment} className="space-y-3">
                          <input type="hidden" name="id" value={payment.id} />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={redirectTo}
                          />
                          <Field
                            label="Amount (₹)"
                            hint={`Up to ${inr(refundable)}. Leave blank for a full refund.`}
                          >
                            <input
                              name="amount"
                              type="number"
                              min={0.01}
                              max={refundable}
                              step="0.01"
                              className={adminInput}
                            />
                          </Field>
                          <Field label="Reason">
                            <input name="reason" className={adminInput} />
                          </Field>
                          <button className={adminButton} type="submit">
                            Issue refund
                          </button>
                        </form>
                      </AdminDrawer>
                    ) : (
                      <span className="text-[11px] text-muted">No refund due</span>
                    )}
                    {(payment.refunds ?? []).length > 0 && (
                      <AdminDrawer label="History">
                        <ul className="space-y-2 text-[12px]">
                          {payment.refunds?.map((refund) => (
                            <li key={refund.id} className="flex justify-between gap-3">
                              <span>
                                {inr(refund.amount)} · {refund.status}
                                <span className="block text-[11px] text-muted">
                                  {refund.reason ?? "No reason"}
                                </span>
                              </span>
                              <span className="text-[11px] text-muted">
                                {when(refund.processedAt ?? refund.createdAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </AdminDrawer>
                    )}
                  </AdminAction>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-[11.5px] text-muted">
            {inr(pageRefundable)} is refundable across the payments listed here — this page only.
          </p>
          <AdminPager
            page={payments.meta.page}
            totalPages={payments.meta.totalPages}
            path="/admin/payments"
            params={query}
          />
        </div>
      </AdminPanel>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/reports" className={adminButtonSoft}>
          Full revenue reports
        </Link>
        <Link href="/admin/partners" className={adminButtonSoft}>
          Partner accounts and commission rates
        </Link>
      </div>
    </AdminPage>
  );
}
