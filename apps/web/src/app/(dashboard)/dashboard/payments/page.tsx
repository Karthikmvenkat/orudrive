import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReceiptText, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import { DashboardHero, Panel } from "@/components/dashboard/ui";
import { PaymentsTable } from "@/components/dashboard/payments-table";
import { myBookings, myPayments } from "@/lib/api/account";
import { toBooking, toPaymentRecord } from "@/lib/api/adapters";
import { getAccessToken } from "@/lib/api/server";
import { inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const token = await getAccessToken();
  if (!token) redirect("/login?next=/dashboard/payments");

  const [apiBookings, apiPayments] = await Promise.all([
    myBookings(token, 100),
    myPayments(token, 100),
  ]);
  const bookings = apiBookings.map(toBooking);
  const vehicleNameByCode = new Map(bookings.map((b) => [b.code, b.vehicleName]));
  const payments = apiPayments.map((payment) =>
    toPaymentRecord(
      payment,
      payment.bookingCode ? vehicleNameByCode.get(payment.bookingCode) : undefined,
    ),
  );

  const paid = payments.filter((p) => p.status === "Paid");
  const refunded = payments.filter((p) => p.status === "Refunded");
  const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);
  const refundedTotal = refunded.reduce((sum, p) => sum + p.amount, 0);
  const depositsHeld = bookings
    .filter((b) => b.status === "upcoming")
    .reduce((sum, b) => sum + b.deposit, 0);

  const summary = [
    {
      label: "Total paid",
      value: inr(paidTotal),
      hint: `${paid.length} successful payments`,
      icon: Wallet,
      tint: "bg-mint",
    },
    {
      label: "Refunded to you",
      value: inr(refundedTotal),
      hint: `${refunded.length} refunds processed`,
      icon: RotateCcw,
      tint: "bg-sky",
    },
    {
      label: "Security deposits held",
      value: inr(depositsHeld),
      hint: "Released after return",
      icon: ShieldCheck,
      tint: "bg-peach",
    },
    {
      label: "Invoices",
      value: payments.length.toString(),
      hint: "Downloadable any time",
      icon: ReceiptText,
      tint: "bg-lilac",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Billing"
        title="Payments & Invoices"
        description="Every charge, refund and receipt for your SavariGo bookings in one place."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-panel border border-line bg-surface p-4">
            <span className={`grid size-9 place-items-center rounded-xl ${item.tint} text-forest`}>
              <item.icon className="size-[18px]" strokeWidth={1.9} />
            </span>
            <p className="mt-3 font-display text-[20px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {item.value}
            </p>
            <p className="mt-1.5 text-[12px] font-semibold text-ink-soft">{item.label}</p>
            <p className="text-[11px] text-muted">{item.hint}</p>
          </div>
        ))}
      </div>

      <Panel title="Transaction history">
        <PaymentsTable payments={payments} />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-line bg-surface p-5">
          <p className="text-[13px] font-bold text-ink">How refunds work</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Deposits and eligible refunds return to the original payment method in 3–5 working
            days. UPI refunds usually clear within 24 hours.
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-5">
          <p className="text-[13px] font-bold text-ink">Card details are never stored</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Payments are processed by our PCI-DSS compliant partner. SavariGo only keeps the last
            four digits for your records.
          </p>
        </div>
      </div>
    </div>
  );
}
