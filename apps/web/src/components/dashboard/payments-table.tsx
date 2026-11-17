"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PaymentStatusBadge } from "@/components/dashboard/status-badge";
import type { PaymentRecord } from "@/types";
import { formatDate, inr } from "@/lib/utils";

export function PaymentsTable({ payments }: { payments: PaymentRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
            <th className="px-5 py-3 font-bold">Date</th>
            <th className="px-3 py-3 font-bold">Booking</th>
            <th className="px-3 py-3 font-bold">Vehicle</th>
            <th className="px-3 py-3 font-bold">Method</th>
            <th className="px-3 py-3 text-right font-bold">Amount</th>
            <th className="px-3 py-3 font-bold">Status</th>
            <th className="px-5 py-3 text-right font-bold">Invoice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {payments.map((payment) => (
            <tr key={payment.id} className="text-[12.5px] transition hover:bg-page/60">
              <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                {formatDate(payment.date, { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 font-semibold text-ink">
                <Link href="/dashboard/bookings" className="hover:text-brand-700">
                  {payment.bookingCode}
                </Link>
              </td>
              <td className="px-3 py-3.5 text-ink-soft">{payment.vehicle}</td>
              <td className="whitespace-nowrap px-3 py-3.5 text-muted">{payment.method}</td>
              <td className="whitespace-nowrap px-3 py-3.5 text-right font-bold text-ink">
                {inr(payment.amount)}
              </td>
              <td className="px-3 py-3.5">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  onClick={() => toast.success(`Invoice ${payment.id}.pdf downloaded`)}
                  className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
                >
                  <Download className="size-3" /> PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
