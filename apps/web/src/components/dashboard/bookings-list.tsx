"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Download, MapPin, RotateCcw, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlay";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import type { Booking, BookingStatus } from "@/types";
import { formatDate, inr } from "@/lib/utils";

const tabs: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function BookingsList({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);

  const withLocal = bookings.map((b) =>
    cancelledIds.includes(b.id) ? { ...b, status: "cancelled" as const } : b,
  );

  const countFor = (value: "all" | BookingStatus) =>
    value === "all" ? withLocal.length : withLocal.filter((b) => b.status === value).length;

  const cancelBooking = async (booking: Booking) => {
    try {
      const response = await fetch(`/api/proxy/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        toast.error(payload?.message ?? "Could not cancel this booking.");
        return;
      }
      setCancelledIds((ids) => [...ids, booking.id]);
      toast.success(`Booking ${booking.code} cancelled`, {
        description: "Any eligible amount will be refunded in 3–5 days.",
      });
      router.refresh();
    } catch {
      toast.error("Could not cancel this booking. Please try again.");
    }
  };

  return (
    <Tabs defaultValue="all">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            <span className="rounded-full bg-white/60 px-1.5 text-[10px] font-bold text-ink-soft data-[state=active]:bg-white/20">
              {countFor(tab.value)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => {
        const list =
          tab.value === "all" ? withLocal : withLocal.filter((b) => b.status === tab.value);

        return (
          <TabsContent key={tab.value} value={tab.value}>
            {list.length === 0 ? (
              <div className="grid place-items-center rounded-panel border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-page text-muted">
                  <Ticket className="size-5" />
                </span>
                <p className="mt-3 text-[14px] font-bold text-ink">No {tab.label.toLowerCase()} bookings</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-muted">
                  When you book a ride it will show up here with pickup details and invoices.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/bikes-scooters">Browse rides</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map((booking) => (
                  <li key={booking.id}>
                    <BookingRow
                      booking={booking}
                      onCancel={() => void cancelBooking(booking)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const isUpcoming = booking.status === "upcoming";

  return (
    <article className="overflow-hidden rounded-panel border border-line bg-surface transition hover:border-brand-200 hover:shadow-soft">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-page sm:h-[84px] sm:w-[112px]">
          <Image
            src={booking.vehicleImage}
            alt={booking.vehicleName}
            fill
            sizes="120px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14.5px] font-bold text-ink">{booking.vehicleName}</h3>
            <BookingStatusBadge status={booking.status} />
            {booking.paymentStatus === "refunded" && <PaymentStatusBadge status="refunded" />}
          </div>
          <p className="mt-0.5 text-[11.5px] font-medium text-muted">
            Booking <span className="font-bold text-ink-soft">#{booking.code}</span> ·{" "}
            {booking.duration} {booking.duration === 1 ? "day" : "days"}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-muted" />
              {formatDate(booking.pickupDate, { day: "2-digit", month: "short" })} –{" "}
              {formatDate(booking.returnDate, { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted" />
              {booking.pickupLocation}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted">
              {booking.paymentStatus === "paid" ? "Total paid" : "Total payable"}
            </p>
            <p className="font-display text-[17px] font-extrabold text-ink">{inr(booking.total)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/bookings/${booking.id}`}>Details</Link>
            </Button>
            {isUpcoming ? (
              <CancelDialog code={booking.code} onConfirm={onCancel} />
            ) : (
              <Button asChild size="sm" variant="soft">
                <Link href={`/vehicles/${booking.vehicleSlug}`}>
                  <RotateCcw className="size-3.5" /> Book again
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-page/60 px-4 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={() => toast.success(`Invoice for ${booking.code} downloaded`)}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft transition hover:text-brand-700"
        >
          <Download className="size-3.5" /> Invoice
        </button>
        <span className="text-line-strong">·</span>
        <Link
          href="/contact"
          className="text-[11.5px] font-semibold text-ink-soft transition hover:text-brand-700"
        >
          Need help
        </Link>
        <span className="ml-auto text-[11px] text-muted">
          Booked on {formatDate(booking.createdAt, { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
    </article>
  );
}

function CancelDialog({ code, onConfirm }: { code: string; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50">
          <X className="size-3.5" /> Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle>Cancel booking {code}?</DialogTitle>
        <DialogDescription>
          Free cancellation applies up to 24 hours before pickup. After that a one-day rental
          fee is retained. Refunds reach your original payment method in 3–5 working days.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Keep booking
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="danger" size="sm" onClick={onConfirm}>
              Yes, cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
