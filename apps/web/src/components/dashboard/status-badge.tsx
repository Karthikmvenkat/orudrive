import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { BookingStatus, PaymentStatus } from "@/types";

const bookingMap: Record<BookingStatus, { label: string; variant: BadgeProps["variant"] }> = {
  upcoming: { label: "Upcoming", variant: "info" },
  ongoing: { label: "Ongoing", variant: "solid" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const paymentMap: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  paid: { label: "Paid", variant: "success" },
  Paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  Pending: { label: "Pending", variant: "warning" },
  refunded: { label: "Refunded", variant: "info" },
  Refunded: { label: "Refunded", variant: "info" },
  failed: { label: "Failed", variant: "danger" },
  Failed: { label: "Failed", variant: "danger" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = bookingMap[status];
  return (
    <Badge variant={variant} size="md">
      {label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const entry = paymentMap[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={entry.variant} size="md">
      {entry.label}
    </Badge>
  );
}
