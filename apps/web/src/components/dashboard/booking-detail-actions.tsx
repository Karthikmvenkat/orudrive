"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Headset, Loader2, MapPin, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlay";

export function BookingDetailActions({
  bookingId,
  code,
  deposit,
  cancellable,
}: {
  bookingId: string;
  code: string;
  deposit: number;
  cancellable: boolean;
}) {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/proxy/bookings/${bookingId}/cancel`, {
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
      setCancelled(true);
      toast.success(`Booking ${code} cancelled`);
      router.refresh();
    } catch {
      toast.error("Could not cancel this booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={() => window.print()}>
        <Printer className="size-4" /> Print / save invoice
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href="/contact">
          <Headset className="size-4" /> Contact support
        </Link>
      </Button>
      {cancellable && !cancelled && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full text-danger hover:bg-red-50">
              <X className="size-4" /> Cancel this booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogTitle>Cancel booking {code}?</DialogTitle>
            <DialogDescription>
              You&apos;re within the free-cancellation window. Your security deposit of ₹
              {deposit.toLocaleString("en-IN")} will be refunded to the original payment method
              within 3–5 working days.
            </DialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Keep booking
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={cancelling}
                  onClick={() => void cancel()}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Cancelling…
                    </>
                  ) : (
                    "Yes, cancel"
                  )}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {cancelled && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-[11.5px] font-semibold text-danger">
          This booking has been cancelled.
        </p>
      )}
      <p className="flex items-start gap-1.5 pt-1 text-[11px] leading-relaxed text-muted">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        Free cancellation up to 24 hours before pickup.
      </p>
    </div>
  );
}
